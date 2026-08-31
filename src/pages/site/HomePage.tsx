import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TopicKey } from '../../lib/types'
import type { RegionKey } from '../../lib/regions'
import { usePrism } from '../../lib/store'
import { byNewest, fmtDate, unique } from '../../lib/util'
import { EmptyState, Icon } from '../../components/common'
import { NewsCard } from '../../components/site/NewsCard'
import { StudyCard } from '../../components/site/StudyCard'
import { FilterBar } from '../../components/site/FilterBar'
import './HomePage.css'

/**
 * 今日。最上面是站长指定的头条，下面是一条一条的短总结。
 *
 * 头条由站长在编辑页指定，不是算法挑的。没有指定时用最新的一条顶上，
 * 这样首页永远不会开着一个空位。筛选之后就不再显示头条——那时读者要的是
 * 「香港的全部」，把一条不属于这个筛选的新闻架在最上面只会碍事。
 */
export default function HomePage(): JSX.Element {
  const { state } = usePrism()
  const [regions, setRegions] = useState<RegionKey[]>([])
  const [topics, setTopics] = useState<TopicKey[]>([])

  const live = useMemo(() => byNewest(state.news.filter((n) => n.status === 'live')), [state.news])
  const liveStudies = useMemo(() => byNewest(state.studies.filter((s) => s.status === 'live')), [state.studies])

  const counts = useMemo(() => {
    const r: Partial<Record<RegionKey, number>> = {}
    const t: Partial<Record<TopicKey, number>> = {}
    for (const n of live) {
      for (const k of n.regions) r[k] = (r[k] ?? 0) + 1
      for (const k of n.topics) t[k] = (t[k] ?? 0) + 1
    }
    return { regions: r, topics: t }
  }, [live])

  const filtering = regions.length + topics.length > 0

  const shown = useMemo(() => live.filter((n) => {
    const okR = regions.length === 0 || n.regions.some((k) => regions.includes(k))
    const okT = topics.length === 0 || n.topics.some((k) => topics.includes(k))
    return okR && okT
  }), [live, regions, topics])

  const lead = filtering ? undefined : (live.find((n) => n.featured) ?? live[0])
  const rest = lead ? shown.filter((n) => n.id !== lead.id) : shown

  const coveredRegions = unique(live.flatMap((n) => n.regions))

  return (
    <div className="home u-shell">
      <section className="home__hero">
        <p className="home__eyebrow">{fmtDate(state.today)}</p>
        <h1 className="home__title">{state.copy.tagline}</h1>
        <p className="home__intro">{state.copy.intro}</p>
        <dl className="home__stats">
          <div><dt>今日条目</dt><dd>{live.length}</dd></div>
          <div><dt>覆盖地区</dt><dd>{coveredRegions.length}</dd></div>
          <div><dt>媒体链接</dt><dd>{live.reduce((n, i) => n + i.links.length, 0)}</dd></div>
          <div><dt>研究与数据</dt><dd>{liveStudies.length}</dd></div>
        </dl>
      </section>

      {lead && (
        <section className="home__lead" aria-label="头条">
          <NewsCard item={lead} variant="lead" today={`${state.today}T23:59:00Z`} />
        </section>
      )}

      <FilterBar
        regions={regions}
        topics={topics}
        onRegions={setRegions}
        onTopics={setTopics}
        counts={counts}
      />

      <p className="home__count">
        {filtering
          ? `筛选后 ${shown.length} 条（共 ${live.length} 条）`
          : `共 ${live.length} 条`}
      </p>

      {shown.length === 0 && (
        <EmptyState
          title="这个筛选下暂时没有内容"
          hint="换一组地区或议题试试，或者清除筛选看全部。"
          icon="search"
        />
      )}

      {/* 只有一条时它已经在头条位上了，下面不再开一个空列表。 */}
      {rest.length > 0 && (
        <div className="home__feed">
          {rest.map((n) => <NewsCard key={n.id} item={n} today={`${state.today}T23:59:00Z`} />)}
        </div>
      )}

      {liveStudies.length > 0 && (
        <section className="home__studies" aria-labelledby="home-studies">
          <div className="home__sechead">
            <h2 className="home__sectitle" id="home-studies">研究与公开数据</h2>
            <Link className="home__seclink" to="/studies">全部 {liveStudies.length} 项<Icon name="arrow-right" size={13} /></Link>
          </div>
          <div className="home__studygrid">
            {liveStudies.slice(0, 2).map((s) => <StudyCard key={s.id} item={s} />)}
          </div>
        </section>
      )}
    </div>
  )
}
