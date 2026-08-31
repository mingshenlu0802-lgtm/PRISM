#!/usr/bin/env node
/**
 * PRISM 界面检查
 *
 * Boots the built site, walks every route at three viewports, and fails on the
 * things a static typecheck cannot see: runtime errors, horizontal overflow on
 * a phone, missing landmarks, unlabelled icon-only controls, and pages that
 * render nothing. Writes screenshots to .ui-check/ for eyeballing.
 *
 *   npm run build && node scripts/ui-check.mjs
 *   node scripts/ui-check.mjs --shots      (also write screenshots)
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const ROOT = join(process.cwd(), 'dist')
const SHOTS = process.argv.includes('--shots')
const SHOT_DIR = join(process.cwd(), '.ui-check')

if (!existsSync(ROOT)) {
  console.error('dist/ 不存在，请先运行 npm run build')
  process.exit(2)
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon',
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    let p = normalize(decodeURIComponent(url.pathname))
    if (p === '/' || !extname(p)) p = '/index.html'
    const body = await readFile(join(ROOT, p))
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404); res.end('not found')
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port
const base = `http://127.0.0.1:${port}/#`

const ROUTES = [
  ['home', '/'],
  ['news', '/news/cn-workplace-harassment-guideline'],
  ['region-cn', '/region/cn'],
  ['region-tw', '/region/tw'],
  ['topic', '/topic/violence'],
  ['studies', '/studies'],
  ['about', '/about'],
  // 朋友第一次登录会落在这一页，坏了就没人能被设成编辑。
  ['signin', '/signin'],
  ['console-search', '/console'],
  ['console-manage', '/console/manage'],
]

const VIEWPORTS = [
  ['phone', 360, 780],
  ['tablet', 834, 1000],
  ['desktop', 1440, 950],
]

if (SHOTS) await mkdir(SHOT_DIR, { recursive: true })

// Resolve the pre-installed Chromium; the versioned directory name varies.
const { globSync } = await import('node:fs')
const candidates = [
  ...globSync('/opt/pw-browsers/chromium-*/chrome-linux/chrome'),
  ...globSync('/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell'),
]
const browser = await chromium.launch(
  candidates.length ? { executablePath: candidates[0] } : {},
)
const problems = []
const rows = []
let fontsOffline = false

for (const [vpName, w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()

  const errors = []
  const offline = []
  // Webfonts are progressive enhancement: the design holds on the platform
  // stacks if they never arrive. A sandbox with no outbound network should
  // report that as a note, not as a page defect.
  const isExternal = (t) => /fonts\.(googleapis|gstatic)\.com/.test(t)
    || /ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(t)
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (isExternal(t)) offline.push(t)
    else errors.push(t)
  })
  page.on('requestfailed', (r) => {
    if (isExternal(r.url())) offline.push(r.url())
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

  for (const [name, route] of ROUTES) {
    errors.length = 0
    offline.length = 0
    await page.goto(base + route, { waitUntil: 'load' })
    await page.waitForTimeout(450)

    const info = await page.evaluate(() => {
      const de = document.documentElement
      const body = document.body
      const overflow = Math.max(de.scrollWidth, body.scrollWidth) - de.clientWidth
      // Find the widest offender so the report is actionable.
      let worst = null
      if (overflow > 1) {
        for (const el of document.querySelectorAll('*')) {
          const r = el.getBoundingClientRect()
          if (r.width > de.clientWidth + 1 && r.width > (worst?.w ?? 0)) {
            worst = { w: Math.round(r.width), sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') }
          }
        }
      }
      const iconOnly = [...document.querySelectorAll('button, a')].filter((el) => {
        const text = (el.textContent ?? '').trim()
        const label = el.getAttribute('aria-label') || el.getAttribute('title')
        return !text && !label && el.querySelector('svg')
      }).length
      return {
        text: (document.body.innerText ?? '').trim().length,
        overflow, worst,
        main: document.querySelectorAll('main').length,
        h1: document.querySelectorAll('h1').length,
        iconOnly,
        surface: document.querySelector('.slyt') ? '公众站' : document.querySelector('.clyt') ? '控制端' : '(未知)',
      }
    })

    if (SHOTS && vpName !== 'tablet') {
      await page.screenshot({ path: join(SHOT_DIR, `${vpName}-${name}.png`), fullPage: vpName === 'desktop' })
    }

    if (offline.length) fontsOffline = true
    if (errors.length) problems.push(`[${vpName}] ${route} 运行时错误: ${errors.slice(0, 3).join(' | ')}`)
    if (info.text < 300) problems.push(`[${vpName}] ${route} 页面内容过少（${info.text} 字符），可能未渲染`)
    if (vpName === 'phone' && info.overflow > 1) {
      problems.push(`[phone] ${route} 横向溢出 ${info.overflow}px${info.worst ? `，最宽元素 ${info.worst.sel} (${info.worst.w}px)` : ''}`)
    }
    if (info.main === 0) problems.push(`[${vpName}] ${route} 缺少 <main> 地标`)
    if (info.h1 !== 1) problems.push(`[${vpName}] ${route} 有 ${info.h1} 个 <h1>（应为 1）`)
    if (info.iconOnly > 0) problems.push(`[${vpName}] ${route} ${info.iconOnly} 个纯图标控件缺少 aria-label`)

    if (vpName === 'desktop') rows.push([name, route, info.text, info.surface])
  }
  await ctx.close()
}

await browser.close()
server.close()

console.log('PRISM 界面检查')
console.log('—'.repeat(72))
for (const [name, route, text, surface] of rows) {
  console.log(`  ${name.padEnd(16, '·')} ${route.padEnd(46, ' ')} ${String(text).padStart(6)} 字符  ${surface}`)
}
console.log('—'.repeat(72))
if (fontsOffline) {
  console.log('  注  外部字体未能加载（沙箱无出网），已按平台字体栈渲染；这是渐进增强，不计为缺陷。')
}
if (problems.length === 0) {
  console.log(`${ROUTES.length} 条路由 × ${VIEWPORTS.length} 个视口：未发现问题`)
} else {
  for (const p of problems) console.log(`  ${p}`)
  console.log('—'.repeat(72))
  console.log(`${problems.length} 个问题`)
}
if (SHOTS) console.log(`截图已写入 ${SHOT_DIR}`)
process.exit(problems.length ? 1 : 0)
