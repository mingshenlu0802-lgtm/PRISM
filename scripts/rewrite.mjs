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

/*
 * 一批几条。
 *
 * 站长要每条总结 1000 字左右，六条一批就是六千多字的输出——很容易撞上
 * max_tokens，而撞上的表现是**整批返回空**（模型写到一半被截断，一个字都没落地）。
 * 三条一批留出余量。批次多一倍意味着系统提示词多发一倍，但那是几千 token 的
 * 输入，比丢掉一整批便宜得多。
 */
const BATCH = Number(process.env.LLM_BATCH ?? 2)

const SHAPE = `
只返回 JSON，形如：
{"items":[{
  "keep": true,
  "headline": "主标题",
  "subhead": "副标题，一句话，给范围/证据变化/制度意义",
  "summary": "中文新闻稿，1500-3000 字，用「## 小标题」分节，段间用 \\n\\n 断开，来源用 [1] [2] 角标",
  "bullets": ["要点一", "要点二"],
  "topics": ["violence"],
  "regions": ["us"],
  "notice": "内容提示，没有就给空字符串"
}]}

items 的长度和顺序必须跟输入的候选**完全一致**，不符合方针的那条把 keep 设成 false
（其余字段可以留空）。不要增删条目，不要改顺序。

topics 只能从这些里选：violence children rights repro trans hate equality displacement movement
regions 只能从这些里选：cn hk tw jpkr us eu anz sea sasia mena ru africa latam global`.trim()

/** 把一批候选交给模型。返回和输入等长的结果数组。 */
async function runBatch(batch, ownerNote) {
  const input = batch.map((p, i) => ({
    i,
    title: p.title,
    excerpt: p.summary,
    date: p.at.slice(0, 10),
    /*
     * 来源按 [1] [2] 编号交给模型，让它在正文里标角标。
     * 一条新闻常常已经合并了好几家的报道（同一件事多个来源），
     * 站长要求「引用尽量使用多过一个引用」——这里把它们都列出来，
     * 模型才有第二个可标的东西。
     */
    sources: [{ n: 1, outlet: p.feed.outlet, lang: p.feed.lang, url: p.link },
      ...(p.also ?? []).map((o, k) => ({ n: k + 2, outlet: o.feed.outlet, lang: o.feed.lang, url: o.link }))],
  }))
  const out = await ask(
    `${systemPrompt(ownerNote)}\n\n${SHAPE}`,
    `候选新闻 ${input.length} 条：\n\n${JSON.stringify(input, null, 1)}`,
    // 两条 × 2000 字，加上标题、要点和 JSON 结构本身。给够余量：
    // 写到一半被截断等于这一批全丢，而现在每一批都很贵。
    // 编辑方针有缓存，批次变多不会把输入成本按批数翻倍。
    { maxTokens: 24000 },
  )
  const items = Array.isArray(out?.items) ? out.items : []
  if (items.length !== batch.length) {
    throw new Error(`模型返回 ${items.length} 条，应当是 ${batch.length} 条`)
  }
  return items
}

const TOPICS = new Set(['violence', 'children', 'rights', 'repro', 'trans', 'hate', 'equality', 'displacement', 'movement'])
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
  if (!headline || summary.length < 400) return null // 太短就是没写，宁可不要

  const topics = (Array.isArray(raw.topics) ? raw.topics : []).filter((t) => TOPICS.has(t))
  const regions = (Array.isArray(raw.regions) ? raw.regions : []).filter((r) => REGIONS.has(r))
  return {
    headline,
    subhead: String(raw.subhead ?? '').trim() || null,
    summary,
    bullets: (Array.isArray(raw.bullets) ? raw.bullets : []).map((b) => String(b).trim()).filter(Boolean).slice(0, 6),
    topics: topics.length ? topics : fallback.topics,
    regions: regions.length ? regions : fallback.regions,
    notice: String(raw.notice ?? '').trim() || null,
  }
}

