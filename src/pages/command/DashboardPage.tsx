import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Article, ResearchItem, Signal, SuspiciousClaim } from '../../lib/types'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { SOURCE_TYPE_LABEL } from '../../lib/constants'
import { citationNumbers, cx, fmtDate, fmtDateTime, relTime } from '../../lib/util'
import {
  Badge, DemoTag, EmptyState, Icon, Meter, RiskChip, Segmented, Sparkline, StatusBadge, TopicChip, toast,
} from '../../components/common'
import { DistributionBars, WorldGraticule } from '../../components/charts'
import { PanelCard } from '../../components/command/PanelCard'
import { KpiTile } from '../../components/command/KpiTile'
import { PipelineTimeline } from '../../components/command/PipelineTimeline'
import './DashboardPage.css'

/**
 * 今日控制台 — the first screen the editor opens.
 *
 * Everything on this page is a decision surface, not a status wall: each number
 * links to the queue it stands for, each warning names the specific flag or the
 * specific failing citation, and the day ends where the automated desk always
 * ends — a handoff, because it cannot publish.
 */

/* ----------------------------- small helpers ----------------------------- */

const CORROBORATION: Record<Signal['corroboration'], { zh: string; tone: 'go' | 'warn' | 'hold' | 'neutral' }> = {
  'multi-source': { zh: '多来源印证', tone: 'go' },
  'single-source': { zh: '单一来源', tone: 'warn' },
  contested: { zh: '来源互相矛盾', tone: 'warn' },
  unverified: { zh: '尚未核实', tone: 'neutral' },
}

const SIGNAL_STATUS: Record<Signal['status'], string> = {
  new: '新线索',
  clustered: '已合并',
  drafted: '起草中',
  declined: '未采用',
}

const RESEARCH_TYPE: Record<ResearchItem['type'], string> = {
  'peer-reviewed': '同行评审',
  preprint: '预印本',
  'official-statistics': '官方统计',
  'ngo-study': '民间组织研究',
  'systematic-review': '系统综述',
}

const CLAIM_STATUS: Record<SuspiciousClaim['status'], { zh: string; tone: 'neutral' | 'warn' | 'go' }> = {
  watching: { zh: '观察中', tone: 'neutral' },
  checking: { zh: '核查进行中', tone: 'warn' },
  'published-check': { zh: '已发布核查', tone: 'go' },
}

const LANG_LABEL: Record<string, string> = {
  en: '英语', es: '西班牙语', fr: '法语', pt: '葡萄牙语', ar: '阿拉伯语',
  ru: '俄语', tr: '土耳其语', hi: '印地语', id: '印尼语', sw: '斯瓦希里语',
  'zh-Hans': '简体中文', 'zh-Hant': '繁体中文',
}

/** Schematic coordinates for the prototype's invented jurisdictions (0–100). */
const PLACE_XY: Record<string, [number, number]> = {
  '韦拉共和国': [23, 37],
  '北屿联合王国': [41, 19],
  '图兰共和国': [50, 29],
  '阿米拉特王国': [57, 45],
  '卡利桑邦': [69, 51],
  '东埃斯特里亚': [77, 32],
  '西埃斯特里亚': [71, 30],
  '塞尔瓦联邦': [29, 64],
  '马兰岛自治区': [86, 63],
}

const NON_PLACE = /多辖区|跨国|泛洲|跨区域/

