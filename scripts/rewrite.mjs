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
import { ask, askText, llmName } from './llm.mjs'
import { splitBlocks, parseBlock, parseList, parseEnum, parseYes } from './blocks.mjs'
import { systemPrompt, triagePrompt } from './editorial.mjs'

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
每一条候选写成一个块，**不要用 JSON**，照下面的格式：

===ITEM 0===
KEEP: yes
HEADLINE: 主标题
SUBHEAD: 副标题，一句话
TOPICS: violence, children
REGIONS: us
NOTICE: 内容提示，没有就留空
BULLETS:
- 要点一
- 要点二
SUMMARY:
正文第一段。

正文第二段。可以直接换行、直接空行，不需要转义。

## 小标题

正文继续。句子后面用 [1] [2] 标出处。
===END 0===

规则：
- 每一条候选都要有一个块，编号就是输入里的 i，顺序不变，不要增删。
- 不符合方针的写 KEEP: no，其余字段可以留空。
- SUMMARY 从冒号后**换行开始**，一直写到 ===END 为止。
- TOPICS 只能从这些里选：violence children rights repro trans hate equality displacement movement
- REGIONS 只能从这些里选：cn hk tw jpkr us eu anz sea sasia mena ru africa latam global`.trim()

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
  const text = await askText(
    `${systemPrompt(ownerNote)}\n\n${SHAPE}`,
    `候选新闻 ${input.length} 条：\n\n${JSON.stringify(input, null, 1)}`,
    { maxTokens: 24000 },
  )
  const blocks = splitBlocks(text)
  if (blocks.length === 0) {
    throw new Error(`没找到 ===ITEM=== 块：${text.slice(0, 200)}`)
  }
  // 按编号对回去，而不是按出现顺序——模型偶尔会漏掉一整块（那一条就当没留下）。
  const items = batch.map((_, i) => {
    const b = blocks.find((x) => x.i === i)
    return b ? parseBlock(b.body, FIELDS) : null
  })
  return items
}

const FIELDS = ['KEEP', 'HEADLINE', 'SUBHEAD', 'TOPICS', 'REGIONS', 'NOTICE', 'BULLETS', 'SUMMARY']

const TOPICS = new Set(['violence', 'children', 'rights', 'repro', 'trans', 'hate', 'equality', 'displacement', 'movement'])
const REGIONS = new Set(['cn', 'hk', 'tw', 'jpkr', 'us', 'eu', 'anz', 'sea', 'sasia', 'mena', 'ru', 'africa', 'latam', 'global'])

/**
 * 校验模型的产出。
 *
 * 模型偶尔会编一个不存在的议题名，或者把总结写成一句话。这些不该悄悄进站——
 * 前者会让筛选页出现一个点不开的标签，后者就是站长说的「总结不够详细」。
 */
export function clean(raw, fallback) {
  if (!raw || !parseYes(raw.KEEP)) return null
  const headline = String(raw.HEADLINE ?? '').trim()
  const summary = String(raw.SUMMARY ?? '').trim()
  if (!headline || summary.length < 400) return null // 太短就是没写，宁可不要

  const topics = parseEnum(raw.TOPICS, TOPICS)
  const regions = parseEnum(raw.REGIONS, REGIONS)
  return {
    headline,
    subhead: String(raw.SUBHEAD ?? '').trim() || null,
    summary,
    bullets: parseList(raw.BULLETS).slice(0, 6),
    topics: topics.length ? topics : fallback.topics,
    regions: regions.length ? regions : fallback.regions,
    notice: String(raw.NOTICE ?? '').trim() || null,
  }
}

/* ------------------------------------------------------------------ *
 * 第一步：先挑，再写
 *
 * 长稿把一个隐藏的浪费放大了出来。模型按方针要丢掉七八成候选，而在原来的
 * 单段流程里，**每一条被丢掉的候选都是先写满两三千字才被丢的**——
 * 一轮收集大半的钱和时间，花在了永远不会上线的稿子上。
 *
 * 所以拆成两步。挑的那一步一次看二十条，每条只回一个 true/false 和一句理由，
 * 输出几十个 token；写的那一步只碰留下来的。
 * 长输出的调用次数从「候选数 ÷ 2」降到「目标数 ÷ 2」。
 * ------------------------------------------------------------------ */

const TRIAGE_BATCH = Number(process.env.LLM_TRIAGE_BATCH ?? 20)

const TRIAGE_SHAPE = `
只返回 JSON，形如：
{"picks":[{"i":0,"keep":true,"why":"检方起诉，涉及机构失察"},{"i":1,"keep":false,"why":"名人八卦"}]}

