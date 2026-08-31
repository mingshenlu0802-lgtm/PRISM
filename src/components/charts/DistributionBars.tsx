import { cx } from '../../lib/util'
import { CHART_COLORS, fmtValue, percent, sum } from './scale'
import './DistributionBars.css'

/**
 * A ranked distribution: label, bar, tabular value.
 *
 * Laid out in HTML rather than SVG so that the label and the number stay real
 * text — selectable, translatable and reflowing at 320px. When `onSelect` is
 * supplied each row becomes a real `<button>`, so the list is operable from the
 * keyboard rather than being a mouse-only filter.
 */

export interface DistributionBarsProps {
  data: { label: string; value: number }[]
  max?: number
  unit?: string
  colorFor?: (label: string, i: number) => string
  limit?: number
  onSelect?: (label: string) => void
}

export function DistributionBars({
  data,
  max,
  unit,
  colorFor,
  limit,
  onSelect,
}: DistributionBarsProps): JSX.Element {
  const clean = data.filter((d) => Number.isFinite(d.value))
  const shown = typeof limit === 'number' && limit > 0 ? clean.slice(0, limit) : clean
  const hidden = clean.length - shown.length
  const total = sum(clean.map((d) => d.value))
  const ceiling = Math.max(
    0,
    typeof max === 'number' && Number.isFinite(max) ? max : Math.max(0, ...clean.map((d) => d.value)),
  )

  if (shown.length === 0) {
    return (
      <div className="pdist pdist--empty">
        <p className="pdist__empty">暂无分布数据。</p>
      </div>
    )
  }

  return (
    <div className={cx('pdist', onSelect && 'pdist--selectable')}>
      <ul className="pdist__list">
        {shown.map((d, i) => {
          const colour = colorFor ? colorFor(d.label, i) : CHART_COLORS[i % CHART_COLORS.length]
          const width = ceiling > 0 ? Math.max(d.value > 0 ? 1.5 : 0, (d.value / ceiling) * 100) : 0
          const readout = `${fmtValue(d.value)}${unit ? ` ${unit}` : ''}`
          const share = total > 0 ? `，占合计 ${percent(d.value, total)}` : ''

          const inner = (
            <>
              <span className="pdist__label">{d.label}</span>
              <span className="pdist__value u-num">
                {fmtValue(d.value)}
                {unit ? <span className="pdist__unit">{unit}</span> : null}
              </span>
              <span className="pdist__track">
                <span
                  className="pdist__fill"
                  style={{ width: `${width}%`, background: colour }}
                />
              </span>
            </>
          )

          return (
            <li className="pdist__row" key={`${d.label}-${i}`}>
              {onSelect ? (
                <button
                  type="button"
                  className="pdist__hit"
                  onClick={() => onSelect(d.label)}
                  aria-label={`${d.label}：${readout}${share}。筛选此项。`}
                >
                  {inner}
                </button>
              ) : (
                <span className="pdist__hit pdist__hit--static">{inner}</span>
              )}
            </li>
          )
        })}
      </ul>

      {hidden > 0 ? (
        <p className="pdist__more">另有 {hidden} 项未显示（按当前排序截断）。</p>
      ) : null}
    </div>
  )
}
