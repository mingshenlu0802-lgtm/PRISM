/**
 * 把抓回来的候选，交给模型按编辑方针筛选并改写成中文条目。
 *
 * 抓取只负责「拿到候选」，判断和写作在这里。分开是有理由的：
 * 方针会变（站长随时可能改十一条里的权重），抓取不该跟着改。
 *
 * 模型做四件事，一次做完：
 *   1 按方针决定这条要不要——不符合的直接丢，宁缺毋滥
 *   2 重写中文标题（不是直译，按语气准则：主语放回施害者、点名权力）
 *   3 写详细中文总结，按「每一条要回答的问题」组织
 *   4 归类地区与议题
 *
 * 一批一批发。批太大模型会开始偷懒——后面几条越写越短；批太小则调用次数翻倍，
 * 免费额度撑不住。六条是个折中。
 */
import { ask, llmName } from './llm.mjs'
import { systemPrompt } from './editorial.mjs'

const BATCH = Number(process.env.LLM_BATCH ?? 6)

const SHAPE = `
只返回 JSON，形如：
{"items":[{
  "keep": true,
  "headline": "中文标题",
  "summary": "详细的中文总结，分段，用 \\n\\n 断段",
  "bullets": ["要点一", "要点二"],
  "topics": ["violence"],
  "regions": ["us"],
  "notice": "内容提示，没有就给空字符串"
}]}

items 的长度和顺序必须跟输入的候选**完全一致**，不符合方针的那条把 keep 设成 false
（其余字段可以留空）。不要增删条目，不要改顺序。

topics 只能从这些里选：rights violence repro trans hate equality displacement movement
regions 只能从这些里选：cn hk tw jpkr us eu anz sea sasia mena ru africa latam global`.trim()

/** 把一批候选交给模型。返回和输入等长的结果数组。 */
async function runBatch(batch, ownerNote) {
  const input = batch.map((p, i) => ({
    i,
    source: p.feed.outlet,
    lang: p.feed.lang,
    title: p.title,
    excerpt: p.summary,
    url: p.link,
    date: p.at.slice(0, 10),
  }))
  const out = await ask(
    `${systemPrompt(ownerNote)}\n\n${SHAPE}`,
    `候选新闻 ${input.length} 条：\n\n${JSON.stringify(input, null, 1)}`,
  )
  const items = Array.isArray(out?.items) ? out.items : []
  if (items.length !== batch.length) {
    throw new Error(`模型返回 ${items.length} 条，应当是 ${batch.length} 条`)
  }
  return items
}

const TOPICS = new Set(['rights', 'violence', 'repro', 'trans', 'hate', 'equality', 'displacement', 'movement'])
const REGIONS = new Set(['cn', 'hk', 'tw', 'jpkr', 'us', 'eu', 'anz', 'sea', 'sasia', 'mena', 'ru', 'africa', 'latam', 'global'])

/**
 * 校验模型的产出。
 *
 * 模型偶尔会编一个不存在的议题名，或者把总结写成一句话。这些不该悄悄进站——
 * 前者会让筛选页出现一个点不开的标签，后者就是站长说的「总结不够详细」。
 */
export function clean(raw, fallback) {
  if (!raw || raw.keep === false) return null
  const headline = String(raw.headline ?? '').trim()
  const summary = String(raw.summary ?? '').trim()
  if (!headline || summary.length < 80) return null // 太短就是没写，宁可不要

  const topics = (Array.isArray(raw.topics) ? raw.topics : []).filter((t) => TOPICS.has(t))
  const regions = (Array.isArray(raw.regions) ? raw.regions : []).filter((r) => REGIONS.has(r))
  return {
    headline,
    summary,
    bullets: (Array.isArray(raw.bullets) ? raw.bullets : []).map((b) => String(b).trim()).filter(Boolean).slice(0, 6),
    topics: topics.length ? topics : fallback.topics,
    regions: regions.length ? regions : fallback.regions,
    notice: String(raw.notice ?? '').trim() || null,
  }
}

/**
 * 全部跑一遍。
 *
 * 一批失败不拖垮整次收集——报出来，继续下一批。免费额度限速时这很常见。
 */
export async function rewriteAll(picked, ownerNote = '') {
  console.log(`交给模型筛选改写（${llmName()}，每批 ${BATCH} 条）`)
  const out = []
  let dropped = 0
  let failed = 0

  for (let i = 0; i < picked.length; i += BATCH) {
    const batch = picked.slice(i, i + BATCH)
    try {
      const items = await runBatch(batch, ownerNote)
      items.forEach((raw, j) => {
        const c = clean(raw, batch[j])
        if (!c) { dropped += 1; return }
        out.push({ ...batch[j], ...c })
      })
    } catch (e) {
      failed += batch.length
      console.log(`  第 ${Math.floor(i / BATCH) + 1} 批失败：${String(e.message ?? e).slice(0, 120)}`)
    }
  }

  console.log(`  收 ${out.length} 条 · 按方针丢弃 ${dropped} 条${failed ? ` · ${failed} 条因调用失败没处理` : ''}`)

  /*
   * 全军覆没要喊出来。
   *
   * 免费额度用完、key 填错、模型名不存在——这几种都会让每一批都失败，
   * 而如果只是静静地写 0 条，站长看到的是「今天没有新闻」，
   * 完全想不到是额度的问题。这类沉默的失败，这个项目已经踩过太多次。
   */
  if (out.length === 0 && failed > 0) {
    console.log('')
    console.log('!! 每一批都失败了。常见原因，按可能性排：')
    console.log('   1 免费额度用完或需要绑定付款方式（错误信息里通常有 quota / credit / billing）')
    console.log('   2 LLM_MODEL 名字不对——供应商的型号名会变，去它的控制台核对一次')
    console.log('   3 LLM_API_KEY 不对，或者 LLM_BASE_URL 少了 /v1')
    console.log('   上面每一批的错误原文就是答案，照着看。')
  }
  return out
}
