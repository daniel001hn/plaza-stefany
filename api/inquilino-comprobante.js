// Permite que un inquilino suba o BORRE el comprobante de su pago del mes.
// RLS bloquea writes directos al kv_store para no-admin, esta function valida
// JWT + matchea localId + escribe con service_role.
//
// Body:
//   { action: 'upload', year, monthIdx, tipo: 'Renta'|'Luz', comprobanteB64 }
//   { action: 'delete', year, monthIdx, tipo: 'Renta'|'Luz' }
// Si action falta, se asume upload (backwards compat).
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

  if (!URL_BASE) return json({ error: 'SUPABASE_URL no configurado' }, 500)
  if (!SERVICE_KEY) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurado' }, 500)

  const sbUser = createClient(URL_BASE, ANON_KEY)
  const { data: userData, error: authErr } = await sbUser.auth.getUser(jwt)
  if (authErr || !userData?.user) return json({ error: 'invalid jwt' }, 401)

  const email = (userData.user.email || '').toLowerCase()
  if (email === 'admin@plaza-stefany.local' || userData.user.user_metadata?.role === 'admin') {
    return json({ error: 'admin should write directly' }, 400)
  }

  let body
  try { body = await req.json() } catch { return json({ error: 'invalid body' }, 400) }

  const action = body.action || 'upload'
  const { year, monthIdx, tipo, comprobanteB64 } = body

  if (!Number.isInteger(year) || year < 2020 || year > 2100) return json({ error: 'invalid year' }, 400)
  if (!Number.isInteger(monthIdx) || monthIdx < 0 || monthIdx > 11) return json({ error: 'invalid monthIdx' }, 400)
  if (tipo !== 'Renta' && tipo !== 'Luz') return json({ error: 'invalid tipo' }, 400)
  if (action !== 'upload' && action !== 'delete') return json({ error: 'invalid action' }, 400)

  if (action === 'upload') {
    if (typeof comprobanteB64 !== 'string' || !comprobanteB64.startsWith('data:image/')) {
      return json({ error: 'invalid comprobante (expected data:image/...)' }, 400)
    }
    if (comprobanteB64.length > 400000) return json({ error: 'image too large (max ~300KB)' }, 413)
  }

  const sbAdmin = createClient(URL_BASE, SERVICE_KEY)
  const { data: cfgRow, error: cfgErr } = await sbAdmin.from('kv_store').select('value').eq('key', 'config-and-locales').maybeSingle()
  if (cfgErr) return json({ error: 'config query error: ' + cfgErr.message }, 500)
  if (!cfgRow) return json({ error: 'config-and-locales row not found' }, 500)

  const usuarios = cfgRow.value?.config?.usuarios || cfgRow.value?.usuarios || []
  const usuarioStr = email.split('@')[0]
  const u = usuarios.find((x) => (x.usuario || '').toLowerCase() === usuarioStr)
  if (!u) return json({ error: 'usuario no mapeado a local' }, 403)
  const localId = u.localId

  const key = `pagos:${year}-${String(monthIdx + 1).padStart(2, '0')}`

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row, error: rdErr } = await sbAdmin.from('kv_store')
      .select('value,updated_at').eq('key', key).maybeSingle()
    if (rdErr) return json({ error: 'read error: ' + rdErr.message }, 500)

    const data = row?.value || { pagos: {}, factura: {} }
    data.pagos = data.pagos || {}
    const localPago = { ...(data.pagos[localId] || {}) }

    if (action === 'upload') {
      localPago[`comprobante${tipo}`] = comprobanteB64
      localPago[`comprobante${tipo}Date`] = new Date().toISOString()
    } else {
      // delete: remover los campos del comprobante de ese tipo
      delete localPago[`comprobante${tipo}`]
      delete localPago[`comprobante${tipo}Date`]
    }
    data.pagos[localId] = localPago
    const newUpdatedAt = new Date().toISOString()

    if (row) {
      const { data: updated, error: upErr } = await sbAdmin.from('kv_store')
        .update({ value: data, updated_at: newUpdatedAt })
        .eq('key', key).eq('updated_at', row.updated_at)
        .select('key')
      if (upErr) return json({ error: 'write error: ' + upErr.message }, 500)
      if (updated && updated.length === 1) return json({ ok: true, action, localId, attempt: attempt + 1 })
      continue
    } else {
      // Solo upload puede insertar; delete sobre fila inexistente no tiene sentido
      if (action === 'delete') return json({ ok: true, action, localId, note: 'nada que borrar' })
      const { error: insErr } = await sbAdmin.from('kv_store')
        .insert({ key, value: data, updated_at: newUpdatedAt })
      if (insErr) {
        if (insErr.code === '23505') continue
        return json({ error: 'insert error: ' + insErr.message }, 500)
      }
      return json({ ok: true, action, localId, attempt: attempt + 1 })
    }
  }
  return json({ error: 'conflict: 3 reintentos fallidos, intentá de nuevo' }, 409)
}
