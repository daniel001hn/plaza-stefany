# Migración de seguridad — paso a paso

**Lo que vas a hacer:** cerrar el acceso libre a tu base de datos. Hoy cualquiera con la anon key (pública en el bundle JS) puede leer, escribir y borrar todo. Después de esta migración, solo usuarios autenticados pueden hacerlo.

**Tiempo total:** ~15 minutos.

---

## Antes de empezar

Asegurate de tener:

- Acceso al dashboard de Supabase: https://supabase.com/dashboard
- El password admin que quieras usar (elegilo ahora, guardalo en 1Password)
- Node.js instalado (`node --version` debe responder)

---

## Paso 1 — Esperar al deploy

El commit con el código de auth nuevo ya está pusheado. Vercel deploya en 1–2 min. Andá a https://vercel.com → tu proyecto → Deployments y esperá el check verde.

**No hagas el paso 2 hasta que el deploy esté listo.** Si activás RLS antes, la app se rompe para todos.

---

## Paso 2 — Crear los usuarios en Supabase Auth

Abrí una PowerShell o terminal en la carpeta del proyecto:

```powershell
cd C:\Users\ALIENWARE\Documents\plaza-stefany

# Tu service role key (la copiaste en Vercel como SUPABASE_SERVICE_ROLE_KEY)
$env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_EKaW7Cd3SfYIOvTsF82uJ..."

# Tu URL de Supabase
$env:SUPABASE_URL="https://tvlyfoelvgoixeneqfro.supabase.co"

# El password admin que querés usar (elegí algo fuerte)
$env:ADMIN_PASSWORD="tu-password-fuerte-aca"

node security/02-setup-auth.cjs
```

Deberías ver:

```
✅ admin@plaza-stefany.local creado (admin)
✅ tatys@plaza-stefany.local creado (inquilino)
✅ centrodsd@plaza-stefany.local creado (inquilino)
✅ fenixstorehn@plaza-stefany.local creado (inquilino)
```

Si decís "ya existían": está bien, idempotente.

---

## Paso 3 — Setear env vars en Vercel

Andá a https://vercel.com → tu proyecto → Settings → Environment Variables.

Agregá / verificá estas:

| Variable                       | Valor                                       | Notas                          |
| ------------------------------ | ------------------------------------------- | ------------------------------ |
| `VITE_SUPABASE_URL`            | `https://tvlyfoelvgoixeneqfro.supabase.co` | Ya debería estar               |
| `VITE_SUPABASE_ANON_KEY`       | (la anon key larga)                         | Ya debería estar               |
| `SUPABASE_SERVICE_ROLE_KEY`    | `sb_secret_...`                             | Ya está, solo verificá         |
| `VITE_APP_PASSWORD`            | (tu password admin, igual al del paso 2)    | **NUEVA, REQUERIDA**           |
| `CRON_SECRET`                  | (string random hex 64 chars)                | **NUEVA**, generala con:       |

Para `CRON_SECRET`, en PowerShell:

```powershell
[System.BitConverter]::ToString((1..32 | ForEach-Object { Get-Random -Maximum 256 })).Replace('-','')
```

Después de agregar las nuevas env vars, Vercel te ofrece "Redeploy" — dale.

---

## Paso 4 — Activar RLS en Supabase

Ahora sí, andá a https://supabase.com/dashboard → tu proyecto → **SQL Editor** → New query.

Pegá esto y dale Run:

```sql
-- Activar Row Level Security
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;

-- Política: solo authenticated puede acceder
DROP POLICY IF EXISTS "authenticated_only" ON kv_store;
CREATE POLICY "authenticated_only" ON kv_store
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

(O abrí `security/01-enable-rls.sql` y pegá todo.)

**Después de correr esto, la anon key queda inútil.** Cualquier sesión activa que no haya hecho login con Supabase Auth se rompe.

---

## Paso 5 — Test

Abrí https://plaza-stefany.vercel.app en una pestaña incógnito.

1. Login admin: dejá usuario vacío, password = el `ADMIN_PASSWORD` que pusiste
2. Verificá que cargan los datos (locales, pagos, factura ENEE, etc)
3. Logout
4. Login inquilino: `tatys` / `tatys2026.`
5. Verificá que ve su historial

Si todo funciona: **listo, migración completa**.

Si algo se rompe, podés revertir RLS rápido:

```sql
ALTER TABLE kv_store DISABLE ROW LEVEL SECURITY;
```

Y avisame qué falló para diagnosticar.

---

## Después de la migración (futuro)

- **Rotar passwords de inquilinos** cuando puedas (los actuales fueron compartidos en WhatsApp). En el admin de Supabase, Settings → Authentication → Users.
- **Quitar el fallback legacy de App.jsx**: cuando confirmes que todo funciona con Supabase Auth, podemos eliminar el PASO 2 del handleSubmit que aún acepta auth vieja.
- **Quitar `usuarios` del config en kv_store**: ya no se usa para autenticación, solo para lookup de nombre/localId. Podríamos guardar eso aparte sin passwords.

---

## Ante cualquier duda, decime ANTES de hacer el paso 4 (RLS).