picks 必须覆盖输入里的每一个 i，不要增删。why 写十个字以内，只是给日志看的。`.trim()

/** 先挑一遍。返回留下来的候选，顺序不变。 */
async function triage(cands, ownerNote) {
  const kept = []
  let looked = 0
  for (let i = 0; i < cands.length; i += TRIAGE_BATCH) {
    const batch = cands.slice(i, i + TRIAGE_BATCH)
    looked += batch.length
    try {
      const out = await ask(
        `${triagePrompt(ownerNote)}\n\n${TRIAGE_SHAPE}`,
        `候选 ${batch.length} 条：\n\n${JSON.stringify(
          batch.map((c, k) => ({ i: k, source: c.feed.outlet, title: c.title, excerpt: String(c.summary).slice(0, 300) })),
          null, 1,
        )}`,
        { maxTokens: 2000 },
      )
      const picks = Array.isArray(out?.picks) ? out.picks : []
      for (const p of picks) {
        if (p?.keep && batch[p.i]) kept.push(batch[p.i])
      }
    } catch (e) {
      // 挑这一步失败就把这一批**全部留下**，交给写的那一步去筛。
      // 宁可多花钱，也不要因为一次网络抖动就把二十条真新闻整批扔掉。
      console.log(`  初筛第 ${Math.floor(i / TRIAGE_BATCH) + 1} 批失败，这批全部留给下一步：${String(e.message ?? e).slice(0, 80)}`)
      kept.push(...batch)
    }
  }
  console.log(`  初筛：看 ${looked} 条，留 ${kept.length} 条`)
  return kept
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
export async function rewriteAll(candidates, ownerNote = '', target = Infinity) {
  console.log(`交给模型（${llmName()}），目标 ${target === Infinity ? '全部' : `${target} 条`}`)

  /*
   * 先挑后写。挑的那一步便宜，写的那一步贵——所以别在会被丢掉的稿子上动笔。
   * 只有一批的时候不值得多跑一次调用，直接写。
   */
  const picked = candidates.length > BATCH * 2
    ? await triage(candidates, ownerNote)
    : candidates
  if (picked.length === 0) {
    console.log('  初筛之后一条都不剩。今天的候选里没有符合方针的。')
    return []
  }
  console.log(`  开始写（每批 ${BATCH} 条）`)
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
每一项写成一个块，**不要用 JSON**：

===ITEM 0===
KEEP: yes
TITLE: 中文标题
PUBLISHER: 中文机构名
KIND: official-statistics
TOPICS: violence, children
REGIONS: global
FIGURES:
- 指标名 | 数字带单位 | 这个数字没有说什么
- 指标名 | 数字带单位 | 这个数字没有说什么
LIMITATION:
这份研究撑不起什么结论，一到两句。
SUMMARY:
按新闻的写法写，1000–1500 字，分段。可以直接换行。
===END 0===

规则：
- 每一项都要有一个块，编号是输入里的 i，顺序不变。不属于本站题目的写 KEEP: no。
- KIND 只能是：peer-reviewed systematic-review official-statistics dataset ngo-report preprint
- TOPICS 只能从这些里选：violence children rights repro trans hate equality displacement movement
- REGIONS 只能从这些里选：cn hk tw jpkr us eu anz sea sasia mena ru africa latam global
- FIGURES 里只放**原文里真的出现过的数字**，一行一个，三段用 | 隔开。
  原文没给数字就整个留空——编一个数字比没有数字糟糕得多。
  第三段（它没说什么）不能空着：每个数字都要说清它的边界。
- LIMITATION 同理，宁可写「原报告未说明抽样方法」，也不要编一个方法出来。`.trim()

const STUDY_FIELDS = ['KEEP', 'TITLE', 'PUBLISHER', 'KIND', 'TOPICS', 'REGIONS', 'FIGURES', 'LIMITATION', 'SUMMARY']

const KINDS = new Set(['peer-reviewed', 'systematic-review', 'official-statistics', 'dataset', 'ngo-report', 'preprint'])

/** 校验一项研究。和新闻一样：模型编出来的字段不该悄悄进站。 */
export function cleanStudy(raw, fallback) {
  const topics = parseEnum(raw?.TOPICS, TOPICS)
  const regions = parseEnum(raw?.REGIONS, REGIONS)
  const kind = String(raw?.KIND ?? '').trim()

  /*
   * 数字一行一个：指标 | 数值 | 它没说什么。
   * 三段缺任何一段就丢掉——研究页把数字印得很大，一个没有边界说明的数字
   * 比不放这个数字糟糕得多。
   */
  const figures = parseList(raw?.FIGURES)
    .map((line) => line.split('|').map((x) => x.trim()))
    .filter((p) => p.length >= 3 && p[1] && p[2])
    .slice(0, 3)
    .map((p) => ({ label: p[0], value: p[1], note: p.slice(2).join(' | ') }))

  const summary = String(raw?.SUMMARY ?? '').trim()
  return {
    ...fallback,
    title: String(raw?.TITLE ?? '').trim() || fallback.title,
    publisher: String(raw?.PUBLISHER ?? '').trim() || fallback.publisher,
    // 模型给了个不存在的类型，就退回这个源的默认类型，不要让研究页
    // 出现一个显示不出可信度提示的空类别。
    kind: KINDS.has(kind) ? kind : fallback.kind,
    summary: summary.length >= 400 ? summary : fallback.summary,
    limitation: String(raw?.LIMITATION ?? '').trim() || '原报告未说明方法与抽样，这里不代为推断。',
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
    const text = await askText(
      `${systemPrompt(ownerNote)}\n\n${STUDY_SHAPE}`,
      `候选研究 ${input.length} 项：\n\n${JSON.stringify(input, null, 1)}`,
      { maxTokens: 24000 },
    )
    const blocks = splitBlocks(text)
    if (blocks.length === 0) throw new Error(`没找到 ===ITEM=== 块：${text.slice(0, 200)}`)
    const kept = []
    cands.forEach((c, i) => {
      const b = blocks.find((x) => x.i === i)
      if (!b) return
      const f = parseBlock(b.body, STUDY_FIELDS)
      if (!parseYes(f.KEEP)) return
      kept.push(cleanStudy(f, c))
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
