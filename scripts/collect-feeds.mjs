#!/usr/bin/env node
/**
 * 真实新闻收集。
 *
 * 控制端里的「找新闻」是原型：它从一个虚构素材池取材，链接都是 `.invalid`
 * 假域名。这个脚本是真的——它去订阅真实媒体的 RSS，把条目写进数据库。
 *
 * 三条不可让步的规则：
 *
 * 1. **不生成内容。** 标题、摘要、链接、日期全部原样来自媒体自己的 feed。
 *    没有模型参与，也就没有编造的余地。摘要读起来像媒体的口吻，因为它就是。
 * 2. **一律先下架。** 写进去的每一条都是 `status: 'hidden'`。站长在控制端
 *    一条条看过、按「重新上线」，读者才看得到。**没有任何东西会绕过他上线。**
 * 3. **没有链接的不要。** 一条读者没法自己去核对的新闻，对这个网站没有价值。
 *
 * 跑在 GitHub Actions 上（见 .github/workflows/collect.yml），因为静态站没有
 * 后端可以跑定时任务，而 Actions 有完整网络、也有放密钥的地方。
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/collect-feeds.mjs
 *   加 --dry 只看抓到什么，不写数据库。
 */
import { FEEDS } from './feeds.mjs'
import { parseFeed, topicsOf, regionsOf, slugify, summaryOf } from './feedparse.mjs'

const DRY = process.argv.includes('--dry')
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? ''
const MAX_PER_FEED = Number(process.env.MAX_PER_FEED ?? 8)
const DAYS = Number(process.env.WITHIN_DAYS ?? 7)

if (!DRY && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('缺 SUPABASE_URL 或 SUPABASE_SERVICE_KEY。只想看抓到什么就加 --dry。')
  process.exit(2)
}

/* ------------------------------------------------------------------ *
 * 抓
 * ------------------------------------------------------------------ */

async function fetchFeed(feed) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 20000)
  try {
    const res = await fetch(feed.url, {
      signal: ctl.signal,
      headers: { 'user-agent': 'PRISM-collector/1.0 (+https://prism-daily.github.io/PRISM/)' },
    })
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}` }
    const xml = await res.text()
    const entries = parseFeed(xml)
    if (entries.length === 0) return { ok: false, why: '解析不出条目（可能不是 RSS/Atom）' }
    return { ok: true, entries }
  } catch (e) {
    return { ok: false, why: e.name === 'AbortError' ? '超时' : String(e.message ?? e).slice(0, 60) }
  } finally {
    clearTimeout(t)
  }
}

/* ------------------------------------------------------------------ *
 * 写
 * ------------------------------------------------------------------ */

const db = (path, init = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...init,
  headers: {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    'content-type': 'application/json',
    ...(init.headers ?? {}),
  },
})

async function existingLinks() {
  const res = await db('news?select=links,slug')
  if (!res.ok) throw new Error(`读已有条目失败：HTTP ${res.status}`)
  const rows = await res.json()
  const urls = new Set()
  const slugs = new Set()
  for (const r of rows) {
    slugs.add(r.slug)
    for (const l of r.links ?? []) if (l?.url) urls.add(l.url)
  }
  return { urls, slugs }
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */

const since = Date.now() - DAYS * 864e5
const report = []
const picked = []
const seenUrl = new Set()

for (const feed of FEEDS) {
  const r = await fetchFeed(feed)
  if (!r.ok) { report.push([feed, 0, 0, r.why]); continue }

  let kept = 0
  for (const e of r.entries) {
    if (kept >= MAX_PER_FEED) break
    if (seenUrl.has(e.link)) continue

    const when = e.date ? Date.parse(e.date) : NaN
    if (Number.isFinite(when) && when < since) continue

    const topics = topicsOf(e)
    // 专题源整版都是本站题目；综合源必须命中关键词，否则体育财经也会进来。
    if (!feed.topical && topics.length === 0) continue

    seenUrl.add(e.link)
    kept += 1
    picked.push({
      feed,
      title: e.title,
      link: e.link,
      summary: summaryOf(e),
      topics: topics.length ? topics : ['rights'],
      regions: regionsOf(e, feed),
      at: Number.isFinite(when) ? new Date(when).toISOString() : new Date().toISOString(),
    })
  }
  report.push([feed, r.entries.length, kept, ''])
}

console.log('PRISM 新闻收集')
console.log('—'.repeat(76))
for (const [feed, total, kept, why] of report) {
  const status = why ? `✗ ${why}` : `${String(kept).padStart(2)} 条 / 共 ${total}`
  console.log(`  ${feed.outlet.padEnd(26, '·')} ${status}`)
}
console.log('—'.repeat(76))
const dead = report.filter(([, , , why]) => why)
console.log(`${FEEDS.length} 个源，${FEEDS.length - dead.length} 个可用，选出 ${picked.length} 条`)
if (dead.length) console.log(`  ${dead.length} 个源取不到——清单里换掉它们（scripts/feeds.mjs）`)

if (DRY) {
  console.log('—'.repeat(76))
  for (const p of picked.slice(0, 20)) {
    console.log(`  [${p.regions.join(',')}] ${p.title.slice(0, 70)}`)
    console.log(`     ${p.feed.outlet} · ${p.link.slice(0, 90)}`)
  }
  process.exit(dead.length === FEEDS.length ? 1 : 0)
}

const have = await existingLinks()
const fresh = picked.filter((p) => !have.urls.has(p.link))
console.log(`去重后 ${fresh.length} 条是新的`)

if (fresh.length === 0) process.exit(0)

const now = new Date().toISOString()
const rows = fresh.map((p, i) => {
  let slug = slugify(p.title) || `item-${i}`
  while (have.slugs.has(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  have.slugs.add(slug)
  return {
    id: `news-${Date.now().toString(36)}-${i}`,
    slug,
    headline: p.title,
    summary: p.summary,
    bullets: [],
    regions: p.regions,
    topics: p.topics,
    links: [{
      id: `l-${Date.now().toString(36)}-${i}`,
      outlet: p.feed.outlet,
      title: p.title,
      url: p.link,
      lang: p.feed.lang,
      date: p.at.slice(0, 10),
      ...(p.feed.kind ? { kind: p.feed.kind } : {}),
    }],
    image: null,
    // 一律先下架。站长看过才上线——这一行是这个脚本最重要的一行。
    status: 'hidden',
    origin: 'auto',
    featured: false,
    demo: false,
    edited_by_human: false,
    editor_note: null,
    content_notice: null,
    published_at: p.at,
    updated_at: now,
  }
})

const res = await db('news', { method: 'POST', body: JSON.stringify(rows), headers: { prefer: 'return=minimal' } })
if (!res.ok) {
  console.error(`写入失败：HTTP ${res.status} ${(await res.text()).slice(0, 300)}`)
  process.exit(1)
}
console.log(`已写入 ${rows.length} 条，全部是下架状态——去控制端「编辑 → 内容 → 已下架」审核。`)
