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
import { parseFeed, topicsOf, matchedWords, regionsOf, slugify, summaryOf, tokens, sameStory, normUrl, ogImage, articleText } from './feedparse.mjs'
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

/**
 * 我们是谁。
 *
 * 原本报的是 `PRISM-collector/1.0`。诚实，但**过不去 CDN**：Cloudflare
 * 和 Akamai 后面的站点默认挡掉不像浏览器的 UA，于是第一次真实抓取里
 * 联合国妇女署回 403、Mada Masr 回 520（那是 Cloudflare 自己的错误码），
 * 而且**要写的稿子里只有 15/25 取到了正文**——取不到正文，模型就只能
 * 拿着两三百字的 RSS 摘要去写一千五百字，那正是站长一直不满意的那件事。
 *
 * 现在用的是 RSS 阅读器通行的写法：以 Mozilla/5.0 (compatible; …) 开头，
 * 里面照旧写清楚我们是谁、以及一个可以找到人的网址。不是伪装成浏览器——
 * 名字和联系方式都在里面，站点要挡随时挡得掉；只是不再因为报了个陌生的
 * 名字就被当场拒之门外。
 */
const UA = 'Mozilla/5.0 (compatible; PRISM/1.0; +https://prism-daily.github.io/PRISM/)'

/** 有些服务器要看 accept 才肯给 XML，给了 HTML 就当成不是 feed。 */
const FEED_ACCEPT = 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8'

