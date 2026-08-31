import { useMemo, useState } from 'react'
import type { Article, RiskFlag, RiskSeverity } from '../../lib/types'
import { RISK_LABEL, RISK_SEVERITY_LABEL, SECOND_CONFIRM_KINDS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { cx } from '../../lib/util'
import { Badge, Field, Icon, Modal, RiskChip, TextArea, toast } from '../common'
import './RiskPanel.css'

/**
 * 风险提示 — the entry's editorial risk register.
 *
 * Every flag is shown with the house guidance for its category (RISK_LABEL),
 * its severity, and who raised it — the automated review, the editor, or the
 * legal check. Nothing here can be dismissed with a click: closing a flag costs
 * a written resolution note, because "已处理" without a sentence saying what was
 * actually changed is exactly the kind of record that fails an audit.
 *
 * Sensitive categories (性暴力 / 未成年人 / 进行中的司法程序 / 身份暴露) are marked
 * as demanding a second, typed confirmation in the publish dialog even after the
 * editor has resolved them here.
 */

const SEVERITY_RANK: Record<RiskSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 }

const RAISED_BY_LABEL: Record<RiskFlag['raisedBy'], string> = {
  'ai-review': '自动审查',
  editor: '编辑',
  'legal-check': '法务核查',
}

const MIN_NOTE = 8

export interface RiskPanelProps {
  article: Article
  className?: string
}

