/**
 * PRISM 棱镜 — domain model.
 *
 * Everything in this prototype is DEMO DATA. Jurisdictions, organisations,
 * publications and people below are deliberately fictional, and every source
 * record carries `demo: true` plus a placeholder URL so that nothing in this
 * repository can be mistaken for a real news report, a real citation or a real
 * person's words.
 */

export type ID = string
export type ISODate = string // 'YYYY-MM-DD'
export type ISODateTime = string // 'YYYY-MM-DDTHH:mm:ssZ'

/* ------------------------------------------------------------------ *
 * Topics
 * ------------------------------------------------------------------ */

export type TopicKey =
  | 'rights'          // 女性主义与 LGBTQIA+ 权利
  | 'violence'        // 性暴力、家庭暴力与性骚扰
  | 'repro'           // 生育权与身体自主权
  | 'trans'           // 跨性别权利与医疗
  | 'hate'            // 仇恨犯罪与网络暴力
  | 'equality'        // 法律、政治、教育、医疗与职场平等
  | 'displacement'    // 战争、移民及交叉边缘群体
  | 'movement'        // 运动内部的重要争议

export interface Topic {
  key: TopicKey
  zh: string
  en: string
  blurb: string
  /** CSS custom-property name carrying the topic's restrained prism hue. */
  hue: string
}

/* ------------------------------------------------------------------ *
 * Sources, citations, fact-checks
 * ------------------------------------------------------------------ */

export type SourceType =
  | 'primary-research'
  | 'legal-document'
  | 'court-ruling'
  | 'government-data'
  | 'international-body'
  | 'ngo-report'
  | 'local-media'
  | 'news-agency'
  | 'academic-review'
  | 'statement'
  | 'social-post'
  | 'other'

/** Tiering used across the console. Primary evidence outranks reporting. */
export type SourceTier = 'primary' | 'secondary' | 'tertiary'

export interface Source {
  id: ID
  title: string
  publisher: string
  sourceType: SourceType
  tier: SourceTier
  /** Placeholder URL — never a real-world link. */
  url: string
  date: ISODate
  /** BCP-47-ish tag, e.g. 'es', 'ar', 'zh-Hans'. */
  language: string
  /** Fictional jurisdiction name. */
  country: string
  /** 0–100, derived from `credibilityBasis`, never a black box. */
  credibility: number
  credibilityBasis: string
  accessedAt: ISODate
  /** True when the record is a primary document (law, ruling, dataset, study). */
  isPrimary: boolean
  /** Always true in this prototype. */
  demo: true
  notes?: string
  /** Why an editor may need to treat this source with care. */
  caution?: string
}

export interface Citation {
  id: ID
  sourceId: ID
  /** Page / article / paragraph pointer inside the source. */
  locator?: string
  /** The specific claim this citation is carrying. */
  claim: string
}

/* ------------------------------------------------------------------ *
 * Article content blocks
 * ------------------------------------------------------------------ */

/**
 * Inline citation syntax inside `text`: `[[c:cit-004]]`.
 * Rendered as a numbered, clickable superscript that opens the source card.
 */
export type Block =
  | { id: ID; type: 'paragraph'; text: string }
  | { id: ID; type: 'heading'; text: string; level: 3 | 4 }
  | { id: ID; type: 'list'; ordered?: boolean; items: string[] }
  | { id: ID; type: 'callout'; tone: 'note' | 'caution' | 'evidence' | 'unknown'; title: string; text: string }
  | { id: ID; type: 'pullquote'; text: string; attribution?: string }
  | { id: ID; type: 'figure'; assetId: ID; caption: string }
  | { id: ID; type: 'chart'; chartId: ID }
  | { id: ID; type: 'timeline'; entries: TimelineEntry[] }
  | { id: ID; type: 'table'; columns: string[]; rows: string[][]; caption?: string }
  | { id: ID; type: 'divergence'; positions: DivergencePosition[] }

export interface TimelineEntry {
  date: ISODate
  title: string
  text: string
  citationIds?: ID[]
  /** 'documented' = supported by a primary record; 'reported' = single report. */
  standing: 'documented' | 'reported' | 'contested'
}

export interface DivergencePosition {
  label: string
  /** Who holds this position (fictional org / outlet). */
  holder: string
  position: string
  evidence: string
  citationIds: ID[]
  /** Editorial read on the strength of this position. */
  weight: 'strong' | 'moderate' | 'weak'
}

