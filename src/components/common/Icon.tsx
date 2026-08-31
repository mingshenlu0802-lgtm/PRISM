import type { ReactNode } from 'react'
import { cx } from '../../lib/util'
import './Icon.css'

/**
 * PRISM icon set.
 *
 * One hand-drawn 24×24 grid, 1.6 stroke, round caps and joins, `currentColor`
 * only. Nothing here is a pictogram of a person's gender, body or identity —
 * the set is deliberately made of tools, documents, evidence and navigation.
 */

export type IconName =
  | 'search' | 'filter' | 'check' | 'check-double' | 'x' | 'alert' | 'shield' | 'clock' | 'calendar'
  | 'globe' | 'book' | 'scale' | 'file' | 'image' | 'chart' | 'link' | 'external' | 'chevron-right'
  | 'chevron-down' | 'chevron-left' | 'chevron-up' | 'plus' | 'minus' | 'edit' | 'eye' | 'eye-off'
  | 'lock' | 'unlock' | 'sparkle' | 'refresh' | 'send' | 'archive' | 'trash' | 'flag' | 'users'
  | 'quote' | 'layers' | 'diff' | 'play' | 'download' | 'mail' | 'menu' | 'sun' | 'moon' | 'info'
  | 'history' | 'pin' | 'target' | 'database' | 'branch' | 'grid' | 'list' | 'arrow-right' | 'arrow-up-right'

/* Drawing helpers — every primitive carries `vector-effect="non-scaling-stroke"`
   so the weight stays honest at 14px and at 40px. */

const p = (d: string) => <path d={d} vectorEffect="non-scaling-stroke" />
const c = (cxp: number, cyp: number, r: number) => (
  <circle cx={cxp} cy={cyp} r={r} vectorEffect="non-scaling-stroke" />
)
const e = (cxp: number, cyp: number, rx: number, ry: number) => (
  <ellipse cx={cxp} cy={cyp} rx={rx} ry={ry} vectorEffect="non-scaling-stroke" />
)
const r = (x: number, y: number, w: number, h: number, rad: number) => (
  <rect x={x} y={y} width={w} height={h} rx={rad} vectorEffect="non-scaling-stroke" />
)

