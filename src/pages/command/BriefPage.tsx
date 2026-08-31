import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { RISK_SEVERITY_LABEL } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { fmtDate, sortBy } from '../../lib/util'
import { Badge, Icon, Segmented, StatusBadge, toast } from '../../components/common'
import { PanelCard } from '../../components/command/PanelCard'
import './BriefPage.css'

/**
 * 每日编辑简报。
 *
 * Rendered twice: as the console sees it, and as it arrives in an inbox. The
 * email view exists to make one property visible — it carries summaries and
 * links only. There is no approve button in it, and there never will be:
 * publishing happens in front of the gate, not from a mail client.
 */

type View = 'console' | 'email'

export default function BriefPage() {
  const { state, dispatch } = usePrism()
  const [view, setView] = useState<View>('console')
  const briefs = useMemo(() => sortBy(state.briefs, (b) => b.date, 'desc'), [state.briefs])
  const [date, setDate] = useState(briefs[0]?.date ?? state.today)

  const brief = briefs.find((b) => b.date === date) ?? briefs[0]
  if (!brief) return <p className="brfp__none">尚无简报记录。</p>

  const article = (id: string) => state.articles.find((a) => a.id === id)
  const signal = (id: string) => state.signals.find((s) => s.id === id)
  const research = (id: string) => state.research.find((r) => r.id === id)

  function send() {
    dispatch({ type: 'brief-sent', briefId: brief.id })
    toast('已记录一次简报送出（原型不会真的发送邮件）。审批与发布仍只能在控制端完成。', 'go')
  }

  return (
    <div className="brfp">
      <header className="brfp__head">
        <div className="brfp__head-main">
          <p className="u-eyebrow">每日编辑简报 · Daily Editorial Brief</p>
          <h1 className="brfp__title">{fmtDate(brief.date)}</h1>
          <p className="brfp__to">
            送至 <span className="u-mono">{brief.sentTo}</span> · 仅含摘要与安全链接
          </p>
        </div>
        <div className="brfp__head-tools">
          <label className="brfp__date">
            <span className="brfp__date-k">日期</span>
            <select
              className="brfp__date-sel"
              value={date}
              onChange={(ev) => setDate(ev.target.value)}
              aria-label="选择简报日期"
            >
              {briefs.map((b) => <option key={b.date} value={b.date}>{fmtDate(b.date)}</option>)}
            </select>
          </label>
          <Segmented<View>
            ariaLabel="切换简报视图"
            size="sm"
            value={view}
            onChange={setView}
            options={[{ value: 'console', label: '控制端视图' }, { value: 'email', label: '邮件预览' }]}
          />
        </div>
      </header>

      {view === 'email' ? (
        <div className="brfp__mail-wrap">
          <div className="brfp__mail">
            <div className="brfp__mail-hdr">
              <span className="brfp__mail-from">PRISM 自动编辑台</span>
              <span className="brfp__mail-subj">每日编辑简报 · {fmtDate(brief.date)}</span>
              <span className="brfp__mail-to u-mono">收件人：{brief.sentTo}</span>
            </div>

            <div className="brfp__mail-body">
              <p className="brfp__mail-greet">{brief.greeting}</p>

              <h2 className="brfp__mail-h">今日五个重要事件</h2>
              <ol className="brfp__mail-list">
                {brief.topFive.map((t) => {
                  const s = signal(t.signalId)
                  return (
                    <li key={t.signalId}>
                      <strong>{s?.headline ?? t.signalId}</strong>
                      <span className="brfp__mail-why">{t.why}</span>
                      <span className="brfp__safe"><Icon name="link" size={11} /> 安全链接 · 今日信号</span>
                    </li>
                  )
                })}
              </ol>

              <h2 className="brfp__mail-h">建议优先处理</h2>
              <ol className="brfp__mail-list">
                {brief.recommended.map((r) => (
                  <li key={r.articleId}>
                    <strong>{article(r.articleId)?.title ?? r.articleId}</strong>
                    <span className="brfp__mail-why">{r.why}</span>
                    <span className="brfp__safe"><Icon name="link" size={11} /> 安全链接 · 文章工作台</span>
                  </li>
                ))}
              </ol>

              <h2 className="brfp__mail-h">待审草稿（{brief.pendingArticleIds.length}）</h2>
              <ul className="brfp__mail-flat">
                {brief.pendingArticleIds.map((id) => (
                  <li key={id}>{article(id)?.title ?? id}</li>
                ))}
              </ul>

              {brief.riskAlerts.length > 0 && (
                <>
                  <h2 className="brfp__mail-h brfp__mail-h--warn">高风险提醒（{brief.riskAlerts.length}）</h2>
                  <ul className="brfp__mail-flat">
                    {brief.riskAlerts.map((r, i) => (
                      <li key={`${r.articleId}-${i}`}>
                        [{RISK_SEVERITY_LABEL[r.severity].zh}] {article(r.articleId)?.title ?? r.articleId}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {brief.citationFailures.length > 0 && (
                <>
                  <h2 className="brfp__mail-h brfp__mail-h--warn">资源未找到（{brief.citationFailures.length}）</h2>
                  <ul className="brfp__mail-flat">
                    {brief.citationFailures.map((c) => (
                      <li key={c.citationId}>
                        {article(c.articleId)?.title ?? c.articleId} · <span className="u-mono">{c.citationId}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="brfp__mail-rule" />
              <p className="brfp__mail-notice">
                <Icon name="lock" size={13} />
                审批与发布只能在 PRISM Command 完成。本邮件中没有任何可以发布内容的按钮，
                所有链接都只会把你带到控制端的对应页面。
              </p>
              <p className="brfp__mail-foot">
                覆盖：{brief.coverage.countries} 个辖区 · {brief.coverage.languages} 个语种 ·
                {brief.coverage.primaryDocs} 份一手材料 · 合并 {brief.coverage.clustersMerged} 个聚类
              </p>
            </div>
          </div>
          <p className="brfp__mail-note">
            以上是简报在收件箱中的样子。它只承载摘要与链接：正文、图片、审批控件都不在邮件里。
            这不是为了简洁，而是为了确保发布决定必须发生在能看到发布闸门的地方。
          </p>
        </div>
      ) : (
        <div className="brfp__console">
          <PanelCard title="今日概要" icon="mail" className="brfp__greet">
            <p className="brfp__greet-t">{brief.greeting}</p>
            <div className="brfp__coverage">
              {[
                { n: brief.coverage.countries, k: '辖区' },
                { n: brief.coverage.languages, k: '语种' },
                { n: brief.coverage.primaryDocs, k: '一手材料' },
                { n: brief.coverage.clustersMerged, k: '合并聚类' },
              ].map((c) => (
                <span key={c.k} className="brfp__cov">
                  <span className="brfp__cov-n u-num">{c.n}</span>
                  <span className="brfp__cov-k">{c.k}</span>
                </span>
              ))}
            </div>
          </PanelCard>

          <PanelCard title="今日五个重要事件" icon="target">
            <ol className="brfp__five">
              {brief.topFive.map((t, i) => {
                const s = signal(t.signalId)
                return (
                  <li key={t.signalId} className="brfp__five-item">
                    <span className="brfp__five-n u-mono">{String(i + 1).padStart(2, '0')}</span>
                    <div className="brfp__five-body">
                      <p className="brfp__five-h">{s?.headline ?? t.signalId}</p>
                      <p className="brfp__five-why">{t.why}</p>
                      {s && (
                        <p className="brfp__five-meta">
                          {s.country} · {s.language} · {s.reportCount} 条报道 ·
                          {s.independentSourceCount} 个独立来源 · 选题价值 {s.newsValue}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
            <Link className="brfp__more" to="/command/signals">查看全部信号 <Icon name="arrow-right" size={13} /></Link>
          </PanelCard>

          <PanelCard title="建议优先处理" icon="pin">
            <ul className="brfp__rec">
              {brief.recommended.map((r) => {
                const a = article(r.articleId)
                if (!a) return null
                return (
                  <li key={r.articleId} className="brfp__rec-item">
                    <div className="brfp__rec-top">
                      <StatusBadge status={a.status} size="sm" />
                      <Link className="brfp__rec-link" to={`/command/article/${a.id}`}>{a.title}</Link>
                    </div>
                    <p className="brfp__rec-why">{r.why}</p>
                  </li>
                )
              })}
            </ul>
          </PanelCard>

          <PanelCard title={`待审草稿（${brief.pendingArticleIds.length}）`} icon="list">
            <ul className="brfp__flat">
              {brief.pendingArticleIds.map((id) => {
                const a = article(id)
                if (!a) return null
                const gate = sel.publishGate(a, state)
                return (
                  <li key={id} className="brfp__flat-item">
                    <StatusBadge status={a.status} size="sm" />
                    <Link className="brfp__flat-link" to={`/command/article/${a.id}`}>{a.title}</Link>
                    <span className="brfp__flat-meta">
                      可信度 {a.confidence} · {gate.blockers.length} 项阻断 · {gate.confirmations.length} 项二次确认
                    </span>
                  </li>
                )
              })}
            </ul>
            <Link className="brfp__more" to="/command/queue">进入审批队列 <Icon name="arrow-right" size={13} /></Link>
          </PanelCard>

          <PanelCard title="高风险提醒" icon="shield" tone={brief.riskAlerts.length ? 'warn' : 'default'}>
            {brief.riskAlerts.length === 0 ? (
              <p className="brfp__empty">今日没有未处理的高风险项。</p>
            ) : (
              <ul className="brfp__flat">
                {brief.riskAlerts.map((r, i) => (
                  <li key={`${r.articleId}-${i}`} className="brfp__flat-item">
                    <Badge tone={r.severity === 'critical' ? 'stop' : 'warn'} size="sm">
                      {RISK_SEVERITY_LABEL[r.severity].zh}
                    </Badge>
                    <Link className="brfp__flat-link" to={`/command/article/${r.articleId}`}>
                      {article(r.articleId)?.title ?? r.articleId}
                    </Link>
                    <span className="brfp__flat-meta">{r.note}</span>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>

          <PanelCard
            title="资源未找到"
            icon="link"
            tone={brief.citationFailures.length ? 'stop' : 'default'}
          >
            {brief.citationFailures.length === 0 ? (
              <p className="brfp__empty">没有阻断发布的资源未找到的引用。</p>
            ) : (
              <ul className="brfp__fails">
                {brief.citationFailures.map((c) => (
                  <li key={`${c.articleId}-${c.citationId}`} className="brfp__fail">
                    <div className="brfp__fail-top">
                      <Link className="brfp__flat-link" to={`/command/article/${c.articleId}`}>
                        {article(c.articleId)?.title ?? c.articleId}
                      </Link>
                      <span className="u-mono brfp__fail-id">{c.citationId}</span>
                    </div>
                    <p className="brfp__fail-t">{c.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>

          <PanelCard title="新发表的重要研究" icon="book">
            <ul className="brfp__flat">
              {brief.researchIds.map((id) => {
                const r = research(id)
                if (!r) return null
                return (
                  <li key={id} className="brfp__flat-item">
                    <Badge tone={r.type === 'preprint' ? 'warn' : 'info'} size="sm">
                      {r.type === 'preprint' ? '预印本' : r.type === 'peer-reviewed' ? '同行评审' : r.type === 'official-statistics' ? '官方统计' : r.type === 'systematic-review' ? '系统综述' : '民间研究'}
                    </Badge>
                    <span className="brfp__flat-link">{r.title}</span>
                    <span className="brfp__flat-meta">{r.limitation}</span>
                  </li>
                )
              })}
            </ul>
            <Link className="brfp__more" to="/command/research">研究雷达 <Icon name="arrow-right" size={13} /></Link>
          </PanelCard>

          <PanelCard title="需要更新的已发布文章" icon="refresh" tone={brief.updateNeeded.length ? 'warn' : 'default'}>
            {brief.updateNeeded.length === 0 ? (
              <p className="brfp__empty">没有待更新的已发布条目。</p>
            ) : (
              <ul className="brfp__flat">
                {brief.updateNeeded.map((u) => (
                  <li key={u.articleId} className="brfp__flat-item">
                    <StatusBadge status="update-needed" size="sm" />
                    <Link className="brfp__flat-link" to={`/command/article/${u.articleId}`}>
                      {article(u.articleId)?.title ?? u.articleId}
                    </Link>
                    <span className="brfp__flat-meta">{u.why}</span>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>
        </div>
      )}

      <div className="brfp__send">
        <button type="button" className="brfp__send-btn" onClick={send}>
          <Icon name="send" size={15} /> 发送今日简报
        </button>
        <p className="brfp__send-t">
          原型不会真的发送邮件——这个动作只会在操作记录中留下一条「简报已送出」。
          真实系统中，这封邮件同样只承载摘要与安全链接。
        </p>
      </div>
    </div>
  )
}
