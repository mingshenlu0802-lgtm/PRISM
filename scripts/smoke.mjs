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
const { buildInitialState, reducer, accessOf, collect, planSteps,
        contentSnapshot, PRIORITY_REGIONS, readAddress,
        blankNews, blankStudy, keyProblem, keyDanger, keyTyping, urlProblem, urlTyping,
        parsePasted, friendly } = m

const results = []
const test = async (name, fn) => {
  try { await fn(); results.push([true, name, '']) }
  catch (e) { results.push([false, name, e.message]) }
}
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg}：期望 ${b}，实际 ${a}`) }
const ok = (v, msg) => { if (!v) throw new Error(msg) }

const fresh = () => buildInitialState()
// 测试里用一个假地址就够了：站长身份来自数据库的成员名单，代码里不写死任何人。
const ME = 'owner@example.com'
/**
 * 共享模式下的站长。
 *
 * 身份来自数据库的成员名单，不是代码里写死的——所以测试里也照这个路子造：
 * 名单里放一行 owner，再登录成那个邮箱。
 */
const asOwner = (extra = []) => {
  const s = fresh()
  return {
    ...s,
    auth: {
      ...s.auth,
      email: ME,
      ownerEmail: ME,
      admins: [{ email: ME, role: 'owner', addedAt: '2026-01-01T00:00:00Z' }, ...extra],
    },
  }
}
const signedInAsOwner = () => asOwner()

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

/* ------------------------------ 配图 ------------------------------ */

await test('配图必须带署名和说明，缺一样就不算数', () => {
  for (const n of fresh().news) {
    if (!n.image) continue
    ok(n.image.credit?.trim(), `「${n.headline}」配了图却没署名`)
    ok(n.image.alt?.trim(), `「${n.headline}」配了图却没有图片说明`)
  }
})

await test('没有配图的条目也不会开天窗——封面由标签生成，而且是确定的', () => {
  const n = fresh().news[0]
  // 同一条新闻画出来的封面必须每次一样，否则读者每次刷新看到的都不同。
  const draw = (seed) => {
    let h = 2166136261
    for (let i = 0; i < seed.length; i += 1) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
    return Math.abs(h)
  }
  eq(draw(n.slug), draw(n.slug), '同一个 slug 应当得到同一张图')
  ok(draw(n.slug) !== draw(fresh().news[1].slug), '不同新闻不该画出同一张图')
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

await test('本地模式：没有登录这回事，打开的人就是这份副本的主人', () => {
  const a = accessOf(fresh(), 'local')
  eq(a.consoleOpen, true, '控制端应当开着')
  eq(a.canEdit, true, '开着就要真的能用')
  eq(a.isOwner, true, '本地模式下你就是主人')
  eq(a.isMember, true, '没有名单这回事')
})

await test('看内容不需要登录——有链接就能看', () => {
  const s = fresh()
  // 没登录的人：不是成员，但这不该妨碍他看内容。
  const anon = accessOf(s, 'shared')
  eq(anon.isMember, false, '没登录当然不是成员')
  eq(anon.canEdit, false, '也当然不能改')
  eq(anon.consoleOpen, false, '进不了控制端')
  // 「能不能看」不由 accessOf 决定——公众站不再拿它拦人，
  // 数据库那边 news/studies/site 的读也对所有人开放。
})

await test('共享模式：只有站长和编辑进得了控制端', () => {
  const base = asOwner([
    { email: 'editor@x.com', role: 'editor', addedAt: '2026-01-02T00:00:00Z' },
    { email: 'reader@x.com', role: 'member', addedAt: '2026-01-03T00:00:00Z' },
  ])
  const as = (email) => accessOf({ ...base, auth: { ...base.auth, email } }, 'shared')

  eq(as(ME).consoleOpen, true, '站长应放行')
  eq(as('editor@x.com').consoleOpen, true, '编辑应放行')
  eq(as('reader@x.com').consoleOpen, false, '只能看的人进不了控制端')
  eq(as('reader@x.com').isMember, true, '但他能看网站')
  eq(as('stranger@x.com').isMember, false, '不在名单上的人连网站都看不到')
})

await test('邮箱大小写不影响身份判断', () => {
  const base = asOwner()
  const upper = accessOf({ ...base, auth: { ...base.auth, email: ME.toUpperCase() } }, 'shared')
  eq(upper.isOwner, true, '大写的邮箱也应认得出是站长')
})

/* ------------------------------ 谁能改 ------------------------------ */

await test('站长不能被移除——否则控制端会没人能管', () => {
  const s1 = reducer(asOwner(), { type: 'admin-remove', email: ME, who: ME })
  ok(s1.auth.admins.some((a) => a.email === ME && a.role === 'owner'), '站长仍应在名单里')
})

await test('代码里不写死任何人——站长来自数据库的名单', () => {
  const s = fresh()
  eq(s.auth.admins.length, 0, '出厂时名单应当是空的')
  eq(s.auth.ownerEmail, undefined, '出厂时不该指定站长')
  eq(accessOf(s, 'shared').isMember, false, '空名单下谁都不是成员')
})

/* --------------------------- 不外泄个人信息 --------------------------- */

await test('发布出去的初始状态里没有任何邮箱地址', () => {
  const text = JSON.stringify(fresh())
  ok(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(text), `初始状态里出现了邮箱地址：${text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)}`)
  eq(fresh().github.owner, '', 'GitHub 用户名也不该预填在代码里')
})

await test('登录只记下你是谁，身份由名单说了算', () => {
  const s = reducer(fresh(), { type: 'signin', email: 'someone@x.com' })
  eq(s.auth.email, 'someone@x.com', '记下登录的人')
  eq(accessOf(s, 'shared').isOwner, false, '不在名单里就不是站长')
  eq(accessOf(s, 'shared').isMember, false, '也不是成员')
})

await test('加进来的是编辑，不是第二个站长', () => {
  const s1 = reducer(signedInAsOwner(), { type: 'admin-add', email: 'friend@gmail.com', who: ME })
  const a = s1.auth.admins.find((x) => x.email === 'friend@gmail.com')
  ok(a, '新成员应在名单里')
  eq(a.role, 'editor', '角色')
  eq(s1.auth.admins.filter((x) => x.role === 'owner').length, 1, '站长人数')
})

/* ------------------------------ 三种身份 ------------------------------ */

await test('三种身份：站长能全干，编辑只能改内容，成员只能看', () => {
  let s = signedInAsOwner()
  s = reducer(s, { type: 'admin-add', email: 'editor@x.com', who: ME })
  s = reducer(s, { type: 'admin-add', email: 'reader@x.com', who: ME })
  s = reducer(s, { type: 'member-role', email: 'reader@x.com', role: 'member', who: ME })

  const asOwner = accessOf({ ...s, auth: { ...s.auth, email: ME } }, 'shared')
  eq(asOwner.isOwner, true, '站长'); eq(asOwner.canEdit, true, '站长能改')

  const asEditor = accessOf({ ...s, auth: { ...s.auth, email: 'editor@x.com' } }, 'shared')
  eq(asEditor.isOwner, false, '编辑不是站长')
  eq(asEditor.canEdit, true, '编辑能改内容')
  eq(asEditor.isMember, true, '编辑当然是成员')

  const asReader = accessOf({ ...s, auth: { ...s.auth, email: 'reader@x.com' } }, 'shared')
  eq(asReader.canEdit, false, '只能看的人改不了')
  eq(asReader.isMember, true, '但他能看')

  const stranger = accessOf({ ...s, auth: { ...s.auth, email: 'nobody@x.com' } }, 'shared')
  eq(stranger.isMember, false, '不在名单上的人连看都不行')
  eq(stranger.canEdit, false, '当然也改不了')
})

await test('站长不能把自己降级——否则会把自己锁死', () => {
  const s0 = signedInAsOwner()
  const s1 = reducer(s0, { type: 'member-role', email: ME, role: 'member', who: ME })
  eq(s1.auth.admins.find((a) => a.email === ME).role, 'owner', '站长身份不该被改掉')
})

await test('本地模式下 isMember 恒为真——没有后端就没有名单这回事', () => {
  eq(accessOf(fresh(), 'local').isMember, true, '本地模式不该把自己挡在外面')
  eq(accessOf(fresh(), 'local').mode, 'local', '模式')
})

await test('同一个邮箱不会被加两遍', () => {
  let s = reducer(signedInAsOwner(), { type: 'admin-add', email: 'friend@gmail.com', who: ME })
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

await test('调整外观不会碰到新闻内容', () => {
  const s0 = fresh()
  const s1 = reducer(s0, { type: 'appearance', patch: { theme: 'ink', fontScale: 1.3 }, who: ME })
  eq(s1.appearance.theme, 'ink', '主题应当改了')
  eq(s1.appearance.fontScale, 1.3, '字号应当改了')
  eq(JSON.stringify(s1.news), JSON.stringify(s0.news), '外观改动不该碰新闻')
  eq(JSON.stringify(s1.studies), JSON.stringify(s0.studies), '外观改动不该碰研究')
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

/* ---------------- 网址里有没有人名 ---------------- */

await test('GitHub Pages 的网址会被认出账号名', () => {
  const a = readAddress('https://someones-account.github.io/PRISM/#/')
  eq(a.kind, 'pages', '应认出这是 GitHub Pages')
  eq(a.account, 'someones-account', '应挑出账号名')
  eq(a.path, '/PRISM/', '应留下仓库那一段')
  eq(a.full, 'https://someones-account.github.io/PRISM/', '给朋友的地址不该带 #/')
  ok(a.personal, '一个看不出跟站点有关的账号名，应当提醒站长')
})

await test('已经换成站点名的组织，不再唠叨', () => {
  for (const org of ['prism-lens', 'prismdesk', 'refracted', 'prism-daily']) {
    const a = readAddress(`https://${org}.github.io/prism/`)
    eq(a.kind, 'pages', `${org}：应认出这是 GitHub Pages`)
    ok(!a.personal, `${org}：这个名字跟站点有关，不该再提醒`)
  }
})

