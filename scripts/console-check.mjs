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
const base = `http://127.0.0.1:${server.address().port}/#`

const browser = await chromium.launch(launchOptions())
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

/* ------------------------------------------------------------------ *
 * 4. 「在这台电脑上连起来」必须真的把网站重新起一遍
 *
 * 放在最后：这一步会写 localStorage 并重新加载，会影响后面的任何断言。
 *
 * 这里曾经写的是 assign(location.href)。网站是 hash 路由，控制端地址永远带
 * `#/console/manage`，而跳到一个连 hash 都完全相同的地址，浏览器当作同文档内的
 * 片段跳转，根本不会重新加载。站长填对了两串、按下按钮，屏幕上什么都不发生。
 * 配置其实存进去了——只是网站没重新起来，看上去就是「连不上」。
 * ------------------------------------------------------------------ */
await run('账号与同步：按下「连起来」', async () => {
  await manage()
  await page.getByRole('tab', { name: '账号与同步' }).first().click()
  await page.waitForTimeout(400)

  await page.getByLabel('Supabase Project URL').fill('https://examplecheck.supabase.co')
  await page.getByLabel('Supabase Publishable key').fill('sb_publishable_ABCDEFGHIJKLMNOPQRSTUV')
  await page.waitForTimeout(250)

  const connect = page.getByRole('button', { name: /在这台电脑上连起来/ })
  check(await connect.isEnabled(), '两串都填对了，「在这台电脑上连起来」就可以按')

  // 页面真的重载的话，这个标记会消失。
  await page.evaluate(() => { window.__beforeConnect = true })
  await connect.click()
  await page.waitForTimeout(2500)

  const survived = await page.evaluate(() => window.__beforeConnect === true).catch(() => false)
  check(!survived, '按下之后网站真的重新起来了（不是存了配置却什么都不发生）')

  const saved = await page.evaluate(
    () => window.localStorage.getItem('prism.backend.v1'),
  ).catch(() => null)
  check(Boolean(saved && saved.includes('examplecheck.supabase.co')), '填的配置确实存下来了')

  // 别把共享模式留给下一次运行。
  await page.evaluate(() => { try { window.localStorage.clear() } catch { /* 无所谓 */ } })
})

/* ------------------------------------------------------------------ *
 * 5. 登录邮件把人送回来的那一刻
 *
 * Supabase 的 magic link 用 implicit 流程，令牌挂在地址的 hash 里回来。
 * 这个网站是 HashRouter——hash 就是路由。`#access_token=…` 匹配不上任何页面，
 * 兜底路由立刻把它换成 `#/`，令牌在几十毫秒内就没了，Supabase 永远读不到。
 * 站长点了链接、回到网站、一切正常——只是没登录，也没有任何解释。
 * ------------------------------------------------------------------ */
await run('登录回调', async () => {
  /*
   * 每次都先经过 about:blank。
   *
   * 只有 hash 不同的两个地址之间跳转，浏览器当作同文档跳转，**不会重新加载**——
   * 于是 main.tsx 不再执行，takeAuthFromHash() 根本没机会跑，测出来的就是假的。
   * （这正是这个 PR 在修的那一类问题，写测试时自己也踩了一次。）
   */
  const land = async (hash) => {
    await page.goto('about:blank')
    await page.goto(`${base.slice(0, -1)}${hash}`, { waitUntil: 'load' })
  }

  // 过期的链接必须说出来。这条路径是看得见的，所以拿它验「抢在路由前面」这件事：
  // 能显示这句话，就证明 hash 在被路由抹掉之前已经被读走了。
  await land('#error=access_denied&error_code=otp_expired'
    + '&error_description=Email+link+is+invalid+or+has+expired')
  // 用 waitFor 而不是睡一段固定时间再看一眼——提示是会自己消失的 toast，
  // 定点采样等于把结果交给机器快慢。
  const said = await page.locator('text=登录链接已经过期')
    .waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)
  check(said, '过期的登录链接会说明原因，而不是默默回到首页')
  check(!(await page.evaluate(() => window.location.hash)).includes('error='),
    '说完之后把地址清干净，不把回调参数留在地址栏和历史里')

  // 带令牌回来时，地址栏不能留着令牌——那会进浏览器历史，也会被分享出去。
  await land('#access_token=FAKE_A&refresh_token=FAKE_R&token_type=bearer&type=magiclink')
  await page.waitForTimeout(1200)
  check(!(await page.evaluate(() => window.location.hash)).includes('access_token'),
    '令牌不会留在地址栏里')
  check(!(await crashed()), '带着登录回调进来不会把网站打崩')

  // 普通路由的 hash 一个字都不能动。
  await land('#/console/manage')
  await page.waitForTimeout(800)
  check((await page.evaluate(() => window.location.hash)) === '#/console/manage',
    '普通地址不受影响，该去哪还去哪')
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
