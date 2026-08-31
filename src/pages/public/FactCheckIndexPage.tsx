import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import type { Article, FactCheck, TopicKey, VerdictKey } from '../../lib/types'
import { TOPICS, TOPIC_MAP, VERDICTS, VERDICT_MAP } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { cx, fmtDate, isPrimarySource } from '../../lib/util'
import {
  Badge, DemoTag, EmptyState, Field, Icon, Select, TextInput, TopicChip, VerdictBadge,
} from '../../components/common'

import './FactCheckIndexPage.css'

/**
 * 事实核查索引 — the fact-checking front door.
 *
 * The page is built around the eight-verdict ladder rather than around a list:
 * a reader who does not understand what 「缺乏足够证据」 means cannot read a
 * fact-check correctly, so the ladder is taught first — every rung carries its
 * shape glyph, its English gloss and, crucially, the evidence threshold it
 * demands — and only then used as the primary filter.
 *
 * Filter state lives in the query string, so a filtered view is a shareable
 * address and the console's cross-links (e.g. /method) can point at one rung.
 */

type SortKey = 'recent' | 'ladder' | 'sources'

const SORT_LABEL: Record<SortKey, string> = {
  recent: '最近核查在前',
  ladder: '按结论阶梯排序',
  sources: '来源数量多的在前',
}

const LADDER_INDEX: Record<VerdictKey, number> = VERDICTS.reduce(
  (acc, v, i) => ({ ...acc, [v.key]: i }),
  {} as Record<VerdictKey, number>,
)

interface CheckRow {
  check: FactCheck
  article: Article | undefined
  sourceCount: number
  primaryCount: number
  topics: TopicKey[]
  haystack: string
}

