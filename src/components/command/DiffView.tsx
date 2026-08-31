import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Article, Citation, ID, SectionKind, Source } from '../../lib/types'
import { BLOCK_TYPE_LABEL, diffArticles, diffRefs, summarizeDiff } from '../../lib/diff'
import type { BlockDiffRow, WordOp } from '../../lib/diff'
import { SECTION_LABEL } from '../../lib/constants'
import { cx } from '../../lib/util'
import { Badge, Checkbox, Icon, Segmented } from '../common'
import './DiffView.css'

/**
 * DiffView — 版本对照.
 *
 * The console's review surface for `diffArticles`. Two things matter here more
 * than looks:
 *
 *  1. **A change must never be readable by colour alone.** Every insertion is
 *     underlined and every deletion is struck through, each carries a glyph in
 *     the row gutter, and each is wrapped in a real `<ins>` / `<del>` element
 *     with a visually-hidden 〔新增〕/〔删除〕 marker so a screen reader hears the
 *     same thing a sighted reader sees.
 *  2. **A dropped citation must be impossible to miss.** Citation markers are
 *     kept atomic by the tokenizer and rendered here as their own chips, and
 *     every changed row prints how many citation markers it gained or lost.
 */

export type DiffMode = 'split' | 'inline'

export interface DiffViewProps {
  /** The older snapshot — 基准版本. */
  before: Article
  /** The newer snapshot — 对照版本. */
  after: Article
  beforeLabel: string
  afterLabel: string
  /** Source registry, used to name the references this pair gained or lost. */
  sources?: Source[]
  initialMode?: DiffMode
  className?: string
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const CITE_RE = /\[\[c:([A-Za-z0-9_-]+)\]\]/g

/** Below this width the two columns cannot both stay legible, so we inline. */
const NARROW_QUERY = '(max-width: 719px)'

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(NARROW_QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia(NARROW_QUERY)
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return narrow
}

const KIND_META: Record<BlockDiffRow['kind'], {
  zh: string
  glyph: string
  tone: 'go' | 'stop' | 'warn' | 'neutral'
  icon: 'plus' | 'minus' | 'edit' | 'check'
}> = {
  added: { zh: '新增', glyph: '＋', tone: 'go', icon: 'plus' },
  removed: { zh: '删除', glyph: '－', tone: 'stop', icon: 'minus' },
  changed: { zh: '改写', glyph: '～', tone: 'warn', icon: 'edit' },
  unchanged: { zh: '未改动', glyph: '·', tone: 'neutral', icon: 'check' },
}

const BLOCK_LABELS: Record<string, string | undefined> = BLOCK_TYPE_LABEL

/** `blockType` may be a composite such as `paragraph → callout`. */
function blockLabel(blockType: string): string {
  return blockType
    .split('→')
    .map((part) => part.trim())
    .map((part) => BLOCK_LABELS[part] ?? part)
    .join(' → ')
}

interface Tally { addChars: number; delChars: number; addCites: number; delCites: number }

function countCites(text: string): number {
  return (text.match(CITE_RE) ?? []).length
}

function plainLength(text: string): number {
  return text.replace(CITE_RE, '').trim().length
}

function tallyOps(ops: WordOp[]): Tally {
  const t: Tally = { addChars: 0, delChars: 0, addCites: 0, delCites: 0 }
  for (const op of ops) {
    if (op.type === 'add') { t.addChars += plainLength(op.text); t.addCites += countCites(op.text) }
    if (op.type === 'del') { t.delChars += plainLength(op.text); t.delCites += countCites(op.text) }
  }
  return t
}

function tallyRow(row: BlockDiffRow): Tally {
  if (row.kind === 'changed' && row.words) return tallyOps(row.words)
  if (row.kind === 'added') {
    const text = row.after ?? ''
    return { addChars: plainLength(text), delChars: 0, addCites: countCites(text), delCites: 0 }
  }
  if (row.kind === 'removed') {
    const text = row.before ?? ''
    return { addChars: 0, delChars: plainLength(text), addCites: 0, delCites: countCites(text) }
  }
  return { addChars: 0, delChars: 0, addCites: 0, delCites: 0 }
}

/* ------------------------------------------------------------------ *
 * Text rendering — citation markers stay visible and atomic
 * ------------------------------------------------------------------ */

function textNodes(text: string, cites: Map<ID, Citation>, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of text.matchAll(CITE_RE)) {
    const at = m.index ?? 0
    if (at > last) out.push(text.slice(last, at))
    const id = m[1]
    const claim = cites.get(id)?.claim
    out.push(
      <span
        key={`${keyBase}-c${i}`}
        className="dv__cite u-mono"
        title={claim ? `引用 ${id}：${claim}` : `引用标记 ${id}（本对照未收录该引用的说明）`}
      >
        <span className="u-sr">引用标记 </span>
        {id}
      </span>,
    )
    last = at + m[0].length
    i += 1
  }
  if (last < text.length) out.push(text.slice(last))
  if (out.length === 0) out.push('')
  return out
}

