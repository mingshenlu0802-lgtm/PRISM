import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { PipelineRun, PipelineStage } from '../../lib/types'
import { Badge, Icon } from '../common'
import { cx, fmtClock, fmtDate } from '../../lib/util'
import './PipelineTimeline.css'

/**
 * The nightly automated desk, drawn as a real staged run.
 *
 * Seven connected nodes, each carrying its own metric. State is written out
 * ("已完成 / 运行中 / 已阻断 / 未开始") AND drawn as a different shape — a filled
 * disc with a tick, a segmented ring, a square with a cross, a dashed ring — so
 * the run reads correctly without colour. The track is horizontal on desktop and
 * vertical on mobile; selecting a node opens its log below.
 *
 * The run always ends in `handoff`, and that stage says the same thing every
 * night: the desk cannot publish.
 */

const STATE_LABEL: Record<PipelineStage['state'], string> = {
  idle: '未开始',
  running: '运行中',
  done: '已完成',
  blocked: '已阻断',
}

const OUTCOME: Record<PipelineRun['outcome'], { zh: string; tone: 'go' | 'hold' | 'stop' }> = {
  'handed-off': { zh: '已移交控制端', tone: 'go' },
  running: { zh: '运行中', tone: 'hold' },
  blocked: { zh: '已中止', tone: 'stop' },
}

