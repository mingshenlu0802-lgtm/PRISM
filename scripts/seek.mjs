/**
 * 按题目主动去搜新闻，而不是等 RSS 送上门。
 *
 * **为什么需要这个。** 站长要「20 条关于中国大陆的新闻」，跑下来是 0 条。
 * 日志说得很清楚：80 条候选，初筛留 0 条。指示没问题，问题在供给——
 * 63 个源里只有 4 个覆盖中国内地，其中两个（德国之声、自由亚洲电台）
 * 是综合新闻源，性别题目本来就少；那一轮它们各自贡献 0 条。
 *
 * 这不是那一天运气差，是结构性的：中国内地做性别报道的媒体，
 * 要么没有 RSS，要么在墙内取不到。**只靠订阅，这个站永远补不上内地这一块**，
 * 而内地恰恰是站长排在第一位的地区。
 *
 * 所以加一条搜索优先的路：给定一段题目，让模型联网找出若干条真实报道，
 * 回来的每一条都变成一个和 RSS 条目形状一样的候选，往下走同一条流水线
 * （抓原文 → 合并 → 写稿）。搜到的和订阅来的在后面的每一步都同等对待。
 *
 * **它只在被明确要求的时候跑**（COLLECT_SEEK 或 workflow 上填了 seek），
 * 因为它花钱：每次搜索一美分，而日常那两场靠订阅就够。
 */
import { askText } from './llm.mjs'
import { splitBlocks, parseBlock } from './blocks.mjs'
import { outletFor } from './feedparse.mjs'

const SHAPE = `
每条写成一个块，照下面的格式，不要用 JSON：

===ITEM 0===
TITLE: 报道的标题（原文语言，不要翻译）
URL: 报道的完整网址
OUTLET: 媒体名
DATE: 发表日期，YYYY-MM-DD
WHY: 一句话说明它为什么符合题目
===END 0===

规则：
- **只写你真的在搜索结果里看到的报道。** 一条编出来的新闻比少一条糟糕得多。
- URL 必须是那篇报道本身的地址，不是首页、不是标签页、不是搜索结果页。
- 同一件事只留一条（选报道最完整的那家），不要同一个事件写好几条。
- 找不到那么多就少写几条，**不要凑数**。宁可回三条真的，不要十条凑的。
- 优先近三十天内的报道；确实重要的旧案可以收，但要在 DATE 里如实写。`

/**
 * 找候选。
 *
 * @param brief  这一轮要什么，中文写。
 * @param want   想要几条。
 * @param feeds  订阅清单，用来给搜到的网址配一个像样的媒体名。
 * @returns 和 RSS 条目形状一样的候选数组。
 */
export async function seekCandidates(brief, want, feeds = []) {
  if (!brief || want <= 0) return []

  const system = `你在帮一个中文的女性主义与 LGBTQIA+ 新闻站找选题。

你的任务只有一件：**联网搜索**，找出符合下面题目的真实报道，把它们列出来。
不要写稿，不要总结内容，不要评价——那是下一步别人的事。

${SHAPE}`

  const user = `题目：
${brief}

找 ${want} 条。搜索时把中文和英文的说法都试一遍——同一件事，
中文媒体和英文媒体的措辞常常完全不同，只搜一种会漏掉一半。`

  const { text, found } = await askText(system, user, {
    maxTokens: 4000,
    search: true,
    // 找选题要多搜几轮：一个题目往往要换三四种说法才问得出东西。
    maxSearches: Number(process.env.SEEK_SEARCHES ?? 8),
  })

  return { items: parseSeek(text, feeds), found: Array.isArray(found) ? found : [] }
}

/**
 * 把模型回的块解析成候选。
 *
 * 单独拿出来是为了**能测**。第一版把这段揉在上面那个 async 函数里，
 * 里面有一个把 `{i, body}` 当字符串用的错误，跑起来必然抛
 * `body.split is not a function`——而调用方 catch 掉了它，日志里只留下
 * 一行「联网找选题失败」。那一轮的八次搜索照付了 0.42 美元，一条没进来。
 *
 * 一个只在花过钱之后才会暴露的错误，必须有一条不花钱的测试盯着。
 */
export function parseSeek(text, feeds = []) {
  const FIELDS = ['TITLE', 'URL', 'OUTLET', 'DATE', 'WHY']
  const out = []
  const seen = new Set()
  for (const block of splitBlocks(text)) {
    const raw = parseBlock(block.body, FIELDS)
    const url = String(raw.URL ?? '').trim()
    const title = String(raw.TITLE ?? '').trim()
    if (!/^https?:\/\//.test(url) || !title) continue
    if (seen.has(url)) continue
    seen.add(url)

    const when = Date.parse(String(raw.DATE ?? '').trim())
    out.push({
      /*
       * 一个假的「源」，字段和真的订阅源对齐，下游不用分情况处理。
       * `topical: true` 是因为这一条是**按题目搜来的**——它已经通过了
       * 一次比关键词更强的筛选，不该再被关键词那一关刷掉。
       */
      feed: {
        id: 'seek',
        outlet: String(raw.OUTLET ?? '').trim() || outletFor(url, feeds),
        major: false,
        topical: true,
        regions: [],
      },
      title,
      link: url,
      summary: String(raw.WHY ?? '').trim(),
      topics: [],
      regions: [],
      at: Number.isFinite(when) ? new Date(when).toISOString() : new Date().toISOString(),
      /** 标出来路，日志里分得清哪些是搜来的。 */
      seeked: true,
    })
  }

  return out
}
