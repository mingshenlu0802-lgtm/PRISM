import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Article, ID, VibePreset, VibeRun, Version } from '../../lib/types'
import { usePrism } from '../../lib/store'
import { VIBE_PRESETS, applyVibeInstruction, classifyInstruction, planSteps } from '../../lib/vibe'
import { summarizeDiff } from '../../lib/diff'
import { cx, fmtDateTime, nowIso, relTime, uid } from '../../lib/util'
import { Badge, Icon, Progress, TextArea, toast } from '../common'
import './VibeConsole.css'

/**
 * Further Vibe Coding — natural-language editing with a human gate.
 *
 * The instruction is classified by `classifyInstruction`, executed by
 * `applyVibeInstruction` against material already in the source library, and
 * lands as a *proposal* version. Nothing is written into the entry until the
 * editor presses 「采用此版本」: the engine has no authority of its own, and the
 * panel says so on every screen where a proposal is visible.
 *
 * The step animation is cosmetic — it paces a computation that is instant and
 * deterministic — so it collapses to nothing under `prefers-reduced-motion`.
 */

/** Engine notes for a run, kept beside the store (which records only rationale). */
const RUN_NOTES = new Map<ID, string[]>()

const STEP_MS = 450

const CATEGORY_LABEL: Record<VibePreset['category'], string> = {
  context: '背景与语境',
  sources: '来源与视角',
  ethics: '伦理与写法',
  verification: '核查',
  depth: '深度与可读性',
  imagery: '图像',
}

const CATEGORY_ORDER: VibePreset['category'][] = [
  'context', 'sources', 'verification', 'ethics', 'depth', 'imagery',
]

