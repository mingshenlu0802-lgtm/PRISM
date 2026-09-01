#!/usr/bin/env node
/**
 * 清空网站内容。
 *
 * 站长要求「网站所有内容清零」——之前那批是按旧标准（关键词粗筛、英文原文摘要）
 * 抓进来的，不符合现在的编辑方针，留着比没有更糟。
 *
 * 只删 news 和 studies。**不碰 members**（那是名单，删了站长会把自己锁在外面），
 * 也不碰 site（站点设置）。changes 一并清掉，因为那些记录指向的条目已经不存在了。
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/purge-news.mjs
 */
const URL_ = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '')
const KEY = process.env.SUPABASE_SERVICE_KEY ?? ''
if (!URL_ || !KEY) { console.error('缺 SUPABASE_URL 或 SUPABASE_SERVICE_KEY'); process.exit(2) }

const db = (path, init = {}) => fetch(`${URL_}/rest/v1/${path}`, {
  ...init,
  headers: {
    apikey: KEY, authorization: `Bearer ${KEY}`,
    'content-type': 'application/json', prefer: 'return=minimal', ...(init.headers ?? {}),
  },
})

for (const table of ['news', 'studies', 'changes']) {
  const before = await db(`${table}?select=id`).then((r) => r.json()).catch(() => [])
  // PostgREST 要求 DELETE 必须带条件，`id=not.is.null` 就是「全部」。
  const res = await db(`${table}?id=not.is.null`, { method: 'DELETE' })
  console.log(res.ok
    ? `  ${table}：删掉 ${Array.isArray(before) ? before.length : '?'} 行`
    : `  ${table}：失败 HTTP ${res.status}`)
  if (!res.ok) process.exit(1)
}
console.log('清空完成。members 和 site 没有动。')
