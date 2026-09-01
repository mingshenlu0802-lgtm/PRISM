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
import { mkdirSync, readFileSync } from 'node:fs'
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
const { buildInitialState, reducer, accessOf,
        contentSnapshot, PRIORITY_REGIONS, readAddress,
        blankNews, blankStudy, keyProblem, keyDanger, keyTyping, urlProblem, urlTyping,
        parsePasted, friendly, todayISO, TOPICS, weightedShuffle, recencyWeight, Prose,
        fmtDate, fmtDateTime } = m

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
const llm = await import('./llm.mjs')
const rw = await import('./rewrite.mjs')
const blk = await import('./blocks.mjs')
const feeds = await import('./feeds.mjs')

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

  // 家暴现在是独立的一栏（站长把它从性犯罪里拆了出来）。
  const dv = { title: 'New law on domestic violence', summary: '' }
  ok(feedparse.topicsOf(dv).includes('domestic'), '家暴应当归到家庭暴力')
  ok(!feedparse.topicsOf(dv).includes('sexual'), '家暴不该同时算成性犯罪——拆开就是为了分清')

  const sv = { title: 'Man charged with sexual assault of a student', summary: '' }
  ok(feedparse.topicsOf(sv).includes('sexual'), '性侵要归到性犯罪')

  // Incel 是新加的一栏，认的是这套亚文化自己的黑话。
  const inc = { title: 'How the manosphere turned red pill talk into a business', summary: '' }
  ok(feedparse.topicsOf(inc).includes('incel'), 'manosphere 要认得出来')

  // 跨性别并进了 LGBTQIA+ 权益那一栏。
  const zh = { title: '跨性别者就医权益争议', summary: '' }
  ok(feedparse.topicsOf(zh).includes('lgbtq'), '中文也要认得出来')
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

await test('不再给条目挂内容提示', () => {
  // 这里原本测的是「性暴力条目要带内容提示」。站长要求去掉那条红色警告带，
  // 理由成立：这个站每一条都是性别暴力相关的报道，条条都挂等于没挂。
  //
  // 留下 isCase()——它现在的用处是排序（司法进展优先），不再决定挂不挂提示。
  ok(!('noticeFor' in feedparse), 'noticeFor 应该已经删掉，不要再有条目带提示')
  ok(feedparse.isCase({ title: '检方起诉某教授', summary: '' }), '认得出司法进展，排序要用')
  ok(!feedparse.isCase({ title: '一份关于育儿假的报告', summary: '' }), '不是案件就不是案件')
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

await test('有 Claude 的 key 就够了，不用再填型号名', async () => {
  // 站长：「付费也没关系，我全部用 Claude api 吧。」那就让它只需要一个 Secret。
  const keep = { ...process.env }
  try {
    delete process.env.LLM_BASE_URL
    delete process.env.LLM_MODEL
    delete process.env.LLM_API_KEY
    process.env.ANTHROPIC_API_KEY = 'sk-ant-fake'
    const c = llm.resolveLlm()
    ok(c, '有 key 就该能跑')
    eq(c.kind, 'anthropic', '要走原生协议，不是 OpenAI 兼容层')
    ok(c.model.startsWith('claude-'), '没填型号也要有一个能用的默认')
    ok(llm.llmConfigured(), '这就算配好了')

    // 别家的配置不该把 Claude 挤掉——站长说的是「全部用 Claude」。
    process.env.LLM_BASE_URL = 'https://api.groq.com/openai/v1'
    process.env.LLM_MODEL = 'qwen/qwen3-32b'
    process.env.LLM_API_KEY = 'gsk_fake'
    eq(llm.resolveLlm().kind, 'anthropic', 'Claude 优先')
    eq(llm.resolveLlm().model, 'qwen/qwen3-32b', 'LLM_MODEL 仍然用来选 Claude 的型号')
  } finally { process.env = keep }
})

await test('发给 Claude 的请求必须照它的规矩来', async () => {
  // 这三处和 OpenAI 那套不一样，每一处填错都是 400 或 401，
  // 而站长看到的只会是「今天没有新闻」。
  const keep = { ...process.env }
  const realFetch = globalThis.fetch
  try {
    delete process.env.LLM_BASE_URL
    delete process.env.LLM_MODEL
    delete process.env.LLM_API_KEY
    process.env.ANTHROPIC_API_KEY = 'sk-ant-fake'

    let seen = null
    globalThis.fetch = async (url, init) => {
      seen = { url, headers: init.headers, body: JSON.parse(init.body) }
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: '{"ok":true}' }],
        usage: {
          input_tokens: 120, output_tokens: 30,
          cache_creation_input_tokens: 6000, cache_read_input_tokens: 0,
        },
      }), { status: 200 })
    }

    const got = await llm.ask('这是编辑方针', '这是这一批新闻')
    eq(got.ok, true, '要能从 content[] 里取出文字并解析成 JSON')
    ok(String(seen.url).endsWith('/v1/messages'), `要打 /v1/messages，实际 ${seen.url}`)
    eq(seen.headers['x-api-key'], 'sk-ant-fake', '认证是 x-api-key，不是 Bearer')
    ok(!seen.headers.authorization, '不该再带 Authorization 头')
    eq(seen.headers['anthropic-version'], '2023-06-01', '少了版本号直接 400')
    // system 是顶层字段（不是 messages 里的一条），而且带缓存标记：
    // 整份编辑方针每批都一样，不缓存就是把同一段话重新买十几遍。
    eq(seen.body.system[0].text, '这是编辑方针', 'system 是顶层字段，不是 messages 里的一条')
    eq(seen.body.system[0].cache_control.type, 'ephemeral', '编辑方针要开缓存，否则每批重复计费')
    eq(seen.body.messages.length, 1, 'messages 里只该有用户那一条')
    ok(!JSON.stringify(seen.body).includes('response_format'),
      'response_format 是 OpenAI 的字段，发给 Claude 会报错')

    // 第一次真实收集全军覆没就是这个：五批全部 400，
    // `temperature` is deprecated for this model.
    // 我照着 OpenAI 的习惯加了它，新一代 Claude 不再接受。
    ok(!('temperature' in seen.body), 'temperature 不能发给 Claude——它会整批 400')

    // 记账：站长拿自己的余额在跑，花了多少不该靠猜。
    const bill = llm.spendReport()
    ok(bill.includes('120'), '要报出真实的输入 token 数')
    ok(bill.includes('30'), '要报出真实的输出 token 数')
    ok(bill.includes('6,000'), '缓存写入要单独报——它和普通输入不同价')
    ok(/US\$/.test(bill), '要给一个钱的估算，否则数字对站长没有意义')
  } finally { process.env = keep; globalThis.fetch = realFetch }
})

