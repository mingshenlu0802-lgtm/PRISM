#!/usr/bin/env node
/**
 * PRISM 演示数据检查
 *
 * The site's whole promise is: a short summary you can check yourself, plus
 * the links that let you check it. That promise fails silently if a link is
 * missing, if a demo link looks real, or if a tag points at a region or topic
 * that does not exist. This is a real gate, not decoration.
 *
 *   node scripts/validate-demo.mjs
 */
import { build } from 'esbuild'
import { rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const out = mkdtempSync(join(tmpdir(), 'prism-validate-'))
const bundle = join(out, 'demo.mjs')

await build({
  entryPoints: [join(process.cwd(), 'scripts/_validate-entry.ts')],
  bundle: true, format: 'esm', platform: 'node', target: 'node20',
  outfile: bundle, logLevel: 'silent',
})

const m = await import(pathToFileURL(bundle).href)
const s = m.buildInitialState()
const REGIONS = new Set(m.REGIONS.map((r) => r.key))
const TOPICS = new Set(m.TOPICS.map((t) => t.key))
const PRIORITY = m.PRIORITY_REGIONS

const errors = []
const warnings = []
const err = (msg) => errors.push(msg)
const warn = (msg) => warnings.push(msg)

const PLACEHOLDER = /(^|\.)invalid$/i
const isPlaceholder = (url) => {
  try { return PLACEHOLDER.test(new URL(url).hostname) } catch { return true }
}

/* --------------------------- news --------------------------------- */

const slugs = new Set()
const linkIds = new Set()

for (const n of s.news) {
  const at = `新闻 ${n.id}`

  if (slugs.has(n.slug)) err(`${at}：slug「${n.slug}」重复，两条新闻会抢同一个网址`)
  slugs.add(n.slug)

  if (!n.headline?.trim()) err(`${at}：没有标题`)
  if (!n.summary?.trim()) err(`${at}：没有总结`)

  // The summary IS the article, and it may run long. The only real floor is
  // that the reader must learn something before deciding whether to click.
  const len = [...n.summary].length
  if (len < 60) err(`${at}：总结只有 ${len} 字，短到读者看不出发生了什么`)
  if (len > 6000) err(`${at}：总结 ${len} 字，长到一屏装不下，考虑拆成两条`)
  // 长总结不分段会变成一堵墙。
  if (len > 700 && !/\n/.test(n.summary.trim())) {
    warn(`${at}：${len} 字却没有分段，读起来会像一堵墙（空一行就能分段）`)
  }

  if (n.regions.length === 0) err(`${at}：没有地区标签`)
  if (n.topics.length === 0) err(`${at}：没有议题标签`)
  for (const r of n.regions) if (!REGIONS.has(r)) err(`${at}：地区「${r}」不存在`)
  for (const t of n.topics) if (!TOPICS.has(t)) err(`${at}：议题「${t}」不存在`)

  if (n.links.length === 0) {
    err(`${at}：一条链接都没有——读者没法自己去核对`)
  } else if (n.links.length < 2) {
    warn(`${at}：只有 1 条链接`)
  }

  for (const l of n.links) {
    const lat = `${at} 链接 ${l.id}`
    if (linkIds.has(l.id)) err(`${lat}：链接 id 重复`)
    linkIds.add(l.id)
    if (!l.outlet?.trim()) err(`${lat}：没有媒体名`)
    if (!l.title?.trim()) err(`${lat}：没有标题`)
    if (!l.lang?.trim()) err(`${lat}：没有标语言`)
    try { new URL(l.url) } catch { err(`${lat}：网址格式不对（${l.url}）`) }
    // Demo data must be unmistakably demo: a fake link that looks real is
    // worse than no link at all.
    if (n.demo && !isPlaceholder(l.url)) {
      err(`${lat}：演示条目却用了看起来像真的网址（${l.url}）`)
    }
  }

  if (!['live', 'hidden'].includes(n.status)) err(`${at}：status 不认识（${n.status}）`)
  if (!['auto', 'editor'].includes(n.origin)) err(`${at}：origin 不认识（${n.origin}）`)
  if (Number.isNaN(Date.parse(n.publishedAt))) err(`${at}：发布时间不是合法时间`)
}

// 涉及中国内地的条目，必须至少有一条可以对照的独立来源。只挂官方文件和官方
// 媒体的条目，读者没有任何办法去核对第二种说法。
for (const n of s.news.filter((x) => x.regions.includes('cn'))) {
  const independent = n.links.filter((l) => !l.outletKind)
  if (independent.length === 0) {
    err(`新闻 ${n.id}：涉及中国内地却只有官方来源，读者没有可以对照的独立报道`)
  }
}

// 头条只有一条，而且必须是能看见的那种。
const featured = s.news.filter((n) => n.featured)
if (featured.length > 1) {
  err(`有 ${featured.length} 条同时是头条：${featured.map((n) => n.headline.slice(0, 14)).join('、')}`)
}
if (featured.length === 1 && featured[0].status !== 'live') {
  err(`头条「${featured[0].headline.slice(0, 18)}」是下架状态，读者看不到`)
}

/* -------------------------- studies -------------------------------- */

const studySlugs = new Set()
for (const st of s.studies) {
  const at = `研究 ${st.id}`
  if (studySlugs.has(st.slug)) err(`${at}：slug「${st.slug}」重复`)
  studySlugs.add(st.slug)

  if (!st.title?.trim()) err(`${at}：没有标题`)
  if (!st.summary?.trim()) err(`${at}：没有总结`)
  // A study without its own stated limitation invites over-reading. This is
  // the one field the editor may never leave empty.
  if (!st.limitation?.trim()) err(`${at}：没有写「这份研究说不了什么」`)
  if (st.links.length === 0) err(`${at}：没有链接，读者拿不到原始报告`)

  for (const r of st.regions) if (!REGIONS.has(r)) err(`${at}：地区「${r}」不存在`)
  for (const t of st.topics) if (!TOPICS.has(t)) err(`${at}：议题「${t}」不存在`)

  for (const l of st.links) {
    if (st.demo && !isPlaceholder(l.url)) err(`${at} 链接 ${l.id}：演示条目却用了看起来像真的网址`)
    try { new URL(l.url) } catch { err(`${at} 链接 ${l.id}：网址格式不对`) }
  }
  if (st.datasetUrl) {
    try { new URL(st.datasetUrl) } catch { err(`${at}：数据集网址格式不对`) }
  }
}

/* --------------------------- setup --------------------------------- */

// 发布出去的东西里不能有任何人的邮箱地址。公开站点是最好扒的邮箱来源。
const initial = JSON.stringify(s)
const leak = initial.match(/[\w.+-]+@[\w-]+\.[\w.]+/)
if (leak) err(`初始状态里出现了邮箱地址：${leak[0]}`)
if (s.auth.admins.length > 0) err('管理员名单不该预置——站长登录后才写入这台浏览器')
if (s.github.owner) err(`GitHub 用户名不该写在代码里：${s.github.owner}`)
if (!/^[0-9a-f]{64}$/.test(m.OWNER_HASH)) err('站长身份应当是一串 sha256，不是地址')

for (const r of s.collect.regions) if (!REGIONS.has(r)) err(`搜集设置里的地区「${r}」不存在`)
for (const t of s.collect.topics) if (!TOPICS.has(t)) err(`搜集设置里的议题「${t}」不存在`)
for (const r of PRIORITY) {
  if (!s.collect.regions.includes(r)) warn(`优先地区「${r}」不在默认搜集范围里`)
}

// Coverage: the six regions the owner named should actually have something in
// them, or the front page looks broken on day one.
for (const r of PRIORITY) {
  const n = s.news.filter((x) => x.regions.includes(r)).length
  if (n === 0) warn(`优先地区「${r}」在演示数据里一条新闻都没有`)
}

/* --------------------------- report --------------------------------- */

rmSync(out, { recursive: true, force: true })

const linkCount = s.news.reduce((a, n) => a + n.links.length, 0)
console.log('PRISM 演示数据检查')
console.log('—'.repeat(64))
console.log(`  新闻 ${s.news.length} 条 · 媒体链接 ${linkCount} 条 · 研究与数据 ${s.studies.length} 项`)
console.log(`  头条：${featured[0] ? featured[0].headline.slice(0, 24) : '未指定（首页会用最新的一条）'}`)
console.log(`  覆盖地区 ${new Set(s.news.flatMap((n) => n.regions)).size} 个 · 议题 ${new Set(s.news.flatMap((n) => n.topics)).size} 个`)
console.log('—'.repeat(64))
for (const w of warnings) console.log(`  提醒  ${w}`)
for (const e of errors) console.log(`  错误  ${e}`)
if (!errors.length && !warnings.length) console.log('  没有发现问题')
console.log('—'.repeat(64))
console.log(errors.length ? `${errors.length} 个错误` : '通过')
process.exit(errors.length ? 1 : 0)
