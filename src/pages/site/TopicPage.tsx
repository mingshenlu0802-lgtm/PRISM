import { Link, useParams } from 'react-router-dom'
import { TOPIC_MAP } from '../../lib/constants'
import type { TopicKey } from '../../lib/types'
import { usePrism } from '../../lib/store'
import { byNewest } from '../../lib/util'
import { EmptyState } from '../../components/common'
import { NewsCard } from '../../components/site/NewsCard'
import { StudyCard } from '../../components/site/StudyCard'
import './ListPage.css'

export default function TopicPage(): JSX.Element {
  const { key } = useParams()
  const { state } = usePrism()
  const topic = key ? TOPIC_MAP[key as TopicKey] : undefined

  if (!topic) {
    return (
      <div className="lpage u-shell">
        <EmptyState title="没有这个议题" hint="从顶部的「议题」菜单里选一个。" icon="grid"
          action={<Link className="lpage__back" to="/">回到今日</Link>} />
      </div>
    )
  }

  const news = byNewest(state.news.filter((n) => n.status === 'live' && n.topics.includes(topic.key)))
  const studies = byNewest(state.studies.filter((s) => s.status === 'live' && s.topics.includes(topic.key)))

  return (
    <div className="lpage u-shell">
      <header className="lpage__head">
        <span className="lpage__gem" style={{ background: topic.hue }} aria-hidden="true" />
        <div>
          <h1 className="lpage__title">{topic.zh}</h1>
          <p className="lpage__en">{topic.en}</p>
        </div>
      </header>
      <p className="lpage__scope">{topic.blurb}</p>
      <p className="lpage__count">{news.length} 条新闻 · {studies.length} 项研究与数据</p>

      {news.length === 0 && studies.length === 0 ? (
        <EmptyState title="这个议题暂时还没有内容" hint="换一个议题看看。" icon="grid" />
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
