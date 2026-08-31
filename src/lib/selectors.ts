import type {
  Article, DailyBrief, FactCheck, ID, ImageAsset, PrismState, RiskFlag, Signal, Source, Version,
} from './types'
import { SECOND_CONFIRM_KINDS } from './constants'
import { articleSources, isPrimarySource, sortBy } from './util'

/* ------------------------------- queues ---------------------------------- */

export const REVIEW_STATUSES: Article['status'][] = ['in-review', 'needs-sources', 'changes-requested']

export function pendingReview(state: PrismState): Article[] {
  return sortBy(state.articles.filter((a) => REVIEW_STATUSES.includes(a.status)), (a) => a.updatedAt, 'desc')
}

export function approvedNotLive(state: PrismState): Article[] {
  return state.articles.filter((a) => a.status === 'approved')
}

export function scheduled(state: PrismState): Article[] {
  return sortBy(state.articles.filter((a) => a.status === 'scheduled'), (a) => a.scheduledFor ?? '')
}

export function published(state: PrismState): Article[] {
  return sortBy(state.articles.filter((a) => a.status === 'published'), (a) => a.publishedAt ?? '', 'desc')
}

export function needsUpdate(state: PrismState): Article[] {
  return state.articles.filter((a) => a.status === 'update-needed')
}

/** Everything the public site is allowed to show. */
export function publicArticles(state: PrismState): Article[] {
  return sortBy(
    state.articles.filter((a) => a.status === 'published' || a.status === 'update-needed' || a.status === 'retracted'),
    (a) => a.publishedAt ?? a.updatedAt,
    'desc',
  )
}

export function publicFactChecks(state: PrismState): FactCheck[] {
  const live = new Set(publicArticles(state).map((a) => a.id))
  return state.factChecks.filter((f) => live.has(f.articleId))
}

/* ------------------------------- risk ------------------------------------ */

export function openRisks(a: Article): RiskFlag[] {
  return a.riskFlags.filter((r) => !r.resolved)
}

export function highRisk(state: PrismState): Article[] {
  return state.articles.filter((a) =>
    openRisks(a).some((r) => r.severity === 'high' || r.severity === 'critical'))
}

export function riskScore(a: Article): number {
  const weight = { low: 1, medium: 3, high: 6, critical: 10 } as const
  return openRisks(a).reduce((n, r) => n + weight[r.severity], 0)
}

/** Sensitive categories always demand a second, typed confirmation. */
export function needsSecondConfirm(a: Article): RiskFlag[] {
  return a.riskFlags.filter((r) => r.requiresSecondConfirm || SECOND_CONFIRM_KINDS.includes(r.kind))
}

/* --------------------------- citation health ----------------------------- */

export function failedChecks(a: Article) {
  return a.citationChecks.filter((c) => c.status === 'fail')
}

/**
 * Failures that still block publishing: everything the editor has not
 * explicitly acknowledged and handled. An acknowledged failure stays on the
 * record and stays visible — it just stops being a gate, because the sentence
 * that rested on it has already been weakened or re-attributed.
 */
export function blockingChecks(a: Article) {
  return a.citationChecks.filter((c) => c.status === 'fail' && !c.acknowledged)
}

export function acknowledgedFailures(a: Article) {
  return a.citationChecks.filter((c) => c.status === 'fail' && c.acknowledged)
}

export function warnChecks(a: Article) {
  return a.citationChecks.filter((c) => c.status === 'warn')
}

export function citationHealth(a: Article): number {
  if (a.citationChecks.length === 0) return 0
  const pass = a.citationChecks.filter((c) => c.status === 'pass').length
  const warn = a.citationChecks.filter((c) => c.status === 'warn').length
  // An acknowledged failure counts like a warning: the record is imperfect,
  // but the claim resting on it has been brought back within the evidence.
  const acked = acknowledgedFailures(a).length
  return Math.round(((pass + (warn + acked) * 0.5) / a.citationChecks.length) * 100)
}

