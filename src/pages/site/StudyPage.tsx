import { Link, useParams } from 'react-router-dom'
import { usePrism } from '../../lib/store'
import { usePageTitle } from '../../lib/title'
import { byNewest, fmtDateTime } from '../../lib/util'
import { EmptyState, Icon } from '../../components/common'
import { StudyCard } from '../../components/site/StudyCard'
import './NewsPage.css'

/**
 * 单项研究。
 *
 * 和新闻的详情页是同一套版式——站长要研究「排版也要像新闻一样，可以点进去」。
 * 复用 NewsPage.css 不是偷懒：两者在读者眼里就该是同一种东西，
 * 一份读物；差别只在研究多了「不能说明什么」和关键数字。
 */
export default function StudyPage(): JSX.Element {
  const { slug } = useParams()
  const { state } = usePrism()
  const item = state.studies.find((s) => s.slug === slug)
  usePageTitle(item?.title)

  if (!item || item.status !== 'live') {
    return (
      <div className="npage u-shell">
        <EmptyState
          title="找不到这一项"
          hint="它可能已经被下架或删除了。"
          icon="search"
          action={<Link className="npage__back" to="/studies">回到研究与数据</Link>}
        />
      </div>
    )
  }

  const related = byNewest(
    state.studies.filter((s) =>
      s.status === 'live' && s.id !== item.id
      && (s.regions.some((r) => item.regions.includes(r)) || s.topics.some((t) => item.topics.includes(t)))),
  ).slice(0, 4)

  return (
    <div className="npage u-shell">
      <Link className="npage__back" to="/studies"><Icon name="chevron-left" size={14} />回到研究与数据</Link>

      <div className="npage__body">
        <StudyCard item={item} variant="full" />
        <p className="npage__stamp">发布于 {fmtDateTime(item.date)}</p>
      </div>

      {related.length > 0 && (
        <section className="npage__related" aria-labelledby="spage-rel">
          <h2 className="npage__reltitle" id="spage-rel">相关研究</h2>
          <ul className="npage__rellist">
            {related.map((r) => (
              <li key={r.id}>
                <Link className="npage__rel" to={`/study/${r.slug}`}>
                  <span className="npage__relhead">{r.title}</span>
                  <span className="npage__relmeta">{r.publisher}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
