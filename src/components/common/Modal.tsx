import { useCallback, useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../lib/util'
import { Icon } from './Icon'
import './Modal.css'

/**
 * The dialog used for every confirmation, inspector and二次确认 in the product.
 *
 * Portalled to <body>, `role="dialog" aria-modal="true"`, focus trapped inside
 * and restored on close, Escape and backdrop both close, and the page behind is
 * scroll-locked while it is open.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableIn(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true' && el.getClientRects().length > 0,
  )
}

/**
 * The dialog is portalled to <body>, which may sit OUTSIDE the element carrying
 * `data-surface` / `data-theme`. Mirror those attributes onto the portal root so
 * the semantic tokens resolve exactly as they do inside the layout.
 */
function surfaceAttrs(): { surface: string | undefined; theme: string | undefined } {
  if (typeof document === 'undefined') return { surface: undefined, theme: undefined }
  const host = document.querySelector('[data-surface]')
  const root = document.documentElement
  return {
    surface: host?.getAttribute('data-surface') ?? root.getAttribute('data-surface') ?? undefined,
    theme: host?.getAttribute('data-theme') ?? root.getAttribute('data-theme') ?? undefined,
  }
}

/* Body scroll lock, ref-counted so nested dialogs cannot unlock each other. */
let lockCount = 0
let savedOverflow = ''
let savedPaddingRight = ''

function lockBodyScroll(): void {
  if (lockCount === 0) {
    const gap = window.innerWidth - document.documentElement.clientWidth
    savedOverflow = document.body.style.overflow
    savedPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = `${gap}px`
  }
  lockCount += 1
}

function unlockBodyScroll(): void {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow
    document.body.style.paddingRight = savedPaddingRight
  }
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: ReactNode
  children: ReactNode
  tone?: 'default' | 'danger'
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  width = 'md',
  footer,
  children,
  tone = 'default',
}: ModalProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const pressedBackdrop = useRef(false)
  const titleId = useId()
  const subtitleId = useId()

  /* `onClose` is usually an inline arrow, so it is held in a ref: the open
     effect must not re-run (and steal focus back) on every parent render. */
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  const close = useCallback(() => { onCloseRef.current() }, [])

  useEffect(() => {
    if (!open) return undefined

    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    lockBodyScroll()

    const focusFirst = () => {
      const nodes = focusableIn(dialogRef.current)
      const target = nodes[0] ?? dialogRef.current
      target?.focus()
    }
    // One frame later, so the dialog is laid out before focus moves.
    const raf = window.requestAnimationFrame(focusFirst)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return
      const nodes = focusableIn(dialog)
      if (nodes.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement
      const inside = active instanceof Node && dialog.contains(active)

      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (!inside || active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    /* If focus escapes the dialog by any other route, pull it back. */
    const onFocusIn = (event: FocusEvent) => {
      const dialog = dialogRef.current
      if (!dialog) return
      const target = event.target
      if (target instanceof Node && !dialog.contains(target)) {
        const nodes = focusableIn(dialog)
        ;(nodes[0] ?? dialog).focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', onFocusIn)

    return () => {
      window.cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', onFocusIn)
      unlockBodyScroll()
      const restore = restoreRef.current
      if (restore && document.contains(restore)) restore.focus()
      restoreRef.current = null
    }
  }, [open, close])

  if (!open || typeof document === 'undefined') return null

  const { surface, theme } = surfaceAttrs()

  return createPortal(
    <div
      className={cx('pmodal', `pmodal--${width}`, tone === 'danger' && 'pmodal--danger')}
      data-surface={surface}
      data-theme={theme}
      onMouseDown={(event) => { pressedBackdrop.current = event.target === event.currentTarget }}
      onMouseUp={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) close()
        pressedBackdrop.current = false
      }}
    >
      <div
        className="pmodal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="pmodal__head">
          <div className="pmodal__heading">
            <h2 className="pmodal__title" id={titleId}>{title}</h2>
            {subtitle ? (
              <p className="pmodal__subtitle" id={subtitleId}>{subtitle}</p>
            ) : null}
          </div>
          <button type="button" className="pmodal__close" onClick={close} aria-label="关闭对话框">
            <Icon name="x" size={16} />
          </button>
        </header>

        <div className="pmodal__body">{children}</div>

        {footer ? <footer className="pmodal__foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}