export function articlesWithFailedCitations(state: PrismState): Article[] {
  return state.articles.filter((a) => blockingChecks(a).length > 0)
}

/* ---------------------------- source metrics ----------------------------- */

export interface SourceProfile {
  total: number
  primary: number
  independent: number
  countries: string[]
  languages: string[]
  avgCredibility: number
  weakest?: Source
}

export function sourceProfile(a: Article, state: PrismState): SourceProfile {
  const list = articleSources(a, state)
  const primary = list.filter(isPrimarySource)
  const publishers = new Set(list.map((s) => s.publisher))
  const avg = list.length ? Math.round(list.reduce((n, s) => n + s.credibility, 0) / list.length) : 0
  return {
    total: list.length,
    primary: primary.length,
    independent: publishers.size,
    countries: Array.from(new Set(list.map((s) => s.country))).sort(),
    languages: Array.from(new Set(list.map((s) => s.language))).sort(),
    avgCredibility: avg,
    weakest: sortBy(list, (s) => s.credibility)[0],
  }
}

/* ------------------------------ publishing ------------------------------- */

export interface PublishGate {
  ok: boolean
  /** Hard blocks — publishing is impossible until cleared. */
  blockers: string[]
  /** Soft warnings the editor must read but may override. */
  warnings: string[]
  /** Sensitive-content flags that force a typed second confirmation. */
  confirmations: RiskFlag[]
  lockEngaged: boolean
}

export function publishGate(a: Article, state: PrismState): PublishGate {
  const blockers: string[] = []
  const warnings: string[] = []
  const profile = sourceProfile(a, state)

  if (state.lock.engaged) blockers.push('Global Publishing Lock 已开启：全站公开发布被暂停。')
  const blocking = blockingChecks(a)
  if (blocking.length > 0) blockers.push(`${blocking.length} 项引用检查未通过且尚未处理，必须先修复陈述、补充一手材料，或记录处理说明。`)
  const criticals = openRisks(a).filter((r) => r.severity === 'critical')
  if (criticals.length > 0) blockers.push(`${criticals.length} 项极高风险未处理：${criticals.map((r) => r.note).join('；')}`)
  const unapprovedCover = a.assetIds
    .map((id) => state.assets.find((s) => s.id === id))
    .filter((x): x is ImageAsset => Boolean(x))
    .filter((x) => x.kind === 'cover' && x.status !== 'approved')
  if (unapprovedCover.length > 0) blockers.push('封面图尚未通过审核。')

  if (profile.primary < 2) warnings.push(`一手来源仅 ${profile.primary} 份，低于本站 2 份的内部下限。`)
  if (profile.independent < 3) warnings.push(`独立来源 ${profile.independent} 家，交叉核实强度偏弱。`)
  if (warnChecks(a).length > 0) warnings.push(`${warnChecks(a).length} 项引用带有保留意见。`)
  const acked = acknowledgedFailures(a)
  if (acked.length > 0) warnings.push(`${acked.length} 项引用检查未通过但已记录处理说明；相关陈述已相应削弱或改为归因表述。`)
  if (a.confidence < 70) warnings.push(`整体可信度 ${a.confidence}，建议补充证据或下调表述强度。`)
  if (openRisks(a).some((r) => r.severity === 'high')) warnings.push('存在未处理的高风险项。')
  if (!a.contentNotice && a.topics.includes('violence')) warnings.push('涉及性暴力/家暴议题但未设置内容提示。')

  const confirmations = needsSecondConfirm(a).filter((r) => !r.resolved)
  return { ok: blockers.length === 0, blockers, warnings, confirmations, lockEngaged: state.lock.engaged }
}

/* ------------------------------- versions -------------------------------- */

export function versionsOf(state: PrismState, articleId: ID): Version[] {
  return sortBy(state.versions.filter((v) => v.articleId === articleId), (v) => v.n, 'desc')
}

