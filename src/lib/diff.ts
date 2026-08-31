/**
 * PRISM 棱镜 — 版本比对 (version diffing).
 *
 * Two levels of comparison power the workbench:
 *  - `diffWords`    — a token-level LCS diff that reads correctly for 简体中文
 *                     (one token per CJK character), Latin words, numbers and
 *                     citation markers such as `[[c:cit-004]]`, which are kept
 *                     atomic so a diff can never split a reference in half.
 *  - `diffArticles` — a structural diff that aligns sections and blocks between
 *                     two article snapshots and reports added / removed /
 *                     changed content blocks.
 *
 * Both are pure and deterministic: the same pair of snapshots always produces
 * the same rows, which is what lets the console show a stable, reviewable
 * "what the desk proposes to change" screen.
 */
import type { Article, Block, ID, SectionKind } from './types'
import { blockText } from './util'

/* ------------------------------------------------------------------ *
 * Word-level diff
 * ------------------------------------------------------------------ */

export type WordOp = { type: 'same' | 'add' | 'del'; text: string }

/**
 * Upper bound on either side of the dynamic-programming table.
 * 1200 × 1200 cells is ~2.9 MB in a Uint16Array and completes well inside a
 * frame budget; beyond that we degrade to a whole-block replace so the UI can
 * never hang on a pathological paragraph.
 */
const MAX_DP_TOKENS = 1200

/**
 * Token order matters: citation markers first (atomic), then Latin words,
 * then numbers, then a single CJK character, then a whitespace run, then any
 * remaining single code point (punctuation, symbols).
 */
const TOKEN_RE =
  /\[\[c:[A-Za-z0-9_-]+\]\]|[A-Za-z][A-Za-z'’\-]*|\d+(?:[.,]\d+)*%?|[㐀-䶿一-鿿豈-﫿]|\s+|[^\s]/gu

const WS_ONLY = /^\s+$/

/**
 * Split into diff tokens. Whitespace is attached to the token that follows it
 * so that inserting or deleting a word carries its separating space with it and
 * `same + del` always re-joins to exactly the original string.
 */
function tokenize(input: string): string[] {
  const out: string[] = []
  let pending = ''
  for (const m of input.matchAll(TOKEN_RE)) {
    const piece = m[0]
    if (WS_ONLY.test(piece)) {
      pending += piece
      continue
    }
    out.push(pending + piece)
    pending = ''
  }
  if (pending) {
    if (out.length > 0) out[out.length - 1] += pending
    else out.push(pending)
  }
  return out
}

/** Merge neighbouring ops of the same kind and drop empty ones. */
function joinOps(ops: WordOp[]): WordOp[] {
  const out: WordOp[] = []
  for (const op of ops) {
    if (!op.text) continue
    const last = out[out.length - 1]
    if (last && last.type === op.type) last.text += op.text
    else out.push({ type: op.type, text: op.text })
  }
  return out
}

/** Classic LCS backtrack over a bottom-up table — a genuine minimal diff. */
function lcsOps(a: string[], b: string[]): WordOp[] {
  const n = a.length
  const m = b.length
  if (n === 0 && m === 0) return []
  if (n === 0) return [{ type: 'add', text: b.join('') }]
  if (m === 0) return [{ type: 'del', text: a.join('') }]

  const w = m + 1
  const dp = new Uint16Array((n + 1) * w)
  for (let i = n - 1; i >= 0; i -= 1) {
    const row = i * w
    const next = (i + 1) * w
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[row + j] = a[i] === b[j]
        ? dp[next + j + 1] + 1
        : Math.max(dp[next + j], dp[row + j + 1])
    }
  }

  const ops: WordOp[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'same', text: a[i] })
      i += 1
      j += 1
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
      ops.push({ type: 'del', text: a[i] })
      i += 1
    } else {
      ops.push({ type: 'add', text: b[j] })
      j += 1
    }
  }
  while (i < n) { ops.push({ type: 'del', text: a[i] }); i += 1 }
  while (j < m) { ops.push({ type: 'add', text: b[j] }); j += 1 }
  return ops
}

/**
 * Word/character level diff between two strings.
 *
 * Common prefixes and suffixes are trimmed first — for LCS this is provably
 * safe (an optimal alignment always exists that matches equal heads/tails) and
 * it keeps the DP small for the common case of a one-sentence rewrite.
 */
