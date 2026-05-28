// Adapter que emula window.storage (Claude artifacts API) usando Supabase.
// Devuelve el value como JSON string (matchea el contrato del artifact API).
import { supabase } from './supabaseClient'

const TIMEOUT_MS = 10000 // si una query tarda >10s, abortar — el caller verá null/false

// Wrap cualquier promesa con timeout para que la app no se cuelgue si Supabase tarda.
function withTimeout(promise, ms = TIMEOUT_MS, label = 'storage') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: timeout after ${ms}ms`)), ms)),
  ])
}

const storage = {
  async get(key) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('kv_store').select('value').eq('key', key).maybeSingle(),
        TIMEOUT_MS, `storage.get(${key})`
      )
      if (error) { console.error('storage.get', key, error); return null }
      if (!data) return null
      return typeof data.value === 'string' ? data.value : JSON.stringify(data.value)
    } catch (e) {
      console.error('storage.get', key, e.message)
      return null
    }
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