export function currentVersion(state: PrismState, a: Article): Version | undefined {
  return state.versions.find((v) => v.id === a.currentVersionId)
}

export function proposalsOf(state: PrismState, articleId: ID): Version[] {
  return versionsOf(state, articleId).filter((v) => v.state === 'proposal')
}

/* --------------------------------- assets -------------------------------- */

export function assetsOf(state: PrismState, articleId: ID): ImageAsset[] {
  return state.assets.filter((x) => x.articleId === articleId)
}

export function coverOf(state: PrismState, a: Article): ImageAsset | undefined {
  return a.assetIds
    .map((id) => state.assets.find((x) => x.id === id))
    .find((x): x is ImageAsset => Boolean(x) && x!.kind === 'cover')
}

/* --------------------------------- intake -------------------------------- */

export function todaySignals(state: PrismState): Signal[] {
  return sortBy(state.signals.filter((s) => s.status !== 'declined'), (s) => s.newsValue, 'desc')
}

export function topSignals(state: PrismState, n = 5): Signal[] {
  return todaySignals(state).slice(0, n)
}

export function latestBrief(state: PrismState): DailyBrief | undefined {
  return sortBy(state.briefs, (b) => b.date, 'desc')[0]
}

export function latestPipeline(state: PrismState) {
  return sortBy(state.pipelineRuns, (p) => p.startedAt, 'desc')[0]
}

/* ------------------------------ distribution ----------------------------- */

export interface Distribution { label: string; value: number }

export function countryDistribution(state: PrismState): Distribution[] {
  const counts = new Map<string, number>()
  for (const s of state.signals) counts.set(s.country, (counts.get(s.country) ?? 0) + 1)
  for (const a of state.articles) for (const c of a.countries) counts.set(c, (counts.get(c) ?? 0) + 1)
  return sortBy(Array.from(counts, ([label, value]) => ({ label, value })), (d) => d.value, 'desc')
}

export function topicDistribution(state: PrismState): Distribution[] {
  const counts = new Map<string, number>()
  for (const a of state.articles) for (const t of a.topics) counts.set(t, (counts.get(t) ?? 0) + 1)
  for (const s of state.signals) for (const t of s.topics) counts.set(t, (counts.get(t) ?? 0) + 1)
  return sortBy(Array.from(counts, ([label, value]) => ({ label, value })), (d) => d.value, 'desc')
}

export function languageDistribution(state: PrismState): Distribution[] {
  const counts = new Map<string, number>()
  for (const s of state.sources) counts.set(s.language, (counts.get(s.language) ?? 0) + 1)
  return sortBy(Array.from(counts, ([label, value]) => ({ label, value })), (d) => d.value, 'desc')
}

export function sourceTypeDistribution(state: PrismState): Distribution[] {
  const counts = new Map<string, number>()
  for (const s of state.sources) counts.set(s.sourceType, (counts.get(s.sourceType) ?? 0) + 1)
  return sortBy(Array.from(counts, ([label, value]) => ({ label, value })), (d) => d.value, 'desc')
}

/* -------------------------------- summary -------------------------------- */

export interface DeskSummary {
  pending: number
  highRisk: number
  citationFailures: number
  scheduled: number
  published: number
  updatesNeeded: number
  signalsToday: number
  countriesToday: number
  languagesToday: number
  primaryDocsToday: number
}

export function deskSummary(state: PrismState): DeskSummary {
  const sigs = state.signals
  return {
    pending: pendingReview(state).length,
    highRisk: highRisk(state).length,
    citationFailures: state.articles.reduce((n, a) => n + blockingChecks(a).length, 0),
    scheduled: scheduled(state).length,
    published: published(state).length,
    updatesNeeded: needsUpdate(state).length,
    signalsToday: sigs.length,
    countriesToday: new Set(sigs.map((s) => s.country)).size,
    languagesToday: new Set(sigs.map((s) => s.language)).size,
    primaryDocsToday: sigs.reduce((n, s) => n + s.primarySourceCount, 0),
  }
}
