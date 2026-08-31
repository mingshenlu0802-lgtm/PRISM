import { useCallback, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react'

import type {
  Article, ArticleSection, Block, DivergencePosition, SectionKind,
} from '../../lib/types'
import { SECTION_LABEL, SECTION_ORDER } from '../../lib/constants'
import { cx } from '../../lib/util'
import { usePrism } from '../../lib/store'

import { Badge, DemoTag, Icon, RichText } from '../common'
import type { IconName } from '../common'
import { ChartRenderer, TimelineStrip } from '../charts'
import { ConceptImage } from '../visual/ConceptImage'

import './ArticleBody.css'

/**
 * The reading surface.
 *
 * The same renderer serves the public article page and the editor's workbench:
 * in `editable` mode paragraphs, headings and pull-quotes become click-to-edit
 * without changing a single thing about how they read. Every block variant in
 * the domain model gets its own treatment — a table is a table, a divergence is
 * an argument with weighed evidence, and a chart that has lost its spec says so
 * out loud rather than collapsing to nothing.
 */

/* ------------------------------------------------------------------ *
 * In-page navigation
 *
 * The app runs under a HashRouter, so `href="#sec-facts"` would be read as a
 * ROUTE and throw the reader back to the home page. Every in-page jump in this
 * folder therefore goes through a real button and this helper.
 * ------------------------------------------------------------------ */

export function sectionAnchor(kind: SectionKind): string {
  return `sec-${kind}`
}

export function jumpToAnchor(id: string): void {
  if (typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (!el) return
  const reduce = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 88
  window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' })
  if (el instanceof HTMLElement) el.focus({ preventScroll: true })
}

/* ------------------------------------------------------------------ *
 * Callouts
 * ------------------------------------------------------------------ */

const CALLOUT_META: Record<'note' | 'caution' | 'evidence' | 'unknown', {
  zh: string; icon: IconName; sr: string
}> = {
  note: { zh: '说明', icon: 'info', sr: '说明性提示' },
  caution: { zh: '注意', icon: 'alert', sr: '需要注意的限制' },
  evidence: { zh: '证据', icon: 'shield', sr: '证据说明' },
  unknown: { zh: '尚未确定', icon: 'search', sr: '尚未确定的信息' },
}

/* ------------------------------------------------------------------ *
 * Divergence weights — never colour alone.
 * ------------------------------------------------------------------ */

const WEIGHT_META: Record<DivergencePosition['weight'], {
  zh: string; rank: number; note: string
}> = {
  strong: {
    zh: '强',
    rank: 3,
    note: '有可逐段核对的一手材料支撑，且没有同等质量的反证。',
  },
  moderate: {
    zh: '中',
    rank: 2,
    note: '材料本身可核，但在法律效力、统计口径或所回答的问题上存在明确限制。',
  },
  weak: {
    zh: '弱',
    rank: 1,
    note: '缺少可核的一手材料，目前只有转述或无法回溯到原始记录的说法。权重低是因为本站没有材料，不等于本站认定其不实。',
  },
}

/* ------------------------------------------------------------------ *
 * Click-to-edit
 * ------------------------------------------------------------------ */

interface EditSlotProps {
  sectionId: string
  blockId: string
  text: string
  label: string
  onEditBlock: (sectionId: string, blockId: string, text: string) => void
  children: ReactNode
}

function EditSlot({ sectionId, blockId, text, label, onEditBlock, children }: EditSlotProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const cancelled = useRef(false)

  const open = useCallback(() => {
    setDraft(text)
    cancelled.current = false
    setEditing(true)
  }, [text])

  const commit = useCallback(() => {
    if (cancelled.current) { cancelled.current = false; return }
    setEditing(false)
    const next = draft.trim()
    if (next.length > 0 && next !== text) onEditBlock(sectionId, blockId, next)
  }, [draft, text, onEditBlock, sectionId, blockId])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancelled.current = true
      setEditing(false)
      return
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      commit()
    }
  }

  const onSurfaceClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target
    if (target instanceof HTMLElement && target.closest('button, a, textarea')) return
    open()
  }

  if (editing) {
    return (
      <div className="abody__editing">
        <textarea
          className="abody__ta"
          value={draft}
          aria-label={`${label}（编辑中）`}
          autoFocus
          rows={Math.max(3, Math.ceil(draft.length / 42))}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
        <p className="abody__edithint">
          <Icon name="edit" size={12} />
          <span>失焦即保存 · <kbd className="abody__kbd">⌘/Ctrl</kbd> + <kbd className="abody__kbd">Enter</kbd> 保存 · <kbd className="abody__kbd">Esc</kbd> 放弃</span>
        </p>
        <p className="abody__editmark">行内引用标记 <code className="abody__code">[[c:cit-id]]</code> 会被保留；编辑不会覆盖旧版本，保存后进入版本记录。</p>
      </div>
    )
  }

  return (
    <div
      className="abody__slot"
      onClick={onSurfaceClick}
      role="presentation"
    >
      {children}
      <button
        type="button"
        className="abody__editbtn"
        onClick={open}
        aria-label={`编辑${label}`}
        title={`编辑${label}`}
      >
        <Icon name="edit" size={13} />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Block renderer
 * ------------------------------------------------------------------ */

interface BlockProps {
  block: Block
  sectionId: string
  numbers: Map<string, number>
  onCite?: (citationId: string) => void
  editable: boolean
  onEditBlock?: (sectionId: string, blockId: string, text: string) => void
}

function MissingBlock({ title, detail }: { title: string; detail: string }): JSX.Element {
  return (
    <div className="abody__missing" role="note">
      <span className="abody__missing-icon" aria-hidden="true"><Icon name="alert" size={15} /></span>
      <div>
        <p className="abody__missing-title">{title}</p>
        <p className="abody__missing-detail">{detail}</p>
      </div>
    </div>
  )
}

function ProseBlock({
  block, sectionId, numbers, onCite, editable, onEditBlock,
}: BlockProps): JSX.Element | null {
  const wrap = (label: string, text: string, node: JSX.Element) =>
    (editable && onEditBlock
      ? (
        <EditSlot
          sectionId={sectionId}
          blockId={block.id}
          text={text}
          label={label}
          onEditBlock={onEditBlock}
        >
          {node}
        </EditSlot>
      )
      : node)

  switch (block.type) {
    case 'paragraph':
      return wrap('这一段', block.text, (
        <p className="abody__p">
          <RichText text={block.text} numbers={numbers} onCite={onCite} />
        </p>
      ))

    case 'heading': {
      const node = block.level === 3
        ? (
          <h3 className="abody__h3">
            <RichText text={block.text} numbers={numbers} onCite={onCite} />
          </h3>
        )
        : (
          <h4 className="abody__h4">
            <RichText text={block.text} numbers={numbers} onCite={onCite} />
          </h4>
        )
      return wrap('这个小标题', block.text, node)
    }

    case 'list':
      return block.ordered
        ? (
          <ol className="abody__ol">
            {block.items.map((item, i) => (
              <li key={`${block.id}-${i}`}>
                <RichText text={item} numbers={numbers} onCite={onCite} />
              </li>
            ))}
          </ol>
        )
        : (
          <ul className="abody__ul">
            {block.items.map((item, i) => (
              <li key={`${block.id}-${i}`}>
                <RichText text={item} numbers={numbers} onCite={onCite} />
              </li>
            ))}
          </ul>
        )

    default:
      return null
  }
}

function WideBlock({
  block, sectionId, numbers, onCite, editable, onEditBlock,
}: BlockProps): JSX.Element | null {
  const { state } = usePrism()

  switch (block.type) {
    case 'callout': {
      const meta = CALLOUT_META[block.tone]
      return (
        <aside className={cx('abody__callout', `abody__callout--${block.tone}`)} aria-label={meta.sr}>
          <p className="abody__callout-kicker">
            <span className="abody__callout-icon" aria-hidden="true"><Icon name={meta.icon} size={14} /></span>
            <span className="abody__callout-tone">{meta.zh}</span>
            <span className="abody__callout-title">
              <RichText text={block.title} numbers={numbers} onCite={onCite} />
            </span>
          </p>
          <p className="abody__callout-text">
            <RichText text={block.text} numbers={numbers} onCite={onCite} />
          </p>
        </aside>
      )
    }

    case 'pullquote': {
      const node = (
        <figure className="abody__quote">
          <span className="abody__quote-mark" aria-hidden="true"><Icon name="quote" size={18} /></span>
          <blockquote className="abody__quote-text">
            <RichText text={block.text} numbers={numbers} onCite={onCite} />
          </blockquote>
          <hr className="abody__quote-rule prism-rule" />
          {block.attribution ? (
            <figcaption className="abody__quote-by">{block.attribution}</figcaption>
          ) : null}
        </figure>
      )
      if (editable && onEditBlock) {
        return (
          <EditSlot
            sectionId={sectionId}
            blockId={block.id}
            text={block.text}
            label="这段引文"
            onEditBlock={onEditBlock}
          >
            {node}
          </EditSlot>
        )
      }
      return node
    }

    case 'figure': {
      const asset = state.assets.find((a) => a.id === block.assetId)
      if (!asset) {
        return (
          <MissingBlock
            title="插图缺失"
            detail={`本段引用的图像记录 ${block.assetId} 不在素材库中，因此没有可显示的内容。图注：${block.caption}`}
          />
        )
      }
      return (
        <figure className="abody__figure">
          <ConceptImage asset={asset} ratio="16-9" />
          <figcaption className="abody__figcap">
            <span className="abody__figcap-text">{block.caption}</span>
            {asset.guardrail ? (
              <span className="abody__figcap-rule">
                <Icon name="shield" size={12} />
                <span>图像准则：{asset.guardrail}</span>
              </span>
            ) : null}
          </figcaption>
        </figure>
      )
    }

    case 'chart': {
      const chart = state.charts.find((c) => c.id === block.chartId)
      if (!chart) {
        return (
          <MissingBlock
            title="图表数据缺失"
            detail={`本段引用的图表规格 ${block.chartId} 不在数据集中。本站不以近似数据替代缺失数据，因此此处留空并保留这条提示。`}
          />
        )
      }
      const source = state.sources.find((s) => s.id === chart.sourceId)
      return (
        <div className="abody__chart">
          <ChartRenderer
            chart={chart}
            sourceLabel={source ? `${source.publisher}《${source.title}》 — ${chart.sourceNote}` : chart.sourceNote}
          />
        </div>
      )
    }

    case 'timeline':
      return (
        <div className="abody__timeline">
          <p className="abody__timeline-head">
            <span className="u-eyebrow">时间线 · Timeline</span>
            <span className="abody__timeline-note">
              节点按证据地位分层：一手记录 · 单一来源报道 · 存在争议。形状与文字同时标注，不靠颜色区分。
            </span>
          </p>
          <TimelineStrip entries={block.entries} numbers={numbers} onCite={onCite} />
        </div>
      )

    case 'table':
      return (
        <figure className="abody__tablewrap">
          <div className="abody__tablescroll" tabIndex={0} role="group" aria-label="可横向滚动的表格">
            <table className="abody__table">
              {block.caption ? (
                <caption className="abody__tablecap">{block.caption}</caption>
              ) : null}
              <thead>
                <tr>
                  {block.columns.map((col) => (
                    <th key={col} scope="col">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={`${block.id}-r${ri}`}>
                    {row.map((cell, ci) => (
                      ci === 0
                        ? (
                          <th key={`${block.id}-r${ri}-c${ci}`} scope="row">
                            <RichText text={cell} numbers={numbers} onCite={onCite} />
                          </th>
                        )
                        : (
                          <td key={`${block.id}-r${ri}-c${ci}`}>
                            <RichText text={cell} numbers={numbers} onCite={onCite} />
                          </td>
                        )
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      )

    case 'divergence':
      return (
        <div className="abody__diverge">
          <div className="abody__diverge-head">
            <p className="u-eyebrow">分歧对照 · Where sources diverge</p>
            <p className="abody__diverge-lede">
              每种立场都标注了证据强度，理由随文写明。强度不是编辑口味：它衡量的是支撑这一立场的材料是否可核、
              以及它回答的是不是本文正在问的那个问题。证据一边倒时本站就说一边倒，不制造虚假平衡。
            </p>
            <ul className="abody__diverge-legend">
              {(['strong', 'moderate', 'weak'] as const).map((w) => (
                <li key={w} className={cx('abody__legend-item', `abody__legend-item--${w}`)}>
                  <span className="abody__legend-bar" aria-hidden="true">
                    {[1, 2, 3].map((i) => (
                      <span key={i} className={cx('abody__wseg', i <= WEIGHT_META[w].rank && 'abody__wseg--on')} />
                    ))}
                  </span>
                  <span className="abody__legend-label">证据强度 {WEIGHT_META[w].zh}</span>
                </li>
              ))}
            </ul>
          </div>

          <ol className="abody__positions">
            {block.positions.map((pos, i) => {
              const meta = WEIGHT_META[pos.weight]
              return (
                <li
                  key={`${block.id}-p${i}`}
                  className={cx('abody__pos', `abody__pos--${pos.weight}`)}
                >
                  <div className="abody__pos-head">
                    <p className="abody__pos-label">{pos.label}</p>
                    <p className="abody__pos-holder">
                      <Icon name="users" size={13} />
                      <span>{pos.holder}</span>
                    </p>
                  </div>

                  <div className="abody__weight" data-weight={pos.weight}>
                    <span className="abody__weight-label">证据强度</span>
                    <span
                      className="abody__weight-bar"
                      role="img"
                      aria-label={`证据强度：${meta.zh}（共三级，第 ${meta.rank} 级）`}
                    >
                      {[1, 2, 3].map((n) => (
                        <span key={n} className={cx('abody__wseg', n <= meta.rank && 'abody__wseg--on')} />
                      ))}
                    </span>
                    <span className="abody__weight-value">{meta.zh}</span>
                  </div>

                  <div className="abody__pos-field">
                    <p className="abody__pos-key">立场</p>
                    <p className="abody__pos-body">
                      <RichText text={pos.position} numbers={numbers} onCite={onCite} />
                    </p>
                  </div>

                  <div className="abody__pos-field">
                    <p className="abody__pos-key">背后的证据</p>
                    <p className="abody__pos-body abody__pos-body--evidence">
                      <RichText text={pos.evidence} numbers={numbers} onCite={onCite} />
                    </p>
                  </div>

                  <p className="abody__pos-why">{meta.note}</p>

                  {pos.citationIds.length > 0 ? (
                    <p className="abody__pos-cites">
                      <span className="abody__pos-cites-label">依据</span>
                      {pos.citationIds.map((id) => {
                        const n = numbers.get(id)
                        if (n === undefined) return null
                        return (
                          <button
                            key={id}
                            type="button"
                            className="abody__citechip"
                            onClick={onCite ? () => onCite(id) : undefined}
                            disabled={!onCite}
                            aria-label={`查看第 ${n} 条来源`}
                          >
                            [{n}]
                          </button>
                        )
                      })}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </div>
      )

    default:
      return null
  }
}

const PROSE_TYPES: Block['type'][] = ['paragraph', 'heading', 'list']

/* ------------------------------------------------------------------ *
 * Section
 * ------------------------------------------------------------------ */

interface SectionProps {
  section: ArticleSection
  numbers: Map<string, number>
  onCite?: (citationId: string) => void
  editable: boolean
  onEditBlock?: (sectionId: string, blockId: string, text: string) => void
  anchors: boolean
}

function Section({ section, numbers, onCite, editable, onEditBlock, anchors }: SectionProps): JSX.Element {
  const meta = SECTION_LABEL[section.kind]
  const index = SECTION_ORDER.indexOf(section.kind)
  const headingId = `sechead-${section.id}`

  /* Consecutive prose blocks share one typographic column so the journal
     rhythm survives; wide blocks (charts, tables, divergences) break out. */
  const groups: { prose: boolean; blocks: Block[] }[] = []
  for (const block of section.blocks) {
    const isProse = PROSE_TYPES.includes(block.type)
    const last = groups[groups.length - 1]
    if (last && last.prose === isProse && isProse) last.blocks.push(block)
    else groups.push({ prose: isProse, blocks: [block] })
  }

  return (
    <section
      className="abody__section"
      id={anchors ? sectionAnchor(section.kind) : undefined}
      aria-labelledby={headingId}
      tabIndex={-1}
      data-section={section.kind}
    >
      <header className="abody__sechead">
        <p className="abody__seceyebrow">
          <span className="abody__secn u-num" aria-hidden="true">
            {String(index >= 0 ? index + 1 : section.kind.length).padStart(2, '0')}
          </span>
          <span className="abody__secen">{meta ? meta.en : section.kind}</span>
        </p>
        <h2 className="abody__sectitle" id={headingId}>{meta ? meta.zh : section.title}</h2>
        {meta ? <p className="abody__secnote">{meta.note}</p> : null}
        <hr className="abody__secrule" />
      </header>

      <div className="abody__blocks">
        {groups.map((group, gi) => (
          group.prose
            ? (
              <div className="abody__flow prose" key={`${section.id}-g${gi}`}>
                {group.blocks.map((block) => (
                  <ProseBlock
                    key={block.id}
                    block={block}
                    sectionId={section.id}
                    numbers={numbers}
                    onCite={onCite}
                    editable={editable}
                    onEditBlock={onEditBlock}
                  />
                ))}
              </div>
            )
            : (
              <WideBlock
                key={group.blocks[0].id}
                block={group.blocks[0]}
                sectionId={section.id}
                numbers={numbers}
                onCite={onCite}
                editable={editable}
                onEditBlock={onEditBlock}
              />
            )
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * ArticleBody
 * ------------------------------------------------------------------ */

export interface ArticleBodyProps {
  article: Article
  /** From `citationNumbers(article)`. */
  numbers: Map<string, number>
  onCite?: (citationId: string) => void
  /** Workbench mode: paragraphs/headings/pull-quotes become click-to-edit. */
  editable?: boolean
  onEditBlock?: (sectionId: string, blockId: string, text: string) => void
  /** Render only these sections, in this order. Default: all. */
  only?: SectionKind[]
  /** Adds an anchor id `sec-<kind>` to each section wrapper. */
  anchors?: boolean
  dense?: boolean
}

export function ArticleBody({
  article,
  numbers,
  onCite,
  editable = false,
  onEditBlock,
  only,
  anchors = false,
  dense = false,
}: ArticleBodyProps): JSX.Element {
  const sections = only
    ? only
      .map((kind) => article.sections.find((s) => s.kind === kind))
      .filter((s): s is ArticleSection => Boolean(s))
    : article.sections

  if (sections.length === 0) {
    return (
      <div className={cx('abody', dense && 'abody--dense')}>
        <div className="abody__empty">
          <p className="abody__empty-title">这篇条目还没有正文段落。</p>
          <p className="abody__empty-hint">
            自动编辑台尚未交付草稿，或所选章节在本条目中不存在。本站不以占位文字充数。
          </p>
          <DemoTag />
        </div>
      </div>
    )
  }

  return (
    <div className={cx('abody', dense && 'abody--dense', editable && 'abody--editable')}>
      {editable ? (
        <p className="abody__editbanner">
          <Badge tone="warn" size="sm" icon={<Icon name="edit" size={12} />}>编辑模式</Badge>
          <span>
            点击任意段落、小标题或引文即可就地修改。修改会写入当前工作副本并生成新版本，
            不会覆盖已发布内容，也不会自动公开。
          </span>
        </p>
      ) : null}

      {sections.map((section) => (
        <Section
          key={section.id}
          section={section}
          numbers={numbers}
          onCite={onCite}
          editable={editable}
          onEditBlock={onEditBlock}
          anchors={anchors}
        />
      ))}
    </div>
  )
}
