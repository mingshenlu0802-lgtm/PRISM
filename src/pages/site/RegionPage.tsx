import { Link, useParams } from 'react-router-dom'
import { REGION_MAP, regionKey } from '../../lib/regions'
import { usePrism } from '../../lib/store'
import { usePageTitle } from '../../lib/title'
import { byNewest } from '../../lib/util'
import { EmptyState } from '../../components/common'
import { NewsCard } from '../../components/site/NewsCard'
import { StudyCard } from '../../components/site/StudyCard'
import './ListPage.css'

export default function RegionPage(): JSX.Element {
  const { key } = useParams()
  const { state } = usePrism()
  /*
   * 先过一遍 regionKey：台湾并进「日韩台」之后，别人聊天记录和收藏夹里
   * 那些 `#/region/tw` 的链接还在。不翻译的话，它们会撞上下面那句
   * 「没有这个地区」——一条曾经好好的链接，某天突然变成一个死页面。
   */
  const region = key ? REGION_MAP[regionKey(key)] : undefined
  usePageTitle(region?.zh)

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
      </header>
      <p className="lpage__scope">{region.scope}</p>
      <p className="lpage__count">{news.length} 条新闻 · {studies.length} 项研究与数据</p>

      {news.length === 0 && studies.length === 0 ? (
        <EmptyState title="这个地区暂时还没有内容" hint="有新的内容会出现在这里。" icon="globe" />
      ) : (
        <>
          {news.length > 0 && (
            <div className="lpage__feed">
              {news.map((n) => <NewsCard key={n.id} item={n} />)}
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
