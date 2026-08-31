import { useMemo, useState } from 'react'
import type { Article, Citation, DivergencePosition, ID, PrismState, Source } from '../../lib/types'
import { RISK_LABEL, SOURCE_TYPE_LABEL } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { citationNumbers, cx, isPrimarySource, stripCitations } from '../../lib/util'
import { Badge, Icon, Meter, toast } from '../common'
import type { IconName } from '../common'
import './AssistantPanel.css'

/**
 * AI 编辑助手 — the desk's structured read of one entry.
 *
 * Everything on this panel is DERIVED, never generated: the pass/warn/fail
 * counts come from `article.citationChecks`, the source shape from
 * `sourceProfile`, the single-source sentences from the citation markers
 * actually present in the body text, and the weighed positions from the
 * divergence blocks. When the desk cannot support a statement it says so in the
 * same words the check recorded — it never smooths a gap over with prose.
 */

export type AssistantAction = 'sources' | 'factcheck' | 'risk' | 'vibe' | 'publish' | 'versions'

export interface AssistantPanelProps {
  article: Article
  /** Lets a suggestion move the editor to the panel that can act on it. */
  onAction?: (action: AssistantAction) => void
  className?: string
}

/* ------------------------------------------------------------------ *
 * Derivation helpers — pure, and only over data the entry already holds.
 * ------------------------------------------------------------------ */

const MARKER_RE = /\[\[c:([a-zA-Z0-9_-]+)\]\]/g
const SENTENCE_ENDS = '。！？；!?;'

function splitSentences(text: string): string[] {
  const out: string[] = []
  let buf = ''
  for (const ch of text) {
    buf += ch
    if (SENTENCE_ENDS.includes(ch)) { out.push(buf); buf = '' }
  }
  if (buf.trim().length > 0) out.push(buf)
  return out.filter((s) => stripCitations(s).trim().length > 0)
}

function markersIn(text: string): ID[] {
  const out: ID[] = []
  for (const m of text.matchAll(MARKER_RE)) if (!out.includes(m[1])) out.push(m[1])
  return out
}

function excerpt(text: string, max = 96): string {
  const plain = stripCitations(text).replace(/\s+/g, ' ').trim()
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}

/** Prose blocks worth scanning for evidence load. */
function proseOf(article: Article): { sectionTitle: string; text: string }[] {
  const out: { sectionTitle: string; text: string }[] = []
  for (const section of article.sections) {
    for (const b of section.blocks) {
      if (b.type === 'paragraph') out.push({ sectionTitle: section.title, text: b.text })
      else if (b.type === 'callout') out.push({ sectionTitle: section.title, text: b.text })
      else if (b.type === 'pullquote') out.push({ sectionTitle: section.title, text: b.text })
      else if (b.type === 'list') for (const item of b.items) out.push({ sectionTitle: section.title, text: item })
    }
  }
  return out
}

interface LeanRow {
  key: string
  sectionTitle: string
  sentence: string
  citationId: ID
  source?: Source
  /** Why this sentence is worth a second look. */
  why: string
}

/** Sentences carrying exactly one citation, ranked by how thin that one is. */
function singleSourceSentences(article: Article, state: PrismState): LeanRow[] {
  const citationById = new Map(article.citations.map((c) => [c.id, c]))
  const sourceById = new Map(state.sources.map((s) => [s.id, s]))
  const checkById = new Map(article.citationChecks.map((c) => [c.citationId, c]))
  const rows: LeanRow[] = []

  proseOf(article).forEach((block, blockIndex) => {
    splitSentences(block.text).forEach((sentence, i) => {
      const ids = markersIn(sentence)
      if (ids.length !== 1) return
      const citation = citationById.get(ids[0])
      const source = citation ? sourceById.get(citation.sourceId) : undefined
      const check = checkById.get(ids[0])
      const reasons: string[] = []
      if (source && !isPrimarySource(source)) reasons.push('该来源不是一手记录')
      if (source && source.tier === 'tertiary') reasons.push('属转述层级')
      if (source?.caution) reasons.push('来源本身带有使用提示')
      if (check?.status === 'warn') reasons.push('引用核查有保留')
      if (check?.status === 'fail') reasons.push('引用核查未通过')
      if (reasons.length === 0) return
      rows.push({
        key: `${blockIndex}-${i}-${ids[0]}`,
        sectionTitle: block.sectionTitle,
        sentence: excerpt(sentence, 120),
        citationId: ids[0],
        source,
        why: reasons.join(' · '),
      })
    })
  })

  return rows
}

