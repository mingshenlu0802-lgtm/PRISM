import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import type { Article, ImageAsset, ResearchItem, TopicKey } from '../../lib/types'
import { TOPIC_MAP, TOPICS, VERDICTS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { cx, fmtDate, primaryCount, relTime, sortBy } from '../../lib/util'
import {
  Badge, DemoTag, EmptyState, Icon, Meter, Segmented, StatusBadge, TopicChip, VerdictBadge,
} from '../../components/common'
import { DistributionBars, WorldGraticule } from '../../components/charts'
import { ConceptImage } from '../../components/visual/ConceptImage'

import './HomePage.css'

/**
 * 今日棱镜 — the front page.
 *
 * Everything on this page is derived from the store: nothing is hard-coded
 * editorial copy about a specific entry, and every number shown (source counts,
 * primary-document counts, jurisdictions, languages) is computed from the same
 * selectors the console uses, so the public claim and the internal record can
 * never drift apart.
 */

/* ------------------------------------------------------------------ *
 * Schematic placement for the fictional jurisdictions.
 * The graticule is NOT a world map — these coordinates only spread the
 * invented jurisdictions legibly across an abstract projection.
 * ------------------------------------------------------------------ */
const PLACEMENT: Record<string, [number, number]> = {
  '北屿联合王国': [36, 21],
  '韦拉共和国': [22, 39],
  '西埃斯特里亚': [43, 33],
  '东埃斯特里亚': [61, 22],
  '图兰共和国': [78, 31],
  '卡利桑邦': [69, 37],
  '阿米拉特王国': [55, 46],
  '塞尔瓦联邦': [35, 72],
  '马兰岛自治区': [84, 66],
  '泛洲（跨国机构）': [52, 65],
  '多辖区（跨国比较）': [13, 61],
}

function placeFallback(label: string): [number, number] {
  let h = 2166136261
  for (let i = 0; i < label.length; i += 1) {
    h ^= label.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const a = (h >>> 0) % 1000
  const b = (h >>> 10) % 1000
  return [12 + (a / 1000) * 76, 14 + (b / 1000) * 68]
}

const LANG_LABEL: Record<string, string> = {
  en: '英语', es: '西班牙语', pt: '葡萄牙语', fr: '法语', ar: '阿拉伯语',
  ru: '俄语', hi: '印地语', tr: '土耳其语', id: '印尼语', sw: '斯瓦希里语',
  'zh-Hans': '中文（简体）', 'zh-Hant': '中文（繁体）',
}

const RESEARCH_TYPE: Record<ResearchItem['type'], { zh: string; caveat: string }> = {
  'peer-reviewed': { zh: '同行评审研究', caveat: '已通过同行评审；仍需看方法与样本。' },
  preprint: { zh: '预印本', caveat: '未经同行评审，结论可能在评审中被修改。' },
  'official-statistics': { zh: '官方统计', caveat: '口径由发布机构定义，跨年比较须核对口径变更。' },
  'ngo-study': { zh: '民间组织研究', caveat: '非同行评审；须核对抽样方式与资助来源。' },
  'systematic-review': { zh: '系统综述', caveat: '对既有研究的二次综合，不是新的一手数据。' },
}

type SortKey = 'recent' | 'confidence' | 'sourced'

/** Media query as state, so the lead composition can change ratio, not just crop. */
function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`
  const [match, setMatch] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(query).matches
  })
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia(query)
    setMatch(mq.matches)
    const onChange = (event: MediaQueryListEvent) => setMatch(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return match
}

function scrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'auto'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

export default function HomePage(): JSX.Element {
  const { state } = usePrism()
  const navigate = useNavigate()

  const live = useMemo(() => sel.publicArticles(state), [state])
  const allChecks = useMemo(
    () => sortBy(sel.publicFactChecks(state), (f) => f.checkedAt, 'desc'),
    [state],
  )
  /** The rail carries the newest ten; the index page carries the rest. */
  const checks = useMemo(() => allChecks.slice(0, 10), [allChecks])
  const countries = useMemo(() => sel.countryDistribution(state), [state])
  const languages = useMemo(() => sel.languageDistribution(state), [state])
  const topics = useMemo(() => sel.topicDistribution(state), [state])
  const summary = useMemo(() => sel.deskSummary(state), [state])

  const lead = useMemo(
    () => live.find((a) => a.featured && a.status === 'published') ?? live[0],
    [live],
  )

  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const rest = useMemo(() => {
    const others = live.filter((a) => a.id !== lead?.id)
    if (sortKey === 'confidence') return sortBy(others, (a) => a.confidence, 'desc')
    if (sortKey === 'sourced') return sortBy(others, (a) => a.sourceIds.length, 'desc')
    return others
  }, [live, lead, sortKey])

  const wide = useMinWidth(1080)

  /* --------------------------- fact-check rail --------------------------- */
  const railRef = useRef<HTMLDivElement | null>(null)
  const [railEdge, setRailEdge] = useState<{ start: boolean; end: boolean }>({ start: true, end: false })

  const syncRail = useCallback(() => {
    const el = railRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setRailEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4 })
  }, [])

  useEffect(() => {
    syncRail()
    const onResize = () => syncRail()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [syncRail, checks.length])

  const nudgeRail = (dir: -1 | 1) => {
    const el = railRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(300, el.clientWidth * 0.82), behavior: scrollBehavior() })
  }

  /* ------------------------------ coverage ------------------------------- */
  const [picked, setPicked] = useState<string | null>(null)

  const points = useMemo(
    () => countries.map((row) => {
      const [x, y] = PLACEMENT[row.label] ?? placeFallback(row.label)
      const hasLive = live.some((a) => a.countries.includes(row.label))
      return {
        label: row.label,
        x,
        y,
        value: row.value,
        tone: hasLive ? 'var(--coral-500)' : 'var(--prism-1)',
      }
    }),
    [countries, live],
  )

  const languageRows = useMemo(
    () => languages.map((row) => ({ label: LANG_LABEL[row.label] ?? row.label, value: row.value })),
    [languages],
  )

  const topicRows = useMemo(
    () => topics.map((row) => ({ label: TOPIC_MAP[row.label as TopicKey]?.zh ?? row.label, value: row.value })),
    [topics],
  )

  const topicByLabel = useMemo(() => {
    const map = new Map<string, TopicKey>()
    for (const t of TOPICS) map.set(t.zh, t.key)
    return map
  }, [])

  const pickedEntries = useMemo(
    () => (picked ? live.filter((a) => a.countries.includes(picked)) : []),
    [picked, live],
  )
  const pickedSources = useMemo(
    () => (picked ? state.sources.filter((s) => s.country === picked).length : 0),
    [picked, state.sources],
  )

  /* ------------------------------ research ------------------------------- */
  const research = useMemo(() => sortBy(state.research, (r) => r.date, 'desc').slice(0, 5), [state.research])

  /* ------------------------- updates & corrections ----------------------- */
  const updateNeeded = useMemo(() => live.filter((a) => a.status === 'update-needed'), [live])
  const corrections = useMemo(
    () => sortBy(
      state.articles.flatMap((a) => a.corrections.map((c) => ({ article: a, correction: c }))),
      (row) => row.correction.at,
      'desc',
    ).slice(0, 4),
    [state.articles],
  )

  const coverFor = useCallback(
    (article: Article): ImageAsset | undefined => sel.coverOf(state, article),
    [state],
  )

  return (
    <div className="phome">
      {/* ---------------------------------------------------------------- 1 */}
      <section className="phome__dateline" aria-labelledby="phome-dateline-title">
        <div className="u-shell phome__dateline-inner">
          <div className="phome__dateline-head">
            <p className="u-eyebrow">今日棱镜 · Today in PRISM</p>
            <h1 className="phome__date" id="phome-dateline-title">{fmtDate(state.today)}</h1>
            <p className="phome__date-sub">
              全球版 · 由自动编辑台搜集与起草，由主编逐条审批后公开。
            </p>
          </div>

          <dl className="phome__stats">
            <div className="phome__stat">
              <dt>公开条目</dt>
              <dd className="u-num">{live.length}</dd>
              <p className="phome__stat-note">含 {updateNeeded.length} 篇标注为需更新</p>
            </div>
            <div className="phome__stat">
              <dt>覆盖司法辖区</dt>
              <dd className="u-num">{countries.length}</dd>
              <p className="phome__stat-note">全部为虚构辖区</p>
            </div>
            <div className="phome__stat">
              <dt>来源语言</dt>
              <dd className="u-num">{languages.length}</dd>
              <p className="phome__stat-note">共 {state.sources.length} 份来源记录</p>
            </div>
            <div className="phome__stat">
              <dt>事实核查</dt>
              <dd className="u-num">{allChecks.length}</dd>
              <p className="phome__stat-note">八级结论阶梯</p>
            </div>
          </dl>

          <div className="phome__dateline-foot">
            <DemoTag />
            <Link to="/method" className="phome__inline-link">
              这些数字怎么来的
              <Icon name="arrow-right" size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- 2 */}
      {lead ? (
        <section className="u-shell phome__lead" aria-labelledby="phome-lead-title">
          <div className="phome__section-head">
            <h2 className="phome__section-title">头条</h2>
            <p className="phome__section-note">当日最重要的一条，由主编选定并署名判断依据。</p>
          </div>

          <article className="phome__leadcard">
            <Link to={`/article/${lead.slug}`} className="phome__leadcover" tabIndex={-1} aria-hidden="true">
              {coverFor(lead) ? (
                /* The 「概念插图」 stamp carries the disclosure; the asset's own
                   caption is left to the article page rather than repeated here. */
                <ConceptImage
                  asset={{ ...(coverFor(lead) as ImageAsset), caption: '' }}
                  ratio={wide ? '21-9' : '3-2'}
                />
              ) : (
                <div className="phome__nocover">暂无封面图</div>
              )}
            </Link>

            <div className="phome__leadbody">
              <div className="phome__chips">
                {lead.topics.map((t) => <TopicChip key={t} topic={t} link size="sm" />)}
                {lead.status !== 'published' ? <StatusBadge status={lead.status} size="sm" /> : null}
              </div>

              <h3 className="phome__leadtitle" id="phome-lead-title">
                <Link to={`/article/${lead.slug}`}>{lead.title}</Link>
              </h3>
              <p className="phome__leaden">{lead.titleEn}</p>
              <p className="phome__standfirst">{lead.standfirst}</p>

              {lead.contentNotice ? (
                <p className="phome__notice">
                  <Icon name="alert" size={14} />
                  <span>内容提示：{lead.contentNotice}</span>
                </p>
              ) : null}

              <p className="phome__byline">
                <span>{lead.byline}</span>
                <span aria-hidden="true">·</span>
                <span className="u-num">{lead.readingTime} 分钟阅读</span>
                <span aria-hidden="true">·</span>
                <span>{lead.countries.join('、')}</span>
                <span aria-hidden="true">·</span>
                <span className="u-num">
                  {lead.publishedAt ? relTime(lead.publishedAt, `${state.today}T23:59:00Z`) : '未记录发布时间'}
                </span>
              </p>

              <EvidenceStrip article={lead} lead />
            </div>
          </article>
        </section>
      ) : (
        <section className="u-shell phome__lead">
          <EmptyState
            title="今天还没有公开条目"
            hint="自动编辑台的草稿要等主编在控制端逐条批准之后才会出现在这里。"
            icon="layers"
          />
        </section>
      )}

      {/* ---------------------------------------------------------------- 3 */}
      <section className="phome__checks" aria-labelledby="phome-checks-title">
        <div className="u-shell">
          <div className="phome__section-head">
            <h2 className="phome__section-title" id="phome-checks-title">今日核查</h2>
            <p className="phome__section-note">
              每条核查都写明：结论是什么、依据是什么、什么样的新证据会改变它。
            </p>
          </div>

          <div className="phome__ladder">
            <p className="phome__ladder-label u-eyebrow">八级结论阶梯</p>
            <ul className="phome__ladder-list">
              {VERDICTS.map((v) => (
                <li key={v.key} title={v.standard}>
                  <VerdictBadge verdict={v.key} size="sm" />
                </li>
              ))}
            </ul>
            <Link to="/method" className="phome__inline-link">
              每一级的证据门槛
              <Icon name="arrow-right" size={13} />
            </Link>
          </div>

          {checks.length === 0 ? (
            <EmptyState
              title="尚无公开的事实核查"
              hint="核查记录随其所属条目一同公开，条目未发布时核查也不会出现在这里。"
              icon="check-double"
            />
          ) : (
            <div className="phome__rail-wrap">
              <div
                className="phome__rail"
                ref={railRef}
                onScroll={syncRail}
                tabIndex={0}
                role="group"
                aria-label="今日事实核查（可横向滚动）"
              >
                {checks.map((check) => {
                  const article = state.articles.find((a) => a.id === check.articleId)
                  return (
                    <article className="phome__check" key={check.id}>
                      <VerdictBadge verdict={check.verdict} size="md" showEn />
                      <h3 className="phome__check-claim">
                        <Link to={`/fact-checks/${check.id}`}>{check.claim}</Link>
                      </h3>
                      <p className="phome__check-summary">{check.summary}</p>
                      <p className="phome__check-change">
                        <span className="phome__check-change-label">什么会改变它</span>
                        {check.whatWouldChangeIt}
                      </p>
                      <footer className="phome__check-foot">
                        <span className="u-num">{fmtDate(check.checkedAt)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{check.reviewedBy}</span>
                        {article ? (
                          <Link to={`/article/${article.slug}`} className="phome__check-article">
                            {article.title}
                          </Link>
                        ) : null}
                      </footer>
                    </article>
                  )
                })}
              </div>

              <div className="phome__rail-ctrl">
                <button
                  type="button"
                  className="phome__rail-btn"
                  aria-label="向前滚动核查列表"
                  onClick={() => nudgeRail(-1)}
                  disabled={railEdge.start}
                >
                  <Icon name="chevron-left" size={16} />
                </button>
                <button
                  type="button"
                  className="phome__rail-btn"
                  aria-label="向后滚动核查列表"
                  onClick={() => nudgeRail(1)}
                  disabled={railEdge.end}
                >
                  <Icon name="chevron-right" size={16} />
                </button>
                <Link to="/fact-checks" className="phome__inline-link">
                  全部 {allChecks.length} 条核查
                  <Icon name="arrow-right" size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- 4 */}
      <section className="u-shell phome__grid-sec" aria-labelledby="phome-grid-title">
        <div className="phome__section-head phome__section-head--row">
          <div>
            <h2 className="phome__section-title" id="phome-grid-title">深度报道</h2>
            <p className="phome__section-note">九个固定章节：事实、背景、权力、研究、分歧、核查、未知、意义、后续。</p>
          </div>
          <Segmented<SortKey>
            value={sortKey}
            onChange={setSortKey}
            ariaLabel="深度报道排序方式"
            size="sm"
            options={[
              { value: 'recent', label: '最新' },
              { value: 'confidence', label: '可信度' },
              { value: 'sourced', label: '来源数量' },
            ]}
          />
        </div>

        {rest.length === 0 ? (
          <EmptyState title="今天没有其他公开条目" hint="其余草稿仍在审批队列中。" icon="file" />
        ) : (
          <ul className="phome__grid">
            {rest.map((article) => (
              <li key={article.id}>
                <EntryCard article={article} cover={coverFor(article)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------------------------------------------------------------- 5 */}
      <section className="phome__coverage" aria-labelledby="phome-coverage-title">
        <div className="u-shell">
          <div className="phome__section-head">
            <h2 className="phome__section-title" id="phome-coverage-title">全球覆盖</h2>
            <p className="phome__section-note">
              搜集范围、来源语言与议题分布 —— 包括尚未公开的草稿条目所使用的语料。
            </p>
          </div>

          <div className="phome__coverage-grid">
            <div className="phome__panel phome__panel--map">
              <div className="phome__panel-head">
                <h3 className="phome__panel-title">辖区分布</h3>
                <p className="phome__panel-sub">点选一个辖区查看相关条目</p>
              </div>

              <div className="phome__mapbox">
                <WorldGraticule
                  points={points}
                  title="各虚构司法辖区的条目与信号数量"
                  height={320}
                  onSelect={(label) => setPicked((cur) => (cur === label ? null : label))}
                />
              </div>

              <p className="phome__legend">
                <span className="phome__legend-item">
                  <span className="phome__legend-dot phome__legend-dot--live" aria-hidden="true" />
                  已有公开条目
                </span>
                <span className="phome__legend-item">
                  <span className="phome__legend-dot" aria-hidden="true" />
                  仅出现在语料与草稿中
                </span>
              </p>

              {picked ? (
                <div className="phome__picked">
                  <div className="phome__picked-head">
                    <p className="phome__picked-title">{picked}</p>
                    <button type="button" className="phome__picked-clear" onClick={() => setPicked(null)}>
                      清除选择
                    </button>
                  </div>
                  <p className="phome__picked-meta u-num">
                    公开条目 {pickedEntries.length} 篇 · 来源记录 {pickedSources} 份
                  </p>
                  {pickedEntries.length > 0 ? (
                    <ul className="phome__picked-list">
                      {pickedEntries.map((a) => (
                        <li key={a.id}>
                          <Link to={`/article/${a.slug}`}>{a.title}</Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="phome__picked-empty">
                      该辖区目前只出现在来源库与未公开的草稿中，尚无公开条目。
                    </p>
                  )}
                </div>
              ) : null}

              <p className="phome__caption">
                投影为示意性网格，不对应任何真实地理；本原型中的全部司法辖区均为虚构。
              </p>
            </div>

            <div className="phome__panel phome__panel--bars">
              <div className="phome__panel-head">
                <h3 className="phome__panel-title">来源语言</h3>
                <p className="phome__panel-sub">来源库中 {state.sources.length} 份记录的原文语言</p>
              </div>
              <DistributionBars data={languageRows} unit="份" limit={8} />

              <div className="phome__panel-head phome__panel-head--second">
                <h3 className="phome__panel-title">议题分布</h3>
                <p className="phome__panel-sub">点选可进入该议题页</p>
              </div>
              <DistributionBars
                data={topicRows}
                unit="条"
                limit={8}
                onSelect={(label) => {
                  const key = topicByLabel.get(label)
                  if (key) navigate(`/topic/${key}`)
                }}
              />

              <p className="phome__caption">
                语言与议题分布统计的是本站语料库与全部条目（含尚未公开的草稿），不等同于当日公开的报道数量。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- 6 */}
      <section className="u-shell phome__research" aria-labelledby="phome-research-title">
        <div className="phome__section-head phome__section-head--row">
          <div>
            <h2 className="phome__section-title" id="phome-research-title">最新研究</h2>
            <p className="phome__section-note">研究不是新闻结论：每条都写明它能支持什么、不能支持什么。</p>
          </div>
          <Link to="/method" className="phome__inline-link">
            我们如何评估研究
            <Icon name="arrow-right" size={13} />
          </Link>
        </div>

        {research.length === 0 ? (
          <EmptyState
            title="研究雷达今日无新增条目"
            hint="研究雷达每日扫描期刊、统计机构与民间组织发布；没有新增时这里保持空白，而不是填充旧条目。"
            icon="book"
          />
        ) : (
          <ul className="phome__research-list">
            {research.map((item) => {
              const meta = RESEARCH_TYPE[item.type]
              return (
                <li className="phome__research-item" key={item.id}>
                  <div className="phome__research-top">
                    <Badge tone={item.type === 'preprint' ? 'warn' : 'info'} size="sm">{meta.zh}</Badge>
                    <span className="phome__research-date u-num">{fmtDate(item.date)}</span>
                    <span className="phome__research-pub">{item.publisher}</span>
                  </div>
                  <h3 className="phome__research-title">{item.title}</h3>
                  <p className="phome__research-summary">{item.summary}</p>
                  <dl className="phome__research-claims">
                    <div>
                      <dt>能支持</dt>
                      <dd>{item.strength}</dd>
                    </div>
                    <div className="phome__research-limit">
                      <dt>不能支持</dt>
                      <dd>{item.limitation}</dd>
                    </div>
                  </dl>
                  <p className="phome__research-caveat">{meta.caveat}</p>
                  <div className="phome__research-topics">
                    {item.topics.map((t) => <TopicChip key={t} topic={t} link size="sm" />)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ---------------------------------------------------------------- 7 */}
      <section className="u-shell phome__updates" aria-labelledby="phome-updates-title">
        <div className="phome__section-head phome__section-head--row">
          <div>
            <h2 className="phome__section-title" id="phome-updates-title">需要更新与更正</h2>
            <p className="phome__section-note">已发布内容出现新证据时进入「需更新」队列，不静默修改。</p>
          </div>
          <Link to="/corrections" className="phome__inline-link">
            全部更正记录
            <Icon name="arrow-right" size={13} />
          </Link>
        </div>

        <div className="phome__updates-grid">
          <div className="phome__panel">
            <div className="phome__panel-head">
              <h3 className="phome__panel-title">标注为需更新</h3>
              <p className="phome__panel-sub">仍可公开阅读，但顶部保留提示</p>
            </div>
            {updateNeeded.length === 0 ? (
              <p className="phome__flat">目前没有条目被标注为需更新。</p>
            ) : (
              <ul className="phome__update-list">
                {updateNeeded.map((a) => (
                  <li key={a.id}>
                    <div className="phome__update-top">
                      <StatusBadge status={a.status} size="sm" />
                      <span className="phome__update-date u-num">
                        更新于 {relTime(a.updatedAt, `${state.today}T23:59:00Z`)}
                      </span>
                    </div>
                    <Link to={`/article/${a.slug}`} className="phome__update-title">{a.title}</Link>
                    <p className="phome__update-basis">{a.confidenceBasis}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="phome__panel">
            <div className="phome__panel-head">
              <h3 className="phome__panel-title">最近的更正</h3>
              <p className="phome__panel-sub">附时间与执行人，永久保存</p>
            </div>
            {corrections.length === 0 ? (
              <p className="phome__flat">语料中尚无更正记录。</p>
            ) : (
              <ul className="phome__correction-list">
                {corrections.map(({ article, correction }) => (
                  <li key={correction.id}>
                    <div className="phome__update-top">
                      <Badge tone={correction.kind === 'retraction' ? 'stop' : 'warn'} size="sm">
                        {correction.kind === 'correction' ? '更正'
                          : correction.kind === 'clarification' ? '澄清'
                            : correction.kind === 'update' ? '更新' : '撤回'}
                      </Badge>
                      <span className="phome__update-date u-num">{fmtDate(correction.at)}</span>
                      <span className="phome__update-by">{correction.by}</span>
                    </div>
                    <Link to={`/article/${article.slug}`} className="phome__update-title">{article.title}</Link>
                    <p className="phome__correction-text">{correction.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- 8 */}
      <section className="u-shell phome__brief" aria-labelledby="phome-brief-title">
        <div className="phome__briefcard">
          <div className="phome__brief-body">
            <p className="u-eyebrow">每日编辑简报 · Daily Editorial Brief</p>
            <h2 className="phome__brief-title" id="phome-brief-title">
              每天早上，编辑台把一天的工作整理成一封只读简报
            </h2>
            <p className="phome__brief-text">
              简报包含：当日最值得关注的信号与理由、建议优先审阅的草稿、待审批队列、
              研究雷达的新增条目、正在流传且需要核查的说法、风险提示、引用检查未通过的条目，
              以及已发布内容中需要更新的部分。
            </p>
            <p className="phome__brief-strong">
              简报只提供摘要与跳转链接。<strong>批准与公开发布只能在 PRISM Command 控制端完成，
              永远不能通过邮件、回信或任何链接点击完成。</strong>
              自动编辑台没有发布权限，它能做的最后一步是「移交控制端等待审批」。
            </p>
            <div className="phome__brief-actions">
              <Link to="/command/brief" className="phome__brief-cta">
                <Icon name="mail" size={14} />
                在控制端查看今日简报
              </Link>
              <Link to="/method" className="phome__inline-link">
                权限分配表
                <Icon name="arrow-right" size={13} />
              </Link>
            </div>
          </div>

          <dl className="phome__brief-stats">
            <div>
              <dt>待审批</dt>
              <dd className="u-num">{summary.pending}</dd>
            </div>
            <div>
              <dt>已排程</dt>
              <dd className="u-num">{summary.scheduled}</dd>
            </div>
            <div>
              <dt>需更新</dt>
              <dd className="u-num">{summary.updatesNeeded}</dd>
            </div>
            <div>
              <dt>引用未通过</dt>
              <dd className="u-num">{summary.citationFailures}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Local compositions — the lead and the grid cards are built here on
 * purpose: ArticleCard belongs to another agent's file.
 * ------------------------------------------------------------------ */

function EvidenceStrip({ article, lead = false }: { article: Article; lead?: boolean }): JSX.Element {
  const { state } = usePrism()
  const primary = primaryCount(article, state)
  return (
    <div className={cx('phome__evidence', lead && 'phome__evidence--lead')}>
      <div className="phome__evidence-meter">
        <Meter
          value={article.confidence}
          label="可信度"
          hint={lead ? article.confidenceBasis : undefined}
          size={lead ? 'md' : 'sm'}
        />
      </div>
      <ul className="phome__evidence-nums">
        <li>
          <span className="phome__evidence-k">来源</span>
          <span className="phome__evidence-v u-num">{article.sourceIds.length}</span>
        </li>
        <li>
          <span className="phome__evidence-k">一手</span>
          <span className="phome__evidence-v u-num">{primary}</span>
        </li>
        <li>
          <span className="phome__evidence-k">核查</span>
          <span className="phome__evidence-v u-num">{article.factCheckIds.length}</span>
          <span className="phome__evidence-u">条</span>
        </li>
      </ul>
    </div>
  )
}

function EntryCard({ article, cover }: { article: Article; cover?: ImageAsset }): JSX.Element {
  const { state } = usePrism()
  const checks = state.factChecks.filter((f) => f.articleId === article.id)
  return (
    <article className="phome__card">
      <Link to={`/article/${article.slug}`} className="phome__card-cover" tabIndex={-1} aria-hidden="true">
        {cover ? (
          <ConceptImage asset={{ ...cover, caption: '' }} ratio="3-2" />
        ) : (
          <div className="phome__nocover">暂无封面图</div>
        )}
      </Link>

      <div className="phome__card-body">
        <div className="phome__chips">
          {article.topics.slice(0, 2).map((t) => <TopicChip key={t} topic={t} link size="sm" />)}
          {article.status !== 'published' ? <StatusBadge status={article.status} size="sm" /> : null}
        </div>

        <h3 className="phome__card-title">
          <Link to={`/article/${article.slug}`}>{article.title}</Link>
        </h3>
        <p className="phome__card-standfirst">{article.standfirst}</p>

        {article.contentNotice ? (
          <p className="phome__card-notice">
            <Icon name="alert" size={13} />
            <span>内容提示</span>
          </p>
        ) : null}

        <p className="phome__card-meta">
          <span className="u-num">{article.readingTime} 分钟</span>
          <span aria-hidden="true">·</span>
          <span>{article.countries.join('、')}</span>
          {checks.length > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="u-num">{checks.length} 条核查</span>
            </>
          ) : null}
        </p>

        <EvidenceStrip article={article} />
      </div>
    </article>
  )
}
