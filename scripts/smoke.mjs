#!/usr/bin/env node
/**
 * PRISM 行为冒烟测试
 *
 * Exercises the parts of the prototype where a bug would be an editorial
 * failure rather than a cosmetic one: the publishing gate, the global lock,
 * the version model (a revision must never overwrite its predecessor) and the
 * Further-Vibe-Coding engine (it must never invent a source).
 *
 *   node scripts/smoke.mjs
 */
import { build } from 'esbuild'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Built inside the project so `react` still resolves from node_modules.
const out = join(process.cwd(), 'node_modules', '.cache', 'prism-smoke')
mkdirSync(out, { recursive: true })
const entry = join(out, 'entry.ts')
const bundle = join(out, 'bundle.mjs')

// One entry re-exporting everything the test needs, so esbuild bundles once.
const { writeFileSync } = await import('node:fs')
writeFileSync(entry, `
export { buildInitialState } from '${process.cwd()}/src/lib/demo/index.ts'
export { reducer } from '${process.cwd()}/src/lib/store.tsx'
export * as sel from '${process.cwd()}/src/lib/selectors.ts'
export { applyVibeInstruction, planSteps, VIBE_PRESETS } from '${process.cwd()}/src/lib/vibe.ts'
export { diffArticles, diffRefs, diffWords, summarizeDiff } from '${process.cwd()}/src/lib/diff.ts'
export { citationNumbers, articleWordCount } from '${process.cwd()}/src/lib/util.ts'
`)

await build({
  entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', target: 'node20',
  outfile: bundle, jsx: 'automatic', external: ['react', 'react-dom', 'react/jsx-runtime'], logLevel: 'silent',
})

const m = await import(pathToFileURL(bundle).href)
const { buildInitialState, reducer, sel, applyVibeInstruction, planSteps, VIBE_PRESETS,
        diffArticles, diffRefs, articleWordCount } = m

let failures = 0
const results = []
function check(name, fn) {
  try {
    const note = fn()
    results.push(['pass', name, note ?? ''])
  } catch (e) {
    failures += 1
    results.push(['FAIL', name, e.message])
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg) }

const S0 = buildInitialState()
const NOW = '2026-08-31T07:00:00Z'

/* -------------------------- the publishing gate -------------------------- */

check('每篇文章都能算出发布闸门', () => {
  const lines = S0.articles.map((a) => {
    const g = sel.publishGate(a, S0)
    return `${a.id}:${g.ok ? 'ok' : `${g.blockers.length}阻断`}/${g.warnings.length}警告/${g.confirmations.length}二次确认`
  })
  return lines.join('  ')
})

check('性暴力与未成年人内容强制二次确认', () => {
  const maran = S0.articles.find((a) => a.id === 'art-maran')
  assert(maran, 'art-maran 不存在')
  const g = sel.publishGate(maran, S0)
  assert(g.confirmations.length >= 2, `期望至少 2 项二次确认，实际 ${g.confirmations.length}`)
  const kinds = g.confirmations.map((r) => r.kind)
  for (const k of ['sexual-violence', 'minors', 'active-litigation', 'identity-exposure']) {
    assert(kinds.includes(k), `缺少 ${k} 的二次确认`)
  }
  // Handling a risk is why the editor can confirm — not a reason to skip it.
  assert(g.confirmations.some((r) => r.resolved), '已处置的敏感风险被排除在二次确认之外')
  return `${g.confirmations.length} 项：${kinds.join('/')}`
})

check('资源未找到的引用会阻断发布', () => {
  const blocking = S0.articles.filter((a) => sel.blockingChecks(a).length > 0)
  const handled = S0.articles.filter(
    (a) => sel.failedChecks(a).length > 0 && sel.blockingChecks(a).length === 0)
  assert(blocking.length > 0, '演示数据中没有未处理的「资源未找到」条目')
  assert(handled.length > 0, '演示数据中没有已记录处理说明的条目')
  for (const a of blocking) {
    const g = sel.publishGate(a, S0)
    assert(!g.ok, `${a.id} 有未处理的「资源未找到」却未被阻断`)
  }
  for (const a of handled) {
    const g = sel.publishGate(a, S0)
    assert(!g.blockers.some((b) => b.includes('资源未找到')),
      `${a.id} 的失败已记录处理说明，却仍被当作阻断项`)
  }
  return `${blocking.length} 篇被阻断 · ${handled.length} 篇已处理不再阻断`
})

