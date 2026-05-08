// Adapter that emulates window.storage (Claude artifacts API) using Supabase
// Returns the value as a JSON string (matching artifact API contract)
import { supabase } from './supabaseClient'

const storage = {
  async get(key) {
    const { data, error } = await supabase
      .from('kv_store')
      .select('value')
      .eq('key', key)
      .maybeSingle()
    if (error) { console.error('storage.get', key, error); return null }
    if (!data) return null
    return typeof data.value === 'string' ? data.value : JSON.stringify(data.value)
  },
  async set(key, value) {
    let parsed
    try { parsed = typeof value === 'string' ? JSON.parse(value) : value }
    catch (e) { parsed = value }
    const { error } = await supabase
      .from('kv_store')
      .upsert({ key, value: parsed, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) { console.error('storage.set', key, error); return false }
    return true
  },
  async delete(key) {
    const { error } = await supabase.from('kv_store').delete().eq('key', key)
    return !error
  },
  // Suscribirse a cambios en kv_store. callback({ key, value, eventType }).
  // Si Realtime no está habilitado en Supabase, no falla — el polling es el fallback.
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
