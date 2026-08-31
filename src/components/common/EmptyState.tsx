import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import './EmptyState.css'

/**
 * The "nothing here" panel. An empty queue is usually good news in this
 * product, so the copy stays calm and always says what would fill it.
 */

export interface EmptyStateProps {
  title: string
  hint?: string
  icon?: IconName
  action?: ReactNode
}

export function EmptyState({ title, hint, icon = 'layers', action }: EmptyStateProps): JSX.Element {
  return (
    <div className="pempty tex-graticule">
      <span className="pempty__glyph" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <p className="pempty__title">{title}</p>
      {hint ? <p className="pempty__hint">{hint}</p> : null}
      {action ? <div className="pempty__action">{action}</div> : null}
    </div>
  )
}
