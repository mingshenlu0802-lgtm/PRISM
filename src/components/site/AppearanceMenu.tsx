import { useEffect, useRef, useState } from 'react'
import { ACCENTS, FONT_STEPS, THEMES } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { cx } from '../../lib/util'
import { Icon } from '../common'
import './AppearanceMenu.css'

/**
 * 外观控制。
 *
 * 公众站和控制端共用同一个面板，因为它改的是同一份设置——读者调大字号之后，
 * 进控制端也是大字号。任何人都能给自己调；只有站长的调整会被写进变更记录。
 */
export function AppearanceMenu({ compact }: { compact?: boolean }): JSX.Element {
  const { state, dispatch, who } = usePrism()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const a = state.appearance

  /*
   * 滑杆认的是「第几格」，存下来的是倍率。存的时候要是碰上一个不在表里的
   * 旧值（改过刻度表，或者别人手改过数据库），indexOf 会给 -1——那会让
   * 滑杆跳到最左边，看上去像是设置被清空了。取最接近的一格，不猜。
   */
  const fsIndex = (() => {
    let best = 0
    for (let i = 1; i < FONT_STEPS.length; i++) {
      if (Math.abs(FONT_STEPS[i].value - a.fontScale) < Math.abs(FONT_STEPS[best].value - a.fontScale)) best = i
    }
    return best
  })()

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const set = (patch: Parameters<typeof dispatch>[0] extends never ? never : Partial<typeof a>) =>
    dispatch({ type: 'appearance', patch, who })

  return (
    <div className="apm" ref={ref}>
      <button
        type="button"
        className={cx('apm__btn', compact && 'apm__btn--compact')}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="外观设置"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="sun" size={15} />
        {/* 手机上收起文字，只留图标——按钮已经有 aria-label，读屏不受影响。 */}
        <span className={compact ? 'u-sr' : 'apm__label'}>外观</span>
      </button>

      {open && (
        <div className="apm__panel" role="dialog" aria-label="外观设置">
          {/*
            * 字号是一根滑杆，五格。
            *
            * 原来是五个并排的按钮，每个上面还写着一个大小不一的「字」。
            * 面板只有那么宽，五个按钮排不下，折成两行——第五格「特大」
            * 孤零零掉在下一行，看上去像是另一组设置。而且五个「选项」
            * 本来就不是五件事，是同一件事的五个刻度。
            *
            * 滑杆把这层关系直接画出来了：一根轴，从小到大，当前在哪一格
            * 一眼看得到。键盘的左右箭头本来就能用，读屏也认得 slider——
            * 比五个 aria-pressed 的按钮更好懂。
            */}
          <div className="apm__fshead">
            <p className="apm__title" id="apm-fs">字号</p>
            <span className="apm__fsnow">{FONT_STEPS[fsIndex]?.zh}</span>
          </div>
          <div className="apm__fs">
            <span className="apm__fsend" aria-hidden="true">小</span>
            <input
              className="apm__range"
              type="range"
              min={0}
              max={FONT_STEPS.length - 1}
              step={1}
              value={fsIndex}
              aria-labelledby="apm-fs"
              aria-valuetext={FONT_STEPS[fsIndex]?.zh}
              onChange={(e) => set({ fontScale: FONT_STEPS[Number(e.target.value)].value })}
            />
            <span className="apm__fsend apm__fsend--big" aria-hidden="true">大</span>
          </div>

          <p className="apm__title">主题</p>
          <div className="apm__row">
            {THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                className={cx('apm__chip', a.theme === t.key && 'apm__chip--on')}
                aria-pressed={a.theme === t.key}
                title={t.note}
                onClick={() => set({ theme: t.key })}
              >
                {t.zh}
              </button>
            ))}
          </div>

          <p className="apm__title">强调色</p>
          <div className="apm__row">
            {ACCENTS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={cx('apm__swatch', a.accent === c.key && 'apm__swatch--on')}
                aria-pressed={a.accent === c.key}
                aria-label={c.zh}
                title={c.zh}
                onClick={() => set({ accent: c.key })}
              >
                <span style={{ background: c.swatch }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
