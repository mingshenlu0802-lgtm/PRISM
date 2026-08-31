/**
 * PRISM 棱镜 — chart maths.
 *
 * Every chart in this repository is hand-authored SVG: there is no charting
 * library anywhere in the dependency tree. This module holds the small amount
 * of geometry and number formatting the chart components share — nice-number
 * axis ticks, the series palette, text-width estimation for label collision
 * decisions, and the methodology-break convention used by `LineChart`.
 */

import type { ChartSpec } from '../../lib/types'
import { clamp } from '../../lib/util'

export type ChartSeries = ChartSpec['series'][number]
export type ChartPoint = ChartSeries['points'][number]

/* ------------------------------------------------------------------ *
 * Palette
 * ------------------------------------------------------------------ */

/**
 * Series colours, in cycle order. Restrained refracted light — never a
 * rainbow, and never colour as the only carrier of meaning.
 */
export const CHART_COLORS: readonly string[] = [
  'var(--prism-1)',
  'var(--prism-2)',
  'var(--prism-3)',
  'var(--prism-4)',
  'var(--prism-6)',
  'var(--coral-500)',
]

/** The palette colour for series `index`, unless the spec pins its own. */
export function seriesColor(index: number, override?: string): string {
  if (override && override.trim().length > 0) return override.trim()
  const n = CHART_COLORS.length
  return CHART_COLORS[((index % n) + n) % n]
}

/* ------------------------------------------------------------------ *
 * Nice-number axes
 * ------------------------------------------------------------------ */

/** Heckbert's loose label algorithm: snap a span to 1 / 2 / 5 × 10ⁿ. */
function niceNum(range: number, round: boolean): number {
  if (!Number.isFinite(range) || range <= 0) return 1
  const exp = Math.floor(Math.log10(range))
  const frac = range / Math.pow(10, exp)
  let nice: number
  if (round) {
    if (frac < 1.5) nice = 1
    else if (frac < 3) nice = 2
    else if (frac < 7) nice = 5
    else nice = 10
  } else {
    if (frac <= 1) nice = 1
    else if (frac <= 2) nice = 2
    else if (frac <= 5) nice = 5
    else nice = 10
  }
  return nice * Math.pow(10, exp)
}

/** How many decimals a step of this size needs in order to read exactly. */
function decimalsFor(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0
  if (step >= 1) return 0
  return clamp(Math.ceil(-Math.log10(step)), 0, 6)
}

export interface NiceAxis {
  min: number
  max: number
  step: number
  ticks: number[]
  /** `max - min`, never zero — safe as a divisor. */
  span: number
  decimals: number
}

/**
 * Build a readable value axis. `zeroBased` anchors the scale at zero, which is
 * mandatory wherever length encodes magnitude (bars, stacks); line and range
 * charts pad the observed extent instead so that real movement stays visible.
 */
export function niceAxis(
  rawMin: number,
  rawMax: number,
  targetTicks = 5,
  zeroBased = true,
): NiceAxis {
  const finite = [rawMin, rawMax].filter((n) => Number.isFinite(n))
  let lo = finite.length > 0 ? Math.min(...finite) : 0
  let hi = finite.length > 0 ? Math.max(...finite) : 1

  if (zeroBased) {
    lo = Math.min(0, lo)
    hi = Math.max(0, hi)
  } else {
    const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.08 || 1
    lo -= pad
    hi += pad
  }
  if (hi <= lo) hi = lo + 1

  const target = Math.max(2, Math.round(targetTicks))
  const step = niceNum(niceNum(hi - lo, false) / (target - 1), true)
  const decimals = decimalsFor(step)
  const min = Math.floor(lo / step + 1e-9) * step
  const max = Math.ceil(hi / step - 1e-9) * step
  const count = Math.max(1, Math.round((max - min) / step))

  const ticks: number[] = []
  for (let i = 0; i <= count; i += 1) {
    ticks.push(Number((min + i * step).toFixed(Math.min(8, decimals + 2))))
  }

  return {
    min: ticks[0],
    max: ticks[ticks.length - 1],
    step,
    ticks,
    span: ticks[ticks.length - 1] - ticks[0] || 1,
    decimals,
  }
}

/* ------------------------------------------------------------------ *
 * Number formatting
 * ------------------------------------------------------------------ */

/** Grouped, deterministic formatting — no locale dependency, tabular-safe. */
export function fmtNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—'
  const fixed = Math.abs(value).toFixed(clamp(decimals, 0, 6))
  const dot = fixed.indexOf('.')
  const int = dot < 0 ? fixed : fixed.slice(0, dot)
  const frac = dot < 0 ? '' : fixed.slice(dot + 1)
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = value < 0 ? '−' : ''
  return `${sign}${grouped}${frac ? `.${frac}` : ''}`
}

