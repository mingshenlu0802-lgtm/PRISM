import type { ReactNode } from 'react'
import { cx } from '../../lib/util'
import './Badge.css'

/**
 * The house chip. Tone never carries meaning on its own — every badge in the
 * product ships with a label, and most also ship with a glyph.
 */

export type BadgeTone = 'neutral' | 'go' | 'hold' | 'stop' | 'live' | 'info' | 'warn'

export interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  size?: 'sm' | 'md'
  icon?: ReactNode
  title?: string
  className?: string
}

export function Badge({
  children,
  tone = 'neutral',
  size = 'sm',
  icon,
  title,
  className,
}: BadgeProps): JSX.Element {
  return (
    <span
      className={cx('pbadge', `pbadge--${tone}`, `pbadge--${size}`, className)}
      title={title}
    >
      {icon ? <span className="pbadge__icon" aria-hidden="true">{icon}</span> : null}
      <span className="pbadge__label">{children}</span>
    </span>
  )
}