export function diffWords(before: string, after: string): WordOp[] {
  if (before === after) return before ? [{ type: 'same', text: before }] : []
  if (!before) return after ? [{ type: 'add', text: after }] : []
  if (!after) return [{ type: 'del', text: before }]

  const a = tokenize(before)
  const b = tokenize(after)
  if (a.length === 0) return [{ type: 'add', text: after }]
  if (b.length === 0) return [{ type: 'del', text: before }]

  let lo = 0
  while (lo < a.length && lo < b.length && a[lo] === b[lo]) lo += 1
  let hiA = a.length - 1
  let hiB = b.length - 1
  while (hiA >= lo && hiB >= lo && a[hiA] === b[hiB]) { hiA -= 1; hiB -= 1 }

  const ops: WordOp[] = []
  if (lo > 0) ops.push({ type: 'same', text: a.slice(0, lo).join('') })

  const midA = a.slice(lo, hiA + 1)
  const midB = b.slice(lo, hiB + 1)
  if (midA.length > MAX_DP_TOKENS || midB.length > MAX_DP_TOKENS) {
    // Too large to align token by token: fall back to a whole-block replace.
    if (midA.length > 0) ops.push({ type: 'del', text: midA.join('') })
    if (midB.length > 0) ops.push({ type: 'add', text: midB.join('') })
  } else {
    ops.push(...lcsOps(midA, midB))
  }

  if (hiA + 1 < a.length) ops.push({ type: 'same', text: a.slice(hiA + 1).join('') })
  return joinOps(ops)
}

/* ------------------------------------------------------------------ *
 * Structural diff
 * ------------------------------------------------------------------ */

export interface BlockDiffRow {
  key: string
  sectionTitle: string
  sectionKind: SectionKind
  kind: 'unchanged' | 'added' | 'removed' | 'changed'
  blockType: string
  before?: string
  after?: string
  /** Present when `kind === 'changed'`. */
  words?: WordOp[]
}

export interface DiffStats {
  added: number
  removed: number
  changed: number
}

/** Human-facing labels for `BlockDiffRow.blockType`. */
export const BLOCK_TYPE_LABEL: Record<Block['type'], string> = {
  paragraph: '正文段落',
  heading: '小标题',
  list: '列表',
  callout: '提示框',
  pullquote: '引文',
  figure: '图片',
  chart: '图表',
  timeline: '时间线',
  table: '表格',
  divergence: '分歧对照',
}

interface Pair<T> { before?: T; after?: T }

/**
 * Align two sequences: exact key (id) matches first, then — among whatever is
 * left — the nearest unused item of the same group (section kind / block type).
 * Items that never match are spliced back in beside their original neighbour so
 * the resulting list still reads top to bottom.
 */
function alignSequences<T>(
  befores: T[],
  afters: T[],
  keyOf: (t: T) => string,
  groupOf: (t: T) => string,
): Pair<T>[] {
  const used = new Set<number>()
  const matchFor: (number | undefined)[] = afters.map(() => undefined)

  const idIndex = new Map<string, number>()
  befores.forEach((b, i) => { if (!idIndex.has(keyOf(b))) idIndex.set(keyOf(b), i) })
  afters.forEach((a, k) => {
    const i = idIndex.get(keyOf(a))
    if (i !== undefined && !used.has(i)) {
      used.add(i)
      matchFor[k] = i
    }
  })

  afters.forEach((a, k) => {
    if (matchFor[k] !== undefined) return
    let best = -1
    let bestDist = Number.POSITIVE_INFINITY
    befores.forEach((b, i) => {
      if (used.has(i) || groupOf(b) !== groupOf(a)) return
      const dist = Math.abs(i - k)
      if (dist < bestDist) { bestDist = dist; best = i }
    })
    if (best >= 0) {
      used.add(best)
      matchFor[k] = best
    }
  })

  const pairs: Pair<T>[] = afters.map((a, k) => {
    const i = matchFor[k]
    return i === undefined ? { after: a } : { before: befores[i], after: a }
  })

  const pairIndexOf = new Map<number, number>()
  matchFor.forEach((i, k) => { if (i !== undefined) pairIndexOf.set(i, k) })

  let insertAt = 0
  befores.forEach((b, i) => {
    const known = pairIndexOf.get(i)
    if (known !== undefined) {
      insertAt = known + 1
      return
    }
    pairs.splice(insertAt, 0, { before: b })
    for (const [bi, pi] of pairIndexOf) if (pi >= insertAt) pairIndexOf.set(bi, pi + 1)
    insertAt += 1
  })

  return pairs
}

