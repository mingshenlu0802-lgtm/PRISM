import { useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

import type { Article, Citation, CitationCheck } from '../../lib/types'
import { citationNumbers, cx, fmtDateTime } from '../../lib/util'
import { usePrism } from '../../lib/store'

import { Badge, DemoTag, Icon, SourceCard } from '../common'

import './SourceDrawer.css'

/**
 * The citation inspector.
 *
 * Clicking any inline `[n]` opens this drawer: the exact claim that marker is
 * carrying, where inside the source it sits, what the automated citation check
 * did and did not verify, the full source record, and — the part that matters
 * most for reading critically — every OTHER statement in this article resting
 * on the same source. A piece that leans on one document ten times looks
 * different from a piece that leans on ten documents once, and the reader
 * should be able to see which one they are reading.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const CHECK_META: Record<CitationCheck['status'], { zh: string; tone: 'go' | 'warn' | 'stop' }> = {
  found: { zh: '资源已找到', tone: 'go' },
  partial: { zh: '仅部分可得', tone: 'warn' },
  missing: { zh: '资源未找到', tone: 'stop' },
}

export interface SourceDrawerProps {
  article: Article
  citationId: string | null
  onClose: () => void
  /** Lets the drawer walk to another claim resting on the same source. */
  onSelect?: (citationId: string) => void
}

