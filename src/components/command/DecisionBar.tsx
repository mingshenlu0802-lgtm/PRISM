import { useState } from 'react'
import type { Article, ReviewDecision } from '../../lib/types'
import { DECISIONS, DECISION_MAP } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { cx } from '../../lib/util'
import { Checkbox, Field, Icon, Modal, TextArea, toast } from '../common'
import type { IconName } from '../common'
import { PublishDialog } from './PublishDialog'
import type { PublishMode } from './PublishDialog'
import './DecisionBar.css'

/**
 * The seven review decisions, wired to the machinery behind them.
 *
 * Two of them open the publish gate; four of them cannot be made without a
 * written reason that lands in the audit trail; one saves a draft. Nothing here
 * acts silently, and nothing here acts in bulk — this bar always belongs to
 * exactly one entry.
 */

export interface DecisionBarProps {
  article: Article
  onDecided?: (d: ReviewDecision) => void
  size?: 'sm' | 'md'
  layout?: 'row' | 'grid'
}

type ReasonDecision = 'request-sources' | 'return-research' | 'reject' | 'archive'

const REASON_DECISIONS: ReasonDecision[] = ['request-sources', 'return-research', 'reject', 'archive']

const DECISION_ICON: Record<ReviewDecision, IconName> = {
  'approve-publish': 'send',
  'approve-schedule': 'clock',
  'save-draft': 'file',
  'request-sources': 'database',
  'return-research': 'refresh',
  reject: 'x',
  archive: 'archive',
}

/** Reason presets — the four退回 decisions each have their own house language. */
const REASON_PRESETS: Record<ReasonDecision, string[]> = {
  'request-sources': [
    '缺少一手材料：需要判决、法规或数据集原文，不接受转述与二次引用。',
    '关键事实目前只有单一来源，需要第二个不共享同一原始信源的独立来源。',
    '引用核查未通过的段落必须替换来源，或删除该项事实陈述。',
  ],
  'return-research': [
    '章节结构不完整：缺少「尚未确定的信息」或「不同来源之间的分歧」，需整体重做。',
    '存在虚假平衡：证据一边倒却写成两方对等，分歧章节需按证据强度重写。',
    '时间线节点未标注证据地位（一手记录／单一来源／存在争议），需逐条重新核实。',
  ],
  reject: [
    '选题价值不足以支撑一篇深度条目，且无法在不降低证据标准的前提下补足。',
    '核心说法无法核实，且短期内没有可预期的取证路径。',
    '按现有材料报道会带来无法缓解的来源安全风险。',
  ],
  archive: [
    '事件已被后续进展取代，暂不推进，保留记录以备检索。',
    '等待司法程序结束后再评估，先移出工作队列。',
    '已并入另一条目，本条目仅保留为历史记录。',
  ],
}

const REASON_TITLE: Record<ReasonDecision, string> = {
  'request-sources': '要求增加来源',
  'return-research': '退回重新研究',
  reject: '拒绝发表',
  archive: '归档条目',
}

const REASON_HINT: Record<ReasonDecision, string> = {
  'request-sources': '写明缺的是哪一类材料、要回溯到哪一份原始文件。编辑台会照这段话去补。',
  'return-research': '整篇重做的成本很高，请写清楚是哪一层出了问题：搜集、来源检索，还是写法。',
  reject: '拒绝会永久留在操作记录里。写下理由，让日后的人知道当时依据的是什么。',
  archive: '归档不是删除。写明为什么现在不推进，以及什么条件下应当重新打开。',
}

const MIN_REASON = 8

