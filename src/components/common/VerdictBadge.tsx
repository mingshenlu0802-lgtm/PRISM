import type { CSSProperties, ReactNode } from 'react'
import type { VerdictKey, VerdictTone } from '../../lib/types'
import { VERDICT_MAP, VERDICT_TONE_VAR } from '../../lib/constants'
import { cx } from '../../lib/util'
import './VerdictBadge.css'

/**
 * The fact-check verdict ladder.
 *
 * Every tone gets its own SHAPE, drawn inline, so the ladder stays readable in
 * greyscale, in print, and for colour-blind readers: filled disc → half disc →
 * split disc → hollow disc → crossed disc → question. Colour is a second,
 * redundant channel, never the only one.
 */

const GLYPH_SIZE: Record<'sm' | 'md' | 'lg', number> = { sm: 13, md: 15, lg: 18 }

function VerdictGlyph({ tone, px }: { tone: VerdictTone; px: number }): JSX.Element {
  const ring = <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
  let inner: ReactNode = null

  switch (tone) {
    case 'supported':
      inner = <circle cx="8" cy="8" r="6.2" fill="currentColor" />
      break
    case 'caution':
      inner = (
        <>
          {ring}
          <path d="M8 1.8A6.2 6.2 0 0 1 8 14.2Z" fill="currentColor" />
        </>
      )
      break
    case 'contested':
      inner = (
        <>
          {ring}
          <path d="M8 8V1.8A6.2 6.2 0 0 1 14.2 8Z" fill="currentColor" />
          <path d="M8 8v6.2A6.2 6.2 0 0 1 1.8 8Z" fill="currentColor" />
        </>
      )
      break
    case 'unsupported':
      inner = (
        <>
          {ring}
          <circle cx="8" cy="8" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
        </>
      )
      break
    case 'false':
      inner = (
        <>
          {ring}
          <path
            d="M5.4 5.4 10.6 10.6M10.6 5.4 5.4 10.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )
      break
    case 'unknown':
    default:
      inner = (
        <>
          {ring}
          <path
            d="M6.1 6.2a1.95 1.95 0 1 1 2.55 1.86c-.5.18-.75.6-.75 1.14v.32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path d="M7.9 11.5h.02" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )
      break
  }

  return (
    <svg
      className="pverdict__svg"
      width={px}
      height={px}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      {inner}
    </svg>
  )
}

export interface VerdictBadgeProps {
  verdict: VerdictKey
  size?: 'sm' | 'md' | 'lg'
  showEn?: boolean
  className?: string
}

export function VerdictBadge({
  verdict,
  size = 'md',
  showEn = false,
  className,
}: VerdictBadgeProps): JSX.Element {
  const def = VERDICT_MAP[verdict]
  const tone: VerdictTone = def ? def.tone : 'unknown'
  const zh = def ? def.zh : '未知判定'
  const en = def ? def.en : 'Unknown'
  const style = { '--pv-tone': VERDICT_TONE_VAR[tone] } as CSSProperties

  return (
    <span
      className={cx('pverdict', `pverdict--${size}`, `pverdict--${tone}`, className)}
      style={style}
      title={def ? def.standard : undefined}
    >
      <span className="pverdict__glyph">
        <VerdictGlyph tone={tone} px={GLYPH_SIZE[size]} />
      </span>
      <span className="pverdict__text">
        <span className="pverdict__zh">{zh}</span>
        {showEn ? <span className="pverdict__en">{en}</span> : null}
      </span>
    </span>
  )
}
