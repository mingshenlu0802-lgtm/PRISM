import { Link, useParams } from 'react-router-dom'
import { REGION_MAP } from '../../lib/regions'
import type { RegionKey } from '../../lib/regions'
import { usePrism } from '../../lib/store'
import { byNewest } from '../../lib/util'
import { EmptyState } from '../../components/common'
import { NewsCard } from '../../components/site/NewsCard'
import { StudyCard } from '../../components/site/StudyCard'
import './ListPage.css'

export default function RegionPage(): JSX.Element {
  const { key } = useParams()
  const { state } = usePrism()
  const region = key ? REGION_MAP[key as RegionKey] : undefined

  if (!region) {
    return (
      <div className="lpage u-shell">
        <EmptyState title="没有这个地区" hint="从顶部的「地区」菜单里选一个。" icon="globe"
          action={<Link className="lpage__back" to="/">回到今日</Link>} />
      </div>
    )
  }

  const news = byNewest(state.news.filter((n) => n.status === 'live' && n.regions.includes(region.key)))
  const studies = byNewest(state.studies.filter((s) => s.status === 'live' && s.regions.includes(region.key)))

  return (
    <div className="lpage u-shell">
      <header className="lpage__head">
        <span className="lpage__dot" style={{ background: region.hue }} aria-hidden="true" />
        <div>
          <h1 className="lpage__title">{region.zh}</h1>
          <p className="lpage__en">{region.en}</p>
        </div>
        {region.priority === 1 && <span className="lpage__badge">优先搜索地区</span>}
      </header>
      <p className="lpage__scope">{region.scope}</p>
      <p className="lpage__count">{news.length} 条新闻 · {studies.length} 项研究与数据</p>

      {news.length === 0 && studies.length === 0 ? (
        <EmptyState title="这个地区暂时还没有内容" hint="搜集器会按优先级持续扫描，有了就会出现在这里。" icon="globe" />
      ) : (
        <>
          {news.length > 0 && (
            <div className="lpage__feed">
              {news.map((n) => <NewsCard key={n.id} item={n} today={`${state.today}T23:59:00Z`} />)}
            </div>
          )}
          {studies.length > 0 && (
            <section className="lpage__section">
              <h2 className="lpage__sectitle">研究与数据</h2>
              <div className="lpage__feed">
                {studies.map((s) => <StudyCard key={s.id} item={s} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
