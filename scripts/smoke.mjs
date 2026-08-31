#!/usr/bin/env node
/**
 * PRISM 行为冒烟测试
 *
 * Covers the places where a bug costs the owner something real rather than
 * something cosmetic: deleting the wrong thing, losing control of the console,
 * a search run that quietly drops what it found, and the "one sentence changes
 * the site" box doing something the owner did not ask for.
 *
 *   node scripts/smoke.mjs
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const out = join(process.cwd(), 'node_modules', '.cache', 'prism-smoke')
mkdirSync(out, { recursive: true })
const bundle = join(out, 'bundle.mjs')

await build({
  entryPoints: [join(process.cwd(), 'scripts/_smoke-entry.ts')],
  bundle: true, format: 'esm', platform: 'node', target: 'node20',
  outfile: bundle, external: ['react', 'react-dom'], logLevel: 'silent',
})

const m = await import(pathToFileURL(bundle).href)
const { buildInitialState, reducer, accessOf, collect, planSteps, runVibe, VIBE_EXAMPLES,
        contentSnapshot, OWNER_EMAIL, PRIORITY_REGIONS } = m

const results = []
const test = async (name, fn) => {
  try { await fn(); results.push([true, name, '']) }
  catch (e) { results.push([false, name, e.message]) }
}
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg}：期望 ${b}，实际 ${a}`) }
const ok = (v, msg) => { if (!v) throw new Error(msg) }

const fresh = () => buildInitialState()
const ME = 'mingshen.lu0802@gmail.com'

/* --------------------- 删掉的东西真的没了，下架的还在 --------------------- */

await test('下架只是不给别人看，内容还在', () => {
  const s0 = fresh()
  const id = s0.news[0].id
  const s1 = reducer(s0, { type: 'news-hide', id, who: ME })
  eq(s1.news.length, s0.news.length, '下架不该减少条目')
  eq(s1.news.find((n) => n.id === id).status, 'hidden', '下架后状态')
  const s2 = reducer(s1, { type: 'news-restore', id, who: ME })
  eq(s2.news.find((n) => n.id === id).status, 'live', '恢复后状态')
})

await test('永久删除是永久的', () => {
  const s0 = fresh()
  const id = s0.news[0].id
  const s1 = reducer(s0, { type: 'news-delete', id, who: ME })
  eq(s1.news.length, s0.news.length - 1, '删除后条数')
  eq(s1.news.some((n) => n.id === id), false, '删掉的条目不该还在')
})

await test('删一个媒体链接只删那一个', () => {
  const s0 = fresh()
  const n = s0.news.find((x) => x.links.length >= 2)
  const linkId = n.links[0].id
  const s1 = reducer(s0, { type: 'news-link-remove', id: n.id, linkId, who: ME })
  const after = s1.news.find((x) => x.id === n.id)
  eq(after.links.length, n.links.length - 1, '链接数')
  eq(after.links.some((l) => l.id === linkId), false, '删掉的链接不该还在')
  eq(s1.news.length, s0.news.length, '删链接不该动条目')
})

await test('改总结之后标记成人工编辑过', () => {
  const s0 = fresh()
  const id = s0.news[0].id
  const s1 = reducer(s0, { type: 'news-edit', id, patch: { summary: '改过的总结。' }, who: ME })
  const n = s1.news.find((x) => x.id === id)
  eq(n.summary, '改过的总结。', '总结')
  eq(n.editedByHuman, true, '应标记为人工编辑过')
  ok(n.updatedAt >= s0.news[0].updatedAt, '更新时间应往后走')
})

/* ------------------------------ 头条 ------------------------------ */

await test('头条只有一条：设了新的，旧的自动让位', () => {
  const s0 = fresh()
  const a = s0.news[0].id
  const b = s0.news[1].id
  let s = reducer(s0, { type: 'news-feature', id: a, on: true, who: ME })
  eq(s.news.filter((n) => n.featured).length, 1, '头条数量')
  s = reducer(s, { type: 'news-feature', id: b, on: true, who: ME })
  eq(s.news.filter((n) => n.featured).length, 1, '设第二条之后的头条数量')
  eq(s.news.find((n) => n.featured).id, b, '头条应当是后设的那条')
})

