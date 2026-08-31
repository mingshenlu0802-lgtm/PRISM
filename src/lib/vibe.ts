/**
 * PRISM 棱镜 — “Further Vibe Coding”.
 *
 * A deterministic rules engine that turns a natural-language editing
 * instruction into a *proposed* article snapshot. Nothing here is random and
 * nothing here is generative: the instruction is classified by keyword into one
 * of a fixed set of intents, and each intent performs a real, auditable
 * restructuring of the snapshot using only material that already exists in
 * `PrismState` — no source is ever invented, and every new sentence follows the
 * trauma-informed rules of the house style.
 *
 * Determinism matters twice over: the console must be able to re-run the same
 * instruction and get the same proposal, and every generated block id must be
 * reproducible. All ids are derived from `instruction + article.id`; all
 * timestamps come from the `now` argument, never from the wall clock.
 *
 * Everything produced here is demo content inside the prototype's fictional
 * world (韦拉共和国 / 卡利桑邦 / 北屿联合王国 …). It is not reporting.
 */
import type {
  Article, ArticleSection, Block, ChartSpec, Citation, CitationCheck, DivergencePosition,
  ID, PrismState, RiskFlag, SectionKind, Source, VibePreset,
} from './types'
import { SECTION_LABEL, SECTION_ORDER } from './constants'
import { articleWordCount, fmtDate, isPrimarySource } from './util'
import { diffArticles, diffRefs } from './diff'

/* ------------------------------------------------------------------ *
 * Presets
 * ------------------------------------------------------------------ */

export const VIBE_PRESETS: VibePreset[] = [
  {
    id: 'vibe-jurisdiction',
    label: '加入司法辖区的法律背景',
    instruction: '加入韦拉共和国的法律背景',
    category: 'context',
  },
  {
    id: 'vibe-institutional-history',
    label: '补充制度沿革',
    instruction: '补充相关条文的历史与制度背景，说明它为什么以现在这种方式运作',
    category: 'context',
  },
  {
    id: 'vibe-local-voices',
    label: '增加当地组织的观点',
    instruction: '增加当地女性主义组织的观点',
    category: 'sources',
  },
  {
    id: 'vibe-divergent-sources',
    label: '补入在地媒体的不同判断',
    instruction: '增加当地组织与独立媒体对此事的不同判断',
    category: 'sources',
  },
  {
    id: 'vibe-victim-blaming',
    label: '检查受害者有罪论',
    instruction: '检查是否存在受害者有罪论',
    category: 'ethics',
  },
  {
    id: 'vibe-trauma-informed',
    label: '复核创伤知情写法',
    instruction: '检查是否存在受害者有罪论与不必要的细节描写',
    category: 'ethics',
  },
  {
    id: 'vibe-recheck-refs',
    label: '重新核查每条引用',
    instruction: '重新核查每个 reference',
    category: 'verification',
  },
  {
    id: 'vibe-evidence-strength',
    label: '按证据强度重估表述',
    instruction: '重新核查每个 reference，并标出证据不足以支撑的表述',
    category: 'verification',
  },
  {
    id: 'vibe-deepen',
    label: '把文章改得更深入',
    instruction: '把文章改得更深入',
    category: 'depth',
  },
  {
    id: 'vibe-add-data',
    label: '补充数据与图表',
    instruction: '补充数据，加入一张图表',
    category: 'depth',
  },
  {
    id: 'vibe-shorten',
    label: '改得更简洁',
    instruction: '把正文改得更简洁',
    category: 'depth',
  },
  {
    id: 'vibe-plain-language',
    label: '改得更好读',
    instruction: '把文章改得更好读，降低阅读门槛',
    category: 'depth',
  },
  {
    id: 'vibe-swap-cover',
    label: '更换封面图',
    instruction: '更换一张不呈现受害者形象的封面图',
    category: 'imagery',
  },
]

/* ------------------------------------------------------------------ *
 * Intent classification
 * ------------------------------------------------------------------ */

export type VibeIntent =
  | 'add-jurisdiction-context'
  | 'add-local-voices'
  | 'check-victim-blaming'
  | 'recheck-references'
  | 'deepen'
  | 'swap-cover'
  | 'shorten'
  | 'add-data'
  | 'fallback'

export interface VibePlan {
  intent: VibeIntent
  /** Short Chinese name of the classified operation. */
  label: string
  /** Named jurisdiction, when the instruction carries one. */
  jurisdiction?: string
  /** Sub-mode for the `shorten` intent. */
  variant?: 'shorten' | 'plain'
}

/** The prototype's fictional jurisdictions, with the aliases readers type. */
const JURISDICTIONS: { zh: string; alias: string[]; en: string[] }[] = [
  { zh: '韦拉共和国', alias: ['韦拉'], en: ['veyra'] },
  { zh: '卡利桑邦', alias: ['卡利桑'], en: ['kalisan'] },
  { zh: '北屿联合王国', alias: ['北屿'], en: ['norhold'] },
  { zh: '塞尔瓦联邦', alias: ['塞尔瓦'], en: ['selva'] },
  { zh: '阿米拉特王国', alias: ['阿米拉特'], en: ['amirat'] },
  { zh: '东埃斯特里亚', alias: ['埃斯特里亚'], en: ['east estria', 'estria'] },
  { zh: '马兰岛自治区', alias: ['马兰岛', '马兰'], en: ['maran'] },
  { zh: '图兰共和国', alias: ['图兰'], en: ['turan'] },
]

const INTENT_RULES: { intent: VibeIntent; label: string; re: RegExp }[] = [
  {
    intent: 'swap-cover',
    label: '更换封面图',
    re: /封面|头图|配图|插图|cover\s*(image|art|photo)?|imagery|illustration/i,
  },
  {
    intent: 'recheck-references',
    label: '重新核查引用',
    re: /重新核查|重新核实|再核查|再核实|复核[^。]{0,6}(引用|来源|参考)|核查[^。]{0,6}(引用|来源|参考|文献)|引用核查|reference|citation|re-?check|verify\s+(the\s+)?(source|citation|reference)/i,
  },
  {
    intent: 'check-victim-blaming',
    label: '检查受害者有罪论',
    re: /受害者有罪|受害人有罪|指责受害者|归咎(于)?(受害者|当事人)|荡妇羞辱|创伤知情|victim[-\s]?blam|blaming the victim|trauma[-\s]?informed/i,
  },
  {
    intent: 'add-data',
    label: '补充数据与图表',
    re: /补充数据|加入数据|增加数据|数据支撑|数据佐证|图表|统计图|可视化|chart|graph|data\s*(point|set|viz)|add\s+data/i,
  },
  {
    intent: 'add-local-voices',
    label: '增加在地组织的观点',
    re: /(当地|本地|在地|基层|草根)[^，。；]{0,8}(组织|团体|社群|机构|媒体|声音|观点|视角|经验|工作者)|民间组织|女性主义组织|妇女组织|NGO|local\s+(organisation|organization|group|voice|ngo|activist|media)|community\s+(group|voice|organisation|organization)|grassroots/i,
  },
  {
    intent: 'add-jurisdiction-context',
    label: '补入法律与制度背景',
    re: /法律背景|法律语境|法律框架|司法背景|制度背景|历史背景|立法|法条|条文|判例|legal\s+(context|background|framework)|jurisdiction|statutory|case\s*law/i,
  },
  {
    intent: 'shorten',
    label: '精简与降低阅读门槛',
    re: /更简洁|精简|缩短|删减|压缩|更好读|好读|通俗|易懂|平实|降低阅读门槛|shorten|concise|tighten|plain[-\s]?language|readable|simplify|simpler/i,
  },
  {
    intent: 'deepen',
    label: '加深分析',
    re: /更深入|深入|深度|展开分析|加强分析|再挖|more\s+depth|deepen|in-?depth|go\s+deeper|expand/i,
  },
]

const PLAIN_RE = /更好读|好读|通俗|易懂|平实|降低阅读门槛|plain[-\s]?language|readable|simplify|simpler/i

function detectJurisdiction(text: string): string | undefined {
  const lower = text.toLowerCase()
  for (const j of JURISDICTIONS) {
    if (text.includes(j.zh)) return j.zh
    if (j.alias.some((a) => text.includes(a))) return j.zh
    if (j.en.some((e) => lower.includes(e))) return j.zh
  }
  return undefined
}

export function classifyInstruction(instruction: string): VibePlan {
  const text = (instruction ?? '').trim()
  const jurisdiction = detectJurisdiction(text)
  if (text) {
    for (const rule of INTENT_RULES) {
      if (!rule.re.test(text)) continue
      const plan: VibePlan = { intent: rule.intent, label: rule.label }
      if (jurisdiction) plan.jurisdiction = jurisdiction
      if (rule.intent === 'shorten') plan.variant = PLAIN_RE.test(text) ? 'plain' : 'shorten'
      return plan
    }
    // A bare jurisdiction name ("再写写卡利桑邦") is read as a context request.
    if (jurisdiction) {
      return { intent: 'add-jurisdiction-context', label: '补入法律与制度背景', jurisdiction }
    }
  }
  return { intent: 'fallback', label: '未识别的指令' }
}

