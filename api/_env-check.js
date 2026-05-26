// Lista nombres (NO valores) de env vars que matchean patrones de PG/DB.
// Sin valores = sin exponer secretos. Borrar despues de inspeccion.
export const config = { runtime: 'edge' }

export default async function handler() {
  const all = Object.keys(process.env || {})
  const candidates = all.filter(k =>
    /POSTGRES|DATABASE|DB_URL|PG_|SUPABASE_DB/i.test(k)
  ).sort()
  return new Response(JSON.stringify({
    found: candidates,
    total_env_vars: all.length,
    sample_other_vars: all.filter(k => !candidates.includes(k)).slice(0, 20),
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
}
