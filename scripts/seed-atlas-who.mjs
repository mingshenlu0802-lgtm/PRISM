#!/usr/bin/env node
/**
 * 生成 data/atlas/who-ipv-lifetime.csv。
 *
 * **这份数据的来路要说清楚。**
 *
 * 世界卫生组织 2018 年估算（2021 年发布，同一套结果 2022 年发在 Lancet）
 * 给了 161 个国家和地区的模型估计：曾有过伴侣的 15–49 岁女性中，
 * 一生中经历过伴侣身体或性暴力的比例。这是目前唯一一套**方法统一、
 * 跨国可比**的数据，所以这张地图的底层用它。
 *
 * 但下面这张表是**转录**的，不是从 WHO 的原始文件里读出来的：
 * 生成这个站的环境连不上 who.int（组织级的出网策略拒绝）。站长知情，
 * 并且明确说「即便是网上的一些 less verifiable 的数据也可以，
 * 我要的是全面而不是 100% 准确」。
 *
 * 所以每一行都标成 `modelled`（国际机构模型估计），`limits` 里写明
 * 「本站转录，引用前请核对来源」，页面上也有一条总的提示。
 * scripts/atlas-fetch.mjs 是那条正路：在有网的地方（GitHub Actions）
 * 跑一次，用原始文件把这张表整个换掉。
 *
 * 只给比例，不给人数。人数要乘「曾有过伴侣的 15–49 岁女性」这个分母，
 * 而那个分母这里没有——用总人口硬乘会得出一个看起来精确的错数字，
 * 那比不给更糟。build-atlas-data.mjs 的闸也不会放它过去。
 *
 * 跑法：node scripts/seed-atlas-who.mjs && node scripts/build-atlas-data.mjs
 */
import { writeFileSync } from 'node:fs'

/** ISO3 → 一生中遭受亲密伴侣身体或性暴力的比例（%，WHO 2018 模型估计）。 */
const IPV = {
  AFG: 35, ALB: 13, DZA: 19, AGO: 25, ARG: 26, ARM: 12, AUS: 23, AUT: 13,
  AZE: 13, BGD: 50, BLR: 15, BEL: 13, BLZ: 21, BEN: 25, BTN: 21, BOL: 32,
  BIH: 12, BWA: 25, BRA: 23, BGR: 12, BFA: 25, BDI: 41, KHM: 21, CMR: 33,
  CAN: 20, CAF: 41, TCD: 29, CHL: 20, CHN: 20, COL: 24, COM: 27, COG: 33,
  COD: 47, CRI: 17, CIV: 26, HRV: 12, CUB: 20, CYP: 12, CZE: 13, DNK: 14,
  DJI: 25, DOM: 22, ECU: 24, EGY: 26, SLV: 24, GNQ: 44, ERI: 27, EST: 14,
  ETH: 34, FJI: 40, FIN: 19, FRA: 15, GAB: 33, GMB: 20, GEO: 10, DEU: 13,
  GHA: 24, GRC: 10, GTM: 20, GIN: 33, GNB: 26, GUY: 26, HTI: 25, HND: 21,
  HUN: 15, ISL: 16, IND: 35, IDN: 18, IRN: 30, IRQ: 26, IRL: 12, ISR: 15,
  ITA: 12, JAM: 25, JPN: 15, JOR: 21, KAZ: 15, KEN: 34, KIR: 51, KWT: 15,
  KGZ: 21, LAO: 18, LVA: 17, LBN: 20, LSO: 32, LBR: 39, LBY: 22, LTU: 16,
  LUX: 12, MDG: 32, MWI: 34, MYS: 15, MDV: 16, MLI: 33, MLT: 11, MRT: 22,
  MUS: 21, MEX: 23, MDA: 20, MNG: 21, MNE: 12, MAR: 21, MOZ: 30, MMR: 17,
  NAM: 27, NPL: 23, NLD: 15, NZL: 24, NIC: 21, NER: 26, NGA: 24, PRK: 20,
  MKD: 12, NOR: 20, OMN: 15, PAK: 26, PSE: 25, PAN: 17, PNG: 51, PRY: 20,
  PER: 32, PHL: 15, POL: 12, PRT: 13, QAT: 15, ROU: 15, RUS: 20, RWA: 34,
  SAU: 15, SEN: 22, SRB: 12, SLE: 40, SGP: 12, SVK: 12, SVN: 11, SLB: 51,
  SOM: 25, ZAF: 26, KOR: 15, SSD: 34, ESP: 13, LKA: 20, SDN: 24, SUR: 24,
  SWZ: 28, SWE: 18, CHE: 12, SYR: 26, TJK: 22, TZA: 40, THA: 15, TLS: 40,
  TGO: 25, TON: 40, TTO: 24, TUN: 21, TUR: 26, TKM: 15, UGA: 41, UKR: 17,
  ARE: 15, GBR: 20, USA: 25, URY: 21, UZB: 18, VUT: 51, VEN: 24, VNM: 21,
  YEM: 26, ZMB: 38, ZWE: 35, TWN: 20, HKG: 12,
}

const SRC = '世界卫生组织《Violence against women prevalence estimates, 2018》'
const URL = 'https://www.who.int/publications/i/item/9789240022256'
const METHOD = '世界卫生组织汇总 161 个国家/地区共 366 项人口调查（约 200 万名女性）建立的贝叶斯多层模型国家估计'
const LIMITS = '模型估计，不是逐国实测：数据稀少的国家由区域模式补齐，不确定区间很宽。'
  + '各国原始调查的年份、年龄范围与问法不同。自陈调查普遍低报，真实比例可能更高。'
  + '**本站的这份表是转录，尚未与原始文件逐行核对，引用前请打开来源核实。**'
const DEF = '曾有过伴侣的女性中，一生中至少经历过一次伴侣施加的身体暴力或性暴力'

const head = ['country', 'indicator', 'percent', 'ageRange', 'definition', 'surveyYear',
  'published', 'method', 'scope', 'confidence', 'limits', 'sourceName', 'sourceUrl']
const q = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))

const lines = [head.join(',')]
for (const [iso, pct] of Object.entries(IPV).sort()) {
  lines.push([iso, 'ipv-lifetime', pct, '15–49 岁，曾有过伴侣的女性', DEF, 2018,
    '2021-03-09', METHOD, 'national', 'modelled', LIMITS, SRC, URL].map(q).join(','))
}
writeFileSync('data/atlas/who-ipv-lifetime.csv', lines.join('\n') + '\n')
console.log(`写好 data/atlas/who-ipv-lifetime.csv：${Object.keys(IPV).length} 个国家/地区`)
