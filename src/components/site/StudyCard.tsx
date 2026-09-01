import { Link } from 'react-router-dom'
import type { StudyItem } from '../../lib/types'
import { STUDY_KIND } from '../../lib/constants'
import { cx, fmtDate, textLength } from '../../lib/util'
import { Badge, Icon } from '../common'
import { TagRow } from './Tags'
import { LinkList } from './LinkList'
import { Prose } from './Prose'
import './StudyCard.css'

/**
 * 一项公开研究或数据。
 *
 * 与新闻的区别是两处必填：这项研究**不能**说明什么，以及数据能不能直接下载。
 * 一个数字如果没有它的局限一起给出，就只是一个说法。
 *
 * 其余的排版**和新闻一样**——站长要的：「研究与公开数据排版也要像新闻一样，
 * 可以点进去，有详细的新闻语言总结」。以前它把上千字整篇摊在列表页上，
 * 三项研究就能占满一屏，读者只能一直往下滚。现在列表里收起来，点标题看全文。
 */

/** 列表里收起的门槛。研究比新闻密，给得比新闻略少。 */
const CLAMP_AT = 220

export function StudyCard({ item, variant = 'feed' }: { item: StudyItem; variant?: 'feed' | 'full' }): JSX.Element {
  const kind = STUDY_KIND[item.kind]
  const full = variant === 'full'
  const length = textLength(item.summary)
  const clamped = !full && length > CLAMP_AT
  return (
    <article className={cx('scard', full && 'scard--full')}>
      <header className="scard__head">
        <div className="scard__kindrow">
          <Badge tone={kind.tone} size="sm">{kind.zh}</Badge>
          <span className="scard__publisher">{item.publisher}</span>
          <time className="scard__date" dateTime={item.date}>{fmtDate(item.date)}</time>
        </div>
        {full ? (
          <h1 className="scard__title">{item.title}</h1>
        ) : (
          <h2 className="scard__title">
            <Link to={`/study/${item.slug}`}>{item.title}</Link>
          </h2>
        )}
        <TagRow regions={item.regions} topics={item.topics} size="sm" />
      </header>

      {/* 总结现在是成段的新闻稿，不再是一句话，所以要按段落渲染。 */}
      <div className={cx('scard__summary', clamped && 'scard__summary--clamp')}>
        <Prose text={item.summary} links={item.links} />
      </div>

      {clamped && (
        <Link className="scard__more" to={`/study/${item.slug}`}>
          读全文（{length} 字）
          <Icon name="arrow-right" size={13} />
        </Link>
      )}

      {item.figures.length > 0 && (
        <ul className="scard__figures">
          {item.figures.map((f) => (
            <li key={f.label} className="scard__figure">
              <span className="scard__figlabel">{f.label}</span>
              <span className="scard__figvalue">{f.value}</span>
              <span className="scard__fignote">{f.note}</span>
            </li>
          ))}
        </ul>
      )}

      {/*
        * 局限永远跟着数字走，收起来的时候也要显示。
        * 一个没有边界说明的数字比没有这个数字更糟——那是这一整页存在的理由。
        */}
      <div className="scard__limit">
        <span className="scard__limit-k"><Icon name="alert" size={13} /> 这项研究不能说明什么</span>
        <p className="scard__limit-t">{item.limitation}</p>
      </div>

      {item.datasetUrl && (
        <p className="scard__data">
          <Icon name="database" size={13} />
          <span>原始数据可下载</span>
        </p>
      )}

      <div className="scard__links">
        <LinkList links={item.links} compact={!full} />
      </div>
    </article>
  )
}
