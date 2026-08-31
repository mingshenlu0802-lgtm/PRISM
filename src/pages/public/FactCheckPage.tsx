import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

import type { Citation, Source } from '../../lib/types'
import { VERDICTS, VERDICT_MAP } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { citationNumbers, cx, fmtDate, isPrimarySource } from '../../lib/util'
import {
  Badge, DemoTag, EmptyState, Icon, Meter, SourceCard, TopicChip, VerdictBadge,
} from '../../components/common'

import './FactCheckPage.css'

/**
 * A single fact-check.
 *
 * The order of this page is the order of the argument: the claim as it
 * circulates → where it came from and how it travelled → the reasoning, step by
 * step → the evidence each step rests on → and, given equal weight rather than
 * a footnote, what would change the conclusion. A verdict whose falsification
 * conditions are unstated is an opinion, so 「什么会改变这个结论」 is a panel,
 * not a sentence at the bottom.
 *
 * Revision history is never hidden: when a verdict has moved, the earlier
 * verdict and the reason for the move stay on the page permanently.
 */

const PUBLIC_STATUSES = new Set(['published', 'update-needed', 'retracted'])

export default function FactCheckPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const { state } = usePrism()

  const check = useMemo(
    () => state.factChecks.find((f) => f.id === id),
    [state.factChecks, id],
  )
  const article = useMemo(
    () => (check ? state.articles.find((a) => a.id === check.articleId) : undefined),
    [state.articles, check],
  )

  /* Evidence rows: citation → source, in the article's own numbering. */
  const evidence = useMemo(() => {
    if (!check || !article) return []
    const numbers = citationNumbers(article)
    const sourceById = new Map(state.sources.map((s) => [s.id, s]))
    return check.citationIds.map((citationId) => {
      const citation: Citation | undefined = article.citations.find((c) => c.id === citationId)
      const source: Source | undefined = citation ? sourceById.get(citation.sourceId) : undefined
      return { citationId, citation, source, n: numbers.get(citationId) }
    })
  }, [check, article, state.sources])

  const siblings = useMemo(
    () => (check ? state.factChecks.filter((f) => f.articleId === check.articleId && f.id !== check.id) : []),
    [state.factChecks, check],
  )

  if (!check) {
    return (
      <div className="fcpage fcpage--missing u-shell">
        <nav className="fcpage__crumbs" aria-label="面包屑">
          <Link to="/fact-checks">事实核查</Link>
        </nav>
        <EmptyState
          icon="search"
          title="找不到这条核查"
          hint={`本站没有编号为「${id ?? '（未提供）'}」的核查记录。它可能从未存在，或链接被截断了。`}
          action={<Link className="fcpage__btn" to="/fact-checks">回到核查索引</Link>}
        />
      </div>
    )
  }

  const def = VERDICT_MAP[check.verdict]
  const rungIndex = VERDICTS.findIndex((v) => v.key === check.verdict)
  const history = check.history ?? []
  const tiers = evidence.reduce(
    (acc, row) => {
      if (!row.source) return acc
      if (isPrimarySource(row.source)) acc.primary += 1
      else if (row.source.tier === 'secondary') acc.secondary += 1
      else acc.tertiary += 1
      return acc
    },
    { primary: 0, secondary: 0, tertiary: 0 },
  )
  const missingEvidence = evidence.filter((row) => !row.source).length
  const entryIsPublic = Boolean(article && PUBLIC_STATUSES.has(article.status))

  return (
    <div className={cx('fcpage', `fcpage--${def.tone}`)}>
      {/* ---------------------------------------------------------- header -- */}
      <header className="fcpage__head">
        <div className="u-shell">
          <nav className="fcpage__crumbs" aria-label="面包屑">
            <Link to="/fact-checks">事实核查</Link>
            <span aria-hidden="true">›</span>
            {article ? (
              <Link to={`/article/${article.slug}`}>{article.title}</Link>
            ) : (
              <span>未关联条目</span>
            )}
          </nav>

          <div className="fcpage__verdict-row">
            <VerdictBadge verdict={check.verdict} size="lg" showEn />
            <span className="fcpage__rung u-mono" aria-label={`结论阶梯第 ${rungIndex + 1} 级，共 ${VERDICTS.length} 级`}>
              阶梯 {String(rungIndex + 1).padStart(2, '0')} / {VERDICTS.length}
            </span>
            <DemoTag className="fcpage__demotag" />
          </div>

          <div className="fcpage__standard">
            <p className="u-eyebrow">这一级结论的证据门槛</p>
            <p className="fcpage__standard-text">{def.standard}</p>
          </div>

          <dl className="fcpage__meta">
            <div className="fcpage__meta-item">
              <dt>核查日期</dt>
              <dd className="u-num">{fmtDate(check.checkedAt)}</dd>
            </div>
            <div className="fcpage__meta-item">
              <dt>复核</dt>
              <dd>{check.reviewedBy}</dd>
            </div>
            <div className="fcpage__meta-item">
              <dt>核查编号</dt>
              <dd className="u-mono">{check.id}</dd>
            </div>
            <div className="fcpage__meta-item">
              <dt>结论修订</dt>
              <dd>{history.length > 0 ? `${history.length} 次（记录见下）` : '无'}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="fcpage__body u-shell">
        <main className="fcpage__main">
          {/* -------------------------------------------------------- claim -- */}
          <section className="fcpage__section" aria-labelledby="fcpage-claim-h">
            <h2 className="fcpage__h2" id="fcpage-claim-h">被核查的说法</h2>
            <blockquote className="fcpage__claim">
              <p>「{check.claim}」</p>
            </blockquote>
            <p className="fcpage__claim-note">
              以上是这个说法<strong>正在流传的形式</strong>，本站原样引用、不做润色，也不代表本站认同其表述方式。
            </p>

            <div className="fcpage__summary">
              <p className="u-eyebrow">一句话结论</p>
              <p className="fcpage__summary-text">{check.summary}</p>
            </div>
          </section>

          {/* ------------------------------------------------------- origin -- */}
          <section className="fcpage__section" aria-labelledby="fcpage-origin-h">
            <h2 className="fcpage__h2" id="fcpage-origin-h">这个说法从哪来、怎么传的</h2>
            <p className="fcpage__note">
              一个说法的来源与传播路径本身就是证据的一部分：它决定了我们该向谁求证，
              也决定了「很多人都这么说」到底意味着很多份独立材料，还是同一份材料被转述了很多次。
            </p>
            <div className="fcpage__origin-grid">
              <div className="fcpage__origin-card">
                <p className="fcpage__origin-k">
                  <Icon name="target" size={14} />
                  出处
                </p>
                <p className="fcpage__origin-text">{check.claimOrigin}</p>
              </div>
              <div className="fcpage__origin-card">
                <p className="fcpage__origin-k">
                  <Icon name="branch" size={14} />
                  传播方式
                </p>
                <p className="fcpage__origin-text">{check.spreadNote}</p>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------- reasoning -- */}
          <section className="fcpage__section" aria-labelledby="fcpage-reasoning-h">
            <h2 className="fcpage__h2" id="fcpage-reasoning-h">核查过程</h2>
            <p className="fcpage__note">
              以下每一步都可以被单独检验。若你认为结论有误，请指出是哪一步出了问题 ——
              这也是本站内部复核时使用的方式。
            </p>
            <ol className="fcpage__chain">
              {check.reasoning.map((step, i) => (
                <li className="fcpage__step" key={`${check.id}-step-${i}`}>
                  <span className="fcpage__step-n u-mono" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="fcpage__step-text">
                    <span className="u-sr">第 {i + 1} 步：</span>
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* ----------------------------------------------------- evidence -- */}
          <section className="fcpage__section" aria-labelledby="fcpage-evidence-h">
            <div className="fcpage__section-head">
              <h2 className="fcpage__h2" id="fcpage-evidence-h">这条结论所依据的材料</h2>
              <p className="fcpage__evidence-count">
                <span className="u-num">{evidence.length}</span> 项引用 ·
                一手 <span className="u-num">{tiers.primary}</span> ·
                二手 <span className="u-num">{tiers.secondary}</span> ·
                三手 <span className="u-num">{tiers.tertiary}</span>
              </p>
            </div>
            <p className="fcpage__note">
              每一项都写明它到底承载了哪一句话（而不只是「参考文献」），并附来源层级与可信度评分。
              评分永远附带依据，且不用于自动过滤，只用于提示读者与编辑该在哪里多花一点注意力。
            </p>

            {evidence.length === 0 ? (
              <EmptyState
                icon="database"
                title="这条核查没有附加可显示的引用"
                hint="当核查结论建立在「材料不存在」之上时，可引用的记录本身就是空的；理由写在上面的核查过程里。"
              />
            ) : (
              <ol className="fcpage__evidence">
                {evidence.map((row) => (
                  <li className="fcpage__evidence-item" key={row.citationId}>
                    <div className="fcpage__evidence-claim">
                      <span className="fcpage__evidence-n u-mono" aria-hidden="true">
                        [{row.n ?? '—'}]
                      </span>
                      <div className="fcpage__evidence-claim-body">
                        <p className="fcpage__evidence-text">
                          <span className="u-sr">这项引用承载的说法：</span>
                          {row.citation ? row.citation.claim : '本站未能在条目记录中找到这项引用所对应的具体陈述。'}
                        </p>
                        {row.citation?.locator ? (
                          <p className="fcpage__evidence-locator u-mono">定位：{row.citation.locator}</p>
                        ) : null}
                      </div>
                    </div>
                    {row.source ? (
                      <SourceCard source={row.source} n={row.n} />
                    ) : (
                      <p className="fcpage__evidence-missing">
                        <Icon name="alert" size={14} />
                        对应的来源记录已不在本站来源库中，因此这项引用当前无法向读者展开。
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {missingEvidence > 0 ? (
              <p className="fcpage__warn">
                <Icon name="alert" size={14} />
                其中 <span className="u-num">{missingEvidence}</span> 项引用暂时无法展开来源记录。
                本站保留这一提示而不是删掉该行 —— 隐藏缺口比缺口本身更糟。
              </p>
            ) : null}
          </section>

          {/* ------------------------------------------------- what changes -- */}
          <section className="fcpage__change" aria-labelledby="fcpage-change-h">
            <p className="u-eyebrow fcpage__change-eyebrow">本站对每条核查的强制要求</p>
            <h2 className="fcpage__change-h" id="fcpage-change-h">什么会改变这个结论</h2>
            <p className="fcpage__change-text">{check.whatWouldChangeIt}</p>
            <p className="fcpage__change-foot">
              一个说不出自己会被什么推翻的结论，不是核查结论，是立场。
              如果你手上有上述材料，请通过条目页脚的联系方式提供 —— 本站会重新核查并公开记录修订过程。
            </p>
          </section>

          {/* ------------------------------------------------------ history -- */}
          {history.length > 0 ? (
            <section className="fcpage__section" aria-labelledby="fcpage-history-h">
              <h2 className="fcpage__h2" id="fcpage-history-h">结论修订记录</h2>
              <p className="fcpage__note">
                结论被修订时，旧结论、修订日期与修订理由一并公开保留，不静默替换。
                下面按时间倒序列出这条核查此前给出过的结论。
              </p>
              <ol className="fcpage__history">
                <li className="fcpage__history-item fcpage__history-item--now">
                  <div className="fcpage__history-top">
                    <Badge tone="live" icon={<Icon name="check" size={12} />}>当前结论</Badge>
                    <span className="fcpage__history-date u-num">{fmtDate(check.checkedAt)}</span>
                  </div>
                  <VerdictBadge verdict={check.verdict} size="sm" />
                  <p className="fcpage__history-note">{check.summary}</p>
                </li>
                {history.map((entry, i) => (
                  <li className="fcpage__history-item" key={`${check.id}-hist-${i}`}>
                    <div className="fcpage__history-top">
                      <Badge tone="neutral" icon={<Icon name="history" size={12} />}>此前结论</Badge>
                      <span className="fcpage__history-date u-num">{fmtDate(entry.at)}</span>
                    </div>
                    <VerdictBadge verdict={entry.verdict} size="sm" />
                    <p className="fcpage__history-note">{entry.note}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </main>

        {/* ----------------------------------------------------------- rail -- */}
        <aside className="fcpage__rail" aria-label="相关信息">
          <div className="fcpage__rail-card">
            <p className="u-eyebrow">所属条目</p>
            {article ? (
              <>
                <h2 className="fcpage__rail-title">
                  <Link to={`/article/${article.slug}`}>{article.title}</Link>
                </h2>
                <p className="fcpage__rail-standfirst">{article.standfirst}</p>
                <div className="fcpage__rail-topics">
                  {article.topics.map((topic) => (
                    <TopicChip key={topic} topic={topic} link />
                  ))}
                </div>
                <div className="fcpage__rail-meter">
                  <Meter
                    value={article.confidence}
                    label="条目整体可信度"
                    hint={article.confidenceBasis}
                    size="sm"
                  />
                </div>
                {!entryIsPublic ? (
                  <p className="fcpage__rail-warn">
                    <Icon name="alert" size={13} />
                    该条目当前不在公开列表中，核查记录仍然保留可读。
                  </p>
                ) : null}
                <Link className="fcpage__rail-link" to={`/article/${article.slug}`}>
                  阅读完整条目
                  <Icon name="arrow-right" size={14} />
                </Link>
              </>
            ) : (
              <p className="fcpage__rail-standfirst">这条核查没有关联到任何条目。</p>
            )}
          </div>

          {siblings.length > 0 ? (
            <div className="fcpage__rail-card">
              <p className="u-eyebrow">同一条目下的其他核查</p>
              <ul className="fcpage__sibs">
                {siblings.map((sib) => (
                  <li key={sib.id}>
                    <Link className="fcpage__sib" to={`/fact-checks/${sib.id}`}>
                      <VerdictBadge verdict={sib.verdict} size="sm" />
                      <span className="fcpage__sib-claim">「{sib.claim}」</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="fcpage__rail-card">
            <p className="u-eyebrow">这条结论在阶梯上的位置</p>
            <ol className="fcpage__ladder">
              {VERDICTS.map((v, i) => {
                const on = v.key === check.verdict
                return (
                  <li key={v.key} className={cx('fcpage__ladder-row', on && 'fcpage__ladder-row--on')}>
                    <span className="fcpage__ladder-ord u-mono" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <Link className="fcpage__ladder-link" to={`/fact-checks?verdict=${v.key}`}>
                      <VerdictBadge verdict={v.key} size="sm" />
                      {on ? <span className="u-sr">（本条核查所处的一级）</span> : null}
                    </Link>
                  </li>
                )
              })}
            </ol>
            <p className="fcpage__rail-note">
              「缺乏足够证据」记录的是证据不足，不等于该说法为假；「无法核实」记录的是取证受阻。
            </p>
            <Link className="fcpage__rail-link" to="/method">
              阅读方法与证据标准
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>

          <div className="fcpage__rail-card fcpage__rail-card--demo">
            <p className="u-eyebrow">关于本页数据</p>
            <p className="fcpage__rail-note">
              本核查、其引用与全部来源均为原型演示用虚构内容。所有来源链接位于保留域名
              <span className="u-mono"> demo.prism.invalid</span>，永远不会解析到任何真实页面。
            </p>
            <DemoTag />
          </div>
        </aside>
      </div>
    </div>
  )
}