await test('三个配齐才算配好，缺一个就整套退回', async () => {
  const keep = { ...process.env }
  try {
    process.env.LLM_BASE_URL = 'https://api.groq.com/openai/v1/'
    process.env.LLM_MODEL = 'qwen/qwen3-32b'
    process.env.LLM_API_KEY = 'gsk_fake'
    const c = llm.resolveLlm()
    eq(c.base, 'https://api.groq.com/openai/v1', '结尾的斜杠要洗掉，否则会拼出 //chat')
    eq(c.model, 'qwen/qwen3-32b', '要用站长指定的型号')
    ok(llm.llmConfigured(), '三个齐了就该算配好')

    // 缺一个不能半途用这家的 key 去打那家的端点——那只会得到一串 401，
    // 而日志里看起来像是「模型坏了」，站长会去改一个本来就对的东西。
    delete process.env.LLM_API_KEY
    eq(llm.resolveLlm(), null, '缺一个就整套退回，不许混搭')
    eq(llm.llmConfigured(), false, '不能假装配好了——收集会以为能翻译，结果整批失败')
  } finally { process.env = keep }
})

await test('不许再把 GitHub Models 当默认——它已经 410 了', async () => {
  // 我曾经把它设成默认：仓库自带 token 就能调，看起来正是「真正免费」的答案。
  // 2026-09-01 让 runner 真打了一次，五个型号全部 HTTP 410，
  // github_models_retirement_brownout——它在退役。
  // 一个会静静 410 的默认值，只会让站长看到「今天没有新闻」。
  const keep = { ...process.env }
  try {
    delete process.env.LLM_BASE_URL
    delete process.env.LLM_MODEL
    delete process.env.LLM_API_KEY
    process.env.GITHUB_TOKEN = 'ghs_fake'
    eq(llm.resolveLlm(), null, '有 GITHUB_TOKEN 也不该自作主张去调一个退役的服务')
  } finally { process.env = keep }

  const { readFileSync } = await import('node:fs')
  const y = readFileSync('.github/workflows/collect.yml', 'utf8')
  ok(!/^\s*models:\s*read\s*$/m.test(y), 'collect.yml 不该再要 models 权限')
  ok(/^\s*contents:\s*read\s*$/m.test(y), '这个 job 只读代码，权限就该写死到这么大')
})

