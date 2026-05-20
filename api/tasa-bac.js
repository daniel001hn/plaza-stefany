// Vercel Edge Function: obtiene la tasa de cambio USD/HNL (venta).
//
// Fuente principal: BAC Honduras (banca en línea, header público "Tipo de Cambio")
//   GET https://www.sucursalelectronica.com/ebac/common/GetExchangeRateInfo.go
// Fallback: open.er-api.com (forex genérico, ~0.3% off del oficial)
//   GET https://open.er-api.com/v6/latest/USD
//
// Corre como Edge Function (no Node) — distinto egress, fetch nativo, evita
// el bloqueo de Akamai sobre IPs de data centers tradicionales de Vercel.
//
// Env vars (en Vercel):
//   SUPABASE_URL  (o VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY  (la "secret" — NO la anon)
//
// Cron diario: ver vercel.json. Front-end llama con ?dryRun=1 para preview.

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fromBac() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch('https://www.sucursalelectronica.com/ebac/common/GetExchangeRateInfo.go', {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, */*',
        'Accept-Language': 'es-HN,es;q=0.9',
        'Referer': 'https://www.sucursalelectronica.com/redir/showLogin.go',
      },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error('status ' + r.status);
    const data = await r.json();
    const hn = (data.USD || []).find((x) => x.country_code === 'HN');
    if (!hn) throw new Error('HN/USD no encontrado');
    return { source: 'BAC', sell: Number(hn.sell), buy: Number(hn.buy) };
  } finally {
    clearTimeout(t);
  }
}

async function fromForex() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: ctrl.signal });
    if (!r.ok) throw new Error('status ' + r.status);
    const data = await r.json();
    const hnl = data?.rates?.HNL;
    if (!hnl) throw new Error('HNL rate no encontrado');
    return { source: 'open.er-api', sell: Number(hnl), buy: Number(hnl) };
  } finally {
    clearTimeout(t);
  }
}

async function getRate() {
  const errors = [];
  for (const fn of [fromBac, fromForex]) {
    try { return await fn(); } catch (e) { errors.push(fn.name + ': ' + (e.message || e)); }
  }
  throw new Error('Todas las fuentes fallaron — ' + errors.join(' | '));
}

export default async function handler(req) {
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dryRun') === '1' || url.searchParams.get('dryRun') === 'true';
  const today = new Date().toISOString().slice(0, 10);

  try {
    const rate = await getRate();
    const sell = Math.round(rate.sell * 10000) / 10000;
    const buy = Math.round(rate.buy * 10000) / 10000;

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, source: rate.source, sell, buy, fecha: today, persisted: false }), {
        status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    }

    const supaUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !supaKey) throw new Error('Faltan env vars SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(supaUrl, supaKey, { auth: { persistSession: false } });

    const { data: row, error: getErr } = await supabase
      .from('kv_store').select('value').eq('key', 'config-and-locales').maybeSingle();
    if (getErr) throw getErr;

    const current = row?.value
      ? (typeof row.value === 'string' ? JSON.parse(row.value) : row.value)
      : { config: {}, locales: [] };
    const newConfig = {
      ...(current.config || {}),
      tasaCambio: sell, tasaFechaActualizada: today, tasaFuente: rate.source,
    };
    const next = { ...current, config: newConfig };

    const { error: setErr } = await supabase.from('kv_store').upsert(
      { key: 'config-and-locales', value: next, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (setErr) throw setErr;

    return new Response(JSON.stringify({ ok: true, source: rate.source, sell, buy, fecha: today, persisted: true }), {
      status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
}