interface UnprimedRow {
  citation: Citation
  source?: Source
  n?: number
}

/** Claims whose only support is a non-primary record. */
function claimsWithoutPrimary(article: Article, state: PrismState): UnprimedRow[] {
  const sourceById = new Map(state.sources.map((s) => [s.id, s]))
  const numbers = citationNumbers(article)
  return article.citations
    .map((citation) => ({ citation, source: sourceById.get(citation.sourceId), n: numbers.get(citation.id) }))
    .filter((row) => !row.source || !isPrimarySource(row.source))
    .sort((a, b) => (a.n ?? 999) - (b.n ?? 999))
}

interface WeighedRow {
  position: DivergencePosition
  sectionTitle: string
}

function divergencePositions(article: Article): WeighedRow[] {
  const out: WeighedRow[] = []
  for (const section of article.sections) {
    for (const b of section.blocks) {
      if (b.type !== 'divergence') continue
      for (const position of b.positions) out.push({ position, sectionTitle: section.title })
    }
  }
  return out
}

const WEIGHT_LABEL: Record<DivergencePosition['weight'], string> = {
  strong: '强',
  moderate: '中',
  weak: '弱',
}

/* ------------------------------------------------------------------ *
 * Collapsible group
 * ------------------------------------------------------------------ */

interface GroupProps {
  id: string
  title: string
  icon: IconName
  count: number
  tone: 'go' | 'warn' | 'stop' | 'info'
  lede: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}

