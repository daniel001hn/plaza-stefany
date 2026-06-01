// Adapter que emula window.storage (Claude artifacts API) usando Supabase.
// Devuelve el value como JSON string (matchea el contrato del artifact API).
//
// Resiliencia para celular con mala señal:
//  - get(): network-first con reintentos (backoff). Si TODOS fallan, sirve la
//    última copia guardada en localStorage en vez de null → la app abre con la
//    data que viste la última vez en vez de "Cargando…"/"Recargar".
//  - cada lectura/escritura buena refresca el cache local.
import { supabase } from './supabaseClient'

const TIMEOUT_MS = 6000        // por intento (antes 10s); con retry entra más rápido
const RETRIES = 2              // reintentos extra después del primer fallo (3 intentos total)
const CACHE_PREFIX = 'kvcache:'
const MAX_CACHE_BYTES = 250000 // no cachear blobs gigantes (pagos con fotos base64) — protege config

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Dedup de lecturas: durante el login, la misma clave (config-and-locales) la
// piden 3 lugares casi al mismo tiempo (App.handleSubmit, App.deriveSession,
// InquilinoView.load). Colapsamos:
//  - inflight: si ya hay un get en vuelo para la clave, compartimos esa promesa.
//  - micro: si se leyó hace <1.5s, devolvemos lo mismo sin pegarle a la red.
// set/delete y los cambios por realtime invalidan la micro-cache → no sirve stale.
const inflight = new Map()
const micro = new Map()
const MICRO_TTL = 1500

// Wrap cualquier promesa con timeout para que la app no se cuelgue si Supabase tarda.
function withTimeout(promise, ms = TIMEOUT_MS, label = 'storage') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: timeout after ${ms}ms`)), ms)),
  ])
}

function readCache(key) {
  try { return localStorage.getItem(CACHE_PREFIX + key) } catch { return null }
}
function writeCache(key, valueStr) {
  try {
    if (valueStr == null) { localStorage.removeItem(CACHE_PREFIX + key); return }
    if (valueStr.length > MAX_CACHE_BYTES) return // demasiado grande, no cachear
    localStorage.setItem(CACHE_PREFIX + key, valueStr)
  } catch {} // quota llena / modo privado → ignorar, el cache es best-effort
}

const storage = {
  // Lectura sincrónica del cache (para primer paint instantáneo si se necesita).
  getCached(key) { return readCache(key) },

  async get(key) {
    // micro-cache: lectura repetida hace <1.5s → devolver lo mismo (colapsa ráfaga de login)
    const m = micro.get(key)
    if (m && Date.now() - m.ts < MICRO_TTL) return m.value
    // coalescing: si ya hay un get en vuelo para esta clave, compartirlo
    if (inflight.has(key)) return inflight.get(key)

    const promise = (async () => {
      let lastErr
      for (let attempt = 0; attempt <= RETRIES; attempt++) {
        try {
          const { data, error } = await withTimeout(
            supabase.from('kv_store').select('value').eq('key', key).maybeSingle(),
            TIMEOUT_MS, `storage.get(${key})`
          )
          if (error) throw error
          const valueStr = !data ? null : (typeof data.value === 'string' ? data.value : JSON.stringify(data.value))
          if (valueStr != null) writeCache(key, valueStr)
          micro.set(key, { value: valueStr, ts: Date.now() })
          return valueStr
        } catch (e) {
          lastErr = e
          if (attempt < RETRIES) await sleep(300 * Math.pow(2, attempt)) // 300ms, 600ms
        }
      }
      // Todos los intentos fallaron → servir cache local si existe (mala señal / offline).
      const cached = readCache(key)
      if (cached != null) {
        console.warn('storage.get', key, '→ usando cache local (red falló):', lastErr?.message)
        return cached
      }
      console.error('storage.get', key, lastErr?.message)
      return null
    })()

    inflight.set(key, promise)
    try { return await promise } finally { inflight.delete(key) }
  },

  async set(key, value) {
    let parsed
    try { parsed = typeof value === 'string' ? JSON.parse(value) : value }
    catch (e) { parsed = value }
    try {
      const { error } = await withTimeout(
        supabase.from('kv_store').upsert({ key, value: parsed, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        TIMEOUT_MS, `storage.set(${key})`
      )
      if (error) { console.error('storage.set', key, error); return false }
      const vs = typeof value === 'string' ? value : JSON.stringify(parsed)
      writeCache(key, vs)
      micro.set(key, { value: vs, ts: Date.now() }) // mantener micro-cache fresca tras escribir
      return true
    } catch (e) {
      console.error('storage.set', key, e.message)
      return false
    }
  },

  async delete(key) {
    try {
      const { error } = await withTimeout(
        supabase.from('kv_store').delete().eq('key', key),
        TIMEOUT_MS, `storage.delete(${key})`
      )
      if (!error) { writeCache(key, null); micro.delete(key) }
      return !error
    } catch (e) {
      console.error('storage.delete', key, e.message)
      return false
    }
  },
  // Realtime subscription a kv_store. Si Realtime está deshabilitado en Supabase,
  // .subscribe() falla silenciosamente — el polling de PlazaStefany es el fallback.
  subscribe(callback) {
    const channel = supabase
      .channel('kv_store_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kv_store' }, (payload) => {
        const row = payload.new || payload.old
        // Mantener el cache local + micro-cache calientes con lo que llega por realtime.
        if (payload.new?.key && payload.new.value != null) {
          const vs = JSON.stringify(payload.new.value)
          writeCache(payload.new.key, vs)
          micro.set(payload.new.key, { value: vs, ts: Date.now() })
        } else if (payload.old?.key) {
          micro.delete(payload.old.key)
        }
        if (row?.key) callback({ key: row.key, value: row.value, eventType: payload.eventType })
      })
      .subscribe()
    return () => { try { supabase.removeChannel(channel) } catch {} }
  }
}

if (typeof window !== 'undefined') {
  window.storage = storage
}

export default storage
