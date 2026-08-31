import { useMemo } from 'react'
import type { ImageAsset } from '../../lib/types'
import { cx } from '../../lib/util'
import './ConceptImage.css'

/**
 * Procedural "concept illustration" renderer.
 *
 * This prototype never depicts a news scene, a location, or a person — and it
 * certainly never depicts a survivor. Every visual is abstract geometry derived
 * deterministically from the asset id, drawn in the house palette, and stamped
 * 「概念插图」 whenever `asset.conceptual` is true.
 */

const PALETTE = [
  'var(--prism-1)', 'var(--prism-2)', 'var(--prism-3)',
  'var(--prism-4)', 'var(--prism-6)', 'var(--coral-500)',
]

/** xmutable-free 32-bit hash → deterministic per-asset geometry. */
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  let s = seed || 1
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
}

export interface ConceptImageProps {
  asset: ImageAsset
  ratio?: '16-9' | '4-3' | '1-1' | '3-2' | '21-9'
  className?: string
  /** Renders the 「概念插图」 stamp. Default true when asset.conceptual. */
  stamp?: boolean
  rounded?: boolean
}

const RATIO_BOX: Record<NonNullable<ConceptImageProps['ratio']>, [number, number]> = {
  '16-9': [1600, 900],
  '4-3': [1600, 1200],
  '1-1': [1200, 1200],
  '3-2': [1500, 1000],
  '21-9': [2100, 900],
}

export function ConceptImage({ asset, ratio = '16-9', className, stamp, rounded = true }: ConceptImageProps) {
  const [W, H] = RATIO_BOX[ratio]
  const showStamp = stamp ?? asset.conceptual
  const uid = `ci-${asset.id.replace(/[^a-zA-Z0-9]/g, '')}`

  const art = useMemo(() => {
    const seed = hash(asset.id + asset.motif)
    const rand = rng(seed)
    const hues = asset.palette.length >= 2 ? asset.palette : PALETTE
    const pick = (i: number) => hues[i % hues.length]
    return { rand, pick, seed }
  }, [asset.id, asset.motif, asset.palette])

  return (
    <figure className={cx('ci', rounded && 'ci--rounded', className)} data-motif={asset.motif}>
      <svg
        className="ci__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`${asset.label}（概念插图，抽象几何构图，不呈现任何真实人物或场景）`}
      >
        <defs>
          <linearGradient id={`${uid}-ground`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ink-900)" />
            <stop offset="58%" stopColor="var(--ink-800)" />
            <stop offset="100%" stopColor="var(--ink-950)" />
          </linearGradient>
          <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--paper-50)" stopOpacity="0" />
            <stop offset="60%" stopColor="var(--paper-50)" stopOpacity=".85" />
            <stop offset="100%" stopColor="var(--paper-50)" stopOpacity=".95" />
          </linearGradient>
          <pattern id={`${uid}-grid`} width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M64 0H0v64" fill="none" stroke="var(--prism-1)" strokeOpacity=".18" strokeWidth="1" />
          </pattern>
          <filter id={`${uid}-soft`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
          <clipPath id={`${uid}-clip`}><rect width={W} height={H} /></clipPath>
        </defs>

        <g clipPath={`url(#${uid}-clip)`}>
          <rect width={W} height={H} fill={`url(#${uid}-ground)`} />
          <rect width={W} height={H} fill={`url(#${uid}-grid)`} />
          <Motif motif={asset.motif} W={W} H={H} uid={uid} pick={art.pick} rand={art.rand} />
          {/* Grain: a fixed lattice of faint dots, no randomness at paint time. */}
          <rect width={W} height={H} fill="var(--ink-950)" opacity=".06" />
        </g>
      </svg>

      {showStamp && (
        <span className="ci__stamp">
          <span className="ci__stamp-dot" aria-hidden="true" />
          概念插图 · AI 生成 · 非新闻现场
        </span>
      )}
      {asset.caption && <figcaption className="ci__cap">{asset.caption}</figcaption>}
    </figure>
  )
}

interface MotifProps {
  motif: ImageAsset['motif']
  W: number
  H: number
  uid: string
  pick: (i: number) => string
  rand: () => number
}

