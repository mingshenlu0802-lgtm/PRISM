import type { Article, Citation, ID, PrismState, Source } from './types'
import { PRIMARY_TYPES } from './constants'

let seq = 0
/** Stable-enough ids for a client-side prototype. */
export function uid(prefix: string): ID {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`
}

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/* ---------------------------------- dates --------------------------------- */

const ZH_MONTH = (m: number) => `${m}月`

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getUTCFullYear()}年${ZH_MONTH(d.getUTCMonth() + 1)}${d.getUTCDate()}日`
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${fmtDate(iso)} ${hh}:${mm} UTC`
}

export function fmtClock(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** Relative time against the prototype's fixed clock. */
export function relTime(iso: string, from: string): string {
  const a = new Date(iso).getTime()
  const b = new Date(from).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return iso
  const mins = Math.round((b - a) / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} 小时前`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days} 天前`
  return fmtDate(iso)
}

/* --------------------------------- sources -------------------------------- */

export function isPrimarySource(s: Source): boolean {
  return s.isPrimary || PRIMARY_TYPES.includes(s.sourceType)
}

export function articleSources(article: Article, state: PrismState): Source[] {
  const byId = new Map(state.sources.map((s) => [s.id, s]))
  return article.sourceIds.map((id) => byId.get(id)).filter((s): s is Source => Boolean(s))
}

export function primaryCount(article: Article, state: PrismState): number {
  return articleSources(article, state).filter(isPrimarySource).length
}

export function citationSource(c: Citation, state: PrismState): Source | undefined {
  return state.sources.find((s) => s.id === c.sourceId)
}

/** Ordered citation numbers, assigned by first appearance in the body text. */
export function citationOrder(article: Article): ID[] {
  const seen: ID[] = []
  const push = (text: string) => {
    for (const m of text.matchAll(/\[\[c:([a-zA-Z0-9_-]+)\]\]/g)) {
      if (!seen.includes(m[1])) seen.push(m[1])
    }
  }
  for (const section of article.sections) {
    for (const b of section.blocks) {
      switch (b.type) {
        case 'paragraph': case 'heading': push(b.text); break
        case 'callout': push(b.title); push(b.text); break
        case 'pullquote': push(b.text); break
        case 'list': b.items.forEach(push); break
        case 'table': b.rows.forEach((r) => r.forEach(push)); break
        case 'timeline': b.entries.forEach((e) => { push(e.text); (e.citationIds ?? []).forEach((id) => { if (!seen.includes(id)) seen.push(id) }) }); break
        case 'divergence': b.positions.forEach((p) => { push(p.position); push(p.evidence); p.citationIds.forEach((id) => { if (!seen.includes(id)) seen.push(id) }) }); break
        default: break
      }
    }
  }
  // Citations attached to the record but never referenced inline still list last.
  for (const c of article.citations) if (!seen.includes(c.id)) seen.push(c.id)
  return seen
}

export function citationNumbers(article: Article): Map<ID, number> {
  const map = new Map<ID, number>()
  citationOrder(article).forEach((id, i) => map.set(id, i + 1))
  return map
}

/** Plain text of a block, used for diffing, search and word counts. */
export function blockText(b: Article['sections'][number]['blocks'][number]): string {
  switch (b.type) {
    case 'paragraph': case 'heading': return b.text
    case 'callout': return `${b.title}\n${b.text}`
    case 'pullquote': return b.text + (b.attribution ? `\n— ${b.attribution}` : '')
    case 'list': return b.items.join('\n')
    case 'figure': return b.caption
    case 'table': return [b.columns.join(' | '), ...b.rows.map((r) => r.join(' | '))].join('\n')
    case 'timeline': return b.entries.map((e) => `${e.date} ${e.title} ${e.text}`).join('\n')
    case 'divergence': return b.positions.map((p) => `${p.holder}: ${p.position} ${p.evidence}`).join('\n')
    case 'chart': return ''
    default: return ''
  }
}

export function stripCitations(text: string): string {
  return text.replace(/\[\[c:[a-zA-Z0-9_-]+\]\]/g, '')
}

export function articleWordCount(a: Article): number {
  const text = a.sections.flatMap((s) => s.blocks.map(blockText)).join('\n')
  const plain = stripCitations(text)
  const cjk = (plain.match(/[一-鿿]/g) ?? []).length
  const latin = (plain.match(/[A-Za-z][A-Za-z'-]*/g) ?? []).length
  return cjk + latin
}

/* ---------------------------------- misc ---------------------------------- */

export function pct(n: number): string {
  return `${Math.round(n)}%`
}

export function groupBy<T, K extends string>(items: T[], key: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const item of items) {
    const k = key(item)
    ;(out[k] ||= []).push(item)
  }
  return out
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

export function sortBy<T>(items: T[], key: (t: T) => number | string, dir: 'asc' | 'desc' = 'asc'): T[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const ka = key(a); const kb = key(b)
    if (ka < kb) return -1 * sign
    if (ka > kb) return 1 * sign
    return 0
  })
}