export default function FactCheckIndexPage(): JSX.Element {
  const { state } = usePrism()
  const [params, setParams] = useSearchParams()

  const verdict = (params.get('verdict') ?? 'all') as VerdictKey | 'all'
  const topic = (params.get('topic') ?? 'all') as TopicKey | 'all'
  const query = params.get('q') ?? ''
  const sort = ((params.get('sort') ?? 'recent') as SortKey)
  const activeSort: SortKey = sort in SORT_LABEL ? sort : 'recent'

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === 'all' || value === '') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  /* ------------------------------------------------------------------ *
   * Rows: every public check, resolved against its entry and its sources.
   * ------------------------------------------------------------------ */
  const rows = useMemo<CheckRow[]>(() => {
    const articleById = new Map(state.articles.map((a) => [a.id, a]))
    const sourceById = new Map(state.sources.map((s) => [s.id, s]))
    return sel.publicFactChecks(state).map((check) => {
      const article = articleById.get(check.articleId)
      const sourceIds = new Set<string>()
      for (const citationId of check.citationIds) {
        const citation = article?.citations.find((c) => c.id === citationId)
        if (citation) sourceIds.add(citation.sourceId)
      }
      const sources = Array.from(sourceIds, (id) => sourceById.get(id)).filter((s) => Boolean(s))
      return {
        check,
        article,
        sourceCount: sourceIds.size,
        primaryCount: sources.filter((s) => (s ? isPrimarySource(s) : false)).length,
        topics: article ? article.topics : [],
        haystack: [check.claim, check.summary, check.claimOrigin, article?.title ?? '']
          .join(' ')
          .toLowerCase(),
      }
    })
  }, [state])

  const q = query.trim().toLowerCase()

  const matchesTopic = (row: CheckRow) => topic === 'all' || row.topics.includes(topic)
  const matchesQuery = (row: CheckRow) => q === '' || row.haystack.includes(q)
  const matchesVerdict = (row: CheckRow) => verdict === 'all' || row.check.verdict === verdict

  /** Facet counts: each facet is counted with the OTHER filters applied. */
  const verdictCounts = useMemo(() => {
    const counts = new Map<VerdictKey, number>()
    for (const row of rows) {
      if (!matchesTopic(row) || !matchesQuery(row)) continue
      counts.set(row.check.verdict, (counts.get(row.check.verdict) ?? 0) + 1)
    }
    return counts
  }, [rows, topic, q])

  const topicCounts = useMemo(() => {
    const counts = new Map<TopicKey, number>()
    for (const row of rows) {
      if (!matchesVerdict(row) || !matchesQuery(row)) continue
      for (const key of row.topics) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [rows, verdict, q])

  const results = useMemo(() => {
    const filtered = rows.filter((row) => matchesVerdict(row) && matchesTopic(row) && matchesQuery(row))
    const sorted = [...filtered]
    if (activeSort === 'ladder') {
      sorted.sort((a, b) =>
        LADDER_INDEX[a.check.verdict] - LADDER_INDEX[b.check.verdict]
        || b.check.checkedAt.localeCompare(a.check.checkedAt))
    } else if (activeSort === 'sources') {
      sorted.sort((a, b) => b.sourceCount - a.sourceCount || b.check.checkedAt.localeCompare(a.check.checkedAt))
    } else {
      sorted.sort((a, b) => b.check.checkedAt.localeCompare(a.check.checkedAt))
    }
    return sorted
  }, [rows, verdict, topic, q, activeSort])

  const totalSources = useMemo(() => {
    const ids = new Set<string>()
    for (const row of rows) {
      const article = row.article
      if (!article) continue
      for (const citationId of row.check.citationIds) {
        const citation = article.citations.find((c) => c.id === citationId)
        if (citation) ids.add(citation.sourceId)
      }
    }
    return ids.size
  }, [rows])

  const entryCount = new Set(rows.map((r) => r.check.articleId)).size
  const revisedCount = rows.filter((r) => (r.check.history ?? []).length > 0).length
  const filtersActive = verdict !== 'all' || topic !== 'all' || q !== ''

  const insufficient = VERDICT_MAP['insufficient-evidence']
  const mostlyFalse = VERDICT_MAP['mostly-false']

  return (
    <div className="fcindex">
      {/* ------------------------------------------------------------ head -- */}
      <header className="fcindex__head u-shell">
        <p className="u-eyebrow">事实核查 · Fact-checks</p>
        <h1 className="fcindex__title">核查的是说法，不是人</h1>
        <p className="fcindex__lede">
          本站只核查<strong>具体的、可被证据检验的说法</strong>：一个能被指认出来源、能被独立材料支持或推翻的陈述。
          我们不核查立场、动机或身份，也不给任何一方打分。每一条核查都必须回答同一个问题 ——
          <em>什么样的新证据会改变这个结论？</em>
        </p>
        <div className="fcindex__stats">
          <div className="fcindex__stat">
            <span className="fcindex__stat-n u-num">{rows.length}</span>
            <span className="fcindex__stat-l">条公开核查</span>
          </div>
          <div className="fcindex__stat">
            <span className="fcindex__stat-n u-num">{entryCount}</span>
            <span className="fcindex__stat-l">个关联条目</span>
          </div>
          <div className="fcindex__stat">
            <span className="fcindex__stat-n u-num">{totalSources}</span>
            <span className="fcindex__stat-l">份被引用的材料</span>
          </div>
          <div className="fcindex__stat">
            <span className="fcindex__stat-n u-num">{revisedCount}</span>
            <span className="fcindex__stat-l">条结论曾被修订</span>
          </div>
          <DemoTag className="fcindex__demotag" />
        </div>
      </header>

      {/* ---------------------------------------------------------- ladder -- */}
      <section className="fcindex__ladder u-shell" aria-labelledby="fcindex-ladder-h">
        <div className="fcindex__ladder-head">
          <div>
            <h2 className="fcindex__h2" id="fcindex-ladder-h">结论阶梯：八级，每一级都有一个证据门槛</h2>
            <p className="fcindex__note">
              结论不是「真」与「假」两格。每一级对应编辑必须先能出示的东西 ——
              下面每一格右侧写的就是那道门槛。点选任意一级即可筛选下方列表；再次点击取消。
            </p>
          </div>
          <Link className="fcindex__inline-link" to="/method">
            <Icon name="book" size={14} />
            方法与标准全文
          </Link>
        </div>

        <ol className="fcindex__rungs">
          {VERDICTS.map((def, i) => {
            const count = verdictCounts.get(def.key) ?? 0
            const selected = verdict === def.key
            return (
              <li key={def.key} className="fcindex__rung-li">
                <button
                  type="button"
                  className={cx('fcindex__rung', selected && 'fcindex__rung--on')}
                  aria-pressed={selected}
                  onClick={() => setParam({ verdict: selected ? null : def.key })}
                >
                  <span className="fcindex__rung-ord u-mono" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="fcindex__rung-main">
                    <span className="fcindex__rung-badge">
                      <VerdictBadge verdict={def.key} size="md" showEn />
                    </span>
                    <span className="fcindex__rung-standard">
                      <span className="fcindex__rung-standard-k">需要满足</span>
                      {def.standard}
                    </span>
                  </span>
                  <span className="fcindex__rung-count">
                    <span className="fcindex__rung-count-n u-num">{count}</span>
                    <span className="fcindex__rung-count-l">条</span>
                    <span className="u-sr">{selected ? '（已选中，点击取消筛选）' : '（点击按此结论筛选）'}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        {/* The single most misread distinction on the ladder. */}
        <aside className="fcindex__misread" aria-labelledby="fcindex-misread-h">
          <p className="u-eyebrow fcindex__misread-eyebrow">阅读须知 · 最容易被读错的一处</p>
          <h3 className="fcindex__misread-h" id="fcindex-misread-h">
            「缺乏足够证据」<span aria-hidden="true"> ≠ </span>
            <span className="u-sr">不等于</span>「基本不实」
          </h3>
          <div className="fcindex__misread-grid">
            <div className="fcindex__misread-card">
              <VerdictBadge verdict="insufficient-evidence" size="md" showEn />
              <p className="fcindex__misread-say"><strong>它说的是：</strong>我们现在还不知道。</p>
              <p className="fcindex__misread-std">{insufficient.standard}</p>
            </div>
            <div className="fcindex__misread-card">
              <VerdictBadge verdict="mostly-false" size="md" showEn />
              <p className="fcindex__misread-say"><strong>它说的是：</strong>我们知道它与一手证据相悖。</p>
              <p className="fcindex__misread-std">{mostlyFalse.standard}</p>
            </div>
          </div>
          <p className="fcindex__misread-body">
            把前者读成后者，等于把「尚未被证实」当成「已被证伪」——
            这在报道边缘群体时的代价尤其高：证据的缺席往往不是因为事情没有发生，
            而是因为记录它的机构从未记录、或不愿公开。同理，「无法核实」记录的是<strong>取证受阻</strong>，
            不是对说法本身的判断，我们会写明是谁、在哪一步、以什么方式阻断了核查。
          </p>
        </aside>
      </section>

      {/* ----------------------------------------------------------- list -- */}
      <section className="fcindex__list-wrap u-shell" aria-labelledby="fcindex-list-h">
        <div className="fcindex__filters">
          <h2 className="fcindex__h2" id="fcindex-list-h">核查列表</h2>

          <div className="fcindex__filter-row">
            <div className="fcindex__filter fcindex__filter--search">
              <Field
                label="搜索说法"
                htmlFor="fcindex-q"
                hint="在被核查的说法、结论摘要与来源出处中匹配文字。"
              >
                <span className="fcindex__search">
                  <span className="fcindex__search-icon" aria-hidden="true">
                    <Icon name="search" size={15} />
                  </span>
                  <TextInput
                    id="fcindex-q"
                    type="search"
                    value={query}
                    placeholder="例如：医疗证明、六倍、撤回"
                    aria-describedby="fcindex-q-hint"
                    onChange={(e) => setParam({ q: e.currentTarget.value })}
                  />
                </span>
              </Field>
            </div>

            <div className="fcindex__filter">
              <Field label="议题" htmlFor="fcindex-topic">
                <Select
                  id="fcindex-topic"
                  value={topic}
                  onChange={(e) => setParam({ topic: e.currentTarget.value })}
                >
                  <option value="all">全部议题（{rows.length}）</option>
                  {TOPICS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.zh}（{topicCounts.get(t.key) ?? 0}）
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="fcindex__filter">
              <Field label="排序" htmlFor="fcindex-sort">
                <Select
                  id="fcindex-sort"
                  value={activeSort}
                  onChange={(e) => setParam({ sort: e.currentTarget.value })}
                >
                  {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                    <option key={key} value={key}>{SORT_LABEL[key]}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <div className="fcindex__filter-state" role="status">
            <p className="fcindex__count">
              共 <strong className="u-num">{results.length}</strong> 条
              {filtersActive ? <span className="fcindex__count-of">（全部 {rows.length} 条中）</span> : null}
            </p>
            {filtersActive ? (
              <div className="fcindex__chips">
                {verdict !== 'all' ? (
                  <button
                    type="button"
                    className="fcindex__chip"
                    onClick={() => setParam({ verdict: null })}
                  >
                    结论：{VERDICT_MAP[verdict].zh}
                    <Icon name="x" size={12} />
                    <span className="u-sr">移除结论筛选</span>
                  </button>
                ) : null}
                {topic !== 'all' ? (
                  <button
                    type="button"
                    className="fcindex__chip"
                    onClick={() => setParam({ topic: null })}
                  >
                    议题：{TOPIC_MAP[topic].zh}
                    <Icon name="x" size={12} />
                    <span className="u-sr">移除议题筛选</span>
                  </button>
                ) : null}
                {q !== '' ? (
                  <button
                    type="button"
                    className="fcindex__chip"
                    onClick={() => setParam({ q: null })}
                  >
                    搜索：{query}
                    <Icon name="x" size={12} />
                    <span className="u-sr">清除搜索词</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="fcindex__chip fcindex__chip--clear"
                  onClick={() => setParam({ verdict: null, topic: null, q: null })}
                >
                  <Icon name="refresh" size={12} />
                  清除全部筛选
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {results.length === 0 ? (
          <EmptyState
            icon="search"
            title="没有符合当前条件的核查"
            hint={
              verdict !== 'all'
                ? `本站目前没有以「${VERDICT_MAP[verdict].zh}」结案、且同时满足其他条件的核查。这一级的门槛是：${VERDICT_MAP[verdict].standard}`
                : '换一个议题、放宽搜索词，或清除筛选看看全部核查。'
            }
            action={
              <button
                type="button"
                className="fcindex__empty-btn"
                onClick={() => setParam({ verdict: null, topic: null, q: null })}
              >
                清除全部筛选
              </button>
            }
          />
        ) : (
          <ul className="fcindex__list">
            {results.map(({ check, article, sourceCount, primaryCount, topics }) => {
              const def = VERDICT_MAP[check.verdict]
              const revised = (check.history ?? []).length > 0
              return (
                <li key={check.id}>
                  <article className={cx('fcindex__item', `fcindex__item--${def.tone}`)}>
                    <div className="fcindex__item-top">
                      <VerdictBadge verdict={check.verdict} size="sm" />
                      {revised ? (
                        <Badge tone="info" icon={<Icon name="history" size={12} />} title="此结论曾被修订，旧结论与修订理由公开保留。">
                          结论已修订
                        </Badge>
                      ) : null}
                      <span className="fcindex__item-date u-num">核查于 {fmtDate(check.checkedAt)}</span>
                      <DemoTag compact className="fcindex__item-demo" />
                    </div>

                    <blockquote className="fcindex__claim">
                      <span className="fcindex__quote-mark" aria-hidden="true">「</span>
                      <Link className="fcindex__claim-link" to={`/fact-checks/${check.id}`}>
                        {check.claim}
                      </Link>
                      <span className="fcindex__quote-mark" aria-hidden="true">」</span>
                    </blockquote>
                    <p className="fcindex__origin">
                      <span className="fcindex__k">流传情况</span>
                      {check.claimOrigin}
                    </p>

                    <p className="fcindex__summary">{check.summary}</p>

                    <div className="fcindex__item-meta">
                      <span className="fcindex__meta-item">
                        <Icon name="database" size={13} />
                        <span className="u-num">{sourceCount}</span> 份来源
                        {primaryCount > 0 ? (
                          <span className="fcindex__meta-sub">（含 <span className="u-num">{primaryCount}</span> 份一手）</span>
                        ) : null}
                      </span>
                      <span className="fcindex__meta-item">
                        <Icon name="list" size={13} />
                        <span className="u-num">{check.reasoning.length}</span> 步推理
                      </span>
                      <span className="fcindex__meta-item">
                        <Icon name="users" size={13} />
                        {check.reviewedBy}
                      </span>
                    </div>

                    <div className="fcindex__item-foot">
                      <p className="fcindex__entry">
                        <span className="fcindex__k">所属条目</span>
                        {article ? (
                          <Link to={`/article/${article.slug}`} className="fcindex__entry-link">
                            {article.title}
                          </Link>
                        ) : (
                          <span className="fcindex__entry-missing">该条目已不在公开列表中</span>
                        )}
                      </p>
                      <div className="fcindex__item-topics">
                        {topics.slice(0, 3).map((key) => (
                          <TopicChip key={key} topic={key} link />
                        ))}
                      </div>
                      <Link className="fcindex__more" to={`/fact-checks/${check.id}`}>
                        查看完整核查
                        <Icon name="arrow-right" size={14} />
                        <span className="u-sr">：{check.claim}</span>
                      </Link>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}

        <p className="fcindex__foot-note">
          核查记录不会被静默替换。结论被修订时，旧结论、修订日期与修订理由一并公开保留；
          与之相关的更正、澄清与撤回记录在
          <Link to="/corrections">更正记录</Link>
          页永久保存。
        </p>
      </section>
    </div>
  )
}