await test('取消头条之后就没有头条了', () => {
  const s0 = fresh()
  const id = s0.news[0].id
  let s = reducer(s0, { type: 'news-feature', id, on: true, who: ME })
  s = reducer(s, { type: 'news-feature', id, on: false, who: ME })
  eq(s.news.some((n) => n.featured), false, '不该还有头条')
})

await test('把头条下架，它就不再是头条', () => {
  const s0 = fresh()
  const id = s0.news[0].id
  let s = reducer(s0, { type: 'news-feature', id, on: true, who: ME })
  s = reducer(s, { type: 'news-hide', id, who: ME })
  const n = s.news.find((x) => x.id === id)
  eq(n.status, 'hidden', '状态')
  eq(Boolean(n.featured), false, '看不见的东西不能当头条')
})

await test('换头条时，改动记录写清楚是哪一条让了位', () => {
  const s0 = fresh()
  let s = reducer(s0, { type: 'news-feature', id: s0.news[0].id, on: true, who: ME })
  s = reducer(s, { type: 'news-feature', id: s0.news[1].id, on: true, who: ME })
  ok(s.changes[0].text.includes('让位'), `记录里没写让位：${s.changes[0].text}`)
})

/* ------------------------------ 取材规则 ------------------------------ */

await test('打开「优先独立与境外媒体」后，官方媒体排在独立媒体后面', () => {
  const s = fresh()
  const r = collect({ ...s.collect, preferIndependent: true, regions: ['cn'], perRun: 10 }, [], [], 0)
  for (const n of r.news) {
    const kinds = n.links.map((l) => l.outletKind ?? 'independent')
    const lastIndependent = kinds.lastIndexOf('independent')
    const firstState = kinds.indexOf('state')
    if (firstState >= 0 && lastIndependent >= 0) {
      ok(firstState > lastIndependent, `「${n.headline}」里官方媒体排在了独立媒体前面`)
    }
  }
})

await test('原始文件永远排最前，不受取材规则影响', () => {
  const s = fresh()
  for (const pref of [true, false]) {
    const r = collect({ ...s.collect, preferIndependent: pref, regions: ['cn'], perRun: 10 }, [], [], 0)
    for (const n of r.news) {
      const firstNonPrimary = n.links.findIndex((l) => !l.primary)
      const lastPrimary = n.links.map((l) => Boolean(l.primary)).lastIndexOf(true)
      if (firstNonPrimary >= 0 && lastPrimary >= 0) {
        ok(lastPrimary < firstNonPrimary, `preferIndependent=${pref} 时原始文件没有排在最前`)
      }
    }
  }
})

await test('官方媒体不会被丢掉，只是被标出来', () => {
  const s = fresh()
  const on = collect({ ...s.collect, preferIndependent: true, regions: ['cn'], perRun: 10 }, [], [], 0)
  const off = collect({ ...s.collect, preferIndependent: false, regions: ['cn'], perRun: 10 }, [], [], 0)
  const count = (r) => r.news.reduce((a, n) => a + n.links.length, 0)
  eq(count(on), count(off), '开关不该改变链接总数——它只改顺序和标注')
  const stateLinks = on.news.flatMap((n) => n.links).filter((l) => l.outletKind === 'state')
  ok(stateLinks.length > 0, '演示数据里应当有官方媒体，否则这条规则没人验证得了')
})

await test('演示数据里的中国内地条目带得上境外或独立来源', () => {
  const cn = fresh().news.filter((n) => n.regions.includes('cn'))
  ok(cn.length > 0, '应当有内地条目')
  for (const n of cn) {
    const independent = n.links.filter((l) => !l.outletKind)
    ok(independent.length > 0, `「${n.headline}」只有官方来源，没有可以对照的独立报道`)
  }
})

/* ------------------------------ 长总结 ------------------------------ */

