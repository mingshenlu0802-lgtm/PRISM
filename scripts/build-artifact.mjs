#!/usr/bin/env node
/**
 * Package the built site as one artifact page.
 *
 * The artifact host supplies <!doctype>, <html>, <head> and <body>, so this
 * writes only what goes *inside* the body: the title, the font link, the whole
 * stylesheet, the mount point, and the bundle as an inline module script.
 *
 * Inlining the bundle as text is safe here and verified below: a stray
 * `</script>` inside a string literal would silently truncate the document, so
 * the script refuses to write a file when it finds one.
 *
 *   npm run build && node scripts/build-artifact.mjs
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const DIST = join(process.cwd(), 'dist-single')
const OUT = join(process.cwd(), 'artifact', 'prism.html')

const assets = await readdir(join(DIST, 'assets'))
const cssName = assets.find((f) => f.endsWith('.css'))
const jsName = assets.find((f) => f.endsWith('.js'))
if (!cssName || !jsName) throw new Error('dist/assets 里没找到构建产物')

const css = await readFile(join(DIST, 'assets', cssName), 'utf8')
const js = await readFile(join(DIST, 'assets', jsName), 'utf8')

if (/<\/script/i.test(js)) throw new Error('打包结果里含有 </script，内联会截断文档')
if (/<\/style/i.test(css)) throw new Error('样式表里含有 </style，内联会截断文档')

const html = `<title>PRISM 棱镜</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap">
<style>
${css}
</style>

<div id="root"></div>

<script type="module">
${js}
</script>
`

await writeFile(OUT, html, 'utf8')
console.log(`${OUT} — ${Math.round(html.length / 1024)} KB`)
