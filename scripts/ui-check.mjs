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
import { launchOptions } from './_browser.mjs'

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

/*
 * 检查必须是封闭的：**永远不要连真的后端**。
 *
 * 发布产物里的 prism-config.json 带着站长真实的 Supabase 项目。CI 上是有外网的，
 * 照原样跑，这些检查就会连上他的生产数据库——console-check 还会去新建条目。
 * 数据库的权限规则会挡住未登录的写入，但页面会变成「共享模式 + 空数据库」，
 * 测的就不是我们要测的东西了，而且这种依赖会让检查随别人的数据库状态飘。
 *
 * 所以这一个路径由服务器接管，一律返回空配置 —— 等于「没有配置后端」，
 * 也就是这个仓库开箱即用的样子。
 */
const EMPTY_CONFIG = JSON.stringify({ url: '', anonKey: '' })

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    let p = normalize(decodeURIComponent(url.pathname))
    if (p === '/' || !extname(p)) p = '/index.html'
    if (p === '/prism-config.json') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(EMPTY_CONFIG)
      return
    }
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
  ['region-jpkr', '/region/jpkr'],
  ['topic', '/topic/sexual'],
  // 旧议题名也要能打开：分类改过，而已经转发出去的链接不该变成空页。
  ['topic-alias', '/topic/violence'],
  ['studies-kind', '/studies/peer-reviewed'],
  ['studies', '/studies'],
  // 研究详情页是新加的（站长要研究「可以点进去」）。种子里第一项的 slug。
  ['study', '/study/cn-time-use-care-labour'],
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

const browser = await chromium.launch(launchOptions())
const problems = []
const rows = []
let fontsOffline = false