/* ----------------------------- the global lock --------------------------- */

check('全局发布锁阻止公开发布', () => {
  const target = S0.articles.find((a) => a.status === 'in-review') ?? S0.articles[0]
  const locked = reducer(S0, { type: 'lock', engaged: true, reason: '冒烟测试' })
  assert(locked.lock.engaged, '锁未开启')
  const after = reducer(locked, { type: 'publish', articleId: target.id })
  const a2 = after.articles.find((a) => a.id === target.id)
  assert(a2.status !== 'published', '上锁状态下仍然发布了')
  return `${target.id} 保持 ${a2.status}`
})

check('上锁时「批准并立即发布」只记录批准', () => {
  const target = S0.articles.find((a) => a.status === 'in-review') ?? S0.articles[0]
  const locked = reducer(S0, { type: 'lock', engaged: true, reason: '冒烟测试' })
  const after = reducer(locked, { type: 'decide', articleId: target.id, decision: 'approve-publish' })
  const a2 = after.articles.find((a) => a.id === target.id)
  assert(a2.status === 'approved', `期望 approved，实际 ${a2.status}`)
  assert(after.audit[0].detail.includes('Global Publishing Lock'), '审计记录未说明被锁拦截')
  return '记录为 approved，未公开'
})

check('解锁后可以正常发布', () => {
  const target = S0.articles.find((a) => a.status === 'in-review') ?? S0.articles[0]
  let s = reducer(S0, { type: 'lock', engaged: true, reason: 'x' })
  s = reducer(s, { type: 'lock', engaged: false })
  s = reducer(s, { type: 'publish', articleId: target.id })
  const a2 = s.articles.find((a) => a.id === target.id)
  assert(a2.status === 'published' && a2.publishedAt, '解锁后仍无法发布')
  return 'ok'
})

/* -------------------------------- versions ------------------------------- */

check('每篇文章都有可比较的版本历史', () => {
  const rows = []
  for (const a of S0.articles) {
    const vs = sel.versionsOf(S0, a.id)
    assert(vs.length >= 2, `${a.id} 只有 ${vs.length} 个版本`)
    assert(vs.some((v) => v.id === a.currentVersionId), `${a.id} 的 currentVersionId 不在版本列表中`)
    const first = vs[vs.length - 1]
    const d = diffArticles(first.snapshot, a)
    assert(d.stats.added + d.stats.removed + d.stats.changed > 0, `${a.id} 的初稿与当前版本没有任何差异`)
    rows.push(`${a.id}:${vs.length}版/+${d.stats.added}-${d.stats.removed}~${d.stats.changed}`)
  }
  return rows.join('  ')
})

check('采用新版本不会销毁历史快照', () => {
  const proposal = S0.versions.find((v) => v.state === 'proposal')
  assert(proposal, '演示数据中没有待确认的版本提案')
  const before = S0.versions.length
  const s = reducer(S0, { type: 'version-adopt', versionId: proposal.id })
  assert(s.versions.length === before, '版本数量发生变化')
  const older = sel.versionsOf(s, proposal.articleId).filter((v) => v.n < proposal.n)
  assert(older.length >= 1 && older.every((v) => v.snapshot), '旧版本快照丢失')
  const a = s.articles.find((x) => x.id === proposal.articleId)
  assert(a.currentVersionId === proposal.id, '当前版本未切换')
  return `${proposal.articleId} → v${proposal.n}，保留 ${older.length} 个旧快照`
})

/* --------------------------- Further Vibe Coding ------------------------- */