export function SourceDrawer({
  article,
  citationId,
  onClose,
  onSelect,
}: SourceDrawerProps): JSX.Element | null {
  const { state } = usePrism()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  const close = useCallback(() => { onCloseRef.current() }, [])

  const open = citationId !== null

  useEffect(() => {
    if (!open) return undefined

    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const raf = window.requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel).focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.getClientRects().length > 0)
      if (nodes.length === 0) { event.preventDefault(); panel.focus(); return }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement
      const inside = active instanceof Node && panel.contains(active)
      if (event.shiftKey) {
        if (!inside || active === first) { event.preventDefault(); last.focus() }
      } else if (!inside || active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = prevOverflow
      const restore = restoreRef.current
      if (restore && document.contains(restore)) restore.focus()
      restoreRef.current = null
    }
  }, [open, close])

  if (!open || typeof document === 'undefined') return null

  const numbers = citationNumbers(article)
  const citation = article.citations.find((c) => c.id === citationId)
  const source = citation ? state.sources.find((s) => s.id === citation.sourceId) : undefined
  const n = citationId ? numbers.get(citationId) : undefined
  const check = article.citationChecks.find((c) => c.citationId === citationId)

  const siblings: Citation[] = citation
    ? article.citations.filter((c) => c.sourceId === citation.sourceId && c.id !== citation.id)
    : []

  const host = document.querySelector('[data-surface]')
  const surface = host?.getAttribute('data-surface') ?? document.documentElement.getAttribute('data-surface') ?? undefined
  const theme = host?.getAttribute('data-theme') ?? document.documentElement.getAttribute('data-theme') ?? undefined

  return createPortal(
    <div
      className="sdrawer"
      data-surface={surface}
      data-theme={theme}
    >
      {/* Pointer affordance only — Escape and the close button carry the
          keyboard and screen-reader routes out of the dialog. */}
      <button
        type="button"
        className="sdrawer__scrim"
        tabIndex={-1}
        aria-hidden="true"
        onClick={close}
      />

      <div
        className="sdrawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="sdrawer__head">
          <div className="sdrawer__heading">
            <p className="sdrawer__kicker">
              <Icon name="link" size={13} />
              <span>来源详情 · Source record</span>
            </p>
            <h2 className="sdrawer__title" id={titleId}>
              {typeof n === 'number' ? <span className="sdrawer__n u-num">[{n}]</span> : null}
              <span>{source ? source.title : '记录缺失'}</span>
            </h2>
          </div>
          <button type="button" className="sdrawer__close" onClick={close} aria-label="关闭来源面板">
            <Icon name="x" size={16} />
          </button>
        </header>

        <div className="sdrawer__scroll">
          {!citation ? (
            <div className="sdrawer__missing">
              <p className="sdrawer__missing-title">这条引用不在本文的引用登记中。</p>
              <p className="sdrawer__missing-text">
                标记 <code className="sdrawer__code">{citationId}</code> 在正文里出现过，但引用登记里没有对应条目。
                本站保留这条提示而不是悄悄删掉标记，这样缺口对读者与编辑都是可见的。
              </p>
            </div>
          ) : (
            <>
              <section className="sdrawer__block">
                <p className="sdrawer__blocktitle">这条引用承载的说法</p>
                <blockquote className="sdrawer__claim">{citation.claim}</blockquote>
                {citation.locator ? (
                  <p className="sdrawer__locator">
                    <Icon name="pin" size={12} />
                    <span>定位：{citation.locator}</span>
                  </p>
                ) : null}
              </section>

              {check ? (
                <section className={cx('sdrawer__check', `sdrawer__check--${check.status}`)}>
                  <p className="sdrawer__checkhead">
                    <Badge
                      tone={CHECK_META[check.status].tone}
                      size="sm"
                      icon={<Icon name={check.status === 'found' ? 'check' : check.status === 'partial' ? 'alert' : 'x'} size={12} />}
                    >
                      {CHECK_META[check.status].zh}
                    </Badge>
                    <time className="sdrawer__checktime" dateTime={check.checkedAt}>
                      {fmtDateTime(check.checkedAt)}
                    </time>
                  </p>
                  <p className="sdrawer__checkreason">{check.reason}</p>
                  {check.status === 'missing' ? (
                    <p className="sdrawer__checknote">
                      未通过的引用不得用于支撑事实陈述。正文中出现这条标记的地方，只用它说明「存在某种说法」。
                    </p>
                  ) : null}
                  {check.acknowledged ? (
                    <p className="sdrawer__checkacked">
                      <Icon name="users" size={12} />
                      <span>
                        编辑已处理：{check.acknowledgedNote ?? '依赖这条引用的句子已被削弱或改为归因表述。'}
                        {check.acknowledgedBy ? `（${check.acknowledgedBy}）` : ''}
                        记录不被删除，只是不再阻断发布。
                      </span>
                    </p>
                  ) : null}
                </section>
              ) : (
                <section className="sdrawer__check sdrawer__check--none">
                  <p className="sdrawer__checkreason">这条引用尚未进入自动核查记录。</p>
                </section>
              )}

              {source ? (
                <section className="sdrawer__block">
                  <p className="sdrawer__blocktitle">来源记录</p>
                  <SourceCard source={source} n={n} />
                </section>
              ) : (
                <div className="sdrawer__missing">
                  <p className="sdrawer__missing-title">来源记录缺失</p>
                  <p className="sdrawer__missing-text">
                    引用指向的来源 <code className="sdrawer__code">{citation.sourceId}</code> 不在来源库中。
                  </p>
                </div>
              )}

              <section className="sdrawer__block">
                <p className="sdrawer__blocktitle">
                  本文中依据同一份来源的其他陈述
                  <span className="sdrawer__count u-num">{siblings.length}</span>
                </p>
                {siblings.length === 0 ? (
                  <p className="sdrawer__solo">
                    本文只在这一处使用了这份来源。
                  </p>
                ) : (
                  <>
                    <p className="sdrawer__sibhint">
                      同一份文件被反复使用不是问题，把它当成多个独立来源才是。以下每一条都回到同一份材料，
                      因此它们之间不构成交叉印证。
                    </p>
                    <ul className="sdrawer__siblings">
                      {siblings.map((c) => {
                        const sn = numbers.get(c.id)
                        const sCheck = article.citationChecks.find((x) => x.citationId === c.id)
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              className="sdrawer__sibling"
                              onClick={onSelect ? () => onSelect(c.id) : undefined}
                              disabled={!onSelect}
                            >
                              <span className="sdrawer__sibn u-num">[{sn ?? '?'}]</span>
                              <span className="sdrawer__sibbody">
                                <span className="sdrawer__sibclaim">{c.claim}</span>
                                {c.locator ? (
                                  <span className="sdrawer__sibloc">{c.locator}</span>
                                ) : null}
                              </span>
                              {sCheck && sCheck.status !== 'found' ? (
                                <span
                                  className={cx('sdrawer__sibflag', `sdrawer__sibflag--${sCheck.status}`)}
                                  title={sCheck.reason}
                                >
                                  {sCheck.status === 'partial' ? '有保留' : '未通过'}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </section>
            </>
          )}
        </div>

        <footer className="sdrawer__foot">
          <DemoTag />
          <span className="sdrawer__footnote">
            本原型中的全部来源均为虚构记录，网址位于保留域名 <code className="sdrawer__code">.invalid</code>，永不解析。
          </span>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
