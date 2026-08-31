import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Article } from '../../lib/types'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { cx, fmtDate, sortBy } from '../../lib/util'
import { EmptyState, Icon, Segmented, Select, TextInput } from '../../components/common'
import { ReviewCard } from '../../components/command/ReviewCard'
import './QueuePage.css'

/**
 * 审批队列 — where the desk hands off and a human decides.
 *
 * Deliberately missing: a bulk-approve control. Every entry is opened, judged
 * and answered for individually, and every 退回 carries a written reason. The
 * page's job is to make it obvious at a glance which entries cannot be
 * published and exactly what is holding them.
 */

type TabKey =
  | 'all' | 'sources' | 'changes' | 'risk' | 'citations'
  | 'approved' | 'scheduled' | 'published' | 'update' | 'closed'

type SortKey = 'updated' | 'confidence' | 'risk' | 'sources'
type ViewKey = 'card' | 'row'

interface TabDef {
  key: TabKey
  label: string
  match: (a: Article) => boolean
  empty: { title: string; hint: string }
}

const CLOSED: Article['status'][] = ['archived', 'rejected', 'retracted']

function isHighRisk(a: Article): boolean {
  return sel.openRisks(a).some((r) => r.severity === 'high' || r.severity === 'critical')
}

const TABS: TabDef[] = [
  {
    key: 'all',
    label: '全部待审',
    match: (a) => sel.REVIEW_STATUSES.includes(a.status),
    empty: {
      title: '待审队列是空的',
      hint: '自动编辑台的下一轮移交会出现在这里。它可以搜集、起草、比对与检查，但永远不会自行发布。',
    },
  },
  {
    key: 'sources',
    label: '需补充来源',
    match: (a) => a.status === 'needs-sources',
    empty: {
      title: '没有条目在等待补充来源',
      hint: '当你在某一篇上选择「要求增加来源」并写下理由后，它会带着那段理由出现在这里。',
    },
  },
  {
    key: 'changes',
    label: '要求修改',
    match: (a) => a.status === 'changes-requested',
    empty: {
      title: '没有条目被要求修改',
      hint: '「退回重新研究」用于整篇重做：重新搜集、重新检索来源、重写。退回的条目会列在这里。',
    },
  },
  {
    key: 'risk',
    label: '高风险',
    match: (a) => isHighRisk(a) && !CLOSED.includes(a.status),
    empty: {
      title: '没有未处理的高风险条目',
      hint: '高风险与极高风险标记在这里聚合。极高风险直接阻断发布；性暴力、未成年人、进行中的司法程序与身份暴露则强制二次确认。',
    },
  },
  {
    key: 'citations',
    label: '引用失败',
    match: (a) => sel.failedChecks(a).length > 0 && !CLOSED.includes(a.status),
    empty: {
      title: '没有引用核查未通过的条目',
      hint: '未通过的引用都会列在这里。尚未处理的直接阻断发布；已记录处理说明的降为警告，但仍然公开可见 —— 失败不会被抹掉。',
    },
  },
  {
    key: 'approved',
    label: '已批准',
    match: (a) => a.status === 'approved',
    empty: {
      title: '没有已批准待发的条目',
      hint: '全局发布锁开启时，「批准并立即发布」只会记录批准；条目会停在这一格里等待解除。',
    },
  },
  {
    key: 'scheduled',
    label: '已排程',
    match: (a) => a.status === 'scheduled',
    empty: {
      title: '排程队列是空的',
      hint: '排程不等于免检：到点前系统会重新运行同一套校验，未通过则退回已批准状态。',
    },
  },
  {
    key: 'published',
    label: '已发布',
    match: (a) => a.status === 'published',
    empty: {
      title: '还没有已发布的条目',
      hint: '通过发布前确认流程的条目会出现在这里，并可从这里发起更正或撤回。',
    },
  },
  {
    key: 'update',
    label: '需更新',
    match: (a) => a.status === 'update-needed',
    empty: {
      title: '没有条目需要更新',
      hint: '已发布内容出现新证据时会进入这一格。我们不静默修改：更正、澄清、更新与撤回都留下公开记录。',
    },
  },
  {
    key: 'closed',
    label: '已归档与拒绝',
    match: (a) => CLOSED.includes(a.status),
    empty: {
      title: '归档与拒绝记录是空的',
      hint: '被拒绝、归档或撤回的条目连同当时写下的理由一并保留在这里，可随时检索。',
    },
  },
]

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'updated', label: '更新时间' },
  { key: 'confidence', label: '可信度' },
  { key: 'risk', label: '风险分数' },
  { key: 'sources', label: '来源数' },
]

function sortValue(a: Article, key: SortKey): number | string {
  switch (key) {
    case 'confidence': return a.confidence
    case 'risk': return sel.riskScore(a)
    case 'sources': return a.sourceIds.length
    case 'updated':
    default: return a.updatedAt
  }
}