const KNOWN_SOURCES = new Set(S0.sources.map((s) => s.id))

check('每条 Vibe 指令都产生可解释的修改，且不凭空创造来源', () => {
  const article = S0.articles.find((a) => a.id === 'art-kalisan') ?? S0.articles[0]
  const rows = []
  for (const preset of VIBE_PRESETS) {
    const steps = planSteps(preset.instruction)
    assert(steps.length >= 3, `${preset.id}: planSteps 只返回 ${steps.length} 步`)
    const outcome = applyVibeInstruction(preset.instruction, article, S0, NOW)
    assert(outcome.snapshot && outcome.snapshot.id === article.id, `${preset.id}: 快照缺失`)
    assert(outcome.summary && outcome.rationale, `${preset.id}: 缺少 summary/rationale`)
    for (const id of outcome.refDelta.added) {
      assert(KNOWN_SOURCES.has(id), `${preset.id}: 引入了不存在的来源 ${id}`)
    }
    // The engine must never silently no-op.
    const changed = outcome.stats.added + outcome.stats.removed + outcome.stats.changed
    assert(changed > 0 || outcome.notes.length > 0,
      `${preset.id}: 既没有修改，也没有说明为什么没有修改`)
    // Citations must stay resolvable.
    const cit = new Set(outcome.snapshot.citations.map((c) => c.id))
    for (const sec of outcome.snapshot.sections) {
      for (const b of sec.blocks) {
        const txt = b.type === 'paragraph' || b.type === 'heading' ? b.text
          : b.type === 'callout' ? `${b.title}${b.text}`
          : b.type === 'list' ? b.items.join('') : ''
        for (const mm of String(txt).matchAll(/\[\[c:([a-zA-Z0-9_-]+)\]\]/g)) {
          assert(cit.has(mm[1]), `${preset.id}: 产生了悬空引用 ${mm[1]}`)
        }
      }
    }
    rows.push(`${preset.id}:+${outcome.stats.added}~${outcome.stats.changed}/refs+${outcome.refDelta.added.length}`)
  }
  return rows.join('  ')
})

check('无法识别的指令必须说明而不是静默不做事', () => {
  const article = S0.articles[0]
  const o = applyVibeInstruction('请把这篇文章翻译成克林贡语并配一段配乐', article, S0, NOW)
  const changed = o.stats.added + o.stats.removed + o.stats.changed
  assert(o.notes.length > 0, '未给出任何说明')
  assert(changed > 0 || o.notes.length > 0, '既未修改也未说明')
  return o.notes[0].slice(0, 60)
})

check('Vibe 修改产生的是提案，原文不被覆盖', () => {
  const article = S0.articles.find((a) => a.sections.length > 0) ?? S0.articles[0]
  const before = JSON.stringify(article)
  applyVibeInstruction('加入韦拉共和国的法律背景。', article, S0, NOW)
  assert(JSON.stringify(article) === before, 'applyVibeInstruction 直接修改了原文对象')
  return '原文对象未被修改'
})

/* ------------------------------ diff sanity ------------------------------ */

check('中文词级差异是最小差异', () => {
  const ops = m.diffWords('法院在判决中认定强制医疗要件违宪。', '法院在判决中明确认定强制医疗要件违宪。')
  const added = ops.filter((o) => o.type === 'add').map((o) => o.text).join('')
  const removed = ops.filter((o) => o.type === 'del').map((o) => o.text).join('')
  assert(added === '明确', `期望新增「明确」，实际「${added}」`)
  assert(removed === '', `不应有删除，实际「${removed}」`)
  return `+${added}`
})

check('references 增删可被单独追踪', () => {
  const a = S0.articles.find((x) => x.sourceIds.length > 2 && x.citations.length > 0)
  assert(a, '没有足够来源的文章')
  // diffRefs unions sourceIds with the sources actually cited, so a source is
  // only "removed" once nothing cites it any more — drop both.
  const gone = a.sourceIds[a.sourceIds.length - 1]
  const stripped = {
    ...a,
    sourceIds: a.sourceIds.filter((id) => id !== gone),
    citations: a.citations.filter((c) => c.sourceId !== gone),
  }
  const d = diffRefs(a, stripped)
  assert(d.removed.length === 1 && d.removed[0] === gone,
    `期望仅删除 ${gone}，实际 [${d.removed.join(', ')}]`)
  return `删除 ${d.removed[0]}`
})

