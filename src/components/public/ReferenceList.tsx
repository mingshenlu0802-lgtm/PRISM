import { useMemo, useState } from 'react'

import type { Article, Citation, CitationCheck, Source, SourceTier } from '../../lib/types'
import { SOURCE_TYPE_LABEL } from '../../lib/constants'
import { cx, fmtDate, isPrimarySource, sortBy } from '../../lib/util'
import { usePrism } from '../../lib/store'

import { Badge, DemoTag, Icon, Segmented, Tooltip } from '../common'

import './ReferenceList.css'

/**
 * The full reference apparatus.
 *
 * Numbering matches the inline markers exactly — `[7]` in the body is `[7]`
 * here — and the default view groups by evidence tier rather than by order of
 * appearance, because the first question a reader should be able to answer is
 * "how much of this rests on primary material?" Sources are collapsed to one
 * record each, with every claim the article hangs on them listed underneath:
 * ten markers pointing at one document must not read as ten sources.
 *
 * Every URL in this prototype is a non-navigating 「示例链接」 on the reserved
 * `.invalid` TLD. Nothing here can be followed anywhere, and nothing here is
 * real.
 */

const TIER_META: Record<SourceTier | 'uncited', { zh: string; en: string; note: string }> = {
  primary: {
    zh: '一手材料',
    en: 'Primary evidence',
    note: '法律文本、法院判决、原始数据发布与研究本身。本站的内部下限是每篇至少两份。',
  },
  secondary: {
    zh: '二手材料',
    en: 'Secondary sources',
    note: '对一手材料的报道、整理与综述。可以用来定位一手材料，不能替代它。',
  },
  tertiary: {
    zh: '其他',
    en: 'Other material',
    note: '转述、汇编与社交平台内容。只能证明「某种说法存在」，不能证明「该说法成立」。',
  },
  uncited: {
    zh: '已入库但正文未直接引用',
    en: 'Consulted, not cited',
    note: '编辑台查阅过并留在记录里，但正文没有一句话依据它们。列出是为了让读者看到检索范围。',
  },
}

const LANG_LABEL: Record<string, string> = {
  'zh-Hans': '简体中文', 'zh-Hant': '繁体中文', zh: '中文',
  en: '英语', es: '西班牙语', fr: '法语', pt: '葡萄牙语', ar: '阿拉伯语',
  ru: '俄语', de: '德语', it: '意大利语', nl: '荷兰语', sv: '瑞典语',
  ja: '日语', ko: '韩语', hi: '印地语', tr: '土耳其语', fa: '波斯语',
  id: '印尼语', vi: '越南语', th: '泰语', uk: '乌克兰语', pl: '波兰语',
}

function langLabel(tag: string): string {
  return LANG_LABEL[tag] ?? tag.toUpperCase()
}

const CHECK_TONE: Record<CitationCheck['status'], { zh: string; cls: string }> = {
  pass: { zh: '核查通过', cls: 'pass' },
  warn: { zh: '核查有保留', cls: 'warn' },
  fail: { zh: '核查未通过', cls: 'fail' },
}

type Mode = 'tier' | 'order'

interface Entry {
  source: Source
  citations: Citation[]
  firstNumber: number
}

/* ------------------------------------------------------------------ *
 * Shared pieces
 * ------------------------------------------------------------------ */

function SourceMeta({ source }: { source: Source }): JSX.Element {
  const type = SOURCE_TYPE_LABEL[source.sourceType]
  return (
    <p className="reflist__meta">
      <span className="reflist__publisher">{source.publisher}</span>
      <span className="reflist__dot" aria-hidden="true">·</span>
      <span>{type ? type.zh : source.sourceType}</span>
      <span className="reflist__dot" aria-hidden="true">·</span>
      <span>{source.country}</span>
      <span className="reflist__dot" aria-hidden="true">·</span>
      <span>{langLabel(source.language)}</span>
      <span className="reflist__dot" aria-hidden="true">·</span>
      <time dateTime={source.date}>{fmtDate(source.date)}</time>
    </p>
  )
}