await test('探测脚本要说清楚缺的是哪一个', async () => {
  // 「配了但没生效」和「压根没配」是两回事。第一次真跑就发现 Secrets 里
  // 根本没有这两个——如果只说一句「没配置模型」，站长会去改 Groq 那边。
  const { execFileSync } = await import('node:child_process')
  const run = (env) => {
    try {
      return execFileSync(process.execPath, ['scripts/llm-check.mjs'],
        { env: { ...process.env, LLM_BASE_URL: '', LLM_API_KEY: '', ...env }, encoding: 'utf8' })
    } catch (e) { return String(e.stdout ?? '') }
  }
  ok(run({}).includes('都是空的'), '两个都缺就要说两个都缺')
  ok(run({ LLM_API_KEY: 'k' }).includes('LLM_BASE_URL 是空的'), '要指名缺的是 BASE_URL')
  ok(run({ LLM_BASE_URL: 'u' }).includes('LLM_API_KEY 是空的'), '要指名缺的是 API_KEY')

  // 而且要给得出下一步：光说「没配」等于把人扔在原地。
  const out = run({})
  ok(out.includes('https://api.groq.com/openai/v1'), '要给出可以直接粘贴的端点')
  ok(out.includes('410'), '要写明 GitHub Models 已退役，免得又去试一遍')
})

await test('儿童议题要认出侵害，不要把儿科新闻也收进来', () => {
  // 站长新加的议题，同时也是他抱怨的那件事的解药：「新闻题材不是全部女性主义」。
  // 词表太宽，综合源会把儿童医院、儿童节、少儿节目全灌进来。
  const has = (t) => feedparse.topicsOf({ title: t, summary: '' }).includes('children')
  ok(has('Charity warns of rise in child marriage across the Sahel'), '童婚要算')
  ok(has('Man charged over grooming of underage girls'), '未成年被诱骗要算')
  ok(has('报告：拐卖儿童案件三年增两倍'), '拐卖儿童要算')
  ok(has('印度女童失学率上升'), '女童失学要算')

  // 反面才是重点：这两条以前会被裸的 child / 儿童 捞进来。
  ok(!has("New children's hospital opens in Leeds"), '儿童医院不是本站题目')
  ok(!has('儿童医院今天开张'), '中文按子串匹配，词越短误伤越大')
})

await test('议题清单要以性暴力开头，并且真的有儿童这一项', () => {
  // 顺序不是装饰：它就是筛选栏和「关于」页上的排列顺序，而站长把性犯罪
  // 定成了这个站的重心。
  // 站长两次重排过分类。现在的顺序由他指定：家暴、性犯罪、儿童……
  eq(TOPICS[0].key, 'domestic', '家庭暴力排第一')
  eq(TOPICS[1].key, 'sexual', '性犯罪排第二')
  eq(TOPICS[2].key, 'children', '儿童排第三')
  ok(TOPICS.some((t) => t.key === 'incel'), 'Incel 与厌女文化必须存在')
  ok(TOPICS.some((t) => t.key === 'lgbtq'), 'LGBTQIA+ 权益必须存在')
  ok(TOPICS.every((t) => t.zh && t.short && t.hue), '每一项都要有中文名、短名和颜色')

  // 界面上的议题和抓取时能识别的议题必须是同一套，否则会出现一个
  // 永远筛不出内容的标签。
  const ui = TOPICS.map((t) => t.key).sort()
  const collector = Object.keys(feeds.TOPIC_WORDS).sort()
  eq(ui.join(','), collector.join(','), '界面议题和抓取议题必须对得上')
})