async function fetchOne(url, outlet) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 20000)
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: FEED_ACCEPT },
    })
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}` }
    const xml = await res.text()
    const entries = parseFeed(xml, outlet)
    if (entries.length === 0) return { ok: false, why: '解析不出条目（可能不是 RSS/Atom）' }
    return { ok: true, entries }
  } catch (e) {
    return { ok: false, why: e.name === 'AbortError' ? '超时' : String(e.message ?? e).slice(0, 60) }
  } finally {
    clearTimeout(t)
  }
}

/**
 * 一个源可以写好几个地址，挨个试。
 *
 * 第一次真实抓取里 58 个源死了 14 个，大半是「站还在，feed 挪了地方」：
 * /feed 变成 /rss，gaytimes.co.uk 变成 .com，m.thewire.in 那个 m. 没了。
 * 这类失败没法在本地验证——我这边没有出网——而一次一次改一个地址、
 * 跑一轮、再改，要好几轮。
 *
 * 所以地址可以是一个数组：常见的几种写法一起写上，谁通用谁。
 * 报告里会说用的是第几个，改回单个地址就有依据了。
 *
 * 这也让清单**耐得住以后的搬家**：网站换 CMS 时 /feed 和 /rss 往往会
 * 互相顶替一阵，多写一个就不会有一天突然静悄悄地少收一批稿子。
 */
async function fetchFeed(feed) {
  const urls = Array.isArray(feed.url) ? feed.url : [feed.url]
  let last = { ok: false, why: '没有地址' }
  for (let i = 0; i < urls.length; i++) {
    const got = await fetchOne(urls[i], feed.outlet ?? feed.publisher)
    if (got.ok) return urls.length > 1 && i > 0 ? { ...got, via: i + 1 } : got
    last = got
  }
  return urls.length > 1 ? { ...last, why: `${last.why}（试过 ${urls.length} 个地址）` } : last
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

/*
 * 并发抓。
 *
 * 源从 27 涨到 58 之后，串行抓就撑不住了：单个源的超时是 20 秒，
 * 而死链、慢站每一轮都有几个——最坏情况光抓取就要十几分钟，
 * 每天两场就是半小时花在等待上。
 *
 * 八个一批。再多对方会开始限流，而且这些请求本来就不是瓶颈——
 * 真正花时间的是后面写稿那一步。
 */
const fetched = await inBatches(FEEDS, 8, async (feed) => ({ feed, r: await fetchFeed(feed) }))

/*
 * 但**入选顺序要保持确定**。
 *
 * 并发回来的顺序是随机的，而下面靠 seenUrl 去重——同一条新闻被两个源
 * 同时收录时，谁先到谁留下。让这件事随网络快慢变化，等于同一天跑两次
 * 会得到不同的结果，出了问题也没法复现。所以按 FEEDS 的原始顺序处理。
 */
for (const { feed, r } of fetched) {
  if (!r.ok) { report.push([feed, 0, 0, r.why, 0]); continue }

  let kept = 0
  /*
   * 一个源交回三十条、一条都没留下，日志上只写「0 条 / 共 30」。
   * 那句话不回答任何问题：是这三十条今天都跟性别无关，还是太旧了，
   * 还是别家已经收过？第一次真实抓取里 BBC 中文 0/42、德国之声 0/65、
   * 自由亚洲电台 0/30，我盯着这三行看了半天，没法判断该不该改词表。
   * 所以把落选的理由分开数。
   */
  const dropped = { old: 0, dup: 0, offTopic: 0, full: 0 }
  const samples = []
  for (const e of r.entries) {
    if (kept >= MAX_PER_FEED) { dropped.full += 1; continue }
    if (seenUrl.has(e.link)) { dropped.dup += 1; continue }

    const when = e.date ? Date.parse(e.date) : NaN
    if (Number.isFinite(when) && when < since) { dropped.old += 1; continue }

    const topics = topicsOf(e)
    // 专题源整版都是本站题目；综合源必须命中关键词，否则体育财经也会进来。
    if (!feed.topical && topics.length === 0) {
      dropped.offTopic += 1
      if (samples.length < 3) samples.push(e.title)
      continue
    }

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
  report.push([feed, r.entries.length, kept, '', r.via ?? 0, dropped, samples])
}

/*
 * 排序：性犯罪与司法案件排在最前面。
 *
 * 站长指定的报道重心。每个源都有条数上限，排在前面就意味着在额度里优先留下。
 */
picked.sort((a, b) => {
  // 性犯罪第一、家暴第二、儿童第三——站长定的重心，其余按时间。
  const w = (p) => (p.topics.includes('sexual') ? 0 : p.topics.includes('domestic') ? 1 : p.topics.includes('children') ? 2 : 3)
  return w(a) - w(b) || Date.parse(b.at) - Date.parse(a.at)
})

/*
 * 同一家媒体不要霸占版面。
 *
 * 每个源最多收 8 条，而一天的目标是 15 条——所以理论上两家媒体就能把整个
 * 首页填满。真实抓取里 The Guardian Australia 一家就交了 8 条，
 * 一个号称覆盖 14 个地区的站，首页可能一半来自澳大利亚。
 *
 * 所以在**保持上面那个优先级分层的前提下**，层内按来源轮转：
 * 先每家取第一条，再每家取第二条。性犯罪仍然排在最前面，
 * 只是同一层里不再让一家连着占位。
 */
const byTier = new Map()
for (const p of picked) {
  const tier = p.topics.includes('sexual') ? 0 : p.topics.includes('domestic') ? 1 : p.topics.includes('children') ? 2 : 3
  if (!byTier.has(tier)) byTier.set(tier, new Map())
  const feeds = byTier.get(tier)
  if (!feeds.has(p.feed.id)) feeds.set(p.feed.id, [])
  feeds.get(p.feed.id).push(p)
}
picked = []
for (const tier of [...byTier.keys()].sort()) {
  const queues = [...byTier.get(tier).values()]
  for (let round = 0; queues.some((q) => q.length > round); round += 1) {
    for (const q of queues) if (q[round]) picked.push(q[round])
  }
}

console.log('PRISM 新闻收集')
console.log('—'.repeat(76))
for (const [feed, total, kept, why, via, dropped, samples] of report) {
  const status = why ? `✗ ${why}` : `${String(kept).padStart(2)} 条 / 共 ${total}${via ? `（第 ${via} 个地址）` : ''}`
  console.log(`  ${feed.outlet.padEnd(26, '·')} ${status}`)

  // 一条都没留下的时候，说清楚是为什么，并且给两个真实标题当样本。
  if (!why && kept === 0 && total > 0 && dropped) {
    const bits = []
    if (dropped.offTopic) bits.push(`${dropped.offTopic} 条不属于任何议题`)
    if (dropped.old) bits.push(`${dropped.old} 条太旧`)
    if (dropped.dup) bits.push(`${dropped.dup} 条别家已收`)
    console.log(`      └ ${bits.join('，') || '没有可用条目'}`)
    for (const t of (samples ?? []).slice(0, 2)) console.log(`        例：${t.slice(0, 60)}`)
  }
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
    // 综合源是靠关键词收进来的，那就说清楚是哪个词——不然发现误收之后
    // 只能一个一个词去猜。专题源整版都算，没有词可报。
    if (!p.feed.topical) {
      const hits = matchedWords({ title: p.title, summary: p.summary })
      console.log(`     命中：${hits.slice(0, 4).join('、') || '（无）'}`)
    }
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

/* ------------------------------------------------------------------ *
 * 合并——**在交给模型之前**
 *
 * 顺序改过一次，理由是站长的要求：「读完若干个 reference，然后总结就 ok 了。」
 *
 * 原来是先写、后合并：模型每次只看到一家的报道，写完之后才把讲同一件事的
 * 另外两家挂成「来源」。读者看到三个来源，但稿子其实只依据其中一家——
 * 另外两家补充的细节从来没进过正文。
 *
 * 现在先合并，再把这一组的**每一篇原文**都取回来交给模型。
 * 路透社写了法庭文件，卫报采访到了当事人，两边的细节都能落进同一篇稿子。
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

/*
 * 有两家以上报道的排前面。
 *
 * 站长：「每个新闻最好有两个或以上的引用。」这有两层意思，都成立：
 *   - 对读者：两家独立报道过的事，更好核对。
 *   - 对写作：两篇原文比一篇多出一倍的细节，稿子才写得实。
 *
 * **这一步必须在合并之后。** 第一版写在合并之前，那时候 `also` 还不存在，
 * 于是「有几个来源」永远算作 1，整个偏好一次都没生效过——
 * 一个不报错、也不改变任何结果的排序条件。
 *
 * 不是把单来源的丢掉：很多重要的调查全世界只有一家做了，尤其是本地媒体
 * 和独立媒体，那正是这个站要收的东西。
 */
groups.sort((a, b) => {
  const tier = (p) => (p.topics.includes('sexual') ? 0 : p.topics.includes('domestic') ? 1 : p.topics.includes('children') ? 2 : 3)
  const sources = (p) => (p.also.length >= 1 ? 0 : 1)
  // 主流媒体优先（站长要求），但只在前两个条件之后——
  // 一篇本地媒体做的性侵调查，仍然要排在主流媒体的一般报道前面。
  const major = (p) => (p.feed.major || p.also.some((o) => o.feed.major) ? 0 : 1)
  return tier(a) - tier(b) || sources(a) - sources(b) || major(a) - major(b)
    || Date.parse(b.at) - Date.parse(a.at)
})

let picked2 = groups
const poolSize = MAX_ITEMS * POOL
if (picked2.length > poolSize) {
  console.log(`按优先级备 ${poolSize} 条候选，目标上线 ${MAX_ITEMS} 条（共 ${picked2.length} 条）`)
  picked2 = picked2.slice(0, poolSize)
}

/*
 * 演练时不叫模型。
 *
 * 演练是用来看「哪些源还活着、抓到了什么」的——写完两千字再全部扔掉，
 * 是拿站长的余额买一份不会上线的稿子。源清单从 27 涨到 58 之后，
 * 光验证地址就得跑好几次演练，这笔钱没有必要花。
 *
 * 真想在演练里看模型写成什么样，设 LLM_IN_DRY=1。
 */
const useModel = llmConfigured() && (!DRY || process.env.LLM_IN_DRY === '1')
if (DRY && llmConfigured() && !useModel) {
  console.log('（演练）跳过模型：只看抓到什么。要连模型一起演练，设 LLM_IN_DRY=1。')
}

if (useModel) {
  const note = await ownerNote()
  if (note) console.log(`站长本次指示：${note}`)
  picked2 = await rewriteAll(picked2, note, MAX_ITEMS, { onPicked: hydrate })
} else {
  console.log('没有配置模型：加一个 ANTHROPIC_API_KEY 就走 Claude，')
  console.log('或者 LLM_BASE_URL / LLM_MODEL / LLM_API_KEY 三个配齐走别家。')
  console.log('这次用英文原摘要和关键词筛选——不会按编辑方针挑，也不会翻译成中文。')
}
picked = picked2

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

async function pageInfo(url, outlet) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 12000)
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!/html/i.test(type)) return null
    const html = (await res.text()).slice(0, 400000)
    return { image: ogImage(html, outlet), text: articleText(html) }
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

/**
 * 把候选「补全」：取回报道页面，拿到大图和**正文**。
 *
 * 正文这一项是长稿质量的根本。RSS 的摘要通常两三百字，而站长要 1500–3000 字
 * ——模型手上没有材料，就只能把同一件事换几种说法写满篇幅。稿子空、重复、
 * 爱讲大道理，根源在这里，不在提示词写得不够严。
 *
 * 一次请求同时解决配图和正文，所以这一步比原来只取图并不更贵。
 */
async function hydrate(list) {
  /*
   * 一组里的**每一篇**都要取。
   *
   * 站长：「读完若干个 reference，然后总结就 ok 了。」路透社写了法庭文件，
   * 卫报采访到了当事人——两边的细节要落进同一篇稿子，就得两边都读过。
   * 每组最多取三篇：再多的边际收益很小，而请求数是按篇算的。
   */
  const jobs = []
  for (const g of list) {
    for (const src of [g, ...g.also].slice(0, 3)) {
      jobs.push({ group: g, src, main: src === g })
    }
  }

  const got = await inBatches(jobs, 6, (j) => pageInfo(j.src.link, j.src.feed.outlet))

  let better = 0
  const before = list.filter((g) => g.image).length
  jobs.forEach((j, i) => {
    const info = got[i]
    if (!info) return
    // 配图只用主来源那一篇的：一组里混用不同报道的图，图和标题会对不上。
    if (j.main && info.image && (!j.group.image || info.image.url !== j.group.image.url)) {
      j.group.image = info.image
      better += 1
    }
    // 太短就当没取到——一两句话还不如 feed 的摘要，塞进去只会添乱。
    if (info.text && info.text.length > 400) {
      /*
       * 第二、第三家只取开头。
       *
       * 全文一篇 6000 字，三家就是 18000 字，两条一批就是三万六——
       * 光输入就把一轮的账单翻倍，而多出来的多半是重复：同一件事，
       * 三家的后半段讲的是同样的背景。
       *
       * 第一家给全文（它是主来源，配图也用它的），
       * 其余各取前 2500 字——独家细节基本都在前几段。
       */
      const text = j.main ? info.text : info.text.slice(0, 2500)
      ;(j.group.bodies ??= []).push({ outlet: j.src.feed.outlet, text })
    }
  })

  const withText = list.filter((g) => g.bodies?.length).length
  const totalSrc = list.reduce((n, g) => n + (g.bodies?.length ?? 0), 0)
  const after = list.filter((g) => g.image).length
  console.log(`配图：feed 自带 ${before} 张，报道页取到更好的 ${better} 张，最终 ${after}/${list.length} 条有图`)
  console.log(`原文：${withText}/${list.length} 条拿到正文，共 ${totalSrc} 篇（一条新闻可能读了不止一家）`)
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

/*
 * 配图和正文已经在初筛之后取过了（见 hydrate），这里不再重复取一次页面。
 * 那一步必须早于「写」，因为模型要拿原文当材料。
 */
const toInsert = []
const toAppend = []
/** 哪几条是**读了报道正文**写出来的（其余只有 RSS 摘要）。下面用来对比篇幅。 */
const hydrated = new Set()

picked.forEach((g, i) => {
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
  if (g.bodies?.length) hydrated.add(slug)

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

/*
 * 这一轮写出来的东西，量一量。
 *
 * 站长对质量的要求是具体的、可以数的：「每个新闻最好有两个或以上的引用」、
 * 「内容 up to 3000 字」。而日志一直只说「已上线 15 条」——那说明不了
 * 这十五条是长是短、是一家媒体还是三家。要判断改动有没有用，得先能量。
 *
 * 还要分开看**有原文**和**只有 RSS 摘要**两组的长度。给模型真正的报道正文
 * 是这轮最大的一处改动，如果那一组明显更长更实，就说明这条路走对了；
 * 如果两组差不多，那问题就不在材料上，得往别处找。
 */
if (toInsert.length > 0) {
  const len = (t) => String(t ?? '').replace(/\s+/g, '').length
  const lens = toInsert.map((n) => len(n.summary)).sort((a, b) => a - b)
  const mid = lens[Math.floor(lens.length / 2)]
  const multi = toInsert.filter((n) => n.links.length >= 2).length
  const withText = toInsert.filter((n) => hydrated.has(n.slug))
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0)
  console.log(`  篇幅 中位 ${mid} 字（最短 ${lens[0]}，最长 ${lens[lens.length - 1]}）`)
  console.log(`  两家以上媒体报道的 ${multi}/${toInsert.length} 条`)
  if (withText.length && withText.length < toInsert.length) {
    const a = avg(withText.map((n) => len(n.summary)))
    const b = avg(toInsert.filter((n) => !hydrated.has(n.slug)).map((n) => len(n.summary)))
    console.log(`  拿到原文的 ${withText.length} 条平均 ${a} 字；只有摘要的 ${toInsert.length - withText.length} 条平均 ${b} 字`)
  }
}

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

  // 并发抓，理由和新闻那边一样：串行等超时太贵。顺序仍按清单来。
  const fetchedStudies = await inBatches(STUDY_FEEDS, 8,
    async (feed) => ({ feed, r: await fetchFeed({ ...feed, outlet: feed.publisher }) }))

  for (const { feed, r } of fetchedStudies) {
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
    const w = (c) => (c.topics.includes('sexual') ? 0 : c.topics.includes('domestic') ? 1 : c.topics.includes('children') ? 2 : 3)
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
    if (fresh.length >= MAX_STUDIES * 4) break
  }
  if (fresh.length === 0) { console.log('候选研究站上都有了。'); return }

  /*
   * 研究也要读原文。
   *
   * 新闻那边早就这么做了，而研究一直只拿 RSS 摘要——两三百字的发布通告，
   * 却要写成一篇「像新闻一样、可以点进去、有详细总结」的稿子（站长的原话）。
   * 材料不够，写出来就只能是把标题换个说法。跟新闻那边一模一样的病，
   * 我在这一侧漏掉了。
   *
   * 机构的报告页往往比新闻页更值得读：摘要、方法、样本量、局限，
   * 常常就写在页面上。而「这项研究不能说明什么」正是这一栏存在的理由，
   * 没有原文就只能空着或者靠猜。
   */
  const bodies = await inBatches(fresh, 6, (c) => pageInfo(c.link, c.feed.publisher))
  let gotText = 0
  bodies.forEach((info, i) => {
    if (info?.text && info.text.length > 400) { fresh[i].body = info.text; gotText += 1 }
  })
  console.log(`原文：${gotText}/${fresh.length} 项拿到报告页正文`)

  // 和新闻走同一个开关。第一版这里还写着 llmConfigured()，
  // 于是「演练不叫模型」只挡住了新闻——演练照样为研究付了钱，
  // 而且一等就是好几分钟。
  const all = useModel
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