await test('自有域名是最干净的状态', () => {
  const a = readAddress('https://prismlens.org/#/news')
  eq(a.kind, 'custom', '自有域名')
  eq(a.account, null, '自有域名里没有账号名')
  ok(!a.personal, '不该提醒')
})

await test('本机预览和沙箱预览不当成正式网址', () => {
  eq(readAddress('http://localhost:5173/').kind, 'local', '本机预览')
  eq(readAddress('https://x.github.io/PRISM/', true).kind, 'sandbox', '跑在别人的框里')
  ok(!readAddress('https://x.github.io/PRISM/', true).personal, '沙箱里不该提醒改网址')
})

await test('冒充 github.io 的域名不会被当成 Pages', () => {
  // 若把它认成 Pages，就会把「evil」当账号名显示给站长，等于帮着骗人。
  eq(readAddress('https://github.io.example.com/').kind, 'custom', '不是 github.io')
  eq(readAddress('https://a.b.github.io/x/').kind, 'custom', '多一级子域不是 Pages 用户站')
})

/* ---------------- 自己写一条 ---------------- */

await test('自己写的新条目先下架，不会以空壳出现在首页', () => {
  const item = blankNews()
  eq(item.status, 'hidden', '新建的必须是下架状态')
  eq(item.origin, 'editor', '要标成人写的，不是搜来的')
  eq(item.demo, false, '自己写的不是演示数据')
  eq(item.links.length, 0, '不该塞任何占位链接——假网址比没链接更糟')
  const s = reducer(fresh(), { type: 'news-add', items: [item], who: ME, manual: true })
  eq(s.news[0].id, item.id, '新建的应当排在最前')
  eq(s.news.filter((n) => n.status === 'live').length,
     fresh().news.filter((n) => n.status === 'live').length, '上线条数不该变')
})

