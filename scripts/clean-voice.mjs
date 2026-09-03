#!/usr/bin/env node
/**
 * 把数据库里已经写进去的「本站自述」句子删掉。
 *
 * 提示词和 rewrite.mjs 里的兜底管的是**以后**收进来的稿子。可是库里已经躺着
 * 一批带着「PRISM 将持续关注该案后续」的条目——站长看到的就是那些。
 * 这个脚本把它们原地改掉。
 *
 * **只删句子，不改写。** 用的是收集流程里同一个 voice.mjs，不叫模型、不花钱、
 * 结果可预期：同样的输入永远得到同样的输出，跑两遍和跑一遍一样。
 *
 * 先看不动手：
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/clean-voice.mjs
 * 真的写回去：
 *   ... node scripts/clean-voice.mjs --write
 */
import { stripSelfVoice, cleanLine, isSelfVoice } from './voice.mjs'

const URL_ = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '')
const KEY = process.env.SUPABASE_SERVICE_KEY ?? ''
if (!URL_ || !KEY) { console.error('缺 SUPABASE_URL 或 SUPABASE_SERVICE_KEY'); process.exit(2) }
const WRITE = process.argv.includes('--write')

const db = (path, init = {}) => fetch(`${URL_}/rest/v1/${path}`, {
  ...init,
  headers: {
    apikey: KEY, authorization: `Bearer ${KEY}`,
    'content-type': 'application/json', ...(init.headers ?? {}),
  },
})

const news = await db('news?select=id,headline,subhead,summary,bullets').then((r) => r.json())
if (!Array.isArray(news)) { console.error('读不到 news：', news); process.exit(1) }

let touched = 0
for (const n of news) {
  const patch = {}
  const summary = stripSelfVoice(n.summary ?? '')
  if (summary !== (n.summary ?? '')) patch.summary = summary

  const subhead = cleanLine(n.subhead ?? '') || null
  if (subhead !== (n.subhead ?? null)) patch.subhead = subhead

  const bullets = (Array.isArray(n.bullets) ? n.bullets : []).map(cleanLine).filter(Boolean)
  if (bullets.length !== (n.bullets?.length ?? 0)) patch.bullets = bullets

  // 标题里出现自述极少见，而标题不能删空——只报出来让站长自己看。
  if (isSelfVoice(n.headline ?? '')) console.log(`  ⚠ 标题里有自述，需要人工改：${n.id}「${n.headline}」`)

  if (Object.keys(patch).length === 0) continue
  touched++
  const cut = (n.summary ?? '').length - (patch.summary ?? n.summary ?? '').length
  console.log(`  ${n.id}：${Object.keys(patch).join('、')}${cut ? `（正文少了 ${cut} 字）` : ''}`)
  if (WRITE) {
    const res = await db(`news?id=eq.${encodeURIComponent(n.id)}`, {
      method: 'PATCH',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    })
    if (!res.ok) { console.error(`  写回失败 HTTP ${res.status}`); process.exit(1) }
  }
}

console.log(WRITE
  ? `改了 ${touched} 条（共 ${news.length} 条）。`
  : `有 ${touched} 条要改（共 ${news.length} 条）。加 --write 才会真的写回去。`)
