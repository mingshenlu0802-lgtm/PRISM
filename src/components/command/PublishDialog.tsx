import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Article, AuditEntry, Correction, RiskFlag } from '../../lib/types'
import { RISK_LABEL, RISK_SEVERITY_LABEL } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { cx, fmtDateTime, nowIso, uid } from '../../lib/util'
import {
  Badge, Checkbox, Field, Icon, Modal, Select, TextArea, TextInput, toast,
} from '../common'
import './PublishDialog.css'

/**
 * 「发布前确认流程」 — the only door between the desk and the public site.
 *
 * The automated desk can never walk through it. Every step below is a real
 * gate: the publish check (`sel.publishGate`) hard-blocks, every soft warning
 * needs an individual 「我已阅读」, every sensitive-content flag needs its own
 * acknowledgement plus a typed confirmation phrase, and the Global Publishing
 * Lock outranks all of it.
 */

export type PublishMode = 'publish' | 'schedule' | 'update' | 'retract'

export interface PublishDialogProps {
  article: Article
  open: boolean
  mode: PublishMode
  onClose: () => void
  onDone?: () => void
}

type StepKey = 'check' | 'confirm' | 'detail' | 'final'

const MODE_META: Record<PublishMode, {
  title: string
  subtitle: string
  action: string
  phrase: string
  detailTitle: string
}> = {
  publish: {
    title: '发布前确认流程',
    subtitle: '逐步校验通过后才会公开。自动编辑台没有发布权限，这一步只能由人完成。',
    action: '立即发布',
    phrase: '确认发布',
    detailTitle: '发布细节',
  },
  schedule: {
    title: '排程发布确认',
    subtitle: '排程不等于免检：到点前系统会再次运行同一套校验，未通过则停留在已批准状态。',
    action: '确认排程',
    phrase: '确认发布',
    detailTitle: '排程时间',
  },
  update: {
    title: '更新已发布内容',
    subtitle: '已发布内容不做静默修改。更正、澄清与更新一律留下公开记录，附时间与执行人。',
    action: '发布更正',
    phrase: '确认发布',
    detailTitle: '更正内容',
  },
  retract: {
    title: '撤回已发布内容',
    subtitle: '撤回不删除历史：页面保留可访问性说明与撤回理由，并写入公开的更正记录。',
    action: '执行撤回',
    phrase: '确认撤回',
    detailTitle: '撤回理由',
  },
}

const CORRECTION_KIND_LABEL: Record<Exclude<Correction['kind'], 'retraction'>, string> = {
  correction: '更正 · 原文存在事实错误，已改正并说明改了什么',
  clarification: '澄清 · 原文不算错，但表述会让读者得出与证据不符的理解',
  update: '更新 · 出现新事实或新一手材料，原有结论需要补充',
}

