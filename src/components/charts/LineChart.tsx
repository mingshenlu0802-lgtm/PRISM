import { useState } from 'react'
import type { ChartSpec } from '../../lib/types'
import { cx } from '../../lib/util'
import { ChartCanvas, SrTable } from './ChartPrimitives'
import type { ChartTipData } from './ChartPrimitives'
import { useChartWidth } from './useChartWidth'
import {
  categoriesOf,
  cleanLabel,
  estTextWidth,
  fmtNumber,
  fmtValue,
  fmtWithUnit,
  isBreak,
  linePath,
  markTitle,
  niceAxis,
  pointAt,
  seriesColor,
  truncate,
} from './scale'
import './LineChart.css'

/**
 * Lines over an ordered category axis, with an explicit methodology break.
 *
 * When the way a figure is counted changes, the series before and after are not
 * the same measurement. This chart refuses to draw a continuous line across
 * that rupture: a point whose value is `NaN` (or whose label carries the `⟂`
 * marker) becomes a dashed rule labelled 「口径变更」, the line is cut, and the
 * discontinuity is repeated in words underneath.
 *
 * Missing points inside a series' own range are gaps too — they are never
 * interpolated over, because an unbroken line would assert data we do not have.
 */

const AXIS_FONT = 11
const CAT_FONT = 11
const MAX_CAT_CHARS = 9
const BREAK_LABEL = '口径变更'

export interface LineChartProps {
  spec: ChartSpec
  height?: number
}

interface Plotted {
  x: number
  y: number
  value: number
  label: string
}

