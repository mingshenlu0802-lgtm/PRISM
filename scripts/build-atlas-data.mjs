#!/usr/bin/env node
/**
 * 把 data/atlas/*.csv 编译成 src/lib/atlas/data.ts。
 *
 * 数据用 CSV 存，不写在 TS 里，理由有三个：
 *   一、加数据的人不该需要会写 TypeScript。站长自己能开表格改一行。
 *   二、CSV 能直接从 WHO / UNODC 的下载文件转过来（见 atlas-fetch.mjs）。
 *   三、**校验有个地方可以卡**。这个脚本是一道闸：不合规的行进不去，
 *      构建直接失败，而不是让一个没有出处的数字悄悄出现在地图上。
 *
 * 卡哪些（都是站长规格里写死的规矩）：
 *   - 没有 sourceUrl / method / limits 的，不要。
 *   - 只有 count 没有 denominator，而且标了 derived 的，不要——
 *     换算出来的人数必须能把公式摊开给读者看。
 *   - 便利样本（scope=convenience）带 count 的，不要：
 *     大学样本推不出全国人数，这是规格里明写的红线。
 *   - 指标名不在目录里的，不要。
 *   - 可信度写了 national，但 scope 不是 national 的，不要——自相矛盾。
 *
 * 跑法：node scripts/build-atlas-data.mjs
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'data/atlas'
const CONF = new Set(['national', 'limited', 'modelled'])
const SCOPE = new Set(['national', 'subnational', 'convenience'])

/** 指标目录从 TS 里读出来——两处不能各写一份。 */
const indicatorSrc = readFileSync('src/lib/atlas/indicators.ts', 'utf8')
const KNOWN = new Set([...indicatorSrc.matchAll(/\{ key: '([a-z0-9-]+)', group:/g)].map((m) => m[1]))
if (KNOWN.size === 0) { console.error('指标目录读不出来，build-atlas-data 和 indicators.ts 对不上了'); process.exit(2) }

/** 一个够用的 CSV 解析：认引号、认引号里的逗号和换行。 */
function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (ch !== '\r') cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim()))
}

const num = (v) => { const n = Number(String(v ?? '').trim()); return String(v ?? '').trim() === '' || Number.isNaN(n) ? undefined : n }
const str = (v) => String(v ?? '').trim() || undefined

const points = []
const funnel = []
const laws = []
const problems = []

if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true })
const files = readdirSync(DIR).filter((f) => f.endsWith('.csv')).sort()

