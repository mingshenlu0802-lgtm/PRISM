import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { DEMO_NOTICE, DEMO_NOTICE_EN, TOPICS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { cx, fmtDate } from '../../lib/util'
import { Icon, PrismMark, ToastHost } from '../common'

import './PublicLayout.css'

/**
 * The public shell: a warm research-journal surface.
 *
 * It owns three global concerns and nothing else —
 *  1. the surface/theme contract on <html> (`data-surface="public"`, `data-theme`),
 *  2. the masthead, topic menu and mobile sheet,
 *  3. the standing demo notice, which is rendered above the fold on every route
 *     so that nothing in this prototype can be read as real reporting.
 */

type Theme = 'light' | 'dark'

const THEME_KEY = 'prism.theme'

const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: '今日', end: true },
  { to: '/about', label: '关于' },
]

/** Four one-line principles, drawn verbatim in substance from docs/EDITORIAL_POLICY.md. */

function systemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function storedTheme(): Theme | null {
  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    return raw === 'dark' || raw === 'light' ? raw : null
  } catch {
    return null
  }
}

export default function PublicLayout(): JSX.Element {
  const { state } = usePrism()
  const { pathname } = useLocation()

  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme())
  const [topicsOpen, setTopicsOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const topicsRef = useRef<HTMLLIElement | null>(null)
  const topicsButtonRef = useRef<HTMLButtonElement | null>(null)
  const sheetCloseRef = useRef<HTMLButtonElement | null>(null)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)

  /* --- surface + theme contract on <html> -------------------------------- */
  /* Layout effect: the surface tokens must land before the first paint, or the
     shell flashes with no palette at all on a cold load. */
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.surface = 'public'
    root.dataset.theme = theme
  }, [theme])

  /* Follow the OS while the reader has not made an explicit choice. */
  useEffect(() => {
    if (storedTheme()) return undefined
    if (typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => {
      if (!storedTheme()) setTheme(event.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(THEME_KEY, next)
      } catch {
        /* storage unavailable — the theme still applies for this session */
      }
      return next
    })
  }, [])

  /* --- close every overlay on navigation --------------------------------- */
  useEffect(() => {
    setTopicsOpen(false)
    setSheetOpen(false)
  }, [pathname])

  /* --- Esc closes, focus returns to the control that opened --------------- */
  useEffect(() => {
    if (!topicsOpen && !sheetOpen) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (sheetOpen) {
        setSheetOpen(false)
        menuButtonRef.current?.focus()
      }
      if (topicsOpen) {
        setTopicsOpen(false)
        topicsButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [topicsOpen, sheetOpen])

  /* --- outside click closes the topic popover ---------------------------- */
  useEffect(() => {
    if (!topicsOpen) return undefined
    const onPointer = (event: MouseEvent) => {
      const node = event.target
      if (node instanceof Node && topicsRef.current && !topicsRef.current.contains(node)) {
        setTopicsOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [topicsOpen])

  /* --- the mobile sheet owns the scroll and the focus while it is open ---- */
  useEffect(() => {
    if (!sheetOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheetCloseRef.current?.focus()

    // aria-modal hides the rest of the page from assistive tech; Tab has to be
    // held inside the sheet too, or keyboard focus wanders behind the overlay.
    const onTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !sheetRef.current) return
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ).filter((el) => el.tabIndex !== -1)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !sheetRef.current.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onTab)

    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onTab)
    }
  }, [sheetOpen])

  const dateLine = `${fmtDate(state.today)} · 全球版`

  return (
    <div className="plyt">
      <a className="u-skip" href="#prism-main">跳到正文</a>

      <header className="plyt__masthead">
        <div className="plyt__bar u-shell">
          <div className="plyt__brand">
            <Link to="/" className="plyt__logo" aria-label="PRISM 棱镜 · 返回今日首页">
              <PrismMark size={34} className="plyt__mark" />
              <span className="plyt__word">
                <span className="plyt__word-en">PRISM</span>
                <span className="plyt__word-zh">棱镜</span>
              </span>
            </Link>
            <p className="plyt__dateline u-num">{dateLine}</p>
          </div>

          <nav className="plyt__nav" aria-label="主导航">
            <ul className="plyt__navlist">
              <li>
                <NavLink to="/" end className={({ isActive }) => cx('plyt__navlink', isActive && 'plyt__navlink--on')}>
                  今日
                </NavLink>
              </li>
              <li className="plyt__topicsslot" ref={topicsRef}>
                <button
                  type="button"
                  ref={topicsButtonRef}
                  className={cx('plyt__navlink', 'plyt__navbtn', topicsOpen && 'plyt__navlink--on')}
                  aria-expanded={topicsOpen}
                  aria-haspopup="true"
                  aria-controls="plyt-topic-menu"
                  onClick={() => setTopicsOpen((v) => !v)}
                >
                  议题
                  <Icon name={topicsOpen ? 'chevron-up' : 'chevron-down'} size={13} />
                </button>

                {topicsOpen ? (
                  <div className="plyt__pop" id="plyt-topic-menu">
                    <p className="plyt__pop-head u-eyebrow">八个常设议题</p>
                    <ul className="plyt__pop-list">
                      {TOPICS.map((topic) => (
                        <li key={topic.key}>
                          <Link to={`/topic/${topic.key}`} className="plyt__pop-item">
                            <span className="plyt__pop-swatch" style={{ background: topic.hue }} aria-hidden="true" />
                            <span className="plyt__pop-body">
                              <span className="plyt__pop-zh">{topic.zh}</span>
                              <span className="plyt__pop-en">{topic.en}</span>
                              <span className="plyt__pop-blurb">{topic.blurb}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
              {NAV.slice(1).map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => cx('plyt__navlink', isActive && 'plyt__navlink--on')}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="plyt__actions">
            <button
              type="button"
              className="plyt__theme"
              onClick={toggleTheme}
              aria-pressed={theme === 'dark'}
              aria-label="深色模式"
              title={theme === 'dark' ? '切换到浅色阅读界面' : '切换到深色阅读界面'}
            >
              <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={15} />
              <span className="plyt__theme-label">{theme === 'dark' ? '深色' : '浅色'}</span>
            </button>

            <Link to="/command" className="plyt__console">
              <Icon name="lock" size={13} />
              进入 PRISM Command
            </Link>

            <button
              type="button"
              ref={menuButtonRef}
              className="plyt__hamburger"
              aria-label="打开导航菜单"
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen(true)}
            >
              <Icon name="menu" size={18} />
            </button>
          </div>
        </div>
        <hr className="prism-rule plyt__rule" />
      </header>

      <div className="plyt__demo">
        <div className="u-shell plyt__demo-inner">
          <span className="plyt__demo-flag">演示原型</span>
          <p className="plyt__demo-text">{DEMO_NOTICE}</p>
          <Link to="/about" className="plyt__demo-link">
            这是什么
            <Icon name="arrow-right" size={13} />
          </Link>
        </div>
      </div>

      <main id="prism-main" className="plyt__main">
        <Outlet />
      </main>

      <footer className="plyt__footer">
        <div className="u-shell plyt__footer-inner">
          <div className="plyt__footer-brand">
            <PrismMark size={30} />
            <div>
              <p className="plyt__footer-word">PRISM 棱镜</p>
              <p className="plyt__footer-tag">每日全球女性主义与 LGBTQIA+ 深度报道与研究资料</p>
            </div>
          </div>

          <div className="plyt__cols">
            <section className="plyt__col" aria-labelledby="plyt-col-about">
              <h2 className="plyt__col-title u-eyebrow" id="plyt-col-about">关于</h2>
              <ul className="plyt__col-list">
                <li><Link to="/about">关于 PRISM 与本原型</Link></li>
                <li><Link to="/command">进入 PRISM Command（编辑控制端）</Link></li>
              </ul>
            </section>

            <section className="plyt__col" aria-labelledby="plyt-col-topics">
              <h2 className="plyt__col-title u-eyebrow" id="plyt-col-topics">议题</h2>
              <ul className="plyt__col-list plyt__col-list--topics">
                {TOPICS.map((topic) => (
                  <li key={topic.key}>
                    <Link to={`/topic/${topic.key}`}>
                      <span className="plyt__col-swatch" style={{ background: topic.hue }} aria-hidden="true" />
                      {topic.zh}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

          </div>

          <div className="plyt__notice">
            <p className="plyt__notice-zh">{DEMO_NOTICE}</p>
            <p className="plyt__notice-en">{DEMO_NOTICE_EN}</p>
            <p className="plyt__notice-meta u-mono">
              PRISM 棱镜 · interactive prototype · {state.today} · 演示数据
            </p>
          </div>
        </div>
      </footer>

      {sheetOpen ? (
        <div className="plyt__sheet" role="dialog" aria-modal="true" aria-label="导航菜单" ref={sheetRef}>
          <div className="plyt__sheet-top">
            <span className="plyt__sheet-brand">
              <PrismMark size={26} />
              <span className="plyt__word-en">PRISM</span>
              <span className="plyt__word-zh">棱镜</span>
            </span>
            <button
              type="button"
              ref={sheetCloseRef}
              className="plyt__sheet-close"
              aria-label="关闭导航菜单"
              onClick={() => {
                setSheetOpen(false)
                menuButtonRef.current?.focus()
              }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          <div className="plyt__sheet-body">
            <p className="plyt__sheet-date u-num">{dateLine}</p>

            <nav aria-label="主导航（移动版）">
              <ul className="plyt__sheet-nav">
                {NAV.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => cx('plyt__sheet-link', isActive && 'plyt__sheet-link--on')}
                    >
                      {item.label}
                      <Icon name="chevron-right" size={15} />
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <p className="plyt__sheet-head u-eyebrow">八个常设议题</p>
            <ul className="plyt__sheet-topics">
              {TOPICS.map((topic) => (
                <li key={topic.key}>
                  <Link to={`/topic/${topic.key}`} className="plyt__sheet-topic">
                    <span className="plyt__pop-swatch" style={{ background: topic.hue }} aria-hidden="true" />
                    <span className="plyt__pop-body">
                      <span className="plyt__pop-zh">{topic.zh}</span>
                      <span className="plyt__pop-blurb">{topic.blurb}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <Link to="/command" className="plyt__sheet-console">
              <Icon name="lock" size={14} />
              进入 PRISM Command
            </Link>

            <p className="plyt__sheet-notice">{DEMO_NOTICE}</p>
          </div>
        </div>
      ) : null}

      <ToastHost />
    </div>
  )
}
