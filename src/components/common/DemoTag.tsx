import { DEMO_NOTICE } from '../../lib/constants'
import { cx } from '../../lib/util'
import './DemoTag.css'

/**
 * 「演示数据」 — the standing reminder that nothing in this build is real
 * reporting. It is deliberately plain, always legible, and never suppressed by
 * a compact layout: `compact` shortens the word, it does not hide the marker.
 */

export interface DemoTagProps {
  compact?: boolean
  className?: string
}

export function DemoTag({ compact = false, className }: DemoTagProps): JSX.Element {
  return (
    <span
      className={cx('pdemotag', compact && 'pdemotag--compact', className)}
      title={DEMO_NOTICE}
    >
      <span className="pdemotag__mark" aria-hidden="true" />
      <span className="pdemotag__text">{compact ? '演示' : '演示数据'}</span>
      <span className="u-sr">：{DEMO_NOTICE}</span>
    </span>
  )
}
