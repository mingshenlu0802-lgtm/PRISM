import { useMemo, useState } from 'react'
import type { Article, Signal, Source, TopicKey } from '../../lib/types'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { SOURCE_TYPE_LABEL, TOPIC_MAP } from '../../lib/constants'
import { articleSources, citationNumbers, cx, fmtDate, isPrimarySource, sortBy } from '../../lib/util'
import {
  Badge, EmptyState, Icon, Meter, Segmented, Select, SourceCard, TopicChip, toast,
} from '../common'
import './SourcePanel.css'

/**
 * 材料 — the workbench's left column.
 *
 * Everything here is evidence the desk already holds: nothing is fetched,
 * nothing is invented. The panel's job is to make three questions answerable at
 * a glance — 有几份一手记录？几家独立来源？哪一句只挂在一个来源上？—— and to let
 * the editor pull an unattached record out of the source pool into this entry.
 */

type TabKey = 'sources' | 'research' | 'legal' | 'signals'

const TIER_RANK: Record<Source['tier'], number> = { primary: 0, secondary: 1, tertiary: 2 }

const TIER_LABEL: Record<Source['tier'], string> = {
  primary: '一手',
  secondary: '二手',
  tertiary: '转述',
}

const CORROBORATION_LABEL: Record<Signal['corroboration'], string> = {
  'multi-source': '多来源印证',
  'single-source': '单一来源',
  contested: '存在争议',
  unverified: '尚未核实',
}

const RESEARCH_TYPE_LABEL: Record<'peer-reviewed' | 'preprint' | 'official-statistics' | 'ngo-study' | 'systematic-review', string> = {
  'peer-reviewed': '同行评审',
  preprint: '预印本',
  'official-statistics': '官方统计',
  'ngo-study': '民间机构研究',
  'systematic-review': '系统综述',
}

/**
 * The source records carry no topic field, so the候选来源 filter matches the
 * editor's chosen topic against the words actually written on the record —
 * title, publisher, type and the editor-facing notes. Every match is shown as a
 * chip so the reason for a suggestion is never hidden.
 */
const TOPIC_TERMS: Record<TopicKey, string[]> = {
  rights: ['权利', '结社', '团体登记', '登记', '承认', '公民', '平等待遇', 'recognition', 'association', 'registry', 'rights'],
  violence: ['家暴', '家庭暴力', '性暴力', '骚扰', '庇护所', '受害', '报案', 'shelter', 'violence', 'harassment', 'abuse'],
  repro: ['生育', '堕胎', '孕产', '避孕', '产科', '远程医疗', 'abortion', 'maternal', 'reproductive', 'telemedicine'],
  trans: ['跨性别', '性别承认', '性别标记', '诊断', '专科', '医疗指南', 'gender', 'trans', 'clinic', 'care'],
  hate: ['仇恨', '网络', '平台', '截图', '协同', '账号', 'hate', 'platform', 'online', 'coordinated'],
  equality: ['薪酬', '工资', '就业', '教育', '课程', '工会', '统计', '审计', '预算', 'pay', 'wage', 'audit', 'employment', 'union', 'statistics', 'budget'],
  displacement: ['庇护', '移民', '难民', '无国籍', '边境', 'asylum', 'migrant', 'refugee', 'stateless'],
  movement: ['基金', '拨款', '分配', '联盟', '资助', '运动', 'funding', 'grant', 'allocation', 'coalition'],
}

function sourceHaystack(s: Source): string {
  return [s.title, s.publisher, s.notes ?? '', s.credibilityBasis, s.caution ?? '', SOURCE_TYPE_LABEL[s.sourceType].zh]
    .join(' ')
    .toLowerCase()
}

function matchedTopics(s: Source): TopicKey[] {
  const hay = sourceHaystack(s)
  return (Object.keys(TOPIC_TERMS) as TopicKey[]).filter((key) =>
    TOPIC_TERMS[key].some((term) => hay.includes(term.toLowerCase())))
}

const TIER_NOTE: Record<Source['tier'], string> = {
  primary: '原始文件本身：法律文本、判决、数据集、研究原文。只有这一层能支撑「认定」「判决」这类用词。',
  secondary: '对一手材料的整理与报道。可用于叙述，但不能替代原件。',
  tertiary: '转述、聚合与二次引用。只能证明「说法存在」，不能证明「说法成立」。',
}

