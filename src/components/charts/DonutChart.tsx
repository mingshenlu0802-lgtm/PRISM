import { useState } from 'react'
import type { ChartSpec } from '../../lib/types'
import { cx } from '../../lib/util'
import { ChartCanvas } from './ChartPrimitives'
import type { ChartTipData } from './ChartPrimitives'
import { useChartWidth } from './useChartWidth'
import {
  cleanLabel,
  donutArc,
  fmtValue,
  fmtWithUnit,
  markTitle,
  percent,
  seriesColor,
  sum,
} from './scale'
import './DonutChart.css'

/**
 * Composition of a whole.
 *
 * A donut is only honest when the parts genuinely sum to the whole, so
 * non-positive values are dropped from the ring and reported in the list
 * instead of being folded invisibly into the total. The readable numbers live
 * in the list beside the ring — the arcs carry shape, not the reading.
 */

export interface DonutChartProps {
  spec: ChartSpec
  height?: number
}

interface Slice {
  key: string
  series: string
  label: string
  value: number
  color: string
}

export function DonutChart({ spec, height = 240 }: DonutChartProps): JSX.Element {
  const { ref, width } = useChartWidth(240)
  const [tip, setTip] = useState<ChartTipData | null>(null)
  const [active, setActive] = useState<string | null>(null)

  const series = spec.series
  const single = series.length <= 1
  const head = series[0]

  const slices: Slice[] = single
    ? (head?.points ?? [])
        .filter((p) => Number.isFinite(p.value) && p.value > 0)
        .map((p, i) => ({
          key: `${i}-${p.label}`,
          series: head ? head.name : spec.title,
          label: cleanLabel(p.label),
          value: p.value,
          color: seriesColor(i),
        }))
    : series
        .map((s, i) => ({
          key: `${i}-${s.name}`,
          series: s.name,
          label: '合计',
          value: sum(s.points.map((p) => p.value)),
          color: seriesColor(i, s.color),
        }))
        .filter((s) => s.value > 0)

  const total = sum(slices.map((s) => s.value))

  const show = (key: string, data: ChartTipData | null) => {
    setActive(key)
    setTip(data)
  }
  const hide = () => {
    setActive(null)
    setTip(null)
  }

  if (slices.length === 0 || total <= 0) {
    return (
      <div className="pdonut pdonut--empty">
        <p className="pdonut__empty">暂无可绘制的构成数据。</p>
      </div>
    )
  }

  const box = Math.max(132, Math.min(width, height))
  const cxp = width / 2
  const cyp = box / 2
  const rOuter = box / 2 - 8
  const rInner = rOuter * 0.62

  let cursor = 0
  const arcs = slices.map((s) => {
    const startDeg = (cursor / total) * 360
    cursor += s.value
    const endDeg = (cursor / total) * 360
    const midDeg = (startDeg + endDeg) / 2
    return { slice: s, startDeg, endDeg, midDeg }
  })

  const desc = `${spec.title}：共 ${slices.length} 个组成部分，合计 ${fmtValue(total)} ${spec.unit}。各部分数值见右侧列表。`

  return (
    <div className="pdonut">
      <div className="pdonut__viz">
        <ChartCanvas
          block="pdonut"
          width={width}
          height={box}
          scroll={false}
          containerRef={ref}
          title={spec.title}
          desc={desc}
          tip={tip}
        >
          <circle className="pdonut__track" cx={cxp} cy={cyp} r={(rOuter + rInner) / 2} strokeWidth={rOuter - rInner} />
          {arcs.map(({ slice, startDeg, endDeg, midDeg }) => {
            const mid = ((midDeg - 90) * Math.PI) / 180
            const anchorR = (rOuter + rInner) / 2
            const data: ChartTipData = {
              x: cxp + Math.cos(mid) * anchorR,
              y: cyp + Math.sin(mid) * anchorR,
              series: slice.series,
              label: slice.label,
              value: fmtWithUnit(slice.value, spec.unit),
              color: slice.color,
              note: `占合计 ${percent(slice.value, total)}`,
            }
            return (
              <path
                key={slice.key}
                className={cx('pdonut__arc', active === slice.key && 'pdonut__arc--active')}
                d={donutArc(cxp, cyp, rOuter, rInner, startDeg, endDeg)}
                fill={slice.color}
                tabIndex={0}
                onMouseEnter={() => show(slice.key, data)}
                onMouseLeave={hide}
                onFocus={() => show(slice.key, data)}
                onBlur={hide}
              >
                <title>
                  {`${markTitle(slice.series, slice.label, slice.value, spec.unit)}（占合计 ${percent(
                    slice.value,
                    total,
                  )}）`}
                </title>
              </path>
            )
          })}
          <text className="pdonut__total u-num" x={cxp} y={cyp - 2} textAnchor="middle">
            {fmtValue(total)}
          </text>
          <text className="pdonut__unit" x={cxp} y={cyp + 14} textAnchor="middle">
            {spec.unit}
          </text>
        </ChartCanvas>
      </div>

      <ul className="pdonut__list">
        {slices.map((s) => (
          <li
            key={s.key}
            className={cx('pdonut__item', active === s.key && 'pdonut__item--active')}
            onMouseEnter={() => setActive(s.key)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="pdonut__swatch" style={{ background: s.color }} aria-hidden="true" />
            <span className="pdonut__name">{single ? s.label : s.series}</span>
            <span className="pdonut__value u-num">{fmtValue(s.value)}</span>
            <span className="pdonut__pct u-num">{percent(s.value, total)}</span>
          </li>
        ))}
        <li className="pdonut__item pdonut__item--total">
          <span className="pdonut__swatch pdonut__swatch--none" aria-hidden="true" />
          <span className="pdonut__name">合计</span>
          <span className="pdonut__value u-num">{fmtValue(total)}</span>
          <span className="pdonut__pct u-num">{spec.unit}</span>
        </li>
      </ul>
    </div>
  )
}