function Motif({ motif, W, H, uid, pick, rand }: MotifProps) {
  switch (motif) {
    /* A beam entering a prism and fanning out — the house motif. */
    case 'prism-fold': {
      const cx0 = W * 0.44
      const cy0 = H * 0.5
      const size = H * 0.34
      const fan = Array.from({ length: 6 }, (_, i) => {
        const a = -18 + i * 7.4
        const rad = (a * Math.PI) / 180
        return `M ${cx0 + size * 0.5} ${cy0} L ${W + 40} ${cy0 + Math.tan(rad) * (W - cx0)}`
      })
      return (
        <g>
          <circle cx={W * 0.2} cy={H * 0.3} r={H * 0.42} fill="var(--prism-1)" opacity=".16" filter={`url(#${uid}-soft)`} />
          <rect x={0} y={cy0 - 3} width={cx0 - size * 0.42} height={6} fill={`url(#${uid}-beam)`} />
          {fan.map((d, i) => (
            <path key={i} d={d} stroke={pick(i)} strokeWidth={i === 5 ? 7 : 5} opacity={0.82 - i * 0.055} fill="none" strokeLinecap="round" />
          ))}
          <path
            d={`M ${cx0} ${cy0 - size} L ${cx0 + size * 0.86} ${cy0 + size * 0.6} L ${cx0 - size * 0.86} ${cy0 + size * 0.6} Z`}
            fill="var(--paper-50)" fillOpacity=".07" stroke="var(--paper-50)" strokeOpacity=".55" strokeWidth="3"
          />
        </g>
      )
    }

    /* A schematic projection grid — used for map-flavoured assets. */
    case 'graticule': {
      const lats = Array.from({ length: 7 }, (_, i) => H * ((i + 1) / 8))
      const lons = Array.from({ length: 11 }, (_, i) => W * ((i + 1) / 12))
      const blobs = Array.from({ length: 5 }, (_, i) => ({
        x: W * (0.12 + rand() * 0.76),
        y: H * (0.2 + rand() * 0.6),
        r: H * (0.08 + rand() * 0.16),
        c: pick(i),
      }))
      return (
        <g>
          {lats.map((y, i) => (
            <path key={`la${i}`} d={`M 0 ${y} Q ${W / 2} ${y + (i - 3) * 14} ${W} ${y}`} stroke="var(--prism-1)" strokeOpacity=".3" fill="none" strokeWidth="1.4" />
          ))}
          {lons.map((x, i) => (
            <path key={`lo${i}`} d={`M ${x} 0 Q ${x + (i - 5) * 10} ${H / 2} ${x} ${H}`} stroke="var(--prism-1)" strokeOpacity=".22" fill="none" strokeWidth="1.2" />
          ))}
          {blobs.map((b, i) => (
            <ellipse key={i} cx={b.x} cy={b.y} rx={b.r * 1.5} ry={b.r} fill={b.c} opacity=".26" />
          ))}
          {blobs.map((b, i) => (
            <circle key={`p${i}`} cx={b.x} cy={b.y} r={8 + i * 3} fill="var(--coral-400)" opacity=".9" />
          ))}
        </g>
      )
    }

    /* Stacked sediment bands — for historical / longitudinal pieces. */
    case 'strata': {
      const bands = Array.from({ length: 9 }, (_, i) => {
        const y = H * (0.14 + i * 0.084)
        const amp = 10 + rand() * 46
        return { y, amp, c: pick(i) }
      })
      return (
        <g>
          {bands.map((b, i) => (
            <path
              key={i}
              d={`M -20 ${b.y} C ${W * 0.3} ${b.y - b.amp} ${W * 0.68} ${b.y + b.amp} ${W + 20} ${b.y}`}
              stroke={b.c} strokeWidth={i % 3 === 0 ? 8 : 3.5} fill="none"
              opacity={0.28 + (i % 4) * 0.14} strokeLinecap="round"
            />
          ))}
          <rect x={W * 0.62} y={0} width={2} height={H} fill="var(--coral-400)" opacity=".7" />
        </g>
      )
    }

    /* Concentric aperture — for pieces about access, gatekeeping, thresholds. */
    case 'aperture': {
      const cx0 = W * 0.5
      const cy0 = H * 0.52
      const rings = Array.from({ length: 7 }, (_, i) => ({ r: H * (0.08 + i * 0.072), c: pick(i) }))
      return (
        <g>
          {rings.map((r, i) => (
            <circle
              key={i} cx={cx0} cy={cy0} r={r.r} fill="none" stroke={r.c}
              strokeWidth={i === 3 ? 6 : 2.5} opacity={0.75 - i * 0.07}
              strokeDasharray={i % 2 ? `${18 + i * 6} ${10 + i * 4}` : undefined}
            />
          ))}
          <path d={`M ${cx0 - H * 0.5} ${cy0} L ${cx0 + H * 0.5} ${cy0}`} stroke="var(--paper-50)" strokeOpacity=".5" strokeWidth="2" />
          <circle cx={cx0} cy={cy0} r={H * 0.04} fill="var(--coral-500)" />
        </g>
      )
    }

    /* A ledger of rules — for legal-document pieces. */
    case 'ledger': {
      const rows = Array.from({ length: 12 }, (_, i) => ({
        y: H * (0.12 + i * 0.065),
        w: W * (0.22 + rand() * 0.5),
        c: i % 4 === 0 ? pick(i) : 'var(--paper-50)',
        o: i % 4 === 0 ? 0.85 : 0.2 + rand() * 0.18,
      }))
      return (
        <g>
          <rect x={W * 0.08} y={H * 0.06} width={W * 0.62} height={H * 0.88} fill="var(--paper-50)" opacity=".04" />
          {rows.map((r, i) => (
            <rect key={i} x={W * 0.12} y={r.y} width={r.w} height={i % 4 === 0 ? 9 : 5} rx={3} fill={r.c} opacity={r.o} />
          ))}
          <path d={`M ${W * 0.78} ${H * 0.1} L ${W * 0.78} ${H * 0.9}`} stroke="var(--prism-3)" strokeWidth="3" opacity=".8" />
          <path d={`M ${W * 0.78} ${H * 0.34} L ${W * 0.94} ${H * 0.34}`} stroke="var(--coral-400)" strokeWidth="5" opacity=".9" />
        </g>
      )
    }

    /* Interference pattern — for online-abuse / network pieces. */
    case 'signal':
    default: {
      const nodes = Array.from({ length: 16 }, (_, i) => ({
        x: W * (0.1 + rand() * 0.8),
        y: H * (0.12 + rand() * 0.76),
        r: 4 + rand() * 13,
        c: pick(i),
      }))
      return (
        <g>
          {nodes.map((n, i) =>
            nodes.slice(i + 1, i + 4).map((m, j) => (
              <line
                key={`${i}-${j}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y}
                stroke="var(--prism-1)" strokeOpacity=".26" strokeWidth="1.4"
              />
            )),
          )}
          {nodes.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={n.c} opacity={i % 5 === 0 ? 0.95 : 0.55} />
          ))}
          <circle cx={W * 0.5} cy={H * 0.5} r={H * 0.4} fill="none" stroke="var(--coral-400)" strokeOpacity=".55" strokeWidth="2" strokeDasharray="14 12" />
        </g>
      )
    }
  }
}
