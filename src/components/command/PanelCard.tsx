import { useId } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../common'
import type { IconName } from '../common'
import { cx } from '../../lib/util'
import './PanelCard.css'

/**
 * The standard PRISM Command panel.
 *
 * Every console surface is built out of these, so the chrome stays deliberately
 * quiet: a hairline frame, a glyph plate, a title, an optional subtitle that
 * states what the panel is FOR, and a right-hand action slot for the one link
 * or control the panel is allowed to own.
 *
 * `tone` tints the frame — but a warn/stop panel also prints its state in words
 * next to the title, because a colour alone is never allowed to carry meaning.
 */

export type PanelTone = 'default' | 'warn' | 'stop'

export interface PanelCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  icon?: IconName
  tone?: PanelTone
  className?: string
}

const TONE_NOTE: Record<PanelTone, string | null> = {
  default: null,
  warn: '需注意',
  stop: '已阻断',
}

const TONE_ICON: Record<PanelTone, IconName | null> = {
  default: null,
  warn: 'alert',
  stop: 'lock',
}

export function PanelCard({
  title,
  subtitle,
  action,
  children,
  icon,
  tone = 'default',
  className,
}: PanelCardProps): JSX.Element {
  const titleId = useId()
  const note = TONE_NOTE[tone]
  const noteIcon = TONE_ICON[tone]

  return (
    <section className={cx('pnlc', `pnlc--${tone}`, className)} aria-labelledby={titleId}>
      <header className="pnlc__head">
        {icon ? (
          <span className="pnlc__plate" aria-hidden="true">
            <Icon name={icon} size={16} />
          </span>
        ) : null}

        <div className="pnlc__heading">
          <h2 className="pnlc__title" id={titleId}>
            {title}
            {note ? (
              <span className="pnlc__note">
                {noteIcon ? <Icon name={noteIcon} size={11} /> : null}
                {note}
              </span>
            ) : null}
          </h2>
          {subtitle ? <p className="pnlc__subtitle">{subtitle}</p> : null}
        </div>

        {action ? <div className="pnlc__action">{action}</div> : null}
      </header>

      <div className="pnlc__body">{children}</div>
    </section>
  )
}
