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

---

## Contexto guardado — 2026-06-01 (sesión modales + tasa + perf)

### Decisiones técnicas
- **Modales: scrollea el OVERLAY, no el modal.** `.ps-modal-backdrop` = `display:flex; justify-content:center; overflow-y:auto` y `.ps-modal` usa `margin:auto` (truco flexbox: centrado si cabe, alineado arriba + scrollable si es más alto que la pantalla). Reemplazó `max-height:90vh + overflow-y:scroll` que con `align-items:center` dejaba el tope del modal inalcanzable. ReporteMensualModal (no usa `.ps-modal`) lleva el mismo `margin:auto` inline.
- **Factura ENEE — medidor principal = kWh directos.** Ya NO se guarda lectura anterior→actual del edificio. Campo único `consumoEdificio` (kWh del período 11→11). `calcConsumoPrincipal` prefiere `factura.consumoEdificio`, fallback a `lecturaPrincipal` para meses viejos. **Los submedidores de cada local SIGUEN con inicio→final** (no se tocaron).
- **Locales vacíos / cargos fijos = OPCIÓN B.** William ABSORBE los cargos fijos de los locales sin rentar (no se reparten entre inquilinos). `aporteDueno = montoENEE − totalLuz` por mes (= parte fija de los vacíos). **Edits 1 y 2 hechos (cómputo en monthsData + yearTotals) pero NO se muestra aún** — falta edit 3 (mostrarlo en tarjeta Cuadratura). Dormido a propósito.
- **storageAdapter resiliente:** retry backoff (3 intentos, timeout 6s c/u) + cache localStorage. `get()` network-first; si todo falla sirve la última copia cacheada (no `null`). Expone `getCached(key)` sincrónico.
- **Dedup de lecturas en storageAdapter:** coalescing (comparte request en vuelo por clave) + micro-cache 1.5s. Colapsó la ráfaga de login donde `config-and-locales` se pedía 3× (App.handleSubmit + App.deriveSession + InquilinoView.load) → 1×. `set`/`delete`/realtime invalidan la micro-cache.
- **InquilinoView cache-first:** pinta al instante desde `getCached` y refresca en background. Reabrir: ~3.3s → **~0.27s**. Guard `inFlight` + throttle 3s. Intervalo refresco 30s→60s.
- **ErrorBoundary global** (`src/ErrorBoundary.jsx`) envuelve `<App>` — cualquier crash muestra "Recargar" en vez de blanco.
- **Gate de recibos relajado a 7 días:** antes exigía tasa de HOY exacto → bloqueaba cada madrugada (cron 7am) y todo el día si el cron fallaba. Ahora `diasTasa <= 7`.
- **Admin auto-cura la tasa:** al abrir el panel, si está vieja hace `fetch('/api/tasa-bac?dryRun=1')` y persiste como admin (RLS permite) con merge. Redundancia si el cron falla.

### Estado actual
- ✅ `CRON_SECRET` AHORA SÍ está en Vercel (verificado: `GET /api/tasa-bac` da 401, no 503). Cron actualiza tasa diario otra vez.
- ✅ Tasa fresca, recibos desbloqueados.
- ✅ RLS write-tightening CONFIRMADO aplicado (inquilino no puede escribir kv_store). Read sigue abierto a todos (limitación del blob único).
- ✅ Recibo luz exige lectura cargada; recibo renta siempre descargable.
- ✅ Modales caben/scrollean en iPhone (vertical + horizontal). Stress test 105 OK / 0 fallos.
- ✅ Reabrir app ~0.27s (cache-first). Cold load (1ª vez sin cache) ~2.8s (auth + distancia a Oregon, inherente).
- ⏳ Cuadratura "aporte dueño": cómputo listo, display pendiente (1 edit).

### Restricciones críticas
- **`CRON_SECRET` DEBE existir en Vercel** o tasa-bac da 503 → cron no persiste → recibos bloqueados. Verificar: `GET /api/tasa-bac` (401=ok, 503=falta).
- **NO `display:grid` sin `grid-template-columns`** para listas con texto `nowrap` (la columna auto desborda). Usar flex column + `minWidth:0`.
- **Modales: overlay scrollea con `margin:auto`, NO `align-items:center`+`max-height`.**
- **Aislamiento de lectura por inquilino NO posible con el esquema actual** (`pagos:YYYY-MM` = un blob con todos). Requiere partir en `pagos:YYYY-MM:localId` (migración grande). Decisión A (migrar) vs B (dejar) pendiente.
- **Organizar el código en carpetas NO mejora la velocidad** — el browser baja el mismo bundle. La lentitud es latencia a Supabase (Oregon).
- **Feature de email/recordatorios ELIMINADA** (hacía fetch a `gmailmcp.googleapis.com` inexistente y mentía con alert de éxito). No reintroducir sin backend de email real.
- **micro-cache storageAdapter = 1.5s** (set/delete/realtime la invalidan).

