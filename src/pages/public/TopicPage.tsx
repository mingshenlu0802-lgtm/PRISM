import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import type { ImageAsset, ResearchItem, Source, SourceType, TopicKey } from '../../lib/types'
import { SOURCE_TYPE_LABEL, TOPIC_MAP, TOPICS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { fmtDate, isPrimarySource, relTime, sortBy } from '../../lib/util'
import {
  Badge, DemoTag, EmptyState, Icon, Meter, StatusBadge, TopicChip, VerdictBadge,
} from '../../components/common'
import { DistributionBars } from '../../components/charts'
import { ConceptImage } from '../../components/visual/ConceptImage'

import './TopicPage.css'

const RESEARCH_TYPE: Record<ResearchItem['type'], { zh: string; caveat: string }> = {
  'peer-reviewed': { zh: '同行评审研究', caveat: '已通过同行评审；仍需看方法与样本。' },
  preprint: { zh: '预印本', caveat: '未经同行评审，结论可能在评审中被修改。' },
  'official-statistics': { zh: '官方统计', caveat: '口径由发布机构定义，跨年比较须核对口径变更。' },
  'ngo-study': { zh: '民间组织研究', caveat: '非同行评审；须核对抽样方式与资助来源。' },
  'systematic-review': { zh: '系统综述', caveat: '对既有研究的二次综合，不是新的一手数据。' },
}

function isTopicKey(value: string | undefined): value is TopicKey {
  return typeof value === 'string' && TOPICS.some((t) => t.key === value)
}

export default function TopicPage(): JSX.Element {
  const { topicKey } = useParams()
  const { state } = usePrism()

  const valid = isTopicKey(topicKey)
  const key: TopicKey = isTopicKey(topicKey) ? topicKey : 'rights'
  const topic = TOPIC_MAP[key]
  const hueStyle = { '--topicpg-hue': topic.hue } as CSSProperties

  const entries = useMemo(
    () => sel.publicArticles(state).filter((a) => a.topics.includes(key)),
    [state, key],
  )

  const checks = useMemo(() => {
    const ids = new Set(entries.map((a) => a.id))
    return sortBy(sel.publicFactChecks(state).filter((f) => ids.has(f.articleId)), (f) => f.checkedAt, 'desc')
  }, [state, entries])

  const research = useMemo(
    () => sortBy(state.research.filter((r) => r.topics.includes(key)), (r) => r.date, 'desc'),
    [state.research, key],
  )

  const sources = useMemo<Source[]>(() => {
    const byId = new Map(state.sources.map((s) => [s.id, s]))
    const seen = new Set<string>()
    const out: Source[] = []
    for (const article of entries) {
      for (const id of article.sourceIds) {
        if (seen.has(id)) continue
        const source = byId.get(id)
        if (!source) continue
        seen.add(id)
        out.push(source)
      }
    }
    return out
  }, [entries, state.sources])

  const primaryTotal = useMemo(() => sources.filter(isPrimarySource).length, [sources])

  const jurisdictions = useMemo(
    () => Array.from(new Set(entries.flatMap((a) => a.countries))).sort(),
    [entries],
  )

  const typeRows = useMemo(() => {
    const counts = new Map<SourceType, number>()
    for (const source of sources) counts.set(source.sourceType, (counts.get(source.sourceType) ?? 0) + 1)
    return sortBy(
      Array.from(counts, ([type, value]) => ({ label: SOURCE_TYPE_LABEL[type].zh, value })),
      (row) => row.value,
      'desc',
    )
  }, [sources])

  if (!valid) return <Navigate to="/" replace />

  const others = TOPICS.filter((t) => t.key !== key)

  return (
    <div className="topicpg">
      <header className="topicpg__head" style={hueStyle}>
        <div className="u-shell topicpg__head-inner">
          <nav className="topicpg__crumbs" aria-label="面包屑">
            <Link to="/">今日棱镜</Link>
            <span aria-hidden="true">/</span>
            <span>议题</span>
          </nav>

          <p className="topicpg__eyebrow u-eyebrow">常设议题</p>
          <h1 className="topicpg__title">{topic.zh}</h1>
          <p className="topicpg__en">{topic.en}</p>
          <p className="topicpg__blurb">{topic.blurb}</p>

          <ul className="topicpg__counts">
            <li>
              <span className="topicpg__count-v u-num">{entries.length}</span>
              <span className="topicpg__count-k">公开条目</span>
            </li>
            <li>
              <span className="topicpg__count-v u-num">{checks.length}</span>
              <span className="topicpg__count-k">事实核查</span>
            </li>
            <li>
              <span className="topicpg__count-v u-num">{sources.length}</span>
              <span className="topicpg__count-k">来源记录</span>
            </li>
            <li>
              <span className="topicpg__count-v u-num">{primaryTotal}</span>
              <span className="topicpg__count-k">一手材料</span>
            </li>
            <li>
              <span className="topicpg__count-v u-num">{jurisdictions.length}</span>
              <span className="topicpg__count-k">司法辖区</span>
            </li>
            <li>
              <span className="topicpg__count-v u-num">{research.length}</span>
              <span className="topicpg__count-k">研究条目</span>
            </li>
          </ul>

          <div className="topicpg__head-foot">
            <DemoTag />
            {jurisdictions.length > 0 ? (
              <p className="topicpg__jur">涉及辖区：{jurisdictions.join('、')}（均为虚构）</p>
            ) : null}
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------- entries -- */}
      <section className="u-shell topicpg__sec" aria-labelledby="topicpg-entries">
        <div className="topicpg__sec-head">
          <h2 className="topicpg__sec-title" id="topicpg-entries">深度报道</h2>
          <p className="topicpg__sec-note">该议题下已公开的条目，按发布时间倒序。</p>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            title="该议题目前没有公开条目"
            hint="草稿要等主编在控制端逐条批准之后才会出现在公众站。"
            icon="file"
            action={<Link to="/" className="topicpg__link">回到今日棱镜</Link>}
          />
        ) : (
          <ul className="topicpg__entries">
            {entries.map((article) => {
              const cover: ImageAsset | undefined = sel.coverOf(state, article)
              const primary = article.sourceIds
                .map((id) => state.sources.find((s) => s.id === id))
                .filter((s): s is Source => Boolean(s))
                .filter(isPrimarySource).length
              return (
                <li key={article.id}>
                  <article className="topicpg__entry">
                    <Link
                      to={`/article/${article.slug}`}
                      className="topicpg__entry-cover"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      {cover ? (
                        <ConceptImage asset={{ ...cover, caption: '' }} ratio="3-2" />
                      ) : (
                        <span className="topicpg__nocover">暂无封面图</span>
                      )}
                    </Link>

                    <div className="topicpg__entry-body">
                      <div className="topicpg__entry-chips">
                        {article.topics.map((t) => <TopicChip key={t} topic={t} link size="sm" />)}
                        {article.status !== 'published' ? <StatusBadge status={article.status} size="sm" /> : null}
                      </div>

                      <h3 className="topicpg__entry-title">
                        <Link to={`/article/${article.slug}`}>{article.title}</Link>
                      </h3>
                      <p className="topicpg__entry-standfirst">{article.standfirst}</p>

                      {article.contentNotice ? (
                        <p className="topicpg__entry-notice">
                          <Icon name="alert" size={13} />
                          <span>内容提示：{article.contentNotice}</span>
                        </p>
                      ) : null}

                      <p className="topicpg__entry-meta">
                        <span>{article.byline}</span>
                        <span aria-hidden="true">·</span>
                        <span className="u-num">{article.readingTime} 分钟</span>
                        <span aria-hidden="true">·</span>
                        <span>{article.countries.join('、')}</span>
                        <span aria-hidden="true">·</span>
                        <span className="u-num">
                          {article.publishedAt
                            ? relTime(article.publishedAt, `${state.today}T23:59:00Z`)
                            : `更新于 ${relTime(article.updatedAt, `${state.today}T23:59:00Z`)}`}
                        </span>
                      </p>

                      <div className="topicpg__entry-evidence">
                        <div className="topicpg__entry-meter">
                          <Meter value={article.confidence} label="可信度" size="sm" />
                        </div>
                        <ul className="topicpg__entry-nums">
                          <li><span>来源</span><span className="u-num">{article.sourceIds.length}</span></li>
                          <li><span>一手</span><span className="u-num">{primary}</span></li>
                          <li><span>核查</span><span className="u-num">{article.factCheckIds.length}</span></li>
                        </ul>
                      </div>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ---------------------------------------------------- fact-checks -- */}
      <section className="topicpg__band" aria-labelledby="topicpg-checks">
        <div className="u-shell">
          <div className="topicpg__sec-head topicpg__sec-head--row">
            <div>
              <h2 className="topicpg__sec-title" id="topicpg-checks">该议题的事实核查</h2>
              <p className="topicpg__sec-note">结论、依据，以及什么样的新证据会改变它。</p>
            </div>
            <Link to="/fact-checks" className="topicpg__link">
              全部核查记录
              <Icon name="arrow-right" size={13} />
            </Link>
          </div>

          {checks.length === 0 ? (
            <EmptyState
              title="该议题下暂无公开的核查记录"
              hint="核查随其所属条目一同公开。"
              icon="check-double"
            />
          ) : (
            <ul className="topicpg__checks">
              {checks.map((check) => {
                const article = state.articles.find((a) => a.id === check.articleId)
                return (
                  <li key={check.id}>
                    <article className="topicpg__check">
                      <VerdictBadge verdict={check.verdict} size="md" showEn />
                      <h3 className="topicpg__check-claim">
                        <Link to={`/fact-checks/${check.id}`}>{check.claim}</Link>
                      </h3>
                      <p className="topicpg__check-summary">{check.summary}</p>
                      <p className="topicpg__check-origin">
                        <span className="topicpg__check-k">流传情况</span>
                        {check.spreadNote}
                      </p>
                      <footer className="topicpg__check-foot">
                        <span className="u-num">{fmtDate(check.checkedAt)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{check.reviewedBy}</span>
                        {article ? (
                          <Link to={`/article/${article.slug}`} className="topicpg__check-article">
                            {article.title}
                          </Link>
                        ) : null}
                      </footer>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------- research -- */}
      <section className="u-shell topicpg__sec" aria-labelledby="topicpg-research">
        <div className="topicpg__sec-head">
          <h2 className="topicpg__sec-title" id="topicpg-research">相关研究</h2>
          <p className="topicpg__sec-note">研究雷达收录的条目；每条注明它能支持什么、不能支持什么。</p>
        </div>

        {research.length === 0 ? (
          <EmptyState
            title="研究雷达在该议题下暂无收录"
            hint="没有新增时这里保持空白，而不是填充旧条目。"
            icon="book"
          />
        ) : (
          <ul className="topicpg__research">
            {research.map((item) => {
              const meta = RESEARCH_TYPE[item.type]
              return (
                <li key={item.id} className="topicpg__research-item">
                  <div className="topicpg__research-top">
                    <Badge tone={item.type === 'preprint' ? 'warn' : 'info'} size="sm">{meta.zh}</Badge>
                    <span className="u-num">{fmtDate(item.date)}</span>
                    <span className="topicpg__research-pub">{item.publisher}</span>
                  </div>
                  <h3 className="topicpg__research-title">{item.title}</h3>
                  <p className="topicpg__research-summary">{item.summary}</p>
                  <dl className="topicpg__research-claims">
                    <div>
                      <dt>能支持</dt>
                      <dd>{item.strength}</dd>
                    </div>
                    <div className="topicpg__research-limit">
                      <dt>不能支持</dt>
                      <dd>{item.limitation}</dd>
                    </div>
                  </dl>
                  <p className="topicpg__research-caveat">{meta.caveat}</p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------- source makeup -- */}
      <section className="topicpg__band" aria-labelledby="topicpg-sources">
        <div className="u-shell">
          <div className="topicpg__sec-head">
            <h2 className="topicpg__sec-title" id="topicpg-sources">支撑该议题的来源构成</h2>
            <p className="topicpg__sec-note">
              本站的来源优先级：原始研究 → 法律文本与判决 → 政府数据 → 国际机构 → 当地媒体与民间组织 → 通讯社 → 声明 → 社交平台内容。
            </p>
          </div>

          {typeRows.length === 0 ? (
            <EmptyState title="尚无来源记录" hint="该议题下还没有公开条目，因此也没有可统计的来源。" icon="database" />
          ) : (
            <div className="topicpg__sourcepanel">
              <div className="topicpg__bars">
                <DistributionBars data={typeRows} unit="份" />
              </div>
              <div className="topicpg__sourcemeta">
                <p className="topicpg__sourcemeta-line">
                  共 <strong className="u-num">{sources.length}</strong> 份来源，其中
                  <strong className="u-num"> {primaryTotal}</strong> 份为一手材料
                  （{sources.length > 0 ? Math.round((primaryTotal / sources.length) * 100) : 0}%）。
                </p>
                <p className="topicpg__sourcemeta-note">
                  社交平台内容只作为「该说法确实在流传」的证据，不作为「该说法成立」的证据。
                  每篇条目的完整参考文献与可信度依据都列在文章末尾。
                </p>
                <Link to="/method" className="topicpg__link">
                  来源政策与可信度评分方法
                  <Icon name="arrow-right" size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- other topics -- */}
      <section className="u-shell topicpg__sec topicpg__others" aria-labelledby="topicpg-others">
        <h2 className="topicpg__sec-title" id="topicpg-others">其他议题</h2>
        <ul className="topicpg__otherlist">
          {others.map((t) => (
            <li key={t.key}>
              <Link to={`/topic/${t.key}`} className="topicpg__other">
                <span className="topicpg__other-swatch" style={{ background: t.hue }} aria-hidden="true" />
                <span className="topicpg__other-body">
                  <span className="topicpg__other-zh">{t.zh}</span>
                  <span className="topicpg__other-blurb">{t.blurb}</span>
                </span>
                <Icon name="chevron-right" size={15} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