await test('研究也能自己写，同样先下架', () => {
  const item = blankStudy()
  eq(item.status, 'hidden', '新建的研究必须是下架状态')
  eq(item.origin, 'editor', '要标成人写的')
  const s = reducer(fresh(), { type: 'study-add', items: [item], who: ME, manual: true })
  eq(s.studies[0].id, item.id, '新建的应当排在最前')
})

await test('自己写的和搜来的，改动记录分得清', () => {
  const s0 = fresh()
  const manual = reducer(s0, { type: 'news-add', items: [blankNews()], who: ME, manual: true })
  const collected = reducer(s0, { type: 'news-add', items: [blankNews()], who: ME })
  ok(manual.changes[0].text.includes('自己写'), `手写的记成了：${manual.changes[0].text}`)
  ok(collected.changes[0].text.includes('搜集到'), `搜来的记成了：${collected.changes[0].text}`)
})

await test('每次新建都是一条独立的条目，不会互相覆盖', () => {
  let s = fresh()
  const a = blankNews()
  const b = blankNews()
  ok(a.id !== b.id, '两次新建的 id 不该相同')
  ok(a.slug !== b.slug || a.id !== b.id, '两次新建不该完全一样')
  s = reducer(s, { type: 'news-add', items: [a], who: ME, manual: true })
  s = reducer(s, { type: 'news-add', items: [b], who: ME, manual: true })
  eq(s.news.length, fresh().news.length + 2, '应当多出两条')
})

