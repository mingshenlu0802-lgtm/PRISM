import { useId } from 'react'
import type { CSSProperties } from 'react'
import './Sparkline.css'

/**
 * A small trend line. Deliberately unlabelled on the axes — it is a shape, not
 * a chart — so it always ships with a title and a description naming the range
 * and the latest value.
 */

export interface SparklineProps {
  points: number[]
  width?: number
  height?: number
  /** Any CSS colour expression; defaults to the surface accent. */
  tone?: string
  label?: string
}

export function Sparkline({
  points,
  width = 112,
  height = 28,
  tone = 'var(--accent)',
  label,
}: SparklineProps): JSX.Element {
  const gid = useId().replace(/:/g, '')
  const title = label ?? '趋势'
  const style = { color: tone } as CSSProperties

  const clean = points.filter((n) => Number.isFinite(n))
  if (clean.length === 0) {
    return (
      <svg
        className="psparkline psparkline--empty"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        style={style}
      >
        <title>{title}</title>
        <desc>暂无数据。</desc>
        <line
          x1="1"
          y1={height / 2}
          x2={width - 1}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeDasharray="3 4"
          opacity=".4"
        />
      </svg>
    )
  }

  const pad = 2.4
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const span = max - min || 1
  const stepX = clean.length > 1 ? (width - pad * 2) / (clean.length - 1) : 0
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2)
  const x = (i: number) => pad + i * stepX

  const single = clean.length === 1
  const coords: { x: number; y: number }[] = single
    ? [{ x: pad, y: height / 2 }, { x: width - pad, y: height / 2 }]
    : clean.map((v, i) => ({ x: x(i), y: y(v) }))
  const line = coords.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(' ')
  const last = coords[coords.length - 1]
  const baseline = (height - pad).toFixed(2)
  const area = `${line} L${last.x.toFixed(2)} ${baseline} L${coords[0].x.toFixed(2)} ${baseline} Z`
  const lastValue = clean[clean.length - 1]
  const first = clean[0]
  const direction = lastValue > first ? '上升' : lastValue < first ? '下降' : '持平'

  return (
    <svg
      className="psparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      style={style}
    >
      <title>{title}</title>
      <desc>
        {`共 ${clean.length} 个数据点，区间 ${min} 至 ${max}，最新值 ${lastValue}，整体${direction}。`}
      </desc>
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity=".22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {single ? null : <path d={area} fill={`url(#spark-${gid})`} stroke="none" />}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r="2.1" fill="currentColor" />
    </svg>
  )
}
