import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cx } from '../../lib/util'
import './Segmented.css'

/**
 * A segmented control — the filter row used across both surfaces.
 * Arrow keys, Home and End move between segments; selection follows focus.
 */

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

export interface SegmentedProps<T extends string> {
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  options: SegmentedOption<T>[]
  size?: 'sm' | 'md'
}

export function Segmented<T extends string>({
  value,
  onChange,
  ariaLabel,
  options,
  size = 'md',
}: SegmentedProps<T>): JSX.Element {
  const listRef = useRef<HTMLDivElement | null>(null)

  const focusAt = (index: number) => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('.psegmented__seg')
    if (!buttons || buttons.length === 0) return
    const clamped = ((index % buttons.length) + buttons.length) % buttons.length
    buttons[clamped]?.focus()
    const option = options[clamped]
    if (option) onChange(option.value)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        focusAt(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        focusAt(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(options.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div
      className={cx('psegmented', `psegmented--${size}`)}
      role="tablist"
      aria-label={ariaLabel}
      ref={listRef}
    >
      {options.map((option, i) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cx('psegmented__seg', selected && 'psegmented__seg--on')}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, i)}
          >
            <span className="psegmented__label">{option.label}</span>
            {typeof option.count === 'number' ? (
              <span className="psegmented__count u-num">{option.count}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