type OpSide = 'both' | 'before' | 'after'

function renderOps(
  ops: WordOp[],
  side: OpSide,
  cites: Map<ID, Citation>,
  keyBase: string,
): ReactNode[] {
  const out: ReactNode[] = []
  ops.forEach((op, i) => {
    if (side === 'before' && op.type === 'add') return
    if (side === 'after' && op.type === 'del') return
    const nodes = textNodes(op.text, cites, `${keyBase}-${i}`)
    if (op.type === 'add') {
      out.push(
        <ins key={i} className="dv__ins">
          <span className="u-sr">〔新增〕</span>
          {nodes}
        </ins>,
      )
    } else if (op.type === 'del') {
      out.push(
        <del key={i} className="dv__del">
          <span className="u-sr">〔删除〕</span>
          {nodes}
        </del>,
      )
    } else {
      out.push(<span key={i} className="dv__same">{nodes}</span>)
    }
  })
  return out
}

/* ------------------------------------------------------------------ *
 * Grouping — sections, and runs of unchanged blocks
 * ------------------------------------------------------------------ */

type Item =
  | { type: 'row'; key: string; row: BlockDiffRow }
  | { type: 'run'; key: string; rows: BlockDiffRow[] }

interface SecGroup {
  key: string
  title: string
  kind: SectionKind
  items: Item[]
  changes: number
  total: number
}

function sectionKeyOf(row: BlockDiffRow): string {
  const at = row.key.indexOf('::')
  return at > 0 ? row.key.slice(0, at) : `${row.sectionKind}-${row.sectionTitle}`
}