export type SectionKind =
  | 'facts'        // 事件及核心事实
  | 'context'      // 法律、历史和社会背景
  | 'power'        // 权力结构与交叉性分析
  | 'research'     // 相关研究与数据
  | 'divergence'   // 不同来源之间的分歧
  | 'unknowns'     // 尚未确定的信息
  | 'why'          // 事件为何重要
  | 'watch'        // 后续值得关注的进展

export interface ArticleSection {
  id: ID
  kind: SectionKind
  title: string
  blocks: Block[]
}

/* ------------------------------------------------------------------ *
 * Visual assets & charts
 * ------------------------------------------------------------------ */

export type AssetKind = 'cover' | 'map' | 'chart' | 'timeline' | 'social'

export interface ImageAsset {
  id: ID
  articleId?: ID
  kind: AssetKind
  label: string
  caption: string
  /** AI-generated imagery is always surfaced as 「概念插图」. */
  conceptual: boolean
  /** Generation instruction kept on the record for auditability. */
  prompt?: string
  /** Palette keys drawn from the design tokens. */
  palette: string[]
  /** Abstract motif the renderer draws — no depiction of real people or scenes. */
  motif: 'prism-fold' | 'graticule' | 'strata' | 'aperture' | 'ledger' | 'signal'
  status: 'draft' | 'approved' | 'rejected'
  /** Editor-facing guardrail note, e.g. why no victim likeness is shown. */
  guardrail: string
  createdAt: ISODateTime
  /** Set for data-bearing assets; charts must cite real underlying rows. */
  chartId?: ID
}

export type ChartKind = 'bar' | 'line' | 'stacked' | 'range' | 'donut'

export interface ChartSpec {
  id: ID
  kind: ChartKind
  title: string
  subtitle?: string
  /** Units label for the value axis. */
  unit: string
  /** Every chart names the dataset it came from. */
  sourceId: ID
  sourceNote: string
  series: { name: string; color?: string; points: { label: string; value: number; lowValue?: number; highValue?: number }[] }[]
  /** Explicit statement of what the data cannot show. */
  limitation: string
}

/* ------------------------------------------------------------------ *
 * Risk, review, workflow state
 * ------------------------------------------------------------------ */

export type RiskKind =
  | 'sexual-violence'
  | 'minors'
  | 'active-litigation'
  | 'identity-exposure'
  | 'defamation'
  | 'graphic-content'
  | 'source-safety'
  | 'victim-blaming'
  | 'bias'
  | 'image-ethics'

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface RiskFlag {
  id: ID
  kind: RiskKind
  severity: RiskSeverity
  note: string
  /** When true, publishing demands a second, typed confirmation. */
  requiresSecondConfirm: boolean
  raisedBy: 'ai-review' | 'editor' | 'legal-check'
  resolved?: boolean
  resolutionNote?: string
}

/**
 * The automated desk performs RESOURCE RETRIEVAL, not verification.
 *
 * - 'found'   the cited resource was located and the locator resolves
 * - 'partial' the resource was located but the specific locator could not be
 *             resolved (a paywalled annex, a low-resolution scan, a page that
 *             has since been replaced)
 * - 'missing' the resource could not be located at all
 *
 * A 'found' result means the source EXISTS and is reachable. It does not mean
 * the source is reliable, and it certainly does not mean the claim resting on
 * it is true. Judging reliability and truth is editorial work, done by a
 * person; the desk only establishes what can be retrieved.
 */
export type CitationCheckStatus = 'found' | 'partial' | 'missing'

export interface CitationCheck {
  citationId: ID
  status: CitationCheckStatus
  /** What the desk was and was not able to retrieve. */
  reason: string
  checkedAt: ISODateTime
  /**
   * A missing resource that the editor has explicitly seen and handled —
   * normally by weakening or re-attributing the sentence that rested on it.
   * It stays visible as missing, but it no longer blocks publishing, because
   * the claim it could not support is no longer being made.
   */
  acknowledged?: boolean
  acknowledgedNote?: string
  acknowledgedBy?: string
}

export type ArticleStatus =
  | 'drafting'
  | 'in-review'
  | 'needs-sources'
  | 'changes-requested'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'update-needed'
  | 'retracted'
  | 'archived'
  | 'rejected'