function Credibility({ source, compact }: { source: Source; compact: boolean }): JSX.Element {
  const v = Math.max(0, Math.min(100, Math.round(source.credibility)))
  const band = v >= 80 ? 'go' : v >= 60 ? 'warn' : 'bad'
  return (
    <div className={cx('reflist__cred', `reflist__cred--${band}`)}>
      <p className="reflist__credtop">
        <span className="reflist__credlabel">可信度</span>
        <span className="reflist__credvalue u-num">{v}<span className="reflist__credscale">/100</span></span>
      </p>
      <div
        className="reflist__credtrack"
        role="meter"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`可信度 ${v} / 100`}
        aria-label={`${source.title} 的可信度评分`}
      >
        <span className="reflist__credfill" style={{ width: `${v}%` }} />
      </div>
      {!compact ? <p className="reflist__credbasis">{source.credibilityBasis}</p> : null}
    </div>
  )
}

function DemoLink({ url }: { url: string }): JSX.Element {
  return (
    <span className="reflist__linkwrap">
      <Tooltip
        side="top"
        label="示例链接（不可访问）：本原型中的所有网址均位于保留域名 .invalid，永远不会解析，也不会跳转。"
      >
        <button
          type="button"
          className="reflist__link"
          aria-disabled="true"
          onClick={(event) => { event.preventDefault() }}
        >
          <Icon name="link" size={12} />
          <span className="reflist__linktext">{url}</span>
          <span className="u-sr">（示例链接，不可访问）</span>
        </button>
      </Tooltip>
      <DemoTag compact />
    </span>
  )
}

/* ------------------------------------------------------------------ *
 * ReferenceList
 * ------------------------------------------------------------------ */

export interface ReferenceListProps {
  article: Article
  /** From `citationNumbers(article)`. */
  numbers: Map<string, number>
  compact?: boolean
  /** Opens the source drawer for a citation. */
  onOpen?: (citationId: string) => void
}