### Archivos clave (modificados esta sesión)
- `src/storageAdapter.js` — retry+cache+coalescing+micro-cache, `getCached()`
- `src/InquilinoView.jsx` — cache-first, throttle/inFlight, gate tasa 7 días, luz exige `consumo!=null`, renta siempre, guard `!local`
- `src/PlazaStefany.jsx` — modales overlay-scroll, DetalleCobro flex column, admin auto-cura tasa, aporteDueno (dormido), ReporteMensual margin:auto
- `src/modals/FacturaModal.jsx` — campo `consumoEdificio` (kWh 11→11)
- `src/calculos.js` — `calcConsumoPrincipal` usa consumoEdificio; `calcConsumoLocal` guard `!locale`
- `src/ErrorBoundary.jsx` — NEW; `src/main.jsx` — envuelve App
- `vercel.json` — CSP permite fonts.googleapis.com + fonts.gstatic.com
- `scripts/_stress-test.cjs` / `_rls-probe.cjs` / `_check-tasa.cjs` / `_perf-probe.cjs` — helpers diagnóstico

### Errores resueltos
- **Modal ENEE cortado en iPhone** → `align-items:center`+`max-height` dejaba el tope fuera → overlay scrollea con `margin:auto`
- **Filas DetalleCobro desbordaban a la derecha** → grid sin template, columna auto al nombre nowrap → flex column + minWidth:0
- **Inquilino crasheaba en blanco al refrescar** → `calcConsumoLocal(undefined)` con storage.get timeout → guard `!locale` + try/catch + ErrorBoundary + guard `!local`
- **CSP bloqueaba fonts Google** → faltaban dominios → agregados
- **Recibos bloqueados** → CRON_SECRET faltaba → cron 503 desde 28-may → tasa congelada → seteado + gate 7 días + admin auto-cura
- **Luz se descargaba sin lectura** → `tieneLuz` no exigía consumo → `&& consumo != null`
- **Renta no se descargaba (mes actual impago)** → `rentaPagada || !esActual` → `= true`
- **config-and-locales 3× en login** → 3 callers → coalescing + micro-cache → 1×

### Próximos pasos
1. **Terminar cuadratura "aporte dueño" (edit 3)** — mostrar `aporteDueno` en tarjeta Cuadratura + redefinir `cuadra` (✅ cuando lo cobrable está cobrado; el aporte del dueño no es faltante). Cómputo ya en monthsData/yearTotals.
2. **Opción C (perf):** cargar solo mes actual + 2 al abrir admin, resto al scroll (baja la cold load).
3. **Cache-first en el admin** (PlazaStefany) como InquilinoView.
4. **Decisión RLS A vs B** (partir blob pagos por local).
5. **Tabla tipo Excel** para lecturas (columnas=meses, inicio/final) — pedido de William, no empezado.
6. Pendientes viejos: datos abril/mayo, Storage para comprobantes, refactor, backups.

---

## Contexto guardado — 2026-06-03 (imágenes a Storage + decisión "no Fase B")

### Decisiones técnicas
- **Imágenes a Supabase Storage (Fase A, HECHA).** Las fotos de medidor, comprobantes del inquilino y el adjunto de renta ya NO se guardan como base64 inline en `kv_store` (inflaban la fila del mes: `pagos:2026-05` pesaba 1 MB). Ahora van a un **bucket público `uploads`** con nombre UUID (`uploads/{comprobantes|medidores|renta}/<uuid>.jpg`) y en `kv_store` queda solo la **URL pública**. Resultado: `pagos:2026-05` 1011 KB → 2.7 KB; junio 413→0.8 KB; abril 110→1.5 KB. **0 base64 restantes** en la DB.
- **Bucket público + nombres UUID** (no privado/signed URLs). Elegido por simplicidad: las URLs andan directo en `<img>` y en el PDF. Riesgo aceptado: quien tenga la URL la abre siempre. Justificación: la data no es sensible (capturas de transferencias, montos de renta por fórmula pública).
- **Toda subida pasa por un endpoint** (`api/upload-image.js` para admin, `api/inquilino-comprobante.js` para inquilino) que valida JWT y sube con `service_role`. Así NO hubo que abrir Storage RLS a los clientes.
- **`storageAdapter` NO se tocó** — sigue con el modelo blob. El cambio fue solo dónde viven las imágenes, no la estructura de `kv_store`.
- **Fase B (normalizar schema) DESCARTADA a propósito.** Partir `kv_store` en tablas reales (`config`/`locales`/`pagos`/`facturas`) resolvía dos cosas: (1) aislamiento RLS por inquilino, (2) hot-row de escritura. **Ninguna aplica hoy:** la app es de **control sin data sensible** (William confirmó), así que la privacidad por-inquilino no protege nada que importe; y la contención de escritura no existe a 3 inquilinos. B sería reescribir la capa de datos de una app en producción que funciona = riesgo sin payoff. **Premature optimization.** El dolor real (blobs de 1 MB) ya se pagó en A.

