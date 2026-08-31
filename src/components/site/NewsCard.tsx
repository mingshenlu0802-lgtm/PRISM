import { Link } from 'react-router-dom'
import type { NewsItem } from '../../lib/types'
import { cx, relTime } from '../../lib/util'
import { Icon } from '../common'
import { TagRow } from './Tags'
import { LinkList } from './LinkList'
import './NewsCard.css'

/**
 * 一条新闻的完整呈现：标题、一段总结、要点、标签、以及报道它的媒体链接。
 *
 * 这就是全部内容——没有「阅读全文」，因为总结本身就是全文。展开的只是链接。
 */

export interface NewsCardProps {
  item: NewsItem
  /** 'feed' 折叠链接，'full' 直接展开，'lead' 是首页头条 */
  variant?: 'feed' | 'full' | 'lead'
  today?: string
}

export function NewsCard({ item, variant = 'feed', today }: NewsCardProps): JSX.Element {
  const full = variant === 'full'
  const lead = variant === 'lead'
  return (
    <article className={cx('ncard', full && 'ncard--full', lead && 'ncard--lead')}>
      <header className="ncard__head">
        {lead && <p className="ncard__lead">头条</p>}
        <TagRow regions={item.regions} topics={item.topics} size="sm" />
        {full ? (
          <h1 className="ncard__title">{item.headline}</h1>
        ) : (
          <h2 className="ncard__title">
            <Link to={`/news/${item.slug}`}>{item.headline}</Link>
          </h2>
        )}
        <p className="ncard__when">
          <time dateTime={item.publishedAt}>{relTime(item.publishedAt, today)}</time>
          {item.editedByHuman && <span className="ncard__edited">· 站长已校订</span>}
        </p>
      </header>

      {item.contentNotice && (
        <p className="ncard__notice">
          <Icon name="shield" size={13} />
          <span>{item.contentNotice}</span>
        </p>
      )}

      <p className="ncard__summary">{item.summary}</p>

      {item.bullets.length > 0 && (
        <ul className="ncard__bullets">
          {item.bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}

      {item.editorNote && (
        <p className="ncard__editornote">
          <span className="ncard__editornote-k">站长补充</span>
          {item.editorNote}
        </p>
      )}

      <div className="ncard__links">
        <p className="ncard__linkhead">
          <Icon name="link" size={13} />
          {item.links.length} 家媒体报道了这条
        </p>
        <LinkList links={item.links} compact={!full && !lead} />
      </div>

      {!full && (
        <Link className="ncard__perma" to={`/news/${item.slug}`}>
          单独查看这条
          <Icon name="arrow-right" size={13} />
        </Link>
      )}
    </article>
  )
}
