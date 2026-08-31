import { useSyncExternalStore } from 'react'
import { cx } from '../../lib/util'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import './Toast.css'

/**
 * Toasts — a module-level emitter, so any handler anywhere can call
 * `toast('已保存草稿')` without provider plumbing. Each layout mounts one
 * `<ToastHost />`.
 *
 * Toasts are confirmations, never the only record of an action: everything
 * consequential in this product also lands in the audit trail.
 */

export type ToastTone = 'info' | 'go' | 'warn' | 'stop'

export interface ToastItem {
  id: string
  message: string
  tone: ToastTone
  createdAt: number
}

const DURATION = 4500
const MAX_VISIBLE = 4

const listeners = new Set<(items: ToastItem[]) => void>()
const timers = new Map<string, { handle: number; endsAt: number; left: number }>()

let items: ToastItem[] = []
let counter = 0
let paused = false

function emit(): void {
  const snapshot = items
  listeners.forEach((listener) => listener(snapshot))
}

function clearTimer(id: string): void {
  const timer = timers.get(id)
  if (timer) {
    window.clearTimeout(timer.handle)
    timers.delete(id)
  }
}

function arm(id: string, ms: number): void {
  clearTimer(id)
  if (typeof window === 'undefined') return
  const handle = window.setTimeout(() => {
    timers.delete(id)
    dismissToast(id)
  }, ms)
  timers.set(id, { handle, endsAt: Date.now() + ms, left: ms })
}

/** Raise a toast. Returns nothing — toasts are fire-and-forget. */
export function toast(message: string, tone: ToastTone = 'info'): void {
  const text = message.trim()
  if (!text) return

  counter += 1
  const id = `toast-${Date.now().toString(36)}-${counter.toString(36)}`
  const next = [...items, { id, message: text, tone, createdAt: Date.now() }]

  if (next.length > MAX_VISIBLE) {
    next.slice(0, next.length - MAX_VISIBLE).forEach((dropped) => clearTimer(dropped.id))
  }

  items = next.slice(-MAX_VISIBLE)
  emit()
  arm(id, DURATION)
}

export function dismissToast(id: string): void {
  clearTimer(id)
  const next = items.filter((item) => item.id !== id)
  if (next.length === items.length) return
  items = next
  emit()
}

export function clearToasts(): void {
  items.forEach((item) => clearTimer(item.id))
  if (items.length === 0) return
  items = []
  emit()
}

/** Hovering or focusing the stack holds every toast open. */
function pauseToasts(): void {
  if (paused) return
  paused = true
  const now = Date.now()
  timers.forEach((timer, id) => {
    window.clearTimeout(timer.handle)
    timers.set(id, { ...timer, left: Math.max(600, timer.endsAt - now) })
  })
}

function resumeToasts(): void {
  if (!paused) return
  paused = false
  timers.forEach((timer, id) => { arm(id, timer.left) })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getSnapshot(): ToastItem[] {
  return items
}

const TONE_ICON: Record<ToastTone, IconName> = {
  info: 'info',
  go: 'check',
  warn: 'alert',
  stop: 'x',
}

const TONE_WORD: Record<ToastTone, string> = {
  info: '提示',
  go: '成功',
  warn: '注意',
  stop: '未完成',
}

export function ToastHost(): JSX.Element {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return (
    <div
      className="ptoast"
      role="status"
      aria-live="polite"
      aria-atomic="false"
      onMouseEnter={pauseToasts}
      onMouseLeave={resumeToasts}
      onFocus={pauseToasts}
      onBlur={resumeToasts}
    >
      {list.map((item) => (
        <div key={item.id} className={cx('ptoast__item', `ptoast__item--${item.tone}`)}>
          <span className="ptoast__icon" aria-hidden="true">
            <Icon name={TONE_ICON[item.tone]} size={15} />
          </span>
          <p className="ptoast__text">
            <span className="u-sr">{TONE_WORD[item.tone]}：</span>
            {item.message}
          </p>
          <button
            type="button"
            className="ptoast__close"
            onClick={() => dismissToast(item.id)}
            aria-label="关闭提示"
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