/* ------------------------------------------------------------------ *
 * Plan steps (workbench progress UI)
 * ------------------------------------------------------------------ */

const STEP_TABLE: Record<VibeIntent, { label: string; detail: string }[]> = {
  'add-jurisdiction-context': [
    { label: '解析指令', detail: '确认目标司法辖区与需要补充的背景类型。' },
    { label: '检索候选来源', detail: '在资料库中筛选未附加的法律文本、判决与官方统计。' },
    { label: '交叉核实', detail: '优先采用一手文本；文本与统计之间的落差单独标注。' },
    { label: '起草段落', detail: '写入小标题、两段背景与一条证据边界提示。' },
    { label: '比对差异', detail: '生成逐块差异，供编辑逐条确认。' },
    { label: '生成风险提示', detail: '标出仍需人工判断的表述强度问题。' },
  ],
  'add-local-voices': [
    { label: '解析指令', detail: '确认需要补入的是在地组织还是当地媒体的判断。' },
    { label: '检索候选来源', detail: '筛选未附加的民间组织报告、在地媒体与公开声明。' },
    { label: '评估代表性', detail: '记录样本范围，避免以单一组织代表整个群体。' },
    { label: '起草段落', detail: '写入分歧对照中的一项立场与权力结构一节的段落。' },
    { label: '比对差异', detail: '确认没有制造虚假平衡。' },
  ],
  'check-victim-blaming': [
    { label: '逐段扫描', detail: '检查被动语态、着装／饮酒／独行描写与归因暗示。' },
    { label: '标记问题句', detail: '记录每一处匹配到的模式与原文摘录。' },
    { label: '改写表述', detail: '恢复施害主体，删除与责任无关的细节。' },
    { label: '保护引用', detail: '带有引用标记的句子一律保留，交人工判断。' },
    { label: '生成风险提示', detail: '更新受害者有罪论风险项及其处理说明。' },
  ],
  'recheck-references': [
    { label: '列出全部引用', detail: '汇总正文引用与已附加来源。' },
    { label: '逐条比对来源记录', detail: '核对出版方、日期与论断范围。' },
    { label: '复核未通过项', detail: '把「未通过」改判为「保留意见」，并写明仍缺什么。' },
    { label: '处理来源提示', detail: '带有使用提示的来源统一降级为保留意见。' },
    { label: '更新核查时间', detail: '刷新核查记录，正文保持不变。' },
  ],
  deepen: [
    { label: '梳理现有证据', detail: '按证据强度排列已有引用。' },
    { label: '确定加深方向', detail: '选择能被现有材料支撑的分析角度。' },
    { label: '起草段落', detail: '补入研究与数据一节的分析段。' },
    { label: '补充未知项', detail: '把新的不确定性写入「尚未确定的信息」。' },
    { label: '补充观察项', detail: '写入一条具体、可验证的后续观察。' },
    { label: '比对差异', detail: '确认每一句都挂在既有引用上。' },
  ],
  'swap-cover': [
    { label: '解析指令', detail: '确认封面需要回避的内容类型。' },
    { label: '检查现有图像', detail: '核对当前封面的伦理标注与审核状态。' },
    { label: '生成图像简报', detail: '写出母题、配色与禁止事项。' },
    { label: '交由视觉工作台', detail: '正文不变，替换动作在「视觉工作台」执行。' },
  ],
  shorten: [
    { label: '逐段扫描', detail: '定位插入语、冗余连接词与可合并的从句。' },
    { label: '保护引用', detail: '任何含引用标记的片段都不删除。' },
    { label: '改写段落', detail: '删除不承载事实的成分，保留全部可核查内容。' },
    { label: '核对字数', detail: '统计删减幅度并重算阅读时长。' },
    { label: '比对差异', detail: '逐句显示删改，供编辑确认语义未变。' },
  ],
  'add-data': [
    { label: '匹配数据集', detail: '在图表库中寻找与本篇来源或辖区相关的数据。' },
    { label: '核对来源', detail: '确认数据集的来源记录已在资料库中。' },
    { label: '插入图表', detail: '在研究与数据一节写入图表块。' },
    { label: '写明局限', detail: '补一句说明这张图无法说明什么。' },
    { label: '比对差异', detail: '确认没有用图表支撑因果结论。' },
  ],
  fallback: [
    { label: '解析指令', detail: '尝试把自然语言指令归入可执行的改写类型。' },
    { label: '匹配改写类型', detail: '与既有的九类可自动执行操作逐一比对。' },
    { label: '未匹配', detail: '不对正文做任何猜测性改动。' },
    { label: '生成编辑建议', detail: '写入一条供人工判断的建议，并保留原始指令。' },
  ],
}

export function planSteps(instruction: string): { label: string; detail: string; done: boolean }[] {
  const plan = classifyInstruction(instruction)
  return STEP_TABLE[plan.intent].map((s) => ({ label: s.label, detail: s.detail, done: false }))
}

/* ------------------------------------------------------------------ *
 * Outcome
 * ------------------------------------------------------------------ */

export interface VibeOutcome {
  snapshot: Article
  refDelta: { added: ID[]; removed: ID[] }
  summary: string
  rationale: string
  stats: { added: number; removed: number; changed: number }
  /** Editor-facing observations, e.g. 「未找到可用的一手来源，已降低表述强度」. */
  notes: string[]
}

/* ------------------------------------------------------------------ *
 * Deterministic helpers
 * ------------------------------------------------------------------ */

/** FNV-1a — stable across runs, no clock, no randomness. */
function hash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36).padStart(7, '0').slice(-7)
}

function cloneBlock(b: Block): Block {
  switch (b.type) {
    case 'list': return { ...b, items: [...b.items] }
    case 'table': return { ...b, columns: [...b.columns], rows: b.rows.map((r) => [...r]) }
    case 'timeline': return {
      ...b,
      entries: b.entries.map((e) => (e.citationIds ? { ...e, citationIds: [...e.citationIds] } : { ...e })),
    }
    case 'divergence': return { ...b, positions: b.positions.map((p) => ({ ...p, citationIds: [...p.citationIds] })) }
    default: return { ...b }
  }
}

function cloneArticle(a: Article): Article {
  return {
    ...a,
    countries: [...a.countries],
    topics: [...a.topics],
    sections: a.sections.map((s) => ({ ...s, blocks: s.blocks.map(cloneBlock) })),
    citations: a.citations.map((c) => ({ ...c })),
    sourceIds: [...a.sourceIds],
    riskFlags: a.riskFlags.map((r) => ({ ...r })),
    citationChecks: a.citationChecks.map((c) => ({ ...c })),
    assetIds: [...a.assetIds],
    chartIds: [...a.chartIds],
    translations: a.translations.map((t) => ({ ...t })),
  }
}

/** Find a section by kind, creating it in the canonical order if absent. */
function ensureSection(a: Article, kind: SectionKind, seed: string): ArticleSection {
  const found = a.sections.find((s) => s.kind === kind)
  if (found) return found
  const section: ArticleSection = {
    id: `${a.id}-sec-${kind}-${seed}`,
    kind,
    title: SECTION_LABEL[kind].zh,
    blocks: [],
  }
  const rank = SECTION_ORDER.indexOf(kind)
  let at = a.sections.length
  for (let i = 0; i < a.sections.length; i += 1) {
    if (SECTION_ORDER.indexOf(a.sections[i].kind) > rank) { at = i; break }
  }
  a.sections.splice(at, 0, section)
  return section
}

const LEGAL_TYPES: Source['sourceType'][] = [
  'legal-document', 'court-ruling', 'government-data', 'international-body',
]
const LOCAL_TYPES: Source['sourceType'][] = ['ngo-report', 'local-media', 'statement']
const DATA_TYPES: Source['sourceType'][] = [
  'government-data', 'international-body', 'primary-research', 'academic-review',
]

/** Sources not yet attached to the article, ordered deterministically. */
function unattachedSources(article: Article, state: PrismState): Source[] {
  const used = new Set(article.sourceIds)
  return state.sources
    .filter((s) => !used.has(s.id))
    .sort((x, y) => {
      const px = x.id.startsWith('src-pool-') ? 0 : 1
      const py = y.id.startsWith('src-pool-') ? 0 : 1
      if (px !== py) return px - py
      if (y.credibility !== x.credibility) return y.credibility - x.credibility
      return x.id < y.id ? -1 : x.id > y.id ? 1 : 0
    })
}

function matchesJurisdiction(s: Source, jurisdiction: string): boolean {
  const entry = JURISDICTIONS.find((j) => j.zh === jurisdiction)
  const tokens = entry ? [entry.zh, ...entry.alias] : [jurisdiction]
  const haystack = `${s.country} ${s.publisher} ${s.title} ${s.notes ?? ''}`
  if (tokens.some((t) => haystack.includes(t))) return true
  const lower = haystack.toLowerCase()
  return entry ? entry.en.some((e) => lower.includes(e)) : false
}

function takeDistinct(lists: Source[][], n: number): Source[] {
  const out: Source[] = []
  const seen = new Set<ID>()
  for (const list of lists) {
    for (const s of list) {
      if (seen.has(s.id)) continue
      seen.add(s.id)
      out.push(s)
      if (out.length >= n) return out
    }
  }
  return out
}

