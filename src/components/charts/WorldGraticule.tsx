import { useState } from 'react'
import { clamp, cx } from '../../lib/util'
import { ChartCanvas, SrTable } from './ChartPrimitives'
import type { ChartTipData } from './ChartPrimitives'
import { useChartWidth } from './useChartWidth'
import { closedSmoothPath, estTextWidth, fmtValue, overlaps, truncate } from './scale'
import type { Box, Pt } from './scale'
import './WorldGraticule.css'

/**
 * An ABSTRACT projection — a schematic of "a world", never a map of ours.
 *
 * The jurisdictions in this prototype are invented, so drawing them onto real
 * coastlines would quietly assert that the reporting maps onto real places. The
 * strata below are generated from sine sums: organic, deliberately unfamiliar,
 * and matched to no landmass anywhere. Only the graticule is conventional,
 * because a lat/long grid is what makes the picture legible as a world at all.
 */

const LABEL_FONT = 11
const LABEL_MIN_R = 7.5

export interface WorldGraticuleProps {
  points: { label: string; x: number; y: number; value: number; tone?: string }[]
  title?: string
  height?: number
  onSelect?: (label: string) => void
}

interface Stratum {
  cx: number
  cy: number
  rx: number
  ry: number
  lobes: number
  phase: number
  jitter: number
  depth: number
}

/** Fixed, hand-tuned abstract strata in a 0–100 × 0–100 space. */
const STRATA: Stratum[] = [
  { cx: 27, cy: 33, rx: 21, ry: 16, lobes: 3, phase: 0.6, jitter: 0.22, depth: 1 },
  { cx: 69, cy: 27, rx: 18, ry: 12.5, lobes: 4, phase: 2.1, jitter: 0.25, depth: 1 },
  { cx: 45, cy: 71, rx: 16, ry: 12, lobes: 5, phase: 1.2, jitter: 0.3, depth: 2 },
  { cx: 82, cy: 66, rx: 12, ry: 10, lobes: 4, phase: 0.2, jitter: 0.28, depth: 2 },
  { cx: 12, cy: 62, rx: 7, ry: 6, lobes: 3, phase: 2.8, jitter: 0.3, depth: 3 },
  { cx: 92, cy: 45, rx: 5.5, ry: 5, lobes: 4, phase: 1.9, jitter: 0.26, depth: 3 },
]

function stratumPoints(s: Stratum, scale: number): Pt[] {
  const out: Pt[] = []
  const n = 16
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2
    const k =
      1 +
      s.jitter * Math.sin(s.lobes * a + s.phase) +
      s.jitter * 0.45 * Math.sin(s.lobes * 2.3 * a + s.phase * 1.7)
    out.push({
      x: s.cx + Math.cos(a) * s.rx * k * scale,
      y: s.cy + Math.sin(a) * s.ry * k * scale,
    })
  }
  return out
}

