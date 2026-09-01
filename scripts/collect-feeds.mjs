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
import { FEEDS, STUDY_FEEDS } from './feeds.mjs'
import { parseFeed, topicsOf, regionsOf, slugify, summaryOf, tokens, sameStory, normUrl, ogImage } from './feedparse.mjs'
import { llmConfigured, spendReport } from './llm.mjs'
import { rewriteAll, rewriteStudies } from './rewrite.mjs'

const DRY = process.argv.includes('--dry')
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? ''
const MAX_PER_FEED = Number(process.env.MAX_PER_FEED ?? 8)
const DAYS = Number(process.env.WITHIN_DAYS ?? 7)
/*
 * 直接上线，不等站长审。
 *
 * 站长的话：「最好省略我的审核部分，前提是你的新闻质量要高不要有任何重复。」
 * 我提过针对个人的指控自动发布的风险，他明确要求去掉那个例外——这是他的网站，
 * 这个决定是他的。所以**没有例外**：抓到就上线。
 *
 * 留下的只是给读者的一句内容提示（见 feedparse.mjs 的 noticeFor），
 * 它不影响任何一条是否发布。AUTO_PUBLISH=0 可以整个关掉自动上线。
 */
const AUTO = process.env.AUTO_PUBLISH !== '0'
/*
 * 每天最多交给模型多少条。
 *
 * 这是**花钱的那个旋钮**。系统提示词（整份编辑方针）每批都要重发一次，
 * 所以成本几乎与「批数」成正比，而不是与抓到多少条成正比。
 * 抓 200 条全喂进去，账单是抓 30 条的七倍，而多出来的多半是勉强及格的。
 *
 * 排序已经把性犯罪与司法案件放在最前，所以砍掉的是尾巴，不是重点。
 * 站长在控制端写「今天要 20 条」时，改的就是这个。
 */
const MAX_ITEMS = Number(process.env.MAX_ITEMS ?? 15)
/*
 * 候选要备多少倍。
 *
 * 第一次真实收集把这件事教明白了：喂 30 条进去，模型按方针丢掉 21 条，
 * 站长拿到 3 条。方针严格是对的，把候选数当目标数是错的。
 *
 * 所以现在喂的是目标的四倍，模型够数就停——丢得多就多跑几批，丢得少就早停省钱。
 * 四倍是按那次的通过率（约 1/8）留的余量，仍然可能不够，不够会如实报出来。
 */
const POOL = Number(process.env.POOL_FACTOR ?? 4)
/*
 * 每天几项研究。站长要的是「30 条新闻，3 个研究」。
 *
 * 研究比新闻贵一点——每项都要模型多写局限和关键数字——但一天只有三项，
 * 一次调用就够，占整轮成本的零头。
 */
const MAX_STUDIES = Number(process.env.MAX_STUDIES ?? 3)

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
    const entries = parseFeed(xml, feed.outlet)
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

/**
 * 这个网站已经提到过这件事了吗。
 *
 * 站长要的：「检索相关新闻有没有被我这个棱镜网站提及过」。
 *
 * 光比链接不够——同一件事被三家媒体各报一次，链接就是三个不同的网址。
 * 所以连标题一起读回来，用 sameStory 比。已经有了的，**把新来源加到那一条上**，
 * 而不是新开一条：这个网站的条目本来就可以挂多个媒体链接，读者反而多了出处。
 */
async function existingItems() {
  const res = await db('news?select=id,slug,headline,links')
  if (!res.ok) throw new Error(`读已有条目失败：HTTP ${res.status}`)
  const rows = await res.json()
  const urls = new Set()
  const slugs = new Set()
  const items = []
  for (const r of rows) {
    slugs.add(r.slug)
    const links = r.links ?? []
    for (const l of links) if (l?.url) urls.add(normUrl(l.url))
    items.push({ id: r.id, headline: r.headline, links, key: tokens(r.headline) })
  }
  return { urls, slugs, items }
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */

const since = Date.now() - DAYS * 864e5
const report = []
let picked = []
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
      image: e.image,
      regions: regionsOf(e, feed),
      at: Number.isFinite(when) ? new Date(when).toISOString() : new Date().toISOString(),
    })
  }
  report.push([feed, r.entries.length, kept, ''])
}

/*
 * 排序：性犯罪与司法案件排在最前面。
 *
 * 站长指定的报道重心。每个源都有条数上限，排在前面就意味着在额度里优先留下。
 */
picked.sort((a, b) => {
  // 性犯罪第一，儿童第二——站长定的两个重心，其余按时间。
  const w = (p) => (p.topics.includes('violence') ? 0 : p.topics.includes('children') ? 1 : 2)
  return w(a) - w(b) || Date.parse(b.at) - Date.parse(a.at)
})

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

