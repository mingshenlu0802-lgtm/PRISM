import type { ID, MediaLink, NewsItem, StudyItem } from './types'

let seq = 0
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

/* ---------------------------------- dates --------------------------------- */

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${fmtDate(iso)} ${hh}:${mm}`
}

export function relTime(iso: string, from = nowIso()): string {
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

/* ---------------------------------- links --------------------------------- */

/** RFC 2606 reserves `.invalid`; nothing there can ever resolve. */
const PLACEHOLDER = /(^|\.)invalid$|(^|\.)example\.(com|net|org)$/i

export function isPlaceholderUrl(url: string): boolean {
  try {
    return PLACEHOLDER.test(new URL(url).hostname)
  } catch {
    return true
  }
}

export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function primaryLinks(links: MediaLink[]): MediaLink[] {
  return links.filter((l) => l.primary)
}

/* ---------------------------------- text ---------------------------------- */

/** Rough character count, counting CJK as one and Latin words as one. */
export function textLength(s: string): number {
  const cjk = (s.match(/[一-鿿]/g) ?? []).length
  const latin = (s.match(/[A-Za-z][A-Za-z'-]*/g) ?? []).length
  return cjk + latin
}

export function slugify(s: string): string {
  const ascii = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (ascii.length >= 6) return ascii.slice(0, 60)
  // Chinese headlines produce no usable ascii — fall back to a short hash.
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return `item-${h.toString(36)}`
}

/** Newest first. Works for both content types. */
export function byNewest<T extends { publishedAt?: string; date?: string }>(items: T[]): T[] {
  return sortBy(items, (i) => i.publishedAt ?? i.date ?? '', 'desc')
}

export function isLive(item: NewsItem | StudyItem): boolean {
  return item.status === 'live'
}

/**
 * 把一段总结切成自然段。
 *
 * 空行分段是最不用教的写法——站长在文本框里怎么打，页面上就怎么显示。
 * 单个换行也当作分段，因为大多数人按一次回车就是想换段。
 */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}
