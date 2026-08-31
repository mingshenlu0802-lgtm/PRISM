import { Link } from 'react-router-dom'

import type { Article, FactCheck } from '../../lib/types'
import { VERDICT_MAP } from '../../lib/constants'
import { citationNumbers, cx, fmtDate } from '../../lib/util'
import { usePrism } from '../../lib/store'

import { Badge, DemoTag, Icon, VerdictBadge } from '../common'

import './FactCheckCard.css'

/**
 * One fact-check.
 *
 * The order is deliberate and matches the desk's own method: the claim exactly
 * as it circulates, where it came from and how it is spreading, the verdict
 * with the standard that verdict demands, the reasoning step by step, the
 * material each step rests on, and finally the question every check in this
 * product must answer — what new evidence would change this?
 */

export interface FactCheckCardProps {
  check: FactCheck
  article?: Article
  compact?: boolean
  link?: boolean
}

export function FactCheckCard({
  check,
  article,
  compact = false,
  link = false,
}: FactCheckCardProps): JSX.Element {
  const { state } = usePrism()
  const host = article ?? state.articles.find((a) => a.id === check.articleId)
  const numbers = host ? citationNumbers(host) : new Map<string, number>()
  const def = VERDICT_MAP[check.verdict]

  const cited = check.citationIds
    .map((id) => {
      const citation = host?.citations.find((c) => c.id === id)
      const source = citation ? state.sources.find((s) => s.id === citation.sourceId) : undefined
      return { id, n: numbers.get(id), citation, source }
    })
    .filter((c) => Boolean(c.citation))

  const claimNode = link
    ? (
      <Link className="fcheck__claimlink" to={`/fact-checks/${check.id}`}>
        {check.claim}
      </Link>
    )
    : check.claim

  return (
    <article
      className={cx('fcheck', compact && 'fcheck--compact', `fcheck--${def ? def.tone : 'unknown'}`)}
      aria-labelledby={`fc-${check.id}-claim`}
    >
      <header className="fcheck__head">
        <div className="fcheck__headtop">
          <p className="fcheck__kicker">
            <Icon name="check-double" size={13} />
            <span>事实核查 · Fact-check</span>
          </p>
          <VerdictBadge verdict={check.verdict} size={compact ? 'sm' : 'md'} showEn={!compact} />
        </div>

        <blockquote className="fcheck__claim" id={`fc-${check.id}-claim`}>
          <span className="fcheck__quotemark" aria-hidden="true">「</span>
          {claimNode}
          <span className="fcheck__quotemark" aria-hidden="true">」</span>
        </blockquote>

        <p className="fcheck__claimnote">
          以上为正在流传的说法原样引述，不代表本站立场。
        </p>
      </header>

      {def && !compact ? (
        <p className="fcheck__standard">
          <span className="fcheck__standard-label">这一级结论的门槛</span>
          <span>{def.standard}</span>
        </p>
      ) : null}

      <p className="fcheck__summary">{check.summary}</p>

      {!compact ? (
        <>
          <div className="fcheck__grid">
            <section className="fcheck__field">
              <p className="fcheck__key">说法来源</p>
              <p className="fcheck__val">{check.claimOrigin}</p>
            </section>
            <section className="fcheck__field">
              <p className="fcheck__key">传播情况</p>
              <p className="fcheck__val">{check.spreadNote}</p>
            </section>
          </div>

          {check.reasoning.length > 0 ? (
            <section className="fcheck__reasoning">
              <p className="fcheck__key">核查过程</p>
              <ol className="fcheck__steps">
                {check.reasoning.map((step, i) => (
                  <li key={`${check.id}-r${i}`} className="fcheck__step">
                    <span className="fcheck__stepn u-num" aria-hidden="true">{i + 1}</span>
                    <span className="fcheck__steptext">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {cited.length > 0 ? (
            <section className="fcheck__sources">
              <p className="fcheck__key">依据的材料</p>
              <ul className="fcheck__sourcelist">
                {cited.map(({ id, n, citation, source }) => (
                  <li key={id} className="fcheck__source">
                    <span className="fcheck__sourcen u-num">[{n ?? '?'}]</span>
                    <span className="fcheck__sourcebody">
                      <span className="fcheck__sourcetitle">
                        {source ? `${source.publisher}《${source.title}》` : '来源记录缺失'}
                      </span>
                      {citation?.locator ? (
                        <span className="fcheck__sourceloc">{citation.locator}</span>
                      ) : null}
                      <span className="fcheck__sourceclaim">{citation?.claim}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="fcheck__change">
            <p className="fcheck__changekey">
              <Icon name="refresh" size={13} />
              <span>什么样的新证据会改变这个结论</span>
            </p>
            <p className="fcheck__changetext">{check.whatWouldChangeIt}</p>
          </section>

          {check.history && check.history.length > 0 ? (
            <section className="fcheck__history">
              <p className="fcheck__key">结论修订记录</p>
              <ol className="fcheck__historylist">
                {check.history.map((h, i) => (
                  <li key={`${check.id}-h${i}`} className="fcheck__historyitem">
                    <time className="fcheck__historydate u-num" dateTime={h.at}>{fmtDate(h.at)}</time>
                    <VerdictBadge verdict={h.verdict} size="sm" />
                    <span className="fcheck__historynote">{h.note}</span>
                  </li>
                ))}
              </ol>
              <p className="fcheck__historyfoot">旧结论与修订理由公开保留，不静默替换。</p>
            </section>
          ) : null}
        </>
      ) : null}

      <footer className="fcheck__foot">
        <span className="fcheck__by">
          <Icon name="users" size={12} />
          {check.reviewedBy}
        </span>
        <span className="fcheck__at">
          <Icon name="calendar" size={12} />
          核查于 <time dateTime={check.checkedAt}>{fmtDate(check.checkedAt)}</time>
        </span>
        {host && !article ? (
          <Link className="fcheck__hostlink" to={`/article/${host.slug}`}>
            <Icon name="file" size={12} />
            {host.title}
          </Link>
        ) : null}
        {link ? (
          <Link className="fcheck__more" to={`/fact-checks/${check.id}`}>
            完整核查记录
            <Icon name="arrow-right" size={13} />
          </Link>
        ) : null}
        <Badge tone="neutral" size="sm">{check.citationIds.length} 项依据</Badge>
        <DemoTag compact />
      </footer>
    </article>
  )
}