/* ------------------------------------------------------------------ *
 * 交给模型：按方针筛选，改写成中文
 *
 * 没配模型就跳过——退回英文摘要 + 关键词筛选。**说出来**，不要让站长
 * 以为方针生效了其实没有。
 * ------------------------------------------------------------------ */

/** 站长在控制端写下的本次指示。存在 site.copy.collectNote 里。 */
async function ownerNote() {
  try {
    const res = await db('site?select=copy&id=eq.site')
    if (!res.ok) return ''
    const rows = await res.json()
    return String(rows?.[0]?.copy?.collectNote ?? '').trim()
  } catch { return '' }
}

const poolSize = MAX_ITEMS * POOL
if (picked.length > poolSize) {
  console.log(`按优先级备 ${poolSize} 条候选，目标上线 ${MAX_ITEMS} 条（共 ${picked.length} 条）`)
  picked = picked.slice(0, poolSize)
}

if (llmConfigured()) {
  const note = await ownerNote()
  if (note) console.log(`站长本次指示：${note}`)
  picked = await rewriteAll(picked, note, MAX_ITEMS)
} else {
  console.log('没有配置模型：加一个 ANTHROPIC_API_KEY 就走 Claude，')
  console.log('或者 LLM_BASE_URL / LLM_MODEL / LLM_API_KEY 三个配齐走别家。')
  console.log('这次用英文原摘要和关键词筛选——不会按编辑方针挑，也不会翻译成中文。')
}

/* ------------------------------------------------------------------ *
 * 合并
 *
 * 先在这一批里把讲同一件事的合成一条（多个来源），再拿去跟数据库里已有的比。
 * ------------------------------------------------------------------ */

const groups = []
for (const p of picked) {
  const key = tokens(p.title)
  const g = groups.find((x) => sameStory(x.key, key))
  if (g) { g.also.push(p); continue }
  groups.push({ ...p, key, also: [] })
}
const merged = groups.reduce((n, g) => n + g.also.length, 0)
if (merged) console.log(`同一批里有 ${merged} 条讲的是别人已经讲过的事，合并成来源`)

/* ------------------------------------------------------------------ *
 * 配图
 *
 * 站长：「你没有给我高质量的标图。」他说得对——feed 里的 media:thumbnail
 * 常常是 150px 的列表缩略图，铺到首页大卡片上就是一团糊。
 *
 * 报道页面自己的 og:image 是同一家媒体为社交平台准备的那张，按 1200×630 做的。
 * 所以对**准备写进站的这几十条**去取一次页面，拿它换掉缩略图。
 *
 * 只对要写进去的取，不对抓到的全部取：三十次请求可以接受，两百次不行。
 * 取不到就用 feed 那张，再取不到就没有图——不去别处找一张「看起来像」的图，
 * 那是给真实事件配一张无关的照片。
 * ------------------------------------------------------------------ */

async function pageImage(url, outlet) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 12000)
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'PRISM-collector/1.0 (+https://prism-daily.github.io/PRISM/)',
        accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!/html/i.test(type)) return null
    // og 标签都在 <head> 里，没必要把整篇文章读进内存。
    const html = (await res.text()).slice(0, 250000)
    return ogImage(html, outlet)
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

/** 小并发地跑一批任务。串行太慢，全并发会被对方限流。 */
async function inBatches(items, size, fn) {
  const out = []
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.all(items.slice(i, i + size).map(fn)))
  }
  return out
}

async function upgradeImages(list) {
  const before = list.filter((g) => g.image).length
  const got = await inBatches(list, 6, (g) => pageImage(g.link, g.feed.outlet))
  let better = 0
  list.forEach((g, i) => {
    if (!got[i]) return
    if (!g.image) { g.image = got[i]; better += 1; return }
    // feed 有图也换掉：og:image 基本总是更大的那张。
    if (got[i].url !== g.image.url) { g.image = got[i]; better += 1 }
  })
  const after = list.filter((g) => g.image).length
  console.log(`配图：feed 自带 ${before} 张，去报道页取到更好的 ${better} 张，最终 ${after}/${list.length} 条有图`)
}

const have = await existingItems()

const linkOf = (p, i, j) => ({
  id: `l-${Date.now().toString(36)}-${i}-${j}`,
  outlet: p.feed.outlet,
  title: p.title,
  url: p.link,
  lang: p.feed.lang,
  date: p.at.slice(0, 10),
  ...(p.feed.kind ? { kind: p.feed.kind } : {}),
})