for (const f of files) {
  const rows = parseCsv(readFileSync(join(DIR, f), 'utf8'))
  if (rows.length < 2) continue
  const head = rows[0].map((h) => h.trim())
  const at = (r, name) => r[head.indexOf(name)]
  const kind = head.includes('stage') ? 'funnel' : head.includes('maritalRape') ? 'law' : 'point'

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const where = `${f}:${i + 1}`

    if (kind === 'funnel') {
      const p = {
        country: str(at(r, 'country')), stage: str(at(r, 'stage')),
        count: num(at(r, 'count')), year: num(at(r, 'year')),
        sourceName: str(at(r, 'sourceName')), sourceUrl: str(at(r, 'sourceUrl')),
        note: str(at(r, 'note')),
      }
      if (!p.country || !p.stage || p.count === undefined || !p.sourceUrl) { problems.push(`${where}：漏斗行缺 country/stage/count/sourceUrl`); continue }
      funnel.push(p)
      continue
    }

    if (kind === 'law') {
      const p = {
        country: str(at(r, 'country')),
        maritalRape: str(at(r, 'maritalRape')) ?? 'unknown',
        consentBased: str(at(r, 'consentBased')) ?? 'unknown',
        requiresForceEvidence: str(at(r, 'requiresForceEvidence')) ?? 'unknown',
        year: num(at(r, 'year')), sourceName: str(at(r, 'sourceName')),
        sourceUrl: str(at(r, 'sourceUrl')), note: str(at(r, 'note')),
      }
      if (!p.country || !p.sourceUrl) { problems.push(`${where}：法律行缺 country/sourceUrl`); continue }
      laws.push(p)
      continue
    }

    const p = {
      country: str(at(r, 'country')),
      indicator: str(at(r, 'indicator')),
      percent: num(at(r, 'percent')),
      count: num(at(r, 'count')),
      per100k: num(at(r, 'per100k')),
      ageRange: str(at(r, 'ageRange')),
      definition: str(at(r, 'definition')),
      surveyYear: num(at(r, 'surveyYear')),
      published: str(at(r, 'published')),
      sampleSize: num(at(r, 'sampleSize')),
      method: str(at(r, 'method')),
      scope: str(at(r, 'scope')),
      confidence: str(at(r, 'confidence')),
      limits: str(at(r, 'limits')),
      sourceName: str(at(r, 'sourceName')),
      sourceUrl: str(at(r, 'sourceUrl')),
      derived: /^(1|true|yes|是)$/i.test(String(at(r, 'derived') ?? '')),
    }
    const lo = num(at(r, 'ciLow'))
    const hi = num(at(r, 'ciHigh'))
    if (lo !== undefined && hi !== undefined) p.ci = [lo, hi]

    const dv = num(at(r, 'denomValue'))
    if (dv !== undefined) {
      p.denominator = {
        value: dv, source: str(at(r, 'denomSource')) ?? '未注明',
        year: num(at(r, 'denomYear')) ?? p.surveyYear ?? 0,
        who: str(at(r, 'denomWho')) ?? '未注明',
      }
    }

    /* ------------------------------ 闸 ------------------------------ */
    if (!p.country || !p.indicator) { problems.push(`${where}：缺 country 或 indicator`); continue }
    if (!KNOWN.has(p.indicator)) { problems.push(`${where}：指标「${p.indicator}」不在目录里`); continue }
    if (!p.sourceUrl || !p.sourceName) { problems.push(`${where}：没有出处的数字不要`); continue }
    if (!p.method) { problems.push(`${where}：没写调查方法`); continue }
    if (!p.limits) { problems.push(`${where}：没写这份数据说不了什么`); continue }
    if (!p.published) { problems.push(`${where}：没写发布日期`); continue }
    if (!SCOPE.has(p.scope)) { problems.push(`${where}：scope 要是 national / subnational / convenience`); continue }
    if (!CONF.has(p.confidence)) { problems.push(`${where}：confidence 要是 national / limited / modelled`); continue }
    if (p.percent === undefined && p.count === undefined && p.per100k === undefined) {
      problems.push(`${where}：三个数值一个都没有`); continue
    }
    if (p.confidence === 'national' && p.scope !== 'national') {
      problems.push(`${where}：可信度写 national，但样本是 ${p.scope}——自相矛盾`); continue
    }
    if (p.derived && !p.denominator) {
      problems.push(`${where}：标了 derived 却没有人口分母。换算出来的人数必须能把公式摊给读者看`); continue
    }
    if (p.scope === 'convenience' && p.count !== undefined) {
      problems.push(`${where}：便利样本不能给全国人数——只能按样本报告`); continue
    }
    points.push(p)
  }
}

if (problems.length) {
  console.error(`data/atlas 里有 ${problems.length} 行不合规，已全部拒绝：`)
  for (const x of problems.slice(0, 40)) console.error('  ' + x)
  process.exit(1)
}

const clean = (o) => JSON.parse(JSON.stringify(o))
mkdirSync('src/lib/atlas', { recursive: true })
writeFileSync('src/lib/atlas/data.ts', `/* eslint-disable */
/**
 * 由 scripts/build-atlas-data.mjs 从 data/atlas/*.csv 生成，不要手改。
 * 加数据请改 CSV，然后重跑：node scripts/build-atlas-data.mjs
 *
 * 这个文件里每一个数字都过了那道闸：有出处、有方法、有边界、有发布日期。
 */
import type { DataPoint, FunnelPoint, LawStatus } from './types'

export const POINTS: DataPoint[] = ${JSON.stringify(clean(points), null, 0)}

export const FUNNEL: FunnelPoint[] = ${JSON.stringify(clean(funnel), null, 0)}

export const LAWS: LawStatus[] = ${JSON.stringify(clean(laws), null, 0)}
`)
console.log(`写好 src/lib/atlas/data.ts：${points.length} 个数据点、${funnel.length} 条漏斗、${laws.length} 条法律状态`)
if (points.length === 0) {
  console.log('  （现在还是空的。data/atlas/ 里放 CSV，或者跑 atlas-fetch 去抓。）')
}
