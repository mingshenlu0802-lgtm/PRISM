/**
 * 一个数据点要带的全部信息。
 *
 * 站长的规格里列了十六个字段：国家、洲别、指标名称、人数、比例、每 10 万人
 * 发生率、人口分母、年龄范围、行为定义、调查年份、发布日期、样本量、
 * 调查方法、全国或地区样本、原始链接、置信区间、可信度等级及研究局限。
 * 这个 interface 就是那一串，一个不少。
 *
 * 为什么要这么重：因为**这一页的价值不在数字，在数字的边界**。
 * 「1240 万名女性」这句话，不配上「哪一年、哪个年龄段、什么行为算、
 * 谁问的、问了多少人」，就只是一个可以被随便引用的印象。这个站的其他地方
 * 都在守这条规矩（每一份研究都要写「这份研究说不了什么」），
 * 一张地图不能例外——地图恰恰是最容易让人只记住颜色的那种形式。
 */

export type Confidence =
  /** 全国代表性调查或国际机构的国家模型估计。 */
  | 'national'
  /** 地区调查、便利样本、网络招募——只能按样本读，不能推成全国。 */
  | 'limited'
  /** 机构用模型补出来的估计，原始调查可能不在这一年、甚至不在这个国家。 */
  | 'modelled'

export type Scope = 'national' | 'subnational' | 'convenience'

export interface Denominator {
  /** 分母人口数。 */
  value: number
  /** 这个人口数哪来的。 */
  source: string
  year: number
  /** 谁被算进分母：15 岁以上女性？曾有过伴侣的女性？ */
  who: string
}

export interface DataPoint {
  /** ISO 3166-1 alpha-3；全球级的点用 'WORLD'，区域级用 'R:' 前缀。 */
  country: string
  indicator: string

  /* ---- 数值。三种表达都尽量给出，界面允许读者切换 ---- */
  percent?: number
  count?: number
  per100k?: number
  ci?: [number, number]

  /* ---- 这个数字是怎么来的 ---- */
  denominator?: Denominator
  /**
   * 人数是我们自己按比例乘人口算出来的吗。
   *
   * 是的话界面上必须写「根据调查比例与对应人口估算，并非实际登记人数」，
   * 并且把公式、人口来源、年份一起显示。这是站长点名要的一条，
   * 也是这一页最容易骗人的地方：一个换算出来的人数，看上去和一个
   * 登记出来的人数一模一样。
   */
  derived?: boolean

  /* ---- 边界 ---- */
  ageRange?: string
  /** 这条数据在数什么行为。指标本身有一个通用定义，这里放这个来源自己的口径。 */
  definition?: string
  surveyYear?: number
  /** 发布日期，ISO 日期串。 */
  published: string
  sampleSize?: number
  method: string
  scope: Scope
  confidence: Confidence
  /** 这份数据说不了什么。 */
  limits: string

  /* ---- 出处 ---- */
  sourceName: string
  sourceUrl: string
}

/** 司法漏斗的一级。人数 + 相对上一级还剩多少。 */
export interface FunnelPoint {
  country: string
  stage: string
  count: number
  year: number
  sourceName: string
  sourceUrl: string
  note?: string
}

/** 一国的法律状态——这几项是「是/否/部分」，不是数字。 */
export interface LawStatus {
  country: string
  /** 婚内强奸是否入罪。 */
  maritalRape: 'yes' | 'no' | 'partial' | 'unknown'
  /** 强奸罪是否以缺乏同意为核心（而不是以暴力或反抗为要件）。 */
  consentBased: 'yes' | 'no' | 'partial' | 'unknown'
  /** 是否要求暴力、反抗或身体伤势的证据。 */
  requiresForceEvidence: 'yes' | 'no' | 'partial' | 'unknown'
  year: number
  sourceName: string
  sourceUrl: string
  note?: string
}
