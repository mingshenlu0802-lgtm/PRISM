import { useId, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Article, DivergencePosition, ImageAsset, ReviewDecision, RiskFlag } from '../../lib/types'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { citationNumbers, cx, nowIso, relTime, stripCitations } from '../../lib/util'
import type { BadgeTone } from '../common'
import { Badge, DemoTag, Icon, Meter, RiskChip, StatusBadge, TopicChip } from '../common'
import { ConceptImage } from '../visual/ConceptImage'
import { DecisionBar } from './DecisionBar'
import './ReviewCard.css'

/**
 * One entry in the approval queue.
 *
 * Everything an editor needs in order to decide is on the card itself: what is
 * blocking publication and why, how strong the sourcing actually is, where the
 * sources disagree, which risks are still open, which citations failed their
 * check, and what the cover image is — with its approval state visible, because
 * an unapproved cover blocks publishing on its own.
 */

export interface ReviewCardProps {
  article: Article
  /** 'full' shows the cover preview, meters, divergences and risks; 'row' is the compact list form. */
  variant?: 'full' | 'row'
  onDecide?: (d: ReviewDecision) => void
  showDecisions?: boolean
}

const WEIGHT_RANK: Record<DivergencePosition['weight'], number> = { strong: 3, moderate: 2, weak: 1 }
const WEIGHT_ZH: Record<DivergencePosition['weight'], string> = { strong: '证据强', moderate: '证据中', weak: '证据弱' }
const SEVERITY_ORDER: Record<RiskFlag['severity'], number> = { critical: 0, high: 1, medium: 2, low: 3 }

const COVER_STATE: Record<ImageAsset['status'], { zh: string; tone: BadgeTone }> = {
  approved: { zh: '封面已通过审核', tone: 'go' },
  draft: { zh: '封面待审核', tone: 'warn' },
  rejected: { zh: '封面已退回', tone: 'stop' },
}

function divergencePositions(a: Article): DivergencePosition[] {
  const out: DivergencePosition[] = []
  for (const section of a.sections) {
    for (const block of section.blocks) {
      if (block.type === 'divergence') out.push(...block.positions)
    }
  }
  return out
}

/** The pair whose evidence weights are furthest apart — the sharpest disagreement. */
function sharpestPair(positions: DivergencePosition[]): [DivergencePosition, DivergencePosition] | null {
  if (positions.length < 2) return null
  let best: [DivergencePosition, DivergencePosition] = [positions[0], positions[1]]
  let bestGap = -1
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const gap = Math.abs(WEIGHT_RANK[positions[i].weight] - WEIGHT_RANK[positions[j].weight])
      if (gap > bestGap) { bestGap = gap; best = [positions[i], positions[j]] }
    }
  }
  return best
}

function oneLine(text: string, max: number): string {
  const plain = stripCitations(text).replace(/\s+/g, ' ').trim()
  const first = plain.split('。')[0]
  const s = first.length > 0 ? first : plain
  return s.length > max ? `${s.slice(0, max)}…` : s
}

