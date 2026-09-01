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

/** 这个站的时区。站长在北京时间，每天早上六点那一批也是按这个时区发的。 */
export const SITE_TZ = 'Asia/Shanghai'

/**
 * 今天，北京时间。
 *
 * 首页顶上那个日期本来一直显示 2026-08-31——它取的是演示数据里写死的常量。
 * 一个每天更新的新闻站，日期停在某一天，读者第一眼就知道这站没人管。
 *
 * 用北京时间而不是读者本地时间：这是一份按北京时间每天早上六点出的日报，
 * 「今天」应该是编辑部的今天。读者在伦敦打开，看到的该是同一期的日期，
 * 而不是他自己那边的日历——否则同一批内容会在不同人屏幕上标着不同的日子。
 *
 * en-CA 给的就是 YYYY-MM-DD，不用自己拼。
 */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SITE_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

/*
 * 日期时间一律按北京时间显示。
 *
 * 这里原本用的是 UTC 取值器（getUTCHours 那一串）。对「2026-09-01」这种
 * 纯日期没有影响，但 published_at 是完整时间戳：早上六点那一场收集写进去的
 * 是前一天的 22:00 UTC，页面上就会显示成**前一天晚上十点收录**。
 *
 * 这是一份按北京时间每天两场的日报，时间就该按北京时间读。
 */
function parts(iso: string): Record<string, string> | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const out: Record<string, string> = {}
  for (const p of new Intl.DateTimeFormat('en-CA', {
    timeZone: SITE_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)) out[p.type] = p.value
  return out
}

export function fmtDate(iso: string): string {
  const p = parts(iso)
  if (!p) return iso
  return `${p.year}年${Number(p.month)}月${Number(p.day)}日`
}

export function fmtDateTime(iso: string): string {
  const p = parts(iso)
  if (!p) return iso
  // 24 小时制下午夜是 24，不是 00——把它归回 00。
  const hh = p.hour === '24' ? '00' : p.hour
  return `${fmtDate(iso)} ${hh}:${p.minute}`
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

/* ------------------------------------------------------------------ *
 * 每次打开，顺序都不一样
 *
 * 站长要的：「每次打开界面对新闻的推送都是随机的（当然，最新的新闻更有概率
 * 被推送）。」
 *
 * 严格按时间倒序有个代价：第 20 条以后的新闻几乎没人会看到，而它们和第 3 条
 * 一样是认真挑过、认真写过的。加权随机让每条都有机会露面，同时保证今天的
 * 仍然比上周的更容易排在前面。
 *
 * 用的是 Efraimidis–Spirakis：给每条算一个 key = U^(1/w)，按 key 从大到小排，
 * 就是一次**不放回**的加权抽样。比「按权重随机挑一条、删掉、再挑」快得多，
 * 也不会挑出重复。
 * ------------------------------------------------------------------ */

/** 一个种子决定一次排列。同一次访问里顺序必须稳定——读到一半重排是很糟的体验。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 权重随时间衰减，半衰期三天。
 *
 * 三天是按这个站的节奏定的：每天早上进 30 条，三天前的那批还值得再露一次面，
 * 两周前的就该让位了。权重不会归零——旧新闻仍有小概率上来，这正是要的效果。
 */
const HALF_LIFE_DAYS = 3

export function recencyWeight(iso: string, now = Date.now()): number {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 0.05 // 日期坏了的排在后面，但别让它彻底消失
  const days = Math.max(0, (now - t) / 864e5)
  return Math.max(2 ** (-days / HALF_LIFE_DAYS), 0.01)
}

export function weightedShuffle<T>(items: T[], dateOf: (t: T) => string, seed: number, now = Date.now()): T[] {
  const rnd = mulberry32(seed)
  return items
    .map((item) => {
      const w = recencyWeight(dateOf(item), now)
      // u 不能取到 0：Math.log(0) 是 -Infinity，那条会被永远钉在最前面。
      const u = Math.max(rnd(), 1e-12)
      return { item, key: Math.log(u) / w }
    })
    .sort((a, b) => b.key - a.key)
    .map((x) => x.item)
}
