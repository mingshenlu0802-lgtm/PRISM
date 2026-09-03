/**
 * 从数据点里取数、算表达、定颜色。
 *
 * 这里集中了几条**规格里写死、界面上不能商量**的规矩：
 *
 *   一、没有数据就是没有数据，绝不显示 0。缺数据和「零个受害者」
 *      是完全相反的两件事，而在地图上它们长得一模一样。
 *   二、`comparable: false` 的指标不排名、不比高低。各国的行为定义
 *      和年龄范围不同，比出来的差别可能全部来自问卷。
 *   三、换算出来的人数一律标注，并且把公式、人口来源、年份一起给出。
 *   四、气泡大小表示人数、颜色深浅表示比例——但页面上必须一直提醒：
 *      人口多的国家绝对人数自然高，那不代表当地女性的个人风险更高。
 */
import { POINTS, FUNNEL, LAWS } from './data'
import { INDICATOR_MAP } from './indicators'
import type { DataPoint } from './types'

export type Mode = 'percent' | 'count' | 'per100k'

/** 某个国家、某个指标的所有数据点，最新的在前。 */
export function pointsFor(country: string, indicator: string): DataPoint[] {
  return POINTS
    .filter((p) => p.country === country && p.indicator === indicator)
    .sort((a, b) => (b.surveyYear ?? 0) - (a.surveyYear ?? 0))
}

/** 取最新的一条。没有就是 undefined——调用方必须把「没有」当成一种状态。 */
export const latest = (country: string, indicator: string): DataPoint | undefined =>
  pointsFor(country, indicator)[0]

/** 这个指标下有数据的国家。 */
export function countriesWith(indicator: string): Map<string, DataPoint> {
  const out = new Map<string, DataPoint>()
  for (const p of POINTS) {
    if (p.indicator !== indicator || p.country.length !== 3 || p.country === 'WORLD') continue
    const had = out.get(p.country)
    if (!had || (p.surveyYear ?? 0) > (had.surveyYear ?? 0)) out.set(p.country, p)
  }
  return out
}

/** 全球级的点（country === 'WORLD'）。 */
export const globalPoints = (): DataPoint[] =>
  POINTS.filter((p) => p.country === 'WORLD')

export const funnelFor = (country: string) => FUNNEL.filter((f) => f.country === country)
export const lawFor = (country: string) => LAWS.find((l) => l.country === country)

/** 这个国家一共有几条数据——国家列表上用它区分「有」和「没有」。 */
export function countryCoverage(): Map<string, number> {
  const out = new Map<string, number>()
  for (const p of POINTS) {
    if (p.country.length !== 3 || p.country === 'WORLD') continue
    out.set(p.country, (out.get(p.country) ?? 0) + 1)
  }
  return out
}

/** 某个模式下这个点有没有值。没有就是没有。 */
export function valueOf(p: DataPoint | undefined, mode: Mode): number | undefined {
  if (!p) return undefined
  return mode === 'percent' ? p.percent : mode === 'count' ? p.count : p.per100k
}

/**
 * 「每 X 人中就有 1 人」。
 *
 * 只在比例落在能这么说的区间里才给：51% 说成「每 1.96 人中有 1 人」是废话，
 * 0.2% 说成「每 500 人中有 1 人」倒是有用的。
 */
export function oneIn(percent: number | undefined): string | undefined {
  if (percent === undefined || percent <= 0 || percent > 60) return undefined
  const n = 100 / percent
  return `每 ${n < 10 ? n.toFixed(1).replace(/\.0$/, '') : Math.round(n)} 人中约有 1 人`
}

/** 人数按中文习惯写：1240 万、3.7 亿。 */
export function humanCount(n: number | undefined): string | undefined {
  if (n === undefined) return undefined
  if (n >= 1e8) return `${(n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '')} 亿`
  if (n >= 1e4) return `${(n / 1e4).toFixed(n >= 1e6 ? 0 : 1).replace(/\.0$/, '')} 万`
  return n.toLocaleString('zh-CN')
}

/** 这个指标能不能排名、能不能国家之间比高低。 */
export const isComparable = (indicator: string): boolean =>
  Boolean(INDICATOR_MAP[indicator]?.comparable)

/** 从浅砂到深靛：明度单调下降，色盲也读得出顺序。**不用红绿**。 */
export const STOPS = ['#EFE7DC', '#D8CEDF', '#B9AECD', '#9084BA', '#6A5F9F', '#3B3369']

/**
 * 颜色深浅，按**分位数**分档，不按数值线性分。
 *
 * 线性刻度在这份数据上没法看：全球的比例集中在 12%–26%，只有几个太平洋岛国
 * 到 51%。线性一拉，一百多个国家全挤在最浅的两档里，整张图是一片米色，
 * 而那正是要让人看见差别的地方。分位数把六个档位分给同样多的国家，
 * 差别就出来了。
 *
 * 代价要说清楚：**分位数的颜色不是绝对刻度**。同一个 20%，在一个指标上
 * 可能是浅色，在另一个上可能是深色。所以图例上写的是「低—高」，
 * 不写具体数值，也不用它做任何排名。
 *
 * 不用红绿：红绿会把「这个国家很糟」变成一句价值判断，而这张图上的深色
 * 往往只说明那个国家做过一次认真的全国调查。
 */
export function ramp(value: number, breaks: number[]): string {
  let i = 0
  while (i < breaks.length && value > breaks[i]) i++
  return STOPS[Math.min(STOPS.length - 1, i)]
}

/**
 * 分位数切点。返回 STOPS.length - 1 个值。
 * 空的时候返回 undefined——不要假装有刻度。
 */
export function breaksOf(values: number[]): number[] | undefined {
  const ok = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (ok.length === 0) return undefined
  const n = STOPS.length - 1
  const out: number[] = []
  for (let i = 1; i <= n; i++) out.push(ok[Math.min(ok.length - 1, Math.floor((ok.length * i) / (n + 1)))])
  return out
}

/** 数据是不是太旧——规格里要求给旧数据一个时钟图标。 */
export const isStale = (p: DataPoint, now = new Date().getFullYear()): boolean =>
  Boolean(p.surveyYear && now - p.surveyYear > 10)

export const CONFIDENCE_ZH: Record<DataPoint['confidence'], string> = {
  national: '全国代表性调查',
  limited: '有限可信度（地区或便利样本）',
  modelled: '国际机构模型估计',
}

export const SCOPE_ZH: Record<DataPoint['scope'], string> = {
  national: '全国样本',
  subnational: '地区样本',
  convenience: '便利样本',
}
