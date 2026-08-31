import { Link } from 'react-router-dom'

import type { Article } from '../../lib/types'
import { cx, fmtDate, relTime } from '../../lib/util'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'

import { Badge, DemoTag, Icon, StatusBadge, TopicChip } from '../common'
import { ConceptImage } from '../visual/ConceptImage'

import './ArticleCard.css'

/**
 * An article in a list.
 *
 * Four densities, one hierarchy: topics, then the headline, then the
 * standfirst, then the evidence line. The evidence line is not decoration —
 * a reader deciding what to open should be able to see how many primary
 * documents a piece rests on before they commit twelve minutes to it.
 */

export interface ArticleCardProps {
  article: Article
  size?: 'lead' | 'md' | 'sm' | 'row'
  showCover?: boolean
  showMeta?: boolean
}

const RATIO = {
  lead: '21-9',
  md: '16-9',
  sm: '16-9',
  row: '3-2',
} as const

export function ArticleCard({
  article,
  size = 'md',
  showCover,
  showMeta = true,
}: ArticleCardProps): JSX.Element {
  const { state } = usePrism()
  const cover = sel.coverOf(state, article)
  const profile = sel.sourceProfile(article, state)
  const withCover = (showCover ?? (size === 'lead' || size === 'md')) && Boolean(cover)

  const stamp = article.publishedAt ?? article.updatedAt
  const live = article.status === 'published'

  return (
    <article className={cx('acard', `acard--${size}`, withCover && 'acard--covered')}>
      {withCover && cover ? (
        <Link
          to={`/article/${article.slug}`}
          className="acard__cover"
          tabIndex={-1}
          aria-hidden="true"
        >
          <ConceptImage asset={cover} ratio={RATIO[size]} />
        </Link>
      ) : null}

      <div className="acard__body">
        <div className="acard__topics">
          {article.topics.slice(0, size === 'row' || size === 'sm' ? 1 : 3).map((t) => (
            <TopicChip key={t} topic={t} link size="sm" />
          ))}
          {!live ? <StatusBadge status={article.status} size="sm" /> : null}
        </div>

        <h3 className="acard__title">
          <Link to={`/article/${article.slug}`} className="acard__titlelink">
            {article.title}
          </Link>
        </h3>

        {size !== 'sm' && size !== 'row' ? (
          <p className="acard__titleen">{article.titleEn}</p>
        ) : null}

        {size === 'lead' || size === 'md' ? (
          <p className="acard__standfirst">{article.standfirst}</p>
        ) : null}

        {showMeta ? (
          <>
            <p className="acard__meta">
              <span className="acard__metaitem">
                <Icon name="globe" size={12} />
                {article.countries.join(' · ')}
              </span>
              <span className="acard__metaitem">
                <Icon name="clock" size={12} />
                {article.readingTime} 分钟
              </span>
              <span className="acard__metaitem">
                <Icon name="calendar" size={12} />
                <time dateTime={stamp} title={fmtDate(stamp)}>{relTime(stamp, state.today)}</time>
              </span>
            </p>

            {size !== 'row' ? (
              <p className="acard__evidence">
                <span className="acard__ev">
                  <span className="acard__evlabel">可信度</span>
                  <span className="acard__evvalue u-num">{article.confidence}</span>
                </span>
                <span className="acard__evsep" aria-hidden="true" />
                <span className="acard__ev">
                  <span className="acard__evlabel">来源</span>
                  <span className="acard__evvalue u-num">{profile.total}</span>
                </span>
                <span className="acard__evsep" aria-hidden="true" />
                <span className="acard__ev">
                  <span className="acard__evlabel">一手</span>
                  <span className="acard__evvalue u-num">{profile.primary}</span>
                </span>
                {article.factCheckIds.length > 0 ? (
                  <>
                    <span className="acard__evsep" aria-hidden="true" />
                    <span className="acard__ev">
                      <span className="acard__evlabel">核查</span>
                      <span className="acard__evvalue u-num">{article.factCheckIds.length}</span>
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
          </>
        ) : null}

        <div className="acard__foot">
          {article.status === 'update-needed' ? (
            <Badge tone="warn" size="sm" icon={<Icon name="alert" size={11} />}>已进入需更新队列</Badge>
          ) : null}
          {article.status === 'retracted' ? (
            <Badge tone="stop" size="sm" icon={<Icon name="x" size={11} />}>已撤回</Badge>
          ) : null}
          {article.corrections.length > 0 ? (
            <Badge tone="neutral" size="sm" icon={<Icon name="history" size={11} />}>
              {article.corrections.length} 条更正记录
            </Badge>
          ) : null}
          <DemoTag compact className="acard__demo" />
        </div>
      </div>
    </article>
  )
}
