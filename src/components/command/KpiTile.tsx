import { Link } from 'react-router-dom'
import { Icon, Sparkline } from '../common'
import type { IconName } from '../common'
import { cx } from '../../lib/util'
import './KpiTile.css'

/**
 * One number on the console's top row.
 *
 * A KPI here is never decorative: the label says what is counted, the hint says
 * what the editor is expected to DO about it, and the tone is always mirrored by
 * a written state word ("正常 / 注意 / 需处理") so the row survives greyscale and
 * colour-vision differences.
 */

export type KpiTone = 'neutral' | 'go' | 'warn' | 'stop'

export interface KpiTileProps {
  label: string
  value: number | string
  hint?: string
  tone?: KpiTone
  icon?: IconName
  to?: string
  spark?: number[]
}

const TONE_WORD: Record<KpiTone, string | null> = {
  neutral: null,
  go: '正常',
  warn: '注意',
  stop: '需处理',
}

const TONE_COLOR: Record<KpiTone, string> = {
  neutral: 'var(--fg-subtle)',
  go: 'var(--risk-low)',
  warn: 'var(--risk-medium)',
  stop: 'var(--accent)',
}

export function KpiTile({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
  to,
  spark,
}: KpiTileProps): JSX.Element {
  const word = TONE_WORD[tone]

  const body = (
    <>
      <span className="kpit__top">
        {icon ? (
          <span className="kpit__plate" aria-hidden="true">
            <Icon name={icon} size={15} />
          </span>
        ) : null}
        <span className="kpit__label">{label}</span>
        {word ? <span className="kpit__state">{word}</span> : null}
        {to ? (
          <span className="kpit__go" aria-hidden="true">
            <Icon name="chevron-right" size={14} />
          </span>
        ) : null}
      </span>

      <span className="kpit__row">
        <span className="kpit__value u-num">{value}</span>
        {spark && spark.length > 0 ? (
          <span className="kpit__spark">
            <Sparkline points={spark} width={78} height={26} tone={TONE_COLOR[tone]} label={`${label} · 近 7 日`} />
          </span>
        ) : null}
      </span>

      {hint ? <span className="kpit__hint">{hint}</span> : null}
    </>
  )

  const className = cx('kpit', `kpit--${tone}`, to && 'kpit--link')

  if (to) {
    return (
      <Link className={className} to={to}>
        {body}
      </Link>
    )
  }
  return <div className={className}>{body}</div>
}
