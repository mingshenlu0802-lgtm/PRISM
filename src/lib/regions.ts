/**
 * 地区分类。
 *
 * Ordered by search priority: the collector works down this list, so the first
 * six are the ones it sweeps first and most often. A story can carry more than
 * one region — a Beijing ruling reported from Hong Kong belongs to both.
 */

export type RegionKey =
  | 'cn'        // 中国内地
  | 'hk'        // 香港
  | 'tw'        // 台湾
  | 'jpkr'      // 日韩
  | 'us'        // 美国
  | 'eu'        // 欧洲
  | 'anz'       // 澳新
  | 'ru'        // 俄罗斯
  | 'mena'      // 中东
  | 'africa'    // 非洲
  | 'sea'       // 东南亚
  | 'sasia'     // 南亚
  | 'latam'     // 拉美
  | 'global'    // 跨区域

export interface Region {
  key: RegionKey
  zh: string
  en: string
  /** Lower is swept first and more often. */
  priority: 1 | 2 | 3
  /** Shown on the region page so the scope is unambiguous. */
  scope: string
  hue: string
}

export const REGIONS: Region[] = [
  { key: 'cn', zh: '中国内地', en: 'Mainland China', priority: 1, hue: 'var(--r-cn)', scope: '中国内地各省市，含中央与地方立法、司法与政策文件。' },
  { key: 'hk', zh: '香港', en: 'Hong Kong', priority: 1, hue: 'var(--r-hk)', scope: '香港特别行政区，含本地立法会、法院与公营机构材料。' },
  { key: 'tw', zh: '台湾', en: 'Taiwan', priority: 1, hue: 'var(--r-tw)', scope: '台湾地区，含立法与司法机关公开文件。' },
  { key: 'jpkr', zh: '日韩', en: 'Japan & Korea', priority: 1, hue: 'var(--r-jpkr)', scope: '日本与韩国。' },
  { key: 'us', zh: '美国', en: 'United States', priority: 1, hue: 'var(--r-us)', scope: '美国联邦与各州。' },
  { key: 'eu', zh: '欧洲', en: 'Europe', priority: 1, hue: 'var(--r-eu)', scope: '欧盟成员国、英国及欧洲其他国家。' },
  { key: 'anz', zh: '澳新', en: 'Australia & NZ', priority: 2, hue: 'var(--r-anz)', scope: '澳大利亚与新西兰。' },
  { key: 'sea', zh: '东南亚', en: 'Southeast Asia', priority: 2, hue: 'var(--r-sea)', scope: '东盟十国及周边。' },
  { key: 'sasia', zh: '南亚', en: 'South Asia', priority: 2, hue: 'var(--r-sasia)', scope: '印度、巴基斯坦、孟加拉国、尼泊尔、斯里兰卡等。' },
  { key: 'mena', zh: '中东与北非', en: 'Middle East & North Africa', priority: 2, hue: 'var(--r-mena)', scope: '西亚与北非各国。' },
  { key: 'ru', zh: '俄罗斯与中亚', en: 'Russia & Central Asia', priority: 2, hue: 'var(--r-ru)', scope: '俄罗斯联邦与中亚五国。' },
  { key: 'africa', zh: '撒哈拉以南非洲', en: 'Sub-Saharan Africa', priority: 3, hue: 'var(--r-africa)', scope: '撒哈拉以南非洲各国。' },
  { key: 'latam', zh: '拉丁美洲', en: 'Latin America', priority: 3, hue: 'var(--r-latam)', scope: '中南美洲与加勒比地区。' },
  { key: 'global', zh: '跨区域 · 国际机构', en: 'Global & multilateral', priority: 2, hue: 'var(--r-global)', scope: '联合国机构、区域性组织与跨国比较研究。' },
]

export const REGION_MAP: Record<RegionKey, Region> = Object.fromEntries(
  REGIONS.map((r) => [r.key, r]),
) as Record<RegionKey, Region>

/** The six the collector sweeps first, in order. */
export const PRIORITY_REGIONS: RegionKey[] = REGIONS
  .filter((r) => r.priority === 1)
  .map((r) => r.key)

export function regionLabel(key: RegionKey): string {
  return REGION_MAP[key]?.zh ?? key
}

/** Sort regions so the priority sweep always reads in the same order. */
export function sortRegions(keys: RegionKey[]): RegionKey[] {
  const order = new Map(REGIONS.map((r, i) => [r.key, i]))
  return [...keys].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99))
}
