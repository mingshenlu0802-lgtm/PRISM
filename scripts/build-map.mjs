#!/usr/bin/env node
/**
 * 生成世界地图。
 *
 * 站长：「我对地图也不满意，那不是世界地图。」他说得对——上一版是一张
 * 格子表，摆得像地图而已。这一版用真的地理数据。
 *
 * 为什么在**构建时**生成，而不是运行时：
 *   - 读者不该为了看一眼地图下载 100KB 的 TopoJSON 再在浏览器里投影一次。
 *   - 生成出来的是十几条 SVG 路径，一共几十 KB，直接编进包里，运行时零依赖。
 *   - 投影参数写死在这里，任何人都能重跑一次看看结果变没变。
 *
 * 跑法：node scripts/build-map.mjs
 * 产物：src/lib/worldmap.ts（提交进仓库——它是源码的一部分，不是缓存）
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { feature, merge } from 'topojson-client'
import { geoNaturalEarth1, geoPath } from 'd3-geo'

const topo = JSON.parse(readFileSync('node_modules/world-atlas/countries-110m.json', 'utf8'))

/**
 * 国家 → 本站的地区。
 *
 * 这是编辑判断，不是地理事实，所以摊开写在这里让人可以吵。几条说明：
 *   - 乌克兰、摩尔多瓦归欧洲；白俄罗斯、外高加索、中亚归「俄罗斯与中亚」。
 *   - 蒙古没有单独的地区，就近并进「俄罗斯与中亚」。
 *   - 土耳其归「中东与北非」——本站关心的性别议题上，它和中东一起读更有意义。
 *   - **加拿大、格陵兰没有对应地区，就让它们留白**，不硬塞进「美国」。
 *     地图上一块灰色是诚实的：这个站现在确实不覆盖那里。
 */
const REGION_OF = {
  cn: ['China'],
  tw: ['Taiwan'],
  jpkr: ['Japan', 'South Korea', 'North Korea'],
  us: ['United States of America'],
  eu: ['Albania', 'Austria', 'Belgium', 'Bosnia and Herz.', 'Bulgaria', 'Croatia', 'Cyprus',
    'Czechia', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
    'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Lithuania', 'Luxembourg', 'Macedonia',
    'Moldova', 'Montenegro', 'N. Cyprus', 'Netherlands', 'Norway', 'Poland', 'Portugal',
    'Romania', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Ukraine',
    'United Kingdom'],
  ru: ['Russia', 'Belarus', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan',
    'Uzbekistan', 'Armenia', 'Azerbaijan', 'Georgia', 'Mongolia'],
  mena: ['Algeria', 'Egypt', 'Iran', 'Iraq', 'Israel', 'Jordan', 'Kuwait', 'Lebanon', 'Libya',
    'Morocco', 'Oman', 'Palestine', 'Qatar', 'Saudi Arabia', 'Syria', 'Tunisia', 'Turkey',
    'United Arab Emirates', 'W. Sahara', 'Yemen'],
  sasia: ['Afghanistan', 'Bangladesh', 'Bhutan', 'India', 'Nepal', 'Pakistan', 'Sri Lanka'],
  sea: ['Brunei', 'Cambodia', 'Indonesia', 'Laos', 'Malaysia', 'Myanmar', 'Philippines',
    'Thailand', 'Timor-Leste', 'Vietnam'],
  anz: ['Australia', 'New Zealand', 'Papua New Guinea', 'Fiji', 'Solomon Is.', 'Vanuatu',
    'New Caledonia'],
  africa: ['Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon',
    'Central African Rep.', 'Chad', 'Congo', 'Dem. Rep. Congo', 'Djibouti', 'Eq. Guinea',
    'Eritrea', 'eSwatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau',
    'Kenya', 'Lesotho', 'Liberia', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mozambique',
    'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'S. Sudan', 'Senegal', 'Sierra Leone', 'Somalia',
    'Somaliland', 'South Africa', 'Sudan', 'Tanzania', 'Togo', 'Uganda', 'Zambia', 'Zimbabwe',
    "Côte d'Ivoire"],
  latam: ['Argentina', 'Bahamas', 'Belize', 'Bolivia', 'Brazil', 'Chile', 'Colombia',
    'Costa Rica', 'Cuba', 'Dominican Rep.', 'Ecuador', 'El Salvador', 'Falkland Is.',
    'Guatemala', 'Guyana', 'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama',
    'Paraguay', 'Peru', 'Puerto Rico', 'Suriname', 'Trinidad and Tobago', 'Uruguay',
    'Venezuela'],
}