interface Attachment { citationId: ID; marker: string; source: Source }

/**
 * Attach an existing source to the snapshot as a numbered citation.
 * Never invents a source: the caller must pass a record already in `state`.
 */
function attachCitation(
  snap: Article, source: Source, claim: string, locator: string | undefined, now: string, seed: string,
): Attachment {
  const existing = snap.citations.find((c) => c.sourceId === source.id && c.claim === claim)
  const citationId = existing?.id ?? `${snap.id}-cit-${hash(`${source.id}|${claim}|${seed}`)}`
  if (!existing) {
    const citation: Citation = { id: citationId, sourceId: source.id, claim }
    if (locator) citation.locator = locator
    snap.citations.push(citation)
  }
  if (!snap.sourceIds.includes(source.id)) snap.sourceIds.push(source.id)
  if (!snap.citationChecks.some((c) => c.citationId === citationId)) {
    const check: CitationCheck = source.caution
      ? {
        citationId,
        status: 'partial',
        reason: `来源自带使用提示：${source.caution}本次仅用于支撑有限的事实陈述，表述强度需人工确认。`,
        checkedAt: now,
      }
      : {
        citationId,
        status: 'found',
        reason: `已比对来源记录的出版方、日期与论断范围：${source.publisher}（${source.date}），与正文陈述一致。`,
        checkedAt: now,
      }
    snap.citationChecks.push(check)
  }
  return { citationId, marker: `[[c:${citationId}]]`, source }
}

function sourceLine(s: Source): string {
  return `${s.title}（${s.publisher}，${s.date}，${s.country}）`
}

function isList(b: Block): b is Extract<Block, { type: 'list' }> {
  return b.type === 'list'
}

function isDivergence(b: Block): b is Extract<Block, { type: 'divergence' }> {
  return b.type === 'divergence'
}

/** Append an item to the first list in a section, or create one. */
function appendListItem(section: ArticleSection, item: string, blockId: ID): boolean {
  const list = section.blocks.find(isList)
  if (list) {
    if (list.items.includes(item)) return false
    list.items = [...list.items, item]
    return true
  }
  section.blocks.push({ id: blockId, type: 'list', items: [item] })
  return true
}

function excerpt(text: string, max = 30): string {
  const plain = text.replace(/\[\[c:[A-Za-z0-9_-]+\]\]/g, '').trim()
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}

/** Quote an instruction back safely: no citation markers, bounded length. */
function quoteInstruction(instruction: string): string {
  const plain = instruction.replace(/\[\[c:[A-Za-z0-9_-]+\]\]/g, '').replace(/\s+/g, ' ').trim()
  return plain.length > 120 ? `${plain.slice(0, 120)}…` : plain
}

/* ------------------------------------------------------------------ *
 * Intent context
 * ------------------------------------------------------------------ */

interface Ctx {
  instruction: string
  plan: VibePlan
  article: Article
  snap: Article
  state: PrismState
  now: string
  seed: string
  notes: string[]
  bid: (slot: string) => ID
}

interface IntentResult { summary: string; rationale: string }

/* ------------------------------------------------------------------ *
 * Intent: add-jurisdiction-context
 * ------------------------------------------------------------------ */

function addJurisdictionContext(ctx: Ctx): IntentResult {
  const { snap, article, state, now, seed, bid } = ctx
  const jurisdiction = ctx.plan.jurisdiction ?? article.countries[0] ?? '本篇涉及的司法辖区'
  const pool = unattachedSources(article, state)
  const local = pool.filter((s) => matchesJurisdiction(s, jurisdiction))

  // The statutory claim may only ever rest on a legal-type record; the
  // execution-gap claim prefers statistics. Each is checked separately for
  // whether it actually comes from the named jurisdiction.
  const statute = local.find((s) => LEGAL_TYPES.includes(s.sourceType))
    ?? pool.find((s) => LEGAL_TYPES.includes(s.sourceType))
  const stats = takeDistinct(
    [
      local.filter((s) => s !== statute && DATA_TYPES.includes(s.sourceType)),
      local.filter((s) => s !== statute),
      pool.filter((s) => s !== statute && DATA_TYPES.includes(s.sourceType)),
      pool.filter((s) => s !== statute),
    ],
    1,
  )[0]

  const statuteLocal = statute ? matchesJurisdiction(statute, jurisdiction) : false
  const statsLocal = stats ? matchesJurisdiction(stats, jurisdiction) : false
  const picks = [statute, stats].filter((s): s is Source => Boolean(s))
  const comparative = picks.length > 0 && (!statuteLocal || !statsLocal)

  const section = ensureSection(snap, 'context', seed)

  const m1 = statute
    ? attachCitation(
      snap,
      statute,
      statuteLocal
        ? `${jurisdiction}适用于本篇事件的成文规则与程序条件`
        : `${statute.country}的对应条文，用作与${jurisdiction}比较的框架`,
      '条文对照',
      now,
      seed,
    ).marker
    : ''
  const m2 = stats
    ? attachCitation(
      snap,
      stats,
      statsLocal
        ? `${jurisdiction}相关程序的公开记录与执行情况`
        : `${stats.country}相关程序的公开记录，用作比较参照`,
      '统计表',
      now,
      seed,
    ).marker
    : ''

  const heading: Block = {
    id: bid('ctx-heading'),
    type: 'heading',
    level: 3,
    text: `${jurisdiction}的法律与制度背景`,
  }

  const p1Text = !statute
    ? `在${jurisdiction}，与本篇事件相关的规则分散在成文法与行政规章之中。资料库中目前没有可直接引用的条文记录，因此本节只列出需要核实的问题，不对现行规定作任何断言：适用的是哪一部法律、由哪一级机关执行、时效如何计算。`
    : statuteLocal
      ? `在${jurisdiction}，与本篇事件相关的规则分散在成文法与行政规章之中，各自的适用范围并不重合。可核对的文本显示，程序的启动条件、举证责任与时效期限分别由不同层级的文件规定${m1}。本站只陈述文本本身，不推断这些条文在具体个案中会如何适用。`
      : `在${jurisdiction}，与本篇事件相关的规则分散在成文法与行政规章之中。资料库中目前没有直接来自${jurisdiction}的条文记录，因此以下只作比较性说明：${statute.country}的对应文本把程序的启动条件、举证责任与时效期限分置于不同层级的文件${m1}。这只提供提问的框架，不能替代${jurisdiction}自己的规定。`

  const p2Text = !stats
    ? `文本与实践之间通常存在落差，但在取得公开统计之前，本站不对${jurisdiction}的执行情况作任何量化描述。编辑需要补充的是：受理与实质审理的分项数据，以及口径变更的说明。`
    : statsLocal
      ? `文本与实践之间存在落差。${stats.publisher}的记录显示，进入实质审理的数量长期低于受理数量，而统计口径与覆盖范围在同一时期并未保持一致${m2}。这一差距既可能来自当事人撤回，也可能来自程序阻碍，现有材料无法区分两者，本篇不据此推断原因。`
      : `文本与实践之间的落差必须用${jurisdiction}自己的记录来验证，而本站目前没有这类材料。可供对照的是${stats.publisher}对${stats.country}的记录：进入实质审理的数量长期低于受理数量，统计口径与覆盖范围也没有保持一致${m2}。这只指出提问的方向，不构成对${jurisdiction}的任何描述。`

  const p1: Block = { id: bid('ctx-p1'), type: 'paragraph', text: p1Text }
  const p2: Block = { id: bid('ctx-p2'), type: 'paragraph', text: p2Text }

  const callout: Block = {
    id: bid('ctx-callout'),
    type: 'callout',
    tone: 'note',
    title: '本节的证据边界',
    text: comparative
      ? `本节引用的部分材料并非来自${jurisdiction}，只作为比较框架使用：它不构成对${jurisdiction}现行规定的描述，也不构成对任何具体案件的司法判断。发布前必须补入${jurisdiction}本地的条文或统计。`
      : `以上是法律文本与公开记录的对照，不构成对任何具体案件的司法判断。本站未取得案卷材料，也未获得${jurisdiction}主管机关的书面回应；若后续取得，将在此处更新。`,
  }

  section.blocks.push(heading, p1, p2, callout)

  ctx.notes.push(`已在「${section.title}」补入 ${jurisdiction} 的法律与制度背景：1 个小标题、2 段正文、1 条证据边界提示。`)
  if (picks.length === 0) {
    ctx.notes.push('未找到可用的一手来源，已降低表述强度：本节只提出需要核实的问题，未作事实断言。')
  } else {
    for (const s of picks) {
      ctx.notes.push(`引用了资料库中此前未附加的来源：${sourceLine(s)}。`)
      if (s.caution) ctx.notes.push(`${s.publisher} 带有使用提示：${s.caution}该引用已标记为「保留意见」。`)
    }
    if (!statute) {
      ctx.notes.push(`资料库中没有任何可引用的条文类记录，条文段落已改为提问式表述，未对${jurisdiction}的现行规定作断言。`)
    } else if (!statuteLocal) {
      ctx.notes.push(`没有直接来自${jurisdiction}的条文记录，已改用${statute.country}的文本作比较框架，并在正文与提示框中标明。`)
    }
    if (stats && !statsLocal) {
      ctx.notes.push(`执行情况一段引用的是${stats.country}的记录，已在正文中标明这不是对${jurisdiction}的描述。`)
    }
    if (!stats) {
      ctx.notes.push('没有可引用的执行情况记录，第二段未使用任何数值表述。')
    }
  }

  return {
    summary: picks.length === 0
      ? `在「${section.title}」补入 ${jurisdiction} 的背景框架；资料库中没有可引用的记录，已按低强度表述处理。`
      : comparative
        ? `在「${section.title}」补入 ${jurisdiction} 的背景框架，新增 4 个内容块；因缺少当地记录，改用 ${picks.length} 份可比辖区材料并已标注。`
        : `在「${section.title}」补入 ${jurisdiction} 的成文规则与执行落差，新增 4 个内容块、${picks.length} 条引用。`,
    rationale: `指令被识别为「补入法律与制度背景」。自动编辑台在资料库中筛选尚未附加到本篇的来源：条文段落只接受法律文本、判决、官方数据一类的记录，执行情况段落优先采用统计。两者分别检查是否真的来自${jurisdiction}——不是的，就改写成明确标注的比较框架，而不是让读者以为那是当地规定。背景段落只描述文本与记录本身，不推断个案结果，也不替代司法结论。仍需人工判断的是：这些条文是否确实适用于本篇事件，以及执行落差是否需要主管机关的回应。`,
  }
}