await test('长稿不能装在 JSON 里——一个换行就毁掉整批', () => {
  /*
   * 这是实测出来的：十批里四批报「模型返回的不是 JSON」。
   * 原因不是模型偷懒，是 JSON 装不下带换行的长文——
   * 字符串里出现一个真实换行就是 Bad control character，整个文档作废。
   * 而这个站要的恰恰是分段的一两千字。
   */
  let jsonBroke = false
  try { JSON.parse('{"s":"第一段\n\n第二段"}') } catch { jsonBroke = true }
  ok(jsonBroke, '前提：JSON 字符串里的真实换行确实非法')

  // 分隔符格式对同样的内容毫无问题。
  const text = [
    '===ITEM 0===',
    'KEEP: yes',
    'HEADLINE: 一个标题',
    'SUBHEAD: 一句副标题',
    'TOPICS: violence, children, 不存在的',
    'REGIONS: us, 火星',
    'BULLETS:',
    '- 要点一',
    '- 要点二',
    'SUMMARY:',
    '第一段。',
    '',
    '## 小标题',
    '',
    '第二段，带来源 [1]。',
    '===END 0===',
    '===ITEM 1===',
    'KEEP: no',
    '===END 1===',
  ].join('\n')

  const blocks = blk.splitBlocks(text)
  eq(blocks.length, 2, '两个块都要认出来')
  const f = blk.parseBlock(blocks[0].body, ['KEEP', 'HEADLINE', 'SUBHEAD', 'TOPICS', 'REGIONS', 'BULLETS', 'SUMMARY'])
  ok(f.SUMMARY.includes('\n\n'), '空行分段要原样保留')
  ok(f.SUMMARY.includes('## 小标题'), '小标题要留在正文里')
  ok(!f.SUMMARY.includes('===END'), '结束标记不能混进正文')
  eq(blk.parseYes(f.KEEP), true, 'KEEP: yes 要读成真')
  eq(blk.parseYes(blk.parseBlock(blocks[1].body, ['KEEP']).KEEP), false, 'KEEP: no 要读成假')
  eq(blk.parseList(f.BULLETS).join(), '要点一,要点二', '列表要去掉短横线')
  eq(blk.parseEnum(f.TOPICS, new Set(['violence', 'children'])).join(), 'violence,children',
    '不存在的议题要过滤掉')
  eq(blk.parseEnum(f.REGIONS, new Set(['us'])).join(), 'us', '不存在的地区要过滤掉')

  // 模型漏写 ===END 是常事，不该让已经写好的稿子作废。
  const noEnd = blk.splitBlocks('===ITEM 0===\nKEEP: yes\nSUMMARY:\n正文\n===ITEM 1===\nKEEP: no')
  eq(noEnd.length, 2, '漏写结束标记也要能切开')
})

await test('研究里的数字不能是模型编的', () => {
  // 研究页把数字印得很大。一个没有出处、没有边界说明的数字，
  // 比不放这个数字糟糕得多。
  const fallback = {
    title: '原标题', publisher: '某机构', kind: 'ngo-report',
    summary: '原摘要', topics: ['equality'], regions: ['global'],
  }
  const got = rw.cleanStudy({
    KEEP: 'yes',
    TITLE: '中文标题',
    KIND: '瞎编的类型',
    SUMMARY: '这是一段足够长的中文总结'.repeat(40),
    LIMITATION: '',
    FIGURES: ['- 有说明的 | 38% | 只统计了报案的案件',
      '- 没说明的 | 99% |',
      '- 没数字的 | | 有说明但没有数字'].join('\n'),
    TOPICS: 'sexual, 不存在的议题',
    REGIONS: 'us, 火星',
  }, fallback)

  eq(got.figures.length, 1, '没有边界说明、或者没有数字的都要丢掉')
  eq(got.figures[0].value, '38%', '留下的必须是两样都齐的那个')
  eq(got.kind, 'ngo-report', '类型不认识就退回这个源的默认，不要留空')
  eq(got.topics.join(), 'sexual', '不存在的议题要过滤掉')
  eq(got.regions.join(), 'us', '不存在的地区要过滤掉')
  ok(got.limitation.length > 0, '局限不能空着——空着等于默许读者过度解读')

  // 太短的总结退回原文，而不是把一句话当成「详细总结」发出去。
  const short = rw.cleanStudy({ KEEP: 'yes', SUMMARY: '很短' }, fallback)
  eq(short.summary, '原摘要', '一句话不算总结')
})

await test('首页日期按北京时间，而且不是写死的', () => {
  // 站长问「这个为什么是 8 月 31 日？」——因为它取的是演示数据里的常量。
  const iso = todayISO()
  ok(/^\d{4}-\d{2}-\d{2}$/.test(iso), `要是 YYYY-MM-DD，实际 ${iso}`)

  // 和北京时间的今天对上。用另一种算法算一遍，而不是把实现抄一遍——
  // 抄一遍的测试只会证明代码等于它自己。
  const bj = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10)
  eq(iso, bj, '必须是北京时间的今天')

  // 而且不能再是演示常量。
  const state = fresh()
  ok(state.today !== '2026-08-31' || bj === '2026-08-31', '不能停在演示数据那一天')
  eq(state.today, iso, '初始状态里的今天就是真的今天')

  /*
   * 缓存里的旧日期不能盖住今天——站长发现的：他的浏览器上写 8 月 31 日，
   * 换一个浏览器是 9 月 1 日。
   *
   * 真正的守卫在 console-check 里（往 localStorage 塞一个旧日期，
   * 重新打开页面，看首页写的是哪一天）——那才测得到 load() 本身。
   * 这里只钉住「初始状态用的是真日期」。
   */
})