export interface Translation {
  lang: string
  label: string
  status: 'machine-draft' | 'human-reviewed' | 'not-started'
  title?: string
  standfirst?: string
}

export interface Article {
  id: ID
  slug: string
  title: string
  titleEn: string
  standfirst: string
  /** Fictional jurisdiction(s) the story sits in. */
  countries: string[]
  region: string
  topics: TopicKey[]
  status: ArticleStatus
  createdAt: ISODateTime
  updatedAt: ISODateTime
  publishedAt?: ISODateTime
  scheduledFor?: ISODateTime
  /** Minutes. */
  readingTime: number
  /** 0–100 aggregate editorial confidence with a stated basis. */
  confidence: number
  confidenceBasis: string
  /** Trauma-informed content notice shown above the fold. */
  contentNotice?: string
  sections: ArticleSection[]
  citations: Citation[]
  sourceIds: ID[]
  riskFlags: RiskFlag[]
  citationChecks: CitationCheck[]
  assetIds: ID[]
  chartIds: ID[]
  translations: Translation[]
  /** Which version in `versions` this article currently reflects. */
  currentVersionId: ID
  byline: string
  featured?: boolean
  demo: true
}

/* ------------------------------------------------------------------ *
 * Versions & Vibe Coding
 * ------------------------------------------------------------------ */

export interface VersionRefDelta {
  added: ID[]
  removed: ID[]
}

export interface Version {
  id: ID
  articleId: ID
  n: number
  label: string
  createdAt: ISODateTime
  author: 'ai-desk' | 'editor'
  /** The natural-language instruction that produced this version, if any. */
  instruction?: string
  summary: string
  refDelta: VersionRefDelta
  /** Full article snapshot — versions never overwrite each other. */
  snapshot: Article
  /** 'adopted' once the editor confirms; proposals wait for confirmation. */
  state: 'proposal' | 'adopted' | 'discarded'
  /** Aggregate line counts for the diff summary strip. */
  stats: { added: number; removed: number; changed: number }
}

export interface VibePreset {
  id: ID
  label: string
  instruction: string
  category: 'context' | 'sources' | 'ethics' | 'depth' | 'imagery' | 'verification'
}

/** A queued natural-language edit that has produced a proposal version. */
export interface VibeRun {
  id: ID
  articleId: ID
  instruction: string
  startedAt: ISODateTime
  state: 'running' | 'proposed' | 'adopted' | 'discarded'
  steps: { label: string; detail: string; done: boolean }[]
  proposedVersionId?: ID
  /** Human-readable account of what changed and why. */
  rationale?: string
}

/* ------------------------------------------------------------------ *
 * Daily pipeline: intake signals, research watch, brief
 * ------------------------------------------------------------------ */

export interface Signal {
  id: ID
  headline: string
  country: string
  region: string
  language: string
  topics: TopicKey[]
  firstSeen: ISODateTime
  /** Reports merged into this cluster. */
  reportCount: number
  independentSourceCount: number
  primarySourceCount: number
  /** 0–100 editorial value score with a stated basis. */
  newsValue: number
  newsValueBasis: string
  /** Corroboration state across independent outlets. */
  corroboration: 'multi-source' | 'single-source' | 'contested' | 'unverified'
  status: 'new' | 'clustered' | 'drafted' | 'declined'
  declineReason?: string
  linkedArticleId?: ID
  mergedFrom: string[]
  demo: true
}

export interface ResearchItem {
  id: ID
  title: string
  body: string
  publisher: string
  type: 'peer-reviewed' | 'preprint' | 'official-statistics' | 'ngo-study' | 'systematic-review'
  date: ISODate
  topics: TopicKey[]
  summary: string
  /** What the study can and cannot support. */
  strength: string
  limitation: string
  sourceId: ID
  demo: true
}

export interface DailyBrief {
  id: ID
  date: ISODate
  greeting: string
  topFive: { signalId: ID; why: string }[]
  recommended: { articleId: ID; why: string }[]
  pendingArticleIds: ID[]
  researchIds: ID[]
  riskAlerts: { articleId: ID; note: string; severity: RiskSeverity }[]
  citationFailures: { articleId: ID; citationId: ID; reason: string }[]
  updateNeeded: { articleId: ID; why: string }[]
  /** Coverage stats for the footer strip. */
  coverage: { countries: number; languages: number; primaryDocs: number; clustersMerged: number }
  sentTo: string
  demo: true
}