const TIER_ORDER: Source['tier'][] = ['primary', 'secondary', 'tertiary']

function tierSort(list: Source[]): Source[] {
  return [...list].sort((a, b) => {
    const t = TIER_RANK[a.tier] - TIER_RANK[b.tier]
    if (t !== 0) return t
    return b.credibility - a.credibility
  })
}

export interface SourcePanelProps {
  article: Article
  /** Rendered inside the panel head — the workbench passes its pane title. */
  className?: string
}

export function SourcePanel({ article, className }: SourcePanelProps): JSX.Element {
  const { state, dispatch } = usePrism()
  const [tab, setTab] = useState<TabKey>('sources')
  const [jurisdiction, setJurisdiction] = useState<string>('article')
  const [topic, setTopic] = useState<string>('all')

  const attached = useMemo(() => articleSources(article, state), [article, state])
  const profile = useMemo(() => sel.sourceProfile(article, state), [article, state])
  const numbers = useMemo(() => citationNumbers(article), [article])

  /** Per-source citation load and check health, shown on each card's footer. */
  const usage = useMemo(() => {
    const map = new Map<string, { count: number; first?: number; pass: number; warn: number; fail: number }>()
    const checkOf = new Map(article.citationChecks.map((c) => [c.citationId, c.status]))
    for (const c of article.citations) {
      const row = map.get(c.sourceId) ?? { count: 0, pass: 0, warn: 0, fail: 0 }
      row.count += 1
      const n = numbers.get(c.id)
      if (typeof n === 'number' && (row.first === undefined || n < row.first)) row.first = n
      const status = checkOf.get(c.id)
      if (status === 'found') row.pass += 1
      else if (status === 'partial') row.warn += 1
      else if (status === 'missing') row.fail += 1
      map.set(c.sourceId, row)
    }
    return map
  }, [article.citations, article.citationChecks, numbers])

  const sorted = useMemo(() => tierSort(attached), [attached])

  const legal = useMemo(
    () => sorted.filter((s) => s.sourceType === 'legal-document' || s.sourceType === 'court-ruling'),
    [sorted],
  )

  const research = useMemo(() => {
    const topics = new Set<TopicKey>(article.topics)
    const attachedIds = new Set(article.sourceIds)
    return sortBy(
      state.research.filter((r) => attachedIds.has(r.sourceId) || r.topics.some((t) => topics.has(t))),
      (r) => r.date,
      'desc',
    )
  }, [state.research, article.topics, article.sourceIds])

  const signals = useMemo(() => {
    const linked = state.signals.filter((s) => s.linkedArticleId === article.id)
    if (linked.length > 0) return linked
    const topics = new Set<TopicKey>(article.topics)
    const countries = new Set(article.countries)
    return state.signals.filter((s) => countries.has(s.country) || s.topics.some((t) => topics.has(t)))
  }, [state.signals, article.id, article.topics, article.countries])

  const candidates = useMemo(() => {
    const attachedIds = new Set(article.sourceIds)
    const pool = state.sources.filter((s) => s.id.startsWith('src-pool-') && !attachedIds.has(s.id))
    const inArticle = new Set(article.countries)
    return tierSort(pool.filter((s) => {
      const jurisdictionOk =
        jurisdiction === 'all' ? true
          : jurisdiction === 'article' ? inArticle.has(s.country)
            : s.country === jurisdiction
      if (!jurisdictionOk) return false
      if (topic === 'all') return true
      return matchedTopics(s).includes(topic as TopicKey)
    }))
  }, [state.sources, article.sourceIds, article.countries, jurisdiction, topic])

  const poolCountries = useMemo(
    () => Array.from(new Set(state.sources.filter((s) => s.id.startsWith('src-pool-')).map((s) => s.country))).sort(),
    [state.sources],
  )

  const attach = (s: Source) => {
    dispatch({ type: 'attach-source', articleId: article.id, sourceId: s.id })
    toast(`已加入本文：${s.publisher}`, 'go')
  }

  const primaryShort = Math.max(0, 2 - profile.primary)

  return (
    <div className={cx('srcp', className)}>
      {/* ------------------------------- head ------------------------------ */}
      <header className="srcp__head">
        <div className="srcp__headtop">
          <h2 className="srcp__title">
            <Icon name="database" size={14} />
            材料
          </h2>
          <span className="srcp__count u-num">{profile.total} 份已附加</span>
        </div>

        <ul className="srcp__stats">
          <li className={cx('srcp__stat', profile.primary < 2 && 'srcp__stat--warn')}>
            <span className="srcp__statnum u-num">{profile.primary}</span>
            <span className="srcp__statlab">一手来源</span>
          </li>
          <li className={cx('srcp__stat', profile.independent < 3 && 'srcp__stat--warn')}>
            <span className="srcp__statnum u-num">{profile.independent}</span>
            <span className="srcp__statlab">独立来源</span>
          </li>
          <li className="srcp__stat">
            <span className="srcp__statnum u-num">{profile.languages.length}</span>
            <span className="srcp__statlab">覆盖语言</span>
          </li>
          <li className="srcp__stat">
            <span className="srcp__statnum u-num">{profile.countries.length}</span>
            <span className="srcp__statlab">覆盖辖区</span>
          </li>
        </ul>

        <Meter
          value={profile.avgCredibility}
          label="平均可信度"
          size="sm"
          hint={profile.weakest ? `最弱一份：${profile.weakest.publisher}（${profile.weakest.credibility}）` : undefined}
        />

        {profile.primary < 2 ? (
          <p className="srcp__alert" role="status">
            <Icon name="alert" size={13} />
            <span>
              一手来源只有 {profile.primary} 份，还差 {primaryShort} 份才达到本站 2 份的内部下限。
              在「候选来源」中挑选法律文本、判决或官方统计，或退回要求补充材料。
            </span>
          </p>
        ) : null}

        <p className="srcp__langs">
          语言：{profile.languages.join(' · ') || '—'}
        </p>
      </header>

      {/* ------------------------------- tabs ------------------------------ */}
      <div className="srcp__tabs">
        <Segmented<TabKey>
          value={tab}
          onChange={setTab}
          ariaLabel="材料分类"
          size="sm"
          options={[
            { value: 'sources', label: '来源', count: profile.total },
            { value: 'research', label: '研究', count: research.length },
            { value: 'legal', label: '法律文件', count: legal.length },
            { value: 'signals', label: '今日信号', count: signals.length },
          ]}
        />
      </div>

      {/* ------------------------------ 来源 ------------------------------- */}
      {tab === 'sources' ? (
        <div className="srcp__pane" role="region" aria-label="本文已附加的来源">
          {TIER_ORDER.map((tier) => {
            const group = sorted.filter((s) => s.tier === tier)
            if (group.length === 0) return null
            return (
              <section className="srcp__tier" key={tier} aria-label={`${TIER_LABEL[tier]}来源`}>
                <header className={cx('srcp__tierhead', `srcp__tierhead--${tier}`)}>
                  <h3 className="srcp__tiertitle">
                    <span className="srcp__tiermark" aria-hidden="true" />
                    {TIER_LABEL[tier]}来源
                    <span className="srcp__tiercount u-num">{group.length}</span>
                  </h3>
                  <p className="srcp__tiernote">{TIER_NOTE[tier]}</p>
                </header>
                <ol className="srcp__list">
                  {group.map((s) => {
                    const use = usage.get(s.id)
                    return (
                      <li key={s.id} className="srcp__item">
                        <SourceCard
                          source={s}
                          compact
                          n={use?.first}
                          highlight={isPrimarySource(s)}
                          footer={
                            <span className="srcp__usage">
                              {use ? (
                                <>
                                  <span className="u-num">本文引用 {use.count} 处</span>
                                  <span className="srcp__sep" aria-hidden="true">·</span>
                                  <span className="u-num">
                                    核查 {use.pass} 通过 / {use.warn} 保留 / {use.fail} 未通过
                                  </span>
                                </>
                              ) : (
                                <span>已附加，但正文尚未引用</span>
                              )}
                            </span>
                          }
                        />
                      </li>
                    )
                  })}
                </ol>
              </section>
            )
          })}

          {sorted.length === 0 ? (
            <EmptyState
              title="这篇条目还没有附加任何来源"
              hint="从下面的候选来源池中挑选，或退回自动编辑台要求补充一手材料。"
              icon="database"
            />
          ) : null}

          {/* --------------------------- 候选来源 --------------------------- */}
          <section className="srcp__pool" aria-labelledby="srcp-pool-title">
            <header className="srcp__poolhead">
              <h3 className="srcp__pooltitle" id="srcp-pool-title">候选来源</h3>
              <p className="srcp__poolhint">
                资料库中尚未被任何条目使用的记录。加入后会写入操作记录，正文引用仍须人工写入。
              </p>
              <div className="srcp__filters">
                <label className="srcp__filter">
                  <span className="srcp__filterlab">司法辖区</span>
                  <Select value={jurisdiction} onChange={(e) => setJurisdiction(e.currentTarget.value)}>
                    <option value="article">本文辖区（{article.countries.join('、')}）</option>
                    <option value="all">全部辖区</option>
                    {poolCountries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </label>
                <label className="srcp__filter">
                  <span className="srcp__filterlab">议题</span>
                  <Select value={topic} onChange={(e) => setTopic(e.currentTarget.value)}>
                    <option value="all">全部议题</option>
                    {article.topics.map((t) => <option key={t} value={t}>{TOPIC_MAP[t].zh}</option>)}
                    {(Object.keys(TOPIC_TERMS) as TopicKey[])
                      .filter((t) => !article.topics.includes(t))
                      .map((t) => <option key={t} value={t}>{TOPIC_MAP[t].zh}</option>)}
                  </Select>
                </label>
              </div>
            </header>

            {candidates.length === 0 ? (
              <EmptyState
                title="当前筛选下没有候选来源"
                hint="放宽辖区或议题条件再看一次；候选池只包含资料库中已登记、但还没有被任何条目使用的记录。"
                icon="filter"
              />
            ) : (
              <ol className="srcp__list">
                {candidates.map((s) => {
                  const hits = matchedTopics(s).filter((t) => article.topics.includes(t))
                  return (
                    <li key={s.id} className="srcp__item">
                      <SourceCard
                        source={s}
                        compact
                        onAttach={() => attach(s)}
                        footer={
                          <span className="srcp__match">
                            <span className="srcp__matchlab">匹配依据</span>
                            {article.countries.includes(s.country) ? (
                              <Badge tone="info" size="sm">本文辖区</Badge>
                            ) : null}
                            {isPrimarySource(s) ? (
                              <Badge tone="go" size="sm" icon={<Icon name="shield" size={11} />}>可计入一手</Badge>
                            ) : null}
                            {hits.length > 0
                              ? hits.map((t) => <TopicChip key={t} topic={t} size="sm" />)
                              : <span className="srcp__matchnone">仅辖区相关</span>}
                          </span>
                        }
                      />
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </div>
      ) : null}

      {/* ------------------------------ 研究 ------------------------------- */}
      {tab === 'research' ? (
        <div className="srcp__pane" role="region" aria-label="相关研究">
          {research.length === 0 ? (
            <EmptyState
              title="研究雷达没有匹配到这篇条目"
              hint="研究雷达按议题与已附加来源匹配。若确有相关文献，请在「研究雷达」中登记后再回到这里。"
              icon="book"
            />
          ) : (
            <ol className="srcp__list">
              {research.map((r) => {
                const linked = article.sourceIds.includes(r.sourceId)
                const src = state.sources.find((s) => s.id === r.sourceId)
                return (
                  <li key={r.id} className="srcp__research">
                    <header className="srcp__rhead">
                      <Badge tone="info" size="sm">{RESEARCH_TYPE_LABEL[r.type]}</Badge>
                      <span className="srcp__rdate u-num">{fmtDate(r.date)}</span>
                    </header>
                    <h4 className="srcp__rtitle">{r.title}</h4>
                    <p className="srcp__rpub">{r.publisher}</p>
                    <p className="srcp__rsummary">{r.summary}</p>
                    <dl className="srcp__rgrid">
                      <div className="srcp__rrow srcp__rrow--go">
                        <dt>能支持什么</dt>
                        <dd>{r.strength}</dd>
                      </div>
                      <div className="srcp__rrow srcp__rrow--warn">
                        <dt>不能支持什么</dt>
                        <dd>{r.limitation}</dd>
                      </div>
                    </dl>
                    <footer className="srcp__rfoot">
                      <span className="srcp__rtopics">
                        {r.topics.map((t) => <TopicChip key={t} topic={t} size="sm" />)}
                      </span>
                      {linked ? (
                        <Badge tone="go" size="sm" icon={<Icon name="check" size={11} />}>来源已附加</Badge>
                      ) : src ? (
                        <button
                          type="button"
                          className="srcp__attach"
                          onClick={() => attach(src)}
                        >
                          <Icon name="plus" size={12} />
                          加入本文
                        </button>
                      ) : (
                        <span className="srcp__rmissing">来源记录缺失，无法附加</span>
                      )}
                    </footer>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      ) : null}

      {/* ---------------------------- 法律文件 ----------------------------- */}
      {tab === 'legal' ? (
        <div className="srcp__pane" role="region" aria-label="法律文件与法院判决">
          <p className="srcp__note">
            <Icon name="scale" size={13} />
            <span>
              法律文本与判决原文是本站证据阶梯的最上层：只有它们能支撑「认定」「判决」这类用词，
              其余材料一律写成「指控」或「据转述」。
            </span>
          </p>

          {legal.length === 0 ? (
            <EmptyState
              title="本文没有附加任何法律文本或判决"
              hint="涉及司法程序的条目必须回到原始文书；转述与报道不能替代文号与段落。"
              icon="scale"
            />
          ) : (
            <ol className="srcp__list">
              {legal.map((s) => {
                const cites = article.citations.filter((c) => c.sourceId === s.id)
                return (
                  <li key={s.id} className="srcp__item">
                    <SourceCard
                      source={s}
                      compact
                      highlight
                      n={usage.get(s.id)?.first}
                      footer={
                        <div className="srcp__locators">
                          <span className="srcp__matchlab">本文引用的段落</span>
                          {cites.length === 0 ? (
                            <span className="srcp__matchnone">已附加，但正文尚未指向具体段落</span>
                          ) : (
                            <ul className="srcp__loclist">
                              {cites.map((c) => (
                                <li key={c.id} className="srcp__loc">
                                  <span className="srcp__locn u-num">[{numbers.get(c.id) ?? '—'}]</span>
                                  <span className="srcp__locwhere">{c.locator ?? '未标注定位'}</span>
                                  <span className="srcp__locclaim">{c.claim}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      }
                    />
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      ) : null}

      {/* ---------------------------- 今日信号 ----------------------------- */}
      {tab === 'signals' ? (
        <div className="srcp__pane" role="region" aria-label="与本条目相关的今日信号">
          {signals.length === 0 ? (
            <EmptyState
              title="没有与这篇条目关联的信号"
              hint="信号是自动编辑台在多语搜集阶段聚合出的报道簇。这篇条目可能由研究雷达或人工选题直接进入。"
              icon="target"
            />
          ) : (
            <ol className="srcp__list">
              {signals.map((s) => (
                <li key={s.id} className="srcp__signal">
                  <header className="srcp__sighead">
                    <span className="srcp__sigvalue u-num" aria-label={`选题价值 ${s.newsValue}`}>{s.newsValue}</span>
                    <div className="srcp__sigheadmain">
                      <h4 className="srcp__sigtitle">{s.headline}</h4>
                      <p className="srcp__sigmeta">
                        {s.country} · {s.region} · {s.language.toUpperCase()}
                        {s.linkedArticleId === article.id ? ' · 已关联本条目' : ' · 未关联'}
                      </p>
                    </div>
                  </header>

                  <p className="srcp__sigbasis">{s.newsValueBasis}</p>

                  <ul className="srcp__sigstats">
                    <li><span className="u-num">{s.reportCount}</span> 篇合并报道</li>
                    <li><span className="u-num">{s.independentSourceCount}</span> 家独立来源</li>
                    <li><span className="u-num">{s.primarySourceCount}</span> 份一手记录</li>
                  </ul>

                  <div className="srcp__sigtags">
                    <Badge
                      tone={s.corroboration === 'multi-source' ? 'go' : s.corroboration === 'contested' ? 'warn' : 'neutral'}
                      size="sm"
                    >
                      {CORROBORATION_LABEL[s.corroboration]}
                    </Badge>
                    {s.topics.map((t) => <TopicChip key={t} topic={t} size="sm" />)}
                  </div>

                  <details className="srcp__merge">
                    <summary className="srcp__mergesum">
                      合并历史（{s.mergedFrom.length} 条）
                    </summary>
                    {s.mergedFrom.length === 0 ? (
                      <p className="srcp__mergeempty">没有被合并的重复报道：这是一条独立出现的信号。</p>
                    ) : (
                      <ol className="srcp__mergelist">
                        {s.mergedFrom.map((m) => <li key={m} className="srcp__mergeitem">{m}</li>)}
                      </ol>
                    )}
                  </details>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  )
}