function Group({ id, title, icon, count, tone, lede, open, onToggle, children }: GroupProps): JSX.Element {
  return (
    <section className={cx('aip__group', `aip__group--${tone}`)}>
      <h3 className="aip__grouphead">
        <button
          type="button"
          className="aip__grouptoggle"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
        >
          <span className="aip__groupicon" aria-hidden="true"><Icon name={icon} size={14} /></span>
          <span className="aip__grouptitle">{title}</span>
          <span className="aip__groupcount u-num">{count}</span>
          <span className="aip__groupchev" aria-hidden="true">
            <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
          </span>
        </button>
      </h3>
      <p className="aip__grouplede">{lede}</p>
      <div className="aip__groupbody" id={id} hidden={!open}>{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * Panel
 * ------------------------------------------------------------------ */

interface Suggestion {
  id: string
  tone: 'stop' | 'warn' | 'info'
  title: string
  detail: string
  actionLabel: string
  target: AssistantAction
}

export function AssistantPanel({ article, onAction, className }: AssistantPanelProps): JSX.Element {
  const { state } = usePrism()
  const [open, setOpen] = useState<Record<string, boolean>>({
    verified: false, unverified: true, lean: true, unprimed: false, weight: false,
  })
  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))

  const profile = useMemo(() => sel.sourceProfile(article, state), [article, state])
  const gate = useMemo(() => sel.publishGate(article, state), [article, state])
  const health = useMemo(() => sel.citationHealth(article), [article])
  const numbers = useMemo(() => citationNumbers(article), [article])
  const sourceById = useMemo(() => new Map(state.sources.map((s) => [s.id, s])), [state.sources])
  const citationById = useMemo(() => new Map(article.citations.map((c) => [c.id, c])), [article.citations])

  const passed = article.citationChecks.filter((c) => c.status === 'pass')
  const warned = sel.warnChecks(article)
  const failed = sel.failedChecks(article)
  const acked = sel.acknowledgedFailures(article)
  const blocking = sel.blockingChecks(article)

  const lean = useMemo(() => singleSourceSentences(article, state), [article, state])
  const unprimed = useMemo(() => claimsWithoutPrimary(article, state), [article, state])
  const positions = useMemo(() => divergencePositions(article), [article])
  const weakPositions = positions.filter((p) => p.position.weight === 'weak')
  const openRisks = sel.openRisks(article)

  const suggestions = useMemo<Suggestion[]>(() => {
    const out: Suggestion[] = []
    if (blocking.length > 0) {
      out.push({
        id: 'blocking',
        tone: 'stop',
        title: `${blocking.length} 项引用核查未通过且尚未处理`,
        detail: '在发布前，这些句子要么改为归因表述、要么补上一手记录、要么写下处理说明。未处理前发布被硬性阻断。',
        actionLabel: '前往事实检查',
        target: 'factcheck',
      })
    }
    const criticals = openRisks.filter((r) => r.severity === 'critical')
    if (criticals.length > 0) {
      out.push({
        id: 'critical',
        tone: 'stop',
        title: `${criticals.length} 项极高风险未处理`,
        detail: criticals.map((r) => RISK_LABEL[r.kind].zh).join('、') + ' —— 极高风险未处理会直接阻断发布。',
        actionLabel: '前往风险提示',
        target: 'risk',
      })
    }
    if (profile.primary < 2) {
      out.push({
        id: 'primary',
        tone: 'warn',
        title: `一手来源仅 ${profile.primary} 份，低于本站 2 份的下限`,
        detail: '在「材料 · 候选来源」中筛选法律文本、判决或官方统计并加入本文；找不到就把相关表述降级为「据转述」。',
        actionLabel: '前往材料',
        target: 'sources',
      })
    }
    if (profile.independent < 3) {
      out.push({
        id: 'independent',
        tone: 'warn',
        title: `独立来源 ${profile.independent} 家，交叉核实强度偏弱`,
        detail: '「独立」指不共享同一原始信源。同一通稿的多家转载只算一家。',
        actionLabel: '前往材料',
        target: 'sources',
      })
    }
    if (lean.length > 0) {
      out.push({
        id: 'lean',
        tone: 'warn',
        title: `${lean.length} 句只挂在一个不够硬的来源上`,
        detail: '可以用一条自然语言指令要求补入在地组织的判断，或按证据强度重估表述。',
        actionLabel: '打开 Vibe Coding',
        target: 'vibe',
      })
    }
    const highRisks = openRisks.filter((r) => r.severity === 'high')
    if (highRisks.length > 0) {
      out.push({
        id: 'high',
        tone: 'warn',
        title: `${highRisks.length} 项高风险待处理`,
        detail: highRisks.map((r) => RISK_LABEL[r.kind].zh).join('、') + ' —— 会作为警告出现在发布前确认流程中。',
        actionLabel: '前往风险提示',
        target: 'risk',
      })
    }
    if (article.confidence < 70) {
      out.push({
        id: 'confidence',
        tone: 'warn',
        title: `整体可信度 ${article.confidence}，低于 70`,
        detail: article.confidenceBasis,
        actionLabel: '打开 Vibe Coding',
        target: 'vibe',
      })
    }
    if (!article.contentNotice && article.topics.includes('violence')) {
      out.push({
        id: 'notice',
        tone: 'warn',
        title: '涉及性暴力／家暴议题但未设置内容提示',
        detail: '本站规范要求此类条目在正文之前写明具体涉及的内容类型。',
        actionLabel: '前往发布控制',
        target: 'publish',
      })
    }
    if (out.length === 0) {
      out.push({
        id: 'ok',
        tone: 'info',
        title: '没有阻断项，也没有未处理的强警告',
        detail: `发布前确认流程仍会逐项复核；当前有 ${gate.warnings.length} 条需要阅读的提示与 ${gate.confirmations.length} 项敏感内容二次确认。`,
        actionLabel: '前往发布控制',
        target: 'publish',
      })
    }
    return out
  }, [blocking.length, openRisks, profile.primary, profile.independent, lean.length,
    article.confidence, article.confidenceBasis, article.contentNotice, article.topics,
    gate.warnings.length, gate.confirmations.length])

  const act = (target: AssistantAction) => {
    if (onAction) onAction(target)
    else toast('该面板已在当前视图中显示。', 'info')
  }

  return (
    <div className={cx('aip', className)}>
      {/* --------------------------- summary strip --------------------------- */}
      <header className="aip__head">
        <p className="aip__eyebrow u-eyebrow">自动审读 · 全部结论均来自本条目已有的记录</p>
        <ul className="aip__stats">
          <li className="aip__stat">
            <span className="aip__statnum u-num">{article.citations.length}</span>
            <span className="aip__statlab">条引用</span>
          </li>
          <li className="aip__stat">
            <span className="aip__statnum u-num">{profile.primary}</span>
            <span className="aip__statlab">份一手</span>
          </li>
          <li className="aip__stat">
            <span className="aip__statnum u-num">{profile.independent}</span>
            <span className="aip__statlab">家独立</span>
          </li>
          <li className="aip__stat">
            <span className="aip__statnum u-num">{profile.languages.length}</span>
            <span className="aip__statlab">种语言</span>
          </li>
        </ul>
        <div className="aip__meters">
          <Meter value={health} label="引用核查健康度" size="sm" hint={`${passed.length} 通过 · ${warned.length} 保留 · ${failed.length} 未通过（其中 ${acked.length} 已记录处理说明）`} />
          <Meter value={article.confidence} label="整体可信度" size="sm" hint={article.confidenceBasis} />
          <Meter value={profile.avgCredibility} label="来源平均可信度" size="sm" hint={profile.weakest ? `最弱一份：${profile.weakest.publisher}（${profile.weakest.credibility}）——${profile.weakest.credibilityBasis}` : undefined} />
        </div>
      </header>

      {/* ---------------------------- suggestions ---------------------------- */}
      <section className="aip__suggest" aria-label="建议的下一步">
        <h3 className="aip__suggesttitle">
          <Icon name="target" size={13} />
          建议的下一步
        </h3>
        <ol className="aip__suggestlist">
          {suggestions.map((s) => (
            <li key={s.id} className={cx('aip__suggestitem', `aip__suggestitem--${s.tone}`)}>
              <span className="aip__suggestmark" aria-hidden="true">
                <Icon name={s.tone === 'stop' ? 'lock' : s.tone === 'warn' ? 'alert' : 'check'} size={12} />
              </span>
              <div className="aip__suggestmain">
                <p className="aip__suggestheading">
                  <span className="u-sr">{s.tone === 'stop' ? '阻断项：' : s.tone === 'warn' ? '警告：' : '正常：'}</span>
                  {s.title}
                </p>
                <p className="aip__suggestdetail">{s.detail}</p>
              </div>
              <button type="button" className="aip__suggestbtn" onClick={() => act(s.target)}>
                {s.actionLabel}
                <Icon name="arrow-right" size={12} />
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------ verified ----------------------------- */}
      <Group
        id="aip-verified"
        title="已核实的部分"
        icon="check-double"
        count={passed.length}
        tone="go"
        lede="引用核查逐条比对通过：引文与来源记录相符。核查只验证「这句话确实出自这份材料」，不代表该材料本身正确。"
        open={open.verified}
        onToggle={() => toggle('verified')}
      >
        {passed.length === 0 ? (
          <p className="aip__none">没有任何一条引用通过核查。</p>
        ) : (
          <ul className="aip__rows">
            {passed.map((check) => {
              const citation = citationById.get(check.citationId)
              const source = citation ? sourceById.get(citation.sourceId) : undefined
              return (
                <li key={check.citationId} className="aip__row">
                  <span className="aip__rown u-num">[{numbers.get(check.citationId) ?? '—'}]</span>
                  <div className="aip__rowmain">
                    <p className="aip__rowclaim">{citation?.claim ?? check.citationId}</p>
                    <p className="aip__rowmeta">
                      {source ? `${source.publisher} · ${SOURCE_TYPE_LABEL[source.sourceType].zh}` : '来源记录缺失'}
                      {citation?.locator ? ` · ${citation.locator}` : ''}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Group>

      {/* ---------------------------- not verified --------------------------- */}
      <Group
        id="aip-unverified"
        title="未能核实的部分"
        icon="alert"
        count={warned.length + failed.length}
        tone={blocking.length > 0 ? 'stop' : 'warn'}
        lede="核查记录下的原话。「保留意见」表示引文相符但支撑范围有限；「未通过」表示这条引用不能用来支撑事实陈述。"
        open={open.unverified}
        onToggle={() => toggle('unverified')}
      >
        {warned.length + failed.length === 0 ? (
          <p className="aip__none">没有保留意见，也没有未通过的引用。</p>
        ) : (
          <ul className="aip__rows">
            {[...failed, ...warned].map((check) => {
              const citation = citationById.get(check.citationId)
              const source = citation ? sourceById.get(citation.sourceId) : undefined
              return (
                <li
                  key={check.citationId}
                  className={cx('aip__row', check.status === 'fail' ? 'aip__row--stop' : 'aip__row--warn')}
                >
                  <span className="aip__rown u-num">[{numbers.get(check.citationId) ?? '—'}]</span>
                  <div className="aip__rowmain">
                    <p className="aip__rowclaim">{citation?.claim ?? check.citationId}</p>
                    <p className="aip__rowreason">{check.reason}</p>
                    <p className="aip__rowmeta">
                      <Badge tone={check.status === 'fail' ? 'stop' : 'warn'} size="sm">
                        {check.status === 'fail' ? '未通过' : '保留意见'}
                      </Badge>
                      {check.acknowledged ? (
                        <Badge tone="info" size="sm" icon={<Icon name="edit" size={11} />}>已记录处理说明</Badge>
                      ) : null}
                      <span>{source ? source.publisher : '来源记录缺失'}</span>
                    </p>
                    {check.acknowledged && check.acknowledgedNote ? (
                      <p className="aip__rowack">处理说明：{check.acknowledgedNote}</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Group>

      {/* ------------------------ single-source sentences -------------------- */}
      <Group
        id="aip-lean"
        title="只挂在单一来源上的句子"
        icon="quote"
        count={lean.length}
        tone={lean.length > 0 ? 'warn' : 'go'}
        lede="句中只有一个引用标记，且那个来源不是一手记录、属转述层级、带有使用提示，或核查未完全通过。"
        open={open.lean}
        onToggle={() => toggle('lean')}
      >
        {lean.length === 0 ? (
          <p className="aip__none">没有句子同时满足「单一引用」与「来源偏弱」两个条件。</p>
        ) : (
          <ul className="aip__rows">
            {lean.map((row) => (
              <li key={row.key} className="aip__row aip__row--warn">
                <span className="aip__rown u-num">[{numbers.get(row.citationId) ?? '—'}]</span>
                <div className="aip__rowmain">
                  <p className="aip__rowsection">{row.sectionTitle}</p>
                  <p className="aip__rowquote">「{row.sentence}」</p>
                  <p className="aip__rowmeta">
                    {row.source ? `${row.source.publisher} · ${SOURCE_TYPE_LABEL[row.source.sourceType].zh}` : '来源记录缺失'}
                    <span className="aip__rowwhy">{row.why}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Group>

      {/* -------------------------- no primary record ------------------------ */}
      <Group
        id="aip-unprimed"
        title="缺少一手记录的论断"
        icon="scale"
        count={unprimed.length}
        tone={unprimed.length > 0 ? 'warn' : 'go'}
        lede="这些引用所指向的材料不属于一手层级。它们可以支撑叙述与归因，但不能支撑「认定」「判决」这类用词。"
        open={open.unprimed}
        onToggle={() => toggle('unprimed')}
      >
        {unprimed.length === 0 ? (
          <p className="aip__none">每一条引用都指向一份一手记录。</p>
        ) : (
          <ul className="aip__rows">
            {unprimed.map((row) => (
              <li key={row.citation.id} className="aip__row">
                <span className="aip__rown u-num">[{row.n ?? '—'}]</span>
                <div className="aip__rowmain">
                  <p className="aip__rowclaim">{row.citation.claim}</p>
                  <p className="aip__rowmeta">
                    {row.source ? (
                      <>
                        <Badge tone="neutral" size="sm">{SOURCE_TYPE_LABEL[row.source.sourceType].zh}</Badge>
                        <span>{row.source.publisher}</span>
                        {row.source.caution ? <span className="aip__rowwhy">{row.source.caution}</span> : null}
                      </>
                    ) : (
                      <span>来源记录缺失，无法判断层级</span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Group>

      {/* ---------------------------- divergence ----------------------------- */}
      <Group
        id="aip-weight"
        title="分歧对照中的证据权重"
        icon="diff"
        count={positions.length}
        tone={weakPositions.length > 0 ? 'warn' : 'info'}
        lede="每一种立场都标注了证据强度。强度低不等于立场错误 —— 它标注的是本站目前能拿出什么。"
        open={open.weight}
        onToggle={() => toggle('weight')}
      >
        {positions.length === 0 ? (
          <p className="aip__none">本条目没有分歧对照块。若确有实质分歧而正文未呈现，应在「不同来源之间的分歧」一节补上。</p>
        ) : (
          <ul className="aip__rows">
            {positions.map((row, i) => (
              <li key={`${row.position.holder}-${i}`} className="aip__row">
                <span className={cx('aip__weight', `aip__weight--${row.position.weight}`)} aria-hidden="true">
                  {WEIGHT_LABEL[row.position.weight]}
                </span>
                <div className="aip__rowmain">
                  <p className="aip__rowclaim">{row.position.holder}</p>
                  <p className="aip__rowreason">{row.position.position}</p>
                  <p className="aip__rowmeta">
                    <span className="u-sr">证据强度：{WEIGHT_LABEL[row.position.weight]}。</span>
                    证据：{row.position.evidence}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Group>

      {/* --------------------------- provenance ------------------------------ */}
      <footer className="aip__foot">
        <h3 className="aip__foottitle">
          <Icon name="shield" size={13} />
          机器与人各做了什么
        </h3>
        <p className="aip__foottext">{article.provenance}</p>
        <p className="aip__footnote">
          本面板不产出新的判断：以上每一条都能回到 citationChecks、来源记录、正文引用标记或分歧对照块中的具体字段。
          自动编辑台没有发布权限，批准与发布只能由主编在本控制端完成。
        </p>
      </footer>
    </div>
  )
}