const RUN_STATE_META: Record<VibeRun['state'], { zh: string; tone: 'info' | 'warn' | 'go' | 'neutral' }> = {
  running: { zh: '执行中', tone: 'info' },
  proposed: { zh: '待确认', tone: 'warn' },
  adopted: { zh: '已采用', tone: 'go' },
  discarded: { zh: '未采用', tone: 'neutral' },
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export interface VibeConsoleProps {
  article: Article
  className?: string
}

export function VibeConsole({ article, className }: VibeConsoleProps): JSX.Element {
  const { state, dispatch } = usePrism()
  const [text, setText] = useState('')
  const [runningId, setRunningId] = useState<ID | null>(null)
  const [done, setDone] = useState(0)
  const timers = useRef<number[]>([])

  /* The proposal is computed against whatever the entry looks like when the
     last step finishes, so a mid-run edit in the centre column is respected. */
  const latest = useRef({ article, state })
  useEffect(() => { latest.current = { article, state } })

  useEffect(() => () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])

  const runs = useMemo(
    () => state.vibeRuns.filter((r) => r.articleId === article.id),
    [state.vibeRuns, article.id],
  )
  const pending = runs.find((r) => r.state === 'proposed')
  const running = runs.find((r) => r.id === runningId)
  const history = runs.filter((r) => r.id !== pending?.id && r.state !== 'running')

  const proposalVersion = useMemo(
    () => state.versions.find((v) => v.id === pending?.proposedVersionId),
    [state.versions, pending?.proposedVersionId],
  )

  const sourceTitle = (id: ID): string => {
    const src = state.sources.find((s) => s.id === id)
    return src ? `${src.title} — ${src.publisher}` : id
  }

  const preview = useMemo(() => (text.trim() ? classifyInstruction(text) : null), [text])

  /* ------------------------------ execution ------------------------------ */

  const finish = (runId: ID, instruction: string) => {
    const { article: a, state: st } = latest.current
    const outcome = applyVibeInstruction(instruction, a, st, nowIso())
    const plan = classifyInstruction(instruction)
    const n = st.versions
      .filter((v) => v.articleId === a.id)
      .reduce((max, v) => Math.max(max, v.n), 0) + 1

    const version: Version = {
      id: uid('ver'),
      articleId: a.id,
      n,
      label: `v${n} · ${plan.label}`,
      createdAt: nowIso(),
      author: 'editor',
      instruction,
      summary: outcome.summary,
      refDelta: outcome.refDelta,
      snapshot: outcome.snapshot,
      state: 'proposal',
      stats: outcome.stats,
    }

    RUN_NOTES.set(runId, outcome.notes)
    dispatch({ type: 'vibe-propose', runId, version, rationale: outcome.rationale })
    setRunningId(null)
    setDone(0)
    toast('提案已生成，尚未生效：确认后才会写入文章。', 'warn')
  }

  const submit = (instruction: string) => {
    const value = instruction.trim()
    if (!value || runningId) return
    if (pending) {
      toast('请先处理当前待确认的提案（采用或不采用），再发出新的指令。', 'warn')
      return
    }

    const steps = planSteps(value)
    const run: VibeRun = {
      id: uid('vibe'),
      articleId: article.id,
      instruction: value,
      startedAt: nowIso(),
      state: 'running',
      steps,
    }
    dispatch({ type: 'vibe-start', run })
    setText('')
    setDone(0)

    if (prefersReducedMotion()) {
      setRunningId(run.id)
      finish(run.id, value)
      return
    }

    setRunningId(run.id)
    steps.forEach((_, i) => {
      const t = window.setTimeout(() => setDone(i + 1), STEP_MS * (i + 1))
      timers.current.push(t)
    })
    const last = window.setTimeout(() => finish(run.id, value), STEP_MS * (steps.length + 1))
    timers.current.push(last)
  }

  const adopt = () => {
    if (!pending) return
    dispatch({ type: 'vibe-adopt', runId: pending.id })
    toast('已采用该版本：文章已更新，旧版本保留在版本历史中。', 'go')
  }

  const discard = () => {
    if (!pending) return
    dispatch({ type: 'vibe-discard', runId: pending.id })
    toast('已记录为「不采用」。文章未作任何改动。', 'info')
  }

  /* -------------------------------- render ------------------------------- */

  const notes = pending ? RUN_NOTES.get(pending.id) ?? [] : []

  return (
    <div className={cx('vibe', className)}>
      {/* ----------------------------- console ----------------------------- */}
      <section className="vibe__box" aria-label="自然语言编辑指令">
        <header className="vibe__boxhead">
          <h3 className="vibe__boxtitle">
            <Icon name="sparkle" size={14} />
            Further Vibe Coding
          </h3>
          <p className="vibe__boxhint">
            用一句话说明要怎么改。引擎只会从已入库的来源中取材，不会凭空创造来源；每次修改生成新版本，采用与否由你决定。
          </p>
        </header>

        <label className="vibe__label" htmlFor="vibe-input">编辑指令</label>
        <TextArea
          id="vibe-input"
          className="vibe__input"
          value={text}
          rows={3}
          placeholder="例：加入韦拉共和国的法律背景；或：检查是否存在受害者有罪论"
          onChange={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(text) }
          }}
          disabled={Boolean(runningId)}
          aria-describedby="vibe-preview"
        />

        <div className="vibe__row">
          <p className="vibe__preview" id="vibe-preview">
            {preview ? (
              preview.intent === 'fallback' ? (
                <>
                  <Icon name="alert" size={12} />
                  未识别为可自动执行的改写：引擎会写入一条署名为机器的编辑建议，正文不做猜测性改动。
                </>
              ) : (
                <>
                  <Icon name="check" size={12} />
                  将按「{preview.label}」执行
                  {preview.jurisdiction ? `，目标辖区：${preview.jurisdiction}` : ''}
                  {preview.variant === 'plain' ? '，以降低阅读门槛为目标' : ''}
                  ，共 {planSteps(text).length} 步。
                </>
              )
            ) : (
              <>
                <Icon name="info" size={12} />
                可直接点选下方预设，或自己写一句。⌘/Ctrl + Enter 提交。
              </>
            )}
          </p>
          <button
            type="button"
            className="vibe__send"
            onClick={() => submit(text)}
            disabled={!text.trim() || Boolean(runningId)}
          >
            <Icon name="send" size={13} />
            生成提案
          </button>
        </div>

        <div className="vibe__presets">
          {CATEGORY_ORDER.map((category) => {
            const items = VIBE_PRESETS.filter((p) => p.category === category)
            if (items.length === 0) return null
            return (
              <div className="vibe__presetgroup" key={category}>
                <span className="vibe__presetlab">{CATEGORY_LABEL[category]}</span>
                <ul className="vibe__presetlist">
                  {items.map((preset) => (
                    <li key={preset.id}>
                      <button
                        type="button"
                        className="vibe__chip"
                        onClick={() => submit(preset.instruction)}
                        disabled={Boolean(runningId)}
                        title={preset.instruction}
                      >
                        {preset.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* ------------------------------ running ---------------------------- */}
      {running ? (
        <section className="vibe__running" aria-live="polite" aria-label="指令执行进度">
          <p className="vibe__runinstr">
            <span className="vibe__runlab">执行中</span>
            {running.instruction}
          </p>
          <Progress steps={running.steps.map((s, i) => ({ label: s.label, done: i < done }))} />
          <p className="vibe__rundetail">
            {running.steps[Math.min(done, running.steps.length - 1)]?.detail}
          </p>
        </section>
      ) : null}

      {/* ----------------------------- proposal ---------------------------- */}
      {pending && proposalVersion ? (
        <section className="vibe__proposal" aria-label="待确认的修改提案">
          <header className="vibe__phead">
            <div className="vibe__pheadtop">
              <h3 className="vibe__ptitle">
                <Icon name="diff" size={14} />
                提案 v{proposalVersion.n}
              </h3>
              <Badge tone="warn" size="sm" icon={<Icon name="clock" size={11} />}>尚未生效</Badge>
            </div>
            <p className="vibe__pinstr">「{pending.instruction}」</p>
            <p className="vibe__pnotice">
              这份提案还没有写入文章，也不会出现在公开页面。只有你按下「采用此版本」之后，它才会成为当前版本；
              未采用的提案会作为记录保留。
            </p>
          </header>

          <dl className="vibe__stats">
            <div className="vibe__stat">
              <dt>新增</dt>
              <dd className="u-num">{proposalVersion.stats.added}</dd>
            </div>
            <div className="vibe__stat">
              <dt>删除</dt>
              <dd className="u-num">{proposalVersion.stats.removed}</dd>
            </div>
            <div className="vibe__stat">
              <dt>改写</dt>
              <dd className="u-num">{proposalVersion.stats.changed}</dd>
            </div>
            <div className="vibe__stat">
              <dt>引用增减</dt>
              <dd className="u-num">
                +{proposalVersion.refDelta.added.length} / −{proposalVersion.refDelta.removed.length}
              </dd>
            </div>
          </dl>
          <p className="vibe__summary">{summarizeDiff(proposalVersion.stats)} · {proposalVersion.summary}</p>

          <div className="vibe__block">
            <h4 className="vibe__blocktitle">改动理由</h4>
            <p className="vibe__blocktext">{pending.rationale}</p>
          </div>

          {notes.length > 0 ? (
            <div className="vibe__block">
              <h4 className="vibe__blocktitle">引擎备注</h4>
              <ul className="vibe__notes">
                {notes.map((note, i) => (
                  <li key={i} className="vibe__note">{note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {proposalVersion.refDelta.added.length > 0 ? (
            <div className="vibe__block">
              <h4 className="vibe__blocktitle">新增引用的来源（{proposalVersion.refDelta.added.length}）</h4>
              <ul className="vibe__refs">
                {proposalVersion.refDelta.added.map((id) => (
                  <li key={id} className="vibe__ref vibe__ref--add">
                    <span className="vibe__refmark" aria-hidden="true">＋</span>
                    <span className="u-sr">新增：</span>
                    {sourceTitle(id)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {proposalVersion.refDelta.removed.length > 0 ? (
            <div className="vibe__block">
              <h4 className="vibe__blocktitle">不再被引用的来源（{proposalVersion.refDelta.removed.length}）</h4>
              <ul className="vibe__refs">
                {proposalVersion.refDelta.removed.map((id) => (
                  <li key={id} className="vibe__ref vibe__ref--del">
                    <span className="vibe__refmark" aria-hidden="true">−</span>
                    <span className="u-sr">移除：</span>
                    {sourceTitle(id)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Link className="vibe__compare" to={`/command/article/${article.id}/versions`}>
            <Icon name="layers" size={13} />
            在版本比对中逐块查看全部差异
            <Icon name="arrow-right" size={12} />
          </Link>

          <div className="vibe__actions">
            <button type="button" className="vibe__btn vibe__btn--adopt" onClick={adopt}>
              <Icon name="check-double" size={14} />
              采用此版本
            </button>
            <button type="button" className="vibe__btn vibe__btn--discard" onClick={discard}>
              <Icon name="x" size={14} />
              不采用
            </button>
          </div>
          <p className="vibe__actionnote">
            采用会把提案写入文章并记入操作记录；不采用会把这次运行标记为「未采用」，文章保持原样。两种选择都可追溯。
          </p>
        </section>
      ) : null}

      {/* ------------------------------ history ---------------------------- */}
      <section className="vibe__history" aria-label="本条目的指令历史">
        <h3 className="vibe__histtitle">
          <Icon name="history" size={13} />
          本条目的指令历史
          <span className="vibe__histcount u-num">{history.length}</span>
        </h3>
        {history.length === 0 ? (
          <p className="vibe__histempty">
            还没有已完成的指令。每一次自然语言修改都会留在这里，连同它的结论与是否被采用。
          </p>
        ) : (
          <ol className="vibe__histlist">
            {history.map((run) => {
              const version = state.versions.find((v) => v.id === run.proposedVersionId)
              const meta = RUN_STATE_META[run.state]
              return (
                <li key={run.id} className={cx('vibe__histitem', `vibe__histitem--${run.state}`)}>
                  <div className="vibe__histhead">
                    <Badge tone={meta.tone} size="sm">{meta.zh}</Badge>
                    {version ? <span className="vibe__histver u-num">v{version.n}</span> : null}
                    <time className="vibe__histtime" dateTime={run.startedAt} title={fmtDateTime(run.startedAt)}>
                      {relTime(run.startedAt, nowIso())}
                    </time>
                  </div>
                  <p className="vibe__histinstr">「{run.instruction}」</p>
                  {version ? <p className="vibe__histsummary">{version.summary}</p> : null}
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
