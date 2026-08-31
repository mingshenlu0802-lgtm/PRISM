/**
 * PRISM 棱镜 — chart components.
 *
 * Every chart here is hand-authored SVG with hand-computed scales; no charting
 * library is used anywhere in this project.
 */

export { ChartFrame } from './ChartFrame'
export type { ChartFrameProps } from './ChartFrame'

export { ChartRenderer } from './ChartRenderer'
export type { ChartRendererProps } from './ChartRenderer'

export { BarChart } from './BarChart'
export type { BarChartProps } from './BarChart'

export { LineChart } from './LineChart'
export type { LineChartProps } from './LineChart'

export { StackedBarChart } from './StackedBarChart'
export type { StackedBarChartProps } from './StackedBarChart'

export { RangeChart } from './RangeChart'
export type { RangeChartProps } from './RangeChart'

export { DonutChart } from './DonutChart'
export type { DonutChartProps } from './DonutChart'

export { DistributionBars } from './DistributionBars'
export type { DistributionBarsProps } from './DistributionBars'

export { WorldGraticule } from './WorldGraticule'
export type { WorldGraticuleProps } from './WorldGraticule'

export { TimelineStrip } from './TimelineStrip'
export type { TimelineStripProps } from './TimelineStrip'

export { ChartCanvas, ChartTooltip, SrTable } from './ChartPrimitives'
export type { ChartTipData } from './ChartPrimitives'

export { useChartWidth } from './useChartWidth'
export type { ChartWidth } from './useChartWidth'

export {
  BREAK_MARK,
  CHART_COLORS,
  categoriesOf,
  cleanLabel,
  closedSmoothPath,
  donutArc,
  estTextWidth,
  fmtNumber,
  fmtValue,
  fmtWithUnit,
  isBreak,
  linePath,
  markTitle,
  niceAxis,
  overlaps,
  percent,
  pointAt,
  polar,
  seriesColor,
  sum,
  truncate,
} from './scale'
export type { Box, ChartPoint, ChartSeries, NiceAxis, Pt } from './scale'
