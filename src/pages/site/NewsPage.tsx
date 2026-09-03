import { Link, useParams } from 'react-router-dom'
import { usePrism } from '../../lib/store'
import { usePageTitle } from '../../lib/title'
import { byNewest, fmtDateTime } from '../../lib/util'
import { EmptyState, Icon } from '../../components/common'
import { NewsCard } from '../../components/site/NewsCard'
import './NewsPage.css'

/** 单条新闻。内容与首页卡片相同，只是链接全部展开，并给出相关条目。 */
export default function NewsPage(): JSX.Element {
  const { slug } = useParams()
  const { state } = usePrism()
  const item = state.news.find((n) => n.slug === slug)
  usePageTitle(item?.headline)

  if (!item || item.status !== 'live') {
    return (
      <div className="npage u-shell">
        <EmptyState
          title="找不到这条"
          hint="它可能已经被下架或删除了。"
          icon="search"
          action={<Link className="npage__back" to="/">回到首页</Link>}
        />
      </div>
    )
  }

  const related = byNewest(
    state.news.filter((n) =>
      n.status === 'live' && n.id !== item.id
      && (n.regions.some((r) => item.regions.includes(r)) || n.topics.some((t) => item.topics.includes(t)))),
  ).slice(0, 4)

  return (
    <div className="npage u-shell">
      <Link className="npage__back" to="/"><Icon name="chevron-left" size={14} />回到首页</Link>

      <div className="npage__body">
        <NewsCard item={item} variant="full" />
        <p className="npage__stamp">
          收录于 {fmtDateTime(item.publishedAt)}
          {item.updatedAt !== item.publishedAt && ` · 最后修改 ${fmtDateTime(item.updatedAt)}`}
        </p>
      </div>

      {related.length > 0 && (
        <section className="npage__related" aria-labelledby="npage-rel">
          <h2 className="npage__reltitle" id="npage-rel">相关条目</h2>
          <ul className="npage__rellist">
            {related.map((r) => (
              <li key={r.id}>
                <Link className="npage__rel" to={`/news/${r.slug}`}>
                  <span className="npage__relhead">{r.headline}</span>
                  <span className="npage__relmeta">{r.links.length} 家媒体</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