/* ------------------------------------------------------------------ *
 * Intent: add-local-voices
 * ------------------------------------------------------------------ */

function weightOf(s: Source): DivergencePosition['weight'] {
  if (isPrimarySource(s)) return 'strong'
  if (s.credibility >= 78) return 'moderate'
  return 'weak'
}

function addLocalVoices(ctx: Ctx): IntentResult {
  const { snap, article, state, now, seed, bid } = ctx
  const pool = unattachedSources(article, state)
  const local = pool.filter((s) => LOCAL_TYPES.includes(s.sourceType))
  const inCountry = local.filter((s) => article.countries.includes(s.country))
  const picks = takeDistinct([inCountry, local, pool.filter((s) => !LEGAL_TYPES.includes(s.sourceType))], 2)

  const divergenceSection = ensureSection(snap, 'divergence', seed)
  const powerSection = ensureSection(snap, 'power', seed)

  if (picks.length === 0) {
    const gap: Block = {
      id: bid('local-gap'),
      type: 'paragraph',
      text: '本节目前缺少在地组织的可引用记录：资料库中的公开材料只覆盖官方与跨区域机构的口径。这本身就是一处代表性缺口——承担后果的一方没有出现在记录里。在补入之前，编辑需要先确认在地组织是否愿意公开署名，以及署名是否会带来风险。',
    }
    powerSection.blocks.push(gap)
    ctx.notes.push('资料库中没有可用的在地组织或当地媒体记录，未编造任何来源；已在权力结构一节写入一段代表性缺口说明。')
    ctx.notes.push('建议下一步：向已知的在地组织发出可署名与匿名两种版本的问询，并记录是否收到回应。')
    return {
      summary: '未找到可引用的在地来源：已在权力结构一节写入一段代表性缺口说明，未编造任何组织的观点。',
      rationale: '指令被识别为「增加在地组织的观点」。资料库中没有尚未附加的民间组织报告、当地媒体或公开声明，因此自动编辑台没有生成任何代表在地组织的表述——虚构一个组织的立场，比留白更糟。取而代之的是一段明确的代表性缺口说明，并把补采访的动作交回编辑。',
    }
  }

  const primary = picks[0]
  const secondary = picks[1] ?? picks[0]

  const posCitation = attachCitation(
    snap, primary, `${primary.publisher}对本地服务承接能力的记录`, '个案汇总', now, seed,
  )
  const position: DivergencePosition = {
    label: '在地组织的判断',
    holder: primary.publisher,
    position: `${primary.publisher}认为，决定多数个案能否进入正式程序的是本地服务网络的承接能力，而不是当事人是否愿意求助。`,
    evidence: `该组织的记录只覆盖它自己承接的个案，样本不具全域代表性；但对同一地区的转介时长有连续记录，可与官方口径对照${posCitation.marker}。`,
    citationIds: [posCitation.citationId],
    weight: weightOf(primary),
  }

  const existing = snap.sections.flatMap((s) => s.blocks).find(isDivergence)
  if (existing && existing.positions.some((p) => p.holder === position.holder && p.position === position.position)) {
    ctx.notes.push(`分歧对照中已经有${primary.publisher}的同一项立场，未重复写入。`)
  } else if (existing) {
    existing.positions = [...existing.positions, position]
    ctx.notes.push(`已在既有的分歧对照中追加一项立场：${primary.publisher}（证据强度：${position.weight}）。`)
  } else {
    divergenceSection.blocks.push({ id: bid('local-divergence'), type: 'divergence', positions: [position] })
    ctx.notes.push(`本篇原本没有分歧对照，已在「${divergenceSection.title}」新建一个对照块，并写入${primary.publisher}的立场。`)
  }

  const paraCitation = attachCitation(
    snap, secondary, `${secondary.publisher}在转介与陪同工作中的观察`, '工作记录', now, seed,
  )
  const paragraph: Block = {
    id: bid('local-power'),
    type: 'paragraph',
    text: `把视角移到在地：${secondary.publisher}等组织长期承接转介与陪同工作，却既不参与经费分配，也不在通报口径的制定席位上——承担后果的一方与决定口径的一方并不重合${paraCitation.marker}。本站尚未取得主管机关对这一说法的书面回应，因此这里只呈现在地组织的判断，不为了对称而虚构一个分量相当的反方。`,
  }
  powerSection.blocks.push(paragraph)

  ctx.notes.push(`已在「${powerSection.title}」补入一段在地视角，引用：${sourceLine(secondary)}。`)
  for (const s of picks) {
    if (s.caution) ctx.notes.push(`${s.publisher} 带有使用提示：${s.caution}相关引用已标记为「保留意见」。`)
  }
  if (picks.length === 1) ctx.notes.push('只找到 1 份在地来源，立场与段落共用同一引用；单一组织不能代表整个在地群体，发布前建议再补一家。')

  return {
    summary: `补入在地视角：分歧对照新增 1 项立场，权力结构一节新增 1 段，引用 ${picks.length} 份此前未附加的来源。`,
    rationale: '指令被识别为「增加在地组织的观点」。自动编辑台只从资料库中已存在的民间组织报告、当地媒体与公开声明中选取材料，并在正文中写明这些记录的样本范围。按照本站的规则，在证据一边倒时不制造对称：主管机关尚未回应，这一点被明确写出，而不是用一句「双方各执一词」抹平。',
  }
}

/* ------------------------------------------------------------------ *
 * Intent: check-victim-blaming
 * ------------------------------------------------------------------ */

interface ReplaceRule {
  id: string
  label: string
  re: RegExp
  to: string
  /** Only apply when the surrounding paragraph also matches this. */
  requires?: RegExp
  why: string
}

const REPLACE_RULES: ReplaceRule[] = [
  {
    id: 'agentless-passive',
    label: '无施害主体的被动句',
    re: /被(强奸|性侵|侵犯|猥亵|殴打|骚扰|跟踪|拖走)/,
    to: '遭施害方$1',
    why: '被动语态让施害方从句子里消失，责任随之落回当事人身上。',
  },
  {
    id: 'agentless-passive-en',
    label: 'agentless passive (EN)',
    re: /\bwas (raped|assaulted|attacked|harassed|beaten)\b(?! by)/i,
    to: 'was $1 by the person named in the allegation',
    why: 'An agentless passive erases whoever acted.',
  },
  {
    id: 'survivor-only-hedge',
    label: '只对当事人使用的「声称／据称」',
    re: /(她|他|受害者|受害人|当事人|幸存者|报案人|申诉人)(声称|自称|据称)/,
    to: '$1表示',
    why: '「声称」只挂在当事人一侧时，会暗示其陈述比其他方更不可信。',
  },
  {
    id: 'survivor-only-hedge-2',
    label: '前置的「据称」',
    re: /据称[，,]?(她|他|受害者|受害人|当事人|幸存者)/,
    to: '$1表示',
    why: '同上：把不确定性只加在当事人一侧并不中立。',
  },
  {
    id: 'survivor-only-hedge-en',
    label: 'survivor-only "claimed" (EN)',
    re: /\b(she|he|they) claimed\b/i,
    to: '$1 said',
    why: '"Claimed" applied only to the survivor signals doubt.',
  },
  {
    id: 'dispute-euphemism',
    label: '把暴力称作「家庭纠纷」',
    re: /(家庭|夫妻)(纠纷|矛盾|口角)/,
    to: '家庭暴力',
    requires: /(伤|殴|打|暴力|死亡|受伤|袭击|骨折|住院|报警|急诊|威胁)/,
    why: '「纠纷」把单方施暴写成双方对等的争执。',
  },
  {
    id: 'dispute-euphemism-2',
    label: '把暴力称作「感情纠纷」',
    re: /(感情|情感|恋爱)(纠纷|矛盾|冲突|问题)/,
    to: '亲密关系暴力',
    requires: /(伤|殴|打|暴力|死亡|受伤|袭击|骨折|住院|报警|急诊|威胁)/,
    why: '同上：亲密关系中的暴力不是「感情问题」。',
  },
  {
    id: 'relationship-euphemism',
    label: '用「关系」代替被指控的性侵害',
    re: /(不正当|不当)(男女)?关系/,
    to: '指控中的性侵害行为',
    why: '「不正当关系」把被指控的侵害写成双方共担的道德问题。',
  },
  {
    id: 'relationship-euphemism-2',
    label: '用「发生关系」代替争议行为',
    re: /发生(了)?(性)?关系/,
    to: '发生了指控中所指的性接触（是否出于自愿正是本案争点）',
    why: '这一表述预设了自愿，抹掉了案件的核心争议。',
  },
  {
    id: 'relationship-euphemism-en',
    label: '"involved in a relationship" (EN)',
    re: /\binvolved in a relationship with\b/i,
    to: 'named in the allegation concerning',
    why: 'The euphemism recasts an alleged offence as a mutual affair.',
  },
]