export function WorldGraticule({
  points,
  title,
  height = 380,
  onSelect,
}: WorldGraticuleProps): JSX.Element {
  const { ref, width } = useChartWidth()
  const [tip, setTip] = useState<ChartTipData | null>(null)
  const [active, setActive] = useState<string | null>(null)

  const w = width
  const h = Math.round(Math.min(height, Math.max(170, w * 0.52)))
  const pad = 12
  const plotW = Math.max(60, w - pad * 2)
  const plotH = Math.max(60, h - pad * 2)

  const X = (nx: number) => pad + (clamp(nx, 0, 100) / 100) * plotW
  const Y = (ny: number) => pad + (clamp(ny, 0, 100) / 100) * plotH

  const values = points.map((p) => p.value).filter((v) => Number.isFinite(v))
  const maxValue = values.length > 0 ? Math.max(...values) : 0
  const radiusOf = (v: number) =>
    maxValue > 0 && Number.isFinite(v) && v > 0 ? 5 + 13 * Math.sqrt(clamp(v / maxValue, 0, 1)) : 5

  const meridians = 12
  const parallels = 6

  /* Label placement: bigger marks claim their side first; anything that still
     collides loses its label and keeps the value in its <title>. */
  const occupied: Box[] = points.map((p) => ({
    x: X(p.x) - radiusOf(p.value),
    y: Y(p.y) - radiusOf(p.value),
    w: radiusOf(p.value) * 2,
    h: radiusOf(p.value) * 2,
  }))

  const order = points
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (Number(b.p.value) || 0) - (Number(a.p.value) || 0))

  const labelSide = new Map<number, 'start' | 'end'>()
  for (const { p, i } of order) {
    const r = radiusOf(p.value)
    if (r < LABEL_MIN_R) continue
    const text = truncate(p.label, 12)
    const tw = estTextWidth(text, LABEL_FONT)
    const px = X(p.x)
    const py = Y(p.y)
    const right: Box = { x: px + r + 5, y: py - 7, w: tw + 3, h: 14 }
    const left: Box = { x: px - r - 5 - tw - 3, y: py - 7, w: tw + 3, h: 14 }
    const fits = (b: Box) => b.x >= 2 && b.x + b.w <= w - 2 && b.y >= 2 && b.y + b.h <= h - 2
    if (fits(right) && !occupied.some((o) => overlaps(right, o))) {
      labelSide.set(i, 'start')
      occupied.push(right)
    } else if (fits(left) && !occupied.some((o) => overlaps(left, o))) {
      labelSide.set(i, 'end')
      occupied.push(left)
    }
  }

  const show = (key: string, data: ChartTipData) => {
    setActive(key)
    setTip(data)
  }
  const hide = () => {
    setActive(null)
    setTip(null)
  }

  const desc = `示意投影：抽象的经纬网格与虚构陆块，标出 ${points.length} 个虚构司法辖区的取值，圆点面积与数值成正比。该图形不对应任何真实地理。完整数据见随附表格。`

  return (
    <div className={cx('pgrat', onSelect && 'pgrat--selectable')}>
      {title ? <p className="pgrat__title">{title}</p> : null}

      <ChartCanvas
        block="pgrat"
        width={w}
        height={h}
        scroll={false}
        containerRef={ref}
        title={title ?? '示意投影'}
        desc={desc}
        tip={tip}
      >
        <rect className="pgrat__field" x={pad} y={pad} width={plotW} height={plotH} rx={6} />

        <g className="pgrat__strata">
          {STRATA.map((s, i) => (
            <g key={`s-${i}`} className={`pgrat__stratum pgrat__stratum--d${s.depth}`}>
              <path
                d={closedSmoothPath(stratumPoints(s, 1).map((p) => ({ x: X(p.x), y: Y(p.y) })))}
                className="pgrat__blob"
              />
              <path
                d={closedSmoothPath(stratumPoints(s, 0.66).map((p) => ({ x: X(p.x), y: Y(p.y) })))}
                className="pgrat__blob pgrat__blob--inner"
              />
            </g>
          ))}
        </g>

        <g className="pgrat__grid" aria-hidden="true">
          {Array.from({ length: meridians + 1 }, (_, i) => {
            const nx = (i / meridians) * 100
            return (
              <line
                key={`m-${i}`}
                className={cx('pgrat__line', i === meridians / 2 && 'pgrat__line--axis')}
                x1={X(nx)}
                x2={X(nx)}
                y1={pad}
                y2={pad + plotH}
              />
            )
          })}
          {Array.from({ length: parallels + 1 }, (_, i) => {
            const ny = (i / parallels) * 100
            return (
              <line
                key={`p-${i}`}
                className={cx('pgrat__line', i === parallels / 2 && 'pgrat__line--axis')}
                x1={pad}
                x2={pad + plotW}
                y1={Y(ny)}
                y2={Y(ny)}
              />
            )
          })}
        </g>

        {points.map((p, i) => {
          const r = radiusOf(p.value)
          const px = X(p.x)
          const py = Y(p.y)
          const colour = p.tone ?? 'var(--accent)'
          const key = `${i}-${p.label}`
          const side = labelSide.get(i)
          const text = truncate(p.label, 12)
          const data: ChartTipData = {
            x: px,
            y: py - r,
            series: '虚构司法辖区',
            label: p.label,
            value: fmtValue(p.value),
            color: colour,
          }
          return (
            <g
              key={key}
              className={cx('pgrat__point', active === key && 'pgrat__point--active')}
              tabIndex={0}
              role={onSelect ? 'button' : undefined}
              onMouseEnter={() => show(key, data)}
              onMouseLeave={hide}
              onFocus={() => show(key, data)}
              onBlur={hide}
              onClick={onSelect ? () => onSelect(p.label) : undefined}
              onKeyDown={
                onSelect
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelect(p.label)
                      }
                    }
                  : undefined
              }
            >
              <title>{`虚构司法辖区 · ${p.label} · ${fmtValue(p.value)}`}</title>
              <circle className="pgrat__halo" cx={px} cy={py} r={r + 2.5} fill={colour} />
              <circle className="pgrat__dot" cx={px} cy={py} r={r} fill={colour} />
              <circle className="pgrat__pin" cx={px} cy={py} r={1.6} />
              {side ? (
                <text
                  className="pgrat__label"
                  x={side === 'start' ? px + r + 5 : px - r - 5}
                  y={py + 4}
                  textAnchor={side}
                >
                  {text}
                </text>
              ) : null}
            </g>
          )
        })}
      </ChartCanvas>

      <p className="pgrat__caption">
        示意投影：本原型中的司法辖区均为虚构，不对应任何真实地理。
      </p>
      <p className="pgrat__key">
        圆点面积与数值成正比{maxValue > 0 ? `，最大值 ${fmtValue(maxValue)}` : ''}
        ；标签在拥挤处会被省略，取值可通过键盘逐点聚焦读取。
      </p>

      <SrTable
        caption={`${title ?? '示意投影'}：虚构司法辖区取值一览`}
        columns={['虚构司法辖区', '数值']}
        rows={points.map((p) => [p.label, fmtValue(p.value)])}
      />
    </div>
  )
}