/* ---------------- 填 Supabase 那两串时的提示 ---------------- */

await test('打字打到一半不该被判成填错了', () => {
  // 站长反馈：「我尝试给 publishable key enter anything 的时候就出现错误」。
  for (const half of ['s', 'sb_', 'sb_publishable', 'sb_publishable_', 'e', 'ey', 'eyJ']) {
    ok(keyTyping(half), `「${half}」还在打字中途，不该报错`)
    eq(keyDanger(half), null, `「${half}」不是危险的 key，不该立刻拦`)
  }
  ok(keyTyping(''), '空的输入框当然不算填错')
  for (const half of ['h', 'https:', 'https://']) {
    ok(urlTyping(half), `「${half}」还在打字中途，不该报错`)
  }
})

await test('危险的 key 一个字符都不等，立刻拦下来', () => {
  // 填错这一个的后果是把绕过全部权限规则的钥匙印在网页上——不能等按按钮才说。
  ok(keyDanger('sb_secret_abc'), 'Secret key 必须立刻拦')
  ok(keyDanger('service_role_xyz'), 'service_role 必须立刻拦')
  ok(!keyTyping('sb_secret_abc'), '危险的 key 不算「还在打字」')
  ok(keyProblem('sb_secret_abc').includes('Secret'), '错误里要说清楚是哪一种 key')
})

await test('填对的 key 和网址不报错', () => {
  eq(keyProblem('sb_publishable_' + 'x'.repeat(40)), null, '新版 Publishable key 应当通过')
  eq(keyProblem('eyJ' + 'x'.repeat(60)), null, '旧版 anon key 应当通过')
  eq(urlProblem('https://lutztcjcgrqjbpzzbzmw.supabase.co'), null, '正常的项目地址应当通过')
})

await test('填错网址会说清楚，而不是默默连不上', () => {
  ok(urlProblem('http://example.com'), '非 Supabase 的地址应当被指出来')
  ok(urlProblem('https://example.com').includes('Supabase'), '要说明期望的是什么')
  ok(urlProblem('随便打的').length > 0, '不是网址就该说不是网址')
})

await test('两行一起粘也认得出来，各自归位', () => {
  // 站长的原话：「我不能同时输入两行进输入框。」
  const URL_ = 'https://lutztcjcgrqjbpzzbzmw.supabase.co'
  const KEY_ = 'sb_publishable_' + 'A1b2C3d4'.repeat(5)
  for (const blob of [`${URL_}\n${KEY_}`, `${KEY_}\n${URL_}`, `${URL_}  ${KEY_}`, `  ${URL_}\r\n${KEY_}  `]) {
    const r = parsePasted(blob)
    eq(r.url, URL_, `没认出网址：${JSON.stringify(blob)}`)
    eq(r.anonKey, KEY_, `没认出 key：${JSON.stringify(blob)}`)
  }
})

await test('只粘一串时不会瞎猜另一串', () => {
  const only = parsePasted('https://lutztcjcgrqjbpzzbzmw.supabase.co')
  eq(only.url, 'https://lutztcjcgrqjbpzzbzmw.supabase.co', '网址应当认出来')
  eq(only.anonKey, undefined, '没有 key 就不该编一个出来')
  const junk = parsePasted('随便一段没用的文字\n还有一行')
  eq(junk.url, undefined, '认不出来就什么都别填')
  eq(junk.anonKey, undefined, '认不出来就什么都别填')
})

