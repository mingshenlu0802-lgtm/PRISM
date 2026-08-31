#!/usr/bin/env node
/**
 * Bundle the built site into ONE self-contained .html file.
 *
 * A normal Vite build cannot be opened with file:// — the browser refuses to
 * load a module script from disk. The JS is therefore embedded as a base64
 * `data:` URL, which is one of the schemes module scripts are allowed to come
 * from, and which sidesteps the escaping hazards of inlining a bundle as text
 * (a stray `</script>` or backslash inside a string will silently truncate the
 * document). CSS has no such hazard and is inlined directly.
 *
 *   npm run build && node scripts/build-single-file.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const DIST = join(process.cwd(), 'dist')
const OUT = join(process.cwd(), 'PRISM-prototype.html')

let html = await readFile(join(DIST, 'index.html'), 'utf8')

const cssTag = html.match(/<link[^>]*href="\.?\/?(assets\/[^"]+\.css)"[^>]*>/)
if (!cssTag) throw new Error('未找到构建产物中的 CSS 链接')
html = html.replace(cssTag[0], `<style>\n${await readFile(join(DIST, cssTag[1]), 'utf8')}\n</style>`)

const jsTag = html.match(/<script[^>]*src="\.?\/?(assets\/[^"]+\.js)"[^>]*><\/script>/)
if (!jsTag) throw new Error('未找到构建产物中的 JS 链接')
const js = await readFile(join(DIST, jsTag[1]))
html = html.replace(
  jsTag[0],
  `<script type="module" src="data:text/javascript;base64,${js.toString('base64')}"></script>`,
)

await writeFile(OUT, html, 'utf8')
console.log(`PRISM-prototype.html — ${Math.round(Buffer.byteLength(html) / 1024)} KB · 双击即可在浏览器中打开`)
