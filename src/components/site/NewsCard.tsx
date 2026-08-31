import { Link } from 'react-router-dom'
import type { NewsItem } from '../../lib/types'
import { cx, paragraphs, relTime, textLength } from '../../lib/util'
import { Icon } from '../common'
import { TagRow } from './Tags'
import { LinkList } from './LinkList'
import { Cover } from './Cover'
import './NewsCard.css'

/**
 * 一条新闻的完整呈现：标题、总结、要点、标签、以及报道它的媒体链接。
 *
 * 总结可以写到几百上千字，空一行分段。长的总结在信息流里收起一半——
 * 一屏放不下三条新闻的首页，读者是不会往下翻的——点进去看全文。
 */

/** 信息流里收起的门槛：头条给得多些，因为它本来就该占位置。 */
const CLAMP_AT = { feed: 240, lead: 480 }

export interface NewsCardProps {
  item: NewsItem
  /** 'feed' 折叠链接，'full' 直接展开，'lead' 是首页头条 */
  variant?: 'feed' | 'full' | 'lead'
  today?: string
}

export function NewsCard({ item, variant = 'feed', today }: NewsCardProps): JSX.Element {
  const full = variant === 'full'
  const lead = variant === 'lead'
  const length = textLength(item.summary)
  const clamped = !full && length > CLAMP_AT[lead ? 'lead' : 'feed']
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

      {/* 内容提示永远排在图之前——读者要先有机会决定看不看。 */}
      {item.contentNotice && (
        <p className="ncard__notice">
          <Icon name="shield" size={13} />
          <span>{item.contentNotice}</span>
        </p>
      )}

      <Cover
        image={item.image}
        seed={item.slug}
        regions={item.regions}
        topics={item.topics}
        variant={full ? 'full' : lead ? 'lead' : 'feed'}
      />

      <div className={cx('ncard__summary', clamped && 'ncard__summary--clamp')}>
        {paragraphs(item.summary).map((p, i) => <p key={i}>{p}</p>)}
      </div>

      {clamped && (
        <Link className="ncard__more" to={`/news/${item.slug}`}>
          读全文（{length} 字）
          <Icon name="arrow-right" size={13} />
        </Link>
      )}

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
