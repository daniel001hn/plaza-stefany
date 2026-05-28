# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Business context, billing rules, and deployment ops are documented in `C:/Users/ALIENWARE/CLAUDE.md` (loaded automatically by Claude Code). This file focuses on **architecture and developer workflow** for this specific repo.

---

## Commands

```bash
npm run dev          # Vite dev server, http://localhost:5173
npm run build        # Production build → dist/
npm run preview      # Serve the production build locally
```

Production deploys auto-trigger on push to `main` via Vercel. There is no test suite, no linter; verify changes by running `dev` and exercising the app, or by writing throwaway `.cjs` scripts in `scripts/` (the existing ones — anything matching `_*.cjs` — are gitignored-equivalent helpers used during debugging).

### Scripts of note
- `node scripts/capturar-screenshots.cjs` — uses Playwright to log in as a tenant and capture screenshots of the live production app (also writes `coords.json` with element bounding boxes for annotation overlays)
- `node scripts/generar-manual-inquilino.cjs` — generates `Manual-Inquilino-Plaza-Stefany.pdf` (uses screenshots + jsPDF + Arial loaded from `C:/Windows/Fonts`)
- `node security/02-setup-auth.cjs` — idempotently creates the 4 Supabase Auth users; requires `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `ADMIN_PASSWORD` env vars

---

## Architecture

### One table, four keys
The entire app stores data in a **single Supabase Postgres table** called `kv_store`, which has just `(key text, value jsonb, updated_at timestamptz)`. There are exactly four key shapes:

- `config-and-locales` → `{ config: {...}, locales: [...] }` — global config + array of locales
- `pagos:YYYY-MM` → `{ pagos: { [localId]: {...} }, factura: {...} }` — per-month bill and per-tenant payment state
- `audit-log` → array of admin actions, capped at 500 entries
- `historial-tasas` → array of BAC exchange-rate snapshots

This means almost every "write" is a read-modify-write on a JSON blob. **All concurrent-write code paths must re-read the row immediately before saving and merge** — otherwise an admin overwrite can wipe a tenant's just-uploaded comprobante. The pattern is implemented in `updatePayment`/`updateFactura` ([PlazaStefany.jsx](src/PlazaStefany.jsx#L597-L675)) and via optimistic-locking-with-retry in [api/inquilino-comprobante.js](api/inquilino-comprobante.js).

### Auth & access control
- Supabase Auth with fake `@plaza-stefany.local` emails (admin + one per tenant)
- RLS on `kv_store` enforces: anyone authenticated can SELECT; only admin (`auth.jwt() -> user_metadata -> role = 'admin'` OR `email = admin@plaza-stefany.local`) can INSERT/UPDATE/DELETE
- Tenants therefore **cannot write directly to `kv_store`**. Their one write — uploading a payment comprobante — goes through `/api/inquilino-comprobante`, a Vercel Edge function that validates the JWT, resolves the tenant's localId, then writes with `service_role` (which bypasses RLS)
- RLS migration in [security/02-tighten-rls.sql](security/02-tighten-rls.sql); applied manually via Supabase SQL editor

### Storage adapter shim
[src/storageAdapter.js](src/storageAdapter.js) exposes `window.storage.get/set/delete/subscribe` that proxies to Supabase. This exists because the app was originally built against the Claude Artifacts `window.storage` API and the abstraction was preserved for portability. **Don't import the Supabase client directly from components** — go through `window.storage` so the realtime subscribe + JSON wrap/unwrap stays consistent.

### Two React views
- [src/PlazaStefany.jsx](src/PlazaStefany.jsx) (~3000 lines) — admin view. Dashboard, historial (3 tabs: Plaza/Locales/ENEE with annual cuadratura), factura ENEE modal, payment modal, locale-edit modal, config view with users/cargos-fijos/tarifas
- [src/InquilinoView.jsx](src/InquilinoView.jsx) — tenant view. History from `contratoDesde` forward, comprobante upload, receipt downloads, gated by tasa freshness

[src/App.jsx](src/App.jsx) is the auth gate: `supabase.auth.getSession()` is source of truth (with a 2s watchdog timeout to avoid hangs), `sessionStorage` is just a derived cache of `{ role, localId, nombre }`. Routes to PlazaStefany or InquilinoView based on role.

### PDF receipt pipeline
[src/generarReciboPdf.js](src/generarReciboPdf.js) generates both renta and luz receipts client-side with jsPDF + jspdf-autotable. The header is `public/membrete-header.png` (3600×600 D&L Soluciones letterhead) added with compression `'SLOW'` — this keeps PDFs ~27KB. If photos of the submedidor were uploaded with the lectura, a page 2 with both photos is appended.

### Exchange rate cron
[api/tasa-bac.js](api/tasa-bac.js) is a Vercel Edge function with a cascade: Ficohsa → BAC → forex-generic. Runs daily at 13:00 UTC (7am Tegucigalpa) via `vercel.json` cron. Writes to `config-and-locales.config.tasaCambio` + `tasaFechaActualizada` + `tasaFuente`. Browser also calls it as fallback if the saved date isn't today's Honduras date.

### Calculation helpers
The complex parts of the luz cálculo live in pure functions at the top of [PlazaStefany.jsx](src/PlazaStefany.jsx#L100-L160):
- `calcConsumoLocal` — handles meter-replaced-this-month case via `lecturaInicialReseteo`
- `calcTotalKwhSubmedidores`, `calcCargosFijosTotal`, `calcPerLocalFijo`, `calcLocalesConMedidor`
- `calcTarifaEfectiva` — `(monto - cargosFijos) / kWhTotal` (energía neta de cargos fijos)
- These are duplicated near-verbatim in `InquilinoView.jsx` to keep tenant calc identical — **changes must be mirrored in both files** or tenant and admin will see different amounts

---

## Critical constraints

- **Windows PowerShell 5.1 only** (no PS7). No `&&`/`||`, no ternary `?:`, no `??`, no `?.`. Avoid `2>&1` on native exes.
- **Vite env var prefixing**: only `VITE_*` env vars reach the client bundle. `SUPABASE_SERVICE_ROLE_KEY` is server-only (used by `api/*.js`).
- **Vercel build cache** sometimes reuses old bundle outputs even on push. If you need to force-bust it: change something in JS source (not a comment — Vite strips those in prod), then `Redeploy` from the dashboard with "Use existing Build Cache" UNCHECKED.
- **Vercel-Supabase integration is NOT installed** → `POSTGRES_URL_NON_POOLING` and friends are not set. DDL (creating policies, altering tables) cannot be executed from a Vercel function; it must be done from the Supabase SQL Editor manually or via a script with the DB password.
- **Tenants read-only**: any new write path used by the tenant view must be implemented as a Vercel function that validates the JWT and uses `service_role`. Direct `supabase.from('kv_store').upsert()` from `InquilinoView.jsx` will fail RLS.
- **Concurrent writes**: always re-read the row right before save and merge (see pattern in `updatePayment`).
- **kWh of ENEE bill is optional**: if missing, `tarifaEfectiva` is null and the luz amount stays at 0/blank for the month. Admin loads it later when the physical bill arrives.
- **Timezone**: use `new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })` for any date that represents "today" from the admin's perspective. UTC produces off-by-one between 18:00 and 24:00 local.

---

## Conventions

- UI text: Spanish (Honduras)
- Currency: `L 1,234.56` via `Intl.NumberFormat('es-HN', ...)`
- Dates shown to users: `DD/MM/YYYY` or `'Mayo 2026'`
- Avoid emojis in jsPDF output — the embedded Helvetica/Arial only supports Latin-1. Use text badges ("AVISO", "TIP") or drawn shapes (circles, triangles) instead. Existing code in `generar-manual-inquilino.cjs` shows the pattern.
- The admin password is `Ottoniel20012005` (stored in Supabase Auth, not the bundle). Inquilino passwords: `tatys2026.`, `DSD2026.`, `fenixhn2026.`
- When manually testing as a tenant or admin, prefer Playwright scripts in `scripts/` over manual browser clicking — they're faster to re-run and self-document.

---

## Contexto guardado — 2026-05-28 12:00 (post-launch sprint)

### Decisiones técnicas
- **Dominio propio activo:** `plazastefany.com` (compra en Cloudflare ~$10/año, DNS apex A→216.198.79.1 + CNAME www→cname.vercel-dns.com, ambos DNS-only NO proxied). SSL auto. La vieja `plaza-stefany.vercel.app` sigue funcionando como backup.
- **Brand correcto: "Stefany Plaza"** (no "Plaza Stefany"). Cambiado en todo el UI + DB `config.plazaNombre` + recibos PDF + manual. El dominio queda como está hasta renovación 2027.
- **Code-split aplicado:** `React.lazy()` para PlazaStefany y InquilinoView. Bundle inicial bajó de 880KB→358KB (gzip 246KB→102KB). jsPDF también lazy via `loadPdf()` (no se descarga hasta clickear "Generar recibo").
- **calculos.js compartido:** funciones de cálculo de luz extraídas a `src/calculos.js`. Antes estaban duplicadas en PlazaStefany.jsx y InquilinoView.jsx — un bug arreglado en una NO se propagaba a la otra. Ahora ambos importan del módulo único.
- **Modales extraídos a `src/modals/`:** LocalEditModal, FacturaModal, PaymentModal (cada uno ~150-330 líneas). PlazaStefany.jsx pasó de 3232→~2700 líneas.
- **React.memo en componentes pesados:** KPI, KPIPending, FacturaCard, LocalRow. Evita re-renders cuando admin cambia un toast o tab.
- **Polling redundante eliminado:** antes `setInterval(reload, 60000)` cargaba 13 queries cada minuto AUNQUE Realtime ya escuchaba cambios. Ahora si Realtime conecta (~5s post-mount), polling se omite. Si no conecta, fallback 5min.
- **iOS refresh fix (optimistic restore):** App.jsx lee sessionStorage cacheado en initial state y muestra la view INMEDIATO al refresh. getSession() valida en background; si JWT inválido, ahí recién kickea a login. Antes el watchdog de 2s siempre disparaba primero en iOS y mostraba LoginScreen.
- **Login watchdog "respect user intent":** si watchdog mostró LoginScreen y user está tipeando, getSession tardío NO setea sesión automáticamente. Solo `SIGNED_IN` (click Continuar) puede setear después. Antes en F5 lento te tiraba al dashboard del último user mientras tipeabas.
- **Lightbox + ModalPortal:** todos los modales del admin + visor de imágenes ahora usan `createPortal(child, document.body)` para no quedar dentro de algún parent con `overflow`/`transform` (problema mobile clásico).
- **Comprobantes con scroll del modal:** `.ps-modal` ahora `max-height: 90vh; overflow-y: scroll` (sin `100dvh` porque no soportado iOS<15.4). Modal siempre cabe, contenido scrollea internamente.
- **api/inquilino-comprobante.js soporta 3 actions:** `upload | delete | activity`. Tenants no pueden escribir kv_store directo (RLS) — todos sus writes pasan por este endpoint con validación JWT + localId-matching.

### Estado actual
- ✅ Dominio `plazastefany.com` activo con SSL. App responde en https://www.plazastefany.com
- ✅ Performance ok: bundle inicial 358KB minified, queries en paralelo, lazy load jsPDF
- ✅ Inquilino: sube/borra comprobantes via endpoint, ve thumbnail simple con X para borrar, click en thumbnail abre lightbox in-app (no window.open)
- ✅ Admin: ComprobantesInbox en dashboard muestra pendientes. ActividadInquilinos panel muestra recibos generados + comprobantes subidos (4 tipos de actividad)
- ✅ Recibos PDF: 1ª página con datos + 2ª página opcional con fotos del medidor (anterior/actual)
- ✅ Manual del inquilino en PDF: 6 páginas, screenshots reales con flechas rojas + círculos señalando dónde tocar, estilo "para abuelos". Generado con Arial cargada de C:/Windows/Fonts
- ✅ Tasa BAC cron daily Ficohsa→BAC→forex
- ⚠️ Modales en mobile: se aplicó max-height:90vh + overflow-y:scroll (último fix sin pushear aún)

### Restricciones críticas
- **NO usar `100dvh` solo** — solo soportado iOS 15.4+. Fallback con `100vh` o `max-height: 90vh` que funciona en todo.
- **NO usar `window.open(dataUrl)`** en mobile — falla con data URLs grandes (Safari iOS no soporta o re-abre la misma app). Usar el componente `<Lightbox>` / `useLightbox()` de `src/components/Lightbox.jsx`.
- **Modales del admin DEBEN usar `<ModalPortal>`** (de `src/components/ModalPortal.jsx`) — sino algún parent con overflow los descentra y aparecen "en el top de la página" en mobile.
- **CSS `.ps-modal-backdrop` y `.ps-modal` definidos INLINE en STYLES string de PlazaStefany.jsx** — no en archivo CSS separado. Cambios al CSS van ahí.
- **InquilinoView replica funciones de cálculo:** YA NO. Importa de `src/calculos.js`. Cualquier cambio al cálculo se hace ahí.
- **registrarActividad del inquilino** NO escribe directo a kv_store — usa `/api/inquilino-comprobante` con `action: 'activity'`. RLS bloquea writes directos.
- **El watchdog de 2s + optimistic restore** son frágiles a refactors — cualquier cambio al flow de auth en App.jsx debe respetar: (1) si hay cache en sessionStorage, mostrar view INMEDIATO; (2) si watchdog disparó LoginScreen, getSession tardío NO debe interrumpir al user tipeando.
- **CSP en vercel.json** restringe orígenes: si agregás un nuevo dominio externo (ej. fetch a otra API), agregarlo a `connect-src`.
- **CRON_SECRET es required** — `api/tasa-bac.js` ahora devuelve 503 si la env var no está seteada en Vercel (antes permitía writes públicos si faltaba).
- **Mobile photo upload (inquilino comprobante):** acepta galería + cámara (sin `capture="environment"`). El de fotos del medidor del admin SÍ tiene `capture="environment"` para abrir cámara directo.

### Archivos clave (nuevos/modificados en esta sesión)
- `src/calculos.js` — NEW. Funciones de cálculo compartidas (admin + inquilino)
- `src/utils/format.js` — NEW. `fmt`, `fmt2`, `MESES`, `MESES_LARGO`, `fechaCorta`
- `src/components/Field.jsx` — NEW. Wrapper label+input para forms
- `src/components/Lightbox.jsx` — NEW. `useLightbox()` hook + `<Lightbox>` con React Portal + bg blanco sólido + Escape close
- `src/components/ModalPortal.jsx` — NEW. `<ModalPortal>` wrapper con createPortal + body scroll lock + Escape close
- `src/modals/LocalEditModal.jsx` — NEW. Extraído de PlazaStefany.jsx (~150 líneas)
- `src/modals/FacturaModal.jsx` — NEW. Extraído (~220 líneas)
- `src/modals/PaymentModal.jsx` — NEW. Extraído (~330 líneas, incluye comprimirFotoMedidor)
- `src/App.jsx` — Login screen, optimistic restore, watchdog respect intent, timeout 20s en signInWithPassword
- `src/PlazaStefany.jsx` — Imports calculos/Lightbox/ModalPortal, polling smart (Realtime primario, 5min fallback), React.memo en KPI/LocalRow/FacturaCard, `.ps-modal` con max-height 90vh
- `src/InquilinoView.jsx` — Optimistic restore, importa calculos, `borrarComprobante()`, `<ComprobanteSlot>` simple, lightbox para fotos
- `api/inquilino-comprobante.js` — Soporta `action: upload|delete|activity` con misma validación JWT + concurrencia retry x3
- `api/tasa-bac.js` — CRON_SECRET enforce 503 si falta env var, timezone Honduras (no UTC)
- `vercel.json` — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- `src/storageAdapter.js` — Timeout 10s en get/set/delete
- `src/generarReciboPdf.js` — `entregarPdf()` abre en pestaña nueva en mobile (no replace)
- `scripts/capturar-screenshots.cjs` — Playwright captura SS + coords.json con boundingBox de cada elemento
- `scripts/generar-manual-inquilino.cjs` — Genera Manual-Inquilino-Stefany-Plaza.pdf con flechas rojas señalando botones reales
- `Manual-Inquilino-Stefany-Plaza.pdf` — Output del manual

### Errores resueltos
- **Login Fenix se quedaba "Verificando…" eternamente** → ERROR: no había timeout en `signInWithPassword`. FIX: `Promise.race` con timeout 20s + mensaje "Conexión lenta — probá de nuevo o cambiá de WiFi"
- **Admin tarda 10s en cargar** → ERROR: dos `useEffect` separados llamando `loadCfg()` + loop secuencial de 13 meses + `/api/tasa-bac` bloqueante en mount. FIX: parallelizar con `Promise.all`, eliminar duplicate useEffect, mover tasa-bac al background con setTimeout(1500). Resultado: 10s → 2s
- **F5 en iOS te tira al login** → ERROR: watchdog 2s siempre dispara primero en iOS porque getSession está lento post-background. FIX: optimistic restore de sessionStorage en `useState(initialFn)`, mostrar view inmediato, validar en background
- **F5 + tipeando salta al último user** → ERROR: getSession resuelve tarde con sesión vieja y autoseteaba sesión interrumpiendo el typing. FIX: si watchdog disparó LoginScreen, getSession/TOKEN_REFRESHED no setean sesión; solo SIGNED_IN explícito
- **Imágenes no se abren en mobile** → ERROR: `window.open(dataUrl)` con base64 grandes falla en Safari iOS. FIX: lightbox in-app con React Portal
- **Modales aparecen "arriba" en mobile** → ERROR: parent con `overflow:hidden` o `transform` los empuja. FIX: `<ModalPortal>` con createPortal a body
- **Modal cortado verticalmente** → ERROR: contenido más alto que viewport, `100dvh` no soportado iOS<15.4. FIX: `max-height: 90vh; overflow-y: scroll` (compatible con todo)
- **Comprobante upload del inquilino fallaba silente** → ERROR: writes directos a kv_store bloqueados por RLS, try/catch{} comía el error. FIX: endpoint `/api/inquilino-comprobante` con service_role + validación JWT
- **Recibos generados nunca aparecían en panel "Actividad"** → ERROR: `registrarActividad` escribía directo a kv_store (RLS bloqueaba). FIX: usa endpoint con `action: 'activity'`
- **Cron BAC permitía writes públicos si CRON_SECRET no estaba** → ERROR: `if (!dryRun && cronSecret)` salteaba la validación si var faltaba. FIX: rechaza 503 si CRON_SECRET no configurado
- **Vercel reusaba build cache aunque cambiara source** → ERROR: comentarios stripped por Vite no cambian bundle hash. FIX: forzar cambio real al JS + Redeploy con "Use existing Build Cache" UNCHECKED
- **Brand era "Plaza Stefany", correcto es "Stefany Plaza"** → ERROR: todo el código decía Plaza Stefany. FIX: reemplazado en App.jsx, InquilinoView, PlazaStefany.jsx, generarReciboPdf.js, manual, DB `config.plazaNombre`
- **Generar PDF en mobile rompía la app al hacer Back** → ERROR: `doc.save()` reemplaza la página con el PDF en Safari iOS. FIX: en mobile usar `doc.output('blob')` + `window.open(blobUrl, '_blank')`

### Próximos pasos
1. **Pushear el último fix de modal scroll** (`max-height: 90vh; overflow-y: scroll`) — user lo aprobó verbalmente pero aún no se pusheó
2. **Cargar datos faltantes abril/mayo**: kWh totales de facturas ENEE de abril (L 19,582.50) y mayo (L 22,997.35). Lecturas de Tatys y DSD al 1/mayo (William los carga manual cuando los tenga)
3. **Tighten RLS** (P2): policies row-level para que tenants solo lean su propia fila (`pagos:YYYY-MM` con filtro por localId). Hoy cualquier authenticated lee todo. Aceptable para 3 tenants confiables, no para futuro con más
4. **Mover base64 comprobantes/fotos a Supabase Storage**: hoy se guardan inline en kv_store JSON (~400KB cada uno). Con más volumen va a inflar la DB. Bucket `medidores` ya creado pero sin usar
5. **Hashear passwords plaintext de tenants en config.usuarios**: ya removidos del config (solo metadata), pero si los volvés a agregar usar Supabase Auth Admin API, no plaintext
6. **Refactor restante de PlazaStefany.jsx**: aún 2700 líneas. Si crece más, extraer DashboardView, HistorialView, ConfigView (compartir state via React Context)
7. **Backup automático**: Free plan Supabase no incluye. Upgrade Pro ($25/mes) o pg_dump manual mensual cuando la data se vuelva crítica