/** Shape, not hue, is what tells the stages apart. */
function StageMark({ state }: { state: PipelineStage['state'] }): JSX.Element {
  return (
    <svg className="pipet__mark" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      {state === 'done' ? (
        <>
          <circle cx="12" cy="12" r="9.4" fill="currentColor" />
          <path d="M7.6 12.3 10.7 15.4 16.5 8.9" fill="none" stroke="var(--bg-raised)" strokeWidth="2.1"
            strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}

      {state === 'running' ? (
        <>
          <circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" strokeWidth="2" opacity=".28" />
          <path className="pipet__arc" d="M12 2.6a9.4 9.4 0 0 1 9.4 9.4" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3.2" fill="currentColor" />
        </>
      ) : null}

      {state === 'blocked' ? (
        <>
          <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4" fill="currentColor" />
          <path d="M8.6 8.6 15.4 15.4M15.4 8.6 8.6 15.4" fill="none" stroke="var(--bg-raised)" strokeWidth="2.1"
            strokeLinecap="round" />
        </>
      ) : null}

      {state === 'idle' ? (
        <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="2"
          strokeDasharray="3 3.4" opacity=".7" />
      ) : null}
    </svg>
  )
}

export interface PipelineTimelineProps {
  run: PipelineRun
  compact?: boolean
}

export function PipelineTimeline({ run, compact = false }: PipelineTimelineProps): JSX.Element {
  const stages = run.stages
  const initial = useMemo(() => {
    const active = stages.findIndex((s) => s.state === 'running' || s.state === 'blocked')
    return active >= 0 ? active : Math.max(0, stages.length - 1)
  }, [stages])

  const [selected, setSelected] = useState(initial)
  const [allLogs, setAllLogs] = useState(false)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  const index = Math.min(selected, Math.max(0, stages.length - 1))
  const current: PipelineStage | undefined = stages[index]
  const outcome = OUTCOME[run.outcome]
  const doneCount = stages.filter((s) => s.state === 'done').length

  function move(to: number) {
    if (stages.length === 0) return
    const next = (to + stages.length) % stages.length
    setSelected(next)
    tabs.current[next]?.focus()
  }

  function onKey(e: ReactKeyboardEvent<HTMLButtonElement>, i: number) {
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': e.preventDefault(); move(i + 1); break
      case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); move(i - 1); break
      case 'Home': e.preventDefault(); move(0); break
      case 'End': e.preventDefault(); move(stages.length - 1); break
      default: break
    }
  }

  if (stages.length === 0) {
    return (
      <div className="pipet pipet--empty">
        <p className="pipet__emptytext">本次运行没有记录任何阶段。</p>
      </div>
    )
  }

  return (
    <div className={cx('pipet', compact && 'pipet--compact')}>
      <div className="pipet__meta">
        <Badge tone={outcome.tone} icon={<Icon name={run.outcome === 'blocked' ? 'x' : 'send'} size={12} />}>
          {outcome.zh}
        </Badge>
        <span className="pipet__metaitem u-num">
          {fmtDate(run.date)} · {fmtClock(run.startedAt)}
          {run.finishedAt ? `–${fmtClock(run.finishedAt)} UTC` : ' UTC 起'}
        </span>
        <span className="pipet__metaitem u-num">阶段 {doneCount}/{stages.length} 完成</span>
        <span className="pipet__metaitem u-num">产出草稿 {run.producedArticleIds.length} 篇</span>
        <span className="pipet__metaitem u-num">信号 {run.producedSignalIds.length} 条</span>
      </div>

      <ol
        className="pipet__track"
        role={compact ? undefined : 'tablist'}
        aria-label={compact ? undefined : '自动编辑台运行阶段'}
      >
        {stages.map((stage, i) => {
          const active = !compact && i === index
          const inner = (
            <>
              <span className={cx('pipet__marker', `pipet__marker--${stage.state}`)}>
                <StageMark state={stage.state} />
              </span>
              <span className="pipet__nodetext">
                <span className="pipet__idx u-mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="pipet__zh">{stage.zh}</span>
                <span className="pipet__en">{stage.en}</span>
                <span className={cx('pipet__state', `pipet__state--${stage.state}`)}>{STATE_LABEL[stage.state]}</span>
                <span className="pipet__metric">
                  <span className="pipet__metricvalue u-num">{stage.metricValue}</span>
                  <span className="pipet__metriclabel">{stage.metricLabel}</span>
                </span>
              </span>
            </>
          )

          return (
            <li
              key={stage.key}
              className={cx('pipet__stage', active && 'pipet__stage--active', `pipet__stage--${stage.state}`)}
              role={compact ? undefined : 'presentation'}
            >
              {compact ? (
                <div className="pipet__node pipet__node--static">{inner}</div>
              ) : (
                <button
                  type="button"
                  className="pipet__node"
                  role="tab"
                  id={`pipet-tab-${run.id}-${stage.key}`}
                  aria-selected={active}
                  aria-controls={`pipet-panel-${run.id}`}
                  tabIndex={active ? 0 : -1}
                  ref={(el) => { tabs.current[i] = el }}
                  onClick={() => setSelected(i)}
                  onKeyDown={(e) => onKey(e, i)}
                >
                  {inner}
                </button>
              )}
            </li>
          )
        })}
      </ol>

      {!compact && current ? (
        <div
          className="pipet__panel"
          role="tabpanel"
          id={`pipet-panel-${run.id}`}
          aria-labelledby={`pipet-tab-${run.id}-${current.key}`}
          tabIndex={0}
        >
          <div className="pipet__panelhead">
            <h3 className="pipet__paneltitle">
              <span className="u-mono pipet__panelidx">{String(index + 1).padStart(2, '0')}</span>
              {current.zh}
              <span className="pipet__panelen">{current.en}</span>
            </h3>
            <span className={cx('pipet__state', `pipet__state--${current.state}`)}>{STATE_LABEL[current.state]}</span>
          </div>

          <p className="pipet__detail">{current.detail}</p>

          <p className="pipet__panelmetric">
            <span className="pipet__metriclabel">{current.metricLabel}</span>
            <span className="pipet__metricvalue u-num">{current.metricValue}</span>
          </p>

          <div className="pipet__logwrap">
            <p className="pipet__logtitle u-eyebrow">运行日志</p>
            {current.log.length > 0 ? (
              <ol className="pipet__log">
                {current.log.map((line, li) => (
                  <li className="pipet__logline" key={li}>
                    <span className="pipet__logn u-mono" aria-hidden="true">{String(li + 1).padStart(2, '0')}</span>
                    <span className="pipet__logtext">{line}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="pipet__logempty">该阶段没有写入日志。</p>
            )}
          </div>

          <button
            type="button"
            className="pipet__all"
            aria-expanded={allLogs}
            onClick={() => setAllLogs((v) => !v)}
          >
            <Icon name={allLogs ? 'chevron-up' : 'chevron-down'} size={13} />
            {allLogs ? '收起全部阶段日志' : `展开全部阶段日志（${stages.reduce((n, s) => n + s.log.length, 0)} 行）`}
          </button>

          {allLogs ? (
            <div className="pipet__alllogs">
              {stages.map((s, si) => (
                <section className="pipet__allblock" key={s.key}>
                  <h4 className="pipet__alltitle">
                    <span className="u-mono">{String(si + 1).padStart(2, '0')}</span> {s.zh}
                    <span className={cx('pipet__state', `pipet__state--${s.state}`)}>{STATE_LABEL[s.state]}</span>
                  </h4>
                  {s.log.length > 0 ? (
                    <ul className="pipet__log pipet__log--flat">
                      {s.log.map((line, li) => (
                        <li className="pipet__logline" key={li}>
                          <span className="pipet__logtext">{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="pipet__logempty">无日志。</p>
                  )}
                </section>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="pipet__handoff">
        <span className="pipet__handofficon" aria-hidden="true"><Icon name="lock" size={14} /></span>
        <span>
          <strong>自动编辑台无发布权限。</strong>
          流程的最后一步只能是「移交控制端等待审批」；批准与公开发布必须由主编在控制端逐条完成，并受 Global
          Publishing Lock 约束。
        </span>
      </p>
    </div>
  )
}