const GLYPHS: Record<IconName, ReactNode> = {
  search: <>{c(10.5, 10.5, 6.6)}{p('M15.3 15.3 20 20')}</>,

  filter: (
    <>
      {p('M4 7h9')}{p('M17 7h3')}{c(15, 7, 2)}
      {p('M4 12h3')}{p('M11 12h9')}{c(9, 12, 2)}
      {p('M4 17h10')}{p('M18 17h2')}{c(16, 17, 2)}
    </>
  ),

  check: p('M5 12.6 9.6 17.2 19 7.4'),

  'check-double': <>{p('M2.8 12.6 6.6 16.4 13.8 8.8')}{p('M9.8 16.2 11.1 17.5 20.8 7.4')}</>,

  x: <>{p('M6.2 6.2 17.8 17.8')}{p('M17.8 6.2 6.2 17.8')}</>,

  alert: <>{p('M12 4.2 20.8 19.4H3.2Z')}{p('M12 9.9v4.3')}{p('M12 17.2h.01')}</>,

  shield: <>{p('M12 3.2 19.2 6v5.3c0 4.4-3 7.9-7.2 9.5-4.2-1.6-7.2-5.1-7.2-9.5V6Z')}{p('M9.2 11.8 11.4 14l3.6-3.9')}</>,

  clock: <>{c(12, 12, 8.4)}{p('M12 7.1V12l3.4 2')}</>,

  calendar: <>{r(3.4, 5.2, 17.2, 15.2, 2.2)}{p('M3.4 10.2h17.2')}{p('M8.2 3.2v4')}{p('M15.8 3.2v4')}{p('M8 14h2.4')}{p('M13.6 14H16')}</>,

  globe: (
    <>
      {c(12, 12, 8.5)}
      {p('M12 3.5c2.5 2.4 3.9 5.3 3.9 8.5s-1.4 6.1-3.9 8.5c-2.5-2.4-3.9-5.3-3.9-8.5S9.5 5.9 12 3.5Z')}
      {p('M3.8 9.4h16.4')}{p('M3.8 14.6h16.4')}
    </>
  ),

  book: (
    <>
      {p('M12 6.8C10.4 5.3 8.2 4.6 5 4.6H3.6v13.1H5c3.2 0 5.4.8 7 2.2 1.6-1.4 3.8-2.2 7-2.2h1.4V4.6H19c-3.2 0-5.4.7-7 2.2Z')}
      {p('M12 6.8v13.1')}
    </>
  ),

  scale: (
    <>
      {p('M12 5.6v13.6')}{p('M7.6 19.2h8.8')}{p('M4.6 8.4 12 6.2l7.4 2.2')}
      {p('M4.6 8.4 2.4 13.6a2.9 2.9 0 0 0 4.4 0Z')}
      {p('M19.4 8.4 17.2 13.6a2.9 2.9 0 0 0 4.4 0Z')}
    </>
  ),

  file: <>{p('M6.2 3.6h7L19 9.4v11H6.2Z')}{p('M13.2 3.6v5.8H19')}{p('M9 13.4h7')}{p('M9 16.8h4.6')}</>,

  image: (
    <>
      {r(3.4, 4.6, 17.2, 14.8, 2.2)}{c(8.8, 9.6, 1.7)}
      {p('M3.6 16.8 8.2 12.3l3.4 3.2 3.4-3.4 5.4 5.1')}
    </>
  ),

  chart: <>{p('M4 20h16')}{p('M7.6 20v-5.6')}{p('M12 20V8.6')}{p('M16.4 20v-8.4')}</>,

  link: (
    <>
      {p('M10.2 13.8a4.1 4.1 0 0 0 5.8 0l2.9-3a4.1 4.1 0 1 0-5.8-5.7l-1.6 1.6')}
      {p('M13.8 10.2a4.1 4.1 0 0 0-5.8 0l-2.9 3a4.1 4.1 0 1 0 5.8 5.7l1.6-1.6')}
    </>
  ),

  external: (
    <>
      {p('M14.2 4.6h5.2v5.2')}{p('M19.4 4.6 11.4 12.6')}
      {p('M18.4 13.8v4.6a1.6 1.6 0 0 1-1.6 1.6H5.8a1.6 1.6 0 0 1-1.6-1.6V7.4a1.6 1.6 0 0 1 1.6-1.6h4.6')}
    </>
  ),

  'chevron-right': p('M9.6 5.4 16.2 12l-6.6 6.6'),
  'chevron-down': p('M5.4 9.6 12 16.2l6.6-6.6'),
  'chevron-left': p('M14.4 5.4 7.8 12l6.6 6.6'),
  'chevron-up': p('M5.4 14.4 12 7.8l6.6 6.6'),

  plus: <>{p('M12 5.2v13.6')}{p('M5.2 12h13.6')}</>,
  minus: p('M5.2 12h13.6'),

  edit: (
    <>
      {p('M4.6 19.4 5.4 15.2 15.9 4.8a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L8.8 18.6l-4.2.8Z')}
      {p('M14.6 6.2l3.2 3.2')}
    </>
  ),

  eye: <>{p('M2.6 12S6.2 5.9 12 5.9 21.4 12 21.4 12 17.8 18.1 12 18.1 2.6 12 2.6 12Z')}{c(12, 12, 3.1)}</>,

  'eye-off': (
    <>
      {p('M4.2 4.2 19.8 19.8')}
      {p('M9.8 9.9a3.1 3.1 0 0 0 4.3 4.3')}
      {p('M6.6 6.9C4.2 8.5 2.6 12 2.6 12s3.6 6.1 9.4 6.1c1.6 0 3-.4 4.2-1')}
      {p('M17.9 15.3c2.2-1.6 3.5-3.3 3.5-3.3S17.8 5.9 12 5.9c-.9 0-1.8.1-2.6.4')}
    </>
  ),

  lock: <>{r(4.6, 10.4, 14.8, 9.4, 2.2)}{p('M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6')}{p('M12 14.2v2.2')}</>,

  unlock: <>{r(4.6, 10.4, 14.8, 9.4, 2.2)}{p('M8.2 10.4V7.8a3.8 3.8 0 0 1 7.3-1.3')}{p('M12 14.2v2.2')}</>,

  sparkle: (
    <>
      {p('M11.4 3.4 13.1 8.3 18 10l-4.9 1.7-1.7 4.9-1.7-4.9L4.8 10l4.9-1.7Z')}
      {p('M17.8 15.2 18.6 17.4 20.8 18.2 18.6 19 17.8 21.2 17 19 14.8 18.2 17 17.4Z')}
    </>
  ),

  refresh: (
    <>
      {p('M20.4 12a8.4 8.4 0 0 1-14.7 5.5')}{p('M3.6 12a8.4 8.4 0 0 1 14.7-5.5')}
      {p('M18.2 2.6v4.2H14')}{p('M5.8 21.4v-4.2H10')}
    </>
  ),

  send: <>{p('M20.8 3.2 3.4 10.3l7.4 2.9 2.9 7.4Z')}{p('M10.8 13.2 20.8 3.2')}</>,

  archive: (
    <>
      {r(3.4, 4.4, 17.2, 4.2, 1.4)}
      {p('M5.2 8.6v9.6a1.8 1.8 0 0 0 1.8 1.8h10a1.8 1.8 0 0 0 1.8-1.8V8.6')}
      {p('M9.8 12.6h4.4')}
    </>
  ),

  trash: (
    <>
      {p('M4.4 6.8h15.2')}
      {p('M9.6 6.8V5a1.4 1.4 0 0 1 1.4-1.4h2a1.4 1.4 0 0 1 1.4 1.4v1.8')}
      {p('M6.6 6.8l.9 12a1.6 1.6 0 0 0 1.6 1.5h5.8a1.6 1.6 0 0 0 1.6-1.5l.9-12')}
      {p('M10.4 10.6v6')}{p('M13.6 10.6v6')}
    </>
  ),

  flag: <>{p('M5.4 3.4v17.2')}{p('M5.4 5h12.8l-2.2 3.9 2.2 3.9H5.4Z')}</>,

  users: (
    <>
      {c(9.4, 8.4, 3.4)}
      {p('M3.4 19.6c.7-3.3 3-5 6-5s5.3 1.7 6 5')}
      {p('M16.4 5.6a3.4 3.4 0 0 1 0 5.6')}
      {p('M17.4 15c2.1.6 3.4 2.2 3.8 4.6')}
    </>
  ),

  quote: (
    <>
      {p('M10.2 6.6C7.4 7.7 5.6 10 5.6 13v4.4H11V11.9H8.6c0-1.8.6-3.1 1.9-4Z')}
      {p('M18.8 6.6C16 7.7 14.2 10 14.2 13v4.4h5.4V11.9h-2.4c0-1.8.6-3.1 1.9-4Z')}
    </>
  ),

  layers: <>{p('M12 3.4 20.6 8 12 12.6 3.4 8Z')}{p('M3.4 12.2 12 16.8l8.6-4.6')}{p('M3.4 16.4 12 21l8.6-4.6')}</>,

  diff: (
    <>
      {r(3.6, 4.4, 16.8, 15.2, 2.2)}{p('M12 4.4v15.2')}
      {p('M5.9 10.2h3.6')}{p('M7.7 8.4v3.6')}{p('M14.5 13.8h3.6')}
    </>
  ),

  play: p('M8.6 5.4 18.8 12 8.6 18.6Z'),

  download: <>{p('M12 3.8v11.4')}{p('M7.4 10.8 12 15.4l4.6-4.6')}{p('M4.4 19.8h15.2')}</>,

  mail: <>{r(3.4, 5.2, 17.2, 13.6, 2.2)}{p('M3.8 7.2 12 13l8.2-5.8')}</>,

  menu: <>{p('M4 7h16')}{p('M4 12h16')}{p('M4 17h16')}</>,

  sun: (
    <>
      {c(12, 12, 4.2)}
      {p('M12 2.4v2.3')}{p('M12 19.3v2.3')}{p('M2.4 12h2.3')}{p('M19.3 12h2.3')}
      {p('M5.2 5.2 6.8 6.8')}{p('M17.2 17.2l1.6 1.6')}{p('M18.8 5.2 17.2 6.8')}{p('M6.8 17.2 5.2 18.8')}
    </>
  ),

  moon: p('M20.4 14.4A8.6 8.6 0 0 1 9.6 3.6a8.6 8.6 0 1 0 10.8 10.8Z'),

  info: <>{c(12, 12, 8.5)}{p('M12 11.2v5')}{p('M12 7.8h.01')}</>,

  history: (
    <>
      {p('M3.7 12a8.3 8.3 0 1 0 2.7-6.1')}{p('M3.5 3.4v4.6h4.6')}
      {p('M12 7.6V12l3.3 1.9')}
    </>
  ),

  pin: <>{p('M12 20.8c4-4.4 6.1-7.8 6.1-10.5A6.1 6.1 0 0 0 5.9 10.3c0 2.7 2.1 6.1 6.1 10.5Z')}{c(12, 10.2, 2.4)}</>,

  target: <>{c(12, 12, 8.4)}{c(12, 12, 4.2)}{p('M12 12h.01')}</>,

  database: (
    <>
      {e(12, 6.4, 7.6, 3)}
      {p('M4.4 6.4v11.2c0 1.7 3.4 3 7.6 3s7.6-1.3 7.6-3V6.4')}
      {p('M4.4 12c0 1.7 3.4 3 7.6 3s7.6-1.3 7.6-3')}
    </>
  ),

  branch: (
    <>
      {c(7, 5.8, 2.4)}{c(7, 18.2, 2.4)}{c(17, 5.8, 2.4)}
      {p('M7 8.2v7.6')}
      {p('M17 8.2v2.4a4.4 4.4 0 0 1-4.4 4.4H7')}
    </>
  ),

  grid: <>{r(3.8, 3.8, 7, 7, 1.8)}{r(13.2, 3.8, 7, 7, 1.8)}{r(3.8, 13.2, 7, 7, 1.8)}{r(13.2, 13.2, 7, 7, 1.8)}</>,

  list: (
    <>
      {p('M9 6.6h11')}{p('M9 12h11')}{p('M9 17.4h11')}
      {p('M4.6 6.6h.01')}{p('M4.6 12h.01')}{p('M4.6 17.4h.01')}
    </>
  ),

  'arrow-right': <>{p('M4 12h15.2')}{p('M13.4 6.2 19.2 12l-5.8 5.8')}</>,

  'arrow-up-right': <>{p('M6.9 17.1 17.1 6.9')}{p('M8.6 6.9h8.5v8.5')}</>,
}

export interface IconProps {
  name: IconName
  /** Rendered box in px. 16 by default; the grid is authored at 24. */
  size?: number
  className?: string
  /** When given the icon becomes meaningful (`role="img"`) instead of decorative. */
  title?: string
}

export function Icon({ name, size = 16, className, title }: IconProps): JSX.Element {
  const decorative = !title
  return (
    <svg
      className={cx('picon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {GLYPHS[name]}
    </svg>
  )
}
