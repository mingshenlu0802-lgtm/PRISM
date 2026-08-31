import { useId } from 'react'
import { clamp, cx } from '../../lib/util'
import './Meter.css'

/**
 * A 0–100 horizontal meter: confidence, credibility, corroboration.
 *
 * `auto` colours the fill by the same thresholds the console uses everywhere
 * (≥80 支持 / ≥60 注意 / 其余 不足) and draws those thresholds on the track, so
 * the reader can see WHERE the bar sits rather than trusting the hue.
 */

export interface MeterProps {
  value: number
  label: string
  hint?: string
  tone?: 'auto' | 'go' | 'warn' | 'bad' | 'info'
  showValue?: boolean
  size?: 'sm' | 'md'
}

function autoTone(v: number): 'go' | 'warn' | 'bad' {
  if (v >= 80) return 'go'
  if (v >= 60) return 'warn'
  return 'bad'
}

export function Meter({
  value,
  label,
  hint,
  tone = 'auto',
  showValue = true,
  size = 'md',
}: MeterProps): JSX.Element {
  const v = Math.round(clamp(Number.isFinite(value) ? value : 0, 0, 100))
  const resolved = tone === 'auto' ? autoTone(v) : tone
  const labelId = useId()
  const hintId = useId()

  return (
    <div className={cx('pmeter', `pmeter--${size}`, `pmeter--${resolved}`, tone === 'auto' && 'pmeter--marked')}>
      <div className="pmeter__top">
        <span className="pmeter__label" id={labelId}>{label}</span>
        {showValue ? (
          <span className="pmeter__value u-num">
            {v}
            <span className="pmeter__scale" aria-hidden="true">/100</span>
          </span>
        ) : null}
      </div>

      <div
        className="pmeter__track"
        role="meter"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${v} / 100`}
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
      >
        <div className="pmeter__fill" style={{ width: `${v}%` }} />
      </div>

      {hint ? <p className="pmeter__hint" id={hintId}>{hint}</p> : null}
    </div>
  )
}
