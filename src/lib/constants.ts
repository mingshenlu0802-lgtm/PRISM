import type { CitationCheckStatus, DecisionMeta, EngineOption, RiskKind, RiskSeverity, SectionKind, SourceType, Topic, TopicKey } from './types'

/* ------------------------------------------------------------------ *
 * Topics
 * ------------------------------------------------------------------ */

export const TOPICS: Topic[] = [
  { key: 'rights', zh: '女性主义与 LGBTQIA+ 权利', en: 'Feminist & LGBTQIA+ rights', hue: 'var(--topic-rights)', blurb: '法律地位、承认、结社自由与公民空间。' },
  { key: 'violence', zh: '性暴力、家暴与性骚扰', en: 'Sexual & domestic violence', hue: 'var(--topic-violence)', blurb: '以创伤知情、受害者为中心的方式报道。' },
  { key: 'repro', zh: '生育权与身体自主权', en: 'Reproductive rights & bodily autonomy', hue: 'var(--topic-repro)', blurb: '避孕、堕胎、孕产照护与强制绝育。' },
  { key: 'trans', zh: '跨性别权利与医疗', en: 'Trans rights & healthcare', hue: 'var(--topic-trans)', blurb: '法律性别承认、医疗可及性与循证争论。' },
  { key: 'hate', zh: '仇恨犯罪与网络暴力', en: 'Hate crime & online abuse', hue: 'var(--topic-hate)', blurb: '线下袭击、协同骚扰与平台治理。' },
  { key: 'equality', zh: '法律、政治、教育、医疗与职场平等', en: 'Equality across institutions', hue: 'var(--topic-equality)', blurb: '薪酬、代表性、照护劳动与制度歧视。' },
  { key: 'displacement', zh: '战争、移民与交叉边缘群体', en: 'War, migration & intersecting margins', hue: 'var(--topic-displacement)', blurb: '冲突性暴力、庇护程序与无国籍状态。' },
  { key: 'movement', zh: '运动内部的重要争议', en: 'Debates within the movements', hue: 'var(--topic-movement)', blurb: '策略、包容、资金与代表性的公开分歧。' },
]

export const TOPIC_MAP: Record<TopicKey, Topic> = Object.fromEntries(
  TOPICS.map((t) => [t.key, t]),
) as Record<TopicKey, Topic>

/* ------------------------------------------------------------------ *
 * Article section labels
 * ------------------------------------------------------------------ */

export const SECTION_LABEL: Record<SectionKind, { zh: string; en: string; note: string }> = {
  facts: { zh: '事件与核心事实', en: 'What happened', note: '只陈述可归因于具体来源的事实。' },
  context: { zh: '法律、历史与社会背景', en: 'Legal, historical & social context', note: '解释此事为何在该司法辖区以这种方式发生。' },
  power: { zh: '权力结构与交叉性分析', en: 'Power & intersectionality', note: '谁掌握决定权，谁承担后果。' },
  research: { zh: '相关研究与数据', en: 'Research & data', note: '注明研究方法、样本与局限。' },
  divergence: { zh: '不同来源之间的分歧', en: 'Where sources diverge', note: '呈现分歧，但不制造虚假平衡。' },
  unknowns: { zh: '尚未确定的信息', en: "What we don't know", note: '公开承认不确定性与取证限制。' },
  why: { zh: '事件为何重要', en: 'Why it matters', note: '分析而非说教；标明这是编辑判断。' },
  watch: { zh: '后续值得关注的进展', en: 'What to watch', note: '具体、可验证、有时间点的观察项。' },
}

export const SECTION_ORDER: SectionKind[] = [
  'facts', 'context', 'power', 'research', 'divergence', 'unknowns', 'why', 'watch',
]

/* ------------------------------------------------------------------ *
 * Sources
 * ------------------------------------------------------------------ */

export const SOURCE_TYPE_LABEL: Record<SourceType, { zh: string; en: string }> = {
  'primary-research': { zh: '原始研究', en: 'Primary research' },
  'legal-document': { zh: '法律文本', en: 'Legal document' },
  'court-ruling': { zh: '法院判决', en: 'Court ruling' },
  'government-data': { zh: '政府数据', en: 'Government data' },
  'international-body': { zh: '国际机构', en: 'International body' },
  'ngo-report': { zh: '民间组织报告', en: 'NGO report' },
  'local-media': { zh: '当地媒体', en: 'Local media' },
  'news-agency': { zh: '通讯社', en: 'News agency' },
  'academic-review': { zh: '学术综述', en: 'Academic review' },
  statement: { zh: '公开声明', en: 'Public statement' },
  'social-post': { zh: '社交平台内容', en: 'Social post' },
  other: { zh: '其他', en: 'Other' },
}