await test('粘进来的 Secret key 照样会被拦下', () => {
  // 认出来只是为了填进框里——危险与否由 keyDanger 判断，不能因为「是粘的」就放行。
  const r = parsePasted('https://abc.supabase.co\nsb_secret_' + 'x'.repeat(40))
  ok(r.anonKey.startsWith('sb_secret_'), '应当认出这一串')
  ok(keyDanger(r.anonKey), '认出来之后必须立刻被判危险')
})

await test('发信被限流时，说的等待时间必须是对的', () => {
  /*
   * 这两种限流的等待时间差了两个数量级，说错了就是把人支去白等：
   * 短冷却是几十秒，发信配额是按小时算的。
   * 站长真的照着「等一分钟再试」一分钟试一次，每次都失败。
   */
  const cool = friendly(new Error('For security purposes, you can only request this after 41 seconds.'))
  ok(cool.includes('41'), '短冷却要照搬服务器给的秒数，不要自己编一个')
  ok(!cool.includes('额度'), '短冷却不是额度问题，别混为一谈')

  for (const raw of ['email rate limit exceeded', 'over_email_send_rate_limit']) {
    const quota = friendly(new Error(raw))
    ok(quota.includes('额度'), `「${raw}」要认成发信额度用完`)
    ok(!/等一分钟再试/.test(quota), '不能再说「等一分钟」——配额是按小时刷新的')
    ok(/SMTP/i.test(quota), '要说出真正的出路：配自己的 SMTP')
  }
})

await test('发信失败和额度用完不能混为一谈', () => {
  /*
   * 「Error sending magic link email」是 SMTP 配错了——等多久都不会好。
   * 跟额度用完混在一起说，站长就会去等一个永远等不到的东西。
   */
  const smtp = friendly(new Error('Error sending magic link email'))
  ok(/SMTP/i.test(smtp), '要指向 SMTP 配置，那才是原因')
  ok(/不是额度问题/.test(smtp) && /等也没用/.test(smtp), '要明说这不是额度问题、等没有用')
  ok(smtp !== 'Error sending magic link email', '不能把英文原文直接甩给站长')

  // 额度那条不能被这条抢走。
  const quota = friendly(new Error('email rate limit exceeded'))
  ok(quota.includes('额度'), '额度用完仍然要认成额度用完')
})

/* --------------------- 真实新闻收集：解析与归类 --------------------- */

const feedparse = await import('./feedparse.mjs')
const ed = await import('./editorial.mjs')

await test('RSS 和 Atom 都要认得出来', () => {
  const rss = `<rss><channel>
    <item><title>Court strikes down abortion ban</title>
      <link>https://example.org/a</link>
      <description><![CDATA[<p>A ruling in <b>Poland</b>.</p>]]></description>
      <pubDate>Tue, 01 Sep 2026 10:00:00 GMT</pubDate></item>
  </channel></rss>`
  const a = feedparse.parseFeed(rss)
  eq(a.length, 1, '应当解析出一条')
  eq(a[0].title, 'Court strikes down abortion ban', '标题要对')
  eq(a[0].link, 'https://example.org/a', '链接要对')
  ok(!a[0].summary.includes('<'), 'HTML 标签要清掉，CDATA 要拆开')

  const atom = `<feed><entry><title>Trans rights bill passes</title>
    <link rel="alternate" href="https://example.org/b"/>
    <summary>In Taiwan.</summary><published>2026-09-01T00:00:00Z</published></entry></feed>`
  const b = feedparse.parseFeed(atom)
  eq(b.length, 1, 'Atom 也要认')
  eq(b[0].link, 'https://example.org/b', 'Atom 的链接在属性里，不在标签内容里')
})

await test('没有链接的条目一律丢掉', () => {
  // 读者没法自己去核对的新闻，对这个网站没有价值。
  const xml = '<rss><channel><item><title>只有标题</title></item></channel></rss>'
  eq(feedparse.parseFeed(xml).length, 0, '缺链接就不该留下')
})

await test('综合来源要靠关键词筛，不能什么都收', () => {
  const sport = { title: 'Local team wins the cup', summary: 'A football final.' }
  eq(feedparse.topicsOf(sport).length, 0, '体育新闻不该命中任何议题')

  const real = { title: 'New law on domestic violence', summary: '' }
  ok(feedparse.topicsOf(real).includes('violence'), '家暴应当归到暴力')

  const zh = { title: '跨性别者就医权益争议', summary: '' }
  ok(feedparse.topicsOf(zh).includes('trans'), '中文也要认得出来')
})

