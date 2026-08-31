import type { ChartKind, ChartSpec } from '../../lib/types'
import { BarChart } from './BarChart'
import { ChartFrame } from './ChartFrame'
import { DonutChart } from './DonutChart'
import { LineChart } from './LineChart'
import { RangeChart } from './RangeChart'
import { StackedBarChart } from './StackedBarChart'
import { seriesColor } from './scale'
import './ChartRenderer.css'

/**
 * Dispatches a `ChartSpec` to the right hand-drawn chart and wraps it in the
 * standard figure chrome, so that no chart can reach a reader without its
 * source line and its stated limitation travelling alongside it.
 */

export interface ChartRendererProps {
  chart: ChartSpec
  sourceLabel?: string
  height?: number
  dense?: boolean
}

function defaultHeight(kind: ChartKind): number {
  switch (kind) {
    case 'donut':
      return 240
    case 'range':
      return 0
    case 'line':
      return 264
    default:
      return 260
  }
}

export function ChartRenderer({ chart, sourceLabel, height, dense }: ChartRendererProps): JSX.Element {
  const h = height ?? defaultHeight(chart.kind)

  const body = (() => {
    switch (chart.kind) {
      case 'line':
        return <LineChart spec={chart} height={h} />
      case 'stacked':
        return <StackedBarChart spec={chart} height={h} />
      case 'range':
        return <RangeChart spec={chart} height={h || undefined} />
      case 'donut':
        return <DonutChart spec={chart} height={h} />
      case 'bar':
      default:
        return <BarChart spec={chart} height={h} />
    }
  })()

  const legend =
    chart.kind === 'donut'
      ? undefined
      : chart.series.map((s, i) => ({ name: s.name, color: seriesColor(i, s.color) }))

  return (
    <ChartFrame
      title={chart.title}
      subtitle={chart.subtitle}
      unit={chart.unit}
      sourceLabel={sourceLabel ?? chart.sourceNote}
      limitation={chart.limitation}
      legend={legend}
      height={h > 0 ? h : undefined}
      dense={dense}
    >
      <div className="pcrender">{body}</div>
    </ChartFrame>
  )
}

export { BarChart } from './BarChart'
export { LineChart } from './LineChart'
export { StackedBarChart } from './StackedBarChart'
export { RangeChart } from './RangeChart'
export { DonutChart } from './DonutChart'
