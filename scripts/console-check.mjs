#!/usr/bin/env node
/**
 * PRISM 控制端交互检查
 *
 * `smoke` 测的是纯逻辑（reducer、校验函数），`ui-check` 只是把每条路由打开看看
 * 有没有渲染。两者中间有一个洞：**没有人真的在输入框里打过字**。
 *
 * 站长报的「我尝试给 publishable key enter anything 的时候就出现错误」就掉在这个
 * 洞里——那不是一条校验提示，是整个控制端崩到错误页。原因是 onChange 里写了
 * `setState(prev => ({ ...prev, v: e.currentTarget.value }))`：React 会在 render
 * 期间重跑这个 updater，那时事件早已结束、`currentTarget` 被置空，于是读到
 * null.value。两个测试套件都看不见它，因为都不打字。
 *
 * 所以这一份专门做一件事：**像人一样去点、去打字**，然后确认页面没崩、
 * 东西真的存下来了、该拦的还拦着。
 *
 *   npm run build && node scripts/console-check.mjs
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, globSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

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
const base = `http://127.0.0.1:${server.address().port}/#`

const candidates = [
  ...globSync('/opt/pw-browsers/chromium-*/chrome-linux/chrome'),
  ...globSync('/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell'),
]
const browser = await chromium.launch(candidates.length ? { executablePath: candidates[0] } : {})
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

// 外部字体在沙箱里连不上，那是渐进增强，不算缺陷。
const external = (t) => /fonts\.(googleapis|gstatic)\.com|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED/.test(t)
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error' && !external(m.text())) errors.push(m.text().slice(0, 200))
})

const results = []
/**
 * 崩了之后，页面上原来的控件全没了，接下来每一个 locator 都会等满 30 秒再抛错。
 * 那种输出没法读，也说不清是哪一步崩的。所以整段流程包在 run() 里：
 * 出事就记一条说人话的失败，然后正常打印报告。
 */
async function run(step, fn) {
  try { await fn() } catch (e) {
    const why = (await crashed()) ? '控制端崩了（页面掉进错误页）' : String(e).split('\n')[0]
    check(false, `${step} 没能走完`, why)
    throw new Error('__stop__')
  }
}
const check = (pass, name, detail = '') => results.push([pass, name, detail])
/** 页面崩没崩——ErrorBoundary 顶上来就是崩了。 */
const crashed = () => page.locator('text=页面出错了').isVisible().catch(() => false)

const manage = async () => {
  await page.goto(`${base}/console/manage`, { waitUntil: 'load' })
  await page.waitForTimeout(700)
  // 回到同一个地址不会重新挂载，标签可能还停在上一次的位置——明确切回「内容」。
  await page.getByRole('tab', { name: '内容' }).first().click()
  await page.waitForTimeout(250)
}

/* ------------------------------------------------------------------ *
 * 1. 打字不该把网站打崩
 *
 * 这是站长真正遇到的那个 bug。逐字符输入，因为一次性 fill 只触发一个事件，
 * 未必能重现——人是一个键一个键敲的。
 * ------------------------------------------------------------------ */
