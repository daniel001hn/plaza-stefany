// Captura screenshots reales de la app + detecta coordenadas de botones clave
// para poder anotar el PDF con flechas/círculos justo en los puntos correctos.
// Uso: node scripts/capturar-screenshots.cjs
// Output: scripts/screenshots/*.png + scripts/screenshots/coords.json

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
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()
  const coords = {}

  // ─── 1. Login screen vacío ───
  console.log('1/6 → Login vacío')
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('input[type="text"]', { timeout: 10000 })
  await page.screenshot({ path: path.join(OUT_DIR, '1-login.png') })

  // Detectar posiciones de campos para anotar
  const userBox = await page.locator('input[type="text"]').boundingBox()
  const passBox = await page.locator('input[type="password"]').boundingBox()
  const btnBox = await page.locator('button[type="submit"]').boundingBox()
  coords.login = { user: userBox, pass: passBox, btn: btnBox }

  // ─── 2. Login con campos llenos ───
  console.log('2/6 → Login con campos llenos')
  await page.fill('input[type="text"]', 'tatys')
  await page.fill('input[type="password"]', '••••••••••')
  await page.screenshot({ path: path.join(OUT_DIR, '2-login-filled.png') })

  // ─── Loguear de verdad para los próximos screenshots ───
  await page.fill('input[type="password"]', TENANT_PWD)
  await page.click('button[type="submit"]')
  await page.waitForSelector('text=Salir', { timeout: 30000 })
  await page.waitForTimeout(2500)

  // ─── 3. Dashboard top (renta) ───
  console.log('3/6 → Dashboard top (renta visible)')
  await page.screenshot({ path: path.join(OUT_DIR, '3-dashboard-top.png') })

  // Detectar posiciones de elementos clave del dashboard
  try {
    const nameBox = await page.locator('text=Tatys').first().boundingBox()
    const rentBox = await page.locator('text=/L\\s*[\\d,.]+/').first().boundingBox()
    const exitBox = await page.locator('text=Salir').boundingBox()
    coords.dashboard = { name: nameBox, rent: rentBox, exit: exitBox }
  } catch (e) { console.log('  (no se pudo detectar todos los elementos)') }

  // ─── 4. Dashboard scroll medio (botones de recibos visibles) ───
  console.log('4/6 → Dashboard con botones de recibos')
  await page.evaluate(() => window.scrollTo(0, 350))
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUT_DIR, '4-dashboard-botones.png') })

  try {
    const reciboBox = await page.locator('text=/Recibo de renta/i').first().boundingBox()
    const luzBox = await page.locator('text=/Recibo de luz/i').first().boundingBox()
    const subirBox = await page.locator('text=/Subir comprobante/i').first().boundingBox()
    coords.botones = { recibo: reciboBox, luz: luzBox, subir: subirBox, scrollY: 350 }
  } catch (e) { console.log('  (no se pudo detectar botones)') }

  // ─── 5. Historial (meses anteriores visibles) ───
  console.log('5/6 → Historial de meses')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUT_DIR, '5-historial.png') })

  // ─── 6. Vuelta al top para captura final clean ───
  console.log('6/6 → Dashboard full (toda la página)')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT_DIR, '6-dashboard-full.png'), fullPage: true })

  fs.writeFileSync(path.join(OUT_DIR, 'coords.json'), JSON.stringify(coords, null, 2))

  await browser.close()
  console.log('\n✅ Screenshots + coords guardados en', OUT_DIR)
  fs.readdirSync(OUT_DIR).forEach(f => {
    const stats = fs.statSync(path.join(OUT_DIR, f))
    console.log(`   ${f}: ${(stats.size / 1024).toFixed(0)} KB`)
  })
})()
