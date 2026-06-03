// Sube una imagen (data:image/...;base64) a Supabase Storage y devuelve la URL
// pública. Centraliza TODAS las subidas: el browser (admin o inquilino) manda el
// base64 con su JWT, acá se valida y se sube con service_role al bucket público.
// Así no hay que abrir Storage RLS a los clientes.
//
// Body: { imageB64: 'data:image/jpeg;base64,...', prefix?: 'medidores'|'comprobantes'|'renta' }
// Resp: { url: 'https://<ref>.supabase.co/storage/v1/object/public/uploads/<prefix>/<uuid>.jpg' }
import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

const URL_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = process.env.STORAGE_BUCKET || 'uploads'

const PREFIXES = ['medidores', 'comprobantes', 'renta', 'otros']
const EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

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

  // Validar JWT (admin o inquilino — cualquier usuario autenticado puede subir).
  const sbUser = createClient(URL_BASE, ANON_KEY)
  const { data: userData, error: authErr } = await sbUser.auth.getUser(jwt)
  if (authErr || !userData?.user) return json({ error: 'invalid jwt' }, 401)

  let body
  try { body = await req.json() } catch { return json({ error: 'invalid body' }, 400) }

  const { imageB64 } = body
  const prefix = PREFIXES.includes(body.prefix) ? body.prefix : 'otros'

  if (typeof imageB64 !== 'string' || !imageB64.startsWith('data:image/')) {
    return json({ error: 'invalid image (expected data:image/...)' }, 400)
  }
  // Límite generoso (ya no vive en la DB): ~3MB de base64.
  if (imageB64.length > 3_000_000) return json({ error: 'image too large (max ~2MB)' }, 413)

  // Parsear data URL: data:<mime>;base64,<datos>
  const match = imageB64.match(/^data:([^;]+);base64,(.*)$/s)
  if (!match) return json({ error: 'malformed data url' }, 400)
  const mime = match[1]
  const ext = EXT[mime]
  if (!ext) return json({ error: 'unsupported image type: ' + mime }, 415)

  // base64 → bytes (atob existe en el runtime edge)
  let bytes
  try {
    const bin = atob(match[2])
    bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  } catch {
    return json({ error: 'invalid base64' }, 400)
  }

  const uuid = crypto.randomUUID()
  const path = `${prefix}/${uuid}.${ext}`

  const sbAdmin = createClient(URL_BASE, SERVICE_KEY)
  const { error: upErr } = await sbAdmin.storage.from(BUCKET).upload(path, bytes, {
    contentType: mime,
    cacheControl: '31536000', // 1 año; los nombres son únicos (UUID), nunca se reescriben
    upsert: false,
  })
  if (upErr) return json({ error: 'upload error: ' + upErr.message }, 500)

  const { data: pub } = sbAdmin.storage.from(BUCKET).getPublicUrl(path)
  return json({ url: pub.publicUrl, path })
}
