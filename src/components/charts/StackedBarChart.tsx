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
  markTitle,
  niceAxis,
  percent,
  pointAt,
  seriesColor,
  truncate,
} from './scale'
import './StackedBarChart.css'

/**
 * Stacked bars — composition within a category.
 *
 * Stacking only means anything for quantities that genuinely add up, so
 * negative values are not stacked: they are drawn as zero and reported as such
 * in the accompanying table rather than silently folded into the total.
 */

const AXIS_FONT = 11
const CAT_FONT = 11
const MAX_CAT_CHARS = 10

export interface StackedBarChartProps {
  spec: ChartSpec
  height?: number
}

export function StackedBarChart({ spec, height = 260 }: StackedBarChartProps): JSX.Element {
  const { ref, width } = useChartWidth()
  const [tip, setTip] = useState<ChartTipData | null>(null)
  const [active, setActive] = useState<string | null>(null)

  const series = spec.series
  const cats = categoriesOf(series)

  const stackOf = (cat: string): number =>
    series.reduce((acc, s) => {
      const p = pointAt(s, cat)
      return acc + (p && Number.isFinite(p.value) ? Math.max(0, p.value) : 0)
    }, 0)

  const totals = cats.map(stackOf)
  const axis = niceAxis(0, Math.max(0, ...totals), 5, true)
  const tickTexts = axis.ticks.map((t) => fmtNumber(t, axis.decimals))
  const padLeft = Math.ceil(Math.max(26, ...tickTexts.map((t) => estTextWidth(t, AXIS_FONT)))) + 14
  const padRight = 14
  const padTop = 14

  const catCount = Math.max(1, cats.length)
  const shownCats = cats.map((c) => truncate(cleanLabel(c), MAX_CAT_CHARS))
  const availW = Math.max(width - padLeft - padRight, 120)
  const longest = Math.max(0, ...shownCats.map((c) => estTextWidth(c, CAT_FONT)))
  const rotate = longest > availW / catCount - 8
  const padBottom = rotate ? Math.min(98, 32 + Math.ceil(longest * 0.62)) : 32

  const minSlot = rotate ? 30 : 42
  const needW = padLeft + padRight + catCount * minSlot
  const w = Math.max(width, needW)
  const scroll = needW > width
  const h = Math.max(height, padTop + padBottom + 90)
  const plotW = w - padLeft - padRight
  const plotH = h - padTop - padBottom

  const y = (v: number) => padTop + ((axis.max - v) / axis.span) * plotH
  const baseY = y(0)

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
      <div className="pstack pstack--empty" ref={ref}>
        <p className="pstack__empty">暂无可绘制的数据。</p>
      </div>
    )
  }

  const groupW = plotW / catCount
  const barW = Math.max(8, Math.min(56, groupW * 0.6))
  const labelY = padTop + plotH + 17

  const desc = `${spec.title}：${cats.length} 个类别的堆叠构成，共 ${series.length} 个分项，单位为${spec.unit}。完整数据见随附表格。`

  return (
    <div className={cx('pstack', scroll && 'pstack--scrolling')}>
      <ChartCanvas
        block="pstack"
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
              className="pstack__grid"
              x1={padLeft}
              x2={padLeft + plotW}
              y1={y(t)}
              y2={y(t)}
            />
            <text className="pstack__tick" x={padLeft - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
              {tickTexts[i]}
            </text>
          </g>
        ))}

        {cats.map((cat, ci) => {
          const centre = padLeft + ci * groupW + groupW / 2
          const full = cleanLabel(cat)
          const text = shownCats[ci]
          return (
            <text
              key={`c-${ci}`}
              className="pstack__cat"
              x={centre}
              y={labelY}
              textAnchor={rotate ? 'end' : 'middle'}
              transform={rotate ? `rotate(-38 ${centre} ${labelY})` : undefined}
            >
              {text}
              {text !== full ? <title>{full}</title> : null}
            </text>
          )
        })}

        {cats.map((cat, ci) => {
          const centre = padLeft + ci * groupW + groupW / 2
          const x = centre - barW / 2
          const total = totals[ci]
          let cursor = 0
          return (
            <g key={`s-${ci}`}>
              {series.map((s, si) => {
                const p = pointAt(s, cat)
                const raw = p && Number.isFinite(p.value) ? p.value : 0
                const v = Math.max(0, raw)
                if (v <= 0) return null
                const top = y(cursor + v)
                const segH = Math.max(1, y(cursor) - top)
                cursor += v
                const colour = seriesColor(si, s.color)
                const key = `${si}-${ci}`
                const data: ChartTipData = {
                  x: centre,
                  y: top,
                  series: s.name,
                  label: cleanLabel(cat),
                  value: fmtWithUnit(raw, spec.unit),
                  color: colour,
                  note: `占该类合计 ${percent(v, total)}（合计 ${fmtWithUnit(total, spec.unit)}）`,
                }
                return (
                  <rect
                    key={key}
                    className={cx('pstack__mark', active === key && 'pstack__mark--active')}
                    x={x}
                    y={top}
                    width={barW}
                    height={segH}
                    fill={colour}
                    tabIndex={0}
                    onMouseEnter={() => show(key, data)}
                    onMouseLeave={hide}
                    onFocus={() => show(key, data)}
                    onBlur={hide}
                  >
                    <title>
                      {`${markTitle(s.name, cleanLabel(cat), raw, spec.unit)}（占合计 ${percent(v, total)}）`}
                    </title>
                  </rect>
                )
              })}
              <text className="pstack__total u-num" x={centre} y={y(total) - 7} textAnchor="middle">
                {fmtValue(total)}
              </text>
            </g>
          )
        })}

        <line className="pstack__axis" x1={padLeft} x2={padLeft + plotW} y1={baseY} y2={baseY} />
      </ChartCanvas>

      <SrTable
        caption={`${spec.title}（单位：${spec.unit}）`}
        columns={['类别', ...series.map((s) => s.name), '合计']}
        rows={cats.map((cat, ci) => [
          cleanLabel(cat),
          ...series.map((s) => {
            const p = pointAt(s, cat)
            return p && Number.isFinite(p.value) ? fmtValue(p.value) : '无数据'
          }),
          fmtValue(totals[ci]),
        ])}
      />
    </div>
  )
}
