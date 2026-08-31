import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TopicKey } from '../../lib/types'
import type { RegionKey } from '../../lib/regions'
import { PRIORITY_REGIONS, REGION_MAP } from '../../lib/regions'
import { usePrism } from '../../lib/store'
import { byNewest, fmtDate, unique } from '../../lib/util'
import { EmptyState, Icon } from '../../components/common'
import { NewsCard } from '../../components/site/NewsCard'
import { StudyCard } from '../../components/site/StudyCard'
import { FilterBar } from '../../components/site/FilterBar'
import './HomePage.css'

/**
 * 今日。一条一条的短总结，每条下面是报道它的媒体链接。
 * 上面是筛选，因为「我只想看香港的」是最常见的需求。
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

  const shown = useMemo(() => live.filter((n) => {
    const okR = regions.length === 0 || n.regions.some((k) => regions.includes(k))
    const okT = topics.length === 0 || n.topics.some((k) => topics.includes(k))
    return okR && okT
  }), [live, regions, topics])

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

      <section className="home__priority" aria-label="优先关注地区">
        <p className="home__prioritylabel">优先关注</p>
        <div className="home__prioritychips">
          {PRIORITY_REGIONS.map((k) => {
            const meta = REGION_MAP[k]
            const n = counts.regions[k] ?? 0
            return (
              <Link key={k} className="home__prioritychip" to={`/region/${k}`}>
                <span className="home__prioritydot" style={{ background: meta.hue }} aria-hidden="true" />
                <span className="home__priorityname">{meta.zh}</span>
                <span className="home__prioritynum">{n}</span>
              </Link>
            )
          })}
        </div>
      </section>

      <FilterBar
        regions={regions}
        topics={topics}
        onRegions={setRegions}
        onTopics={setTopics}
        counts={counts}
      />

      <p className="home__count">
        {regions.length + topics.length > 0
          ? `筛选后 ${shown.length} 条（共 ${live.length} 条）`
          : `共 ${live.length} 条`}
      </p>

      {shown.length === 0 ? (
        <EmptyState
          title="这个筛选下暂时没有内容"
          hint="换一组地区或议题试试，或者清除筛选看全部。"
          icon="search"
        />
      ) : (
        <div className="home__feed">
          {shown.map((n) => <NewsCard key={n.id} item={n} today={`${state.today}T23:59:00Z`} />)}
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