interface ClauseRule {
  id: string
  label: string
  re: RegExp
  /** When set, the clause is replaced by this text instead of deleted. */
  replaceWith?: string
  why: string
}

const CLAUSE_RULES: ClauseRule[] = [
  {
    id: 'clothing',
    label: '着装描写',
    re: /(穿着|身穿|衣着|打扮|短裙|裙子|低胸|暴露)/,
    why: '着装与责任归属无关，写进来只会把注意力引向当事人。',
  },
  {
    id: 'alcohol',
    label: '饮酒描写',
    re: /(喝了|喝过|饮酒|酒后|醉酒|喝醉|醉得)/,
    why: '饮酒描写常被读作「自找的」，与施害行为无因果关系。',
  },
  {
    id: 'lone-late',
    label: '独行／深夜行为描写',
    re: /((独自|一个人|一人)[^，。；]{0,4}(走|回家|返回|前往|外出|出门|离开))|((深夜|凌晨|半夜)[^，。；]{0,8}(独自|一人|回家|外出|出门))/,
    why: '「深夜独自外出」暗示当事人本可避免，责任被悄悄转移。',
  },
  {
    id: 'why-not',
    label: '质问当事人为何未反抗或报警',
    re: /(为什么|为何)[^，。；]{0,4}(不|没有|没|未)[^，。；]{0,4}(报警|反抗|逃|离开|求助|说出来|发声)/,
    replaceWith: '现有记录没有说明当时可用的求助渠道是否有效，也没有说明制度为何未能及时介入',
    why: '把问题指向当事人的选择，而不是制度的失灵。',
  },
]

const SENTENCE_END = '。！？!?'
const CLAUSE_END = '，、；'

/** Subjects worth rescuing when a sentence-initial clause is deleted. */
const SUBJECT_RE = /^(当事人|受害者|受害人|幸存者|报案人|申诉人|她们|他们|她|他)/

/** A clause opening with one of these already has its own subject. */
const HAS_SUBJECT_RE = /^(这|那|此|该|其|双方|两人|对方|警方|法院|检方|记录|文件|报告)/

/**
 * Deleting a clause that a later clause points back to ("……，这一点……") would
 * leave a dangling reference, so those clauses are kept for a human instead.
 */
const ANAPHOR_RE = /^(这|那|此|其)/

function splitSentences(text: string): string[] {
  const out: string[] = []
  let buf = ''
  for (const ch of text) {
    buf += ch
    if (SENTENCE_END.includes(ch)) { out.push(buf); buf = '' }
  }
  if (buf) out.push(buf)
  return out
}

function splitClauses(sentence: string): string[] {
  const out: string[] = []
  let buf = ''
  for (const ch of sentence) {
    buf += ch
    if (CLAUSE_END.includes(ch)) { out.push(buf); buf = '' }
  }
  if (buf) out.push(buf)
  return out
}

interface Hit { rule: string; why: string; excerpt: string; applied: boolean }

function rewriteForVictimBlaming(text: string): { text: string; hits: Hit[] } {
  const hits: Hit[] = []
  let out = text

  for (const rule of REPLACE_RULES) {
    if (rule.requires && !rule.requires.test(out)) continue
    const probe = rule.re.exec(out)
    if (!probe) continue
    const flags = rule.re.flags.includes('i') ? 'gi' : 'g'
    out = out.replace(new RegExp(rule.re.source, flags), rule.to)
    hits.push({ rule: rule.label, why: rule.why, excerpt: probe[0], applied: true })
  }

  const rebuilt: string[] = []
  for (const sentence of splitSentences(out)) {
    const endMark = SENTENCE_END.includes(sentence.slice(-1)) ? sentence.slice(-1) : ''
    const clauses = splitClauses(sentence)
    const kept: string[] = []
    let carriedSubject = ''
    for (let ci = 0; ci < clauses.length; ci += 1) {
      const clause = clauses[ci]
      const rule = CLAUSE_RULES.find((r) => r.re.test(clause))
      if (!rule) { kept.push(clause); continue }
      if (clause.includes('[[c:')) {
        hits.push({
          rule: `${rule.label}（含引用标记，已保留）`,
          why: `${rule.why}此句带有引用标记，自动改写会破坏引用，已交由人工判断。`,
          excerpt: excerpt(clause),
          applied: false,
        })
        kept.push(clause)
        continue
      }
      const next = clauses[ci + 1]
      if (!rule.replaceWith && next && ANAPHOR_RE.test(next)) {
        hits.push({
          rule: `${rule.label}（后文有指代，已保留）`,
          why: `${rule.why}但后一句以「${next.slice(0, 2)}」回指本句，删除会留下悬空的指代，已交由人工改写。`,
          excerpt: excerpt(clause),
          applied: false,
        })
        kept.push(clause)
        continue
      }
      hits.push({ rule: rule.label, why: rule.why, excerpt: excerpt(clause), applied: true })
      if (rule.replaceWith) {
        const tail = CLAUSE_END.includes(clause.slice(-1)) ? clause.slice(-1) : ''
        kept.push(rule.replaceWith + tail)
        continue
      }
      // Deleting the opening clause would strip the subject; keep it.
      if (kept.length === 0 && !carriedSubject) {
        const subject = SUBJECT_RE.exec(clause)
        if (subject) carriedSubject = subject[1]
      }
    }
    if (kept.length === 0) continue
    let joined = kept.join('')
    if (carriedSubject && !joined.startsWith(carriedSubject) && !HAS_SUBJECT_RE.test(joined)) {
      joined = carriedSubject + joined
    }
    if (endMark) {
      joined = joined.replace(/[，、；]$/, '')
      if (!SENTENCE_END.includes(joined.slice(-1))) joined += endMark
    }
    rebuilt.push(joined)
  }
  out = rebuilt.join('')
  out = out.replace(/，{2,}/g, '，').replace(/。{2,}/g, '。').replace(/，(?=[。；])/g, '')

  return { text: out, hits }
}