export function LineChart({ spec, height = 260 }: LineChartProps): JSX.Element {
  const { ref, width } = useChartWidth()
  const [tip, setTip] = useState<ChartTipData | null>(null)
  const [active, setActive] = useState<string | null>(null)

  const series = spec.series
  const cats = categoriesOf(series)
  const catCount = Math.max(1, cats.length)

  const breakCol = cats.map(
    (cat) =>
      isBreak({ label: cat, value: 0 }) ||
      series.some((s) => {
        const p = pointAt(s, cat)
        return p ? isBreak(p) : false
      }),
  )

  const values: number[] = []
  cats.forEach((cat, i) => {
    if (breakCol[i]) return
    for (const s of series) {
      const p = pointAt(s, cat)
      if (p && Number.isFinite(p.value)) values.push(p.value)
    }
  })
  const minV = values.length > 0 ? Math.min(...values) : 0
  const maxV = values.length > 0 ? Math.max(...values) : 1
  const zeroBased = minV >= 0 && minV <= maxV * 0.45
  const axis = niceAxis(minV, maxV, 5, zeroBased)

  const tickTexts = axis.ticks.map((t) => fmtNumber(t, axis.decimals))
  const padLeft = Math.ceil(Math.max(26, ...tickTexts.map((t) => estTextWidth(t, AXIS_FONT)))) + 14
  const padRight = 16
  const padTop = 16

  const needW = padLeft + padRight + Math.max(0, catCount - 1) * 26 + 24
  const w = Math.max(width, needW)
  const scroll = needW > width
  const plotW = w - padLeft - padRight

  const shownCats = cats.map((cat, i) =>
    breakCol[i] ? BREAK_LABEL : truncate(cleanLabel(cat), MAX_CAT_CHARS),
  )
  const longest = Math.max(0, ...shownCats.map((c) => estTextWidth(c, CAT_FONT)))
  const slotW = plotW / catCount
  const rotate = longest > slotW - 8
  const perLabel = rotate ? 16 : longest + 12
  const labelStep = Math.max(1, Math.ceil((catCount * perLabel) / Math.max(1, plotW)))
  const padBottom = rotate ? Math.min(98, 32 + Math.ceil(longest * 0.62)) : 32

  const h = Math.max(height, padTop + padBottom + 96)
  const plotH = h - padTop - padBottom

  const x = (i: number) => (catCount === 1 ? padLeft + plotW / 2 : padLeft + (i / (catCount - 1)) * plotW)
  const y = (v: number) => padTop + ((axis.max - v) / axis.span) * plotH

  const show = (key: string, data: ChartTipData) => {
    setActive(key)
    setTip(data)
  }
  const hide = () => {
    setActive(null)
    setTip(null)
  }

  if (series.length === 0 || cats.length === 0) {
    return (
      <div className="pline pline--empty" ref={ref}>
        <p className="pline__empty">暂无可绘制的数据。</p>
      </div>
    )
  }

  const labelY = padTop + plotH + 17
  const breakCount = breakCol.filter(Boolean).length

  const segmentsFor = (si: number): { segments: Plotted[][]; points: Plotted[] } => {
    const s = series[si]
    const own = cats.map((cat) => pointAt(s, cat))
    const first = own.findIndex((p) => p !== undefined)
    const last = own.reduce((acc, p, i) => (p !== undefined ? i : acc), -1)
    const segments: Plotted[][] = []
    const points: Plotted[] = []
    let current: Plotted[] = []
    if (first < 0) return { segments, points }
    for (let i = first; i <= last; i += 1) {
      const p = own[i]
      const usable = !breakCol[i] && p !== undefined && Number.isFinite(p.value) && !isBreak(p)
      if (!usable) {
        if (current.length > 0) segments.push(current)
        current = []
        continue
      }
      const plotted: Plotted = { x: x(i), y: y(p.value), value: p.value, label: cleanLabel(cats[i]) }
      current.push(plotted)
      points.push(plotted)
    }
    if (current.length > 0) segments.push(current)
    return { segments, points }
  }

  const desc = `${spec.title}：${series.length} 条序列，横轴共 ${cats.length} 个刻度，单位为${spec.unit}${
    breakCount > 0 ? `；其中 ${breakCount} 处口径变更已断开，前后不可直接比较` : ''
  }。完整数据见随附表格。`

  return (
    <div className={cx('pline', scroll && 'pline--scrolling')}>
      <ChartCanvas
        block="pline"
        width={w}
        height={h}
        scroll={scroll}
        containerRef={ref}
        title={spec.title}
        desc={desc}
        tip={tip}
      >
        {axis.ticks.map((t, i) => (
          <g key={`t-${i}`}>
            <line
              className={cx('pline__grid', t === 0 && 'pline__grid--zero')}
              x1={padLeft}
              x2={padLeft + plotW}
              y1={y(t)}
              y2={y(t)}
            />
            <text className="pline__tick" x={padLeft - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
              {tickTexts[i]}
            </text>
          </g>
        ))}

        {cats.map((cat, i) => {
          if (!breakCol[i]) return null
          return (
            <line
              key={`b-${i}`}
              className="pline__break"
              x1={x(i)}
              x2={x(i)}
              y1={padTop}
              y2={padTop + plotH}
            >
              <title>{`${BREAK_LABEL}：${cleanLabel(cat)} — 此处统计口径发生变化，前后数据不可直接比较。`}</title>
            </line>
          )
        })}

        {cats.map((cat, i) => {
          const isEdge = i === 0 || i === cats.length - 1
          if (!breakCol[i] && !isEdge && i % labelStep !== 0) return null
          const full = breakCol[i] ? `${BREAK_LABEL}（${cleanLabel(cat)}）` : cleanLabel(cat)
          const text = shownCats[i]
          const cxp = x(i)
          return (
            <text
              key={`c-${i}`}
              className={cx('pline__cat', breakCol[i] && 'pline__cat--break')}
              x={cxp}
              y={labelY}
              textAnchor={rotate ? 'end' : 'middle'}
              transform={rotate ? `rotate(-38 ${cxp} ${labelY})` : undefined}
            >
              {text}
              {text !== full ? <title>{full}</title> : null}
            </text>
          )
        })}

        {series.map((s, si) => {
          const colour = seriesColor(si, s.color)
          const { segments } = segmentsFor(si)
          return (
            <g key={`l-${si}`}>
              {segments.map((seg, gi) =>
                seg.length > 1 ? (
                  <path
                    key={`p-${gi}`}
                    className="pline__path"
                    d={linePath(seg)}
                    stroke={colour}
                    fill="none"
                  />
                ) : null,
              )}
            </g>
          )
        })}

        {series.map((s, si) => {
          const colour = seriesColor(si, s.color)
          const { points } = segmentsFor(si)
          return (
            <g key={`d-${si}`}>
              {points.map((pt, pi) => {
                const key = `${si}-${pi}-${pt.label}`
                const data: ChartTipData = {
                  x: pt.x,
                  y: pt.y,
                  series: s.name,
                  label: pt.label,
                  value: fmtWithUnit(pt.value, spec.unit),
                  color: colour,
                }
                return (
                  <g
                    key={key}
                    className={cx('pline__dot', active === key && 'pline__dot--active')}
                    tabIndex={0}
                    onMouseEnter={() => show(key, data)}
                    onMouseLeave={hide}
                    onFocus={() => show(key, data)}
                    onBlur={hide}
                  >
                    <title>{markTitle(s.name, pt.label, pt.value, spec.unit)}</title>
                    <circle className="pline__hit" cx={pt.x} cy={pt.y} r={10} />
                    <circle className="pline__ring" cx={pt.x} cy={pt.y} r={4.6} fill={colour} />
                    <circle className="pline__core" cx={pt.x} cy={pt.y} r={2} />
                  </g>
                )
              })}
            </g>
          )
        })}

        <line
          className="pline__axis"
          x1={padLeft}
          x2={padLeft + plotW}
          y1={padTop + plotH}
          y2={padTop + plotH}
        />
      </ChartCanvas>

      {scroll ? <p className="pline__hint">横向滚动可查看完整时间轴。</p> : null}

      {(breakCount > 0 || !zeroBased) && (
        <ul className="pline__notes">
          {breakCount > 0 ? (
            <li className="pline__note pline__note--break">
              <span className="pline__notemark" aria-hidden="true" />
              <span className="pline__notetext">
                虚线处统计口径发生变更，线条已断开：断点前后的数值不可直接比较。
              </span>
            </li>
          ) : null}
          {!zeroBased ? (
            <li className="pline__note">纵轴未从 0 开始，请按刻度读数，不要按线条高度比例读数。</li>
          ) : null}
        </ul>
      )}

      <SrTable
        caption={`${spec.title}（单位：${spec.unit}）`}
        columns={['刻度', ...series.map((s) => s.name)]}
        rows={cats.map((cat, i) => {
          if (breakCol[i]) {
            return [`${cleanLabel(cat)}（${BREAK_LABEL}）`, ...series.map(() => '口径变更，前后不可比')]
          }
          return [
            cleanLabel(cat),
            ...series.map((s) => {
              const p = pointAt(s, cat)
              return p && Number.isFinite(p.value) ? fmtValue(p.value) : '无数据'
            }),
          ]
        })}
      />
    </div>
  )
}
