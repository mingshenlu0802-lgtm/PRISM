import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CollectMode, TopicKey } from '../../lib/types'
import type { RegionKey } from '../../lib/regions'
import { PRIORITY_REGIONS, REGIONS, sortRegions } from '../../lib/regions'
import { ENGINES, TOPICS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { collect, planSteps } from '../../lib/collect'
import { cx, fmtDateTime, nowIso, relTime, uid } from '../../lib/util'
import { Checkbox, Icon, Modal, toast } from '../../components/common'
import './SearchPage.css'

/**
 * 「找新闻」——控制端第一页。
 *
 * 设计上只有一个主按钮。所有设置都有默认值，看不懂的可以完全不碰，直接按
 * 那个按钮。每个选项旁边都用一句大白话说明它会造成什么后果。
 */
export default function SearchPage(): JSX.Element {
  const { state, dispatch, who, canEdit } = usePrism()
  const cfg = state.collect
  const [running, setRunning] = useState(false)
  const [stepIndex, setStepIndex] = useState(-1)
  const [runId, setRunId] = useState<string | null>(null)
  const [confirmUndo, setConfirmUndo] = useState<string | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)) }, [])

  const lastRun = state.runs[0]
  const steps = useMemo(() => planSteps(cfg), [cfg])

  const setCfg = (patch: Parameters<typeof dispatch>[0] extends never ? never : Partial<typeof cfg>) =>
    dispatch({ type: 'collect-config', patch })

  const toggleRegion = (k: RegionKey) =>
    setCfg({ regions: cfg.regions.includes(k) ? cfg.regions.filter((r) => r !== k) : sortRegions([...cfg.regions, k]) })

  const toggleTopic = (k: TopicKey) =>
    setCfg({ topics: cfg.topics.includes(k) ? cfg.topics.filter((t) => t !== k) : [...cfg.topics, k] })

  function start() {
    if (running) return
    if (cfg.regions.length === 0) { toast('先至少选一个地区。', 'warn'); return }
    if (cfg.topics.length === 0) { toast('先至少选一个议题。', 'warn'); return }

    const id = uid('run')
    const run = {
      id, startedAt: nowIso(), config: { ...cfg },
      steps: planSteps(cfg), addedNewsIds: [], addedStudyIds: [],
      skipped: [], state: 'running' as const,
    }
    dispatch({ type: 'run-start', run })
    setRunId(id); setRunning(true); setStepIndex(-1)

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const gap = reduce ? 60 : 520

    run.steps.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => {
        setStepIndex(i)
        dispatch({ type: 'run-step', runId: id, index: i })
      }, gap * (i + 1)))
    })

    timers.current.push(window.setTimeout(() => {
      const result = collect(cfg, state.news, state.studies, state.runs.length)
      if (result.news.length) dispatch({ type: 'news-add', items: result.news, who })
      if (result.studies.length) dispatch({ type: 'study-add', items: result.studies, who })
      dispatch({
        type: 'run-finish', runId: id,
        addedNews: result.news.map((n) => n.id),
        addedStudies: result.studies.map((s) => s.id),
        skipped: result.skipped,
      })
      setRunning(false)
      const total = result.news.length + result.studies.length
      if (total === 0) toast('这次没有找到新内容——素材都已经在站上了。', 'info')
      else if (cfg.autoPublish) toast(`找到 ${total} 条，已经直接上线。不满意可以随时删。`, 'go')
      else toast(`找到 ${total} 条，已存为草稿，去「编辑」里看。`, 'go')
    }, gap * (run.steps.length + 1)))
  }

  const currentRun = runId ? state.runs.find((r) => r.id === runId) : lastRun

  return (
    <div className="srch">
      <header className="srch__head">
        <h1 className="srch__title">找新闻</h1>
        <p className="srch__lede">
          选好地区和议题，按下面那个大按钮就行。其余设置都有默认值，看不懂可以不动。
        </p>
      </header>

      {/* ------------------------------ the button ------------------------------ */}
      <section className="srch__go">
        <button type="button" className="srch__gobtn" onClick={start} disabled={running || !canEdit}>
          {running ? (<><span className="srch__spinner" aria-hidden="true" />正在搜集…</>)
            : (<><Icon name="search" size={20} />开始搜集</>)}
        </button>
        <div className="srch__gonote">
          <p>
            这次会搜 <strong>{cfg.regions.length}</strong> 个地区、
            <strong>{cfg.topics.length}</strong> 个议题，最多加 <strong>{cfg.perRun}</strong> 条。
          </p>
          <p className={cx('srch__mode', cfg.autoPublish && 'srch__mode--live')}>
            {cfg.autoPublish
              ? '找到就直接上线，公众站马上能看到。你可以随时删掉。'
              : '找到后存为草稿，不会出现在公众站，等你去「编辑」里放行。'}
          </p>
          {!canEdit && <p className="srch__warn">需要先用站长或管理员的 Google 账号登录才能搜集。</p>}
        </div>
      </section>

      {/* ------------------------------- progress ------------------------------- */}
      {(running || currentRun) && (
        <section className="srch__run" aria-live="polite">
          <p className="srch__runhead">
            {running ? '正在进行' : `上次搜集 · ${currentRun ? relTime(currentRun.startedAt) : ''}`}
          </p>
          <ol className="srch__steps">
            {(currentRun?.steps ?? steps).map((s, i) => {
              const done = running ? i <= stepIndex : Boolean(currentRun && currentRun.state === 'done')
              return (
                <li key={`${s.stage}-${i}`} className={cx('srch__step', done && 'srch__step--done')}>
                  <span className="srch__stepmark" aria-hidden="true">
                    {done ? <Icon name="check" size={13} /> : i}
                  </span>
                  <div>
                    <p className="srch__steplabel">{s.label}</p>
                    <p className="srch__stepdetail">{s.detail}</p>
                  </div>
                </li>
              )
            })}
          </ol>

          {currentRun && currentRun.state === 'done' && (
            <div className="srch__result">
              <p className="srch__resulthead">
                这次加了 <strong>{currentRun.addedNewsIds.length}</strong> 条新闻、
                <strong>{currentRun.addedStudyIds.length}</strong> 项研究
              </p>
              {currentRun.skipped.length > 0 && (
                <details className="srch__skipped">
                  <summary>{currentRun.skipped.length} 条被跳过，看原因</summary>
                  <ul>
                    {currentRun.skipped.map((s, i) => (
                      <li key={i}><span className="srch__skiphead">{s.headline}</span><span className="srch__skipwhy">{s.reason}</span></li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="srch__resultactions">
                <Link className="srch__link" to="/console/manage">去看看这些内容<Icon name="arrow-right" size={13} /></Link>
                {(currentRun.addedNewsIds.length + currentRun.addedStudyIds.length) > 0 && (
                  <button type="button" className="srch__undo" onClick={() => setConfirmUndo(currentRun.id)}>
                    <Icon name="refresh" size={13} />后悔了，撤销这次搜集
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------- settings ------------------------------- */}
      <section className="srch__block">
        <div className="srch__blockhead">
          <h2 className="srch__blocktitle">搜哪些地区</h2>
          <div className="srch__quick">
            <button type="button" onClick={() => setCfg({ regions: [...PRIORITY_REGIONS] })}>只搜优先六个</button>
            <button type="button" onClick={() => setCfg({ regions: REGIONS.map((r) => r.key) })}>全选</button>
          </div>
        </div>
        <p className="srch__blocknote">前六个是你指定的优先地区，搜集时会先扫它们。</p>
        <div className="srch__chips">
          {REGIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              className={cx('srch__chip', cfg.regions.includes(r.key) && 'srch__chip--on')}
              aria-pressed={cfg.regions.includes(r.key)}
              onClick={() => toggleRegion(r.key)}
            >
              <span className="srch__dot" style={{ background: r.hue }} aria-hidden="true" />
              {r.zh}
              {r.priority === 1 && <span className="srch__pri">优先</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="srch__block">
        <div className="srch__blockhead">
          <h2 className="srch__blocktitle">搜哪些议题</h2>
          <div className="srch__quick">
            <button type="button" onClick={() => setCfg({ topics: TOPICS.map((t) => t.key) })}>全选</button>
          </div>
        </div>
        <div className="srch__chips">
          {TOPICS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={cx('srch__chip', cfg.topics.includes(t.key) && 'srch__chip--on')}
              aria-pressed={cfg.topics.includes(t.key)}
              title={t.blurb}
              onClick={() => toggleTopic(t.key)}
            >
              <span className="srch__gem" style={{ background: t.hue }} aria-hidden="true" />
              {t.short}
            </button>
          ))}
        </div>
      </section>

      <section className="srch__block">
        <h2 className="srch__blocktitle">找什么、找多少</h2>
        <div className="srch__opts">
          <div className="srch__opt">
            <p className="srch__optlabel">内容类型</p>
            <div className="srch__seg">
              {([['both', '新闻＋研究'], ['news', '只要新闻'], ['studies', '只要研究与数据']] as [CollectMode, string][]).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={cx('srch__segbtn', cfg.mode === v && 'srch__segbtn--on')}
                  aria-pressed={cfg.mode === v}
                  onClick={() => setCfg({ mode: v })}
                >{label}</button>
              ))}
            </div>
          </div>

          <div className="srch__opt">
            <p className="srch__optlabel">这次最多加几条</p>
            <div className="srch__seg">
              {[3, 6, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cx('srch__segbtn', cfg.perRun === n && 'srch__segbtn--on')}
                  aria-pressed={cfg.perRun === n}
                  onClick={() => setCfg({ perRun: n })}
                >{n} 条</button>
              ))}
            </div>
          </div>
        </div>

        <div className="srch__checks">
          <Checkbox
            checked={cfg.autoPublish}
            onChange={(v) => setCfg({ autoPublish: v })}
            label="找到就直接上线"
            hint="打开：新内容马上出现在公众站，你随时可以删。关掉：先存草稿，等你放行。"
          />
          <Checkbox
            checked={cfg.dedupe}
            onChange={(v) => setCfg({ dedupe: v })}
            label="自动跳过重复的"
            hint="标题和已有内容很像的就不再加一遍。被跳过的会列出原因，不会悄悄消失。"
          />
          <Checkbox
            checked={cfg.preferIndependent}
            onChange={(v) => setCfg({ preferIndependent: v })}
            label="优先独立与境外媒体"
            hint={'报道部分优先取独立与境外媒体；官方媒体不丢掉，往后排并在页面上标成「官方媒体」。'
              + '判决书、法案、部门文件这类原始文件不受影响，始终排在最前。'}
          />
        </div>
      </section>

      <section className="srch__block">
        <h2 className="srch__blocktitle">用哪个 AI 去找和写</h2>
        <p className="srch__blocknote">
          <strong>找链接和写总结都用你在这里选的模型</strong>——包括几百上千字的长总结。
          这两件事是重复劳动，免费的开源模型就够，不用花钱。
          控制端「编辑 → Claude」里的改写才用 Claude，那是另一笔账，你不选也不会产生费用。
        </p>
        <div className="srch__engines">
          {ENGINES.map((e) => (
            <button
              key={e.id}
              type="button"
              className={cx('srch__engine', cfg.engine === e.id && 'srch__engine--on')}
              aria-pressed={cfg.engine === e.id}
              onClick={() => setCfg({ engine: e.id })}
            >
              <span className="srch__enginetop">
                <span className="srch__enginename">{e.name}</span>
                <span className="srch__enginecost">{e.cost}</span>
              </span>
              <span className="srch__enginenote">{e.note}</span>
            </button>
          ))}
        </div>
      </section>

      {state.runs.length > 1 && (
        <section className="srch__block">
          <h2 className="srch__blocktitle">最近几次搜集</h2>
          <ul className="srch__history">
            {state.runs.slice(0, 6).map((r) => (
              <li key={r.id} className="srch__histrow">
                <span className="srch__histwhen">{fmtDateTime(r.startedAt)}</span>
                <span className="srch__histn">+{r.addedNewsIds.length + r.addedStudyIds.length} 条</span>
                <span className="srch__histcfg">{r.config.regions.length} 个地区 · {r.config.autoPublish ? '直接上线' : '存草稿'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Modal
        open={confirmUndo !== null}
        onClose={() => setConfirmUndo(null)}
        title="撤销这次搜集？"
        subtitle="这次加进来的内容会被移除"
        tone="danger"
        footer={
          <>
            <button type="button" className="srch__mbtn" onClick={() => setConfirmUndo(null)}>算了</button>
            <button
              type="button"
              className="srch__mbtn srch__mbtn--danger"
              onClick={() => {
                if (confirmUndo) dispatch({ type: 'run-undo', runId: confirmUndo, who })
                setConfirmUndo(null)
                toast('已撤销，这次加的内容都移除了。', 'info')
              }}
            >撤销</button>
          </>
        }
      >
        <p className="srch__mtext">
          只会移除这一次搜集加进来的内容，之前的都不受影响。
          如果你已经手动改过其中某条，改动也会一起消失。
        </p>
      </Modal>
    </div>
  )
}