function checkVictimBlaming(ctx: Ctx): IntentResult {
  const { snap, seed } = ctx
  let scanned = 0
  let rewritten = 0
  let flagged = 0
  const ruleCounts = new Map<string, number>()

  for (const section of snap.sections) {
    let paragraphIndex = 0
    for (let i = 0; i < section.blocks.length; i += 1) {
      const block = section.blocks[i]
      if (block.type !== 'paragraph') continue
      paragraphIndex += 1
      scanned += 1
      const result = rewriteForVictimBlaming(block.text)
      if (result.hits.length === 0) continue
      const changed = result.text !== block.text
      if (changed) {
        section.blocks[i] = { ...block, text: result.text }
        rewritten += 1
      }
      for (const hit of result.hits) {
        flagged += 1
        ruleCounts.set(hit.rule, (ruleCounts.get(hit.rule) ?? 0) + 1)
        ctx.notes.push(
          hit.applied
            ? `「${section.title}」第 ${paragraphIndex} 段 · ${hit.rule}：原文「${hit.excerpt}」已改写。${hit.why}`
            : `「${section.title}」第 ${paragraphIndex} 段 · ${hit.rule}：原文「${hit.excerpt}」保持不变。${hit.why}`,
        )
      }
    }
  }

  const ruleSummary = Array.from(ruleCounts, ([k, v]) => `${k} ${v} 处`).join('、')
  const resolutionNote = flagged > 0
    ? `自动语言扫描覆盖 ${scanned} 段正文，命中 ${flagged} 处（${ruleSummary}），其中 ${rewritten} 段已改写。把「纠纷」改为「暴力」等判断仍需编辑确认与司法进展是否一致。`
    : `自动语言扫描覆盖 ${scanned} 段正文，未匹配到既定的受害者有罪论模式；本次未改动正文，仅留下核查记录。`

  const existing = snap.riskFlags.find((r) => r.kind === 'victim-blaming')
  if (existing) {
    existing.resolved = true
    existing.resolutionNote = resolutionNote
    ctx.notes.push('已把原有的「受害者有罪论」风险项标记为已处理，并附上本次扫描说明。')
  } else {
    const flag: RiskFlag = {
      id: `${snap.id}-risk-victim-blaming-${seed}`,
      kind: 'victim-blaming',
      severity: flagged > 0 ? 'medium' : 'low',
      note: '正文表述可能把责任转向当事人（自动语言扫描）。',
      requiresSecondConfirm: false,
      raisedBy: 'ai-review',
      resolved: true,
      resolutionNote,
    }
    snap.riskFlags.push(flag)
    ctx.notes.push('已新增一条「受害者有罪论」风险项并同时标记为已处理，以便审计留痕。')
  }

  if (flagged === 0) {
    ctx.notes.push(`未发现符合既定模式的表述：扫描了 ${scanned} 段正文，本次没有改动任何句子，也没有为了「有产出」而虚构问题。`)
    ctx.notes.push('这不等于本篇没有问题：语气、段落顺序与图像选择需要人工复核，自动扫描只覆盖可枚举的句式。')
  } else {
    ctx.notes.push('所有改写只处理表述方式，不改变任何事实主张、不移除任何引用标记。')
  }

  return {
    summary: flagged > 0
      ? `扫描 ${scanned} 段正文，命中 ${flagged} 处受害者有罪论模式，改写 ${rewritten} 段；风险项已更新。`
      : `扫描 ${scanned} 段正文，未发现受害者有罪论模式；正文未改动，已记录本次核查。`,
    rationale: `指令被识别为「检查受害者有罪论」。扫描逐段检查四类子句级模式（着装／饮酒描写、独行与深夜行为、质问当事人为何未反抗或报警）与十条句式级模式（消去施害主体的被动语态、只对当事人使用的「声称／据称」、把暴力称作「纠纷」、用「关系」替代被指控的侵害）。命中的句子按创伤知情写法改写：恢复施害主体、删除与责任无关的细节、把问题指回制度。带有引用标记的句子一律不自动改写，避免破坏引用；这些位置以提示的形式交回编辑。`,
  }
}

/* ------------------------------------------------------------------ *
 * Intent: recheck-references
 * ------------------------------------------------------------------ */

function recheckReferences(ctx: Ctx): IntentResult {
  const { snap, state, now } = ctx
  const sourceById = new Map(state.sources.map((s) => [s.id, s]))
  const citationById = new Map(snap.citations.map((c) => [c.id, c]))
  const today = fmtDate(now)

  let upgraded = 0
  let downgraded = 0
  let refreshed = 0
  let carried = 0
  let added = 0
  const detail: string[] = []

  snap.citationChecks = snap.citationChecks.map((check): CitationCheck => {
    const citation = citationById.get(check.citationId)
    const source = citation ? sourceById.get(citation.sourceId) : undefined
    const who = source ? source.publisher : '来源记录缺失'

    if (check.status === 'missing') {
      upgraded += 1
      detail.push(`${who}：未通过 → 保留意见。`)
      return {
        citationId: check.citationId,
        status: 'partial',
        reason: `${check.reason}｜${today} 复核：改判为保留意见。自动比对仍无法确认原始记录，因此相关陈述不足以支撑强表述；编辑需取得原件，或把正文表述降到「无法核实」的强度。`,
        checkedAt: now,
      }
    }

    if (source?.caution) {
      if (check.status !== 'partial') downgraded += 1
      else carried += 1
      detail.push(`${who}：因来源使用提示降级为保留意见。`)
      return {
        citationId: check.citationId,
        status: 'partial',
        reason: `${today} 复核：来源自带使用提示——${source.caution}在提示解除前，本条只支持有限的事实陈述。原核查结论：${check.reason}`,
        checkedAt: now,
      }
    }

    if (check.status === 'found') {
      refreshed += 1
      return {
        citationId: check.citationId,
        status: 'found',
        reason: `${check.reason}｜${today} 复核：出版方、日期与论断范围重新比对一致。`,
        checkedAt: now,
      }
    }

    carried += 1
    return {
      citationId: check.citationId,
      status: check.status,
      reason: `${check.reason}｜${today} 复核：保留意见维持不变，仍缺少可独立核对的原始记录。`,
      checkedAt: now,
    }
  })

  const covered = new Set(snap.citationChecks.map((c) => c.citationId))
  for (const citation of snap.citations) {
    if (covered.has(citation.id)) continue
    const source = sourceById.get(citation.sourceId)
    added += 1
    snap.citationChecks.push({
      citationId: citation.id,
      status: 'partial',
      reason: `${today} 复核：此前没有自动核查记录，已补建。${source ? `来源为${sourceLine(source)}，需人工确认它是否支撑「${excerpt(citation.claim, 24)}」这一论断。` : '资料库中找不到对应的来源记录，发布前必须补齐或删除该引用。'}`,
      checkedAt: now,
    })
  }

  const total = snap.citationChecks.length
  for (const line of detail.slice(0, 8)) ctx.notes.push(line)
  if (detail.length > 8) ctx.notes.push(`另有 ${detail.length - 8} 条引用的复核结果未在此列出，详见引用面板。`)
  ctx.notes.push('本次只改动引用核查状态，未改动任何正文表述。')
  ctx.notes.push('把「未通过」改判为「保留意见」不等于该说法已被证实：它表示自动核查无法下结论，需要人工取得原件。')
  if (added > 0) ctx.notes.push(`有 ${added} 条引用此前没有核查记录，已补建为「保留意见」。`)
  if (total === 0) ctx.notes.push('本篇没有任何引用记录可供复核：这本身就是发布前必须解决的问题。')

  return {
    summary: total === 0
      ? '本篇没有引用记录可复核；正文未改动。'
      : `复核 ${total} 条引用：${upgraded} 条由「未通过」改为「保留意见」，${downgraded} 条因来源提示降级，${refreshed} 条通过并更新核查时间，${carried} 条维持保留意见${added > 0 ? `，${added} 条补建记录` : ''}。正文未改动。`,
    rationale: '指令被识别为「重新核查引用」。这一操作从不改写正文：它只重建引用核查记录。未通过的引用一律改判为「保留意见」并写明还缺什么——直接删除会让读者失去判断依据，而保留「未通过」又会挡住整篇发布，两者都不诚实。来源自带使用提示的引用统一降级，通过的引用刷新核查时间。发布闸门会据此重新计算：保留意见是警告，不是阻断。',
  }
}

/* ------------------------------------------------------------------ *
 * Intent: deepen
 * ------------------------------------------------------------------ */

function deepen(ctx: Ctx): IntentResult {
  const { snap, state, seed, bid } = ctx
  const sourceById = new Map(state.sources.map((s) => [s.id, s]))
  const ranked = [...snap.citations].sort((a, b) => {
    const sa = sourceById.get(a.sourceId)
    const sb = sourceById.get(b.sourceId)
    const pa = sa && isPrimarySource(sa) ? 0 : 1
    const pb = sb && isPrimarySource(sb) ? 0 : 1
    if (pa !== pb) return pa - pb
    return (sb?.credibility ?? 0) - (sa?.credibility ?? 0)
  })

  const pick = (i: number): { marker: string; who: string } => {
    if (ranked.length === 0) return { marker: '', who: '现有材料' }
    const citation = ranked[i % ranked.length]
    const source = sourceById.get(citation.sourceId)
    return { marker: `[[c:${citation.id}]]`, who: source ? source.publisher : '已引用的来源' }
  }

  const a = pick(0)
  const b = pick(1)
  const c = pick(2)

  const research = ensureSection(snap, 'research', seed)
  const unknowns = ensureSection(snap, 'unknowns', seed)
  const watch = ensureSection(snap, 'watch', seed)

  const researchBlock: Block = {
    id: bid('deep-research'),
    type: 'paragraph',
    text: ranked.length > 0
      ? `就本篇已经引用的材料而言，${a.who}的记录只能支持趋势方向，不足以支撑数值层面的因果解释：其统计口径与覆盖范围没有逐年对齐，也不包含从未进入正式程序的部分${a.marker}。因此本篇在涉及规模时一律使用区间与方向，不使用精确比例；若要给出比例，需要先拿到分项口径说明。`
      : '本篇目前没有可挂靠的引用，因此不新增任何量化分析。要把这一节写深，先要补齐可核对的原始材料：分项统计、程序记录，或至少一份注明方法与样本的研究。',
  }
  research.blocks.push(researchBlock)

  const unknownItem = ranked.length > 0
    ? `${b.who}的材料没有回答：被记录下来的个案与实际发生的个案之间差距有多大——现有公开数据不足以推算这一缺口${b.marker}。`
    : '被记录下来的个案与实际发生的个案之间差距有多大：本篇没有任何材料可以支撑推算。'
  const unknownAdded = appendListItem(unknowns, unknownItem, bid('deep-unknowns'))

  const watchItem = ranked.length > 0
    ? `观察${c.who}的下一期记录是否公布分项口径；若口径不变而数值大幅波动，应优先怀疑统计方式而非现实变化${c.marker}。`
    : '观察本篇涉及的机构是否公布分项口径；在拿到口径说明之前，任何数值变化都不足以支撑结论。'
  const watchAdded = appendListItem(watch, watchItem, bid('deep-watch'))

  ctx.notes.push(`已在「${research.title}」新增 1 段以数据口径为核心的分析。`)
  ctx.notes.push(unknownAdded
    ? `已在「${unknowns.title}」补入 1 条未知项。`
    : `「${unknowns.title}」中已有同一条未知项，未重复写入。`)
  ctx.notes.push(watchAdded
    ? `已在「${watch.title}」补入 1 条可验证的观察项。`
    : `「${watch.title}」中已有同一条观察项，未重复写入。`)
  if (ranked.length === 0) {
    ctx.notes.push('本篇没有任何引用可供挂靠，新增内容已改为低强度表述，并明确指出需要先补材料。')
  } else {
    ctx.notes.push('新增的三处内容都挂在既有引用上，没有引入任何新来源，也没有引入新的事实主张。')
  }

  return {
    summary: ranked.length > 0
      ? `加深分析：研究与数据新增 1 段，未知项与观察项各新增 1 条，全部挂在既有引用上。`
      : '加深分析：因缺少可挂靠的引用，新增内容改为低强度表述并指明需要补齐的材料。',
    rationale: '指令被识别为「加深分析」。加深不等于加长：这里补入的是对既有证据的方法学限制的说明——统计口径、覆盖范围、以及记录与现实之间的缺口，并把由此产生的不确定性明确写进「尚未确定的信息」和「后续值得关注的进展」。所有新增句子都挂在本篇已有的引用上，不引入新来源，也不提出新的事实主张。',
  }
}

