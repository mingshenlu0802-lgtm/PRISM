import { useState } from 'react'
import type { ChartSpec } from '../../lib/types'
import { clamp, cx } from '../../lib/util'
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
import './RangeChart.css'

/**
 * Point estimates with their confidence intervals.
 *
 * The band is the finding. A single number without its interval invites the
 * reader to treat an estimate as a measurement, so this chart always draws the
 * interval, always draws end caps so the reader can see where it stops, and
 * always states in the caption that the band is a confidence interval. Where a
 * point arrives with no interval at all, that absence is labelled 「未提供区间」
 * rather than being drawn as a point of unknown precision.
 *
 * Two layouts: below 420px each row carries its own full-width label above the
 * band, so a long institution name is never squeezed into a side column; above
 * that the labels sit in a left column, with the category as a group heading
 * whenever several series are being compared on the same rows.
 */

const AXIS_FONT = 11
const LABEL_FONT = 11
const ROW_H = 32
const HEAD_H = 19
const STACK_LABEL_H = 16
const BAND_H = 9

export interface RangeChartProps {
  spec: ChartSpec
  height?: number
}

interface RangeRow {
  key: string
  series: string
  color: string
  label: string
  value: number
  lo: number
  hi: number
  hasInterval: boolean
  groupStart: boolean
}

