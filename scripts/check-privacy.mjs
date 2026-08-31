#!/usr/bin/env node
/**
 * 发布出去的文件里不能有个人信息。
 *
 * 一个每天更新的公开网站是最好扒的邮箱来源——爬虫不需要任何技巧，下载 JS 就行。
 * 站长的身份在代码里只以 sha256 的形式存在（见 src/lib/owner.ts），地址本身只
 * 留在站长自己的浏览器里。这个检查在构建之后跑一遍产物，确保没人不小心把它加回来。
 *
 *   npm run build && node scripts/check-privacy.mjs
 */
import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const DIST = join(process.cwd(), process.argv[2] ?? 'dist')
if (!existsSync(DIST)) {
  console.error(`${DIST} 不存在，请先构建`)
  process.exit(2)
}

// GitHub 的 noreply 地址是故意用来公开的，不算泄露。
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const ALLOWED = /(^|@)users\.noreply\.github\.com$|^[a-z0-9.-]+@(schema|example)\./i

async function* files(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* files(p)
    else if (/\.(js|css|html|json|map)$/.test(e.name)) yield p
  }
}

const found = []
for await (const p of files(DIST)) {
  const text = await readFile(p, 'utf8')
  for (const hit of text.match(EMAIL) ?? []) {
    if (!ALLOWED.test(hit)) found.push([p.replace(`${process.cwd()}/`, ''), hit])
  }
}

console.log('PRISM 隐私检查')
console.log('—'.repeat(64))
if (found.length === 0) {
  console.log('  发布产物里没有邮箱地址。')
  console.log('—'.repeat(64))
  console.log('通过')
  process.exit(0)
}
for (const [file, hit] of found) console.log(`  错误  ${file} 里出现了 ${hit}`)
console.log('—'.repeat(64))
console.log(`${found.length} 处泄露。站长身份应当只以 sha256 的形式出现，见 src/lib/owner.ts。`)
process.exit(1)