await test('地区认得出来，认不出来就用来源默认的', () => {
  const feed = { regions: ['global'] }
  ok(feedparse.regionsOf({ title: 'Ruling in Taiwan', summary: '' }, feed).includes('tw'),
    '标题里写了台湾就该归到台湾')
  eq(feedparse.regionsOf({ title: 'A general report', summary: '' }, feed)[0], 'global',
    '认不出来时退回来源本来覆盖的地区，而不是留空')
})

await test('第一次真实抓取里归错的那几条，不能再错', () => {
  /*
   * 这些标题是 2026-09-01 那次演练真的抓回来的，也真的归错了。
   * 根因是英文按子串匹配：`mexico` 撞进「New Mexico」，
   * `america` 把「Latin America」整片吃成美国。
   */
  const r = (title) => feedparse.regionsOf({ title, summary: '' }, { regions: [] })

  ok(r('A middle schooler said she was raped. New Mexico Title IX').includes('us'),
    '新墨西哥州是美国，不是墨西哥')
  ok(!r('A middle schooler said she was raped. New Mexico Title IX').includes('latam'),
    '尤其不该同时被算成拉美')
  ok(r('Ecuador: New Adoption Law Entrenches Bias').includes('latam'), '厄瓜多尔是拉美')
  ok(r('Texas law banning drag shows struck down').includes('us'), '德州是美国')
  ok(r('Latin America sees rise in femicide').includes('latam'),
    '「Latin America」不该被 america 吃成美国')
  eq(r('Dolly Parton, unabashedly herself').length, 0,
    '认不出地区就该留空，交给来源的默认值，而不是乱配')
})

await test('中文和英文的匹配方式必须分开', () => {
  // 中文没有词边界，英文有——用错一边就会大面积误判。
  ok(feedparse.matches('跨性别者就医', '跨性别'), '中文按子串找')
  ok(feedparse.matches('a gay rights ruling', 'gay rights'), '英文词组要能匹配')
  ok(!feedparse.matches('the therapist said', 'rape'), '英文不能子串乱撞（therapist 里没有 rape）')
  ok(!feedparse.matches('ukraine war', 'uk'), '短缩写不能撞进别的词里')
})

await test('slug 能进网址，中文也不会变成空串', () => {
  ok(/^[a-z0-9-]+$/.test(feedparse.slugify('Court Strikes Down Ban!')), '英文标题要变成干净的 slug')
  ok(feedparse.slugify('跨性别者就医权益').length > 0, '中文标题不能被清成空串')
})

await test('同一件事被几家报道，要合并成一条多来源，不是几条重复', () => {
  // 站长的要求：「不要有任何重复」。按链接去重不够——同一件事的三个报道是三个网址。
  ok(feedparse.sameStory('Texas law banning drag shows struck down',
    'Judge strikes down Texas drag show ban'), '换个说法讲同一件事，要认出来')
  ok(feedparse.sameStory('Producer charged with sexual assault',
    'Producer denies sexual assault allegations'), '同一个案子的不同进展也算同一件事')
  ok(!feedparse.sameStory('Woman wins pay discrimination case',
    'How do you figure out if microplastics are affecting pregnancy'),
  '不相干的两条绝不能被合并——合错了会把一条新闻的来源挂到另一条上')
  ok(!feedparse.sameStory('New law on parental leave in Spain', 'Abortion ruling in Poland'),
    '同属性别议题但不同事件，也不能合')
})

await test('简繁写法必须归一，否则中文去重根本不工作', () => {
  // 站里同时收中港台的来源：一边写「台湾跨性别」，一边写「台灣跨性別」。
  ok(feedparse.sameStory('台湾通过跨性别性别承认新制', '台灣跨性別性別承認新制上路'),
    '简体和繁体讲的是同一件事')
})

await test('比较网址之前要洗掉跟踪参数', () => {
  const a = feedparse.normUrl('https://example.org/news/x?utm_source=twitter&utm_medium=social')
  const b = feedparse.normUrl('https://example.org/news/x/')
  eq(a, b, '同一篇文章带不带 utm 参数，应当算同一个网址')
})

