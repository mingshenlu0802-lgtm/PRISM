import { useId } from 'react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/util'
import './Tooltip.css'

/**
 * A small explanatory bubble. Shown on hover AND on keyboard focus, so it is
 * never the only route to information that matters — anything load-bearing is
 * also written into the page.
 */

export interface TooltipProps {
  label: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
}

export function Tooltip({ label, children, side = 'top' }: TooltipProps): JSX.Element {
  const id = useId()
  return (
    <span className={cx('ptip', `ptip--${side}`)} aria-describedby={id}>
      {children}
      <span className="ptip__bubble" role="tooltip" id={id}>
        {label}
      </span>
    </span>
  )
}
