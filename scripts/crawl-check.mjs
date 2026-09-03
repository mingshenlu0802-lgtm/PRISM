#!/usr/bin/env node
/**
 * PRISM 全站巡查
 *
 * ui-check 走的是一张**写死的路由表**：十三条路由，三个视口，看每一页有没有
 * 运行时错误、横向溢出、地标和触屏目标。那是「这几页长得对不对」。
 *
 * 这个脚本问的是另一个问题：**页面上的每一个链接，点下去真的到得了吗。**
 *
 * 这个站用 HashRouter，而 HashRouter 有一个很安静的失败方式：认不出的地址
 * 会被 catch-all 送回首页。于是一个写错的链接不会报 404，它会**看起来像
 * 正常跳转**——读者点「香港」，到了首页，以为自己按错了。写死的路由表
 * 永远发现不了这种事，因为表里的地址都是对的。
 *
 * 所以这里从首页开始，把每一页上的站内链接都收集起来，逐个走一遍，
 * 检查：地址还是不是原来那个（没被送回首页）、页面有没有真的内容、
 * 控制台有没有报错。顺带把下拉、筛选、开关都点一遍——它们不在路由表里，
 * 但读者一定会点。
 *
 *   npm run build && node scripts/crawl-check.mjs
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { launchOptions } from './_browser.mjs'

const ROOT = join(process.cwd(), 'dist')
if (!existsSync(ROOT)) {
  console.error('dist/ 不存在，请先运行 npm run build')
  process.exit(2)
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon',
}

// 和 ui-check 同一个理由：检查必须是封闭的，永远不连站长真的数据库。
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
  } catch { res.writeHead(404); res.end('not found') }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/#`

const problems = []
const browser = await chromium.launch(launchOptions())
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

/*
 * 沙箱里没有出网，Google Fonts 一定加载失败。那是渐进增强——字体取不到
 * 就用平台字体栈，页面完全正常——所以不算缺陷，和 ui-check 的处理一致。
 * 不过滤掉的话，每一页都会报一条，真正的错误会被淹掉。
 */
const isOffline = (t) => /ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|ERR_INTERNET|fonts\.(googleapis|gstatic)/i.test(t)

const errors = []
page.on('console', (m) => { if (m.type() === 'error' && !isOffline(m.text())) errors.push(m.text()) })
page.on('pageerror', (e) => { if (!isOffline(e.message)) errors.push(`pageerror: ${e.message}`) })

/** 打开一个 hash 路由，等它渲染完。 */
async function open(route) {
  errors.length = 0
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(120)
}

/** 当前 hash 里的路由部分。 */
const currentRoute = () => page.evaluate(() => location.hash.replace(/^#/, '') || '/')

/* ------------------------------------------------------------------ *
 * 一、把站内链接都走一遍
 * ------------------------------------------------------------------ */

const seen = new Set()
const queue = ['/']
const visited = []

while (queue.length) {
  const route = queue.shift()
  if (seen.has(route)) continue
  seen.add(route)

  await open(route)
  const landed = await currentRoute()

  /*
   * **最重要的一条。** 地址被换掉了，说明 catch-all 接住了它——
   * 读者点了一个链接，到了别的地方，而且没有任何提示。
   */
  if (landed !== route) {
    problems.push(`${route} 打开后地址变成了 ${landed}——多半是被 catch-all 送回去了`)
    continue
  }

  const info = await page.evaluate(() => {
    const main = document.querySelector('main')
    const text = (main?.innerText ?? '').trim()
    return {
      text: text.length,
      // 空状态是正常的（某个筛选下确实没内容），但要分得出来
      empty: Boolean(document.querySelector('.empty, [data-empty]')),
      h1: document.querySelectorAll('h1').length,
      // 站内链接：HashRouter 下都是 #/… 的形式
      links: [...document.querySelectorAll('a[href]')]
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && h.startsWith('#/'))
        .map((h) => h.slice(1)),
      // 重复的 id 会让 aria-labelledby / htmlFor 指错地方
      dupIds: (() => {
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id)
        return [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))]
      })(),
      // aria-labelledby / aria-describedby 指向了不存在的 id
      danglingAria: [...document.querySelectorAll('[aria-labelledby], [aria-describedby]')]
        .flatMap((el) => ['aria-labelledby', 'aria-describedby']
          .flatMap((attr) => (el.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean)
            .filter((id) => !document.getElementById(id))
            .map((id) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} → #${id}`))),
      // 加载失败的图
      brokenImgs: [...document.querySelectorAll('img')]
        .filter((i) => i.complete && i.naturalWidth === 0)
        .map((i) => i.getAttribute('src')?.slice(0, 60)),
    }
  })

  visited.push([route, info.text])
  if (errors.length) problems.push(`${route} 运行时错误：${errors.slice(0, 2).join(' | ')}`)
  if (info.h1 !== 1) problems.push(`${route} 有 ${info.h1} 个 <h1>（应为 1）`)
  for (const id of info.dupIds) problems.push(`${route} 出现重复的 id「${id}」——aria 和 label 会指错`)
  for (const d of info.danglingAria) problems.push(`${route} aria 指向不存在的 id：${d}`)
  for (const src of info.brokenImgs) problems.push(`${route} 图片加载失败：${src}`)

  for (const l of info.links) if (!seen.has(l) && !queue.includes(l)) queue.push(l)
}

/* ------------------------------------------------------------------ *
 * 二、把会点的东西都点一遍
 *
 * 下拉、筛选、开关都不在路由表里，但读者一定会点，而它们出错的方式
 * 是「点了没反应」或者「点了报错」——两种都不会让页面变白。
 * ------------------------------------------------------------------ */

await open('/')
const clickables = [
  ['地区下拉', '.slyt__dropbtn:nth-of-type(1)'],
  ['外观菜单', '.slyt__tools button[aria-haspopup], .slyt__tools .appr__btn'],
]
for (const [name, sel] of clickables) {
  const el = await page.$(sel)
  if (!el) continue
  errors.length = 0
  await el.click().catch(() => {})
  await page.waitForTimeout(150)
  if (errors.length) problems.push(`点「${name}」报错：${errors[0]}`)
  await page.keyboard.press('Escape')
}

// 议题和地区的筛选：点一个，条数应当变；再点一次应当变回来。
await open('/')
const filterBtn = await page.$('.fbar button, .fbar__chip')
if (filterBtn) {
  const countOf = () => page.evaluate(() => document.querySelector('.home__count')?.textContent ?? '')
  const before = await countOf()
  errors.length = 0
  await filterBtn.click()
  await page.waitForTimeout(200)
  const after = await countOf()
  if (errors.length) problems.push(`点筛选报错：${errors[0]}`)
  if (before === after) problems.push('点了一个筛选，条数那一行没有变——筛选可能没接上')
  await filterBtn.click()
  await page.waitForTimeout(200)
  if ((await countOf()) !== before) problems.push('取消筛选之后没有回到原来的条数')
}

await browser.close()
server.close()

console.log('PRISM 全站巡查')
console.log('—'.repeat(72))
for (const [route, text] of visited) {
  console.log(`  ${route.padEnd(52, '·')} ${String(text).padStart(6)} 字符`)
}
console.log('—'.repeat(72))
if (problems.length === 0) {
  console.log(`走了 ${visited.length} 条路由，点了所有下拉和筛选：未发现问题`)
} else {
  for (const p of problems) console.log(`  ${p}`)
  console.log('—'.repeat(72))
  console.log(`${problems.length} 个问题`)
}
process.exit(problems.length ? 1 : 0)
