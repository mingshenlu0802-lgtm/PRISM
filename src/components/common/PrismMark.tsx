import { cx } from '../../lib/util'
import './PrismMark.css'

/**
 * PRISM 棱镜 — the wordless mark.
 *
 * A single thin beam enters a triangular prism from the left, bends once
 * inside it, and leaves as six restrained spectrum strokes. No rainbow
 * gradient, no gendered pictogram, no letterform: the whole idea of the
 * publication — one input, separated into its parts, examined — in six lines.
 *
 * The stroke weight is optically sized so the mark holds at 20px and at 96px.
 */

const FAN: { d: string; hue: string; opacity: number }[] = [
  { d: 'M28.1 26.1 L46 19.5', hue: 'var(--prism-1)', opacity: 0.92 },
  { d: 'M28.1 26.5 L46 22.5', hue: 'var(--prism-6)', opacity: 0.88 },
  { d: 'M28.1 26.8 L46 25.5', hue: 'var(--prism-2)', opacity: 0.84 },
  { d: 'M28.1 27.2 L46 28.5', hue: 'var(--prism-3)', opacity: 0.8 },
  { d: 'M28.1 27.5 L46 31.5', hue: 'var(--prism-4)', opacity: 0.76 },
  { d: 'M28.1 27.9 L46 34.5', hue: 'var(--prism-5)', opacity: 0.72 },
]

function strokeFor(size: number): number {
  if (size <= 22) return 3.1
  if (size <= 32) return 2.8
  if (size <= 48) return 2.4
  if (size <= 72) return 2.1
  return 1.9
}

export interface PrismMarkProps {
  size?: number
  className?: string
  /** Draws the whole mark in currentColor — for footers, print and disabled states. */
  muted?: boolean
}

export function PrismMark({ size = 28, className, muted = false }: PrismMarkProps): JSX.Element {
  const sw = strokeFor(size)
  const fanSw = sw * 0.86

  return (
    <svg
      className={cx('pmark', muted && 'pmark--muted', className)}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* the six separated strokes, drawn first so the prism body sits over them */}
      <g strokeLinecap="round">
        {FAN.map((ray) => (
          <path
            key={ray.d}
            d={ray.d}
            stroke={muted ? 'currentColor' : ray.hue}
            strokeOpacity={muted ? ray.opacity * 0.7 : ray.opacity}
            strokeWidth={fanSw}
          />
        ))}
      </g>

      {/* the incoming beam */}
      <path
        d="M1.5 24 H11.7"
        stroke="currentColor"
        strokeOpacity="0.78"
        strokeWidth={sw}
        strokeLinecap="round"
      />

      {/* the prism */}
      <path
        d="M18 9 L29 35 H7 Z"
        fill="currentColor"
        fillOpacity={muted ? 0.04 : 0.06}
        stroke="currentColor"
        strokeOpacity="0.92"
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* the single bend inside the glass */}
      <path
        d="M11.7 24 L25.6 27"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth={fanSw}
        strokeLinecap="round"
      />
    </svg>
  )
}
