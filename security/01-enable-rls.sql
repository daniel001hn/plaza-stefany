-- ============================================================================
-- Plaza Stefany — Activar Row Level Security en kv_store
-- ============================================================================
--
-- Ejecutá este SQL en: https://supabase.com/dashboard → SQL Editor → New query
--
-- Después de correr esto, la app deja de funcionar para sesiones no autenticadas.
-- ANTES de correr: asegurate de haber:
--   1. Deployado el código nuevo (commit con migración a Supabase Auth)
--   2. Corrido `security/02-setup-auth.cjs` para crear los 4 usuarios en Supabase Auth
--
-- Si algo sale mal: ROLLBACK con `ALTER TABLE kv_store DISABLE ROW LEVEL SECURITY;`
-- ============================================================================

-- 1) Activar RLS
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;

-- 2) Limpiar políticas viejas si existieran (idempotente)
DROP POLICY IF EXISTS "authenticated_only" ON kv_store;
DROP POLICY IF EXISTS "auth_read" ON kv_store;
DROP POLICY IF EXISTS "auth_write" ON kv_store;
DROP POLICY IF EXISTS "anon_blocked" ON kv_store;

-- 3) Política única: solo usuarios autenticados pueden hacer cualquier cosa.
--    Esto bloquea por completo a la anon key (que está en el bundle JS público).
CREATE POLICY "authenticated_only" ON kv_store
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4) Verificación: chequear que se aplicó
-- SELECT * FROM kv_store; -- desde anon key → debería dar 0 filas o error
-- SELECT * FROM kv_store; -- desde service_role → todas las filas

-- ============================================================================
-- NOTA sobre granularidad:
-- Esta política da acceso TOTAL a cualquier usuario autenticado (admin o
-- inquilino). Para Plaza Stefany con 3-5 inquilinos conocidos, es razonable.
-- Si en el futuro querés que inquilinos solo lean (no escriban), reemplazá
-- por dos políticas: SELECT TO authenticated + INSERT/UPDATE TO admin_uid.
-- ============================================================================
