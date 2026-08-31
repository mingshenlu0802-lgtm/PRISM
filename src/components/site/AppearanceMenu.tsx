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
          <p className="apm__title">字号</p>
          <div className="apm__row apm__row--fs">
            {FONT_STEPS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={cx('apm__chip', a.fontScale === f.value && 'apm__chip--on')}
                aria-pressed={a.fontScale === f.value}
                onClick={() => set({ fontScale: f.value })}
              >
                <span style={{ fontSize: `${0.72 + (f.value - 0.9) * 0.7}rem` }}>字</span>
                {f.zh}
              </button>
            ))}
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

          <p className="apm__title">正文</p>
          <div className="apm__row">
            <button
              type="button"
              className={cx('apm__chip', a.bodyFont === 'sans' && 'apm__chip--on')}
              aria-pressed={a.bodyFont === 'sans'}
              onClick={() => set({ bodyFont: 'sans' })}
            >黑体</button>
            <button
              type="button"
              className={cx('apm__chip', a.bodyFont === 'serif' && 'apm__chip--on')}
              aria-pressed={a.bodyFont === 'serif'}
              onClick={() => set({ bodyFont: 'serif' })}
            >宋体</button>
            <button
              type="button"
              className={cx('apm__chip', a.roomy && 'apm__chip--on')}
              aria-pressed={a.roomy}
              onClick={() => set({ roomy: !a.roomy })}
            >宽行距</button>
          </div>
        </div>
      )}
    </div>
  )
}