await test('总结可以写长，空行分段会被切成自然段', () => {
  const long = fresh().news.find((n) => [...n.summary].length > 700)
  ok(long, '演示数据里应当有一条长总结，否则这个功能没人试得出来')
  const paras = m.paragraphs(long.summary)
  ok(paras.length >= 3, `应当分成多段，实际 ${paras.length} 段`)
  ok(paras.every((p) => p.trim().length > 0), '不该出现空段落')
})

await test('分段不吃掉正文一个字', () => {
  const text = '第一段。\n\n第二段。\n第三段。'
  const paras = m.paragraphs(text)
  eq(paras.length, 3, '段数')
  eq(paras.join(''), '第一段。第二段。第三段。', '内容不该丢')
})

/* --------------------------- 谁能进控制端 --------------------------- */

await test('还没接登录时控制端开着——否则站长进不去填客户端 ID 的那一页', () => {
  const s = fresh()
  eq(s.auth.clientId, '', '演示状态下不该预填客户端 ID')
  const a = accessOf(s)
  eq(a.consoleOpen, true, '应当放行')
  eq(a.consoleUnlocked, true, '应当标明这是「还没上锁」而不是「你是管理员」')
  // 放进来却把每个按钮都禁掉，等于给了一间锁着所有抽屉的房间。
  eq(a.canEdit, true, '放行了就要真的能用')
})

await test('接上登录之后，没登录的人进不去', () => {
  let s = reducer(fresh(), { type: 'client-id', clientId: 'x.apps.googleusercontent.com' })
  const a = accessOf(s)
  eq(a.consoleOpen, false, '不该放行')
  eq(a.isAdmin, false, '未登录不是管理员')
})

await test('接上登录之后，站长和管理员进得去，别人进不去', () => {
  let base = reducer(fresh(), { type: 'client-id', clientId: 'x.apps.googleusercontent.com' })
  base = reducer(base, { type: 'admin-add', email: 'friend@gmail.com', who: ME })

  const owner = accessOf(reducer(base, { type: 'signin', email: OWNER_EMAIL }))
  eq(owner.isOwner, true, '站长'); eq(owner.consoleOpen, true, '站长应放行')

  const admin = accessOf(reducer(base, { type: 'signin', email: 'friend@gmail.com' }))
  eq(admin.isOwner, false, '管理员不是站长')
  eq(admin.isAdmin, true, '管理员'); eq(admin.consoleOpen, true, '管理员应放行')

  const other = accessOf(reducer(base, { type: 'signin', email: 'stranger@gmail.com' }))
  eq(other.isAdmin, false, '陌生人不是管理员')
  eq(other.consoleOpen, false, '陌生人不该放行')
  eq(other.canEdit, false, '陌生人也不该能改')
})

await test('邮箱大小写不影响身份判断', () => {
  let s = reducer(fresh(), { type: 'client-id', clientId: 'x.apps.googleusercontent.com' })
  s = reducer(s, { type: 'signin', email: OWNER_EMAIL.toUpperCase() })
  eq(accessOf(s).isOwner, true, '大写的站长邮箱也应认得')
})

/* ------------------------------ 谁能改 ------------------------------ */

await test('站长不能被移除——否则控制端会没人能管', () => {
  const s0 = fresh()
  const s1 = reducer(s0, { type: 'admin-remove', email: OWNER_EMAIL, who: ME })
  ok(s1.auth.admins.some((a) => a.email === OWNER_EMAIL && a.role === 'owner'), '站长仍应在名单里')
})

await test('加进来的是管理员，不是第二个站长', () => {
  const s1 = reducer(fresh(), { type: 'admin-add', email: 'friend@gmail.com', who: ME })
  const a = s1.auth.admins.find((x) => x.email === 'friend@gmail.com')
  ok(a, '新管理员应在名单里')
  eq(a.role, 'admin', '角色')
  eq(s1.auth.admins.filter((x) => x.role === 'owner').length, 1, '站长人数')
})