const SEVERITY_ORDER: Record<RiskFlag['severity'], number> = {
  critical: 0, high: 1, medium: 2, low: 3,
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Default schedule slot: the next full hour, in the browser's own timezone. */
function nextFullHour(): string {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** The browser's own timezone, always written out — a bare time is never enough. */
function tzLabel(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const mins = -new Date().getTimezoneOffset()
  const sign = mins >= 0 ? '+' : '−'
  const abs = Math.abs(mins)
  const offset = `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  if (!zone || zone === 'UTC' || zone === offset) return offset
  return `${zone}（${offset}）`
}

export function PublishDialog({
  article, open, mode, onClose, onDone,
}: PublishDialogProps): JSX.Element | null {
  const { state, dispatch } = usePrism()
  const meta = MODE_META[mode]

  const gate = useMemo(() => sel.publishGate(article, state), [article, state])
  const confirmations = useMemo(
    () => [...gate.confirmations].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [gate.confirmations],
  )
  /** The lock gets its own notice; it is never listed as a clearable blocker. */
  const blockers = useMemo(
    () => gate.blockers.filter((b) => !b.startsWith('Global Publishing Lock')),
    [gate.blockers],
  )

  const isCorrective = mode === 'update' || mode === 'retract'
  const steps: StepKey[] = mode === 'publish'
    ? ['check', 'confirm', 'final']
    : ['check', 'confirm', 'detail', 'final']

  const [stepIndex, setStepIndex] = useState(0)
  const [acked, setAcked] = useState<boolean[]>([])
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})
  const [phrase, setPhrase] = useState('')
  const [override, setOverride] = useState(false)
  const [when, setWhen] = useState(nextFullHour)
  const [correctionKind, setCorrectionKind] = useState<Exclude<Correction['kind'], 'retraction'>>('correction')
  const [correctionText, setCorrectionText] = useState('')
  const [retractReason, setRetractReason] = useState('')

  /* Every opening starts from zero — no acknowledgement is ever inherited. */
  useEffect(() => {
    if (!open) return
    setStepIndex(0)
    setAcked(gate.warnings.map(() => false))
    setConfirmed({})
    setPhrase('')
    setOverride(false)
    setWhen(nextFullHour())
    setCorrectionKind('correction')
    setCorrectionText('')
    setRetractReason('')
    // Re-arm on every open for this article/mode; gate.warnings is only read
    // to size the acknowledgement list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, article.id])

  const scheduledDate = useMemo(() => {
    const d = new Date(when)
    return Number.isNaN(d.getTime()) ? null : d
  }, [when])
  const scheduleInPast = scheduledDate ? scheduledDate.getTime() <= Date.now() : false

  const warningsDone = gate.warnings.length === 0 || (acked.length === gate.warnings.length && acked.every(Boolean))
  const blockersCleared = blockers.length === 0 || (isCorrective && override)
  const checkDone = warningsDone && blockersCleared
  const confirmDone = confirmations.every((r) => confirmed[r.id]) && phrase.trim() === meta.phrase
  const detailDone = mode === 'schedule'
    ? Boolean(scheduledDate) && !scheduleInPast
    : mode === 'update'
      ? correctionText.trim().length >= 10
      : mode === 'retract'
        ? retractReason.trim().length >= 10
        : true

  const stepDone: Record<StepKey, boolean> = {
    check: checkDone,
    confirm: confirmDone,
    detail: detailDone,
    final: true,
  }

  const step = steps[stepIndex]
  const canAdvance = stepDone[step]
  const canSubmit = !gate.lockEngaged && checkDone && confirmDone && detailDone

  const utcLabel = scheduledDate ? fmtDateTime(scheduledDate.toISOString()) : '—'

  function ackSummary(): string {
    const parts: string[] = []
    parts.push(`已读警告 ${gate.warnings.length} 项`)
    parts.push(
      confirmations.length > 0
        ? `敏感内容二次确认 ${confirmations.length} 项（${confirmations.map((r) => RISK_LABEL[r.kind].zh).join('、')}）`
        : '本条目未触发敏感内容二次确认清单',
    )
    parts.push(`键入确认短语「${meta.phrase}」`)
    if (isCorrective && override && blockers.length > 0) {
      parts.push(`并声明本次${mode === 'retract' ? '撤回' : '更正'}正是为处理 ${blockers.length} 项发布校验未通过事项`)
    }
    return `${parts.join('；')}。`
  }

  function writeAudit(): void {
    const entry: AuditEntry = {
      id: uid('aud'),
      at: nowIso(),
      actor: '主编（你）',
      actorKind: 'editor',
      action: mode === 'retract' ? 'retracted' : mode === 'update' ? 'updated' : 'approved',
      articleId: article.id,
      target: `${article.title} · ${meta.title}`,
      detail: ackSummary(),
    }
    dispatch({ type: 'audit', entry })
  }

  function submit(): void {
    if (!canSubmit) return
    writeAudit()

    switch (mode) {
      case 'publish':
        dispatch({ type: 'publish', articleId: article.id })
        toast('已公开发布。更正记录与操作记录同步可查。', 'go')
        break
      case 'schedule':
        dispatch({
          type: 'decide',
          articleId: article.id,
          decision: 'approve-schedule',
          note: `排程于 ${utcLabel}。${ackSummary()}`,
          scheduledFor: scheduledDate ? scheduledDate.toISOString() : undefined,
        })
        toast(`已排程：${utcLabel}。发布前会再次校验。`, 'go')
        break
      case 'update': {
        const correction: Correction = {
          id: uid('cor'),
          at: nowIso(),
          kind: correctionKind,
          text: correctionText.trim(),
          by: '主编（你）',
        }
        dispatch({ type: 'update-published', articleId: article.id, correction })
        toast('更正已发布，并加入公开的更正记录。', 'go')
        break
      }
      case 'retract':
        dispatch({ type: 'retract', articleId: article.id, reason: retractReason.trim() })
        toast('已撤回。原文保留并标注撤回理由。', 'warn')
        break
      default:
        break
    }

    onDone?.()
    onClose()
  }

  if (!open) return null

  const stepLabels: Record<StepKey, string> = {
    check: '校验',
    confirm: '敏感内容二次确认',
    detail: meta.detailTitle,
    final: '最终确认',
  }

  const footer = (
    <div className="pubd__foot">
      <p className="pubd__footnote">
        <Icon name="shield" size={13} />
        自动编辑台无发布权限；本流程的每一次勾选与键入都会写入操作记录。
      </p>
      <div className="pubd__footbtns">
        <button
          type="button"
          className="pubd__btn"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex === 0}
        >
          <Icon name="chevron-left" size={14} />
          上一步
        </button>

        {step !== 'final' ? (
          <button
            type="button"
            className="pubd__btn pubd__btn--primary"
            onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
            disabled={!canAdvance}
          >
            下一步
            <Icon name="chevron-right" size={14} />
          </button>
        ) : gate.lockEngaged ? (
          <button type="button" className="pubd__btn pubd__btn--blocked" disabled>
            <Icon name="lock" size={14} />
            已被 Global Publishing Lock 阻止
          </button>
        ) : (
          <button
            type="button"
            className={cx('pubd__btn', mode === 'retract' ? 'pubd__btn--danger' : 'pubd__btn--go')}
            onClick={submit}
            disabled={!canSubmit}
          >
            <Icon name={mode === 'retract' ? 'archive' : mode === 'schedule' ? 'clock' : 'send'} size={14} />
            {meta.action}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="lg"
      tone={mode === 'retract' ? 'danger' : 'default'}
      title={meta.title}
      subtitle={meta.subtitle}
      footer={footer}
    >
      <div className="pubd">
        <p className="pubd__target">
          <span className="pubd__target-key">条目</span>
          <span className="pubd__target-title">{article.title}</span>
          <span className="pubd__target-slug u-mono">/article/{article.slug}</span>
        </p>

        {gate.lockEngaged ? (
          <section className="pubd__lock" aria-label="全局发布锁提示">
            <span className="pubd__lock-glyph" aria-hidden="true"><Icon name="lock" size={16} /></span>
            <div className="pubd__lock-body">
              <p className="pubd__lock-title">Global Publishing Lock 已开启 —— 本流程无法完成</p>
              <p className="pubd__lock-text">
                由 <strong>{state.lock.by ?? '主编'}</strong>
                {state.lock.since ? <> 于 {fmtDateTime(state.lock.since)}</> : null} 开启：
                {state.lock.reason || '未填写原因'}。
                锁定期间公开发布、排程发布、更正与撤回一律暂停；你仍可完成校验与勾选，但最后一步会被拦下。
              </p>
              <Link className="pubd__lock-link" to="/command/settings">
                前往发布控制解除
                <Icon name="arrow-right" size={13} />
              </Link>
            </div>
          </section>
        ) : null}

        <ol className="pubd__steps" aria-label="确认流程步骤">
          {steps.map((key, i) => {
            const current = i === stepIndex
            const passed = i < stepIndex
            return (
              <li
                key={key}
                className={cx(
                  'pubd__step',
                  current && 'pubd__step--now',
                  passed && 'pubd__step--past',
                  passed && !stepDone[key] && 'pubd__step--unmet',
                )}
              >
                <button
                  type="button"
                  className="pubd__step-btn"
                  onClick={() => setStepIndex(i)}
                  disabled={i > stepIndex && !(i === stepIndex + 1 && stepDone[steps[stepIndex]])}
                  aria-current={current ? 'step' : undefined}
                >
                  <span className="pubd__step-n u-num" aria-hidden="true">{i + 1}</span>
                  <span className="pubd__step-label">{stepLabels[key]}</span>
                  <span className="u-sr">
                    {current ? '（当前步骤）'
                      : key === 'final' ? '（最后一步）'
                        : stepDone[key] ? '（条件已满足）' : '（条件尚未满足）'}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        {step === 'check' ? (
          <section className="pubd__panel" aria-labelledby="pubd-check">
            <h3 className="pubd__h" id="pubd-check">① 发布前校验</h3>

            {blockers.length > 0 ? (
              <div className="pubd__blockers">
                <p className="pubd__blockers-title">
                  <Icon name="alert" size={14} />
                  阻断项 {blockers.length} 项 —— {isCorrective ? '需明确声明后才能继续' : '清除前无法发布'}
                </p>
                <ul className="pubd__blocklist">
                  {blockers.map((b) => (
                    <li key={b} className="pubd__blockitem">
                      <span className="pubd__blockmark" aria-hidden="true">✕</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <p className="pubd__blockwhy">
                  阻断项不是建议。它们对应本站方法与标准中的硬性下限：引用未通过核查的陈述不得公开，
                  未处理的极高风险不得公开，未经审核的封面图不得随文发布。
                </p>
                <div className="pubd__blockfix">
                  <Link className="pubd__fixlink" to={`/command/article/${article.id}`}>
                    <Icon name="edit" size={13} />
                    去工作台修复
                  </Link>
                  <Link className="pubd__fixlink" to={`/command/article/${article.id}/studio`}>
                    <Icon name="image" size={13} />
                    去视觉工作室审图
                  </Link>
                </div>
                {isCorrective ? (
                  <div className="pubd__override">
                    <Checkbox
                      checked={override}
                      onChange={setOverride}
                      label={`本次为${mode === 'retract' ? '撤回' : '更正'}操作，上述未通过项正是本次操作要处理的问题`}
                      hint="更正与撤回本身就是补救手段，因此可以在阻断项仍在时进行；这一声明会写入操作记录。"
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="pubd__ok">
                <Icon name="check-double" size={14} />
                没有阻断项：引用检查、极高风险与封面审核均已满足硬性下限。
              </p>
            )}

            <div className="pubd__warnings">
              <h4 className="pubd__h4">
                需逐条确认的警告
                <span className="pubd__count u-num">{acked.filter(Boolean).length}/{gate.warnings.length}</span>
              </h4>
              {gate.warnings.length === 0 ? (
                <p className="pubd__none">没有警告项。来源结构、可信度与内容提示均在阈值之上。</p>
              ) : (
                <ul className="pubd__warnlist">
                  {gate.warnings.map((w, i) => (
                    <li key={w} className="pubd__warnitem">
                      <Checkbox
                        checked={acked[i] ?? false}
                        onChange={(v) => setAcked((prev) => {
                          const next = prev.length === gate.warnings.length ? [...prev] : gate.warnings.map(() => false)
                          next[i] = v
                          return next
                        })}
                        label={<span className="pubd__warntext">{w}</span>}
                        hint="我已阅读，并确认这一项不会改变读者对证据强度的理解。"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        {step === 'confirm' ? (
          <section className="pubd__panel" aria-labelledby="pubd-confirm">
            <h3 className="pubd__h" id="pubd-confirm">② 敏感内容二次确认</h3>

            {confirmations.length === 0 ? (
              <p className="pubd__none">
                本条目未触发性暴力、未成年人、进行中的司法程序或身份暴露的二次确认清单。
                确认短语仍然必填 —— 公开发布在本站始终是一个需要键入的动作。
              </p>
            ) : (
              <ul className="pubd__risklist">
                {confirmations.map((r) => {
                  const label = RISK_LABEL[r.kind]
                  const sev = RISK_SEVERITY_LABEL[r.severity]
                  return (
                    <li key={r.id} className="pubd__riskitem">
                      <div className="pubd__riskhead">
                        <span className="pubd__riskname">{label.zh}</span>
                        <Badge tone={r.severity === 'critical' || r.severity === 'high' ? 'stop' : 'warn'} size="sm">
                          风险等级 {sev.zh}
                        </Badge>
                      </div>
                      <p className="pubd__riskguide">
                        <span className="pubd__riskkey">操作准则</span>
                        {label.guidance}
                      </p>
                      <p className="pubd__risknote">{r.note}</p>
                      <Checkbox
                        checked={Boolean(confirmed[r.id])}
                        onChange={(v) => setConfirmed((prev) => ({ ...prev, [r.id]: v }))}
                        label={`我已逐项核对「${label.zh}」的处理准则，并确认正文与图像均符合。`}
                      />
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="pubd__phrase">
              <Field
                label={`键入确认短语「${meta.phrase}」`}
                htmlFor="pubd-phrase"
                required
                hint={`必须逐字一致。这一步无法被勾选替代，也不会因为没有敏感标记而跳过。`}
              >
                <TextInput
                  id="pubd-phrase"
                  value={phrase}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={meta.phrase}
                  aria-describedby="pubd-phrase-hint"
                  aria-invalid={phrase.length > 0 && phrase.trim() !== meta.phrase}
                  onChange={(e) => setPhrase(e.currentTarget.value)}
                />
              </Field>
              <p className={cx('pubd__phrasestate', phrase.trim() === meta.phrase && 'pubd__phrasestate--ok')}>
                {phrase.trim() === meta.phrase ? (
                  <><Icon name="check" size={13} />短语一致</>
                ) : (
                  <><Icon name="minus" size={13} />尚未键入，或与要求不一致</>
                )}
              </p>
            </div>
          </section>
        ) : null}

        {step === 'detail' && mode === 'schedule' ? (
          <section className="pubd__panel" aria-labelledby="pubd-detail">
            <h3 className="pubd__h" id="pubd-detail">③ 排程时间</h3>
            <Field
              label="发布时间"
              htmlFor="pubd-when"
              required
              hint={`按 ${tzLabel()} 解释；记录与对外展示统一换算为 UTC。默认值为下一个整点。`}
            >
              <TextInput
                id="pubd-when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.currentTarget.value)}
                aria-invalid={!scheduledDate || scheduleInPast}
              />
            </Field>
            <dl className="pubd__resolve">
              <div className="pubd__resolve-row">
                <dt>本地时间</dt>
                <dd className="u-mono">{when ? when.replace('T', ' ') : '—'} · {tzLabel()}</dd>
              </div>
              <div className="pubd__resolve-row">
                <dt>记录时间</dt>
                <dd className="u-mono">{utcLabel}</dd>
              </div>
            </dl>
            {!scheduledDate ? (
              <p className="pubd__err"><Icon name="alert" size={13} />时间无法解析，请重新选择。</p>
            ) : scheduleInPast ? (
              <p className="pubd__err"><Icon name="alert" size={13} />所选时间已过去，请选择将来的时间点。</p>
            ) : (
              <p className="pubd__ok">
                <Icon name="clock" size={14} />
                到点前系统会重新运行同一套校验；若届时仍有阻断项，条目会停在已批准状态而不会公开。
              </p>
            )}
          </section>
        ) : null}

        {step === 'detail' && mode === 'update' ? (
          <section className="pubd__panel" aria-labelledby="pubd-detail">
            <h3 className="pubd__h" id="pubd-detail">③ 更正内容</h3>
            <Field label="记录类型" htmlFor="pubd-kind" required hint="三类记录都会永久公开保存，读者可以看到改了什么、什么时候改的。">
              <Select
                id="pubd-kind"
                value={correctionKind}
                onChange={(e) => setCorrectionKind(e.currentTarget.value as Exclude<Correction['kind'], 'retraction'>)}
              >
                {(Object.keys(CORRECTION_KIND_LABEL) as (keyof typeof CORRECTION_KIND_LABEL)[]).map((k) => (
                  <option key={k} value={k}>{CORRECTION_KIND_LABEL[k]}</option>
                ))}
              </Select>
            </Field>
            <Field
              label="公开记录正文"
              htmlFor="pubd-cor"
              required
              hint="写清楚原文说了什么、现在改成什么、依据哪份材料。不要写「已作调整」这类无信息量的表述。"
            >
              <TextArea
                id="pubd-cor"
                rows={5}
                value={correctionText}
                placeholder="例：原文称登记窗口已停止索取医疗证明，依据为一家民间机构的转述。补入主管部门书面答复后，该表述已限缩为「本站未取得任何署名的行政执行文件」。"
                onChange={(e) => setCorrectionText(e.currentTarget.value)}
              />
            </Field>
            <p className={cx('pubd__len', correctionText.trim().length >= 10 && 'pubd__len--ok')}>
              <span className="u-num">{correctionText.trim().length}</span> 字 · 至少 10 字
            </p>
          </section>
        ) : null}

        {step === 'detail' && mode === 'retract' ? (
          <section className="pubd__panel" aria-labelledby="pubd-detail">
            <h3 className="pubd__h" id="pubd-detail">③ 撤回理由</h3>
            <Field
              label="撤回理由（公开）"
              htmlFor="pubd-ret"
              required
              hint="撤回理由与原文一并保留。写明是哪一项核心事实无法维持，以及本站据以撤回的证据。"
            >
              <TextArea
                id="pubd-ret"
                rows={5}
                value={retractReason}
                placeholder="例：本条目的核心时间线依赖一份无法回溯到原始记录的材料；取得主管机关的书面答复后，该节点无法维持，故整篇撤回并保留原文与本说明。"
                onChange={(e) => setRetractReason(e.currentTarget.value)}
              />
            </Field>
            <p className={cx('pubd__len', retractReason.trim().length >= 10 && 'pubd__len--ok')}>
              <span className="u-num">{retractReason.trim().length}</span> 字 · 至少 10 字
            </p>
            <p className="pubd__note">
              撤回不删除页面。条目会标为「已撤回」，正文保留可访问性说明，撤回记录进入公开的更正记录。
            </p>
          </section>
        ) : null}

        {step === 'final' ? (
          <section className="pubd__panel" aria-labelledby="pubd-final">
            <h3 className="pubd__h" id="pubd-final">
              {mode === 'publish' ? '③' : '④'} 最终确认 —— 接下来会发生什么
            </h3>

            <ul className="pubd__summary">
              <li className="pubd__sumrow">
                <span className="pubd__sumkey">动作</span>
                <span className="pubd__sumval">{meta.action}</span>
              </li>
              <li className="pubd__sumrow">
                <span className="pubd__sumkey">条目</span>
                <span className="pubd__sumval">{article.title}</span>
              </li>
              <li className="pubd__sumrow">
                <span className="pubd__sumkey">状态变更</span>
                <span className="pubd__sumval">
                  {mode === 'publish' ? '当前状态 → 已发布，立即出现在公众站与今日页。'
                    : mode === 'schedule' ? `当前状态 → 已排程（${utcLabel}），到点前再次校验。`
                      : mode === 'update' ? '保持已发布，新增一条公开的更正记录。'
                        : '当前状态 → 已撤回，页面保留并标注理由。'}
                </span>
              </li>
              <li className="pubd__sumrow">
                <span className="pubd__sumkey">公开地址</span>
                <span className="pubd__sumval u-mono">/article/{article.slug}</span>
              </li>
              {mode === 'update' ? (
                <li className="pubd__sumrow">
                  <span className="pubd__sumkey">记录类型</span>
                  <span className="pubd__sumval">{CORRECTION_KIND_LABEL[correctionKind]}</span>
                </li>
              ) : null}
              {mode === 'update' || mode === 'retract' ? (
                <li className="pubd__sumrow">
                  <span className="pubd__sumkey">公开正文</span>
                  <span className="pubd__sumval pubd__sumval--quote">
                    {(mode === 'update' ? correctionText : retractReason).trim() || '—'}
                  </span>
                </li>
              ) : null}
              <li className="pubd__sumrow">
                <span className="pubd__sumkey">已完成确认</span>
                <span className="pubd__sumval">{ackSummary()}</span>
              </li>
              <li className="pubd__sumrow">
                <span className="pubd__sumkey">写入记录</span>
                <span className="pubd__sumval">
                  操作记录新增一条，注明执行人「主编（你）」与本次全部确认内容；条目的公开更正记录同步可查。
                </span>
              </li>
            </ul>

            {!canSubmit ? (
              <p className="pubd__err">
                <Icon name="alert" size={13} />
                {gate.lockEngaged
                  ? '全局发布锁开启中，本操作被拦下。'
                  : !checkDone ? '第 ① 步尚未完成：仍有未清除的阻断项或未逐条确认的警告。'
                    : !confirmDone ? '第 ② 步尚未完成：敏感内容确认或确认短语不完整。'
                      : '第 ③ 步尚未完成：请补齐本次操作所需的内容。'}
              </p>
            ) : (
              <p className="pubd__ready">
                <Icon name="check-double" size={14} />
                所有条件已满足。这一步不可撤销，但一切都会留下公开记录。
              </p>
            )}
          </section>
        ) : null}
      </div>
    </Modal>
  )
}