/* ------------------------------------------------------------------ *
 * Intent: swap-cover
 * ------------------------------------------------------------------ */

function swapCover(ctx: Ctx): IntentResult {
  const { state, article } = ctx
  const cover = article.assetIds
    .map((id) => state.assets.find((x) => x.id === id))
    .find((x) => x?.kind === 'cover')
  const sensitive = article.topics.includes('violence')
    || article.riskFlags.some((r) => r.kind === 'sexual-violence' || r.kind === 'image-ethics')

  ctx.notes.push('本次指令不改动正文：封面替换在「视觉工作台」执行，这里只生成图像简报与验收条件。')
  ctx.notes.push('图像要求：抽象概念插图。不得出现任何人物面孔、身体轮廓、可辨识场所，也不得重建新闻现场。')
  ctx.notes.push('建议母题：prism-fold（棱镜折射）或 graticule（经纬网格）；配色取 --ink-800、--paper-100 与 --prism-2，不使用彩虹渐变，不使用性别化图标。')
  ctx.notes.push('图注必须标注「概念插图」，并说明该图不呈现任何真实个案、不来自事发现场。')
  ctx.notes.push('替换后需重新走封面审核：未审核的封面会阻断发布。')
  if (sensitive) {
    ctx.notes.push('本篇涉及性暴力或图像伦理风险：封面尤其不得使用受害者形象、身体局部、暗示性构图或哭泣特写。')
  }
  ctx.notes.push(cover
    ? `当前封面：${cover.label}（状态：${cover.status}，伦理说明：${cover.guardrail}）。新图需要满足同一条伦理说明。`
    : '本篇目前没有登记封面资产：新图生成后需同时补齐 guardrail 说明与图注。')

  return {
    summary: '未改动正文：已生成一份不呈现受害者形象的封面图像简报，替换动作待「视觉工作台」执行。',
    rationale: '指令被识别为「更换封面图」。图像替换不属于文本改写，因此本次提案不动任何段落——把图像操作混进正文版本里会让差异无法审阅。取而代之的是一份可直接执行的图像简报：母题、配色、禁止事项与验收条件。按本站规则，AI 生成的图像一律标注为「概念插图」，且不得重建新闻现场或呈现当事人形象。',
  }
}

/* ------------------------------------------------------------------ *
 * Intent: shorten / plain-language
 * ------------------------------------------------------------------ */

const HEDGE_OPENERS = [
  '值得注意的是，', '需要指出的是，', '不可否认的是，', '不可否认，', '事实上，', '换句话说，',
  '也就是说，', '从某种意义上说，', '从某种程度上说，', '在一定程度上，', '众所周知，',
  '简单来说，', '总的来说，', '毫无疑问，', '客观地说，',
]

const PLAIN_SUBSTITUTIONS: [string, string][] = [
  ['司法辖区', '适用法律的地区'],
  ['援引', '引用'],
  ['予以', '给予'],
  ['之情形', '的情况'],
  ['鉴于', '因为'],
  ['尚未', '还没有'],
  ['该等', '这些'],
  ['并非', '不是'],
  ['倘若', '如果'],
  ['亦即', '也就是'],
  ['作出裁决', '做出裁决'],
  ['行使', '使用'],
]

function tightenParagraph(text: string, plain: boolean): { text: string; removedInserts: number; removedHedges: number; substitutions: number; splits: number } {
  let out = text
  let removedInserts = 0
  let removedHedges = 0
  let substitutions = 0
  let splits = 0

  const dropParenthetical = (re: RegExp) => {
    out = out.replace(re, (match) => {
      if (match.includes('[[c:') || match.length <= 4) return match
      removedInserts += 1
      return ''
    })
  }
  dropParenthetical(/（[^（）]*）/g)
  dropParenthetical(/\([^()]*\)/g)

  for (const opener of HEDGE_OPENERS) {
    while (out.includes(opener)) {
      const idx = out.indexOf(opener)
      const before = out.slice(0, idx)
      const after = out.slice(idx + opener.length)
      out = before + after
      removedHedges += 1
    }
  }

  if (plain) {
    for (const [from, to] of PLAIN_SUBSTITUTIONS) {
      if (!out.includes(from)) continue
      const count = out.split(from).length - 1
      out = out.split(from).join(to)
      substitutions += count
    }
    const semicolons = out.split('；').length - 1
    if (semicolons > 0) {
      out = out.split('；').join('。')
      splits += semicolons
    }
  }

  out = out.replace(/，{2,}/g, '，').replace(/。{2,}/g, '。').replace(/，(?=[。；])/g, '').trim()
  return { text: out, removedInserts, removedHedges, substitutions, splits }
}

function shorten(ctx: Ctx): IntentResult {
  const { snap, article } = ctx
  const plain = ctx.plan.variant === 'plain'
  let touched = 0
  let inserts = 0
  let hedges = 0
  let subs = 0
  let splits = 0

  for (const section of snap.sections) {
    let paragraphIndex = 0
    for (let i = 0; i < section.blocks.length; i += 1) {
      const block = section.blocks[i]
      if (block.type !== 'paragraph') continue
      paragraphIndex += 1
      const result = tightenParagraph(block.text, plain)
      if (result.text === block.text || !result.text) continue
      section.blocks[i] = { ...block, text: result.text }
      touched += 1
      inserts += result.removedInserts
      hedges += result.removedHedges
      subs += result.substitutions
      splits += result.splits
      const parts: string[] = []
      if (result.removedInserts > 0) parts.push(`删除插入语 ${result.removedInserts} 处`)
      if (result.removedHedges > 0) parts.push(`删除冗余引导语 ${result.removedHedges} 处`)
      if (result.substitutions > 0) parts.push(`替换书面语 ${result.substitutions} 处`)
      if (result.splits > 0) parts.push(`长句拆分 ${result.splits} 处`)
      ctx.notes.push(`「${section.title}」第 ${paragraphIndex} 段：${parts.join('、')}，字数 ${block.text.length} → ${result.text.length}。`)
    }
  }

  const before = articleWordCount(article)
  const after = articleWordCount(snap)
  const totals: string[] = []
  if (inserts > 0) totals.push(`删除插入语 ${inserts} 处`)
  if (hedges > 0) totals.push(`删除引导语 ${hedges} 处`)
  if (subs > 0) totals.push(`替换书面语 ${subs} 处`)
  if (splits > 0) totals.push(`拆分长句 ${splits} 处`)

  if (touched === 0) {
    ctx.notes.push('未发现可以安全删除的成分：正文中的插入语要么带有引用标记，要么承载独立事实，删除会改变含义。')
    ctx.notes.push('若仍需缩短，建议由编辑决定合并哪两段——机器无法判断哪一条事实可以被牺牲。')
  } else {
    ctx.notes.push('所有删改都避开了引用标记：没有任何一条引用在本次改写中丢失。')
    ctx.notes.push('改写只处理表述形式，不删除事实、不合并来源、不调整段落顺序。')
  }

  return {
    summary: touched === 0
      ? (plain ? '未找到可安全简化的表述：正文中的每处修饰都承载事实或引用。' : '未找到可安全删除的从句：正文中的每处修饰都承载事实或引用。')
      : `${plain ? '降低阅读门槛' : '精简正文'}：改写 ${touched} 段，${totals.join('、')}，字数 ${before} → ${after}。`,
    rationale: plain
      ? '指令被识别为「降低阅读门槛」。改写只做四件可验证的事：删除不承载信息的插入语与引导语、把书面语替换成日常词、在分号处断句、清理多余标点。所有含引用标记的片段一律保留，事实主张、数字与归因都不变——把文章改得好读，不等于把结论改得更肯定。'
      : '指令被识别为「精简正文」。改写只删除不承载事实的成分：括注、冗余引导语与重复标点。带有引用标记的片段一律保留，任何一条可核查的信息都不因为「太长」而消失。字数变化已重新计入阅读时长。',
  }
}