await test('同一个邮箱不会被加两遍', () => {
  let s = reducer(fresh(), { type: 'admin-add', email: 'friend@gmail.com', who: ME })
  s = reducer(s, { type: 'admin-add', email: 'FRIEND@gmail.com', who: ME })
  eq(s.auth.admins.filter((x) => x.email.toLowerCase() === 'friend@gmail.com').length, 1, '重复加应只留一条')
})

/* ------------------------------ 搜集 ------------------------------ */

await test('搜集不会凭空造链接：每条新闻都带得走的链接', () => {
  const s = fresh()
  const r = collect(s.collect, [], [], 0)
  ok(r.news.length > 0, '应该搜到东西')
  for (const n of r.news) ok(n.links.length > 0, `「${n.headline}」没有链接`)
})

await test('搜集尊重「找到就直接上线」这个开关', () => {
  const s = fresh()
  const on = collect({ ...s.collect, autoPublish: true }, [], [], 0)
  const off = collect({ ...s.collect, autoPublish: false }, [], [], 0)
  ok(on.news.every((n) => n.status === 'live'), '打开时应直接上线')
  ok(off.news.every((n) => n.status === 'hidden'), '关掉时应存草稿')
})

await test('跳过重复的会说明原因，不会悄悄消失', () => {
  const s = fresh()
  const first = collect({ ...s.collect, dedupe: true }, [], [], 0)
  const again = collect({ ...s.collect, dedupe: true }, first.news, first.studies, 0)
  // 第二次可以带回新的，但绝不能把第一次那些再加一遍。
  const seen = new Set(first.news.map((n) => n.headline))
  ok(again.news.every((n) => !seen.has(n.headline)), '同一条不该被加第二遍')
  ok(again.skipped.length > 0, '被跳过的应当有记录')
  ok(again.skipped.every((x) => x.reason.trim().length > 0), '每条跳过都要写原因')
  ok(again.skipped.some((x) => seen.has(x.headline)), '跳过的应当正是第一次已经收过的那些')
})

await test('关掉去重就真的不去重（开关是有用的）', () => {
  const s = fresh()
  const first = collect({ ...s.collect, dedupe: false }, [], [], 0)
  const again = collect({ ...s.collect, dedupe: false }, first.news, first.studies, 0)
  const seen = new Set(first.news.map((n) => n.headline))
  ok(again.news.some((n) => seen.has(n.headline)), '关掉去重后应当允许重复')
})

await test('只选一个地区就只搜那个地区', () => {
  const s = fresh()
  const r = collect({ ...s.collect, regions: ['cn'], perRun: 10 }, [], [], 0)
  ok(r.news.length > 0, '应该搜到东西')
  ok(r.news.every((n) => n.regions.includes('cn')), '不该出现别的地区')
})

await test('撤销一次搜集，会把这次加的全部收回', () => {
  const s0 = fresh()
  const r = collect(s0.collect, s0.news, s0.studies, 1)
  const run = {
    id: 'run-test', startedAt: new Date().toISOString(),
    config: s0.collect, steps: planSteps(s0.collect),
    addedNewsIds: r.news.map((n) => n.id), addedStudyIds: r.studies.map((x) => x.id),
    skipped: r.skipped, state: 'done',
  }
  let s = reducer(s0, { type: 'news-add', items: r.news, who: ME })
  s = reducer(s, { type: 'study-add', items: r.studies, who: ME })
  s = reducer(s, { type: 'run-start', run })
  eq(s.news.length, s0.news.length + r.news.length, '加完之后的条数')
  const back = reducer(s, { type: 'run-undo', runId: 'run-test', who: ME })
  eq(back.news.length, s0.news.length, '撤销后应回到原来的条数')
  eq(back.studies.length, s0.studies.length, '撤销后研究条数')
})

await test('搜集步骤是有名有姓的，不是一个转圈的图标', () => {
  const steps = planSteps(fresh().collect)
  ok(steps.length >= 4, '步骤太少，等待时看不出在干什么')
  ok(steps.every((x) => x.label.trim() && x.detail.trim()), '每步都要有说明')
})

/* ------------------------------ 一句话改样子 ------------------------------ */

