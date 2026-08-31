import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { TopicKey } from '../../lib/types'
import { TOPIC_MAP } from '../../lib/constants'
import { cx } from '../../lib/util'
import './TopicChip.css'

/**
 * A topic marker. The hue is a quiet index colour drawn from the prism set —
 * the Chinese label always travels with it, and the swatch is a rotated square
 * rather than a dot so the chips stay distinguishable in greyscale.
 */

export interface TopicChipProps {
  topic: TopicKey
  /** Render as a link to the topic page. */
  link?: boolean
  size?: 'sm' | 'md'
}

export function TopicChip({ topic, link = false, size = 'sm' }: TopicChipProps): JSX.Element {
  const meta = TOPIC_MAP[topic]
  const label = meta ? meta.zh : topic
  const style = { '--ptc-hue': meta ? meta.hue : 'var(--ink-400)' } as CSSProperties
  const className = cx('ptopic', `ptopic--${size}`, link && 'ptopic--link')

  const inner = (
    <>
      <span className="ptopic__swatch" aria-hidden="true" />
      <span className="ptopic__label">{label}</span>
    </>
  )

  if (link) {
    return (
      <Link
        to={`/topic/${topic}`}
        className={className}
        style={style}
        title={meta ? `${meta.en} — ${meta.blurb}` : undefined}
      >
        {inner}
      </Link>
    )
  }

  return (
    <span className={className} style={style} title={meta ? meta.en : undefined}>
      {inner}
    </span>
  )
}
