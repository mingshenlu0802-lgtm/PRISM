import type { ReactNode } from 'react'
import { clamp, cx } from '../../lib/util'
import './ChartPrimitives.css'

/**
 * Shared chart chrome: the hover/focus tooltip, the scrolling plot canvas and
 * the screen-reader data table that every chart ships alongside its SVG.
 *
 * Accessibility note. Per the house contract each chart's `<svg>` carries
 * `role="img"` with a `<title>`/`<desc>` pair, which means assistive tech reads
 * it as a single graphic and does not walk its children. The full dataset is
 * therefore exposed a second time as a visually-hidden `<table>`, while the
 * focusable marks inside the SVG serve sighted keyboard and switch users, who
 * tab through the values and read them from the tooltip.
 */

export interface ChartTipData {
  /** Anchor position in the SVG's user space, which equals CSS pixels. */
  x: number
  y: number
  series: string
  label: string
  value: string
  color: string
  note?: string
}

export function ChartTooltip(props: {
  tip: ChartTipData | null
  width: number
  height: number
}): JSX.Element | null {
  const { tip, width, height } = props
  if (!tip) return null

  const nearStart = tip.x < 92
  const nearEnd = tip.x > width - 92
  const below = tip.y < 84

  return (
    <div
      className={cx(
        'ptip',
        nearStart && 'ptip--start',
        nearEnd && !nearStart && 'ptip--end',
        below && 'ptip--below',
      )}
      style={{
        left: `${clamp(tip.x, 2, Math.max(2, width - 2))}px`,
        top: `${clamp(tip.y, 2, Math.max(2, height - 2))}px`,
      }}
      aria-hidden="true"
    >
      <span className="ptip__swatch" style={{ background: tip.color }} />
      <span className="ptip__body">
        <span className="ptip__series">{tip.series}</span>
        <span className="ptip__label">{tip.label}</span>
        <span className="ptip__value u-num">{tip.value}</span>
        {tip.note ? <span className="ptip__note">{tip.note}</span> : null}
      </span>
    </div>
  )
}

/**
 * The plot canvas. `block` is the owning component's CSS root class, so every
 * rule that styles this markup still lives in that component's own stylesheet.
 */
export function ChartCanvas(props: {
  block: string
  width: number
  height: number
  scroll: boolean
  containerRef: (node: HTMLDivElement | null) => void
  title: string
  desc: string
  tip: ChartTipData | null
  children: ReactNode
}): JSX.Element {
  const { block, width, height, scroll, containerRef, title, desc, tip, children } = props
  return (
    <div className={cx(`${block}__scroll`, scroll && `${block}__scroll--x`)} ref={containerRef}>
      <div className={`${block}__plot`} style={{ width: `${width}px`, height: `${height}px` }}>
        <svg
          className={`${block}__svg`}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
        >
          <title>{title}</title>
          <desc>{desc}</desc>
          {children}
        </svg>
        <ChartTooltip tip={tip} width={width} height={height} />
      </div>
    </div>
  )
}

/** The visually-hidden equivalent of the graphic. */
export function SrTable(props: {
  caption: string
  columns: string[]
  rows: (string | number)[][]
}): JSX.Element {
  const { caption, columns, rows } = props
  /* The wrapper carries `u-sr`: applied to a <table> directly the class cannot
     clip, because a table box grows to its content regardless of `width: 1px`
     and does not honour `overflow: hidden` on itself — which would push the
     page sideways on a narrow screen. */
  return (
    <div className="u-sr">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={`${c}-${i}`} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) =>
                ci === 0 ? (
                  <th key={ci} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={ci}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
