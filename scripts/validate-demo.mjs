#!/usr/bin/env node
/**
 * PRISM 演示数据完整性检查
 *
 * Referential integrity + safety checks over the whole demo dataset. This is a
 * real gate, not decoration: the product's core promise is that every claim
 * points at a source that actually exists and that nothing here can be mistaken
 * for a real citation.
 *
 *   node scripts/validate-demo.mjs
 */
import { build } from 'esbuild'
import { readFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const out = mkdtempSync(join(tmpdir(), 'prism-validate-'))
const bundle = join(out, 'demo.mjs')

await build({
  entryPoints: ['src/lib/demo/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile: bundle,
  logLevel: 'silent',
})

const { buildInitialState } = await import(pathToFileURL(bundle).href)
const s = buildInitialState()

const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

const sourceIds = new Set(s.sources.map((x) => x.id))
const chartIds = new Set(s.charts.map((x) => x.id))
const assetIds = new Set(s.assets.map((x) => x.id))
const articleIds = new Set(s.articles.map((x) => x.id))
const factCheckIds = new Set(s.factChecks.map((x) => x.id))
const signalIds = new Set(s.signals.map((x) => x.id))

/* ---------------------------- safety invariants --------------------------- */

const URL_OK = /^https:\/\/demo\.prism\.invalid\//
for (const src of s.sources) {
  if (!URL_OK.test(src.url)) err(`source ${src.id}: url must be on demo.prism.invalid — got ${src.url}`)
  if (src.demo !== true) err(`source ${src.id}: demo flag must be true`)
  if (!src.credibilityBasis || src.credibilityBasis.length < 12) err(`source ${src.id}: credibility ${src.credibility} has no substantive basis`)
  if (src.credibility < 0 || src.credibility > 100) err(`source ${src.id}: credibility out of range`)
}
const DOI = /\b10\.\d{4,9}\/\S+|arxiv|isbn[\s:]/i
const blob = JSON.stringify(s)
if (DOI.test(blob)) err('dataset contains something shaped like a DOI / arXiv id / ISBN — fabricated identifiers are forbidden')
for (const m of blob.matchAll(/https?:\/\/(?!demo\.prism\.invalid)[^"\\ ]+/g)) {
  err(`dataset contains a non-placeholder URL: ${m[0]}`)
}

/* --------------------------- referential integrity ------------------------ */

for (const c of s.charts) {
  if (!sourceIds.has(c.sourceId)) err(`chart ${c.id}: sourceId ${c.sourceId} does not exist`)
  if (!c.limitation) err(`chart ${c.id}: missing limitation — every chart must state what it cannot show`)
  if (!c.series.length) err(`chart ${c.id}: no series`)
}

const CITE = /\[\[c:([a-zA-Z0-9_-]+)\]\]/g

function blockTexts(b) {
  switch (b.type) {
    case 'paragraph': case 'heading': case 'pullquote': return [b.text]
    case 'callout': return [b.title, b.text]
    case 'list': return b.items
    case 'figure': return [b.caption]
    case 'table': return [...b.columns, ...b.rows.flat(), b.caption ?? '']
    case 'timeline': return b.entries.flatMap((e) => [e.title, e.text])
    case 'divergence': return b.positions.flatMap((p) => [p.position, p.evidence, p.holder, p.label])
    case 'chart': return []
    default: return []
  }
}

for (const a of s.articles) {
  const citIds = new Set(a.citations.map((c) => c.id))

  for (const sid of a.sourceIds) if (!sourceIds.has(sid)) err(`${a.id}: sourceIds contains unknown ${sid}`)
  for (const c of a.citations) {
    if (!sourceIds.has(c.sourceId)) err(`${a.id}/${c.id}: sourceId ${c.sourceId} does not exist`)
    else if (!a.sourceIds.includes(c.sourceId)) err(`${a.id}/${c.id}: cites ${c.sourceId} but it is not in article.sourceIds`)
    if (!c.claim) err(`${a.id}/${c.id}: citation carries no claim`)
  }
  for (const fid of a.factCheckIds) if (!factCheckIds.has(fid)) err(`${a.id}: factCheckIds contains unknown ${fid}`)
  for (const aid of a.assetIds) if (!assetIds.has(aid)) err(`${a.id}: assetIds contains unknown ${aid}`)
  for (const cid of a.chartIds) if (!chartIds.has(cid)) err(`${a.id}: chartIds contains unknown ${cid}`)
  for (const chk of a.citationChecks) if (!citIds.has(chk.citationId)) err(`${a.id}: citationCheck for unknown citation ${chk.citationId}`)

  const kinds = a.sections.map((x) => x.kind)
  const REQUIRED = ['facts', 'context', 'power', 'research', 'divergence', 'factcheck', 'unknowns', 'why', 'watch']
  for (const k of REQUIRED) if (!kinds.includes(k)) err(`${a.id}: missing required section '${k}'`)

  let inlineCount = 0
  for (const sec of a.sections) {
    for (const b of sec.blocks) {
      if (b.type === 'chart' && !chartIds.has(b.chartId)) err(`${a.id}/${b.id}: chart block references unknown ${b.chartId}`)
      if (b.type === 'figure' && !assetIds.has(b.assetId)) err(`${a.id}/${b.id}: figure block references unknown asset ${b.assetId}`)
      const extra = []
      if (b.type === 'timeline') extra.push(...b.entries.flatMap((e) => e.citationIds ?? []))
      if (b.type === 'divergence') extra.push(...b.positions.flatMap((p) => p.citationIds))
      for (const id of extra) if (!citIds.has(id)) err(`${a.id}/${b.id}: references unknown citation ${id}`)
      for (const t of blockTexts(b)) {
        for (const m of String(t).matchAll(CITE)) {
          inlineCount += 1
          if (!citIds.has(m[1])) err(`${a.id}/${b.id}: inline marker [[c:${m[1]}]] has no citation record`)
        }
      }
    }
  }
  if (a.sections.length && inlineCount === 0) err(`${a.id}: no inline citations in the body`)

  const live = a.status === 'published' || a.status === 'update-needed'
  if (live && a.citations.length < 12) warn(`${a.id}: published entry has only ${a.citations.length} citations`)
  if (a.topics.includes('violence') && !a.contentNotice) warn(`${a.id}: violence topic without a contentNotice`)
  for (const r of a.riskFlags) {
    const mustConfirm = ['sexual-violence', 'minors', 'active-litigation', 'identity-exposure']
    if (mustConfirm.includes(r.kind) && !r.requiresSecondConfirm) err(`${a.id}/${r.id}: ${r.kind} must set requiresSecondConfirm`)
  }
  if (live && !s.versions.some((v) => v.id === a.currentVersionId)) err(`${a.id}: currentVersionId ${a.currentVersionId} has no version record`)
}

for (const f of s.factChecks) {
  const a = s.articles.find((x) => x.id === f.articleId)
  if (!a) { err(`factcheck ${f.id}: unknown articleId ${f.articleId}`); continue }
  if (!a.factCheckIds.includes(f.id)) err(`factcheck ${f.id}: article ${a.id} does not list it`)
  const citIds = new Set(a.citations.map((c) => c.id))
  for (const cid of f.citationIds) if (!citIds.has(cid)) err(`factcheck ${f.id}: citationIds contains unknown ${cid}`)
  if (!f.whatWouldChangeIt) err(`factcheck ${f.id}: must state what would change the verdict`)
  if (!f.reasoning || f.reasoning.length < 2) err(`factcheck ${f.id}: needs at least two reasoning steps`)
}

const LADDER = ['well-supported', 'true-missing-context', 'partly-true', 'conflicting-evidence',
  'insufficient-evidence', 'misleading', 'mostly-false', 'unverifiable']
const used = new Set(s.factChecks.map((f) => f.verdict))
for (const v of LADDER) if (!used.has(v)) warn(`verdict '${v}' is never used anywhere in the corpus`)

for (const sig of s.signals) {
  if (sig.linkedArticleId && !articleIds.has(sig.linkedArticleId)) err(`signal ${sig.id}: unknown linkedArticleId ${sig.linkedArticleId}`)
  if (sig.reportCount < sig.mergedFrom.length) err(`signal ${sig.id}: reportCount ${sig.reportCount} < mergedFrom ${sig.mergedFrom.length}`)
  // Multi-source means corroborated by more than one independent source —
  // two is the editorial floor. Three is a strength, not the definition.
  if (sig.corroboration === 'multi-source' && sig.independentSourceCount < 2) err(`signal ${sig.id}: multi-source needs >= 2 independent sources`)
  if (sig.corroboration === 'unverified' && sig.primarySourceCount > 0) err(`signal ${sig.id}: unverified cannot carry a primary source`)
  if (sig.primarySourceCount > sig.independentSourceCount && sig.independentSourceCount > 0) err(`signal ${sig.id}: more primary than independent sources`)
  if (sig.status === 'declined' && !sig.declineReason) err(`signal ${sig.id}: a spiked signal must keep its reason`)
  if (sig.linkedArticleId && sig.status !== 'drafted') err(`signal ${sig.id}: links an article but is not marked drafted`)
  if (sig.corroboration === 'single-source' && sig.independentSourceCount !== 1) err(`signal ${sig.id}: single-source must have exactly 1 independent source`)
}

for (const r of s.research) if (!sourceIds.has(r.sourceId)) err(`research ${r.id}: unknown sourceId ${r.sourceId}`)
for (const c of s.suspiciousClaims) if (c.linkedFactCheckId && !factCheckIds.has(c.linkedFactCheckId)) err(`claim ${c.id}: unknown linkedFactCheckId ${c.linkedFactCheckId}`)

for (const b of s.briefs) {
  for (const t of b.topFive) if (!signalIds.has(t.signalId)) err(`brief ${b.date}: unknown signalId ${t.signalId}`)
  for (const r of b.recommended) if (!articleIds.has(r.articleId)) err(`brief ${b.date}: unknown articleId ${r.articleId}`)
  for (const id of b.pendingArticleIds) if (!articleIds.has(id)) err(`brief ${b.date}: unknown pending ${id}`)
  for (const x of b.riskAlerts) if (!articleIds.has(x.articleId)) err(`brief ${b.date}: unknown risk articleId ${x.articleId}`)
  for (const x of b.updateNeeded) if (!articleIds.has(x.articleId)) err(`brief ${b.date}: unknown update articleId ${x.articleId}`)
  for (const x of b.citationFailures) {
    const a = s.articles.find((y) => y.id === x.articleId)
    if (!a) err(`brief ${b.date}: unknown citationFailure articleId ${x.articleId}`)
    else if (!a.citations.some((c) => c.id === x.citationId)) err(`brief ${b.date}: citationFailure references unknown citation ${x.citationId}`)
  }
}

for (const e of s.audit) if (e.articleId && !articleIds.has(e.articleId)) err(`audit ${e.id}: unknown articleId ${e.articleId}`)
for (const p of s.pipelineRuns) {
  for (const id of p.producedArticleIds) if (!articleIds.has(id)) err(`pipeline ${p.id}: unknown articleId ${id}`)
  for (const id of p.producedSignalIds) if (!signalIds.has(id)) err(`pipeline ${p.id}: unknown signalId ${id}`)
}
for (const v of s.versions) if (!articleIds.has(v.articleId)) err(`version ${v.id}: unknown articleId ${v.articleId}`)
for (const a of s.assets) if (a.articleId && !articleIds.has(a.articleId)) err(`asset ${a.id}: unknown articleId ${a.articleId}`)
for (const a of s.assets) {
  if (a.conceptual && !a.guardrail) err(`asset ${a.id}: AI 概念插图 must carry a guardrail note`)
  if (a.chartId && !chartIds.has(a.chartId)) err(`asset ${a.id}: unknown chartId ${a.chartId}`)
}

/* --------------------------------- report -------------------------------- */

const counts = {
  articles: s.articles.length, sources: s.sources.length, charts: s.charts.length,
  factChecks: s.factChecks.length, signals: s.signals.length, research: s.research.length,
  assets: s.assets.length, versions: s.versions.length, audit: s.audit.length, briefs: s.briefs.length,
  citations: s.articles.reduce((n, a) => n + a.citations.length, 0),
}
console.log('PRISM 演示数据完整性检查')
console.log('—'.repeat(52))
console.log(Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join('  ·  '))
console.log('—'.repeat(52))
for (const w of warnings) console.log(`  警告  ${w}`)
for (const e of errors) console.log(`  错误  ${e}`)
console.log('—'.repeat(52))
console.log(`${errors.length} 错误 · ${warnings.length} 警告`)

rmSync(out, { recursive: true, force: true })
process.exit(errors.length ? 1 : 0)