export function RangeChart({ spec, height }: RangeChartProps): JSX.Element {
  const { ref, width } = useChartWidth()
  const [tip, setTip] = useState<ChartTipData | null>(null)
  const [active, setActive] = useState<string | null>(null)

  const series = spec.series
  const cats = categoriesOf(series)
  const multi = series.length > 1

  const rows: RangeRow[] = []
  cats.forEach((cat) => {
    let first = true
    series.forEach((s, si) => {
      const p = pointAt(s, cat)
      if (!p || !Number.isFinite(p.value)) return
      const rawLo = Number.isFinite(p.lowValue ?? Number.NaN) ? (p.lowValue as number) : p.value
      const rawHi = Number.isFinite(p.highValue ?? Number.NaN) ? (p.highValue as number) : p.value
      rows.push({
        key: `${si}-${cat}`,
        series: s.name,
        color: seriesColor(si, s.color),
        label: cleanLabel(cat),
        value: p.value,
        lo: Math.min(rawLo, rawHi),
        hi: Math.max(rawLo, rawHi),
        hasInterval: rawLo !== rawHi,
        groupStart: first,
      })
      first = false
    })
  })

  const extents = rows.flatMap((r) => [r.lo, r.hi, r.value])
  const axis = niceAxis(
    extents.length > 0 ? Math.min(...extents) : 0,
    extents.length > 0 ? Math.max(...extents) : 1,
    5,
    false,
  )
  const tickTexts = axis.ticks.map((t) => fmtNumber(t, axis.decimals))

  /* Narrow viewports get a full-width label line per row instead of a side column. */
  const stacked = width < 420
  const sideTexts = rows.map((r) => (multi ? r.series : r.label))
  const rawLabelW = Math.max(56, ...sideTexts.map((t) => estTextWidth(truncate(t, 14), LABEL_FONT)))
  const labelW = stacked ? 4 : Math.round(clamp(rawLabelW + 12, 64, Math.max(78, width * 0.4)))
  const sideChars = Math.max(4, Math.floor((labelW - 12) / (LABEL_FONT * 0.95)))

  const padTop = 10
  const padRight = Math.ceil(estTextWidth(tickTexts[tickTexts.length - 1] ?? '', AXIS_FONT) / 2) + 10
  const padBottom = 34

  const needW = labelW + 150 + padRight
  const w = Math.max(width, needW)
  const scroll = needW > width
  const plotW = Math.max(60, w - labelW - padRight)

  /* Lane layout: optional group heading, then one lane per row. */
  const rowTop: number[] = []
  const headY: (number | null)[] = []
  let cursor = padTop
  rows.forEach((r, i) => {
    if (!stacked && multi && r.groupStart) {
      headY[i] = cursor + 13
      cursor += HEAD_H
    } else {
      headY[i] = null
    }
    rowTop[i] = cursor
    cursor += stacked ? ROW_H + STACK_LABEL_H : ROW_H
  })
  const contentH = cursor + padBottom
  const h = Math.max(height ?? 0, contentH)

  const x = (v: number) => labelW + ((v - axis.min) / axis.span) * plotW
  const bandY = (i: number) => rowTop[i] + (stacked ? STACK_LABEL_H : 0) + ROW_H / 2

  const show = (key: string, data: ChartTipData) => {
    setActive(key)
    setTip(data)
  }
  const hide = () => {
    setActive(null)
    setTip(null)
  }

  if (rows.length === 0) {
    return (
      <div className="prange prange--empty" ref={ref}>
        <p className="prange__empty">暂无可绘制的估计值。</p>
      </div>
    )
  }

  const axisY = cursor
  const wideChars = Math.max(6, Math.floor((w - 12) / (LABEL_FONT * 0.95)))
  const desc = `${spec.title}：${rows.length} 项点估计值及其置信区间，单位为${spec.unit}。区间越宽表示不确定性越大。完整数据见随附表格。`

  return (
    <div className={cx('prange', scroll && 'prange--scrolling')}>
      <ChartCanvas
        block="prange"
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
            <line className="prange__grid" x1={x(t)} x2={x(t)} y1={padTop - 4} y2={axisY} />
            <text className="prange__tick" x={x(t)} y={axisY + 15} textAnchor="middle">
              {tickTexts[i]}
            </text>
          </g>
        ))}

        {rows.map((r, i) =>
          r.groupStart && i > 0 ? (
            <line
              key={`sep-${r.key}`}
              className="prange__sep"
              x1={4}
              x2={labelW + plotW}
              y1={rowTop[i] - (headY[i] !== null ? HEAD_H : 4)}
              y2={rowTop[i] - (headY[i] !== null ? HEAD_H : 4)}
            />
          ) : null,
        )}

        {rows.map((r, i) => {
          const hy = headY[i]
          if (hy === null) return null
          const text = truncate(r.label, wideChars)
          return (
            <text key={`h-${r.key}`} className="prange__head" x={4} y={hy}>
              {text}
              {text !== r.label ? <title>{r.label}</title> : null}
            </text>
          )
        })}

        {rows.map((r, i) => {
          const full = stacked ? (multi ? `${r.label} · ${r.series}` : r.label) : sideTexts[i]
          const text = truncate(full, stacked ? wideChars : sideChars)
          return stacked ? (
            <text key={`lab-${r.key}`} className="prange__stacklabel" x={4} y={rowTop[i] + 11}>
              {text}
              {text !== full ? <title>{full}</title> : null}
            </text>
          ) : (
            <text
              key={`lab-${r.key}`}
              className="prange__label"
              x={labelW - 10}
              y={bandY(i)}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {text}
              {text !== full ? <title>{full}</title> : null}
            </text>
          )
        })}

        {rows.map((r, i) => {
          const yc = bandY(i)
          const x1 = x(r.lo)
          const x2 = x(r.hi)
          const bandW = Math.max(2, x2 - x1)
          const interval = r.hasInterval
            ? `置信区间 ${fmtValue(r.lo)}–${fmtValue(r.hi)} ${spec.unit}`
            : '未提供区间'
          const data: ChartTipData = {
            x: x(r.value),
            y: yc - BAND_H,
            series: r.series,
            label: r.label,
            value: fmtWithUnit(r.value, spec.unit),
            color: r.color,
            note: r.hasInterval ? interval : `${interval}：该来源未公布不确定性范围。`,
          }
          return (
            <g
              key={r.key}
              className={cx('prange__row', active === r.key && 'prange__row--active')}
              tabIndex={0}
              onMouseEnter={() => show(r.key, data)}
              onMouseLeave={hide}
              onFocus={() => show(r.key, data)}
              onBlur={hide}
            >
              <title>{`${markTitle(r.series, r.label, r.value, spec.unit)}，${interval}`}</title>
              <rect className="prange__hit" x={labelW} y={yc - ROW_H / 2} width={plotW} height={ROW_H} />
              {r.hasInterval ? (
                <>
                  <rect
                    className="prange__band"
                    x={x1}
                    y={yc - BAND_H / 2}
                    width={bandW}
                    height={BAND_H}
                    rx={2}
                    fill={r.color}
                  />
                  <line className="prange__cap" x1={x1} x2={x1} y1={yc - 8} y2={yc + 8} stroke={r.color} />
                  <line className="prange__cap" x1={x2} x2={x2} y1={yc - 8} y2={yc + 8} stroke={r.color} />
                  <line className="prange__spine" x1={x1} x2={x2} y1={yc} y2={yc} stroke={r.color} />
                </>
              ) : (
                <line
                  className="prange__noci"
                  x1={x(r.value) - 9}
                  x2={x(r.value) + 9}
                  y1={yc}
                  y2={yc}
                  stroke={r.color}
                />
              )}
              <circle className="prange__halo" cx={x(r.value)} cy={yc} r={6.4} />
              <circle className="prange__point" cx={x(r.value)} cy={yc} r={4.1} fill={r.color} />
            </g>
          )
        })}

        <line className="prange__axis" x1={labelW} x2={labelW + plotW} y1={axisY} y2={axisY} />
      </ChartCanvas>

      {scroll ? <p className="prange__hint">横向滚动可查看完整区间。</p> : null}

      <p className="prange__note">
        <span className="prange__key" aria-hidden="true">
          <span className="prange__keyband" />
          <span className="prange__keydot" />
        </span>
        <span className="prange__notetext">
          阴影带为<strong>置信区间</strong>，中央实心圆点为点估计值：区间越宽，估计越不确定。重叠的区间不足以证明两组之间存在差异。
        </span>
      </p>

      <SrTable
        caption={`${spec.title}（单位：${spec.unit}，含置信区间）`}
        columns={multi ? ['项目', '序列', '点估计', '区间下限', '区间上限'] : ['项目', '点估计', '区间下限', '区间上限']}
        rows={rows.map((r) => {
          const tail = [
            fmtValue(r.value),
            r.hasInterval ? fmtValue(r.lo) : '未提供',
            r.hasInterval ? fmtValue(r.hi) : '未提供',
          ]
          return multi ? [r.label, r.series, ...tail] : [r.label, ...tail]
        })}
      />
    </div>
  )
}