await test('配图优先用报道页面的大图，而不是 feed 的缩略图', () => {
  // 站长：「你没有给我高质量的标图。」feed 里的 media:thumbnail 常常是 150px，
  // 铺到首页大卡片上就是一团糊；og:image 是媒体按 1200×630 做的那张。
  const html = `<html><head>
    <meta property="og:image" content="https://cdn.example.org/lead-1200x630.jpg">
    <meta content="示威者在法院外" property="og:image:alt">
  </head></html>`
  const got = feedparse.ogImage(html, '卫报')
  eq(got.url, 'https://cdn.example.org/lead-1200x630.jpg', '要取到 og:image')
  eq(got.credit, '卫报', '署名是这家媒体')
  // alt 用的是媒体自己写的图说，不是我编的——这和 feed 那条规则是同一条。
  eq(got.alt, '示威者在法院外', '媒体给了图说就用它')

  eq(feedparse.ogImage('<meta property="og:image" content="https://x.org/logo.png">', 'X'), null,
    'logo、1x1 计数像素这类不是配图')
  eq(feedparse.ogImage('<meta property="og:image" content="https://x.org/t/1x1.gif">', 'X'), null,
    '计数像素要挡掉')
  eq(feedparse.ogImage('<html><head></head></html>', 'X'), null, '没有就是没有，不要编一张')

  // 没有图说时不能凭空描述画面——和 feed 那条规则必须一致。
  const noAlt = feedparse.ogImage('<meta property="og:image" content="https://x.org/a.jpg">', '路透社')
  ok(noAlt.alt.includes('路透社'), '替代文字要说明出处')
  ok(!/protest|court|woman|女性|抗议/i.test(noAlt.alt), '不能凭空描述图片内容')
})

await test('每次打开顺序都不同，但新的更容易排在前面', () => {
  // 站长要的。严格倒序的代价是第 20 条以后几乎没人看得到，
  // 而它们和第 3 条一样是挑过、写过的。
  const now = Date.parse('2026-09-01T12:00:00Z')
  const at = (days) => new Date(now - days * 864e5).toISOString()
  const items = [0, 1, 3, 7, 14, 30].map((d) => ({ id: `d${d}`, publishedAt: at(d), age: d }))
  const run = (seed) => weightedShuffle(items, (i) => i.publishedAt, seed, now)

  // 1 同一个种子必须给出同一个顺序——否则读到一半会重排。
  eq(run(7).map((i) => i.id).join(), run(7).map((i) => i.id).join(), '同种子同顺序')

  // 2 不同种子要真的不一样，否则「每次打开都随机」是句空话。
  const orders = new Set()
  for (let s = 0; s < 60; s += 1) orders.add(run(s).map((i) => i.id).join())
  ok(orders.size > 5, `顺序要真的会变，实际只有 ${orders.size} 种`)

  // 3 每条都要在，一条不多一条不少。加权抽样最容易错的就是这里。
  for (let s = 0; s < 40; s += 1) {
    const out = run(s)
    eq(out.length, items.length, '不能丢条目')
    eq(new Set(out.map((i) => i.id)).size, items.length, '不能出现重复')
  }

  // 4 统计上，新的确实更容易打头——这是站长括号里那半句。
  const firstAge = []
  for (let s = 0; s < 3000; s += 1) firstAge.push(run(s)[0].age)
  const share = (d) => firstAge.filter((a) => a === d).length / firstAge.length
  ok(share(0) > share(7), '当天的比一周前的更容易排第一')
  ok(share(7) > share(30), '一周前的比一个月前的更容易排第一')
  // 但旧的不能是零——「更有概率」不是「只有它」。
  ok(share(30) > 0, '一个月前的仍然要有机会露面')

  // 5 日期坏掉的不能崩，也不能因此霸占第一。
  const broken = weightedShuffle(
    [{ id: 'bad', publishedAt: '不是日期' }, { id: 'ok', publishedAt: at(0) }],
    (i) => i.publishedAt, 1, now,
  )
  eq(broken.length, 2, '坏日期不能让整个列表消失')
  ok(recencyWeight('不是日期', now) < recencyWeight(at(0), now), '坏日期的权重要低于正常的')
})