### Estado actual
- ✅ Fase A deployada y verificada: bucket `uploads` público, 7 imágenes migradas (script `_migrate-images-to-storage.cjs --apply`), URL pública responde HTTP 200. App backward-compatible (lee base64 viejo y URL nuevo, aunque ya no quedan base64).
- ✅ Backup completo pre-migración en `scripts/_backups/kvstore-2026-06-03T22-55-57/` (7 filas, 1.5 MB, full-dump + 1 archivo por clave). Generado con `_backup-kvstore.cjs` (login admin → JWT, NO usa service key).
- ⚠️ Existe un bucket viejo `medidores` (público) sin usar — se quedó de antes, no estorba.

### Restricciones críticas
- **La `SUPABASE_SERVICE_ROLE_KEY` en Vercel DEBE ser la key actual** o las subidas nuevas (admin y inquilino) dan 500. El formato nuevo es `sb_secret_...`.
- **La service key (formato `sb_secret_p7ug…`) quedó en el chat de esta sesión** — William debe rotarla en Supabase → Settings → API. (No se escribe completa acá a propósito; GitHub push protection la bloquea.)
- **Borrar una foto/comprobante deja el archivo huérfano en Storage** (no se borra el objeto, solo la URL en `kv_store`). Leak menor, aceptable a este volumen.
- **NO reabrir Fase B** sin un driver real: más edificios / muchos más locales (ahí duele el blob + contención), data realmente sensible, o necesidad de reportes SQL sobre pagos. Mientras sea 1 edificio / 3-5 inquilinos / control sin data sensible, el `kv_store` blob es pragmático y correcto.

### Otros cambios de UI en esta sesión (admin)
- **Recibo de luz:** tabla "Cálculo del monto" sin detalle de plaza — solo Cargos por servicios (= fijoLocal), Tarifa efectiva por kWh, Consumo del local. Quitada la palabra "Su".
- **Historial:** el dropdown de mes **resalta + scrollea** la fila del mes (ya no filtra — filtrar colapsaba los gráficos de tendencia a un bloque). Gráficos/tablas siempre muestran el año completo.
- **KPIs:** el conteo de Pendientes/totales **excluye locales vacíos** (sin inquilino) para cuadrar con el drill-down.
- **PaymentModal:** campo "Monto pagado" en renta (override de lo cobrado, no del esperado/recibo); fecha más compacta; subir comprobante de renta (solo nombre + ✓, sin preview, key `adjuntoRenta`). **Quitados:** N° factura, enlace de factura, "submedidor reemplazado".
- **Dead code:** removido `aporteDueno` (se calculaba y nunca se mostraba).

### Archivos clave (nuevos/modificados)
- `api/upload-image.js` — NEW. Endpoint subida admin → Storage, valida JWT, service_role.
- `src/uploadImage.js` — NEW. Helper cliente (getSession → POST /api/upload-image → URL).
- `api/inquilino-comprobante.js` — el `action:upload` sube a Storage y guarda URL (antes base64 inline).
- `src/generarReciboPdf.js` — `toDataUrl()` baja la URL→bytes para `addImage` (maneja base64 y URL).
- `src/modals/PaymentModal.jsx` — fotos/adjunto suben a Storage; campos renta; limpieza.
- `src/PlazaStefany.jsx` — dropdown resalta (`useScrollToMonth`/`mesRowHL`), KPIs sin vacíos, `rentaCobradaDe`.
- `scripts/_backup-kvstore.cjs` / `_migrate-images-to-storage.cjs` / `_ensure-bucket.cjs` — NEW (gitignored). Backup, migración idempotente (dry-run default), crear bucket.

### Próximos pasos
1. **William rota la service key** `sb_secret_p7ug…` y confirma que la de Vercel quede igual a la nueva.
2. Verificación visual en la app: comprobantes/fotos se ven, recibo de luz con fotos genera la pág. 2.
3. (Si algún día) limpieza de objetos huérfanos en Storage al borrar foto/comprobante.
4. Pendientes viejos siguen: datos abril/mayo, tabla tipo Excel de lecturas, perf opción C, cache-first admin.
