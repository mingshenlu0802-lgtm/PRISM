import type { ReactNode } from 'react'
import { cx } from '../../lib/util'
import './ChartFrame.css'

/**
 * The figure chrome around every chart.
 *
 * Two lines are mandatory and neither can be suppressed: where the numbers came
 * from, and what they cannot show. A chart that arrives without a stated
 * limitation is not quietly rendered clean — it is stamped 「未标注局限性」 so the
 * gap is visible to the reader and to the editor reviewing the piece.
 */

export interface ChartFrameProps {
  title: string
  subtitle?: string
  unit?: string
  sourceLabel: string
  limitation?: string
  children: ReactNode
  height?: number
  legend?: { name: string; color: string }[]
  dense?: boolean
}

export function ChartFrame({
  title,
  subtitle,
  unit,
  sourceLabel,
  limitation,
  children,
  height,
  legend,
  dense,
}: ChartFrameProps): JSX.Element {
  const showLegend = Array.isArray(legend) && legend.length > 1
  const hasLimitation = Boolean(limitation && limitation.trim().length > 0)

  return (
    <figure className={cx('pcframe', dense && 'pcframe--dense')}>
      <div className="pcframe__head">
        {unit && unit.trim() ? (
          <p className="pcframe__unit u-eyebrow">单位 · {unit}</p>
        ) : null}
        <h4 className="pcframe__title">{title}</h4>
        {subtitle ? <p className="pcframe__sub">{subtitle}</p> : null}
      </div>

      {showLegend ? (
        <ul className="pcframe__legend">
          {legend.map((item, i) => (
            <li className="pcframe__legend-item" key={`${item.name}-${i}`}>
              <span
                className="pcframe__swatch"
                style={{ background: item.color }}
                aria-hidden="true"
              />
              <span className="pcframe__legend-name">{item.name}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className="pcframe__body"
        style={height ? { minHeight: `${height}px` } : undefined}
      >
        {children}
      </div>

      <figcaption className="pcframe__foot">
        <p className="pcframe__line">
          <span className="pcframe__key">数据来源</span>
          <span className="pcframe__val">{sourceLabel}</span>
        </p>
        <p className={cx('pcframe__line', 'pcframe__line--limit', !hasLimitation && 'pcframe__line--warn')}>
          <span className="pcframe__key">本图无法说明</span>
          {hasLimitation ? (
            <span className="pcframe__val">{limitation}</span>
          ) : (
            <span className="pcframe__val">
              <span className="pcframe__warnmark" aria-hidden="true">!</span>
              未标注局限性
              <span className="pcframe__warnhint">
                　这张图缺少「它无法说明什么」的说明，发布前必须补上。
              </span>
            </span>
          )}
        </p>
      </figcaption>
    </figure>
  )
}