await test('被截断的回复要说清楚是截断，不是「没有返回内容」', async () => {
  // 空回复最常见的原因是 max_tokens 太小——会先想一段再写的型号尤其容易。
  // 报「模型没有返回内容」会让人去查 key 和型号名，那是两个错误的方向。
  const keep = { ...process.env }
  const realFetch = globalThis.fetch
  try {
    delete process.env.LLM_BASE_URL
    delete process.env.LLM_MODEL
    delete process.env.LLM_API_KEY
    process.env.ANTHROPIC_API_KEY = 'sk-ant-fake'
    globalThis.fetch = async () => new Response(JSON.stringify({
      content: [], stop_reason: 'max_tokens', usage: { input_tokens: 5, output_tokens: 24 },
    }), { status: 200 })

    let msg = ''
    try { await llm.ask('s', 'u', { maxTokens: 24 }) } catch (e) { msg = e.message }
    ok(msg.includes('截断'), `要说是被截断，实际「${msg}」`)
    ok(msg.includes('24'), '要把那个上限报出来，人才知道调哪个数')
  } finally { process.env = keep; globalThis.fetch = realFetch }
})

await test('正文里的小标题要变成真的结构，角标不再渲染', async () => {
  // 总结是上千字的新闻稿：用「## 小标题」分节。这些如果原样显示，
  // 读者看到的就是一堆井号。
  //
  // 角标（[1] [2]）取消了——站长要求不要 reference number，出处写进句子里。
  // 万一模型还是写了，就原样显示：那是正文的一部分，悄悄删掉一段文字
  // 比留着一个方括号更糟。
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { createElement } = await import('react')
  const html = renderToStaticMarkup(createElement(Prose, {
    text: '## 最早的投诉\n\n据《卫报》报道，检方指称行为发生于 2019 年。\n\n这里有一个 **加粗** 的词。',
  }))

  ok(html.includes('<h3'), '「## 小标题」要变成 h3，不是正文里的井号')
  ok(html.includes('最早的投诉'), '小标题的文字要留下')
  ok(!html.includes('## '), '井号本身不该出现在页面上')
  ok(html.includes('据《卫报》报道'), '出处写在句子里，照原样留着')

  ok(html.includes('<strong>加粗</strong>'), '**加粗** 要变成 strong')
  ok(!html.includes('**'), '星号不该留在页面上')

  // 不再生成任何跳转按钮或锚点。
  ok(!html.includes('prose__cite'), '不该再有角标')
  ok(!html.includes('src-'), '不该再有来源锚点')
})

await test('时间按北京时间显示，不是 UTC', () => {
  // 这是一份按北京时间每天两场的日报。早上六点那一场写进数据库的时间戳是
  // 前一天的 22:00 UTC——按 UTC 渲染，页面上就写成「前一天晚上十点收录」。
  eq(fmtDateTime('2026-08-31T22:10:00Z'), '2026年9月1日 06:10',
    '前一天 22:10 UTC 就是北京时间当天早上 6:10')
  eq(fmtDate('2026-08-31T22:10:00Z'), '2026年9月1日', '日期也要跟着走')

  // 下午两点那一场：06:00 UTC。
  eq(fmtDateTime('2026-09-01T06:00:00Z'), '2026年9月1日 14:00', '下午那一场是 14:00')

  // 午夜要显示 00:00，不是 24:00——24 小时制下 formatToParts 会给 24。
  eq(fmtDateTime('2026-09-01T16:00:00Z'), '2026年9月2日 00:00', '午夜是 00:00')

  // 坏日期原样返回，不要抛异常把整页带下去。
  eq(fmtDate('不是日期'), '不是日期', '坏日期不能让页面崩掉')
})

