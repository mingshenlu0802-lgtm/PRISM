/**
 * 临时的手动查看工具：把某几条路由在某个宽度下的真实渲染结果打出来。
 *
 * 这不是检查（那是 ui-check），是我在改版式时用来看「屏幕上到底是什么」的
 * 眼睛。ui-check 只报「有没有问题」，改布局时需要看具体数字。
 *
 *   node scripts/_peek.mjs 360 /  /studies
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { launchOptions } from './_browser.mjs'

const ROOT = join(process.cwd(), 'dist')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' }
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    let p = normalize(decodeURIComponent(url.pathname))
    if (p === '/' || !extname(p)) p = '/index.html'
    if (p === '/prism-config.json') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ url: '', anonKey: '' })); return }
    const body = await readFile(join(ROOT, p))
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' })
    res.end(body)
  } catch { res.writeHead(404); res.end('nf') }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port
const width = Number(process.argv[2]) || 360
const routes = process.argv.slice(3)
const browser = await chromium.launch(launchOptions())
// 触屏要真的模拟：pointer: coarse 的那套规则只有 hasTouch 时才会生效，
// 用桌面 Chromium 量手机，量到的是没打开的那一半样式。
const page = await browser.newPage({ viewport: { width, height: 800 }, hasTouch: width < 1100, isMobile: width < 1100 })
const errs = []
page.on('pageerror', (e) => errs.push(String(e.message)))

for (const route of routes) {
  await page.goto(`http://127.0.0.1:${port}/#${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(350)
  const info = await page.evaluate(() => {
    const doc = document.documentElement
    const over = Math.max(0, doc.scrollWidth - doc.clientWidth)
    // 哪个元素把页面撑宽了
    let worst = null
    for (const el of document.querySelectorAll('body *')) {
      // SVG 内部元素按 viewBox 缩放，它们的 getBoundingClientRect 不代表版式宽度。
      if (el.ownerSVGElement) continue
      const r = el.getBoundingClientRect()
      if (r.width > doc.clientWidth + 1 && (!worst || r.width > worst.w)) {
        worst = { sel: `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`, w: Math.round(r.width) }
      }
    }
    // 太小的点击目标（WCAG 2.5.5 建议 44×44）
    const small = []
    for (const el of document.querySelectorAll('a, button, input, select, [role="button"]')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.height < 40 || r.width < 40) {
        const cls = (el.className || '').toString().split(' ')[0]
        const parent = el.parentElement ? `${el.parentElement.tagName.toLowerCase()}.${(el.parentElement.className || '').toString().split(' ')[0]}` : ''
        small.push(`${el.tagName.toLowerCase()}.${cls} ${Math.round(r.width)}x${Math.round(r.height)} in ${parent} "${(el.textContent || '').trim().slice(0, 16)}"`)
      }
    }
    // 正文字号
    const sizes = new Set()
    for (const el of document.querySelectorAll('p, li')) sizes.add(getComputedStyle(el).fontSize)
    return { over, worst, small: small.slice(0, 12), smallN: small.length, sizes: [...sizes], h: doc.scrollHeight }
  })
  console.log(`\n=== ${route} @${width}px ===`)
  console.log(`  横向溢出 ${info.over}px${info.worst ? `  最宽: ${info.worst.sel} ${info.worst.w}px` : ''}   页高 ${info.h}px`)
  console.log(`  正文字号: ${info.sizes.join(" ")}`)
  console.log(`  小于 40px 的点击目标 ${info.smallN} 个:`)
  for (const s of info.small) console.log(`    ${s}`)
}
if (errs.length) console.log('\nERRORS:', errs.slice(0, 5))
await browser.close()
server.close()
