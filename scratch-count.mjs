import { build } from 'esbuild'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const files = process.argv.slice(2)
for (const f of files) {
  const out = mkdtempSync(join(tmpdir(), 'prism-count-'))
  const bundle = join(out, 'a.mjs')
  await build({ entryPoints: [f], bundle: true, format: 'esm', platform: 'node', target: 'node20', outfile: bundle, logLevel: 'silent' })
  const m = await import(pathToFileURL(bundle).href)
  const a = m.article
  const texts = []
  const push = (t) => { if (t) texts.push(String(t)) }
  for (const sec of a.sections) {
    push(sec.title)
    for (const b of sec.blocks) {
      switch (b.type) {
        case 'paragraph': case 'heading': case 'pullquote': push(b.text); break
        case 'callout': push(b.title); push(b.text); break
        case 'list': b.items.forEach(push); break
        case 'figure': push(b.caption); break
        case 'table': b.columns.forEach(push); b.rows.flat().forEach(push); push(b.caption); break
        case 'timeline': b.entries.forEach((e) => { push(e.title); push(e.text) }); break
        case 'divergence': b.positions.forEach((p) => { push(p.label); push(p.holder); push(p.position); push(p.evidence) }); break
      }
    }
  }
  const joined = texts.join('').replace(/\[\[c:[^\]]+\]\]/g, '')
  const han = (joined.match(/[一-鿿]/g) || []).length
  const inline = JSON.stringify(a.sections).match(/\[\[c:[a-zA-Z0-9_-]+\]\]/g) || []
  const uniqueInline = new Set(inline.map((x) => x.slice(4, -2)))
  const citIds = new Set(a.citations.map((c) => c.id))
  const unused = [...citIds].filter((c) => !uniqueInline.has(c))
  const checks = a.citationChecks.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc }, {})
  console.log(`${a.id}  汉字=${han}  citations=${a.citations.length}  inlineMarkers=${inline.length}  uniqueCited=${uniqueInline.size}  checks=${JSON.stringify(checks)}  sections=${a.sections.length}`)
  if (unused.length) console.log(`   citations never used inline: ${unused.join(', ')}`)
  rmSync(out, { recursive: true, force: true })
}
