/**
 * Version history generator.
 *
 * Versions are the product's memory: a revision must never overwrite its
 * predecessor. So every entry carries a real trail — the desk's first draft,
 * the cross-checking pass that added primary sources, the editor's own passes —
 * and each earlier snapshot is a genuinely different article, not a label on
 * the same text. The deltas below are derived deterministically from the
 * current entry, so the diff view always has something true to show.
 *
 * Pure and deterministic: no Date.now(), no Math.random().
 */
import type { Article, Block, ID, SectionKind, Version } from '../types'
import { diffArticles, diffRefs } from '../diff'

/* ------------------------------------------------------------------ *
 * Snapshot surgery
 * ------------------------------------------------------------------ */

const CITE_RE = /\s*\[\[c:([a-zA-Z0-9_-]+)\]\]/g

/** Remove the inline markers of citations that no longer exist. */
function stripMarkers(text: string, keep: Set<ID>): string {
  return text.replace(CITE_RE, (whole, id: string) => (keep.has(id) ? whole : ''))
}

function stripBlock(b: Block, keep: Set<ID>): Block {
  switch (b.type) {
    case 'paragraph': case 'heading':
      return { ...b, text: stripMarkers(b.text, keep) }
    case 'pullquote':
      return { ...b, text: stripMarkers(b.text, keep) }
    case 'callout':
      return { ...b, title: stripMarkers(b.title, keep), text: stripMarkers(b.text, keep) }
    case 'list':
      return { ...b, items: b.items.map((i) => stripMarkers(i, keep)) }
    case 'table':
      return { ...b, rows: b.rows.map((r) => r.map((c) => stripMarkers(c, keep))) }
    case 'timeline':
      return {
        ...b,
        entries: b.entries.map((e) => ({
          ...e,
          text: stripMarkers(e.text, keep),
          citationIds: (e.citationIds ?? []).filter((id) => keep.has(id)),
        })),
      }
    case 'divergence':
      return {
        ...b,
        positions: b.positions.map((p) => ({
          ...p,
          position: stripMarkers(p.position, keep),
          evidence: stripMarkers(p.evidence, keep),
          citationIds: p.citationIds.filter((id) => keep.has(id)),
        })),
      }
    default:
      return b
  }
}

/** Drop the trailing `n` blocks of the named sections. */
function trimSections(a: Article, kinds: SectionKind[], n: number): Article {
  return {
    ...a,
    sections: a.sections.map((s) =>
      kinds.includes(s.kind) && s.blocks.length > n
        ? { ...s, blocks: s.blocks.slice(0, s.blocks.length - n) }
        : s),
  }
}

/** Keep only the first `ratio` of the citation list, and clean up after it. */
function trimCitations(a: Article, ratio: number): Article {
  const keepCount = Math.max(4, Math.floor(a.citations.length * ratio))
  const kept = a.citations.slice(0, keepCount)
  const keep = new Set(kept.map((c) => c.id))
  const usedSources = new Set(kept.map((c) => c.sourceId))
  return {
    ...a,
    citations: kept,
    // A source is only dropped once nothing cites it any more.
    sourceIds: a.sourceIds.filter((id) => usedSources.has(id)),
    citationChecks: a.citationChecks.filter((c) => keep.has(c.citationId)),
    sections: a.sections.map((s) => ({ ...s, blocks: s.blocks.map((b) => stripBlock(b, keep)) })),
  }
}

/** The desk's first draft: thinner analysis, fewer sources, plainer standfirst. */
function firstDraft(a: Article): Article {
  const trimmed = trimCitations(trimSections(a, ['power', 'unknowns', 'watch'], 1), 0.74)
  return {
    ...trimmed,
    standfirst: plainStandfirst(a.standfirst),
    confidence: Math.max(30, a.confidence - 16),
    confidenceBasis: '自动编辑台初稿：尚未完成一手材料回溯，可信度按未核实状态给出。',
    riskFlags: a.riskFlags.map((r) => ({ ...r, resolved: false, resolutionNote: undefined })),
  }
}

