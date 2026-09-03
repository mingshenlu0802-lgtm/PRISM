import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { launchOptions } from './_browser.mjs'
const T = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png' }
const root = join(process.cwd(), 'dist')
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0])
  if (p === '/prism-config.json') { res.writeHead(200, {'content-type':'application/json'}); return res.end('{}') }
  let f = join(root, p); if (!existsSync(f) || !extname(f)) f = join(root, 'index.html')
  res.writeHead(200, { 'content-type': T[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f))
}).listen(0)
const base = `http://127.0.0.1:${server.address().port}/#`
const browser = await chromium.launch(launchOptions())
const dir = process.argv[2]
for (const [route, file, vp, full] of JSON.parse(process.argv[3])) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2, isMobile: vp.width < 500, hasTouch: vp.width < 500 })
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${dir}/${file}.png`, fullPage: !!full })
  await page.close()
}
console.log('ok')
await browser.close(); server.close()
