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
  pointAt,
  seriesColor,
  truncate,
} from './scale'
import './BarChart.css'

/**
 * Grouped bars. Handles a single series and six series with the same layout
 * rules; the value axis is always zero-based, because with bars the length of
 * the mark is the claim.
 */

const AXIS_FONT = 11
const CAT_FONT = 11
const MAX_CAT_CHARS = 10

export interface BarChartProps {
  spec: ChartSpec
  height?: number
}

export function BarChart({ spec, height = 260 }: BarChartProps): JSX.Element {
  const { ref, width } = useChartWidth()
  const [tip, setTip] = useState<ChartTipData | null>(null)
  const [active, setActive] = useState<string | null>(null)

  const series = spec.series
  const cats = categoriesOf(series)

  const values: number[] = []
  for (const s of series) {
    for (const p of s.points) if (Number.isFinite(p.value)) values.push(p.value)
  }

  const axis = niceAxis(Math.min(0, ...values), Math.max(0, ...values), 5, true)
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

  const minSlot = Math.max(rotate ? 28 : 36, series.length * 16 + 20)
  const needW = padLeft + padRight + catCount * minSlot
  const w = Math.max(width, needW)
  const scroll = needW > width
  const h = Math.max(height, padTop + padBottom + 90)
  const plotW = w - padLeft - padRight
  const plotH = h - padTop - padBottom

  const y = (v: number) => padTop + ((axis.max - v) / axis.span) * plotH
  const zeroY = Math.min(padTop + plotH, Math.max(padTop, y(0)))

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
      <div className="pbar pbar--empty" ref={ref}>
        <p className="pbar__empty">暂无可绘制的数据。</p>
      </div>
    )
  }

  const groupW = plotW / catCount
  const inner = groupW * 0.74
  const barW = Math.max(3, inner / series.length)
  const labelY = padTop + plotH + 17

  const desc = `${spec.title}：共 ${series.length} 个系列、${cats.length} 个类别，数值介于 ${fmtValue(
    Math.min(0, ...values),
  )} 与 ${fmtValue(Math.max(0, ...values))} ${spec.unit} 之间。完整数据见随附表格。`

  return (
    <div className={cx('pbar', scroll && 'pbar--scrolling')}>
      <ChartCanvas
        block="pbar"
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
              className={cx('pbar__grid', t === 0 && 'pbar__grid--zero')}
              x1={padLeft}
              x2={padLeft + plotW}
              y1={y(t)}
              y2={y(t)}
            />
            <text className="pbar__tick" x={padLeft - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
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
              className="pbar__cat"
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

        {cats.map((cat, ci) =>
          series.map((s, si) => {
            const p = pointAt(s, cat)
            if (!p || !Number.isFinite(p.value)) return null
            const colour = seriesColor(si, s.color)
            const x = padLeft + ci * groupW + (groupW - inner) / 2 + si * barW
            const vy = y(p.value)
            const top = Math.min(vy, zeroY)
            const barH = Math.max(Math.abs(vy - zeroY), p.value === 0 ? 0.75 : 1.5)
            const key = `${si}-${ci}`
            return (
              <rect
                key={key}
                className={cx('pbar__mark', active === key && 'pbar__mark--active')}
                x={x}
                y={top}
                width={Math.max(2, barW - 1.5)}
                height={barH}
                rx={Math.min(2.5, barW / 3)}
                fill={colour}
                tabIndex={0}
                onMouseEnter={() =>
                  show(key, {
                    x: x + barW / 2,
                    y: top,
                    series: s.name,
                    label: cleanLabel(cat),
                    value: fmtWithUnit(p.value, spec.unit),
                    color: colour,
                  })
                }
                onMouseLeave={hide}
                onFocus={() =>
                  show(key, {
                    x: x + barW / 2,
                    y: top,
                    series: s.name,
                    label: cleanLabel(cat),
                    value: fmtWithUnit(p.value, spec.unit),
                    color: colour,
                  })
                }
                onBlur={hide}
              >
                <title>{markTitle(s.name, cleanLabel(cat), p.value, spec.unit)}</title>
              </rect>
            )
          }),
        )}

        <line
          className="pbar__axis"
          x1={padLeft}
          x2={padLeft + plotW}
          y1={zeroY}
          y2={zeroY}
        />
      </ChartCanvas>

      {scroll ? <p className="pbar__hint">横向滚动可查看全部类别。</p> : null}

      <SrTable
        caption={`${spec.title}（单位：${spec.unit}）`}
        columns={['类别', ...series.map((s) => s.name)]}
        rows={cats.map((cat) => [
          cleanLabel(cat),
          ...series.map((s) => {
            const p = pointAt(s, cat)
            return p && Number.isFinite(p.value) ? fmtValue(p.value) : '无数据'
          }),
        ])}
      />
    </div>
  )
}