/** A single value, at whatever precision it actually carries. */
export function fmtValue(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (Number.isInteger(value)) return fmtNumber(value, 0)
  const abs = Math.abs(value)
  return fmtNumber(value, abs >= 100 ? 1 : abs >= 1 ? 2 : 3)
}

/** A value plus its unit, used in tooltips and `<title>` elements. */
export function fmtWithUnit(value: number, unit?: string): string {
  const v = fmtValue(value)
  return unit && unit.trim() ? `${v} ${unit.trim()}` : v
}

/** The mandated mark description: "series · label · value unit". */
export function markTitle(series: string, label: string, value: number, unit?: string): string {
  return `${series} · ${label} · ${fmtWithUnit(value, unit)}`
}

export function percent(part: number, whole: number): string {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole === 0) return '—'
  const p = (part / whole) * 100
  return `${fmtNumber(p, p >= 10 ? 0 : 1)}%`
}

/* ------------------------------------------------------------------ *
 * Text metrics (estimated — we never touch the DOM to measure)
 * ------------------------------------------------------------------ */

const CJK = /[⺀-鿿　-〿＀-￯]/

/** Approximate rendered width of a label, good enough for collision logic. */
export function estTextWidth(text: string, fontSize: number): number {
  let units = 0
  for (const ch of text) {
    if (CJK.test(ch)) units += 1
    else if (/[A-Za-z0-9]/.test(ch)) units += 0.56
    else if (ch === ' ') units += 0.3
    else units += 0.42
  }
  return units * fontSize
}

/** Truncate to a visual budget, keeping the head and adding an ellipsis. */
export function truncate(text: string, maxChars: number): string {
  const chars = Array.from(text)
  if (chars.length <= maxChars) return text
  return `${chars.slice(0, Math.max(1, maxChars - 1)).join('')}…`
}

/* ------------------------------------------------------------------ *
 * Series helpers
 * ------------------------------------------------------------------ */

/** Category axis: every label across every series, in first-appearance order. */
export function categoriesOf(series: ChartSeries[]): string[] {
  const out: string[] = []
  for (const s of series) {
    for (const p of s.points) if (!out.includes(p.label)) out.push(p.label)
  }
  return out
}

export function pointAt(series: ChartSeries, label: string): ChartPoint | undefined {
  return series.points.find((p) => p.label === label)
}

/** The methodology-break marker a series label may carry. */
export const BREAK_MARK = '⟂'

/**
 * A break point marks a change in how the underlying figure was counted.
 * A chart that silently joins two incompatible definitions is a lie, so the
 * line is cut here and the rupture is drawn.
 */
export function isBreak(point: { label: string; value: number }): boolean {
  return Number.isNaN(point.value) || point.label.trimStart().startsWith(BREAK_MARK)
}

/** The human-readable part of a label, with any break marker removed. */
export function cleanLabel(label: string): string {
  return label.replace(/^[\s⟂]+/, '').trim() || label.trim()
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => (Number.isFinite(b) ? a + b : a), 0)
}

/* ------------------------------------------------------------------ *
 * Path geometry
 * ------------------------------------------------------------------ */

export interface Pt {
  x: number
  y: number
}

export function linePath(points: Pt[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')
}

export function polar(cx: number, cy: number, r: number, angleDeg: number): Pt {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

/** A donut segment between two angles, as a closed path. */
export function donutArc(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number,
): string {
  const end = Math.min(endDeg, startDeg + 359.99)
  const large = end - startDeg > 180 ? 1 : 0
  const o1 = polar(cx, cy, rOuter, startDeg)
  const o2 = polar(cx, cy, rOuter, end)
  const i2 = polar(cx, cy, rInner, end)
  const i1 = polar(cx, cy, rInner, startDeg)
  return [
    `M${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A${rOuter} ${rOuter} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    `A${rInner} ${rInner} 0 ${large} 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

/** Closed Catmull-Rom → cubic Bézier. Used for the abstract landmass strata. */
export function closedSmoothPath(points: Pt[]): string {
  const n = points.length
  if (n < 3) return ''
  let d = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`
  for (let i = 0; i < n; i += 1) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return `${d} Z`
}

/** Do two axis-aligned boxes overlap? Used for label collision avoidance. */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export function overlaps(a: Box, b: Box, gap = 2): boolean {
  return (
    a.x - gap < b.x + b.w &&
    a.x + a.w + gap > b.x &&
    a.y - gap < b.y + b.h &&
    a.y + a.h + gap > b.y
  )
}
