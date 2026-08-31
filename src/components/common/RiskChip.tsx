import type { CSSProperties } from 'react'
import type { RiskFlag, RiskSeverity } from '../../lib/types'
import { RISK_LABEL, RISK_SEVERITY_LABEL } from '../../lib/constants'
import { cx } from '../../lib/util'
import { Icon } from './Icon'
import './RiskChip.css'

/**
 * A single editorial risk flag.
 *
 * Severity is drawn as a filled step-bar (1–4) as well as written out, so the
 * ladder survives greyscale. Flags that force a second, typed confirmation
 * before publishing carry a lock.
 */

const SEVERITY_RANK: Record<RiskSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 }

const RAISED_BY_LABEL: Record<RiskFlag['raisedBy'], string> = {
  'ai-review': '自动审查',
  editor: '编辑',
  'legal-check': '法务核查',
}

function SeverityBars({ rank }: { rank: number }): JSX.Element {
  return (
    <svg className="priskchip__bars" width="14" height="12" viewBox="0 0 14 12" aria-hidden="true" focusable="false">
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 3.6}
          y={9 - i * 2.6}
          width="2.4"
          height={3 + i * 2.6}
          rx="0.8"
          fill="currentColor"
          opacity={i < rank ? 1 : 0.24}
        />
      ))}
    </svg>
  )
}

export interface RiskChipProps {
  flag: RiskFlag
  onClick?: () => void
  compact?: boolean
}

export function RiskChip({ flag, onClick, compact = false }: RiskChipProps): JSX.Element {
  const meta = RISK_LABEL[flag.kind]
  const sev = RISK_SEVERITY_LABEL[flag.severity]
  const label = meta ? meta.zh : flag.kind
  const guidance = meta ? meta.guidance : ''
  const rank = SEVERITY_RANK[flag.severity]
  const style = { '--prc-tone': sev ? sev.var : 'var(--risk-medium)' } as CSSProperties

  const className = cx(
    'priskchip',
    compact && 'priskchip--compact',
    flag.resolved && 'priskchip--resolved',
    onClick && 'priskchip--action',
  )

  const body = (
    <>
      <span className="priskchip__head">
        <span className="priskchip__sev" aria-hidden="true">
          <SeverityBars rank={rank} />
        </span>
        <span className="priskchip__label">{label}</span>
        <span className="priskchip__level">
          {sev ? sev.zh : flag.severity}
          <span className="u-sr">风险等级</span>
        </span>
        {flag.requiresSecondConfirm && !flag.resolved ? (
          <span className="priskchip__lock">
            <Icon name="lock" size={12} title="发布前需二次确认" />
          </span>
        ) : null}
        {flag.resolved ? (
          <span className="priskchip__done">
            <Icon name="check" size={12} />
            已处理
          </span>
        ) : null}
      </span>
      {!compact ? (
        <span className="priskchip__body">
          <span className="priskchip__note">{flag.note}</span>
          <span className="priskchip__meta">
            由{RAISED_BY_LABEL[flag.raisedBy]}提出
            {flag.resolved && flag.resolutionNote ? ` · 处理说明：${flag.resolutionNote}` : ''}
          </span>
          {guidance ? <span className="priskchip__guide">{guidance}</span> : null}
        </span>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        onClick={onClick}
        title={guidance || undefined}
        aria-label={`${label}，风险等级${sev ? sev.zh : flag.severity}${flag.resolved ? '，已处理' : ''}`}
      >
        {body}
      </button>
    )
  }

  return (
    <span className={className} style={style} title={guidance || undefined}>
      {body}
    </span>
  )
}
