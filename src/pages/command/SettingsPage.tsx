import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ENGINE_MAP, RISK_LABEL, SECOND_CONFIRM_KINDS, enginesFor } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { cx, fmtDateTime } from '../../lib/util'
import {
  Badge, Checkbox, Field, Icon, Modal, StatusBadge, TextArea, TextInput, toast,
} from '../../components/common'
import { PanelCard } from '../../components/command/PanelCard'
import './SettingsPage.css'

/**
 * 发布控制与系统。
 *
 * The Global Publishing Lock lives here, and it is given the weight it
 * deserves: engaging it needs a written reason, and the confirmation dialog
 * spells out exactly what stops — including that an "approve & publish" during
 * a lock will record the approval and publish nothing.
 */

const CONFIRM_PHRASE = '开启发布锁'
const RELEASE_PHRASE = '解除发布锁'

export default function SettingsPage() {
  const { state, dispatch, resetDemo } = usePrism()
  const [engaging, setEngaging] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [reason, setReason] = useState('')
  const [phrase, setPhrase] = useState('')
  const [ack, setAck] = useState(false)

  // Notification preferences are local-only in the prototype.
  const [briefTime, setBriefTime] = useState('06:40')
  const [sections, setSections] = useState({
    topFive: true, pending: true, research: true, claims: true, risks: true, citations: true,
  })

  const lock = state.lock
  const held = useMemo(
    () => [...sel.scheduled(state), ...sel.approvedNotLive(state)],
    [state],
  )

  function engage() {
    if (reason.trim().length < 8 || phrase.trim() !== CONFIRM_PHRASE || !ack) return
    dispatch({ type: 'lock', engaged: true, reason: reason.trim() })
    toast('Global Publishing Lock 已开启。全站公开发布暂停，包括已排程内容。', 'stop')
    setEngaging(false); setReason(''); setPhrase(''); setAck(false)
  }

  function release() {
    if (phrase.trim() !== RELEASE_PHRASE) return
    dispatch({ type: 'lock', engaged: false })
    toast('发布已恢复。排程内容将按原定时间进入发布前校验。', 'go')
    setReleasing(false); setPhrase('')
  }

  return (
    <div className="setp">
      <header className="setp__head">
        <p className="u-eyebrow">发布控制 · Publishing controls</p>
        <h1 className="setp__title">发布锁与系统设置</h1>
      </header>

      {/* ---------------------------- the lock ---------------------------- */}
      <section
        className={cx('setp__lock', lock.engaged && 'setp__lock--on')}
        aria-labelledby="setp-lock-h"
      >
        <div className="setp__lock-top">
          <span className={cx('setp__lock-icon', lock.engaged && 'setp__lock-icon--on')} aria-hidden="true">
            <Icon name={lock.engaged ? 'lock' : 'unlock'} size={26} />
          </span>
          <div className="setp__lock-head">
            <h2 id="setp-lock-h" className="setp__lock-h">Global Publishing Lock</h2>
            <p className="setp__lock-state">
              {lock.engaged ? '已开启 · 全站公开发布暂停中' : '未开启 · 发布流程正常'}
            </p>
          </div>
          <Badge tone={lock.engaged ? 'stop' : 'go'} size="md">
            {lock.engaged ? '已锁定' : '未锁定'}
          </Badge>
        </div>

        {lock.engaged ? (
          <>
            <dl className="setp__lock-meta">
              <div><dt>开启时间</dt><dd>{lock.since ? fmtDateTime(lock.since) : '—'}</dd></div>
              <div><dt>执行人</dt><dd>{lock.by ?? '—'}</dd></div>
              <div className="setp__lock-reason"><dt>原因</dt><dd>{lock.reason ?? '未填写'}</dd></div>
            </dl>
            <button type="button" className="setp__btn setp__btn--go" onClick={() => { setPhrase(''); setReleasing(true) }}>
              <Icon name="unlock" size={15} /> 解除发布锁
            </button>
          </>
        ) : (
          <>
            <p className="setp__lock-t">
              开启后，全站的公开发布立即暂停，<strong>包括已排程的内容</strong>。
              此时点击「批准并立即发布」只会记录一次批准，不会公开任何内容——
              批准与发布在这套系统里是两件事，发布锁把它们分开。
            </p>
            <button type="button" className="setp__btn setp__btn--danger" onClick={() => { setReason(''); setPhrase(''); setAck(false); setEngaging(true) }}>
              <Icon name="lock" size={15} /> 开启发布锁
            </button>
          </>
        )}

        <div className="setp__held">
          <h3 className="setp__held-h">
            当前会受影响的内容（{held.length}）
          </h3>
          {held.length === 0 ? (
            <p className="setp__held-empty">目前没有已批准或已排程、等待公开的条目。</p>
          ) : (
            <ul className="setp__held-list">
              {held.map((a) => (
                <li key={a.id} className="setp__held-item">
                  <StatusBadge status={a.status} size="sm" />
                  <Link className="setp__held-link" to={`/command/article/${a.id}`}>{a.title}</Link>
                  <span className="setp__held-t">
                    {a.status === 'scheduled' && a.scheduledFor
                      ? `原定 ${fmtDateTime(a.scheduledFor)} 发布${lock.engaged ? '——已被发布锁拦截' : ''}`
                      : lock.engaged ? '已批准但被发布锁拦截，未公开' : '已批准，等待发布'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ----------------------- pre-publish rules ------------------------ */}
      <PanelCard
        title="发布前确认规则"
        subtitle="只读——这些规则写在系统里，不能在界面上关掉"
        icon="shield"
      >
        <p className="setp__rules-t">
          以下四类内容在发布前<strong>必须逐项确认，并键入确认短语</strong>。
          这项要求跟随内容本身，不随风险标记是否已处置而改变：
          处置过风险是你可以确认的理由，不是跳过确认的理由。
        </p>
        <ul className="setp__kinds">
          {SECOND_CONFIRM_KINDS.map((k) => (
            <li key={k} className="setp__kind">
              <span className="setp__kind-k">{RISK_LABEL[k].zh}</span>
              <span className="setp__kind-t">{RISK_LABEL[k].guidance}</span>
            </li>
          ))}
        </ul>
        <h3 className="setp__sub-h">硬性阻断项</h3>
        <ul className="setp__rules">
          <li>Global Publishing Lock 已开启。</li>
          <li>存在尚未处理的资源未找到的引用（已记录处理说明的除外）。</li>
          <li>存在未处理的极高风险标记。</li>
          <li>封面图尚未通过审核。</li>
        </ul>
        <h3 className="setp__sub-h">警告项（须逐条阅读，可由主编判断后放行）</h3>
        <ul className="setp__rules">
          <li>一手来源少于 2 份，或独立来源少于 3 家。</li>
          <li>存在带保留意见的引用，或已记录处理说明的失败项。</li>
          <li>整体可信度低于 70。</li>
          <li>涉及性暴力/家暴议题但未设置内容提示。</li>
        </ul>
        <p className="setp__rules-foot">
          公开版本见 <Link to="/method">方法与标准</Link>。
        </p>
      </PanelCard>

      {/* ---------------------------- engines ----------------------------- */}
      <PanelCard title="引擎分配" icon="sparkle" subtitle="检索可以换，改写不行">
        <div className="setp__jobs">
          <div className="setp__job">
            <div className="setp__job-head">
              <h3 className="setp__job-h">资料检索</h3>
              <Badge tone="info" size="sm">可选择</Badge>
            </div>
            <p className="setp__job-t">
              每晚跨语种搜索链接、打开引用指向的材料、判断资源是否可取得。
              这是重复性工作，用免费或自托管的开源模型即可，不必消耗付费算力。
            </p>
            <ul className="setp__engines">
              {enginesFor('retrieval').map((e) => {
                const on = state.engines.retrieval === e.id
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={cx('setp__engine', on && 'setp__engine--on')}
                      aria-pressed={on}
                      onClick={() => {
                        dispatch({ type: 'set-retrieval-engine', engineId: e.id })
                        toast(`资料检索改为使用 ${e.name}。`, 'go')
                      }}
                    >
                      <span className="setp__engine-top">
                        <span className="setp__engine-n">{e.name}</span>
                        <span className="setp__engine-cost">{e.cost}</span>
                      </span>
                      <span className="setp__engine-t">{e.note}</span>
                      {on && <span className="setp__engine-on"><Icon name="check" size={13} /> 当前使用</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="setp__job setp__job--fixed">
            <div className="setp__job-head">
              <h3 className="setp__job-h">起草与改写</h3>
              <Badge tone="neutral" size="sm">固定</Badge>
            </div>
            <p className="setp__job-t">
              控制端内的起草、Further Vibe Coding 的每一次改写、以及对文章结构的任何修改。
            </p>
            <div className="setp__engine setp__engine--locked">
              <span className="setp__engine-top">
                <span className="setp__engine-n">{ENGINE_MAP[state.engines.authoring]?.name ?? 'Claude'}</span>
                <span className="setp__engine-cost">
                  <Icon name="lock" size={12} /> 不可更改
                </span>
              </span>
              <span className="setp__engine-t">
                改写会直接进入版本历史并可能被采用为正文，因此不开放切换。
              </span>
            </div>
          </div>
        </div>
      </PanelCard>

      {/* ------------------------- brief settings ------------------------- */}
      <PanelCard title="简报与通知" icon="mail" subtitle="原型不会真的发送邮件">
        <div className="setp__brief">
          <Field label="发送时间（UTC）" htmlFor="setp-time">
            <TextInput id="setp-time" type="time" value={briefTime} onChange={(ev) => setBriefTime(ev.target.value)} />
          </Field>
          <Field label="收件地址" htmlFor="setp-mail" hint="原型中固定为占位地址">
            <TextInput id="setp-mail" value="editor@demo.prism.invalid" readOnly />
          </Field>
        </div>
        <h3 className="setp__sub-h">包含哪些板块</h3>
        <div className="setp__sections">
          {([
            ['topFive', '今日五个重要事件'],
            ['pending', '待审草稿'],
            ['research', '新发表的研究'],
            ['claims', '正在传播的可疑说法'],
            ['risks', '高风险提醒'],
            ['citations', '资源未找到'],
          ] as const).map(([key, label]) => (
            <Checkbox
              key={key}
              checked={sections[key]}
              onChange={(v) => setSections((s) => ({ ...s, [key]: v }))}
              label={label}
            />
          ))}
        </div>
        <p className="setp__rules-foot">
          无论勾选什么，简报都只承载摘要与安全链接。审批与发布控件不会、也不能出现在邮件里。
        </p>
      </PanelCard>

      {/* --------------------------- principles --------------------------- */}
      <PanelCard title="这套系统的约束" icon="scale">
        <ul className="setp__principles">
          <li><strong>自动编辑台没有发布权限。</strong>它能搜集、合并、核实、起草、生成素材与检查风险，最后只能移交等待审批。</li>
          <li><strong>批准与发布是两件事。</strong>发布锁开启时，批准会被记录，内容不会公开。</li>
          <li><strong>修改不覆盖原稿。</strong>每次自然语言指令都生成新版本提案，采用前需再次确认，旧快照永久保留。</li>
          <li><strong>失败不会被抹掉。</strong>资源未找到的引用即使已记录处理说明，也仍留在记录中。</li>
          <li><strong>不采用的选题保留理由。</strong>被放弃的线索留在信号页上，不会静默消失。</li>
        </ul>
      </PanelCard>

      {/* --------------------------- demo reset --------------------------- */}
      <PanelCard title="演示数据" icon="database" tone="warn">
        <p className="setp__rules-t">
          你在这个原型里做的每一个决定（批准、排程、发布、撤回、采用版本、开关发布锁）都保存在浏览器的
          <code className="u-mono"> localStorage</code>（键 <code className="u-mono">prism.console.v1</code>）中，
          不会离开这台设备。重置会丢弃全部操作，回到初始演示状态。
        </p>
        <button type="button" className="setp__btn setp__btn--danger" onClick={() => setResetting(true)}>
          <Icon name="refresh" size={15} /> 重置为初始演示数据
        </button>
      </PanelCard>

      {/* ------------------------------ modals ---------------------------- */}
      <Modal
        open={engaging}
        onClose={() => setEngaging(false)}
        title="开启 Global Publishing Lock"
        subtitle="这会立即暂停全站的公开发布"
        tone="danger"
        footer={
          <>
            <button type="button" className="setp__btn setp__btn--quiet" onClick={() => setEngaging(false)}>取消</button>
            <button
              type="button"
              className="setp__btn setp__btn--danger"
              disabled={reason.trim().length < 8 || phrase.trim() !== CONFIRM_PHRASE || !ack}
              onClick={engage}
            >
              开启发布锁
            </button>
          </>
        }
      >
        <ul className="setp__consequences">
          <li>所有公开发布立即暂停，<strong>包括已排程的 {sel.scheduled(state).length} 篇内容</strong>。</li>
          <li>「批准并立即发布」将只记录批准，不会公开任何内容。</li>
          <li>已发布的内容保持可访问；发布锁不会下架任何东西。</li>
          <li>开启与解除都会写入操作记录，附时间、执行人与原因。</li>
        </ul>
        <Field label="开启原因" hint="至少 8 个字。这条理由会长期保留在操作记录中。" required>
          <TextArea
            rows={3}
            value={reason}
            onChange={(ev) => setReason(ev.target.value)}
            placeholder="例：来源库出现一批 URL 同步异常，需先确认既有引用未受影响。"
          />
        </Field>
        <Checkbox
          checked={ack}
          onChange={setAck}
          label="我已了解这会暂停已排程内容的发布"
        />
        <Field label={`键入「${CONFIRM_PHRASE}」以确认`} required>
          <TextInput value={phrase} onChange={(ev) => setPhrase(ev.target.value)} placeholder={CONFIRM_PHRASE} />
        </Field>
      </Modal>

      <Modal
        open={releasing}
        onClose={() => setReleasing(false)}
        title="解除 Global Publishing Lock"
        subtitle="发布流程将恢复正常"
        footer={
          <>
            <button type="button" className="setp__btn setp__btn--quiet" onClick={() => setReleasing(false)}>取消</button>
            <button
              type="button"
              className="setp__btn setp__btn--go"
              disabled={phrase.trim() !== RELEASE_PHRASE}
              onClick={release}
            >
              解除发布锁
            </button>
          </>
        }
      >
        <p className="setp__modal-t">
          解除之后，已批准与已排程的内容将重新进入发布流程——但每一次实际发布仍然要经过发布前校验，
          包括阻断项、警告项与敏感内容的二次确认。解除发布锁不会自动公开任何东西。
        </p>
        {lock.reason && (
          <p className="setp__modal-reason">
            <span className="setp__modal-k">当初开启的原因</span>
            {lock.reason}
          </p>
        )}
        <Field label={`键入「${RELEASE_PHRASE}」以确认`} required>
          <TextInput value={phrase} onChange={(ev) => setPhrase(ev.target.value)} placeholder={RELEASE_PHRASE} />
        </Field>
      </Modal>

      <Modal
        open={resetting}
        onClose={() => setResetting(false)}
        title="重置为初始演示数据"
        subtitle="这会丢弃你在本原型中做过的全部决定"
        tone="danger"
        footer={
          <>
            <button type="button" className="setp__btn setp__btn--quiet" onClick={() => setResetting(false)}>取消</button>
            <button
              type="button"
              className="setp__btn setp__btn--danger"
              onClick={() => { resetDemo(); setResetting(false); toast('已重置为初始演示数据。', 'info') }}
            >
              确认重置
            </button>
          </>
        }
      >
        <p className="setp__modal-t">
          审批状态、发布记录、采用过的版本、图像审批结果与发布锁状态都会回到初始值。
          这个操作只影响这台设备上的浏览器存储，无法撤销。
        </p>
      </Modal>
    </div>
  )
}
