import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Measure the available width of a chart's container.
 *
 * Charts are drawn in a user-space that maps 1:1 to CSS pixels rather than
 * being letter-boxed by `preserveAspectRatio`. That is deliberate: a viewBox
 * scaled to fit would shrink every axis label along with the plot, and at
 * 320px a 11px tick label would render at about 5px. Measuring instead keeps
 * type at its true size all the way down to the narrowest phone.
 */
export interface ChartWidth {
  /** Attach to the element whose width the chart should fill. */
  ref: (node: HTMLDivElement | null) => void
  width: number
  /** False until a real measurement has landed. */
  measured: boolean
}

export function useChartWidth(fallback = 640): ChartWidth {
  const [width, setWidth] = useState(fallback)
  const [measured, setMeasured] = useState(false)
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const obsRef = useRef<ResizeObserver | null>(null)

  const measure = useCallback(() => {
    const el = nodeRef.current
    if (!el) return
    const w = el.clientWidth || el.getBoundingClientRect().width
    if (!(w > 0)) return
    const next = Math.round(w)
    setWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next))
    setMeasured(true)
  }, [])

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      obsRef.current?.disconnect()
      obsRef.current = null
      nodeRef.current = node
      if (!node) return
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => measure())
        ro.observe(node)
        obsRef.current = ro
      }
      measure()
    },
    [measure],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (typeof ResizeObserver !== 'undefined') return undefined
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  useEffect(
    () => () => {
      obsRef.current?.disconnect()
      obsRef.current = null
    },
    [],
  )

  return { ref, width, measured }
}
