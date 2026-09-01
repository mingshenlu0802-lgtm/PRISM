import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { REGIONS } from '../../lib/regions'
import { TOPICS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { cx, fmtDate } from '../../lib/util'
import { takeAuthLinkError } from '../../lib/authlink'
import { Icon, PrismMark, SkipLink, ToastHost, toast } from '../common'
import { AppearanceMenu } from './AppearanceMenu'
import { AccountMenu } from './AccountMenu'
import { SignInGate } from './SignInGate'
import { SignInInvite } from './SignInInvite'
import './SiteLayout.css'

/**
 * 公众站外框。
 *
 * 导航只有四项：今日、地区、议题、研究与数据。地区和议题是下拉的，因为它们
 * 各有十几个——把它们平铺在顶部会把导航挤成一堵墙。
 */
export default function SiteLayout(): JSX.Element {
  const { state, consoleOpen, mode, ready } = usePrism()
  const [menu, setMenu] = useState<'none' | 'region' | 'topic' | 'mobile'>('none')
  const loc = useLocation()

  useEffect(() => { setMenu('none') }, [loc.pathname])

  /*
   * 登录链接本身有问题（过期、用过了）时说一声。
   *
   * 不说的话，一条过期的链接和一条好的链接**看起来一模一样**：都是回到首页、
   * 没登录、没有任何解释——那正是最让人以为「这网站坏了」的失败方式。
   * takeAuthLinkError() 读一次就清，所以只会说一遍。
   */
  useEffect(() => {
    const why = takeAuthLinkError()
    if (why) toast(why, 'warn')
  }, [])

  useEffect(() => {
    if (menu === 'none') return undefined
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu('none') }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menu])

  const liveNews = state.news.filter((n) => n.status === 'live').length

  // 内容谁都能读，不需要登录——有链接就能看。这里只等第一次取数完成，
  // 免得先闪一下空列表再跳出内容。
  if (mode === 'shared' && !ready) return <SignInGate />

  return (
    <div className="slyt">
      <SkipLink to="main" />

      <header className="slyt__bar">
        <div className="u-shell slyt__barin">
          <Link className="slyt__brand" to="/">
            <PrismMark size={26} />
            <span className="slyt__word">{state.copy.title}</span>
          </Link>

          <span className="slyt__date">{fmtDate(state.today)}</span>

          <nav className="slyt__nav" aria-label="主导航">
            <NavLink className={({ isActive }) => cx('slyt__link', isActive && 'slyt__link--on')} to="/" end>今日</NavLink>

            <div className="slyt__drop">
              <button
                type="button"
                className={cx('slyt__link', 'slyt__dropbtn', menu === 'region' && 'slyt__link--on')}
                aria-expanded={menu === 'region'}
                onClick={() => setMenu((m) => (m === 'region' ? 'none' : 'region'))}
              >
                地区 <Icon name="chevron-down" size={13} />
              </button>
              {menu === 'region' && (
                <div className="slyt__panel slyt__panel--region" role="menu">
                  {/* 读者要的是「有哪些地区」，不是网站内部怎么排搜集顺序。 */}
                  <div className="slyt__panelgrid">
                    {REGIONS.map((r) => (
                      <Link key={r.key} className="slyt__panelitem" to={`/region/${r.key}`} role="menuitem">
                        <span className="slyt__paneldot" style={{ background: r.hue }} aria-hidden="true" />
                        {r.zh}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="slyt__drop">
              <button
                type="button"
                className={cx('slyt__link', 'slyt__dropbtn', menu === 'topic' && 'slyt__link--on')}
                aria-expanded={menu === 'topic'}
                onClick={() => setMenu((m) => (m === 'topic' ? 'none' : 'topic'))}
              >
                议题 <Icon name="chevron-down" size={13} />
              </button>
              {menu === 'topic' && (
                <div className="slyt__panel" role="menu">
                  <div className="slyt__panelgrid slyt__panelgrid--wide">
                    {TOPICS.map((t) => (
                      <Link key={t.key} className="slyt__panelitem" to={`/topic/${t.key}`} role="menuitem">
                        <span className="slyt__panelgem" style={{ background: t.hue }} aria-hidden="true" />
                        <span>
                          <span className="slyt__panelname">{t.zh}</span>
                          <span className="slyt__panelblurb">{t.blurb}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <NavLink className={({ isActive }) => cx('slyt__link', isActive && 'slyt__link--on')} to="/studies">研究与数据</NavLink>
            <NavLink className={({ isActive }) => cx('slyt__link', isActive && 'slyt__link--on')} to="/about">关于</NavLink>
          </nav>

          <div className="slyt__tools">
            <AppearanceMenu />
            <AccountMenu />
            <button
              type="button"
              className="slyt__burger"
              aria-label="打开菜单"
              aria-expanded={menu === 'mobile'}
              onClick={() => setMenu((m) => (m === 'mobile' ? 'none' : 'mobile'))}
            >
              <Icon name={menu === 'mobile' ? 'x' : 'menu'} size={20} />
            </button>
          </div>
        </div>
        <hr className="prism-rule" />
      </header>

      {menu === 'mobile' && (
        <div className="slyt__sheet">
          <div className="u-shell slyt__sheetin">
            <p className="slyt__sheethead">地区</p>
            <div className="slyt__sheetgrid">
              {REGIONS.map((r) => (
                <Link key={r.key} className="slyt__sheetitem" to={`/region/${r.key}`}>
                  <span className="slyt__paneldot" style={{ background: r.hue }} aria-hidden="true" />{r.zh}
                </Link>
              ))}
            </div>
            <p className="slyt__sheethead">议题</p>
            <div className="slyt__sheetgrid">
              {TOPICS.map((t) => (
                <Link key={t.key} className="slyt__sheetitem" to={`/topic/${t.key}`}>
                  <span className="slyt__panelgem" style={{ background: t.hue }} aria-hidden="true" />{t.short}
                </Link>
              ))}
            </div>
            <p className="slyt__sheethead">其他</p>
            <div className="slyt__sheetgrid">
              <Link className="slyt__sheetitem" to="/studies">研究与数据</Link>
              <Link className="slyt__sheetitem" to="/about">关于</Link>
              {consoleOpen && <Link className="slyt__sheetitem" to="/console">控制端</Link>}
            </div>
          </div>
        </div>
      )}

      <SignInInvite />

      {state.publicOffline && (
        <div className="slyt__offline" role="status">
          <Icon name="alert" size={15} />
          <span>公众站当前处于「暂停对外显示」状态，只有你能看到内容。</span>
        </div>
      )}

      {/*
        * 这里原本有一条「演示数据」横幅，还有「关于」页上配套的一整节说明。
        * 站长要求两个都去掉，理由很实在：他的站已经接上真实数据库了，
        * 那条横幅只在还混着演示种子时才出现，对他就是一句多余的警告。
        *
        * 去掉不会让假链接冒充真链接——演示链接用的是保留域名 .invalid，
        * isPlaceholderUrl() 认得它，页面上照旧渲染成不可点击的「示例」。
        * 挡住误导的是那一层，不是这条横幅。
        */}

      <main id="main" className="slyt__main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="slyt__foot">
        <div className="u-shell slyt__footin">
          <div className="slyt__footbrand">
            <PrismMark size={24} />
            {/*
              * 页脚只留站名。站长说标语「在任何地方都不需要强调」，
              * 页脚也是「任何地方」。
              */}
            <p className="slyt__footword">{state.copy.title}</p>
          </div>
          <p className="slyt__footnote">{state.copy.footerNote}</p>
          <p className="slyt__footmeta">
            当前公开 {liveNews} 条新闻 · {state.studies.filter((s) => s.status === 'live').length} 项研究与数据
          </p>
          {mode === 'shared' && !state.auth.email && (
            <p className="slyt__footsign">
              看内容不用登录。想收到更新通知，或者需要编辑权限，
              <Link className="slyt__footlink" to="/signin">用邮箱登录一次</Link>
              （不用设密码）。
            </p>
          )}
        </div>
      </footer>

      <ToastHost />
    </div>
  )
}