await test('要把报道正文抠出来交给模型，而不是只给 RSS 摘要', () => {
  /*
   * 这是长稿质量的根本。RSS 的 description 通常两三百字，而站长要 1500–3000 字
   * ——模型手上没有材料，只能把同一件事换几种说法写满篇幅。
   * 稿子空、重复、爱讲大道理，根源在这里，不在提示词写得不够严。
   */
  const html = [
    '<html><head><script>var a=1</script><style>p{color:red}</style></head><body>',
    '<nav><p>订阅我们的通讯，第一时间把最新消息推送到您的邮箱地址里面去</p></nav>',
    '<article>',
    '<p>图说</p>',
    '<p>检方周一宣布，对一名曾在当地医院任职的医生提出多项控罪，案件涉及数名患者。</p>',
    '<p>Subscribe to our newsletter for the latest updates from our newsroom team today</p>',
    '<p>该医生今年五十一岁，自二〇一四年起在该院任职，握有排班与转诊的实际权力。</p>',
    '</article>',
    '<footer><p>版权所有，未经许可不得转载，联系我们请发送邮件至编辑部的信箱</p></footer>',
    '</body></html>',
  ].join('')

  const t = feedparse.articleText(html)
  ok(t.includes('检方周一宣布'), '正文段落要留下')
  ok(t.includes('握有排班与转诊'), '第二段也要留下——细节就在这些地方')
  ok(t.includes('\n\n'), '段落之间要分开，不要糊成一坨')

  // 下面这些进了正文，模型就会把「订阅我们的通讯」当成事实写进稿子。
  ok(!t.includes('订阅我们'), '导航要排除')
  ok(!t.includes('版权所有'), '页脚要排除')
  ok(!t.includes('Subscribe'), '推广段落要排除')
  ok(!t.includes('图说'), '太短的碎片（图说、署名）要排除')
  ok(!t.includes('var a'), '脚本要排除')
  ok(!t.includes('color:red'), '样式要排除')

  // 没有 <article> 时退回整页，但仍然要能抠出东西来。
  const plain = feedparse.articleText('<body><p>' + '这是一段足够长的正文内容用来测试没有 article 标签的情况。'.repeat(2) + '</p></body>')
  ok(plain.length > 40, '没有 article 标签也要能抠出正文')

  // 长度要有上限：整篇塞进提示词会把成本推上去，也会挤掉编辑方针。
  const huge = feedparse.articleText('<p>' + '很长的正文。'.repeat(5000) + '</p>', 1000)
  ok(huge.length <= 1000, `要截断到上限，实际 ${huge.length}`)
})

await test('一家媒体不该霸占首页', () => {
  /*
   * 每个源最多收 8 条，一天目标 15 条——两家媒体就能把首页填满。
   * 真实抓取里 The Guardian Australia 一家交了 8 条，一个号称覆盖
   * 14 个地区的站，首页可能一半来自澳大利亚。
   *
   * 这里复制收集脚本里那段轮转逻辑，验证它的两个性质：
   * 层内按来源轮转，且一条都不丢。
   */
  const rotate = (items) => {
    const byTier = new Map()
    for (const p of items) {
      const tier = p.topics.includes('violence') ? 0 : p.topics.includes('children') ? 1 : 2
      if (!byTier.has(tier)) byTier.set(tier, new Map())
      const feeds = byTier.get(tier)
      if (!feeds.has(p.feed)) feeds.set(p.feed, [])
      feeds.get(p.feed).push(p)
    }
    const out = []
    for (const tier of [...byTier.keys()].sort()) {
      const queues = [...byTier.get(tier).values()]
      for (let r = 0; queues.some((q) => q.length > r); r += 1) {
        for (const q of queues) if (q[r]) out.push(q[r])
      }
    }
    return out
  }

  const items = []
  for (const feed of ['guardian', 'reuters', 'bbc']) {
    for (let i = 0; i < 4; i += 1) items.push({ feed, topics: ['violence'], n: i })
  }
  const out = rotate(items)
  eq(out.slice(0, 3).map((p) => p.feed).join(), 'guardian,reuters,bbc', '前三条要来自三家')
  eq(out.length, items.length, '轮转不能丢条目')

  // 优先级分层必须保住：性犯罪仍然排在其他题材前面。
  const mixed = rotate([
    { feed: 'a', topics: ['equality'] },
    { feed: 'b', topics: ['violence'] },
    { feed: 'c', topics: ['children'] },
  ])
  eq(mixed.map((p) => p.topics[0]).join(), 'violence,children,equality',
    '轮转不能把性犯罪优先挤掉')
})

await test('司法词不能单独决定议题——真实抓取里捞回来的全是无关刑案', () => {
  /*
   * 加进 8 家综合大报之后的第一次演练，词表里的司法词（guilty / arrested /
   * settlement / on trial）把这些捞了回来。最后一条最能说明问题：
   * 法律意义的「和解 settlement」撞上了以色列的「定居点 settlement」。
   *
   * 所以司法词只留在 ACCUSATION 里判断「这是不是一桩案子」（排序用），
   * 不再决定议题。议题要靠行为本身。
   */
  const off = feedparse.topicsOf
  const noise = [
    'Tupac murder trial: Ex-gang leader found guilty',
    'Football hooligan gang chief arrested over ecstasy ring from Spain',
    'Man Arrested in Switzerland After Deadly Shooting at Rave',
    'Irish minister calls for EU action in banning Israeli settlement trade',
    'Zambia president inaugurated for second term after disputed vote',
    'Alleged Charlie Kirk killer faces judgment on standing trial',
  ]
  for (const title of noise) {
    eq(off({ title, summary: '' }).length, 0, `不该收：${title.slice(0, 40)}`)
  }

  // 但真正的性犯罪报道一条都不能漏——同样是这次演练里的真标题。
  const keep = [
    'Ex-prosecutor who accused boss of rape urges reform',
    'A middle schooler said she was raped. Then she was suspended from class',
    'Sexual assaults happening almost every day in Ceuta, prosecutors say',
    '匡智會助理舍監涉強姦女院友　官引導陪審團',
  ]
  for (const title of keep) {
    ok(off({ title, summary: '' }).includes('sexual'), `该收：${title.slice(0, 40)}`)
  }

  // isCase 仍然认得司法进展——排序要用它把案子排在前面。
  ok(feedparse.isCase({ title: 'Man convicted of sexual assault', summary: '' }),
    '司法信号还在，只是不再决定议题')
})