await test('涉及性暴力的条目要带内容提示，别的不要', () => {
  /*
   * 站长要求去掉「等他审核」那一层，包括针对公众人物的指控——那是他指定的
   * 报道重心，这个决定是他的，抓到就上线。
   *
   * 留下的只是给读者的一句话，不影响任何一条是否发布。这个站本来就这么做：
   * 演示数据里的原话是「本条涉及性骚扰案件的审理程序。总结不描述任何具体案情。」
   */
  const n = (title, topics) => feedparse.noticeFor({ title, summary: '' }, topics)

  ok(n('Producer sentenced for sexual assault', ['violence']), '性暴力条目要有提示')
  ok(n('Producer sentenced for sexual assault', ['violence']).includes('尚未经本站核实'),
    '涉及具体案件时要说清楚摘要没经过本站核实')
  ok(!n('Report on gender pay gap', ['equality']), '不相关的条目不该加提示——提示满天飞就没人看了')
})

await test('用媒体自己配的图，并且署上它的名字', () => {
  // 站长：「你没有给我高质量的标图。」feed 里本来就带图，之前整个丢掉了。
  const rss = '<rss><channel><item><title>A ruling</title><link>https://x.org/a</link>'
    + '<media:content url="https://x.org/p.jpg" medium="image"/>'
    + '<media:credit>Jane Doe/Reuters</media:credit>'
    + '<media:description>Protesters outside the court</media:description>'
    + '</item></channel></rss>'
  const [e] = feedparse.parseFeed(rss, 'The Guardian')
  eq(e.image.url, 'https://x.org/p.jpg', '要取到图片地址')
  eq(e.image.credit, 'Jane Doe/Reuters', '媒体给了署名就用它的，不要写成来源媒体')
  eq(e.image.alt, 'Protesters outside the court', '媒体给了图说就用作替代文字')
})

await test('没有图说时不编造图里有什么', () => {
  /*
   * 给一张没看过的照片编一段描述，是在骗用读屏软件的人。
   * 只说明出处是诚实的，也仍然告诉对方「这里有一张来自某媒体的图」。
   */
  const rss = '<rss><channel><item><title>B</title><link>https://x.org/b</link>'
    + '<enclosure url="https://x.org/q.jpg" type="image/jpeg"/></item></channel></rss>'
  const [e] = feedparse.parseFeed(rss, 'Ms. Magazine')
  ok(e.image.alt.includes('Ms. Magazine'), '替代文字要说明出处')
  ok(!/protest|court|woman|man/i.test(e.image.alt), '不能凭空描述图片内容')
})

await test('没有图就是没有图，不要塞一个空对象进去', () => {
  const rss = '<rss><channel><item><title>C</title><link>https://x.org/c</link></item></channel></rss>'
  eq(feedparse.parseFeed(rss, 'X')[0].image, null, '没有图时应当是 null')
})

await test('编辑方针要完整传给模型', () => {
  // 方针是站长写的，散在聊天记录里没用，必须进代码并且被真的用上。
  const p = ed.systemPrompt('今天多找台湾的司法进展')
  ok(p.includes('真实伤害、权力失衡、制度责任'), '要带上站长对这个站的定义')
  ok(p.includes('十一、值得追踪的反常案件'), '十一条优先级要完整')
  ok(p.includes('主语回到施害者身上'), '语气要求要在')

  // 站长：「benefit of the doubt 请给受害者，我们不是在法庭。」
  ok(p.includes('不用怀疑的语法'), '不能用「据称」「所谓受害者」这类怀疑标记')
  ok(p.includes('不做虚假平衡'), '一句否认不该和多人指证等量齐观')
  ok(p.includes('没有定罪不等于没有发生'), '绝大多数案件不会进法庭，这不影响伤害是真的')

  // 只守两条，而且理由是为了受害者。
  ok(p.includes('不把未经证实的犯罪行为写成已经确立的事实'),
    '对在世具名个人仍然不能把指控写成定论——那会变成对方律师的武器')
  ok(p.includes('整条报道'),
    '要说清楚「不编造」是在保护幸存者的陈述，不是在怀疑她')
  ok(p.includes('台湾的司法进展'), '站长当次的额外指示要接得上')
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
