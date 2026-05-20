// Vercel serverless function: obtiene la tasa de cambio USD/HNL (venta)
// publicada por BAC Honduras en el header de su banca en línea pública,
// y la guarda en Supabase (kv_store, clave config-and-locales).
//
// Endpoints usados (todos públicos, sin login):
//   GET https://www.sucursalelectronica.com/redir/showLogin.go  (set session cookies)
//   GET https://www.sucursalelectronica.com/ebac/common/GetExchangeRateInfo.go (JSON)
//
// Variables de entorno requeridas (en Vercel):
//   SUPABASE_URL                 (o reusa VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY    (NO la anon — necesita permisos de write)
//
// Cron: ver vercel.json (corre 1×/día). El front-end también puede llamarlo
// con ?dryRun=1 para previsualizar sin escribir a DB.

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import zlib from 'zlib';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchUrl(url, cookies = '') {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, text/html;q=0.9, */*;q=0.8',
        'Accept-Language': 'es-HN,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Cookie': cookies,
        'Referer': 'https://www.sucursalelectronica.com/redir/showLogin.go',
      },
      timeout: 9000,
    }, (res) => {
      const sc = res.headers['set-cookie'] || [];
      const newCookies = sc.map((c) => c.split(';')[0]).join('; ');
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let buf = Buffer.concat(chunks);
        try {
          if (res.headers['content-encoding'] === 'gzip') buf = zlib.gunzipSync(buf);
          else if (res.headers['content-encoding'] === 'deflate') buf = zlib.inflateSync(buf);
        } catch {}
        resolve({ status: res.statusCode, cookies: newCookies, body: buf.toString('utf8') });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end();
  });
}

async function getBacRate() {
  // El endpoint responde sin sesión — el header "Tipo de Cambio" del login
  // de BAC lo consume directo sin cookies. Probado: ~300ms.
  const r = await fetchUrl('https://www.sucursalelectronica.com/ebac/common/GetExchangeRateInfo.go');
  if (r.status !== 200) throw new Error('BAC endpoint status ' + r.status);
  const data = JSON.parse(r.body);
  const hn = (data.USD || []).find((x) => x.country_code === 'HN');
  if (!hn) throw new Error('No se encontró el registro HN/USD');
  return { buy: Number(hn.buy), sell: Number(hn.sell) };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const rate = await getBacRate();
    const sell = Math.round(rate.sell * 10000) / 10000;
    const buy = Math.round(rate.buy * 10000) / 10000;
    const today = new Date().toISOString().slice(0, 10);
    const dryRun = req.query?.dryRun === '1' || req.query?.dryRun === 'true';

    if (dryRun) {
      return res.status(200).json({ ok: true, source: 'BAC', sell, buy, fecha: today, persisted: false });
    }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Faltan env vars SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const { data: row, error: getErr } = await supabase
      .from('kv_store')
      .select('value')
      .eq('key', 'config-and-locales')
      .maybeSingle();
    if (getErr) throw getErr;

    const current = row?.value
      ? (typeof row.value === 'string' ? JSON.parse(row.value) : row.value)
      : { config: {}, locales: [] };

    const newConfig = {
      ...(current.config || {}),
      tasaCambio: sell,
      tasaFechaActualizada: today,
      tasaFuente: 'BAC',
    };
    const next = { ...current, config: newConfig };

    const { error: setErr } = await supabase
      .from('kv_store')
      .upsert(
        { key: 'config-and-locales', value: next, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    if (setErr) throw setErr;

    return res.status(200).json({ ok: true, source: 'BAC', sell, buy, fecha: today, persisted: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