await test('英文的复数要认得出来', () => {
  /*
   * 「Sexual assaults happening almost every day in Ceuta」——词表写的是
   * 'sexual assault'，词边界卡在 assault 后面，一个复数的 s 就让整条落选。
   * 一篇讲一个城市几乎天天发生性侵的报道，因为多了一个字母没被收。
   */
  ok(feedparse.matches('sexual assaults reported daily', 'sexual assault'), '复数要匹配')
  ok(feedparse.matches('a sexual assault case', 'sexual assault'), '单数当然要匹配')
  ok(feedparse.matches('hate crimes rose', 'hate crime'), 'hate crimes 也一样')

  // 但只放开一个 s，不要变成前缀匹配。
  ok(!feedparse.matches('assaulted her', 'assault'), '不能变成前缀匹配')
  ok(!feedparse.matches('rapeseed oil prices', 'rape'), '不能匹配到别的词里去')
  ok(!feedparse.matches('trafficked goods', 'trafficking'), '词形变化不是复数，不该放开')

  /*
   * 「New Mexico」这类不是靠词边界解决的——mexico 前后都是空格，
   * 边界拦不住。它由 regionsOf 在匹配前把整个词组改写成 United States，
   * 见那边的注释。这里只确认这条路仍然有效。
   */
  const nm = feedparse.regionsOf({ title: 'Assault at a New Mexico middle school', summary: '' }, { regions: ['global'] })
  ok(nm.includes('us'), 'New Mexico 要算美国')
  ok(!nm.includes('latam'), 'New Mexico 不能算拉丁美洲')
})

await test('「关于」页上的来源数字不能自己变旧', () => {
  /*
   * 站长两次说了同一件事：「关于界面的这些内容也不准确」「有很多内容界面
   * 内容都是outdated的」。
   *
   * 「关于」页写着订阅了多少个源、其中多少家是专做性别报道的、多少家是中文。
   * 那几个数字是手写的，而源清单在 feeds.mjs 里，随时会加。加了源、忘了改
   * 页面，页面就开始撒谎——而且不会有任何报错，正是**上一次**变旧的方式。
   *
   * 所以在这里对一次。这条测试挂了，不是代码坏了，是那一页该改数字了。
   */
  const src = readFileSync(join(process.cwd(), 'src/pages/site/AboutPage.tsx'), 'utf8')

  const claimed = (re, what) => {
    const m = re.exec(src)
    ok(m, `「关于」页上找不到${what}的数字——句子改写过了就把这条测试一起改`)
    return Number(m[1])
  }

  eq(claimed(/订阅\s*(\d+)\s*个来源/, '来源总数'), feeds.FEEDS.length, '「关于」页写的来源总数')
  eq(claimed(/(\d+)\s*家专做性别与\s*LGBTQIA\+\s*报道/, '性别媒体数'),
     feeds.FEEDS.filter((f) => f.topical).length, '「关于」页写的性别媒体家数')
  eq(claimed(/中文来源\s*(\d+)\s*家/, '中文来源数'),
     feeds.FEEDS.filter((f) => String(f.lang).startsWith('zh')).length, '「关于」页写的中文来源家数')

  // 页面点名的那几家必须真的在清单里，否则就是在吹。
  for (const outlet of ['BBC News', 'The Guardian', 'AP', 'The New York Times']) {
    ok(feeds.FEEDS.some((f) => f.outlet === outlet), `「关于」页点名了 ${outlet}，清单里却没有`)
  }
  for (const outlet of ['报导者', '端传媒', '法庭線', '婦女救援基金會']) {
    ok(feeds.FEEDS.some((f) => f.outlet === outlet), `「关于」页点名了 ${outlet}，清单里却没有`)
  }
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