await test('每个示例句子都真的能被看懂', () => {
  const s = fresh()
  for (const ex of VIBE_EXAMPLES) {
    const r = runVibe(ex, s)
    ok(r.understood, `示例「${ex}」自己都看不懂`)
    ok(r.changes.length > 0, `示例「${ex}」没有产生任何改动`)
  }
})

await test('看不懂就直说，并给一句建议——不瞎改', () => {
  const s = fresh()
  const r = runVibe('把首页做成一个能自动交易的比特币面板', s)
  eq(r.understood, false, '不该假装看懂')
  eq(r.changes.length, 0, '看不懂时不该改任何东西')
  ok((r.suggestion ?? '').trim().length > 0, '应该给一句建议')
})

await test('同一句话说两遍，结果一样（没有随机）', () => {
  const s = fresh()
  const a = runVibe('字大一点，换成深色', s)
  const b = runVibe('字大一点，换成深色', s)
  eq(JSON.stringify(a), JSON.stringify(b), '两次结果应完全一致')
})

await test('调整外观不会碰到新闻内容', () => {
  const s = fresh()
  const r = runVibe('换成深色，字大一点', s)
  for (const c of r.changes) {
    ok(!('news' in c) && !('studies' in c), '外观改动不该带上内容')
  }
})

/* ------------------------------ 同步 ------------------------------ */

await test('同步到 GitHub 的文件里没有 token', () => {
  let s = fresh()
  s = reducer(s, { type: 'github', patch: { token: 'ghp_secret_do_not_ship' } })
  const text = JSON.stringify(contentSnapshot(s))
  eq(text.includes('ghp_secret_do_not_ship'), false, 'token 不该出现在同步内容里')
})

await test('下载在拿不到保存通道时会说话，不会假装成功', async () => {
  // 无 window.claude、也无 document 的环境：走不了链接，也走不了宿主保存。
  const r = await m.downloadSnapshot(fresh()).catch((e) => ({ ok: false, message: e.message }))
  ok(typeof r.message === 'string' && r.message.trim().length > 0, '任何结果都要给一句话')
})

await test('同步的是内容，不是代码', () => {
  const snap = contentSnapshot(fresh())
  ok(Array.isArray(snap.news), '应包含新闻')
  ok(Array.isArray(snap.studies), '应包含研究')
  ok(snap.copy && snap.appearance, '应包含站点文案与外观')
})

/* ------------------------------ 默认设置 ------------------------------ */

await test('默认就先搜站长点名的六个地区', () => {
  const s = fresh()
  for (const r of PRIORITY_REGIONS) ok(s.collect.regions.includes(r), `默认没有包含优先地区 ${r}`)
})

await test('暂停对外显示不会删任何东西', () => {
  const s0 = fresh()
  const s1 = reducer(s0, { type: 'public-offline', off: true, who: ME })
  eq(s1.publicOffline, true, '开关状态')
  eq(s1.news.length, s0.news.length, '内容条数不该变')
  eq(reducer(s1, { type: 'public-offline', off: false, who: ME }).publicOffline, false, '应能恢复')
})

await test('每一步编辑都记进「最近编辑」', () => {
  const s0 = fresh()
  const s1 = reducer(s0, { type: 'news-hide', id: s0.news[0].id, who: ME })
  ok(s1.changes.length > s0.changes.length, '这次编辑没有被记下来')
  ok(s1.changes[0].text.trim().length > 0, '编辑记录应当有一句人话')
  eq(s1.changes[0].who, ME, '应记下是谁改的')
})

/* ------------------------------ 结果 ------------------------------ */

const failed = results.filter(([passed]) => !passed)
console.log('PRISM 行为冒烟测试')
console.log('—'.repeat(64))
for (const [passed, name, msg] of results) {
  console.log(`  ${passed ? '通过' : '失败'}  ${name}${passed ? '' : `\n         ${msg}`}`)
}
console.log('—'.repeat(64))
console.log(failed.length ? `${results.length} 项，${failed.length} 项失败` : `${results.length} 项全部通过`)
process.exit(failed.length ? 1 : 0)