export function ReferenceList({
  article,
  numbers,
  compact = false,
  onOpen,
}: ReferenceListProps): JSX.Element {
  const { state } = usePrism()
  const [mode, setMode] = useState<Mode>('tier')

  const { entries, uncited, ordered, stats } = useMemo(() => {
    const byId = new Map(state.sources.map((s) => [s.id, s]))
    const bucket = new Map<string, Entry>()

    for (const c of article.citations) {
      const source = byId.get(c.sourceId)
      if (!source) continue
      const n = numbers.get(c.id) ?? Number.MAX_SAFE_INTEGER
      const existing = bucket.get(source.id)
      if (existing) {
        existing.citations.push(c)
        existing.firstNumber = Math.min(existing.firstNumber, n)
      } else {
        bucket.set(source.id, { source, citations: [c], firstNumber: n })
      }
    }

    for (const entry of bucket.values()) {
      entry.citations = sortBy(entry.citations, (c) => numbers.get(c.id) ?? 0)
    }

    const list = sortBy(Array.from(bucket.values()), (e) => e.firstNumber)

    const cited = new Set(list.map((e) => e.source.id))
    const notCited = article.sourceIds
      .map((id) => byId.get(id))
      .filter((s): s is Source => Boolean(s) && !cited.has(s.id))

    const flat = sortBy(
      article.citations
        .map((c) => ({ citation: c, source: byId.get(c.sourceId), n: numbers.get(c.id) ?? 0 }))
        .filter((x): x is { citation: Citation; source: Source; n: number } => Boolean(x.source)),
      (x) => x.n,
    )

    const all = list.map((e) => e.source)
    return {
      entries: list,
      uncited: notCited,
      ordered: flat,
      stats: {
        sources: all.length + notCited.length,
        citations: article.citations.length,
        primary: [...all, ...notCited].filter(isPrimarySource).length,
        publishers: new Set([...all, ...notCited].map((s) => s.publisher)).size,
        languages: new Set([...all, ...notCited].map((s) => s.language)).size,
        countries: new Set([...all, ...notCited].map((s) => s.country)).size,
      },
    }
  }, [article, numbers, state.sources])

  const checkOf = (citationId: string) => article.citationChecks.find((c) => c.citationId === citationId)

  const groups: { key: SourceTier; items: Entry[] }[] = (['primary', 'secondary', 'tertiary'] as const)
    .map((tier) => ({ key: tier, items: entries.filter((e) => e.source.tier === tier) }))
    .filter((g) => g.items.length > 0)

  const renderClaims = (entry: Entry) => (
    <ol className="reflist__claims">
      {entry.citations.map((c) => {
        const n = numbers.get(c.id)
        const check = checkOf(c.id)
        return (
          <li key={c.id} id={`ref-${c.id}`} className="reflist__claim">
            <button
              type="button"
              className="reflist__claimn u-num"
              onClick={onOpen ? () => onOpen(c.id) : undefined}
              disabled={!onOpen}
              aria-label={n !== undefined ? `打开第 ${n} 条来源详情` : '来源详情'}
            >
              [{n ?? '?'}]
            </button>
            <span className="reflist__claimbody">
              {c.locator ? <span className="reflist__claimloc">{c.locator}</span> : null}
              <span className="reflist__claimtext">{c.claim}</span>
              {check ? (
                <span className={cx('reflist__checkchip', `reflist__checkchip--${CHECK_TONE[check.status].cls}`)}>
                  <span className="reflist__checkglyph" aria-hidden="true">
                    <Icon name={check.status === 'pass' ? 'check' : check.status === 'warn' ? 'alert' : 'x'} size={11} />
                  </span>
                  {CHECK_TONE[check.status].zh}
                </span>
              ) : null}
            </span>
          </li>
        )
      })}
    </ol>
  )

  const renderEntry = (entry: Entry) => {
    const nums = entry.citations
      .map((c) => numbers.get(c.id))
      .filter((n): n is number => typeof n === 'number')
    return (
      <li key={entry.source.id} className="reflist__entry" id={`ref-src-${entry.source.id}`}>
        <div className="reflist__nums" aria-hidden="true">
          {nums.map((n) => <span key={n} className="reflist__num u-num">{n}</span>)}
        </div>

        <div className="reflist__main">
          <h4 className="reflist__title">
            <span className="u-sr">
              第 {nums.join('、')} 条来源：
            </span>
            {entry.source.title}
          </h4>

          <SourceMeta source={entry.source} />

          <div className="reflist__tags">
            {isPrimarySource(entry.source) ? (
              <Badge tone="go" size="sm" icon={<Icon name="shield" size={11} />}>一手材料</Badge>
            ) : (
              <Badge tone="neutral" size="sm">{TIER_META[entry.source.tier].zh}</Badge>
            )}
            <Badge tone="info" size="sm">本文引用 {entry.citations.length} 处</Badge>
            {entry.source.caution ? (
              <Badge tone="warn" size="sm" icon={<Icon name="alert" size={11} />}>使用注意</Badge>
            ) : null}
          </div>

          {entry.source.caution && !compact ? (
            <p className="reflist__caution">{entry.source.caution}</p>
          ) : null}

          <Credibility source={entry.source} compact={compact} />

          {renderClaims(entry)}

          <DemoLink url={entry.source.url} />
        </div>
      </li>
    )
  }

  return (
    <div className={cx('reflist', compact && 'reflist--compact')}>
      <div className="reflist__head">
        <div className="reflist__headtext">
          <p className="reflist__kicker">参考文献 · References</p>
          <p className="reflist__lede">
            编号与正文中的行内标记一一对应。点击任一编号可展开该条引用所承载的具体说法与来源记录。
          </p>
        </div>

        {!compact ? (
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            ariaLabel="参考文献的排列方式"
            size="sm"
            options={[
              { value: 'tier', label: '按证据等级' },
              { value: 'order', label: '按引用顺序', count: stats.citations },
            ]}
          />
        ) : null}
      </div>

      <dl className="reflist__stats">
        <div className="reflist__stat">
          <dt>来源</dt>
          <dd className="u-num">{stats.sources}</dd>
        </div>
        <div className="reflist__stat">
          <dt>一手</dt>
          <dd className="u-num">{stats.primary}</dd>
        </div>
        <div className="reflist__stat">
          <dt>引用条目</dt>
          <dd className="u-num">{stats.citations}</dd>
        </div>
        <div className="reflist__stat">
          <dt>独立发布方</dt>
          <dd className="u-num">{stats.publishers}</dd>
        </div>
        <div className="reflist__stat">
          <dt>辖区</dt>
          <dd className="u-num">{stats.countries}</dd>
        </div>
        <div className="reflist__stat">
          <dt>语言</dt>
          <dd className="u-num">{stats.languages}</dd>
        </div>
      </dl>

      {entries.length === 0 && uncited.length === 0 ? (
        <p className="reflist__none">
          这篇条目还没有登记任何来源。没有来源的稿件不会进入发布流程。
        </p>
      ) : null}

      {mode === 'tier' || compact ? (
        <div className="reflist__groups">
          {groups.map((group) => (
            <section className="reflist__group" key={group.key} aria-labelledby={`refgroup-${group.key}`}>
              <header className="reflist__grouphead">
                <h3 className="reflist__grouptitle" id={`refgroup-${group.key}`}>
                  <span className={cx('reflist__groupdot', `reflist__groupdot--${group.key}`)} aria-hidden="true" />
                  {TIER_META[group.key].zh}
                  <span className="reflist__groupcount u-num">{group.items.length}</span>
                </h3>
                <p className="reflist__groupen">{TIER_META[group.key].en}</p>
                <p className="reflist__groupnote">{TIER_META[group.key].note}</p>
              </header>
              <ol className="reflist__entries">
                {group.items.map(renderEntry)}
              </ol>
            </section>
          ))}

          {uncited.length > 0 ? (
            <section className="reflist__group" aria-labelledby="refgroup-uncited">
              <header className="reflist__grouphead">
                <h3 className="reflist__grouptitle" id="refgroup-uncited">
                  <span className="reflist__groupdot reflist__groupdot--uncited" aria-hidden="true" />
                  {TIER_META.uncited.zh}
                  <span className="reflist__groupcount u-num">{uncited.length}</span>
                </h3>
                <p className="reflist__groupen">{TIER_META.uncited.en}</p>
                <p className="reflist__groupnote">{TIER_META.uncited.note}</p>
              </header>
              <ol className="reflist__entries">
                {uncited.map((source) => (
                  <li key={source.id} className="reflist__entry reflist__entry--quiet">
                    <div className="reflist__nums" aria-hidden="true">
                      <span className="reflist__num reflist__num--none">—</span>
                    </div>
                    <div className="reflist__main">
                      <h4 className="reflist__title">{source.title}</h4>
                      <SourceMeta source={source} />
                      <Credibility source={source} compact />
                      <DemoLink url={source.url} />
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      ) : (
        <ol className="reflist__flat">
          {ordered.map(({ citation, source, n }) => {
            const check = checkOf(citation.id)
            return (
              <li key={citation.id} className="reflist__flatitem" id={`ref-order-${citation.id}`}>
                <button
                  type="button"
                  className="reflist__claimn u-num"
                  onClick={onOpen ? () => onOpen(citation.id) : undefined}
                  disabled={!onOpen}
                  aria-label={`打开第 ${n} 条来源详情`}
                >
                  [{n}]
                </button>
                <div className="reflist__flatbody">
                  <p className="reflist__flatclaim">{citation.claim}</p>
                  <p className="reflist__flatsource">
                    <span className="reflist__flattitle">{source.title}</span>
                    {citation.locator ? (
                      <span className="reflist__flatloc">{citation.locator}</span>
                    ) : null}
                  </p>
                  <SourceMeta source={source} />
                  <div className="reflist__tags">
                    {isPrimarySource(source) ? (
                      <Badge tone="go" size="sm" icon={<Icon name="shield" size={11} />}>一手材料</Badge>
                    ) : (
                      <Badge tone="neutral" size="sm">{TIER_META[source.tier].zh}</Badge>
                    )}
                    <Badge tone="neutral" size="sm">可信度 {source.credibility}</Badge>
                    {check ? (
                      <span className={cx('reflist__checkchip', `reflist__checkchip--${CHECK_TONE[check.status].cls}`)}>
                        <span className="reflist__checkglyph" aria-hidden="true">
                          <Icon name={check.status === 'pass' ? 'check' : check.status === 'warn' ? 'alert' : 'x'} size={11} />
                        </span>
                        {CHECK_TONE[check.status].zh}
                      </span>
                    ) : null}
                  </div>
                  <DemoLink url={source.url} />
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