/**
 * 一直跑到够数为止。
 *
 * 第一次真实收集只上线了 3 条：模型按方针从 24 条里丢掉了 21 条。方针本来就写着
 * 「宁缺毋滥」，丢得多不是 bug——**但把候选数当成目标数就是**。喂 30 条进去，
 * 站长拿到的不是 30 条，是 3 条。
 *
 * 所以这里改成按**产出**算：一批一批地喂，够了就停，不够就继续往下拿候选。
 * 停得早就省钱，丢得多就多跑几批，两头都不用人去猜一个「大概喂多少」的数。
 *
 * `picked` 要比目标长得多（收集脚本按四倍准备）。真的喂完了还不够，
 * 那是今天的新闻确实不够，不是这里的问题——如实报出来。
 *
 * 一批失败不拖垮整次收集——报出来，继续下一批。
 */
export async function rewriteAll(picked, ownerNote = '', target = Infinity) {
  console.log(`交给模型筛选改写（${llmName()}，每批 ${BATCH} 条，要 ${target === Infinity ? '全部' : `${target} 条`}）`)
  const out = []
  let dropped = 0
  let failed = 0
  let seen = 0

  for (let i = 0; i < picked.length; i += BATCH) {
    if (out.length >= target) break
    const batch = picked.slice(i, i + BATCH)
    seen += batch.length
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

  // 多留下的那几条不丢——同一批里的，钱已经付过了。
  const kept = target === Infinity ? out : out.slice(0, target)
  console.log(`  收 ${kept.length} 条 · 看过 ${seen} 条候选 · 按方针丢弃 ${dropped} 条${failed ? ` · ${failed} 条因调用失败没处理` : ''}`)
  if (kept.length < target && seen >= picked.length) {
    console.log(`  没凑够 ${target} 条：候选全看完了。今天符合方针的就这么多。`)
  }

  /*
   * 全军覆没要喊出来。
   *
   * 免费额度用完、key 填错、模型名不存在——这几种都会让每一批都失败，
   * 而如果只是静静地写 0 条，站长看到的是「今天没有新闻」，
   * 完全想不到是额度的问题。这类沉默的失败，这个项目已经踩过太多次。
   */
  if (kept.length === 0 && failed > 0) {
    console.log('')
    console.log('!! 每一批都失败了。常见原因，按可能性排：')
    console.log('   1 免费额度用完或需要绑定付款方式（错误信息里通常有 quota / credit / billing）')
    console.log('   2 LLM_MODEL 名字不对——供应商的型号名会变，去它的控制台核对一次')
    console.log('   3 LLM_API_KEY 不对，或者 LLM_BASE_URL 少了 /v1')
    console.log('   照着 probe 跑一次（Run workflow 勾 probe），它会直接告诉你是哪一种。')
    console.log('   上面每一批的错误原文就是答案，照着看。')
  }
  return kept
}

/* ------------------------------------------------------------------ *
 * 研究与数据
 *
 * 站长要每天 30 条新闻**加 3 项研究**。研究不是短新闻，不能套同一套提示词：
 * 新闻回答「发生了什么」，研究要回答「这个数字撑得起什么结论、撑不起什么」。
 *
 * 所以多要两样东西：
 *   - limitation：这份研究**做不到**什么。研究页会把它印在数字旁边。
 *     一个不写局限的数据站，是在帮读者过度解读。
 *   - figures：最多三个关键数字，每个都必须带一句「它没说什么」。
 *
 * 一天只要 3 项，所以一批发完，不分批。
 * ------------------------------------------------------------------ */

const STUDY_SHAPE = `
只返回 JSON，形如：
{"items":[{
  "keep": true,
  "title": "中文标题",
  "publisher": "中文机构名",
  "kind": "official-statistics",
  "summary": "中文新闻稿，1000-1500 字，按「怎么写这一篇」的结构写，分段用 \\n\\n 断开",
  "limitation": "这份研究撑不起什么结论，一到两句",
  "figures": [{"label":"指标名","value":"数字带单位","note":"这个数字没有说什么"}],
  "topics": ["violence"],
  "regions": ["global"]
}]}

items 的长度和顺序必须跟输入**完全一致**，不属于本站题目的把 keep 设成 false。

kind 只能从这些里选：peer-reviewed systematic-review official-statistics dataset ngo-report preprint
topics 只能从这些里选：violence children rights repro trans hate equality displacement movement
regions 只能从这些里选：cn hk tw jpkr us eu anz sea sasia mena ru africa latam global

figures 里只放**原文里真的出现过的数字**。原文没给数字就返回空数组——
编一个数字比没有数字糟糕得多。note 不能空着：每个数字都要说清它的边界。
limitation 同理，宁可写「原文未说明抽样方法」，也不要编一个方法出来。`.trim()

const KINDS = new Set(['peer-reviewed', 'systematic-review', 'official-statistics', 'dataset', 'ngo-report', 'preprint'])

/** 校验一项研究。和新闻一样：模型编出来的字段不该悄悄进站。 */
export function cleanStudy(raw, fallback) {
  const topics = (Array.isArray(raw?.topics) ? raw.topics : []).filter((t) => TOPICS.has(t))
  const regions = (Array.isArray(raw?.regions) ? raw.regions : []).filter((r) => REGIONS.has(r))
  const figures = (Array.isArray(raw?.figures) ? raw.figures : [])
    .filter((f) => f && String(f.value ?? '').trim() && String(f.note ?? '').trim())
    .slice(0, 3)
    .map((f) => ({
      label: String(f.label ?? '').trim(),
      value: String(f.value ?? '').trim(),
      note: String(f.note ?? '').trim(),
    }))
  const summary = String(raw?.summary ?? '').trim()
  return {
    ...fallback,
    title: String(raw?.title ?? '').trim() || fallback.title,
    publisher: String(raw?.publisher ?? '').trim() || fallback.publisher,
    // 模型没给或给了个不存在的类型，就退回这个源的默认类型，不要让研究页
    // 出现一个显示不出可信度提示的空类别。
    kind: KINDS.has(raw?.kind) ? raw.kind : fallback.kind,
    summary: summary.length >= 400 ? summary : fallback.summary,
    limitation: String(raw?.limitation ?? '').trim() || '原报告未说明方法与抽样，这里不代为推断。',
    figures,
    topics: topics.length ? topics : fallback.topics,
    regions: regions.length ? regions : fallback.regions,
  }
}

/** 把候选研究交给模型。返回保留下来的那些。 */
export async function rewriteStudies(cands, ownerNote) {
  if (cands.length === 0) return []
  const input = cands.map((c, i) => ({
    i,
    publisher: c.feed.publisher,
    defaultKind: c.feed.kind,
    title: c.title,
    excerpt: c.summary,
    url: c.link,
    date: c.at.slice(0, 10),
  }))
  console.log(`交给模型处理 ${cands.length} 项候选研究（${llmName()}）`)
  try {
    const out = await ask(
      `${systemPrompt(ownerNote)}\n\n${STUDY_SHAPE}`,
      `候选研究 ${input.length} 项：\n\n${JSON.stringify(input, null, 1)}`,
      { maxTokens: 24000 },
    )
    const items = Array.isArray(out?.items) ? out.items : []
    if (items.length !== cands.length) {
      throw new Error(`模型返回 ${items.length} 项，应当是 ${cands.length} 项`)
    }
    const kept = []
    cands.forEach((c, i) => {
      if (items[i]?.keep === false) return
      kept.push(cleanStudy(items[i], c))
    })
    console.log(`模型留下 ${kept.length} 项，丢掉 ${cands.length - kept.length} 项`)
    return kept
  } catch (e) {
    // 研究是「加分项」，不该因为它失败就把整轮新闻也拖掉。
    console.log(`研究这一步失败了：${String(e.message ?? e).slice(0, 200)}`)
    console.log('这一轮就不加研究了，新闻不受影响。')
    return []
  }
}
