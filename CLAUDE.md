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