function hash32(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function placeXY(label: string): [number, number] {
  const known = PLACE_XY[label]
  if (known) return known
  const h = hash32(label)
  return [12 + (h % 76), 16 + ((h >>> 9) % 62)]
}

/** A deterministic 7-point spread curve. Demo figure — labelled as such in the UI. */
function velocitySeries(id: string, velocity: number): number[] {
  let h = hash32(id)
  const out: number[] = []
  for (let i = 0; i < 7; i += 1) {
    h = Math.imul(h ^ (i + 7), 16777619) >>> 0
    const jitter = (h % 17) - 7
    const ramp = velocity * (0.4 + (0.6 * i) / 6)
    out.push(Math.max(1, Math.round(ramp + jitter)))
  }
  out[out.length - 1] = Math.max(1, Math.round(velocity))
  return out
}

/** Real per-day counts over the last `days` days, oldest first. */
function dayBuckets(dates: (string | undefined)[], today: string, days = 7): number[] {
  const end = new Date(`${today}T00:00:00Z`).getTime()
  const out = new Array<number>(days).fill(0)
  for (const iso of dates) {
    if (!iso) continue
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) continue
    const diff = Math.floor((end - t) / 86400000)
    if (diff >= 0 && diff < days) out[days - 1 - diff] += 1
  }
  return out
}

type DistKey = 'country' | 'language' | 'type'

/* ------------------------------- the page -------------------------------- */