// 先算出哪些是真要写进去的，只给它们取大图。
const fresh = groups.filter((g) => {
  if (have.items.some((it) => sameStory(it.key, g.key))) return false
  return [g, ...g.also].some((p) => !have.urls.has(normUrl(p.link)))
})
if (fresh.length > 0) await upgradeImages(fresh)

const toInsert = []
const toAppend = []

groups.forEach((g, i) => {
  const sources = [g, ...g.also]
  const links = sources
    .filter((p) => !have.urls.has(normUrl(p.link)))
    .map((p, j) => linkOf(p, i, j))
  if (links.length === 0) return // 每一个来源都已经在站上了

  // 本站提到过这件事吗？提过就把新来源挂上去，不新开一条。
  const seen = have.items.find((it) => sameStory(it.key, g.key))
  if (seen) { toAppend.push({ item: seen, links }); return }

  let slug = slugify(g.title) || `item-${i}`
  while (have.slugs.has(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  have.slugs.add(slug)

  toInsert.push({
    id: `news-${Date.now().toString(36)}-${i}`,
    slug,
    headline: g.headline ?? g.title,
    subhead: g.subhead ?? null,
    summary: g.summary,
    bullets: g.bullets ?? [],
    regions: g.regions,
    topics: g.topics,
    links,
    image: g.image ?? null,
    status: AUTO ? 'live' : 'hidden',
    origin: 'auto',
    featured: false,
    demo: false,
    edited_by_human: false,
    editor_note: null,
    content_notice: null,
    published_at: g.at,
    updated_at: new Date().toISOString(),
  })
})

console.log(`本站没提过的 ${toInsert.length} 条；已提过、补上新来源的 ${toAppend.length} 条`)

for (const { item, links } of toAppend) {
  const res = await db(`news?id=eq.${encodeURIComponent(item.id)}`, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({ links: [...item.links, ...links], updated_at: new Date().toISOString() }),
  })
  if (!res.ok) console.error(`  给「${item.headline.slice(0, 30)}」加来源失败：HTTP ${res.status}`)
}

if (toInsert.length > 0) {
  let res = await db('news', { method: 'POST', body: JSON.stringify(toInsert), headers: { prefer: 'return=minimal' } })

  /*
   * subhead 是新加的一列。已经建过库的人要跑一次
   *   alter table public.news add column if not exists subhead text;
   * （schema.sql 里就有这一句），在他跑之前，PostgREST 会因为这一列不存在而
   * 整批拒绝——那意味着**一整天的新闻全丢**，只因为少一个副标题。
   *
   * 所以认出这种失败，脱掉这一列重发一次，并且把该跑的 SQL 喊出来。
   * 降级要响，不能悄悄发生：不然副标题会「莫名其妙一直不出现」。
   */
  if (!res.ok) {
    const why = await res.text()
    if (/subhead/.test(why)) {
      console.log('数据库还没有 subhead 这一列，这一轮先不带副标题写入。')
      console.log('要让副标题出现，去 Supabase 的 SQL Editor 跑一次：')
      console.log('  alter table public.news add column if not exists subhead text;')
      res = await db('news', {
        method: 'POST',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify(toInsert.map(({ subhead, ...rest }) => rest)),
      })
    } else {
      console.error(`写入失败：HTTP ${res.status} ${why.slice(0, 300)}`)
      process.exit(1)
    }
  }
  if (!res.ok) {
    console.error(`写入失败：HTTP ${res.status} ${(await res.text()).slice(0, 300)}`)
    process.exit(1)
  }
}

console.log(AUTO
  ? `已上线 ${toInsert.length} 条。`
  : `已写入 ${toInsert.length} 条，全部下架状态等你审核。`)

/* ------------------------------------------------------------------ *
 * 研究与数据
 *
 * 站长要的是每天「30 条新闻，3 个研究」。研究单独走一条线，因为它取的是
 * 另一批来源：发布方自己的出版渠道，不是报道它的新闻。
 *
 * 放在新闻**之后**、并且自己吞掉所有异常，是有意的——研究是加分项，
 * 它失败不该让已经写好的三十条新闻一起回滚。
 * ------------------------------------------------------------------ */

async function collectStudies() {
  if (MAX_STUDIES <= 0) return
  const cands = []
  const seen = new Set()
  const rep = []

  for (const feed of STUDY_FEEDS) {
    const r = await fetchFeed({ ...feed, outlet: feed.publisher })
    if (!r.ok) { rep.push([feed, 0, 0, r.why]); continue }
    let kept = 0
    for (const e of r.entries) {
      if (kept >= 3) break
      if (!e.link || seen.has(e.link)) continue
      const when = e.date ? Date.parse(e.date) : NaN
      // 研究比新闻慢：一份报告发布一个月内都还算新。
      if (Number.isFinite(when) && when < Date.now() - 45 * 864e5) continue
      const topics = topicsOf(e)
      if (!feed.topical && topics.length === 0) continue
      seen.add(e.link)
      kept += 1
      cands.push({
        feed,
        title: e.title,
        link: e.link,
        summary: summaryOf(e),
        topics: topics.length ? topics : ['equality'],
        regions: regionsOf(e, feed),
        kind: feed.kind,
        publisher: feed.publisher,
        limitation: '',
        at: Number.isFinite(when) ? new Date(when).toISOString() : new Date().toISOString(),
      })
    }
    rep.push([feed, r.entries.length, kept, ''])
  }

  console.log('')
  console.log('研究与数据')
  console.log('—'.repeat(76))
  for (const [feed, total, kept, why] of rep) {
    console.log(`  ${(feed.publisher + ' '.repeat(22)).slice(0, 22)} ${why ? `✗ ${why}` : `${kept}/${total}`}`)
  }

  if (cands.length === 0) { console.log('这一轮没有找到候选研究。'); return }

  // 重心一致：性暴力与儿童优先，其余按新旧。
  cands.sort((a, b) => {
    const w = (c) => (c.topics.includes('violence') ? 0 : c.topics.includes('children') ? 1 : 2)
    return w(a) - w(b) || Date.parse(b.at) - Date.parse(a.at)
  })

  // 站上已经有的不再来一遍。研究比新闻更容易重复——机构会反复推同一份报告。
  let have = { slugs: new Set(), keys: [], urls: new Set() }
  if (!DRY) {
    const res = await db('studies?select=id,slug,title,links')
    if (res.ok) {
      for (const r of await res.json()) {
        have.slugs.add(r.slug)
        have.keys.push(tokens(r.title))
        for (const l of (r.links ?? [])) if (l?.url) have.urls.add(normUrl(l.url))
      }
    }
  }
  const fresh = []
  for (const c of cands) {
    if (have.urls.has(normUrl(c.link))) continue
    const key = tokens(c.title)
    if (have.keys.some((k) => sameStory(k, key))) continue
    if (fresh.some((f) => sameStory(tokens(f.title), key))) continue
    fresh.push(c)
    // 备到目标的三倍再交给模型——和新闻那边同一个教训：
    // 只备三条，模型按方针丢掉两条，站长就只拿到一条。
    if (fresh.length >= MAX_STUDIES * 3) break
  }
  if (fresh.length === 0) { console.log('候选研究站上都有了。'); return }

  const all = llmConfigured()
    ? await rewriteStudies(fresh, await ownerNote())
    : fresh.map((c) => ({ ...c, limitation: '原报告未说明方法与抽样，这里不代为推断。', figures: [] }))
  const kept = all.slice(0, MAX_STUDIES)
  if (kept.length === 0) { console.log('模型一项都没留下。'); return }

  const rows = kept.map((c, i) => {
    let slug = slugify(c.title) || `study-${i}`
    while (have.slugs.has(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
    have.slugs.add(slug)
    return {
      id: `study-${Date.now().toString(36)}-${i}`,
      slug,
      title: c.title,
      publisher: c.publisher,
      kind: c.kind,
      summary: c.summary,
      limitation: c.limitation,
      figures: c.figures ?? [],
      regions: c.regions,
      topics: c.topics,
      links: [{
        id: `sl-${Date.now().toString(36)}-${i}`,
        outlet: c.publisher,
        title: c.title,
        url: c.link,
        lang: c.feed?.lang ?? 'en',
        date: c.at.slice(0, 10),
        kind: 'official',
      }],
      dataset_url: null,
      status: AUTO ? 'live' : 'hidden',
      origin: 'auto',
      demo: false,
      date: c.at.slice(0, 10),
      updated_at: new Date().toISOString(),
    }
  })

  if (DRY) { console.log(`（演练）会加 ${rows.length} 项研究。`); return }
  const res = await db('studies', { method: 'POST', body: JSON.stringify(rows), headers: { prefer: 'return=minimal' } })
  if (!res.ok) {
    console.error(`写研究失败：HTTP ${res.status} ${(await res.text()).slice(0, 300)}`)
    return
  }
  console.log(`已加 ${rows.length} 项研究。`)
}

try {
  await collectStudies()
} catch (e) {
  // 新闻已经写进去了，研究这一步再怎么坏也不能把整轮标成失败。
  console.log(`研究这一步出错：${String(e.message ?? e).slice(0, 200)}`)
}

// 站长是拿自己的余额在跑。跑完报一次账，别让它悄悄花钱。
const bill = spendReport()
if (bill) {
  console.log('')
  console.log(bill)
}
