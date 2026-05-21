// ============================================================================
// Plaza Stefany — Setup de usuarios en Supabase Auth
// ============================================================================
//
// Uso:
//   1. Copiá la service_role key de Supabase a una variable de entorno local:
//        Windows PowerShell:  $env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
//        Bash:                export SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
//   2. Setear también la URL:
//        $env:SUPABASE_URL="https://tvlyfoelvgoixeneqfro.supabase.co"
//   3. Setear el password del admin (elegilo vos, guardalo en 1Password):
//        $env:ADMIN_PASSWORD="..."
//   4. node security/02-setup-auth.cjs
//
// Crea 4 usuarios:
//   admin@plaza-stefany.local        ← vos (con ADMIN_PASSWORD)
//   tatys@plaza-stefany.local        ← Tatys     (password actual: tatys2026.)
//   centrodsd@plaza-stefany.local    ← DSD       (password actual: DSD2026.)
//   fenixstorehn@plaza-stefany.local ← Fenix     (password actual: fenixhn2026.)
//
// Idempotente: si el usuario ya existe, lo skipea (no falla).
// ============================================================================

const URL = process.env.SUPABASE_URL || 'https://tvlyfoelvgoixeneqfro.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!KEY) {
  console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en env vars.');
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  console.error('❌ Falta ADMIN_PASSWORD en env vars (elegila fuerte y guardala en 1Password).');
  process.exit(1);
}

const USERS = [
  { email: 'admin@plaza-stefany.local',        password: ADMIN_PASSWORD,    role: 'admin' },
  { email: 'tatys@plaza-stefany.local',        password: 'tatys2026.',      role: 'inquilino' },
  { email: 'centrodsd@plaza-stefany.local',    password: 'DSD2026.',        role: 'inquilino' },
  { email: 'fenixstorehn@plaza-stefany.local', password: 'fenixhn2026.',    role: 'inquilino' },
];

async function createUser(user) {
  const body = {
    email: user.email,
    password: user.password,
    email_confirm: true, // saltarse verificación de email (los dominios .local no existen)
    user_metadata: { role: user.role },
  };
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (res.ok) {
    console.log(`✅ ${user.email} creado (${user.role})`);
  } else if (text.includes('already been registered') || text.includes('User already registered')) {
    console.log(`↪️  ${user.email} ya existía, skipeado`);
  } else {
    console.error(`❌ Error con ${user.email}: ${res.status} ${text.substring(0, 200)}`);
  }
}

(async () => {
  console.log(`Conectando a ${URL}...\n`);
  for (const user of USERS) {
    await createUser(user);
  }
  console.log('\nListo. Probá login en la app:');
  console.log('  Admin: dejá usuario vacío + tu ADMIN_PASSWORD');
  console.log('  Tenant: usuario "tatys" / password "tatys2026."');
})();