export function ReviewCard({
  article, variant = 'full', onDecide, showDecisions = true,
}: ReviewCardProps): JSX.Element {
  const { state } = usePrism()
  const titleId = useId()

  const gate = useMemo(() => sel.publishGate(article, state), [article, state])
  const profile = useMemo(() => sel.sourceProfile(article, state), [article, state])
  const cover = sel.coverOf(state, article)
  const proposals = sel.proposalsOf(state, article.id)
  const numbers = useMemo(() => citationNumbers(article), [article])

  const risks = useMemo(
    () => [...sel.openRisks(article)].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [article],
  )
  const resolvedRisks = article.riskFlags.length - risks.length

  const fails = sel.failedChecks(article)
  const warns = sel.warnChecks(article)
  const checked = article.citationChecks.length
  const passes = checked - fails.length - warns.length
  const health = sel.citationHealth(article)

  const positions = useMemo(() => divergencePositions(article), [article])
  const sharp = useMemo(() => sharpestPair(positions), [positions])

  const failed = fails.map((c) => ({
    key: c.citationId,
    n: numbers.get(c.citationId),
    claim: article.citations.find((x) => x.id === c.citationId)?.claim ?? '（该引用已不在正文中）',
    reason: c.reason,
  }))

  const blocked = gate.blockers.length > 0
  const to = `/command/article/${article.id}`
  const updatedLabel = relTime(article.updatedAt, nowIso())

  /* ------------------------------- row form ------------------------------- */

  if (variant === 'row') {
    return (
      <article className={cx('rvc', 'rvc--row', blocked && 'rvc--blocked')} aria-labelledby={titleId}>
        <div className="rvc__rowmain">
          <div className="rvc__rowtop">
            <StatusBadge status={article.status} />
            {blocked ? (
              <span className="rvc__blockpill">
                <Icon name="alert" size={11} />
                发布被阻断 {gate.blockers.length}
              </span>
            ) : (
              <span className="rvc__okpill">
                <Icon name="check" size={11} />
                无阻断项
              </span>
            )}
            {proposals.length > 0 ? (
              <span className="rvc__proppill">
                <Icon name="diff" size={11} />
                {proposals.length} 个提案版本待确认
              </span>
            ) : null}
          </div>

          <h3 className="rvc__rowtitle" id={titleId}>
            <Link to={to}>{article.title}</Link>
          </h3>

          <ul className="rvc__rowstats">
            <li><span className="rvc__k">可信度</span><span className="rvc__v u-num">{article.confidence}</span></li>
            <li><span className="rvc__k">来源</span><span className="rvc__v u-num">{profile.total}</span></li>
            <li><span className="rvc__k">一手</span><span className="rvc__v u-num">{profile.primary}</span></li>
            <li><span className="rvc__k">独立</span><span className="rvc__v u-num">{profile.independent}</span></li>
            <li>
              <span className="rvc__k">引用</span>
              <span className="rvc__v u-num">
                <span className="rvc__chk rvc__chk--pass">通过 {passes}</span>
                <span className="rvc__chk rvc__chk--warn">保留 {warns.length}</span>
                <span className="rvc__chk rvc__chk--fail">未过 {fails.length}</span>
              </span>
            </li>
            <li><span className="rvc__k">未处理风险</span><span className="rvc__v u-num">{risks.length}</span></li>
            <li><span className="rvc__k">争议点</span><span className="rvc__v u-num">{positions.length}</span></li>
            <li><span className="rvc__k">更新</span><span className="rvc__v">{updatedLabel}</span></li>
          </ul>

          {blocked ? (
            <p className="rvc__rowblock">
              <Icon name="alert" size={12} />
              {gate.blockers[0]}
              {gate.blockers.length > 1 ? `（另有 ${gate.blockers.length - 1} 项）` : ''}
            </p>
          ) : null}

          {risks.length > 0 ? (
            <div className="rvc__rowrisks">
              {risks.slice(0, 3).map((r) => <RiskChip key={r.id} flag={r} compact />)}
              {risks.length > 3 ? <span className="rvc__more">+{risks.length - 3}</span> : null}
            </div>
          ) : null}
        </div>

        {showDecisions ? (
          <div className="rvc__rowdecide">
            <DecisionBar article={article} size="sm" layout="row" onDecided={onDecide} />
          </div>
        ) : null}
      </article>
    )
  }

  /* ------------------------------- full form ------------------------------ */

  return (
    <article className={cx('rvc', 'rvc--full', blocked && 'rvc--blocked')} aria-labelledby={titleId}>
      <div className="rvc__cover">
        {cover ? (
          <>
            <ConceptImage asset={cover} ratio="4-3" />
            <p className="rvc__coverstate">
              <Badge tone={COVER_STATE[cover.status].tone} size="sm">
                {COVER_STATE[cover.status].zh}
              </Badge>
            </p>
            <p className="rvc__coverguard">
              <span className="rvc__coverkey">图像守则</span>
              {cover.guardrail}
            </p>
          </>
        ) : (
          <div className="rvc__nocover tex-graticule">
            <span className="rvc__nocover-glyph" aria-hidden="true"><Icon name="image" size={20} /></span>
            <p className="rvc__nocover-title">尚未生成封面素材</p>
            <p className="rvc__nocover-hint">
              条目可以在没有封面的情况下审批；一旦生成，未通过审核的封面会直接阻断发布。
            </p>
            <Link className="rvc__nocover-link" to={`/command/article/${article.id}/studio`}>
              前往视觉工作室
              <Icon name="arrow-right" size={12} />
            </Link>
          </div>
        )}
      </div>

      <div className="rvc__body">
        <header className="rvc__head">
          <div className="rvc__badges">
            <StatusBadge status={article.status} size="md" />
            {proposals.length > 0 ? (
              <Link className="rvc__prop" to={`/command/article/${article.id}/versions`}>
                <Icon name="diff" size={12} />
                {proposals.length} 个提案版本待确认
              </Link>
            ) : null}
            <DemoTag compact />
          </div>

          <h3 className="rvc__title" id={titleId}>
            <Link to={to}>{article.title}</Link>
          </h3>
          <p className="rvc__titleen">{article.titleEn}</p>
          <p className="rvc__stand">{article.standfirst}</p>

          <div className="rvc__topics">
            {article.topics.map((t) => <TopicChip key={t} topic={t} size="sm" />)}
          </div>
        </header>

        {blocked ? (
          <section className="rvc__block" aria-label="发布阻断项">
            <p className="rvc__block-title">
              <Icon name="alert" size={14} />
              发布被阻断 · {gate.blockers.length} 项
            </p>
            <ul className="rvc__block-list">
              {gate.blockers.map((b) => (
                <li key={b}><span className="rvc__block-mark" aria-hidden="true">✕</span>{b}</li>
              ))}
            </ul>
            {gate.warnings.length > 0 ? (
              <p className="rvc__block-warn">另有 {gate.warnings.length} 项警告需在发布前逐条确认。</p>
            ) : null}
          </section>
        ) : (
          <p className="rvc__nonblock">
            <Icon name="check-double" size={14} />
            无阻断项
            {gate.warnings.length > 0
              ? ` · ${gate.warnings.length} 项警告需在发布前逐条确认`
              : ' · 也没有待确认的警告'}
          </p>
        )}

        <div className="rvc__meters">
          <Meter
            value={article.confidence}
            label="可信度"
            hint={article.confidenceBasis}
            size="sm"
          />
          <Meter
            value={health}
            label="引用检查健康度"
            hint={checked === 0
              ? '尚未运行引用检查：本条目还没有可核对的 references。'
              : `${checked} 项引用中，通过 ${passes}、带保留 ${warns.length}、未通过 ${fails.length}。保留意见按半分计。`}
            size="sm"
          />
        </div>

        <dl className="rvc__stats">
          <div className="rvc__stat">
            <dt>来源数量</dt>
            <dd className="u-num">{profile.total}</dd>
          </div>
          <div className={cx('rvc__stat', profile.primary < 2 && 'rvc__stat--low')}>
            <dt>原始资料数量</dt>
            <dd className="u-num">{profile.primary}<span className="rvc__stat-min">/ 下限 2</span></dd>
          </div>
          <div className={cx('rvc__stat', profile.independent < 3 && 'rvc__stat--low')}>
            <dt>独立来源数</dt>
            <dd className="u-num">{profile.independent}<span className="rvc__stat-min">/ 建议 3</span></dd>
          </div>
          <div className="rvc__stat">
            <dt>争议点</dt>
            <dd className="u-num">{positions.length}</dd>
          </div>
          <div className={cx('rvc__stat', risks.length > 0 && 'rvc__stat--low')}>
            <dt>未处理风险</dt>
            <dd className="u-num">{risks.length}<span className="rvc__stat-min">/ 共 {article.riskFlags.length}</span></dd>
          </div>
          <div className="rvc__stat">
            <dt>来源平均可信度</dt>
            <dd className="u-num">{profile.avgCredibility}</dd>
          </div>
        </dl>

        <section className="rvc__sec" aria-label="争议点">
          <h4 className="rvc__h4">
            <Icon name="diff" size={13} />
            争议点
            <span className="rvc__h4num u-num">{positions.length}</span>
          </h4>
          {sharp ? (
            <p className="rvc__diverge">
              <span className="rvc__side">
                <span className="rvc__holder">{sharp[0].holder}</span>
                <span className="rvc__weight">{WEIGHT_ZH[sharp[0].weight]}</span>
                「{oneLine(sharp[0].position, 34)}」
              </span>
              <span className="rvc__vs" aria-hidden="true">↔</span>
              <span className="rvc__side">
                <span className="rvc__holder">{sharp[1].holder}</span>
                <span className="rvc__weight">{WEIGHT_ZH[sharp[1].weight]}</span>
                「{oneLine(sharp[1].position, 34)}」
              </span>
            </p>
          ) : positions.length === 1 ? (
            <p className="rvc__none">
              只登记了一种立场（{positions[0].holder}），尚未呈现对立面 —— 发布前需确认这不是遗漏。
            </p>
          ) : (
            <p className="rvc__none">本条目尚未登记来源之间的分歧。证据一边倒时应写明「一边倒」及其依据，而不是留白。</p>
          )}
        </section>

        <section className="rvc__sec" aria-label="风险提示">
          <h4 className="rvc__h4">
            <Icon name="flag" size={13} />
            风险提示
            <span className="rvc__h4num u-num">{risks.length}</span>
          </h4>
          {risks.length > 0 ? (
            <div className="rvc__risks">
              {risks.map((r) => <RiskChip key={r.id} flag={r} compact />)}
            </div>
          ) : (
            <p className="rvc__none">
              {article.riskFlags.length === 0
                ? '自动审查未标记风险项。这不等于没有风险 —— 人工复核仍是必需的。'
                : `${resolvedRisks} 项风险已全部处理并记录处理说明。`}
            </p>
          )}
          {resolvedRisks > 0 && risks.length > 0 ? (
            <p className="rvc__subnote">另有 {resolvedRisks} 项已处理并留有处理说明。</p>
          ) : null}
        </section>

        <section className="rvc__sec" aria-label="引用检查">
          <h4 className="rvc__h4">
            <Icon name="quote" size={13} />
            引用检查
            <span className="rvc__h4num u-num">{checked}</span>
          </h4>
          {checked === 0 ? (
            <p className="rvc__none">尚未运行引用检查。条目进入发布流程前必须至少完成一次。</p>
          ) : (
            <>
              <p className="rvc__checks">
                <span className="rvc__chk rvc__chk--pass"><Icon name="check" size={11} />通过 {passes}</span>
                <span className="rvc__chk rvc__chk--warn"><Icon name="alert" size={11} />带保留 {warns.length}</span>
                <span className="rvc__chk rvc__chk--fail"><Icon name="x" size={11} />未通过 {fails.length}</span>
              </p>
              {failed.length > 0 ? (
                <ul className="rvc__fails">
                  {failed.slice(0, 3).map((f) => (
                    <li key={f.key} className="rvc__fail">
                      <span className="rvc__failn u-mono">[{f.n ?? '—'}]</span>
                      <span className="rvc__failbody">
                        <span className="rvc__failclaim">{oneLine(f.claim, 56)}</span>
                        <span className="rvc__failwhy">{oneLine(f.reason, 76)}</span>
                      </span>
                    </li>
                  ))}
                  {failed.length > 3 ? (
                    <li className="rvc__fail rvc__fail--more">另有 {failed.length - 3} 项未通过的引用，见工作台。</li>
                  ) : null}
                </ul>
              ) : (
                <p className="rvc__subnote">没有未通过的引用；带保留的项目已在正文中限缩表述。</p>
              )}
            </>
          )}
        </section>

        <dl className="rvc__meta">
          <div className="rvc__metarow">
            <dt>辖区</dt>
            <dd>{article.countries.length > 0 ? article.countries.join('、') : '未标注'} · {article.region}</dd>
          </div>
          <div className="rvc__metarow">
            <dt>来源语言</dt>
            <dd>{profile.languages.length > 0 ? profile.languages.join(' / ') : '—'}（{profile.countries.length} 个来源辖区）</dd>
          </div>
          <div className="rvc__metarow">
            <dt>译本</dt>
            <dd>
              {article.translations.length > 0
                ? article.translations.map((t) => `${t.label}（${t.status === 'human-reviewed' ? '人工校订' : t.status === 'machine-draft' ? '机器初稿' : '未开始'}）`).join('、')
                : '尚无译本'}
            </dd>
          </div>
          <div className="rvc__metarow">
            <dt>最近更新</dt>
            <dd>{updatedLabel} · 署名 {article.byline}</dd>
          </div>
        </dl>
      </div>

      {showDecisions ? (
        <div className="rvc__foot">
          <DecisionBar article={article} layout="grid" onDecided={onDecide} />
        </div>
      ) : null}
    </article>
  )
}
