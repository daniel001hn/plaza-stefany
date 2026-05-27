// Toma screenshots reales de la app para el manual del inquilino.
// Uso: node scripts/capturar-screenshots.cjs
// Output: scripts/screenshots/*.png

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const URL = 'https://plaza-stefany.vercel.app'
const TENANT_EMAIL = 'tatys@plaza-stefany.local'
const TENANT_PWD = 'tatys2026.'
const OUT_DIR = path.join(__dirname, 'screenshots')

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

;(async () => {
  const browser = await chromium.launch()
  // Viewport tipo celular vertical para que las screenshots se vean parecido a
  // como un inquilino las verá en su teléfono. iPhone 13 size.
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()

  // ───── Captura 1: Login screen ─────
  console.log('1/5 → Login screen...')
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('input[type="text"]', { timeout: 5000 })
  await page.screenshot({ path: path.join(OUT_DIR, '1-login.png'), fullPage: false })

  // ───── Captura 2: Login con campos llenos (sin mostrar contraseña real) ─────
  console.log('2/5 → Login con campos llenos...')
  await page.fill('input[type="text"]', 'tatys')
  await page.fill('input[type="password"]', '••••••••••')
  await page.screenshot({ path: path.join(OUT_DIR, '2-login-filled.png'), fullPage: false })

  // ───── Loguear con credenciales reales para los siguientes screenshots ─────
  await page.fill('input[type="password"]', TENANT_PWD)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')

  // Esperar a que aparezca el dashboard real (busca textos que solo existen post-load).
  // "RENTA MENSUAL" es un eyebrow que aparece en el header del inquilino.
  await page.waitForSelector('text=Salir', { timeout: 30000 })
  await page.waitForTimeout(2000) // settle visual

  // ───── Captura 3: Dashboard del inquilino ─────
  console.log('3/5 → Dashboard inquilino (parte de arriba)...')
  await page.screenshot({ path: path.join(OUT_DIR, '3-dashboard-top.png'), fullPage: false })

  // ───── Captura 4: Dashboard completo (full page) ─────
  console.log('4/5 → Dashboard completo (toda la página)...')
  await page.screenshot({ path: path.join(OUT_DIR, '4-dashboard-full.png'), fullPage: true })

  // ───── Captura 5: Historial / pagos anteriores ─────
  console.log('5/5 → Historial de meses...')
  // Scroll hasta abajo para que se vean los meses
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1500)
  await page.screenshot({ path: path.join(OUT_DIR, '5-historial.png'), fullPage: false })

  await browser.close()

  console.log('\n✅ Screenshots guardados en:', OUT_DIR)
  fs.readdirSync(OUT_DIR).forEach(f => {
    const stats = fs.statSync(path.join(OUT_DIR, f))
    console.log(`   ${f}: ${(stats.size / 1024).toFixed(0)} KB`)
  })
})()