export default function DashboardPage(): JSX.Element {
  const { state, dispatch } = usePrism()
  const [dist, setDist] = useState<DistKey>('country')

  const clock = `${state.today}T09:00:00Z`
  const summary = sel.deskSummary(state)
  const brief = sel.latestBrief(state)
  const pending = sel.pendingReview(state)
  const highRisk = sel.highRisk(state)
  const failing = sel.articlesWithFailedCitations(state)
  const scheduled = sel.scheduled(state)
  const published = sel.published(state)
  const updates = sel.needsUpdate(state)
  const run = sel.latestPipeline(state)
  const locked = state.lock.engaged

  const byId = useMemo(() => new Map(state.articles.map((a) => [a.id, a])), [state.articles])

  const topSignals = useMemo(() => {
    const fromBrief = (brief?.topFive ?? [])
      .map((t) => {
        const signal = state.signals.find((s) => s.id === t.signalId)
        return signal ? { signal, why: t.why } : null
      })
      .filter((x): x is { signal: Signal; why: string } => x !== null)
    if (fromBrief.length > 0) return fromBrief.slice(0, 5)
    return sel.topSignals(state, 5).map((signal) => ({ signal, why: signal.newsValueBasis }))
  }, [brief, state])

  const research = useMemo(
    () => [...state.research].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4),
    [state.research],
  )

  const claims = useMemo(
    () => [...state.suspiciousClaims].sort((a, b) => b.velocity - a.velocity).slice(0, 4),
    [state.suspiciousClaims],
  )

  const publishSpark = useMemo(
    () => dayBuckets(state.articles.map((a) => a.publishedAt), state.today),
    [state.articles, state.today],
  )
  const intakeSpark = useMemo(
    () => dayBuckets(state.articles.map((a) => a.createdAt), state.today),
    [state.articles, state.today],
  )

  const distData = useMemo(() => {
    if (dist === 'language') {
      return sel.languageDistribution(state).map((d) => ({ label: LANG_LABEL[d.label] ?? d.label, value: d.value }))
    }
    if (dist === 'type') {
      return sel.sourceTypeDistribution(state).map((d) => ({
        label: SOURCE_TYPE_LABEL[d.label as keyof typeof SOURCE_TYPE_LABEL]?.zh ?? d.label,
        value: d.value,
      }))
    }
    return sel.countryDistribution(state)
  }, [dist, state])

  const mapPoints = useMemo(
    () =>
      sel.countryDistribution(state)
        .filter((d) => !NON_PLACE.test(d.label))
        .map((d) => {
          const [x, y] = placeXY(d.label)
          return { label: d.label, x, y, value: d.value }
        }),
    [state],
  )

  const coverage = brief && brief.coverage.countries > 0
    ? brief.coverage
    : {
      countries: summary.countriesToday,
      languages: summary.languagesToday,
      primaryDocs: summary.primaryDocsToday,
      clustersMerged: state.signals.reduce((n, s) => n + s.mergedFrom.length, 0),
    }

  return (
    <div className="cdash">
      {/* ------------------------------ header ----------------------------- */}
      <header className="cdash__hero">
        <div className="cdash__herotext">
          <p className="u-eyebrow">PRISM COMMAND · {fmtDate(state.today)}</p>
          <h1 className="cdash__title">今日控制台</h1>
          <p className="cdash__greeting">
            {brief?.greeting
              ?? '自动编辑台已完成今日的搜集、合并与起草，全部结果都停在这里等待你的判断。'}
          </p>
          <p className="cdash__standing">
            <span className="cdash__standingicon" aria-hidden="true"><Icon name="shield" size={13} /></span>
            <span>
              自动编辑台完成搜集、去重、资源检索、起草与风险标记；
              <strong>批准与公开发布只有你能做</strong>，且始终受 Global Publishing Lock 约束。
            </span>
          </p>
        </div>

        <div className="cdash__heroside">
          <dl className="cdash__coverage">
            <div className="cdash__cov">
              <dt>覆盖辖区</dt>
              <dd className="u-num">{coverage.countries}</dd>
            </div>
            <div className="cdash__cov">
              <dt>语言</dt>
              <dd className="u-num">{coverage.languages}</dd>
            </div>
            <div className="cdash__cov">
              <dt>一手材料</dt>
              <dd className="u-num">{coverage.primaryDocs}</dd>
            </div>
            <div className="cdash__cov">
              <dt>合并重复报道</dt>
              <dd className="u-num">{coverage.clustersMerged}</dd>
            </div>
          </dl>
          <div className="cdash__heroactions">
            <Link className="cdash__btn cdash__btn--primary" to="/command/queue">
              <Icon name="list" size={14} />
              进入审批队列
            </Link>
            <Link className="cdash__btn" to="/command/brief">
              <Icon name="mail" size={14} />
              今日简报
            </Link>
          </div>
          <DemoTag />
        </div>
      </header>

      {/* -------------------------------- KPI ------------------------------ */}
      <section className="cdash__kpis" aria-label="今日关键指标">
        <KpiTile
          label="待审文章"
          value={summary.pending}
          icon="eye"
          tone={summary.pending > 0 ? 'warn' : 'go'}
          to="/command/queue"
          hint={summary.pending > 0 ? '等待人工审核，自动流程不会自行发布' : '队列已清空'}
          spark={intakeSpark}
        />
        <KpiTile
          label="高风险"
          value={summary.highRisk}
          icon="alert"
          tone={summary.highRisk > 0 ? 'stop' : 'go'}
          to="/command/queue"
          hint={summary.highRisk > 0 ? '含高或极高风险项，发布前需逐项处理' : '无未处理的高风险项'}
        />
        <KpiTile
          label="资源未找到"
          value={summary.citationFailures}
          icon="link"
          tone={summary.citationFailures > 0 ? 'stop' : 'go'}
          to="/command/queue"
          hint={summary.citationFailures > 0 ? '硬性阻断：必须修复或删除相关陈述' : '全部引用可回溯'}
        />
        <KpiTile
          label="已排程"
          value={summary.scheduled}
          icon="clock"
          tone={locked && summary.scheduled > 0 ? 'stop' : 'neutral'}
          to="/command/settings"
          hint={locked ? '发布锁开启中，排程内容不会发出' : '发布前会再次校验风险与引用'}
        />
        <KpiTile
          label="已发布"
          value={summary.published}
          icon="check-double"
          tone="neutral"
          to="/"
          hint="公众站可见；更正记录永久公开"
          spark={publishSpark}
        />
        <KpiTile
          label="需更新"
          value={summary.updatesNeeded}
          icon="refresh"
          tone={summary.updatesNeeded > 0 ? 'warn' : 'neutral'}
          to="/command/queue"
          hint={summary.updatesNeeded > 0 ? '已发布内容出现新事实，不做静默修改' : '暂无待更新条目'}
        />
      </section>

      <div className="cdash__grid">
        {/* --------------------------- top signals -------------------------- */}
        <PanelCard
          className="cdash__c7"
          title="今日五个重要事件"
          subtitle="按选题价值排序；合并同源报道后逐条给出来源可得状态。"
          icon="target"
          action={<Link className="cdash__more" to="/command/signals">全部信号<Icon name="chevron-right" size={13} /></Link>}
        >
          {topSignals.length === 0 ? (
            <EmptyState
              title="今日暂无信号"
              hint="自动编辑台的搜集阶段尚未产出可评估的线索。"
              icon="target"
            />
          ) : (
            <ol className="cdash__signals">
              {topSignals.map(({ signal, why }, i) => {
                const corr = CORROBORATION[signal.corroboration]
                const linked = signal.linkedArticleId ? byId.get(signal.linkedArticleId) : undefined
                return (
                  <li className="cdash__signal" key={signal.id}>
                    <span className="cdash__rank u-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <div className="cdash__signalbody">
                      <p className="cdash__signalhead">
                        <Link className="cdash__signaltitle" to="/command/signals">{signal.headline}</Link>
                      </p>
                      <p className="cdash__why">{why}</p>

                      <ul className="cdash__facts">
                        <li className="cdash__fact">
                          <Icon name="globe" size={12} />
                          {signal.country} · {signal.region}
                        </li>
                        <li className="cdash__fact">
                          <Icon name="quote" size={12} />
                          {LANG_LABEL[signal.language] ?? signal.language}
                        </li>
                        <li className="cdash__fact u-num">
                          <Icon name="layers" size={12} />
                          合并 {signal.reportCount} 篇报道
                          {signal.mergedFrom.length > 0 ? `（${signal.mergedFrom.length} 个来源群）` : ''}
                        </li>
                        <li className="cdash__fact u-num">
                          <Icon name="database" size={12} />
                          独立来源 {signal.independentSourceCount} · 一手 {signal.primarySourceCount}
                        </li>
                      </ul>

                      <div className="cdash__signalmeta">
                        <Badge tone={corr.tone === 'neutral' ? 'neutral' : corr.tone === 'go' ? 'go' : 'hold'}
                          icon={<Icon name={signal.corroboration === 'multi-source' ? 'check-double' : 'alert'} size={11} />}>
                          {corr.zh}
                        </Badge>
                        <span className="cdash__newsvalue u-num" title={signal.newsValueBasis}>
                          选题价值 {signal.newsValue}
                        </span>
                        {signal.topics.slice(0, 2).map((t) => <TopicChip key={t} topic={t} size="sm" />)}
                      </div>

                      <p className="cdash__outcome">
                        {linked ? (
                          <>
                            <span className="cdash__outcomelabel">已成稿：</span>
                            <Link className="cdash__outcomelink" to={`/command/article/${linked.id}`}>{linked.title}</Link>
                            <StatusBadge status={linked.status} />
                          </>
                        ) : signal.status === 'declined' ? (
                          <>
                            <span className="cdash__outcomelabel">状态：</span>
                            <Badge tone="stop" icon={<Icon name="minus" size={11} />}>未采用</Badge>
                            <span className="cdash__outcometext">{signal.declineReason ?? '未记录理由。'}</span>
                          </>
                        ) : signal.status === 'drafted' ? (
                          <>
                            <span className="cdash__outcomelabel">状态：</span>
                            <Badge tone="hold" icon={<Icon name="edit" size={11} />}>起草中</Badge>
                            <span className="cdash__outcometext">编辑台正在写稿，尚未进入审核队列。</span>
                          </>
                        ) : (
                          <>
                            <span className="cdash__outcomelabel">状态：</span>
                            <Badge tone="neutral">{SIGNAL_STATUS[signal.status]}</Badge>
                            <button
                              type="button"
                              className="cdash__inlinebtn"
                              onClick={() => {
                                dispatch({ type: 'signal-promote', signalId: signal.id })
                                toast(`已转入起草：${signal.headline}`, 'go')
                              }}
                            >
                              <Icon name="play" size={12} />
                              转入起草
                            </button>
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </PanelCard>

        {/* --------------------------- review queue ------------------------- */}
        <PanelCard
          className="cdash__c5"
          title="待审核文章"
          subtitle="只有你能批准。以下为队列中最近更新的稿件。"
          icon="list"
          action={<Link className="cdash__more" to="/command/queue">队列（{pending.length}）<Icon name="chevron-right" size={13} /></Link>}
        >
          {pending.length === 0 ? (
            <EmptyState title="审批队列已清空" hint="新的草稿会在自动编辑台完成起草后出现在这里。" icon="check-double" />
          ) : (
            <ul className="cdash__queue">
              {pending.slice(0, 5).map((a) => {
                const profile = sel.sourceProfile(a, state)
                const risks = sel.openRisks(a)
                const fails = sel.failedChecks(a).length
                const worst = risks.some((r) => r.severity === 'critical')
                  ? '极高'
                  : risks.some((r) => r.severity === 'high') ? '高' : null
                return (
                  <li className="cdash__qrow" key={a.id}>
                    <div className="cdash__qhead">
                      <Link className="cdash__qtitle" to={`/command/article/${a.id}`}>{a.title}</Link>
                      <StatusBadge status={a.status} />
                    </div>

                    <Meter value={a.confidence} label="可信度" size="sm" />

                    <ul className="cdash__qmeta">
                      <li className="cdash__fact u-num">
                        <Icon name="database" size={12} />
                        来源 {profile.total} · 一手 {profile.primary} · 独立 {profile.independent}
                      </li>
                      <li className={cx('cdash__fact', 'u-num', risks.length > 0 && 'cdash__fact--warn')}>
                        <Icon name="flag" size={12} />
                        未处理风险 {risks.length}{worst ? `（最高：${worst}）` : ''}
                      </li>
                      <li className={cx('cdash__fact', 'u-num', fails > 0 && 'cdash__fact--stop')}>
                        <Icon name="link" size={12} />
                        引用失败 {fails}
                      </li>
                      <li className="cdash__fact">
                        <Icon name="clock" size={12} />
                        更新于 {relTime(a.updatedAt, clock)}
                      </li>
                    </ul>
                  </li>
                )
              })}
            </ul>
          )}
        </PanelCard>

        {/* ----------------------------- high risk -------------------------- */}
        <PanelCard
          className="cdash__c6"
          title="高风险内容"
          subtitle="逐条列出具体标记；带锁的标记在发布前必须键入确认短语。"
          icon="alert"
          tone={highRisk.length > 0 ? 'warn' : 'default'}
        >
          {highRisk.length === 0 ? (
            <EmptyState title="没有未处理的高风险项" hint="低与中风险项仍会在稿件页逐条列出。" icon="shield" />
          ) : (
            <ul className="cdash__risks">
              {highRisk.map((a) => {
                const flags = sel.openRisks(a).filter((r) => r.severity === 'high' || r.severity === 'critical')
                const others = sel.openRisks(a).length - flags.length
                const alert = brief?.riskAlerts.find((r) => r.articleId === a.id)
                return (
                  <li className="cdash__riskrow" key={a.id}>
                    <div className="cdash__qhead">
                      <Link className="cdash__qtitle" to={`/command/article/${a.id}`}>{a.title}</Link>
                      <StatusBadge status={a.status} />
                    </div>
                    {alert ? <p className="cdash__risknote">{alert.note}</p> : null}
                    <div className="cdash__riskchips">
                      {flags.map((f) => <RiskChip key={f.id} flag={f} compact />)}
                    </div>
                    <ul className="cdash__riskdetail">
                      {flags.map((f) => <li key={f.id}>{f.note}</li>)}
                    </ul>
                    {others > 0 ? <p className="cdash__riskmore">另有 {others} 项中低风险标记，见稿件页。</p> : null}
                  </li>
                )
              })}
            </ul>
          )}
        </PanelCard>

        {/* -------------------------- citation failures --------------------- */}
        <PanelCard
          className="cdash__c6"
          title="资源未找到"
          subtitle="硬性阻断项：在修复或删除相关陈述之前，这些稿件无法发布。"
          icon="link"
          tone={failing.length > 0 ? 'warn' : 'default'}
        >
          {failing.length === 0 ? (
            <EmptyState title="所有引用都可回溯到具体记录" hint="带保留意见的引用仍会在稿件页标注。" icon="check" />
          ) : (
            <ul className="cdash__cites">
              {failing.map((a) => {
                const numbers = citationNumbers(a)
                return (
                  <li className="cdash__citerow" key={a.id}>
                    <div className="cdash__qhead">
                      <Link className="cdash__qtitle" to={`/command/article/${a.id}`}>{a.title}</Link>
                      <button
                        type="button"
                        className="cdash__inlinebtn"
                        onClick={() => {
                          dispatch({ type: 'recheck-citations', articleId: a.id })
                          toast('已要求自动编辑台重新核查该篇全部引用。', 'info')
                        }}
                      >
                        <Icon name="refresh" size={12} />
                        重新核查
                      </button>
                    </div>
                    <ul className="cdash__citelist">
                      {sel.failedChecks(a).map((chk) => {
                        const cit = a.citations.find((c) => c.id === chk.citationId)
                        return (
                          <li className="cdash__cite" key={chk.citationId}>
                            <span className="cdash__citen u-mono">[{numbers.get(chk.citationId) ?? '?'}]</span>
                            <span className="cdash__citebody">
                              <span className="cdash__citeclaim">{cit?.claim ?? '（该引用已不在正文中）'}</span>
                              <span className="cdash__citereason">
                                <Icon name="x" size={11} />
                                {chk.reason}
                              </span>
                              <span className="cdash__citetime">检查于 {fmtDateTime(chk.checkedAt)}</span>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                )
              })}
            </ul>
          )}
        </PanelCard>

        {/* ----------------------------- research --------------------------- */}
        <PanelCard
          className="cdash__c6"
          title="最新研究"
          subtitle="研究雷达抓到的新证据；强度与局限一并记录，不做过度解读。"
          icon="book"
          action={<Link className="cdash__more" to="/command/research">研究雷达<Icon name="chevron-right" size={13} /></Link>}
        >
          {research.length === 0 ? (
            <EmptyState title="今日没有新的研究入库" hint="雷达会持续跟踪同行评审、官方统计与系统综述。" icon="book" />
          ) : (
            <ul className="cdash__research">
              {research.map((r) => (
                <li className="cdash__rrow" key={r.id}>
                  <div className="cdash__rhead">
                    <Link className="cdash__qtitle" to="/command/research">{r.title}</Link>
                    <Badge tone="info">{RESEARCH_TYPE[r.type]}</Badge>
                  </div>
                  <p className="cdash__rmeta u-num">{r.publisher} · {fmtDate(r.date)}</p>
                  <p className="cdash__rsummary">{r.summary}</p>
                  <p className="cdash__rline">
                    <span className="cdash__rlabel cdash__rlabel--go">可支持</span>
                    {r.strength}
                  </p>
                  <p className="cdash__rline">
                    <span className="cdash__rlabel cdash__rlabel--warn">不能支持</span>
                    {r.limitation}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        {/* -------------------------- suspicious claims --------------------- */}
        <PanelCard
          className="cdash__c6"
          title="正在传播的可疑说法"
          subtitle="按传播速度排序。传播速度为演示数值，不代表真实平台数据。"
          icon="chart"
          action={<Link className="cdash__more" to="/command/research">全部说法<Icon name="chevron-right" size={13} /></Link>}
        >
          {claims.length === 0 ? (
            <EmptyState title="没有正在监测的说法" hint="新的可疑说法会在核查开始前先进入观察名单。" icon="alert" />
          ) : (
            <ul className="cdash__claims">
              {claims.map((c) => {
                const meta = CLAIM_STATUS[c.status]
                const check = c.linkedFactCheckId
                  ? state.factChecks.find((f) => f.id === c.linkedFactCheckId)
                  : undefined
                return (
                  <li className="cdash__claim" key={c.id}>
                    <p className="cdash__claimtext">「{c.claim}」</p>
                    <div className="cdash__claimrow">
                      <span className="cdash__spark">
                        <Sparkline
                          points={velocitySeries(c.id, c.velocity)}
                          width={92}
                          height={26}
                          tone="var(--accent)"
                          label={`传播速度指数（演示）· 最新 ${c.velocity}`}
                        />
                      </span>
                      <span className="cdash__velocity u-num">
                        <span className="cdash__velocitynum">{c.velocity}</span>
                        <span className="cdash__velocitylabel">传播速度指数</span>
                      </span>
                      <Badge tone={meta.tone === 'go' ? 'go' : meta.tone === 'warn' ? 'hold' : 'neutral'}>{meta.zh}</Badge>
                    </div>
                    <p className="cdash__claimspread">{c.spread}</p>
                    <p className="cdash__claimvenues">
                      <Icon name="globe" size={11} />
                      流传于：{c.venues.join('、')}
                    </p>
                    {check ? (
                      <Link className="cdash__more" to={`/fact-checks/${check.id}`}>
                        查看已发布的核查<Icon name="chevron-right" size={13} />
                      </Link>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </PanelCard>

        {/* --------------------- scheduled & published ---------------------- */}
        <PanelCard
          className="cdash__c7"
          title="已排程与已发布"
          subtitle="排程内容在发布前会再次校验；发布锁开启期间一律不发出。"
          icon="clock"
          tone={locked && scheduled.length > 0 ? 'stop' : 'default'}
        >
          <div className="cdash__split">
            <section className="cdash__half">
              <h3 className="cdash__subhead">已排程（{scheduled.length}）</h3>
              {scheduled.length === 0 ? (
                <p className="cdash__none">没有排程中的内容。</p>
              ) : (
                <ul className="cdash__list">
                  {scheduled.map((a) => (
                    <li className="cdash__listrow" key={a.id}>
                      <Link className="cdash__qtitle" to={`/command/article/${a.id}`}>{a.title}</Link>
                      <p className="cdash__listmeta u-num">
                        <Icon name="calendar" size={11} />
                        {a.scheduledFor ? fmtDateTime(a.scheduledFor) : '未设定时间'}
                      </p>
                      {locked ? (
                        <p className="cdash__blocked">
                          <Icon name="lock" size={11} />
                          发布锁开启，届时不会自动发出
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="cdash__half">
              <h3 className="cdash__subhead">最近发布（{published.length}）</h3>
              {published.length === 0 ? (
                <p className="cdash__none">尚未有对外发布的条目。</p>
              ) : (
                <ul className="cdash__list">
                  {published.slice(0, 5).map((a) => (
                    <li className="cdash__listrow" key={a.id}>
                      <Link className="cdash__qtitle" to={`/command/article/${a.id}`}>{a.title}</Link>
                      <p className="cdash__listmeta u-num">
                        <Icon name="check-double" size={11} />
                        {a.publishedAt ? fmtDateTime(a.publishedAt) : '时间缺失'}
                        {a.corrections.length > 0 ? ` · ${a.corrections.length} 条更正记录` : ''}
                      </p>
                      <Link className="cdash__more" to={`/article/${a.slug}`}>
                        在公众站查看<Icon name="arrow-up-right" size={12} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </PanelCard>

        {/* --------------------------- needs update ------------------------- */}
        <PanelCard
          className="cdash__c5"
          title="需要更新的旧文章"
          subtitle="已发布内容出现新事实时进入这里；本站不做静默修改。"
          icon="refresh"
          tone={updates.length > 0 ? 'warn' : 'default'}
        >
          {updates.length === 0 ? (
            <EmptyState title="没有待更新的条目" hint="出现新判决、新数据或新更正时会自动进入此队列。" icon="history" />
          ) : (
            <ul className="cdash__list">
              {updates.map((a: Article) => {
                const why = brief?.updateNeeded.find((u) => u.articleId === a.id)?.why
                return (
                  <li className="cdash__listrow" key={a.id}>
                    <div className="cdash__qhead">
                      <Link className="cdash__qtitle" to={`/command/article/${a.id}`}>{a.title}</Link>
                      <StatusBadge status={a.status} />
                    </div>
                    {why ? <p className="cdash__why">{why}</p> : null}
                    <p className="cdash__listmeta u-num">
                      <Icon name="clock" size={11} />
                      发布于 {a.publishedAt ? fmtDate(a.publishedAt) : '—'} · 最近更新 {relTime(a.updatedAt, clock)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </PanelCard>

        {/* --------------------------- distributions ------------------------ */}
        <PanelCard
          className="cdash__c12"
          title="全球议题与来源分布"
          subtitle="用来发现盲区：哪些辖区、哪些语言、哪一类材料被系统性地漏掉。"
          icon="globe"
          action={<Link className="cdash__more" to="/command/sources">来源库<Icon name="chevron-right" size={13} /></Link>}
        >
          <div className="cdash__geo">
            <figure className="cdash__map">
              <WorldGraticule
                points={mapPoints}
                title="今日覆盖的司法辖区（示意投影）"
                height={260}
              />
              <figcaption className="cdash__caption">
                坐标为示意排布，只用于观察覆盖是否集中在少数辖区，不能据此推断地理邻近关系或区域关联。
              </figcaption>
            </figure>

            <div className="cdash__bars">
              <Segmented<DistKey>
                value={dist}
                onChange={setDist}
                ariaLabel="切换分布口径"
                size="sm"
                options={[
                  { value: 'country', label: '按辖区', count: sel.countryDistribution(state).length },
                  { value: 'language', label: '按语言', count: sel.languageDistribution(state).length },
                  { value: 'type', label: '按来源类型', count: sel.sourceTypeDistribution(state).length },
                ]}
              />
              <div className="cdash__barswrap">
                <DistributionBars
                  data={distData}
                  limit={9}
                  unit={dist === 'country' ? '条目 / 信号' : '份来源'}
                />
              </div>
              <p className="cdash__caption">
                {dist === 'country'
                  ? '统计今日信号与全部条目提及的辖区次数；一条内容涉及多个辖区时会重复计入。'
                  : dist === 'language'
                    ? '统计来源库中每种语言的材料数量。语言分布是覆盖盲区最直接的指标。'
                    : '统计来源库中每类材料的数量。法律文本、判决与官方数据属于一手材料，优先于报道。'}
              </p>
            </div>
          </div>
        </PanelCard>

        {/* ----------------------------- pipeline --------------------------- */}
        <PanelCard
          className="cdash__c12"
          title="自动编辑台今日运行"
          subtitle="七个阶段的实际指标与日志；最后一步永远是移交，而不是发布。"
          icon="layers"
          action={<Link className="cdash__more" to="/command/audit">操作记录<Icon name="chevron-right" size={13} /></Link>}
        >
          {run ? (
            <PipelineTimeline run={run} />
          ) : (
            <EmptyState
              title="今日尚无自动编辑台运行记录"
              hint="运行结束后，这里会显示七个阶段的指标、日志与移交结果。"
              icon="layers"
            />
          )}
        </PanelCard>
      </div>

      <footer className="cdash__foot">
        <DemoTag compact />
        <span>
          本控制台中的全部条目、来源、辖区、机构与数据均为虚构演示内容，不构成真实报道或真实引用。
        </span>
      </footer>
    </div>
  )
}