/** After cross-checking: the sources are back, the added analysis is not. */
function crossChecked(a: Article): Article {
  const trimmed = trimSections(a, ['power', 'unknowns', 'watch'], 1)
  return {
    ...trimmed,
    standfirst: plainStandfirst(a.standfirst),
    confidence: Math.max(35, a.confidence - 7),
    confidenceBasis: '交叉核实后：一手材料已回溯，但交叉性分析与不确定性章节尚未补齐。',
    riskFlags: a.riskFlags.map((r) => ({ ...r, resolved: false, resolutionNote: undefined })),
  }
}

/** The editor's context pass restores the analysis but not the framing review. */
function contextPass(a: Article): Article {
  return {
    ...a,
    confidence: Math.max(40, a.confidence - 3),
    riskFlags: a.riskFlags.map((r) =>
      r.kind === 'victim-blaming' || r.kind === 'sexual-violence'
        ? { ...r, resolved: false, resolutionNote: undefined }
        : r),
  }
}

/**
 * The first draft's standfirst: the same facts, stated flatly, before the
 * editor found the line that says what the piece is actually about.
 */
function plainStandfirst(s: string): string {
  const firstStop = s.search(/[。？！]/)
  const head = firstStop > 0 ? s.slice(0, firstStop + 1) : s
  return `${head}本稿为自动编辑台初稿，待人工复核。`
}

/* ------------------------------------------------------------------ *
 * Proposals awaiting the editor's confirmation
 * ------------------------------------------------------------------ */

interface ProposalSpec {
  instruction: string
  label: string
  summary: string
  apply: (a: Article) => Article
}