/** Ranking used when the console asks "够不够一手来源？" */
export const PRIMARY_TYPES: SourceType[] = [
  'primary-research', 'legal-document', 'court-ruling', 'government-data', 'international-body',
]

/* ------------------------------------------------------------------ *
 * Resource retrieval
 *
 * The desk searches for the cited resource and reports whether it could be
 * retrieved. Judging the source and the claim is editorial work.
 * ------------------------------------------------------------------ */

export const CHECK_LABEL: Record<CitationCheckStatus, {
  zh: string; en: string; tone: 'go' | 'warn' | 'stop'; means: string
}> = {
  found: {
    zh: '资源已找到', en: 'Located', tone: 'go',
    means: '来源存在且可取得，引用指向的位置能够打开。',
  },
  partial: {
    zh: '仅部分可得', en: 'Partial', tone: 'warn',
    means: '来源已找到，但引用指向的具体位置无法取得（附录未公开、扫描件不可读、页面已被替换）。',
  },
  missing: {
    zh: '资源未找到', en: 'Not found', tone: 'stop',
    means: '检索未能找到该资源。',
  },
}

/* ------------------------------------------------------------------ *
 * Risk
 * ------------------------------------------------------------------ */

export const RISK_LABEL: Record<RiskKind, { zh: string; en: string; guidance: string }> = {
  'sexual-violence': { zh: '性暴力内容', en: 'Sexual violence', guidance: '创伤知情写法；不描写侵害细节；不使用受害者影像。' },
  minors: { zh: '涉及未成年人', en: 'Minors involved', guidance: '不得出现可识别信息；核对当地对未成年人报道的法律限制。' },
  'active-litigation': { zh: '司法程序进行中', en: 'Active litigation', guidance: '区分指控与判决；核对报道限制令。' },
  'identity-exposure': { zh: '身份暴露风险', en: 'Identity exposure', guidance: '检查地点、职业、亲属关系等可拼合信息。' },
  defamation: { zh: '名誉权风险', en: 'Defamation exposure', guidance: '所有指控须归因到具体来源，并记录当事人回应。' },
  'graphic-content': { zh: '刺激性内容', en: 'Graphic content', guidance: '移除猎奇细节；保留读者提示。' },
  'source-safety': { zh: '来源安全', en: 'Source safety', guidance: '评估报复风险；确认当事人知情同意与匿名方式。' },
  'victim-blaming': { zh: '受害者有罪论', en: 'Victim-blaming framing', guidance: '检查被动语态、着装/行为描写与因果暗示。' },
  bias: { zh: '偏见与框架', en: 'Bias & framing', guidance: '检查是否因立场契合而降低证据标准。' },
  'image-ethics': { zh: '图像伦理', en: 'Image ethics', guidance: '不得虚构新闻现场或真实受害者形象；AI 图标注为概念插图。' },
}

export const RISK_SEVERITY_LABEL: Record<RiskSeverity, { zh: string; var: string }> = {
  low: { zh: '低', var: 'var(--risk-low)' },
  medium: { zh: '中', var: 'var(--risk-medium)' },
  high: { zh: '高', var: 'var(--risk-high)' },
  critical: { zh: '极高', var: 'var(--risk-critical)' },
}

/** Risk kinds that force a second, typed confirmation before publishing. */
export const SECOND_CONFIRM_KINDS: RiskKind[] = [
  'sexual-violence', 'minors', 'active-litigation', 'identity-exposure',
]

/* ------------------------------------------------------------------ *
 * Engines
 *
 * Retrieval is swappable — it only has to find things. Authoring is not.
 * ------------------------------------------------------------------ */

