// Permite que un inquilino suba el comprobante de su pago (renta o luz)
// del mes correspondiente. La RLS bloquea writes directos al kv_store para
// no-admin, así que esta function hace el merge usando service_role
// después de validar que el inquilino está escribiendo SOLO a su propio localId.
import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

const URL_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)
  const jwt = auth.slice(7)

  const sbUser = createClient(URL_BASE, ANON_KEY)
  const { data: userData, error: authErr } = await sbUser.auth.getUser(jwt)
  if (authErr || !userData?.user) return json({ error: 'invalid jwt' }, 401)

  const email = (userData.user.email || '').toLowerCase()
  // Admin no debe usar este endpoint — escribe directo
  if (email === 'admin@plaza-stefany.local' || userData.user.user_metadata?.role === 'admin') {
    return json({ error: 'admin should write directly' }, 400)
  }

  let body
  try { body = await req.json() } catch { return json({ error: 'invalid body' }, 400) }

  const { year, monthIdx, tipo, comprobanteB64 } = body
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return json({ error: 'invalid year' }, 400)
  if (!Number.isInteger(monthIdx) || monthIdx < 0 || monthIdx > 11) return json({ error: 'invalid monthIdx' }, 400)
  if (tipo !== 'Renta' && tipo !== 'Luz') return json({ error: 'invalid tipo' }, 400)
  if (typeof comprobanteB64 !== 'string' || !comprobanteB64.startsWith('data:image/')) {
    return json({ error: 'invalid comprobante (expected data:image/...)' }, 400)
  }
  if (comprobanteB64.length > 400000) return json({ error: 'image too large (max ~300KB)' }, 413)

  // Resolver localId del inquilino vía config-and-locales
  const sbAdmin = createClient(URL_BASE, SERVICE_KEY)
  const { data: cfgRow, error: cfgErr } = await sbAdmin.from('kv_store').select('value').eq('key', 'config-and-locales').maybeSingle()
  if (cfgErr || !cfgRow) return json({ error: 'no config row' }, 500)

  const usuarios = cfgRow.value?.config?.usuarios || cfgRow.value?.usuarios || []
  const usuarioStr = email.split('@')[0]
  const u = usuarios.find((x) => (x.usuario || '').toLowerCase() === usuarioStr)
  if (!u) return json({ error: 'usuario no mapeado a local' }, 403)
  const localId = u.localId

  const key = `pagos:${year}-${String(monthIdx + 1).padStart(2, '0')}`
  const { data: row } = await sbAdmin.from('kv_store').select('value').eq('key', key).maybeSingle()
  const data = row?.value || { pagos: {}, factura: {} }
  data.pagos = data.pagos || {}
  data.pagos[localId] = {
    ...(data.pagos[localId] || {}),
    [`comprobante${tipo}`]: comprobanteB64,
    [`comprobante${tipo}Date`]: new Date().toISOString(),
  }

  const { error: upErr } = await sbAdmin.from('kv_store').upsert({
    key,
    value: data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
  if (upErr) return json({ error: upErr.message }, 500)

  return json({ ok: true, localId })
}