/**
 * Flat text of a block for diffing. `blockText` carries the prose; charts and
 * figures have little or no prose, so their structural identity is appended —
 * otherwise swapping a chart would read as "no change".
 */
function rowText(b: Block): string {
  const base = blockText(b)
  if (b.type === 'chart') return `图表：${b.chartId}`
  if (b.type === 'figure') return base ? `${base}（图片：${b.assetId}）` : `图片：${b.assetId}`
  return base
}

function blockTypeLabel(before: Block | undefined, after: Block | undefined): string {
  if (before && after && before.type !== after.type) return `${before.type} → ${after.type}`
  const b = after ?? before
  return b ? b.type : 'unknown'
}

export function diffArticles(before: Article, after: Article): { rows: BlockDiffRow[]; stats: DiffStats } {
  const sectionPairs = alignSequences(
    before.sections,
    after.sections,
    (s) => s.id,
    (s) => s.kind,
  )

  const rows: BlockDiffRow[] = []
  const stats: DiffStats = { added: 0, removed: 0, changed: 0 }
  const seenKeys = new Set<string>()

  const pushRow = (row: BlockDiffRow) => {
    let key = row.key
    let n = 2
    while (seenKeys.has(key)) { key = `${row.key}#${n}`; n += 1 }
    seenKeys.add(key)
    rows.push({ ...row, key })
    if (row.kind !== 'unchanged') stats[row.kind] += 1
  }

  for (const pair of sectionPairs) {
    const section = pair.after ?? pair.before
    if (!section) continue
    const sectionTitle = section.title
    const sectionKind: SectionKind = section.kind
    const sectionKey = pair.after?.id ?? pair.before?.id ?? section.kind

    const blockPairs = alignSequences(
      pair.before?.blocks ?? [],
      pair.after?.blocks ?? [],
      (b) => b.id,
      (b) => b.type,
    )

    for (const bp of blockPairs) {
      const key = `${sectionKey}::${bp.before?.id ?? '∅'}→${bp.after?.id ?? '∅'}`
      const blockType = blockTypeLabel(bp.before, bp.after)

      if (bp.before && !bp.after) {
        pushRow({ key, sectionTitle, sectionKind, kind: 'removed', blockType, before: rowText(bp.before) })
        continue
      }
      if (!bp.before && bp.after) {
        pushRow({ key, sectionTitle, sectionKind, kind: 'added', blockType, after: rowText(bp.after) })
        continue
      }
      if (!bp.before || !bp.after) continue

      const beforeText = rowText(bp.before)
      const afterText = rowText(bp.after)
      if (beforeText === afterText && bp.before.type === bp.after.type) {
        pushRow({ key, sectionTitle, sectionKind, kind: 'unchanged', blockType, before: beforeText, after: afterText })
        continue
      }
      pushRow({
        key,
        sectionTitle,
        sectionKind,
        kind: 'changed',
        blockType,
        before: beforeText,
        after: afterText,
        words: diffWords(beforeText, afterText),
      })
    }
  }

  return { rows, stats }
}

/* ------------------------------------------------------------------ *
 * Reference delta
 * ------------------------------------------------------------------ */

/** Every source the article leans on: attached sources plus cited sources. */
function refIds(a: Article): ID[] {
  const seen: ID[] = []
  const push = (id: ID) => { if (id && !seen.includes(id)) seen.push(id) }
  for (const id of a.sourceIds) push(id)
  for (const c of a.citations) push(c.sourceId)
  return seen
}

export function diffRefs(before: Article, after: Article): { added: ID[]; removed: ID[] } {
  const beforeIds = refIds(before)
  const afterIds = refIds(after)
  const beforeSet = new Set(beforeIds)
  const afterSet = new Set(afterIds)
  return {
    added: afterIds.filter((id) => !beforeSet.has(id)),
    removed: beforeIds.filter((id) => !afterSet.has(id)),
  }
}

/* ------------------------------------------------------------------ *
 * Summary line
 * ------------------------------------------------------------------ */

export function summarizeDiff(stats: DiffStats): string {
  const parts: string[] = []
  if (stats.added > 0) parts.push(`新增 ${stats.added} 处`)
  if (stats.removed > 0) parts.push(`删除 ${stats.removed} 处`)
  if (stats.changed > 0) parts.push(`改写 ${stats.changed} 处`)
  if (parts.length === 0) return '正文无变化'
  return parts.join(' · ')
}
