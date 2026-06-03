// Sube una imagen base64 al endpoint /api/upload-image y devuelve la URL pública
// de Storage. Usado por el admin (PaymentModal) para fotos de medidor y adjuntos.
// El inquilino sube por /api/inquilino-comprobante (que también va a Storage).
import { supabase } from './supabaseClient'

export async function uploadImage(imageB64, prefix = 'otros') {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Sin sesión activa')

  const res = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ imageB64, prefix }),
  })
  if (!res.ok) {
    let msg = 'Error subiendo imagen'
    try { msg = (await res.json()).error || msg } catch {}
    throw new Error(msg)
  }
  const { url } = await res.json()
  return url
}
