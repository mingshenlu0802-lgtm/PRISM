import { build } from 'esbuild'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ids = process.argv.slice(2)
const out = mkdtempSync(join(tmpdir(), 'prism-count-'))
const bundle = join(out, 'demo.mjs')
await build({ entryPoints: ['src/lib/demo/index.ts'], bundle: true, format: 'esm', platform: 'node', target: 'node20', outfile: bundle, logLevel: 'silent' })
const { buildInitialState } = await import(pathToFileURL(bundle).href)
const s = buildInitialState()
function blockTexts(b) {
  switch (b.type) {
    case 'paragraph': case 'heading': case 'pullquote': return [b.text]
    case 'callout': return [b.title, b.text]
    case 'list': return b.items
    case 'figure': return [b.caption]
    case 'table': return [...b.columns, ...b.rows.flat(), b.caption ?? '']
    case 'timeline': return b.entries.flatMap((e) => [e.title, e.text])
    case 'divergence': return b.positions.flatMap((p) => [p.label, p.holder, p.position, p.evidence])
    default: return []
  }
}
for (const a of s.articles) {
  if (ids.length && !ids.includes(a.id)) continue
  let text = ''
  for (const sec of a.sections) { text += sec.title; for (const b of sec.blocks) text += blockTexts(b).join('') }
  const stripped = text.replace(/\[\[c:[^\]]+\]\]/g, '')
  const han = (stripped.match(/[一-鿿]/g) || []).length
  const inline = (text.match(/\[\[c:[^\]]+\]\]/g) || []).length
  const perSection = a.sections.map(sec => {
    let t = sec.title; for (const b of sec.blocks) t += blockTexts(b).join('')
    return sec.kind + ':' + ((t.replace(/\[\[c:[^\]]+\]\]/g,'').match(/[一-鿿]/g)||[]).length)
  }).join(' ')
  console.log(`${a.id}  status=${a.status}  汉字=${han}  citations=${a.citations.length}  inlineMarkers=${inline}  checks=${a.citationChecks.length}  factChecks=${a.factCheckIds.length}`)
  console.log('   ', perSection)
}
rmSync(out, { recursive: true, force: true })