try {
await run('账号与同步：填后端连接', async () => {
await manage()
await page.getByRole('tab', { name: '账号与同步' }).first().click()
await page.waitForTimeout(400)

const keyField = page.getByLabel('Supabase Publishable key')
await keyField.click()
for (const ch of 'sb_publishable_abc') { await page.keyboard.type(ch); await page.waitForTimeout(25) }
await page.waitForTimeout(300)
check(!(await crashed()), '往 Publishable key 里一个字一个字地打，网站不崩')
check(await keyField.inputValue().catch(() => '') === 'sb_publishable_abc',
  '打进去的字一个不少地留在框里')

const urlField = page.getByLabel('Supabase Project URL')
await urlField.click()
for (const ch of 'https://abc.supabase.co') { await page.keyboard.type(ch); await page.waitForTimeout(15) }
await page.waitForTimeout(300)
check(!(await crashed()), '往 Project URL 里打字，网站也不崩')

/* 危险的 key 要立刻拦，不能等按按钮 */
await keyField.click()
await page.keyboard.press('Control+A')
for (const ch of 'sb_secret_x') { await page.keyboard.type(ch); await page.waitForTimeout(25) }
await page.waitForTimeout(300)
check((await page.locator('.bke__err').first().innerText().catch(() => '')).includes('Secret key'),
  'Secret key 第一时间就被拦下，不等你按按钮')
})

await run('内容：自己写一项研究', async () => {

/* ------------------------------------------------------------------ *
 * 2. 自己写一项研究：建得出来，也改得动
 * ------------------------------------------------------------------ */
await manage()
await page.getByRole('button', { name: '研究' }).first().click()
await page.waitForTimeout(300)

const before = await page.locator('.nedit').count()
await page.getByRole('button', { name: /自己写一项研究/ }).click()
await page.waitForTimeout(400)
check(await page.locator('.nedit').count() === before + 1, '按一下就新建出一条研究')

const card = page.locator('.nedit').first()
check((await card.getAttribute('class')).includes('nedit--hidden'), '新建的先是下架状态，不会以空壳出现在首页')
check(await card.locator('.nedit__badge--mine').isVisible(), '标着「你写的」，跟搜来的分得清')
check(await card.locator('.nedit__body').isVisible(), '卡片自己展开，不用再去找它在哪')

const title = card.locator('input[id^="st-"]')
check(await title.isVisible(), '研究的标题可以编辑')
await title.fill('城市女性通勤安全调查 2026')
await page.waitForTimeout(200)
check(!(await crashed()), '给研究写标题不会把控制端打崩')

await card.locator('input[id^="sp-"]').fill('某研究机构')
await card.locator('textarea[id^="ss-"]').fill('一项覆盖十二个城市的问卷调查。')
await card.locator('textarea[id^="sl-"]').fill('样本只覆盖城市地区，农村完全没有覆盖。')
await card.getByRole('button', { name: /加一个数字/ }).click()
await page.waitForTimeout(200)
const fig = card.locator('.sedit__fig').first()
check(await fig.isVisible(), '可以加「关键数字」')
await fig.locator('input').nth(0).fill('受访者比例')
await fig.locator('input').nth(1).fill('31.4%')
await fig.locator('input').nth(2).fill('只问了有固定工作的人。')
check(!(await crashed()), '填关键数字不会把控制端打崩')

await card.getByRole('button', { name: '保存' }).click()
await page.waitForTimeout(400)
check((await card.locator('.nedit__headline').innerText()).includes('城市女性通勤安全调查'),
  '按「保存」之后标题真的变了')

/* 下架的东西读者看不到 */
await page.goto(`${base}/studies`, { waitUntil: 'load' })
await page.waitForTimeout(500)
check(!(await page.locator('body').innerText()).includes('城市女性通勤安全调查'),
  '没按「重新上线」之前，读者看不到它')

/* 上线之后，读者看得到，而且数字和局限一起上 */
await manage()
await page.getByRole('button', { name: '研究' }).first().click()
await page.waitForTimeout(300)
const mine = page.locator('.nedit').filter({ hasText: '城市女性通勤安全调查' }).first()
await mine.locator('.nedit__toggle').click()
await page.waitForTimeout(250)
await mine.getByRole('button', { name: /重新上线/ }).click()
await page.waitForTimeout(400)

await page.goto(`${base}/studies`, { waitUntil: 'load' })
await page.waitForTimeout(500)
const readerText = await page.locator('body').innerText()
check(readerText.includes('城市女性通勤安全调查'), '上线之后读者就看得到了')
check(readerText.includes('31.4%'), '关键数字跟着上了线')
check(readerText.includes('样本只覆盖城市地区'), '「这份研究说不了什么」也一并给读者看')

/* 删除要二次确认——跟新闻一样 */
await manage()
await page.getByRole('button', { name: '研究' }).first().click()
await page.waitForTimeout(300)
const doomed = page.locator('.nedit').filter({ hasText: '城市女性通勤安全调查' }).first()
await doomed.locator('.nedit__toggle').click()
await page.waitForTimeout(250)
await doomed.getByRole('button', { name: /永久删除/ }).click()
await page.waitForTimeout(350)
check(await page.locator('.nedit').filter({ hasText: '城市女性通勤安全调查' }).count() > 0,
  '按「永久删除」不会当场就删')
check(await page.getByText('删除之后找不回来').isVisible(), '先弹二次确认，并且说明后果')
await page.getByRole('button', { name: '算了' }).click()
await page.waitForTimeout(250)
})

await run('内容：自己写一条新闻', async () => {

/* ------------------------------------------------------------------ *
 * 3. 自己写一条新闻
 * ------------------------------------------------------------------ */
await page.getByRole('button', { name: '新闻' }).first().click()
await page.waitForTimeout(300)
const nBefore = await page.locator('.nedit').count()
await page.getByRole('button', { name: /自己写一条新闻/ }).click()
await page.waitForTimeout(400)
check(await page.locator('.nedit').count() === nBefore + 1, '新闻也能自己写一条')

const nCard = page.locator('.nedit').first()
check(await nCard.locator('.nedit__badge--mine').isVisible(), '新闻也标「你写的」')
check(!(await nCard.locator('.nedit__badge--edited').isVisible().catch(() => false)),
  '自己写的不会同时又标「你编辑过」——那是给搜来的条目用的')
await nCard.locator('input[id^="h-"]').fill('自己写的一条新闻')
await nCard.locator('textarea[id^="s-"]').fill('正文。')
await page.waitForTimeout(250)
check(!(await crashed()), '给新闻写标题和正文不会把控制端打崩')
})
} catch (e) {
  if (!(e instanceof Error) || e.message !== '__stop__') throw e
}

await browser.close()
server.close()

console.log('PRISM 控制端交互检查')
console.log('—'.repeat(64))
for (const [pass, name, detail] of results) {
  console.log(`  ${pass ? '通过' : '失败'}  ${name}${detail ? ` — ${detail}` : ''}`)
}
const failed = results.filter(([p]) => !p).length
if (errors.length) {
  console.log('—'.repeat(64))
  for (const e of errors.slice(0, 6)) console.log(`  运行时错误  ${e}`)
}
console.log('—'.repeat(64))
console.log(failed || errors.length
  ? `${failed} 项失败，${errors.length} 个运行时错误`
  : `${results.length} 项全部通过，没有运行时错误`)
process.exit(failed || errors.length ? 1 : 0)
