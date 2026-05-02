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
  }
}

if (typeof window !== 'undefined') {
  window.storage = storage
}

export default storage
