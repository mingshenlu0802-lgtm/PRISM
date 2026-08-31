import { cx } from '../../lib/util'
import './PrismMark.css'

/**
 * PRISM 棱镜 — the wordless mark.
 *
 * One beam goes into a prism and comes out as the full spectrum. That is the
 * idea of the publication and the claim of the movement it covers, in one
 * drawing: no letterform, no gendered pictogram.
 *
 * The spectrum is drawn as a **solid fan of touching bands**, not as separate
 * rays. Six hairlines cannot survive the size this mark is actually used at —
 * in the header it sits at 24px, where six strokes fall under a pixel apart
 * and smear into grey. A solid fan reads as one confident shape at 20px and
 * resolves into six distinct bands at 96px, which is the behaviour a mark
 * needs. The fan widens left to right because that is what refraction does.
 */

/* Geometry, stated once so the beam and the fan actually meet the glass. */
const APEX = { x: 17, y: 8.5 }
const FOOT = 39.5        // y of the base
const HALF = 10.5        // half-width at the base
const FAN_X0 = 24.2      // where the fan leaves the glass
const FAN_X1 = 46        // where it ends
const FAN_Y0 = [20.4, 27.6] // top and bottom of the fan where it leaves
const FAN_Y1 = [8.8, 39.2]  // top and bottom where it ends

/** x of the left face at height y — where the incoming beam stops. */
const leftFace = (y: number) => APEX.x - ((y - APEX.y) / (FOOT - APEX.y)) * HALF

/**
 * Pride order, top to bottom. These are the flag's own hues, nudged only
 * where a band would otherwise vanish: the yellow is darkened enough to hold
 * an edge against a paper background, and the green lightened enough not to
 * read as black on a dark one. Recognisably the flag, legible on both grounds.
 */
const BANDS = ['#E03A2F', '#EE7B1B', '#E0A81B', '#1E8A4C', '#2860D8', '#7B3FA0']

/** One band of the fan, as a quadrilateral from the glass to the outer edge. */
function band(i: number): string {
  const n = BANDS.length
  const y0a = FAN_Y0[0] + ((FAN_Y0[1] - FAN_Y0[0]) * i) / n
  const y0b = FAN_Y0[0] + ((FAN_Y0[1] - FAN_Y0[0]) * (i + 1)) / n
  const y1a = FAN_Y1[0] + ((FAN_Y1[1] - FAN_Y1[0]) * i) / n
  const y1b = FAN_Y1[0] + ((FAN_Y1[1] - FAN_Y1[0]) * (i + 1)) / n
  return `M${FAN_X0} ${y0a.toFixed(2)} L${FAN_X1} ${y1a.toFixed(2)} `
    + `L${FAN_X1} ${y1b.toFixed(2)} L${FAN_X0} ${y0b.toFixed(2)} Z`
}

export interface PrismMarkProps {
  size?: number
  className?: string
  /** Draws the whole mark in currentColor — for footers, print and disabled states. */
  muted?: boolean
}

export function PrismMark({ size = 28, className, muted = false }: PrismMarkProps): JSX.Element {
  // Below ~28px a hairline beam disappears, so it thickens to stay visible.
  const beam = size < 28 ? 3.4 : 2.9

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
      {/* the spectrum, drawn first so the glass sits over its inner edge */}
      <g>
        {BANDS.map((hue, i) => (
          <path
            key={hue}
            d={band(i)}
            fill={muted ? 'currentColor' : hue}
            fillOpacity={muted ? 0.28 + i * 0.06 : 1}
          />
        ))}
      </g>

      {/* the beam going in, stopping where it meets the left face */}
      <path
        d={`M2 24 H${(leftFace(24) - 0.5).toFixed(2)}`}
        stroke="currentColor"
        strokeWidth={beam}
        strokeLinecap="round"
        strokeOpacity={0.85}
      />

      {/* the prism — a solid silhouette, so it holds at any size */}
      <path
        d={`M${APEX.x} ${APEX.y} L${APEX.x + HALF} ${FOOT} H${APEX.x - HALF} Z`}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  )
}