/* ------------------------------------------------------------------ *
 * Pipeline run (the nightly automated desk)
 * ------------------------------------------------------------------ */

export type PipelineStageKey =
  | 'collect'
  | 'dedupe'
  | 'locate'
  | 'draft'
  | 'visuals'
  | 'review'
  | 'handoff'

export interface PipelineStage {
  key: PipelineStageKey
  zh: string
  en: string
  detail: string
  /** Metric shown while the stage runs. */
  metricLabel: string
  metricValue: string
  state: 'idle' | 'running' | 'done' | 'blocked'
  /** Sub-steps surfaced in the console log. */
  log: string[]
}

export interface PipelineRun {
  id: ID
  date: ISODate
  startedAt: ISODateTime
  finishedAt?: ISODateTime
  stages: PipelineStage[]
  /** The desk never publishes; it can only hand off. */
  outcome: 'handed-off' | 'running' | 'blocked'
  producedArticleIds: ID[]
  producedSignalIds: ID[]
  demo: true
}

/* ------------------------------------------------------------------ *
 * Engines
 *
 * Two different jobs, two different rules.
 *
 * Retrieval — searching the open web for the material a citation points at —
 * is swappable: it is bounded, cheap to run, and easy to check, so the editor
 * may point it at a free or self-hosted open-source model.
 *
 * Authoring — drafting, rewriting, and everything Further Vibe Coding does to
 * a manuscript inside the console — is fixed to Claude and cannot be
 * reassigned from the interface.
 * ------------------------------------------------------------------ */

export type EngineJob = 'retrieval' | 'authoring'

export interface EngineOption {
  id: string
  name: string
  /** 'open-source' can be self-hosted or run free; 'hosted' is an API. */
  kind: 'open-source' | 'hosted'
  /** What it costs the editor to run. */
  cost: string
  note: string
  /** Retrieval is open to every option; authoring is not. */
  jobs: EngineJob[]
}

export interface EngineSettings {
  /** The editor's choice for overnight resource search. */
  retrieval: string
  /** Fixed. Present so the UI can name it, not so it can be changed. */
  authoring: 'claude'
}

/* ------------------------------------------------------------------ *
 * Audit, approvals, global lock
 * ------------------------------------------------------------------ */

export type AuditAction =
  | 'discovered'
  | 'drafted'
  | 'ai-review'
  | 'edited'
  | 'vibe-instruction'
  | 'version-adopted'
  | 'version-discarded'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'more-sources-requested'
  | 'returned-for-research'
  | 'rejected'
  | 'archived'
  | 'updated'
  | 'retracted'
  | 'lock-engaged'
  | 'lock-released'
  | 'image-generated'
  | 'image-approved'
  | 'image-rejected'
  | 'brief-sent'

export interface AuditEntry {
  id: ID
  at: ISODateTime
  actor: string
  actorKind: 'editor' | 'ai-desk' | 'system'
  action: AuditAction
  articleId?: ID
  target: string
  detail: string
}

export interface GlobalLock {
  engaged: boolean
  since?: ISODateTime
  reason?: string
  by?: string
}

/** Decisions available on the approval queue. */
export type ReviewDecision =
  | 'approve-publish'
  | 'approve-schedule'
  | 'save-draft'
  | 'request-sources'
  | 'return-research'
  | 'reject'
  | 'archive'

export interface DecisionMeta {
  key: ReviewDecision
  zh: string
  en: string
  tone: 'go' | 'hold' | 'stop'
  hint: string
}

/* ------------------------------------------------------------------ *
 * Store shape
 * ------------------------------------------------------------------ */

export interface PrismState {
  articles: Article[]
  sources: Source[]
  signals: Signal[]
  research: ResearchItem[]
  assets: ImageAsset[]
  charts: ChartSpec[]
  versions: Version[]
  vibeRuns: VibeRun[]
  briefs: DailyBrief[]
  pipelineRuns: PipelineRun[]
  audit: AuditEntry[]
  lock: GlobalLock
  engines: EngineSettings
  /** Prototype clock: fixed so the demo is deterministic. */
  today: ISODate
}