check('已记录处理说明的「资源未找到」不再阻断发布', () => {
  const a = S0.articles.find((x) => sel.blockingChecks(x).length > 0)
  assert(a, '演示数据中没有未处理的「资源未找到」条目')
  const before = sel.publishGate(a, S0)
  assert(before.blockers.some((b) => b.includes('资源未找到')), '资源未找到的引用未阻断发布')
  let s = S0
  for (const c of sel.blockingChecks(a)) {
    s = reducer(s, { type: 'ack-citation', articleId: a.id, citationId: c.citationId, note: '已改为归因表述' })
  }
  const a2 = s.articles.find((x) => x.id === a.id)
  const after = sel.publishGate(a2, s)
  assert(!after.blockers.some((b) => b.includes('资源未找到')), '记录处理说明后仍被阻断')
  assert(after.warnings.some((w) => w.includes('已记录处理说明')), '处理说明未降级为警告')
  assert(sel.failedChecks(a2).length === sel.failedChecks(a).length, '失败记录被抹掉了')
  return `${a.id}：${sel.failedChecks(a).length} 项「资源未找到」保留在记录中，但不再阻断`
})

/* ------------------------- editorial decisions --------------------------- */

check('七种编辑决定都改变状态并留下记录', () => {
  const target = S0.articles.find((a) => a.status === 'in-review') ?? S0.articles[0]
  const expect = {
    'approve-schedule': 'scheduled', 'save-draft': 'drafting', 'request-sources': 'needs-sources',
    'return-research': 'changes-requested', reject: 'rejected', archive: 'archived',
    'approve-publish': 'published',
  }
  const rows = []
  for (const [decision, status] of Object.entries(expect)) {
    const s = reducer(S0, { type: 'decide', articleId: target.id, decision, note: '冒烟测试', scheduledFor: '2026-09-02T10:00:00Z' })
    const a = s.articles.find((x) => x.id === target.id)
    assert(a.status === status, `${decision}: 期望 ${status}，实际 ${a.status}`)
    assert(s.audit.length === S0.audit.length + 1, `${decision}: 未写入操作记录`)
    rows.push(`${decision}→${status}`)
  }
  return rows.join(' ')
})

check('撤回与更正都会追加公开记录', () => {
  const pub = S0.articles.find((a) => a.status === 'published')
  assert(pub, '没有已发布条目')
  const s = reducer(S0, { type: 'retract', articleId: pub.id, reason: '冒烟测试：新证据推翻核心陈述' })
  const a = s.articles.find((x) => x.id === pub.id)
  assert(a.status === 'retracted', '状态未变为 retracted')
  assert(a.corrections.length === pub.corrections.length + 1, '撤回未追加记录')
  assert(a.corrections[0].kind === 'retraction', '记录类型不对')
  return `${pub.id} 撤回并保留 ${a.corrections.length} 条记录`
})

/* --------------------------------- report -------------------------------- */

const W = 46
console.log('PRISM 行为冒烟测试')
console.log('—'.repeat(72))
for (const [state, name, note] of results) {
  const tag = state === 'pass' ? ' 通过 ' : ' 失败 '
  console.log(`${tag} ${name.padEnd(W, '·')} ${note}`)
}
console.log('—'.repeat(72))
const words = S0.articles.map((a) => articleWordCount(a))
console.log(`条目字数：${words.map((w, i) => `${S0.articles[i].id.replace('art-', '')} ${w}`).join(' · ')}`)
console.log(`${results.length - failures}/${results.length} 通过`)

rmSync(out, { recursive: true, force: true })
process.exit(failures ? 1 : 0)