export function RiskPanel({ article, className }: RiskPanelProps): JSX.Element {
  const { dispatch } = usePrism()
  const [target, setTarget] = useState<RiskFlag | null>(null)
  const [note, setNote] = useState('')

  const { open, resolved, sensitive, score } = useMemo(() => {
    const rank = (f: RiskFlag) => SEVERITY_RANK[f.severity]
    const openList = [...sel.openRisks(article)].sort((a, b) => rank(b) - rank(a))
    const doneList = article.riskFlags.filter((f) => f.resolved)
    return {
      open: openList,
      resolved: doneList,
      sensitive: sel.needsSecondConfirm(article),
      score: sel.riskScore(article),
    }
  }, [article])

  const counts = useMemo(() => {
    const out: Record<RiskSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const f of open) out[f.severity] += 1
    return out
  }, [open])

  const openSensitive = sensitive.filter((f) => !f.resolved)

  const close = () => { setTarget(null); setNote('') }

  const submit = () => {
    if (!target || note.trim().length < MIN_NOTE) return
    dispatch({ type: 'resolve-risk', articleId: article.id, riskId: target.id, note: note.trim() })
    toast(`风险项已标记为已处理：${RISK_LABEL[target.kind].zh}`, 'go')
    close()
  }

  const renderFlag = (flag: RiskFlag) => {
    const meta = RISK_LABEL[flag.kind]
    const needsConfirm = flag.requiresSecondConfirm || SECOND_CONFIRM_KINDS.includes(flag.kind)
    return (
      <li key={flag.id} className={cx('rskp__item', flag.resolved && 'rskp__item--done')}>
        <RiskChip flag={flag} />
        <div className="rskp__foot">
          <span className="rskp__raised">
            <Icon name={flag.raisedBy === 'legal-check' ? 'scale' : flag.raisedBy === 'editor' ? 'users' : 'sparkle'} size={12} />
            由{RAISED_BY_LABEL[flag.raisedBy]}提出
          </span>
          {needsConfirm ? (
            <Badge tone="warn" size="sm" icon={<Icon name="lock" size={11} />} title={meta.guidance}>
              发布前需二次确认
            </Badge>
          ) : null}
          {flag.resolved ? (
            <Badge tone="go" size="sm" icon={<Icon name="check" size={11} />}>已处理</Badge>
          ) : (
            <button
              type="button"
              className="rskp__resolve"
              onClick={() => { setTarget(flag); setNote('') }}
            >
              <Icon name="check-double" size={12} />
              标记为已处理
            </button>
          )}
        </div>
        {flag.resolved && flag.resolutionNote ? (
          <p className="rskp__resolution">
            <span className="rskp__resolutionlab">处理说明</span>
            {flag.resolutionNote}
          </p>
        ) : null}
      </li>
    )
  }

  return (
    <div className={cx('rskp', className)}>
      <header className="rskp__head">
        <div className="rskp__scorebox">
          <span className="rskp__score u-num" aria-hidden="true">{score}</span>
          <span className="rskp__scorelab">
            风险分
            <span className="u-sr">：{score}，由未处理风险项按等级加权得出</span>
          </span>
        </div>
        <ul className="rskp__counts">
          {(['critical', 'high', 'medium', 'low'] as RiskSeverity[]).map((sev) => (
            <li
              key={sev}
              className={cx('rskp__countitem', counts[sev] > 0 && 'rskp__countitem--on')}
              style={{ ['--rskp-tone' as string]: RISK_SEVERITY_LABEL[sev].var }}
            >
              <span className="rskp__countnum u-num">{counts[sev]}</span>
              <span className="rskp__countlab">{RISK_SEVERITY_LABEL[sev].zh}</span>
            </li>
          ))}
        </ul>
      </header>

      <p className="rskp__lede">
        未处理 <b className="u-num">{open.length}</b> 项 · 已处理 <b className="u-num">{resolved.length}</b> 项。
        极高风险未处理会直接阻断发布；高风险会作为警告出现在发布前确认流程中。
      </p>

      {openSensitive.length > 0 ? (
        <div className="rskp__confirm" role="note">
          <h3 className="rskp__confirmtitle">
            <Icon name="lock" size={13} />
            发布前必须二次确认的敏感类别（{openSensitive.length}）
          </h3>
          <ul className="rskp__confirmlist">
            {openSensitive.map((f) => (
              <li key={f.id}>
                <b>{RISK_LABEL[f.kind].zh}</b>：{RISK_LABEL[f.kind].guidance}
              </li>
            ))}
          </ul>
          <p className="rskp__confirmnote">
            这些类别即使标记为已处理，仍会在发布前确认流程中要求逐项勾选并键入确认短语。
          </p>
        </div>
      ) : null}

      <section className="rskp__group" aria-label="未处理的风险项">
        <h3 className="rskp__grouptitle">
          未处理
          <span className="rskp__groupcount u-num">{open.length}</span>
        </h3>
        {open.length === 0 ? (
          <p className="rskp__empty">
            <Icon name="check-double" size={14} />
            没有未处理的风险项。已处理的记录仍然保留在下方，处理说明会一并写入操作记录。
          </p>
        ) : (
          <ul className="rskp__list">{open.map(renderFlag)}</ul>
        )}
      </section>

      {resolved.length > 0 ? (
        <section className="rskp__group" aria-label="已处理的风险项">
          <h3 className="rskp__grouptitle">
            已处理
            <span className="rskp__groupcount u-num">{resolved.length}</span>
          </h3>
          <ul className="rskp__list">{resolved.map(renderFlag)}</ul>
        </section>
      ) : null}

      <Modal
        open={target !== null}
        onClose={close}
        title="标记风险项为已处理"
        subtitle={target ? `${RISK_LABEL[target.kind].zh} · ${RISK_SEVERITY_LABEL[target.severity].zh}风险` : undefined}
        width="md"
        footer={
          <>
            <button type="button" className="rskp__btn" onClick={close}>取消</button>
            <button
              type="button"
              className="rskp__btn rskp__btn--go"
              onClick={submit}
              disabled={note.trim().length < MIN_NOTE}
            >
              <Icon name="check" size={14} />
              记录处理说明并关闭该项
            </button>
          </>
        }
      >
        {target ? (
          <div className="rskp__dialog">
            <p className="rskp__dialognote">{target.note}</p>
            <p className="rskp__dialogguide">
              <span className="rskp__dialogguidelab">本站规范</span>
              {RISK_LABEL[target.kind].guidance}
            </p>
            <Field
              label="处理说明"
              required
              hint={`写明你对正文做了什么，而不是「已确认」。不少于 ${MIN_NOTE} 个字；说明会随该条目永久保留，并写入操作记录。`}
            >
              <TextArea
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                rows={5}
                placeholder="例：已删除第三段中的就诊机构与街区名称，把「据其自述」改为归因到民间机构的整理转述，并在图注中写明样本局限。"
              />
            </Field>
            {target.requiresSecondConfirm || SECOND_CONFIRM_KINDS.includes(target.kind) ? (
              <p className="rskp__dialogwarn">
                <Icon name="alert" size={13} />
                这是敏感类别：即使在此处关闭，发布前仍需再次逐项确认。
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