export default function QueuePage(): JSX.Element {
  const { state } = usePrism()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [blockedOnly, setBlockedOnly] = useState(false)

  const rawTab = params.get('tab')
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : 'all'
  const rawSort = params.get('sort')
  const sortKey: SortKey = SORTS.some((s) => s.key === rawSort) ? (rawSort as SortKey) : 'updated'
  const dir: 'asc' | 'desc' = params.get('dir') === 'asc' ? 'asc' : 'desc'
  const view: ViewKey = params.get('view') === 'row' ? 'row' : 'card'

  function setParam(key: string, value: string): void {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
  }

  const counts = useMemo(() => {
    const out = {} as Record<TabKey, number>
    for (const t of TABS) out[t.key] = state.articles.filter(t.match).length
    return out
  }, [state.articles])

  /**
   * Two related sets: everything the publish gate currently refuses, and the
   * subset that is not yet public — the latter is what 「发布被阻断」 counts.
   */
  const { gateIssues, blockedForPublish } = useMemo(() => {
    const issues = new Set<string>()
    const blocked = new Set<string>()
    for (const a of state.articles) {
      if (CLOSED.includes(a.status)) continue
      if (sel.publishGate(a, state).blockers.length === 0) continue
      issues.add(a.id)
      if (a.status !== 'published') blocked.add(a.id)
    }
    return { gateIssues: issues, blockedForPublish: blocked }
  }, [state])

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0]

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = state.articles.filter((a) => {
      if (!activeTab.match(a)) return false
      if (blockedOnly && !gateIssues.has(a.id)) return false
      if (!q) return true
      const hay = [a.title, a.titleEn, a.standfirst, a.region, ...a.countries].join(' ').toLowerCase()
      return hay.includes(q)
    })
    return sortBy(filtered, (a) => sortValue(a, sortKey), dir)
  }, [state.articles, activeTab, blockedOnly, gateIssues, query, sortKey, dir])

  const blockingCiteCount = useMemo(
    () => state.articles.filter((a) => !CLOSED.includes(a.status) && sel.blockingChecks(a).length > 0).length,
    [state.articles],
  )
  const pending = counts.all
  const blockedInView = list.filter((a) => gateIssues.has(a.id)).length
  const filtersOn = blockedOnly || query.trim().length > 0

  const stats = [
    { key: 'pending', label: '待审条目', value: pending, hint: '需要你逐篇判断', tone: 'neutral' as const },
    { key: 'blocked', label: '发布被阻断', value: blockedForPublish.size, hint: '硬性下限未满足', tone: 'stop' as const },
    { key: 'risk', label: '高风险条目', value: counts.risk, hint: '含强制二次确认项', tone: 'warn' as const },
    {
      key: 'cite',
      label: '引用未通过并阻断',
      value: blockingCiteCount,
      hint: counts.citations > blockingCiteCount
        ? `另有 ${counts.citations - blockingCiteCount} 条仅剩已处理的未通过项`
        : '相关陈述在处理前不得公开',
      tone: 'stop' as const,
    },
  ]

  return (
    <div className="qpage">
      <header className="qpage__head">
        <p className="qpage__eyebrow u-eyebrow">PRISM Command · 审批</p>
        <h1 className="qpage__title">审批队列</h1>
        <p className="qpage__lede">
          自动编辑台已完成搜集、去重、资源检索、起草、配图与风险标记，并把结果移交到这里。
          它没有发布权限 —— 从这一步开始，每一个状态变更都由人作出，并带着署名与理由写入操作记录。
        </p>
        <p className="qpage__clock">
          <Icon name="calendar" size={13} />
          编辑日 {fmtDate(state.today)}
          <span className="qpage__sep" aria-hidden="true">·</span>
          共 {state.articles.length} 条演示条目
        </p>

        <ul className="qpage__stats">
          {stats.map((s) => (
            <li key={s.key} className={cx('qpage__stat', `qpage__stat--${s.tone}`)}>
              <span className="qpage__stat-v u-num">{s.value}</span>
              <span className="qpage__stat-l">{s.label}</span>
              <span className="qpage__stat-h">{s.hint}</span>
            </li>
          ))}
        </ul>
      </header>

      <section className="qpage__rule" aria-labelledby="qpage-rule">
        <span className="qpage__rule-glyph" aria-hidden="true"><Icon name="shield" size={16} /></span>
        <div className="qpage__rule-body">
          <h2 className="qpage__rule-title" id="qpage-rule">这里没有批量批准 —— 每篇都必须单独决定</h2>
          <p className="qpage__rule-text">
            本队列刻意不提供全选、批量批准或一键发布。批准是一次具体的判断：谁批的、依据什么、当时哪些警告被读过、
            哪些敏感内容被逐项确认过，都必须可回溯到某一个人和某一篇。退回同样如此 —— 没有写下理由就无法提交。
          </p>
          <p className="qpage__rule-links">
            <Link to="/command/audit">
              <Icon name="history" size={12} />
              查看操作记录
            </Link>
            <Link to="/command/settings">
              <Icon name="lock" size={12} />
              发布控制与全局发布锁
            </Link>
            <Link to="/method">
              <Icon name="book" size={12} />
              编辑方法与证据标准
            </Link>
          </p>
        </div>
      </section>

      <div className="qpage__controls">
        <Segmented<TabKey>
          ariaLabel="审批队列筛选"
          value={tab}
          onChange={(v) => setParam('tab', v)}
          size="sm"
          options={TABS.map((t) => ({ value: t.key, label: t.label, count: counts[t.key] }))}
        />

        <div className="qpage__tools">
          <div className="qpage__search">
            <span className="qpage__search-icon" aria-hidden="true"><Icon name="search" size={14} /></span>
            <TextInput
              type="search"
              value={query}
              placeholder="搜索标题、导语或辖区"
              aria-label="在当前筛选结果中搜索"
              onChange={(e) => setQuery(e.currentTarget.value)}
            />
          </div>

          <div className="qpage__tool">
            <label className="qpage__tool-label" htmlFor="qpage-sort">排序</label>
            <Select
              id="qpage-sort"
              value={sortKey}
              onChange={(e) => setParam('sort', e.currentTarget.value)}
            >
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
            <button
              type="button"
              className="qpage__dir"
              onClick={() => setParam('dir', dir === 'desc' ? 'asc' : 'desc')}
              aria-label={dir === 'desc' ? '当前为降序，点击改为升序' : '当前为升序，点击改为降序'}
            >
              <Icon name={dir === 'desc' ? 'chevron-down' : 'chevron-up'} size={14} />
              <span className="qpage__dir-text">{dir === 'desc' ? '降序' : '升序'}</span>
            </button>
          </div>

          <div className="qpage__tool">
            <span className="qpage__tool-label">视图</span>
            <Segmented<ViewKey>
              ariaLabel="队列视图"
              value={view}
              size="sm"
              onChange={(v) => setParam('view', v)}
              options={[
                { value: 'card', label: '卡片' },
                { value: 'row', label: '列表' },
              ]}
            />
          </div>

          <button
            type="button"
            className={cx('qpage__toggle', blockedOnly && 'qpage__toggle--on')}
            aria-pressed={blockedOnly}
            onClick={() => setBlockedOnly((v) => !v)}
          >
            <Icon name={blockedOnly ? 'check' : 'filter'} size={13} />
            只看有阻断项的条目
          </button>
        </div>

        <p className="qpage__result">
          <span className="u-num">{list.length}</span> 条结果
          {blockedInView > 0 ? (
            <span className="qpage__result-block">
              <Icon name="alert" size={12} />
              其中 {blockedInView} 条存在发布阻断项
            </span>
          ) : list.length > 0 ? (
            <span className="qpage__result-ok">
              <Icon name="check" size={12} />
              当前结果中没有阻断项
            </span>
          ) : null}
          {filtersOn ? (
            <button
              type="button"
              className="qpage__clear"
              onClick={() => { setQuery(''); setBlockedOnly(false) }}
            >
              清除筛选
            </button>
          ) : null}
        </p>
      </div>

      <div
        className={cx('qpage__list', view === 'card' ? 'qpage__list--card' : 'qpage__list--row')}
        role="tabpanel"
        aria-label={`${activeTab.label}（${list.length} 条）`}
      >
        {list.length > 0 ? (
          list.map((a) => (
            <ReviewCard key={a.id} article={a} variant={view === 'card' ? 'full' : 'row'} />
          ))
        ) : (
          <EmptyState
            icon={tab === 'citations' ? 'quote' : tab === 'risk' ? 'flag' : 'layers'}
            title={filtersOn ? '当前筛选下没有条目' : activeTab.empty.title}
            hint={filtersOn
              ? '搜索词或「只看有阻断项」的组合筛掉了这一格里的全部条目。'
              : activeTab.empty.hint}
            action={filtersOn ? (
              <button type="button" className="qpage__emptybtn" onClick={() => { setQuery(''); setBlockedOnly(false) }}>
                清除筛选
              </button>
            ) : (
              <Link className="qpage__emptybtn" to="/command">
                返回总览
                <Icon name="arrow-right" size={13} />
              </Link>
            )}
          />
        )}
      </div>

      <p className="qpage__foot">
        <Icon name="info" size={13} />
        本页全部条目、来源与数据均为演示用虚构内容，不构成真实报道或真实引用。
      </p>
    </div>
  )
}
