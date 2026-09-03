#!/usr/bin/env node
/**
 * 去原始来源抓各国数据，写成 data/atlas/*.csv。
 *
 * **为什么需要这个脚本。** 现在 data/atlas/who-ipv-lifetime.csv 是
 * 转录进来的（见 seed-atlas-who.mjs 开头）——生成这个站的环境连不上
 * who.int，那是组织级的出网策略拒绝，不是配置问题。转录的数据能用，
 * 但没法逐行核对，而这个站的规矩是「一个数字要能被读者自己去核」。
 *
 * 所以这条正路：在 GitHub Actions 上跑（那边有网），把原始文件下下来，
 * 生成的 CSV 提交回仓库。之后数据的来路是「下载」，`limits` 里那句
 * 「本站转录，引用前请核对」也可以去掉了。
 *
 *   node scripts/atlas-fetch.mjs          # 只看能不能连上、拿到什么
 *   node scripts/atlas-fetch.mjs --write  # 真的写 CSV
 *
 * 每个来源写成一个 source：能拿到就拿，拿不到就说清楚哪一个没拿到，
 * **不要用旧数据假装成功**。
 */
import { writeFileSync } from 'node:fs'

const WRITE = process.argv.includes('--write')

/** 一个来源：从哪拿、怎么把它变成我们的行。 */
const SOURCES = [
  {
    id: 'who-ipv-lifetime',
    zh: '世界卫生组织 2018 年亲密伴侣暴力国家估计',
    /*
     * WHO 的国家估计发在《Violence against women prevalence estimates, 2018》
     * 附录，也随 2022 年 Lancet 那篇一起公开。这里放的是机读入口；
     * 换版本的时候只改这一处。
     */
    url: 'https://apps.who.int/violence-info/api/data/intimate-partner-violence',
    parse: async (res) => {
      const json = await res.json()
      if (!Array.isArray(json)) throw new Error('返回的不是数组，接口大概换了')
      return json
    },
  },
]

let ok = 0
for (const s of SOURCES) {
  process.stdout.write(`${s.zh}\n  ${s.url}\n  `)
  try {
    const res = await fetch(s.url, { headers: { accept: 'application/json' } })
    if (!res.ok) { console.log(`拿不到：HTTP ${res.status}`); continue }
    const rows = await s.parse(res)
    console.log(`拿到 ${rows.length} 行`)
    if (WRITE) {
      writeFileSync(`data/atlas/${s.id}.raw.json`, JSON.stringify(rows, null, 2))
      console.log(`  已存 data/atlas/${s.id}.raw.json——接口的字段名要人看过一眼才能映射，`)
      console.log('  看过之后把映射写进这个脚本的 parse 里，再跑一次。')
    }
    ok++
  } catch (e) {
    console.log(`拿不到：${e instanceof Error ? e.message : String(e)}`)
  }
}

console.log(`\n${ok} / ${SOURCES.length} 个来源拿到了。`)
if (ok === 0) {
  console.log('一个都没拿到。这台机器也连不上，或者接口地址变了——')
  console.log('不要用旧数据假装成功，先把地址查对。')
  process.exit(1)
}