export function DecisionBar({
  article, onDecided, size = 'md', layout = 'row',
}: DecisionBarProps): JSX.Element {
  const { state, dispatch } = usePrism()
  const [publishMode, setPublishMode] = useState<PublishMode | null>(null)
  const [reasonFor, setReasonFor] = useState<ReasonDecision | null>(null)
  const [showUnavailable, setShowUnavailable] = useState(false)
  const [reason, setReason] = useState('')
  const [notified, setNotified] = useState(true)

  const status = article.status
  /** Anything the public site can already see. */
  const isPublic = status === 'published' || status === 'retracted' || status === 'update-needed'
  const gate = sel.publishGate(article, state)
  const blockedCount = gate.blockers.length

  /** Why a decision is unavailable for this entry, or '' when it is available. */
  function unavailable(key: ReviewDecision): string {
    switch (key) {
      case 'approve-publish':
        if (status === 'published') return '此条目已经是发布状态；如需修改请使用「更新已发布内容」。'
        if (status === 'update-needed') return '此条目已公开且被标记为需更新。请用「更新已发布内容」留下公开记录，而不是再发布一次。'
        if (status === 'retracted') return '已撤回的条目不能直接重新发布，需先退回重新研究。'
        return ''
      case 'approve-schedule':
        if (isPublic) return '此条目已经公开，排程没有意义。'
        if (status === 'scheduled') return '此条目已在排程队列中；重新排程请先保存为草稿。'
        return ''
      case 'save-draft':
        if (isPublic) return '已公开的条目不能退回草稿状态 —— 那等于静默下线。请使用更新或撤回。'
        if (status === 'drafting') return '此条目已经是草稿状态。'
        return ''
      case 'request-sources':
        if (isPublic) return '已公开的条目不走退回流程；发现证据问题请使用更新或撤回。'
        if (status === 'needs-sources') return '此条目已在「需补充来源」状态。'
        return ''
      case 'return-research':
        if (isPublic && status !== 'retracted') return '已公开的条目不走退回流程；请使用更新或撤回。'
        if (status === 'changes-requested') return '此条目已在「要求修改」状态。'
        return ''
      case 'reject':
        if (status === 'published' || status === 'update-needed') return '已公开的条目不能改判为拒绝；请使用撤回。'
        if (status === 'rejected') return '此条目已被拒绝。'
        return ''
      case 'archive':
        if (status === 'published' || status === 'update-needed') return '已公开的条目不能直接归档 —— 那等于静默下线。请先撤回，再归档。'
        if (status === 'retracted') return '已撤回的条目必须保留公开可访问的撤回说明，不能归档。'
        if (status === 'archived') return '此条目已归档。'
        return ''
      default:
        return ''
    }
  }

  function openDecision(key: ReviewDecision): void {
    if (key === 'approve-publish') { setPublishMode('publish'); return }
    if (key === 'approve-schedule') { setPublishMode('schedule'); return }
    if (key === 'save-draft') {
      dispatch({
        type: 'decide',
        articleId: article.id,
        decision: 'save-draft',
        note: '保存为草稿：保留当前版本，不进入发布流程。',
      })
      toast('已保存为草稿，未进入发布流程。', 'info')
      onDecided?.('save-draft')
      return
    }
    setReason('')
    setNotified(true)
    setReasonFor(key as ReasonDecision)
  }

  function confirmReason(): void {
    if (!reasonFor || reason.trim().length < MIN_REASON) return
    const note = notified
      ? `${reason.trim()}（已通知自动编辑台，退回意见进入下一轮工作项）`
      : reason.trim()
    dispatch({ type: 'decide', articleId: article.id, decision: reasonFor, note })
    toast(`${DECISION_MAP[reasonFor].zh}：理由已写入操作记录。`, reasonFor === 'reject' ? 'stop' : 'warn')
    onDecided?.(reasonFor)
    setReasonFor(null)
    setReason('')
  }

  const compact = layout === 'row'
  const entries = DECISIONS.map((d) => ({ d, why: unavailable(d.key) }))
  const unavailableCount = entries.filter((e) => e.why !== '').length
  /** The compact list form folds inapplicable decisions behind a disclosure. */
  const shown = compact && !showUnavailable ? entries.filter((e) => e.why === '') : entries

  const reasonMeta = reasonFor ? DECISION_MAP[reasonFor] : null
  const reasonOk = reason.trim().length >= MIN_REASON

  return (
    <div className={cx('dcb', `dcb--${size}`, `dcb--${layout}`)}>
      <div className="dcb__head">
        <p className="dcb__label">
          <Icon name="scale" size={13} />
          编辑决定 —— 每篇单独判断
        </p>
        {blockedCount > 0 ? (
          <p className="dcb__blocked">
            <Icon name="alert" size={12} />
            {blockedCount} 项阻断，发布路径不可用
          </p>
        ) : null}
      </div>

      <div className="dcb__grid" role="group" aria-label={`《${article.title}》的编辑决定`}>
        {shown.map(({ d, why }) => {
          const disabled = why !== ''
          return (
            <button
              key={d.key}
              type="button"
              className={cx('dcb__btn', `dcb__btn--${d.tone}`, disabled && 'dcb__btn--off')}
              onClick={() => openDecision(d.key)}
              disabled={disabled}
              title={disabled ? why : d.hint}
            >
              <span className="dcb__btn-icon" aria-hidden="true">
                <Icon name={DECISION_ICON[d.key]} size={14} />
              </span>
              <span className="dcb__btn-text">
                <span className="dcb__btn-zh">{d.zh}</span>
                <span className="dcb__btn-hint">{disabled ? why : d.hint}</span>
              </span>
              {disabled ? (
                <span className="dcb__btn-tag dcb__btn-tag--off">不可用</span>
              ) : (REASON_DECISIONS as ReviewDecision[]).includes(d.key) ? (
                <span className="dcb__btn-tag">需理由</span>
              ) : d.key === 'approve-publish' || d.key === 'approve-schedule' ? (
                <span className="dcb__btn-tag">需确认流程</span>
              ) : null}
            </button>
          )
        })}

        {compact && unavailableCount > 0 ? (
          <button
            type="button"
            className="dcb__reveal"
            aria-expanded={showUnavailable}
            onClick={() => setShowUnavailable((v) => !v)}
          >
            <Icon name={showUnavailable ? 'chevron-up' : 'chevron-down'} size={12} />
            {showUnavailable
              ? `收起 ${unavailableCount} 项不适用的决定`
              : `${unavailableCount} 项决定在此状态下不适用`}
          </button>
        ) : null}
      </div>

      {isPublic ? (
        <div className="dcb__live">
          <p className="dcb__live-label">已发布内容的处理方式</p>
          <div className="dcb__live-btns">
            <button
              type="button"
              className="dcb__lbtn"
              onClick={() => setPublishMode('update')}
            >
              <Icon name="edit" size={13} />
              更新已发布内容
            </button>
            <button
              type="button"
              className="dcb__lbtn dcb__lbtn--danger"
              onClick={() => setPublishMode('retract')}
              disabled={status === 'retracted'}
              title={status === 'retracted' ? '此条目已撤回。' : '撤回后页面保留，并公开标注撤回理由。'}
            >
              <Icon name="archive" size={13} />
              撤回
            </button>
          </div>
          <p className="dcb__live-note">
            已发布内容不做静默修改：更正、澄清、更新与撤回都会留下公开记录。
          </p>
        </div>
      ) : null}

      {publishMode ? (
        <PublishDialog
          article={article}
          open
          mode={publishMode}
          onClose={() => setPublishMode(null)}
          onDone={() => {
            if (publishMode === 'publish') onDecided?.('approve-publish')
            else if (publishMode === 'schedule') onDecided?.('approve-schedule')
          }}
        />
      ) : null}

      <Modal
        open={reasonFor !== null}
        onClose={() => setReasonFor(null)}
        width="md"
        tone={reasonFor === 'reject' ? 'danger' : 'default'}
        title={reasonFor ? REASON_TITLE[reasonFor] : ''}
        subtitle={reasonMeta ? reasonMeta.hint : undefined}
        footer={(
          <div className="dcb__modalfoot">
            <p className="dcb__modalnote">
              <Icon name="history" size={13} />
              理由会原样写入操作记录，并显示在条目的处理历史中。
            </p>
            <div className="dcb__modalbtns">
              <button type="button" className="dcb__mbtn" onClick={() => setReasonFor(null)}>
                取消
              </button>
              <button
                type="button"
                className={cx('dcb__mbtn', 'dcb__mbtn--primary', reasonFor === 'reject' && 'dcb__mbtn--danger')}
                onClick={confirmReason}
                disabled={!reasonOk}
              >
                {reasonFor ? REASON_TITLE[reasonFor] : ''}
              </button>
            </div>
          </div>
        )}
      >
        {reasonFor ? (
          <div className="dcb__reason">
            <p className="dcb__reason-target">
              <span className="dcb__reason-key">条目</span>
              {article.title}
            </p>

            <div className="dcb__presets">
              <p className="dcb__presets-label">常用理由（点击填入，可继续编辑）</p>
              <div className="dcb__presets-row">
                {REASON_PRESETS[reasonFor].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="dcb__preset"
                    onClick={() => setReason((prev) => (prev.trim() ? `${prev.trim()}\n${p}` : p))}
                  >
                    <Icon name="plus" size={11} />
                    {p.slice(0, 22)}…
                  </button>
                ))}
              </div>
            </div>

            <Field
              label="书面理由"
              htmlFor="dcb-reason"
              required
              hint={REASON_HINT[reasonFor]}
            >
              <TextArea
                id="dcb-reason"
                rows={6}
                value={reason}
                placeholder="具体、可执行、指向材料而不是指向人。"
                onChange={(e) => setReason(e.currentTarget.value)}
              />
            </Field>

            <p className={cx('dcb__len', reasonOk && 'dcb__len--ok')}>
              <span className="u-num">{reason.trim().length}</span> 字 · 至少 {MIN_REASON} 字才能提交
            </p>

            <Checkbox
              checked={notified}
              onChange={setNotified}
              label="把这条意见转给自动编辑台，作为下一轮的工作项"
              hint="编辑台只会按这段话补材料或重写；它仍然不能自行发布任何内容。"
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