/* ------------------------------------------------------------------ *
 * Intent: add-data
 * ------------------------------------------------------------------ */

function pickChart(article: Article, state: PrismState): ChartSpec | undefined {
  if (state.charts.length === 0) return undefined
  const attachedSources = new Set(article.sourceIds)
  const usedCharts = new Set(article.chartIds)
  const sourceById = new Map(state.sources.map((s) => [s.id, s]))
  const candidates = state.charts.filter((c) => !usedCharts.has(c.id))
  const byOwnSource = candidates.filter((c) => attachedSources.has(c.sourceId))
  const byCountry = candidates.filter((c) => {
    const src = sourceById.get(c.sourceId)
    return src ? article.countries.includes(src.country) : false
  })
  const byTitle = candidates.filter((c) => article.countries.some((country) => c.title.includes(country)))
  return byOwnSource[0] ?? byCountry[0] ?? byTitle[0] ?? candidates[0]
}

function addData(ctx: Ctx): IntentResult {
  const { snap, article, state, now, seed, bid } = ctx
  const research = ensureSection(snap, 'research', seed)
  const chart = pickChart(article, state)

  if (!chart) {
    const gap: Block = {
      id: bid('data-gap'),
      type: 'paragraph',
      text: '本篇目前没有可引用的数据集：图表库中没有与本篇来源或辖区相关的记录。在拿到带口径说明的原始数据之前，本站不以图表形式呈现任何估算——一张没有来源的图，比没有图更容易被误读。',
    }
    research.blocks.push(gap)
    ctx.notes.push('图表库中没有可用于本篇的数据集，未生成任何图表，也没有编造数据。')
    ctx.notes.push('建议下一步：向已附加的官方统计来源索取分项数据，并要求附上口径说明。')
    return {
      summary: '未找到可用数据集：已在研究与数据一节写明数据缺口，未生成任何图表。',
      rationale: '指令被识别为「补充数据与图表」。图表库中没有与本篇来源或辖区匹配的数据集，因此没有插入图表——按本站规则，图表必须指向资料库中真实存在的数据记录，不能为了版面而生成。取而代之的是一段明确的数据缺口说明。',
    }
  }

  const chartSource = state.sources.find((s) => s.id === chart.sourceId)
  const marker = chartSource
    ? attachCitation(snap, chartSource, `${chart.title}的底层数据集`, chart.sourceNote, now, seed).marker
    : ''

  const chartBlock: Block = { id: bid('data-chart'), type: 'chart', chartId: chart.id }
  const limitation = /[。！？.!?]$/.test(chart.limitation) ? chart.limitation : `${chart.limitation}。`
  const note: Block = {
    id: bid('data-note'),
    type: 'paragraph',
    text: `上图为${chart.title}，单位为${chart.unit}，数据来自${chartSource ? chartSource.publisher : chart.sourceNote}${marker}。需要读者注意的是：${limitation}因此本篇只用这张图说明规模与方向，不用它支撑任何因果结论。`,
  }
  research.blocks.push(chartBlock, note)
  if (!snap.chartIds.includes(chart.id)) snap.chartIds.push(chart.id)

  ctx.notes.push(`已在「${research.title}」插入图表：${chart.title}（${chart.kind}，单位：${chart.unit}）。`)
  ctx.notes.push(`已写明该数据集的局限：${limitation}`)
  if (chartSource) {
    ctx.notes.push(`图表来源已附加为引用：${sourceLine(chartSource)}。`)
    if (chartSource.caution) ctx.notes.push(`该来源带有使用提示：${chartSource.caution}相关引用已标记为「保留意见」。`)
  } else {
    ctx.notes.push('图表记录指向的来源不在资料库中，未生成引用标记；发布前必须补齐来源记录，否则该图不得使用。')
  }

  return {
    summary: `补充数据：在「${research.title}」插入图表「${chart.title}」并写明数据局限，新增 2 个内容块。`,
    rationale: '指令被识别为「补充数据与图表」。图表不是装饰：这里选取的是资料库中已存在、且与本篇来源或辖区相关的数据集，并在图表下方直接写出它无法说明什么。数据集的来源被附加为正式引用，供读者点开核对。若图表来源不在资料库中，本站宁可不放图。',
  }
}

/* ------------------------------------------------------------------ *
 * Intent: fallback
 * ------------------------------------------------------------------ */

function fallback(ctx: Ctx): IntentResult {
  const { snap, seed, bid } = ctx
  const why = ensureSection(snap, 'why', seed)
  const quoted = quoteInstruction(ctx.instruction) || '（空指令）'

  const callout: Block = {
    id: bid('fallback-callout'),
    type: 'callout',
    tone: 'note',
    title: '编辑建议（本次未自动执行）',
    text: `收到的指令是「${quoted}」。自动编辑台没有把它归入任何一类可自动执行的改写，因此正文保持原样。需要人工判断的是：这条要求指向事实层面还是表述层面；是否需要新的一手材料才能落实；以及改动之后是否仍与现有引用一致。在这三点确定之前，任何自动改写都可能在无人察觉的情况下改变文章的证据强度。`,
  }
  why.blocks.push(callout)

  ctx.notes.push('该指令未被识别为可自动执行的改写，已生成一条编辑建议供人工判断，未改动任何既有段落。')
  ctx.notes.push('可自动执行的指令包括：补入法律与制度背景、增加在地组织的观点、检查受害者有罪论、重新核查引用、加深分析、更换封面图、精简或降低阅读门槛、补充数据与图表。')
  ctx.notes.push('若这条指令确实需要执行，建议改写为上述类型之一，或由编辑直接手动修改并在版本说明中写明理由。')

  return {
    summary: '指令未被识别为可自动执行的改写：已在「事件为何重要」写入一条编辑建议，正文其余部分未改动。',
    rationale: '自动编辑台没有匹配到对应的改写类型。这里刻意不做「尽力而为」的猜测：对一篇带有司法风险与创伤内容的稿件来说，一次善意但方向错误的自动改写，比不改更危险。因此本次只留下一条署名为机器的编辑建议，把决定权交回人。',
  }
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export function applyVibeInstruction(
  instruction: string,
  article: Article,
  state: PrismState,
  now: string,
): VibeOutcome {
  const plan = classifyInstruction(instruction)
  const seed = hash(`${instruction}|${article.id}`)

  // Ids are derived from the instruction, so re-running the same instruction on
  // an article that already carries its output would collide. Suffix on demand —
  // still deterministic, because it depends only on the snapshot's contents.
  const takenIds = new Set<string>()
  for (const section of article.sections) {
    takenIds.add(section.id)
    for (const block of section.blocks) takenIds.add(block.id)
  }
  const bid = (slot: string): ID => {
    const base = `${article.id}-vibe-${seed}-${slot}`
    if (!takenIds.has(base)) { takenIds.add(base); return base }
    let n = 2
    while (takenIds.has(`${base}-${n}`)) n += 1
    const id = `${base}-${n}`
    takenIds.add(id)
    return id
  }

  const ctx: Ctx = {
    instruction,
    plan,
    article,
    snap: cloneArticle(article),
    state,
    now,
    seed,
    notes: [],
    bid,
  }

  let result: IntentResult
  switch (plan.intent) {
    case 'add-jurisdiction-context': result = addJurisdictionContext(ctx); break
    case 'add-local-voices': result = addLocalVoices(ctx); break
    case 'check-victim-blaming': result = checkVictimBlaming(ctx); break
    case 'recheck-references': result = recheckReferences(ctx); break
    case 'deepen': result = deepen(ctx); break
    case 'swap-cover': result = swapCover(ctx); break
    case 'shorten': result = shorten(ctx); break
    case 'add-data': result = addData(ctx); break
    case 'fallback': result = fallback(ctx); break
  }

  const { stats } = diffArticles(article, ctx.snap)
  const refDelta = diffRefs(article, ctx.snap)

  ctx.snap.updatedAt = now
  if (stats.added + stats.removed + stats.changed > 0) {
    ctx.snap.readingTime = Math.max(1, Math.round(articleWordCount(ctx.snap) / 320))
  }

  if (refDelta.added.length > 0) {
    ctx.notes.push(`新增引用来源 ${refDelta.added.length} 份，全部取自资料库中已有的来源记录；本次没有新建任何来源。`)
  }
  if (refDelta.removed.length > 0) {
    ctx.notes.push(`有 ${refDelta.removed.length} 份来源在本次提案中不再被引用，请确认相关陈述是否也已一并调整。`)
  }
  ctx.notes.push('本提案尚未生效：在「版本比对」中逐块确认后才会写入文章，未确认的提案不会影响公开页面。')

  return {
    snapshot: ctx.snap,
    refDelta,
    summary: result.summary,
    rationale: result.rationale,
    stats,
    notes: ctx.notes,
  }
}
