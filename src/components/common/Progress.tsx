import { cx } from '../../lib/util'
import { Icon } from './Icon'
import './Progress.css'

/**
 * An ordered checklist — the publish gate, a pipeline stage, a review run.
 * A completed step is a filled node with a tick; an outstanding step is a
 * hollow node. State is also written out for assistive technology.
 */

export interface ProgressProps {
  steps: { label: string; done: boolean }[]
  compact?: boolean
}

export function Progress({ steps, compact = false }: ProgressProps): JSX.Element {
  const total = steps.length
  const done = steps.filter((s) => s.done).length
  const complete = total > 0 && done === total

  return (
    <div className={cx('pprogress', compact && 'pprogress--compact', complete && 'pprogress--complete')}>
      <ol className="pprogress__list">
        {steps.map((step, i) => (
          <li
            key={`${i}-${step.label}`}
            className={cx('pprogress__step', step.done && 'pprogress__step--done')}
            title={compact ? step.label : undefined}
          >
            <span className="pprogress__node" aria-hidden="true">
              {step.done ? <Icon name="check" size={11} /> : null}
            </span>
            <span className="pprogress__label">{step.label}</span>
            <span className="u-sr">{step.done ? '（已完成）' : '（未完成）'}</span>
          </li>
        ))}
      </ol>
      <p className="pprogress__count">
        <span className="pprogress__count-num u-num">{done}/{total}</span>
        <span className="pprogress__count-word">{complete ? '全部完成' : '项完成'}</span>
      </p>
    </div>
  )
}