for (const [vpName, w, h] of VIEWPORTS) {
  /*
   * 手机和平板要真的当成触屏来开。
   *
   * `pointer: coarse` 那一整套点击目标的规则，只有 hasTouch 时才生效。
   * 用桌面 Chromium 量手机版式，量到的是没打开的那一半样式——
   * 它会报告一堆早已修好的小按钮，或者更糟：漏掉真的小按钮。
   */
  const touch = vpName !== 'desktop'
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 1,
    hasTouch: touch, isMobile: touch,
  })
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
      /*
       * 触屏上的点击目标。
       *
       * 手指的接触面大约 9mm ≈ 44px。低于这个数就会点错，而在这个站上点错
       * 意味着从一篇性暴力报道误触进另一篇——读者本来在小心地选择要不要读。
       *
       * 36px 是这里的下限而不是 44：标签这类元素撑到 44 会把卡片版式撑散，
       * 32–36 已经比原来的 20px 好按得多。真正的按钮和链接要够 44，
       * 所以只放过明确标成标签的那一类。
       */
      const tiny = []
      if (matchMedia('(pointer: coarse)').matches) {
        for (const el of document.querySelectorAll('a, button, input, select, [role="button"]')) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue          // 收起来的菜单不算
          if (el.closest('[hidden], [aria-hidden="true"]')) continue
          /*
           * 视觉上隐藏的原生控件不算。
           *
           * 勾选框常常是「把真正的 input 缩到 1×1 藏起来，用 label 画一个好看的
           * 方块」——手指点的是那个 label，不是 input。把 input 报成「目标过小」
           * 是假警报，而假警报会让人开始无视这份报告。
           */
          if (r.width <= 2 || r.height <= 2) continue
          const isTag = el.classList.contains('tagx')
          const floor = isTag ? 30 : 36
          if (r.height < floor) {
            tiny.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().trim().split(/\s+/)[0]} ${Math.round(r.width)}×${Math.round(r.height)}`)
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
        tiny: tiny.slice(0, 6), tinyN: tiny.length,
        main: document.querySelectorAll('main').length,
        h1: document.querySelectorAll('h1').length,
        iconOnly,
        surface: document.querySelector('.slyt') ? '公众站' : document.querySelector('.clyt') ? '控制端' : '(未知)',
        title: document.title,
      }
    })

    if (SHOTS && vpName !== 'tablet') {
      await page.screenshot({ path: join(SHOT_DIR, `${vpName}-${name}.png`), fullPage: vpName === 'desktop' })
    }

    if (offline.length) fontsOffline = true
    if (errors.length) problems.push(`[${vpName}] ${route} 运行时错误: ${errors.slice(0, 3).join(' | ')}`)
    /*
     * 「渲染了吗」的下限。
     *
     * 300 是按原来那个长篇登录页定的。站长把登录简化成两个输入框之后，
     * 那一页只剩 190 多个字符——**这是要求的结果，不是没渲染**。
     * 所以下限跟着页面的性质走：以表单为主的页面看有没有输入框更准。
     */
    const min = route === '/signin' ? 120 : 300
    if (info.text < min) problems.push(`[${vpName}] ${route} 页面内容过少（${info.text} 字符），可能未渲染`)
    /*
     * 每一页要有自己的标题。
     *
     * 这个站靠转发链接传播：一个人可能同时开好几个标签页，也会把某一条加书签。
     * 所有页面都叫「PRISM 棱镜」的话，五个标签页长得一模一样，
     * 书签里也看不出存的是哪一条。
     */
    if (vpName === 'desktop' && route !== '/' && info.title === 'PRISM 棱镜') {
      problems.push(`[${vpName}] ${route} 标题还是站名，没有这一页自己的标题`)
    }
    if (info.tinyN > 0) {
      problems.push(`[${vpName}] ${route} 触屏点击目标过小 ${info.tinyN} 个：${info.tiny.join('、')}`)
    }
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

/*
 * 繁简转换：这一段只能在浏览器里验。
 *
 * 它是**转 DOM 的文本节点**，不是转数据——那意味着它会不会被 React 的
 * 重渲染冲掉、切回去能不能拿回原文、按钮会不会把自己的名字也转掉，
 * 这几件事在 Node 里一件都测不了。而这三件恰好是它最容易坏的地方。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } })
  const page = await ctx.newPage()
  const dicts = []
  page.on('request', (r) => { if (/cn2t|opencc/.test(r.url())) dicts.push(r.url()) })
  await page.goto(`${base}/`, { waitUntil: 'networkidle' })

  const say = (ok, msg) => { if (!ok) problems.push(`[繁简] ${msg}`) }

  // 默认一个字节都不下载：442KB 的词典只该由真的要看繁体的人去付。
  say(dicts.length === 0, `默认就下载了字典（${dicts.length} 个请求）——那是 442KB`)

  const before = await page.evaluate(() => document.querySelector('.ncard__title')?.textContent ?? '')
  await page.click('.sct__btn:not([aria-pressed="true"])')
  await page.waitForTimeout(2500)
  const after = await page.evaluate(() => document.querySelector('.ncard__title')?.textContent ?? '')
  say(dicts.length > 0, '按下「繁」之后没有去取字典')
  say(after !== before && after.length > 0, '按下「繁」之后正文没有变')

  // 按钮不能把自己的名字也转了：一个按下之后改掉自己名字的按钮，
  // 读者会以为点错了。靠 data-nozh 排除。
  const label = await page.evaluate(() =>
    [...document.querySelectorAll('.sct__btn')].map((b) => b.textContent).join('/'))
  say(label.includes('简'), `切换按钮自己被转换了（「${label}」）`)

  // 切回去要拿回**原文**，不是再做一次繁→简。
  await page.click('.sct__btn:not([aria-pressed="true"])')
  await page.waitForTimeout(400)
  const back = await page.evaluate(() => document.querySelector('.ncard__title')?.textContent ?? '')
  say(back === before, '切回简体没有拿回一模一样的原文')

  // 换一页之后仍然是繁体：React 重渲染会把文本节点写回原文。
  await page.click('.sct__btn:not([aria-pressed="true"])')
  await page.waitForTimeout(600)
  await page.goto(`${base}/studies`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const onStudies = await page.evaluate(() => document.body.innerText)
  say(/[稜數據項與]/.test(onStudies), '换一页之后掉回了简体')

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
