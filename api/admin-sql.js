// ONE-SHOT endpoint para ejecutar el SQL de migración de RLS.
// Requiere x-admin-key matching ADMIN_SQL_KEY env var (set ad-hoc para esta corrida).
// BORRAR este archivo después de aplicada la migración.
import postgres from 'postgres'

export const config = { runtime: 'nodejs' }

const RLS_SQL = `
DROP POLICY IF EXISTS "authenticated_only" ON kv_store;
DROP POLICY IF EXISTS "auth_read" ON kv_store;
DROP POLICY IF EXISTS "admin_insert" ON kv_store;
DROP POLICY IF EXISTS "admin_update" ON kv_store;
DROP POLICY IF EXISTS "admin_delete" ON kv_store;

CREATE POLICY "auth_read" ON kv_store
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_insert" ON kv_store
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') = 'admin@plaza-stefany.local'
  );

CREATE POLICY "admin_update" ON kv_store
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') = 'admin@plaza-stefany.local'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') = 'admin@plaza-stefany.local'
  );

CREATE POLICY "admin_delete" ON kv_store
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') = 'admin@plaza-stefany.local'
  );
`

export default async function handler(req, res) {
  // Detectar conexión PG en env vars (varios nombres comunes que Vercel/Supabase setean)
  const candidates = [
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
    process.env.SUPABASE_DB_URL,
  ].filter(Boolean)

  if (candidates.length === 0) {
    return res.status(500).json({
      error: 'no postgres connection string en env vars',
      hint: 'agregá POSTGRES_URL_NON_POOLING en Vercel (desde Supabase → Settings → Database)',
      checked: ['POSTGRES_URL_NON_POOLING', 'POSTGRES_URL', 'DATABASE_URL', 'SUPABASE_DB_URL'],
    })
  }

  const connectionString = candidates[0]
  const sql = postgres(connectionString, { max: 1, idle_timeout: 5, prepare: false })

  try {
    await sql.unsafe(RLS_SQL)
    const policies = await sql`
      SELECT policyname, cmd, roles
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'kv_store'
      ORDER BY policyname
    `
    await sql.end()
    return res.status(200).json({ ok: true, policies, message: 'RLS migrado' })
  } catch (e) {
    try { await sql.end() } catch {}
    return res.status(500).json({ error: e.message })
  }
}