/** 南极洲不画：它占掉底下一整条，而这个站不会有南极的新闻。 */
const SKIP = new Set(['Antarctica', 'Fr. S. Antarctic Lands'])

const geometries = topo.objects.countries.geometries.filter((g) => !SKIP.has(g.properties.name))
const byName = new Map(geometries.map((g) => [g.properties.name, g]))

// 每个名字都要对得上，否则就是数据换了版本而映射表没跟上——
// 那会让某个国家从地图上悄悄消失。
const missing = []
for (const [region, names] of Object.entries(REGION_OF)) {
  for (const n of names) if (!byName.has(n)) missing.push(`${region}: ${n}`)
}
if (missing.length) {
  console.error('这些名字在 world-atlas 里找不到，映射表要改：\n  ' + missing.join('\n  '))
  process.exit(1)
}

const assigned = new Set(Object.values(REGION_OF).flat())
const rest = geometries.filter((g) => !assigned.has(g.properties.name))

/*
 * 投影。
 *
 * geoNaturalEarth1 是给世界地图用的折中投影：不像墨卡托那样把北欧和格陵兰
 * 撑得巨大（那会让读者以为这个站的重心在北极），也不像等积投影那样把
 * 形状扭得认不出来。
 *
 * 先用整个世界去 fitExtent 定参数，再拿同一个投影去画每一块——
 * 不然每块会各自缩放，拼不到一起。
 */
const W = 1000
const H = 480
const world = feature(topo, { type: 'GeometryCollection', geometries })
const projection = geoNaturalEarth1().fitExtent([[4, 4], [W - 4, H - 4]], world)
const path = geoPath(projection)

/** 一个地区所有国家合成一块：内部的国界不画出来。 */
const pathFor = (geoms) => path(merge(topo, geoms))

const out = {}
for (const [region, names] of Object.entries(REGION_OF)) {
  out[region] = pathFor(names.map((n) => byName.get(n)))
}
const other = pathFor(rest)

/*
 * 香港在 110m 的数据里根本没有——它是一座城市，这个精度画不出来。
 * 但站长要地图能点进香港，而香港是这个站最重要的地区之一（法庭線那一批
 * 报道全在这里）。所以单独给它一个坐标点，画成一个小圆。
 */
const HK = projection([114.17, 22.32])

const ts = `/*
 * 世界地图的路径数据。
 *
 * **这个文件是生成的**：node scripts/build-map.mjs
 * 数据来自 world-atlas 的 countries-110m（Natural Earth，公有领域），
 * 用 geoNaturalEarth1 投影到 ${W}×${H} 的画布上，同一个地区的国家已经合并成一块。
 *
 * 提交进仓库是有意的：读者不该为了看一眼地图去下载 100KB 的 TopoJSON，
 * 再在自己的手机上跑一次投影。国家名到地区的对应表在生成脚本里，可以吵。
 */

export const MAP_SIZE = { w: ${W}, h: ${H} }

/** 每个地区一条路径。没有对应地区的陆地在 MAP_REST 里，画成灰的、不可点。 */
export const MAP_PATHS: Record<string, string> = ${JSON.stringify(out, null, 2)}

export const MAP_REST = ${JSON.stringify(other)}

/** 香港：这个精度画不出一座城市，用一个点标出来。 */
export const MAP_HK = { x: ${HK[0].toFixed(1)}, y: ${HK[1].toFixed(1)} }
`

writeFileSync('src/lib/worldmap.ts', ts)
const kb = (s) => `${(s.length / 1024).toFixed(1)} KB`
console.log(`写好 src/lib/worldmap.ts（${kb(ts)}）`)
console.log(`  ${Object.keys(out).length} 个地区，另有 ${rest.length} 个国家没有对应地区（画成灰的）：`)
console.log(`  ${rest.map((g) => g.properties.name).join('、')}`)