function buildGroups(rows: BlockDiffRow[]): SecGroup[] {
  const groups: SecGroup[] = []
  let current: SecGroup | null = null

  for (const row of rows) {
    const key = sectionKeyOf(row)
    if (!current || current.key !== key) {
      current = { key, title: row.sectionTitle, kind: row.sectionKind, items: [], changes: 0, total: 0 }
      groups.push(current)
    }
    current.total += 1
    if (row.kind !== 'unchanged') current.changes += 1

    const tail = current.items[current.items.length - 1]
    if (row.kind === 'unchanged') {
      if (tail && tail.type === 'run') tail.rows.push(row)
      else current.items.push({ type: 'run', key: `run-${row.key}`, rows: [row] })
    } else {
      current.items.push({ type: 'row', key: row.key, row })
    }
  }

  return groups
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export function DiffView({
  before,
  after,
  beforeLabel,
  afterLabel,
  sources = [],
  initialMode = 'split',
  className,
}: DiffViewProps): JSX.Element {
  const [mode, setMode] = useState<DiffMode>(initialMode)
  const [showAllUnchanged, setShowAllUnchanged] = useState(false)
  const [openRuns, setOpenRuns] = useState<string[]>([])
  const narrow = useNarrow()
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const bodyId = useId()

  const effective: DiffMode = narrow ? 'inline' : mode

  const { rows, stats } = useMemo(() => diffArticles(before, after), [before, after])
  const refs = useMemo(() => diffRefs(before, after), [before, after])
  const groups = useMemo(() => buildGroups(rows), [rows])

  const cites = useMemo(() => {
    const map = new Map<ID, Citation>()
    for (const c of before.citations) map.set(c.id, c)
    for (const c of after.citations) map.set(c.id, c)
    return map
  }, [before, after])

  const sourceById = useMemo(() => {
    const map = new Map<ID, Source>()
    for (const s of sources) map.set(s.id, s)
    return map
  }, [sources])

  const unchanged = rows.length - stats.added - stats.removed - stats.changed
  const touched = stats.added + stats.removed + stats.changed
  const refTouched = refs.added.length + refs.removed.length

  /* Wide rows (tables) scroll horizontally inside their own cell; the two sides
     of one row are kept in step so a column never drifts out of alignment. */
  useEffect(() => {
    const root = bodyRef.current
    if (!root) return undefined
    let syncing = false
    const onScroll = (event: Event) => {
      const el = event.target
      if (!(el instanceof HTMLElement)) return
      const id = el.dataset.sync
      if (!id || syncing) return
      syncing = true
      root.querySelectorAll<HTMLElement>(`[data-sync="${id}"]`).forEach((partner) => {
        if (partner !== el && partner.scrollLeft !== el.scrollLeft) partner.scrollLeft = el.scrollLeft
      })
      window.requestAnimationFrame(() => { syncing = false })
    }
    root.addEventListener('scroll', onScroll, true)
    return () => root.removeEventListener('scroll', onScroll, true)
  }, [effective])

  const toggleRun = (key: string) => {
    setOpenRuns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const sourceName = (id: ID): string => sourceById.get(id)?.title ?? id

  const refLine = (ids: ID[], cap = 2): string => {
    if (ids.length === 0) return '无'
    const names = ids.slice(0, cap).map((id) => `《${sourceName(id)}》`)
    return ids.length > cap ? `${names.join('、')} 等 ${ids.length} 份` : names.join('、')
  }

  /* ------------------------------ rendering ------------------------------ */

  const renderCellText = (
    nodes: ReactNode[],
    rowIndex: number,
    pre: boolean,
    srLabel?: string,
  ) => (
    <div
      className={cx('dv__scroll', pre && 'dv__scroll--pre')}
      data-sync={String(rowIndex)}
      tabIndex={pre ? 0 : undefined}
      role={pre ? 'group' : undefined}
      aria-label={pre ? '表格内容，可横向滚动' : undefined}
    >
      {srLabel ? <span className="u-sr">{srLabel}：</span> : null}
      <div className={cx('dv__text', pre && 'dv__text--pre')}>{nodes}</div>
    </div>
  )

  const emptyCell = (label: string) => (
    <div className="dv__scroll">
      <p className="dv__void">
        <Icon name="minus" size={12} />
        <span>{label}</span>
      </p>
    </div>
  )

  const renderRow = (row: BlockDiffRow, index: number) => {
    const meta = KIND_META[row.kind]
    const tally = tallyRow(row)
    const pre = row.blockType.includes('table')
    const beforeText = row.before ?? ''
    const afterText = row.after ?? ''

    const beforeNodes: ReactNode[] =
      row.kind === 'changed' && row.words
        ? renderOps(row.words, 'before', cites, `${row.key}-b`)
        : row.kind === 'removed'
          ? [<del key="d" className="dv__del"><span className="u-sr">〔删除〕</span>{textNodes(beforeText, cites, `${row.key}-b`)}</del>]
          : textNodes(beforeText, cites, `${row.key}-b`)

    const afterNodes: ReactNode[] =
      row.kind === 'changed' && row.words
        ? renderOps(row.words, 'after', cites, `${row.key}-a`)
        : row.kind === 'added'
          ? [<ins key="a" className="dv__ins"><span className="u-sr">〔新增〕</span>{textNodes(afterText, cites, `${row.key}-a`)}</ins>]
          : textNodes(afterText, cites, `${row.key}-a`)

    const inlineNodes: ReactNode[] =
      row.kind === 'changed' && row.words
        ? renderOps(row.words, 'both', cites, `${row.key}-i`)
        : row.kind === 'added'
          ? [<ins key="a" className="dv__ins"><span className="u-sr">〔新增〕</span>{textNodes(afterText, cites, `${row.key}-i`)}</ins>]
          : row.kind === 'removed'
            ? [<del key="d" className="dv__del"><span className="u-sr">〔删除〕</span>{textNodes(beforeText, cites, `${row.key}-i`)}</del>]
            : textNodes(afterText || beforeText, cites, `${row.key}-i`)

    return (
      <article key={row.key} className={cx('dv__row', `dv__row--${row.kind}`)}>
        <div className="dv__rowmeta">
          <span className="dv__gutter" aria-hidden="true">{meta.glyph}</span>
          <Badge tone={meta.tone} size="sm" icon={<Icon name={meta.icon} size={11} />}>
            {meta.zh}
          </Badge>
          <span className="dv__btype">{blockLabel(row.blockType)}</span>
          {tally.addChars > 0 || tally.delChars > 0 ? (
            <span className="dv__tally u-mono">
              {tally.addChars > 0 ? <span className="dv__tally-a">＋{tally.addChars} 字</span> : null}
              {tally.delChars > 0 ? <span className="dv__tally-d">−{tally.delChars} 字</span> : null}
            </span>
          ) : null}
          {tally.addCites > 0 || tally.delCites > 0 ? (
            <span
              className={cx('dv__citetally u-mono', tally.delCites > 0 && 'dv__citetally--drop')}
              title="本段落引用标记的增减。删除一个引用标记，意味着一句陈述失去了它的证据指向。"
            >
              <Icon name="quote" size={11} />
              引用 ＋{tally.addCites} / −{tally.delCites}
            </span>
          ) : null}
        </div>

        {effective === 'split' ? (
          <div className="dv__cells">
            <div className="dv__cell dv__cell--before">
              {row.kind === 'added' ? emptyCell('基准版本中没有这一段') : renderCellText(beforeNodes, index, pre, beforeLabel)}
            </div>
            <div className="dv__spine" aria-hidden="true">
              <span className="dv__spine-glyph">{meta.glyph}</span>
            </div>
            <div className="dv__cell dv__cell--after">
              {row.kind === 'removed' ? emptyCell('对照版本中已删除这一段') : renderCellText(afterNodes, index, pre, afterLabel)}
            </div>
          </div>
        ) : (
          <div className="dv__cells dv__cells--inline">
            <div className="dv__cell">{renderCellText(inlineNodes, index, pre)}</div>
          </div>
        )}
      </article>
    )
  }

  const noChange = touched === 0 && refTouched === 0

  return (
    <div className={cx('dv', `dv--${effective}`, className)}>
      {/* ------------------------------ summary ----------------------------- */}
      <div className="dv__summary">
        <div className="dv__stats" role="list" aria-label="差异统计">
          <div className="dv__stat dv__stat--add" role="listitem">
            <span className="dv__stat-v u-num">{stats.added}</span>
            <span className="dv__stat-l">新增段落</span>
          </div>
          <div className="dv__stat dv__stat--del" role="listitem">
            <span className="dv__stat-v u-num">{stats.removed}</span>
            <span className="dv__stat-l">删除段落</span>
          </div>
          <div className="dv__stat dv__stat--chg" role="listitem">
            <span className="dv__stat-v u-num">{stats.changed}</span>
            <span className="dv__stat-l">修改段落</span>
          </div>
          <div className="dv__stat" role="listitem">
            <span className="dv__stat-v u-num">{unchanged}</span>
            <span className="dv__stat-l">未改动段落</span>
          </div>
        </div>

        <div className="dv__refdelta">
          <p className="dv__refline">
            <span className="dv__reflabel">
              <Icon name="book" size={12} />
              引用来源
            </span>
            <span className={cx('dv__refcount', refs.added.length > 0 && 'dv__refcount--add')}>
              新增 {refs.added.length} 份
            </span>
            <span className={cx('dv__refcount', refs.removed.length > 0 && 'dv__refcount--del')}>
              移除 {refs.removed.length} 份
            </span>
          </p>
          {refs.added.length > 0 ? (
            <p className="dv__refnames"><span className="dv__refsign" aria-hidden="true">＋</span>{refLine(refs.added)}</p>
          ) : null}
          {refs.removed.length > 0 ? (
            <p className="dv__refnames dv__refnames--del">
              <span className="dv__refsign" aria-hidden="true">−</span>
              {refLine(refs.removed)}
              <span className="dv__refwarn">来源被移除，需确认没有陈述仍依赖它</span>
            </p>
          ) : null}
          <p className="dv__oneline u-mono">{summarizeDiff(stats)}</p>
        </div>
      </div>

      {/* ------------------------------ toolbar ----------------------------- */}
      <div className="dv__toolbar">
        <Segmented<DiffMode>
          value={mode}
          onChange={setMode}
          ariaLabel="对照显示方式"
          size="sm"
          options={[
            { value: 'split', label: '并排对照' },
            { value: 'inline', label: '行内标注' },
          ]}
        />

        <div className="dv__legend" aria-label="标注图例">
          <span className="dv__legend-item">
            <ins className="dv__ins dv__legend-swatch">新增</ins>
            <span className="dv__legend-note">下划线</span>
          </span>
          <span className="dv__legend-item">
            <del className="dv__del dv__legend-swatch">删除</del>
            <span className="dv__legend-note">删除线</span>
          </span>
          <span className="dv__legend-item">
            <span className="dv__cite u-mono">cit-…</span>
            <span className="dv__legend-note">引用标记</span>
          </span>
        </div>

        <div className="dv__toolbar-right">
          <Checkbox
            checked={showAllUnchanged}
            onChange={setShowAllUnchanged}
            label="展开全部未修改内容"
          />
        </div>
      </div>

      {narrow && mode === 'split' ? (
        <p className="dv__notice">
          <Icon name="info" size={13} />
          当前屏幕宽度不足以并排显示两个版本，已自动切换为行内标注。
        </p>
      ) : null}

      {effective === 'split' ? (
        <p className="dv__hint">
          两栏逐段对齐、共用同一条纵向滚动轴；表格等超宽内容在各自单元格内横向滚动，且左右两栏保持同步。
        </p>
      ) : (
        <p className="dv__hint">
          单栏按顺序显示：<ins className="dv__ins">新增</ins> 与 <del className="dv__del">删除</del> 在同一句中并置，便于阅读改写的实际走向。
        </p>
      )}

      {/* -------------------------------- body ------------------------------ */}
      {noChange ? (
        <p className="dv__empty">
          <Icon name="check-double" size={16} />
          这两个版本之间没有正文差异，引用来源集合也完全相同。
        </p>
      ) : (
        <div className="dv__body" ref={bodyRef} id={bodyId} role="region" aria-label={`版本差异：${beforeLabel} 对比 ${afterLabel}`}>
          {effective === 'split' ? (
            <div className="dv__colhead">
              <div className="dv__colname dv__colname--before">
                <span className="dv__coltag">基准版本</span>
                <span className="dv__coltext">{beforeLabel}</span>
              </div>
              <div className="dv__spine" aria-hidden="true" />
              <div className="dv__colname dv__colname--after">
                <span className="dv__coltag">对照版本</span>
                <span className="dv__coltext">{afterLabel}</span>
              </div>
            </div>
          ) : null}

          {groups.map((group) => {
            const label = SECTION_LABEL[group.kind]
            return (
              <section key={group.key} className="dv__sec">
                <header className="dv__sechead">
                  <span className="dv__secmark" aria-hidden="true" />
                  <h4 className="dv__sectitle">{group.title}</h4>
                  <span className="dv__secen">{label?.en ?? ''}</span>
                  <span className={cx('dv__seccount', group.changes === 0 && 'dv__seccount--none')}>
                    {group.changes === 0 ? '本章节无改动' : `${group.changes} / ${group.total} 段有改动`}
                  </span>
                </header>

                <div className="dv__rows">
                  {group.items.map((item, i) => {
                    if (item.type === 'row') return renderRow(item.row, i)
                    const open = showAllUnchanged || openRuns.includes(item.key)
                    return (
                      <div key={item.key} className="dv__run">
                        <button
                          type="button"
                          className="dv__runtoggle"
                          onClick={() => toggleRun(item.key)}
                          aria-expanded={open}
                          disabled={showAllUnchanged}
                        >
                          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={13} />
                          {open ? `收起 ${item.rows.length} 段未修改内容` : `显示 ${item.rows.length} 段未修改内容`}
                        </button>
                        {open ? (
                          <div className="dv__runbody">
                            {item.rows.map((row, j) => renderRow(row, i * 100 + j))}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
