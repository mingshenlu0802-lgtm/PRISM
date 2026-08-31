import type { StudyItem } from '../../lib/types'
import { STUDY_KIND } from '../../lib/constants'
import { fmtDate } from '../../lib/util'
import { Badge, Icon } from '../common'
import { TagRow } from './Tags'
import { LinkList } from './LinkList'
import './StudyCard.css'

/**
 * 一项公开研究或数据。
 *
 * 与新闻的区别是两处必填：这项研究**不能**说明什么，以及数据能不能直接下载。
 * 一个数字如果没有它的局限一起给出，就只是一个说法。
 */

export function StudyCard({ item }: { item: StudyItem }): JSX.Element {
  const kind = STUDY_KIND[item.kind]
  return (
    <article className="scard">
      <header className="scard__head">
        <div className="scard__kindrow">
          <Badge tone={kind.tone} size="sm">{kind.zh}</Badge>
          <span className="scard__publisher">{item.publisher}</span>
          <time className="scard__date" dateTime={item.date}>{fmtDate(item.date)}</time>
        </div>
        <h2 className="scard__title">{item.title}</h2>
        <TagRow regions={item.regions} topics={item.topics} size="sm" />
      </header>

      <p className="scard__summary">{item.summary}</p>

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
        <LinkList links={item.links} compact />
      </div>
    </article>
  )
}
