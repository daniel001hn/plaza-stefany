-- ============================================================================
-- Plaza Stefany — RLS granular
-- ============================================================================
-- Antes: cualquier authenticated podía leer Y escribir todo el kv_store.
--        Eso significa que un inquilino podía modificar tarifas, borrar
--        datos, o editar pagos de otros locales.
--
-- Ahora: cualquier authenticated puede LEER (necesario para que la app
--        funcione — los inquilinos ven su historial). Solo el admin puede
--        ESCRIBIR. Los inquilinos suben sus comprobantes vía la Vercel
--        function /api/inquilino-comprobante que valida JWT y escribe con
--        service_role solo a la fila correcta.
-- ============================================================================

-- 1. Borrar la policy permisiva
DROP POLICY IF EXISTS "authenticated_only" ON kv_store;

-- 2. Read: cualquier authenticated (admin o inquilino) puede leer
CREATE POLICY "auth_read" ON kv_store
  FOR SELECT TO authenticated
  USING (true);

-- 3. Insert: solo admin
CREATE POLICY "admin_insert" ON kv_store
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') = 'admin@plaza-stefany.local'
  );

-- 4. Update: solo admin
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

-- 5. Delete: solo admin
CREATE POLICY "admin_delete" ON kv_store
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') = 'admin@plaza-stefany.local'
  );