export const ENGINES: EngineOption[] = [
  {
    id: 'llama-open',
    name: 'Llama 系列（开源，可自托管）',
    kind: 'open-source',
    cost: '免费 · 自建算力',
    note: '权重公开，可在自有机器上运行。适合大批量的链接检索与网页抓取，不产生外部调用费用。',
    jobs: ['retrieval'],
  },
  {
    id: 'mistral-open',
    name: 'Mistral 系列（开源，可自托管）',
    kind: 'open-source',
    cost: '免费 · 自建算力',
    note: '体量较小、吞吐高，适合逐条打开链接、判断资源是否可取得这类重复性工作。',
    jobs: ['retrieval'],
  },
  {
    id: 'qwen-open',
    name: 'Qwen 系列（开源，可自托管）',
    kind: 'open-source',
    cost: '免费 · 自建算力',
    note: '多语种覆盖较好，适合跨语种检索——本站每日检索涉及十余个语种。',
    jobs: ['retrieval'],
  },
  {
    id: 'self-hosted',
    name: '自定义端点（本地或私有部署）',
    kind: 'open-source',
    cost: '免费 · 自建算力',
    note: '指向你自己的推理服务。检索请求不离开你控制的网络。',
    jobs: ['retrieval'],
  },
  {
    id: 'claude',
    name: 'Claude',
    kind: 'hosted',
    cost: '按调用计费',
    note: '检索可选用它；控制端内的起草与改写固定使用它，不可更改。',
    jobs: ['retrieval', 'authoring'],
  },
]

export const ENGINE_MAP: Record<string, EngineOption> = Object.fromEntries(
  ENGINES.map((e) => [e.id, e]),
)

/** Options the editor may assign to a job. */
export function enginesFor(job: EngineOption['jobs'][number]): EngineOption[] {
  return ENGINES.filter((e) => e.jobs.includes(job))
}

/* ------------------------------------------------------------------ *
 * Review decisions
 * ------------------------------------------------------------------ */

export const DECISIONS: DecisionMeta[] = [
  { key: 'approve-publish', zh: '批准并立即发布', en: 'Approve & publish', tone: 'go', hint: '需通过发布前确认；受全局发布锁约束。' },
  { key: 'approve-schedule', zh: '批准并排程', en: 'Approve & schedule', tone: 'go', hint: '设定时间后进入排程队列，发布前仍会再次校验。' },
  { key: 'save-draft', zh: '保存草稿', en: 'Save as draft', tone: 'hold', hint: '保留当前版本，不进入发布流程。' },
  { key: 'request-sources', zh: '要求增加来源', en: 'Request more sources', tone: 'hold', hint: '退回编辑台，指明需要补充的一手材料。' },
  { key: 'return-research', zh: '退回重新研究', en: 'Return for research', tone: 'hold', hint: '整篇重做：重新搜集、交叉核实并重写。' },
  { key: 'reject', zh: '拒绝', en: 'Reject', tone: 'stop', hint: '不予发表；保留记录与理由。' },
  { key: 'archive', zh: '归档', en: 'Archive', tone: 'stop', hint: '移出工作队列，可日后检索。' },
]

export const DECISION_MAP: Record<DecisionMeta['key'], DecisionMeta> = Object.fromEntries(
  DECISIONS.map((d) => [d.key, d]),
) as Record<DecisionMeta['key'], DecisionMeta>

/* ------------------------------------------------------------------ *
 * Status labels
 * ------------------------------------------------------------------ */

export const STATUS_LABEL: Record<string, { zh: string; tone: 'draft' | 'review' | 'go' | 'live' | 'stop' }> = {
  drafting: { zh: '草稿中', tone: 'draft' },
  'in-review': { zh: '待审核', tone: 'review' },
  'needs-sources': { zh: '需补充来源', tone: 'review' },
  'changes-requested': { zh: '要求修改', tone: 'review' },
  approved: { zh: '已批准', tone: 'go' },
  scheduled: { zh: '已排程', tone: 'go' },
  published: { zh: '已发布', tone: 'live' },
  'update-needed': { zh: '需更新', tone: 'review' },
  retracted: { zh: '已撤回', tone: 'stop' },
  archived: { zh: '已归档', tone: 'stop' },
  rejected: { zh: '已拒绝', tone: 'stop' },
}

/** Global, always-visible statement that this build carries no real reporting. */
export const DEMO_NOTICE =
  '本站为交互原型。所有条目、来源、数据与人物均为演示用虚构内容，不构成真实报道。'

export const DEMO_NOTICE_EN =
  'Interactive prototype. All entries, sources, data and people are fictional demonstration content — not real reporting and not real citations.'