/** A pending proposal on the two entries the console opens on. */
const PROPOSALS: Record<string, ProposalSpec> = {
  'art-amirat': {
    instruction: '把可能拼合出申请人身份的细节再筛一遍，宁可牺牲具体性。',
    label: '主编：再次收紧可识别信息',
    summary: '将两处地点与程序细节改为范围表述，并在「尚未确定的信息」中说明为何不能更具体。',
    apply: (a) => ({
      ...a,
      sections: a.sections.map((s) =>
        s.kind !== 'unknowns' ? s : {
          ...s,
          blocks: [
            ...s.blocks,
            {
              id: `${a.id}-prop-unknown`,
              type: 'callout' as const,
              tone: 'unknown' as const,
              title: '为什么这里不能更具体',
              text: '本站掌握的两处细节（受理站点与听证排期区间）足以在小样本中把申请人识别出来，因此改为范围表述。这不是证据不足，而是编辑判断：具体性带来的信息增量，抵不上当事人可能承担的风险。',
            },
          ],
        }),
      confidence: Math.max(30, a.confidence - 2),
    }),
  },
  'art-maran': {
    instruction: '重新检查每一处「指控」与「认定」的用词是否被混用。',
    label: '主编：区分指控与司法认定',
    summary: '逐句复核指控／证据／编辑判断／司法结论的用词边界，并补一条读者提示。',
    apply: (a) => ({
      ...a,
      sections: a.sections.map((s) =>
        s.kind !== 'facts' ? s : {
          ...s,
          blocks: [
            {
              id: `${a.id}-prop-facts`,
              type: 'callout' as const,
              tone: 'caution' as const,
              title: '本文如何使用「指控」与「认定」',
              text: '「指控」指尚未经审理认定的主张，本文一律注明由谁提出、向谁提出、何时提出。「认定」只用于法庭已作出的事实认定，并注明审级。凡属本站的编辑判断，句中会自我标注。读者若在文中发现这三者被混用，那是本站的错误，请据此要求更正。',
            },
            ...s.blocks,
          ],
        }),
    }),
  },
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

interface Step {
  suffix: string
  label: string
  author: 'ai-desk' | 'editor'
  summary: string
  instruction?: string
  at: string
  make: (a: Article) => Article
}

function stepsFor(a: Article): Step[] {
  const created = a.createdAt
  const day = created.slice(0, 10)
  const steps: Step[] = [
    {
      suffix: 'd1',
      label: '自动编辑台初稿',
      author: 'ai-desk',
      summary: '按多来源聚类生成初稿：核心事实、背景与初步核查，尚未回溯全部一手材料。',
      at: `${day}T02:10:00Z`,
      make: firstDraft,
    },
    {
      suffix: 'd2',
      label: '交叉核实后补充一手来源',
      author: 'ai-desk',
      summary: '回溯法院判决、法定申报与统计发布原文，补回被初稿省略的引用并重算可信度。',
      at: `${day}T04:35:00Z`,
      make: crossChecked,
    },
    {
      suffix: 'd3',
      label: '主编：加入法律与历史背景',
      author: 'editor',
      instruction: '加入这一辖区的法律与历史背景，并补齐交叉性分析。',
      summary: '补回权力结构与交叉性分析、尚未确定的信息与后续观察项。',
      at: `${day}T07:20:00Z`,
      make: contextPass,
    },
  ]

  const needsFraming = a.riskFlags.some(
    (r) => r.kind === 'victim-blaming' || r.kind === 'sexual-violence')
  if (needsFraming) {
    steps.push({
      suffix: 'd4',
      label: '主编：检查受害者有罪论框架',
      author: 'editor',
      instruction: '检查是否存在受害者有罪论。',
      summary: '复核被动语态与因果暗示，逐条处置风险提示并记录处置说明。',
      at: `${day}T09:05:00Z`,
      make: (x) => x,
    })
  }
  return steps
}

export function buildVersions(articles: Article[]): Version[] {
  const out: Version[] = []

  for (const article of articles) {
    const short = article.id.replace(/^art-/, '')
    const steps = stepsFor(article)

    // Each step is a snapshot; the final one is the article as it stands now.
    const snapshots: { id: ID; label: string; author: 'ai-desk' | 'editor'; summary: string; instruction?: string; at: string; snapshot: Article }[] = []
    steps.forEach((s, i) => {
      const isLast = i === steps.length - 1
      snapshots.push({
        id: isLast ? `ver-${short}-${steps.length}` : `ver-${short}-${s.suffix}`,
        label: s.label,
        author: s.author,
        summary: s.summary,
        instruction: s.instruction,
        at: s.at,
        snapshot: isLast ? article : s.make(article),
      })
    })

    snapshots.forEach((s, i) => {
      const prev = i === 0 ? null : snapshots[i - 1].snapshot
      const d = prev ? diffArticles(prev, s.snapshot) : null
      const refs = prev ? diffRefs(prev, s.snapshot) : { added: s.snapshot.sourceIds, removed: [] }
      out.push({
        id: s.id,
        articleId: article.id,
        n: i + 1,
        label: s.label,
        createdAt: s.at,
        author: s.author,
        instruction: s.instruction,
        summary: s.summary,
        refDelta: refs,
        snapshot: s.snapshot,
        state: 'adopted',
        stats: d ? d.stats : { added: countBlocks(s.snapshot), removed: 0, changed: 0 },
      })
    })

    // A proposal the editor has not yet accepted — the workbench needs one.
    const proposal = PROPOSALS[article.id]
    if (proposal) {
      const base = article
      const snapshot = proposal.apply(base)
      const d = diffArticles(base, snapshot)
      out.push({
        id: `ver-${short}-p1`,
        articleId: article.id,
        n: steps.length + 1,
        label: proposal.label,
        createdAt: `${article.updatedAt.slice(0, 10)}T05:48:00Z`,
        author: 'editor',
        instruction: proposal.instruction,
        summary: proposal.summary,
        refDelta: diffRefs(base, snapshot),
        snapshot,
        state: 'proposal',
        stats: d.stats,
      })
    }
  }

  return out
}

function countBlocks(a: Article): number {
  return a.sections.reduce((n, s) => n + s.blocks.length, 0)
}

/** The version id each entry currently reflects, after generation. */
export function currentVersionIdFor(article: Article): ID {
  const short = article.id.replace(/^art-/, '')
  return `ver-${short}-${stepsFor(article).length}`
}
