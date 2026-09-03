#!/usr/bin/env node
/**
 * 生成「各国数据」用的地图：每个国家一条路径，按洲分组。
 *
 * 和 build-map.mjs 不一样的地方在粒度。那一张是**十一个地区**各一块，
 * 内部国界不画——它回答的是「今天哪一片有新闻」。这一张要能点到单个国家，
 * 所以每个国家自己一条路径，还要一个质心给气泡用。
 *
 * 同样在构建时做完：读者不该为了看一眼地图下载 100KB TopoJSON、
 * 再在浏览器里投影一次。产物按洲切开，点进哪个洲才加载哪个洲。
 *
 * 国家的身份用 ISO 3166-1 alpha-3。world-atlas 里只有 numeric 码和英文名，
 * 中文名和洲别来自 i18n-iso-countries / countries-list——这两样是查得到的
 * 事实，不是需要斟酌的统计口径，所以放心用现成的表。
 *
 * 跑法：node scripts/build-atlas-map.mjs
 * 产物：src/lib/atlas/geo.ts（提交进仓库，它是源码的一部分）
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import { geoNaturalEarth1, geoMercator, geoPath, geoCentroid } from 'd3-geo'
import isoCountries from 'i18n-iso-countries'
import { countries as countryList } from 'countries-list'

isoCountries.registerLocale(JSON.parse(readFileSync('node_modules/i18n-iso-countries/langs/zh.json', 'utf8')))

const topo = JSON.parse(readFileSync('node_modules/world-atlas/countries-110m.json', 'utf8'))

/** countries-list 的洲代码 → 本站的洲。 */
const CONTINENT = {
  AS: 'asia', EU: 'europe', AF: 'africa',
  NA: 'namerica', SA: 'samerica', OC: 'oceania', AN: 'antarctica',
}

/*
 * 几个 world-atlas 里有、而两张表对不上的。
 *
 * 都是主权有争议或者归属特殊的地方。这里只解决「画在哪张洲图上、
 * 叫什么名字」，不表态——地图上一块地必须有个地方待着，否则它会从
 * 所有洲图上消失，那才是真的表了态。
 */
const PATCH = {
  '158': { iso: 'TWN', zh: '台湾', continent: 'asia' },
  '304': { iso: 'GRL', zh: '格陵兰', continent: 'europe' },   // 丹麦王国的一部分
  '732': { iso: 'ESH', zh: '西撒哈拉', continent: 'africa' },
  '-99': null,
}
/** world-atlas 里没有 id 的那几块（北塞浦路斯、索马里兰、科索沃）。 */
const BY_NAME = {
  'N. Cyprus': { iso: 'CYP-N', zh: '北塞浦路斯', continent: 'asia' },
  Somaliland: { iso: 'SOL', zh: '索马里兰', continent: 'africa' },
  Kosovo: { iso: 'XKX', zh: '科索沃', continent: 'europe' },
}

const SKIP = new Set(['Antarctica', 'Fr. S. Antarctic Lands'])

const geometries = topo.objects.countries.geometries.filter((g) => !SKIP.has(g.properties.name))

const identify = (g) => {
  const patched = PATCH[String(g.id)]
  if (patched) return patched
  const byName = BY_NAME[g.properties.name]
  if (byName) return byName
  const iso = g.id ? isoCountries.numericToAlpha3(String(g.id)) : undefined
  if (!iso) return null
  const alpha2 = isoCountries.alpha3ToAlpha2(iso)
  const meta = alpha2 ? countryList[alpha2] : undefined
  const continent = meta ? CONTINENT[meta.continent] : undefined
  if (!continent) return null
  return { iso, zh: isoCountries.getName(iso, 'zh') || g.properties.name, continent }
}

const unknown = []
const rows = []
for (const g of geometries) {
  const id = identify(g)
  if (!id) { unknown.push(`${g.properties.name}（id=${g.id}）`); continue }
  rows.push({ ...id, en: g.properties.name, geom: g })
}
if (unknown.length) {
  console.error('这些地方认不出 ISO 码或洲别，映射表要补：\n  ' + unknown.join('\n  '))
  process.exit(1)
}

/*
 * 两套投影。
 *
 * 全球图用 geoNaturalEarth1，理由和另一张地图一样：不把北欧和格陵兰撑大。
 * 洲图用 geoMercator 各自 fitExtent——一个洲占满画布，形状比面积重要，
 * 而在一个洲的尺度上墨卡托的变形还看得过去。
 */
const W = 1000
const H = 480
const out = { world: {}, continents: {} }

const worldGeo = feature(topo, { type: 'GeometryCollection', geometries: rows.map((r) => r.geom) })
const worldProj = geoNaturalEarth1().fitExtent([[4, 4], [W - 4, H - 4]], worldGeo)
const worldPath = geoPath(worldProj)

for (const r of rows) {
  const f = feature(topo, r.geom)
  const d = worldPath(f)
  const [cx, cy] = worldProj(geoCentroid(f)) ?? [0, 0]
  out.world[r.iso] = { d, c: [round(cx), round(cy)] }
}

const byContinent = new Map()
for (const r of rows) {
  if (!byContinent.has(r.continent)) byContinent.set(r.continent, [])
  byContinent.get(r.continent).push(r)
}

for (const [key, list] of byContinent) {
  const geo = feature(topo, { type: 'GeometryCollection', geometries: list.map((r) => r.geom) })
  const proj = geoMercator().fitExtent([[8, 8], [W - 8, H - 8]], geo)
  const path = geoPath(proj)
  const shapes = {}
  for (const r of list) {
    const f = feature(topo, r.geom)
    const [cx, cy] = proj(geoCentroid(f)) ?? [0, 0]
    shapes[r.iso] = { d: path(f), c: [round(cx), round(cy)] }
  }
  out.continents[key] = shapes
}

function round(n) { return Math.round(n * 10) / 10 }

const meta = {}
for (const r of rows) meta[r.iso] = { zh: r.zh, en: r.en, continent: r.continent }

mkdirSync('src/lib/atlas', { recursive: true })
const file = `/* eslint-disable */
/**
 * 由 scripts/build-atlas-map.mjs 生成，不要手改。
 * 改了国家归属或投影参数之后重跑：node scripts/build-atlas-map.mjs
 */
import type { ContinentKey } from './indicators'

export interface Shape { d: string; c: [number, number] }

export const ATLAS_SIZE = { w: ${W}, h: ${H} }

/** ISO3 → 中文名、英文名、洲。 */
export const COUNTRY: Record<string, { zh: string; en: string; continent: ContinentKey }> =
  ${JSON.stringify(meta)}

/** 全球图上每个国家的路径与质心。 */
export const WORLD: Record<string, Shape> = ${JSON.stringify(out.world)}

/** 每个洲自己一张图，各自投影。 */
export const CONTINENT_SHAPES: Record<string, Record<string, Shape>> = ${JSON.stringify(out.continents)}
`
writeFileSync('src/lib/atlas/geo.ts', file)
const kb = (file.length / 1024).toFixed(1)
console.log(`写好 src/lib/atlas/geo.ts（${kb} KB）`)
console.log(`  ${rows.length} 个国家/地区，按洲分：`)
for (const [k, v] of byContinent) console.log(`    ${k}：${v.length}`)
