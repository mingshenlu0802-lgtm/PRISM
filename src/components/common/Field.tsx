import { useId } from 'react'
import type {
  InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes,
} from 'react'
import { cx } from '../../lib/util'
import { Icon } from './Icon'
import './Field.css'

/**
 * Form primitives.
 *
 * `Field` associates its label with the control either explicitly (pass
 * `htmlFor`) or implicitly (omit it and the whole field becomes the label).
 * When `htmlFor` is given the hint gets the deterministic id `${htmlFor}-hint`,
 * so callers can point `aria-describedby` at it.
 */

export interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  htmlFor?: string
  children: ReactNode
  required?: boolean
}

export function Field({ label, hint, htmlFor, children, required = false }: FieldProps): JSX.Element {
  const marker = required ? (
    <span className="pfield__req">
      <span aria-hidden="true">＊</span>
      <span className="u-sr">必填</span>
    </span>
  ) : null

  if (htmlFor) {
    return (
      <div className="pfield">
        <label className="pfield__label" htmlFor={htmlFor}>
          {label}
          {marker}
        </label>
        <div className="pfield__control">{children}</div>
        {hint ? <p className="pfield__hint" id={`${htmlFor}-hint`}>{hint}</p> : null}
      </div>
    )
  }

  return (
    <label className="pfield">
      <span className="pfield__label">
        {label}
        {marker}
      </span>
      <span className="pfield__control">{children}</span>
      {hint ? <span className="pfield__hint">{hint}</span> : null}
    </label>
  )
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return <input {...rest} className={cx('pfield-input', className)} />
}

export function TextArea({ className, rows = 4, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return <textarea {...rest} rows={rows} className={cx('pfield-input', 'pfield-textarea', className)} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return (
    <span className="pfield-selectwrap">
      <select {...rest} className={cx('pfield-input', 'pfield-select', className)}>
        {children}
      </select>
      <span className="pfield-select__chev" aria-hidden="true">
        <Icon name="chevron-down" size={14} />
      </span>
    </span>
  )
}

export interface CheckboxProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  hint?: ReactNode
  disabled?: boolean
}

export function Checkbox({ checked, onChange, label, hint, disabled = false }: CheckboxProps): JSX.Element {
  const id = useId()
  const hintId = useId()

  return (
    <label className={cx('pfield-check', disabled && 'pfield-check--disabled')} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="pfield-check__input"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className="pfield-check__box" aria-hidden="true">
        <Icon name="check" size={12} />
      </span>
      <span className="pfield-check__text">
        <span className="pfield-check__label">{label}</span>
        {hint ? <span className="pfield-check__hint" id={hintId}>{hint}</span> : null}
      </span>
    </label>
  )
}
