import { cx } from '../../lib/util'
import './CitationRef.css'

/**
 * An inline citation marker. Numbers are assigned by first appearance in the
 * body text (see `citationNumbers` in lib/util), so [1] is always the first
 * thing the reader meets rather than the first record in the database.
 *
 * Without an `onOpen` handler the marker is inert — it stays visible, keeps its
 * number, and drops out of the tab order rather than becoming a dead control.
 */

export interface CitationRefProps {
  n: number
  citationId: string
  onOpen?: (id: string) => void
  active?: boolean
}

export function CitationRef({ n, citationId, onOpen, active = false }: CitationRefProps): JSX.Element {
  return (
    <sup className="pcite">
      <button
        type="button"
        className={cx('pcite__btn', active && 'pcite__btn--active')}
        disabled={!onOpen}
        onClick={onOpen ? () => onOpen(citationId) : undefined}
        aria-label={`第 ${n} 条来源`}
        aria-current={active ? 'true' : undefined}
        data-citation={citationId}
      >
        [{n}]
      </button>
    </sup>
  )
}
