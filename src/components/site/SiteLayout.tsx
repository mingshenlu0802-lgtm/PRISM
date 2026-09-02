import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { REGIONS } from '../../lib/regions'
import { TOPICS, STUDY_KIND } from '../../lib/constants'

/** 可信度分档的颜色，跟研究卡片上的徽章同一套。 */
const KIND_HUE: Record<string, string> = {
  go: 'var(--go)', info: 'var(--info)', warn: 'var(--warn)', neutral: 'var(--fg-faint)',
}
import { usePrism } from '../../lib/store'
import { cx, fmtDate } from '../../lib/util'
import { takeAuthLinkError } from '../../lib/authlink'
import { Icon, PrismMark, SkipLink, ToastHost, toast } from '../common'
import { AppearanceMenu } from './AppearanceMenu'
import { ScriptToggle } from './ScriptToggle'
import { AccountMenu } from './AccountMenu'
import { LoadFailed, Paused, SignInGate } from './SignInGate'
import { SignInInvite } from './SignInInvite'
import './SiteLayout.css'

/**
 * 公众站外框。
 *
 * 导航只有四项：今日、地区、议题、研究与数据。地区和议题是下拉的，因为它们
 * 各有十几个——把它们平铺在顶部会把导航挤成一堵墙。
 */
export default function SiteLayout(): JSX.Element {
  const { state, consoleOpen, mode, ready, syncError, refresh, canEdit } = usePrism()
  const [menu, setMenu] = useState<'none' | 'region' | 'topic' | 'kind' | 'mobile'>('none')
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

  /*
   * 内容谁都能读，不需要登录——有链接就能看。这里只等「第一次取数完成」，
   * 免得先闪一下空列表再跳出内容。
   *
   * 条件里**不能**带 `mode === 'shared'`。mode 的初值是 'local'，而它要等
   * 读完 prism-config.json 才知道到底是哪一种；带上这个条件，那段空档里
   * 门是开着的，读者会看到一整屏演示数据——十二条虚构的判决和机构，
   * 排版和真新闻一模一样。虽然只有两三百毫秒，但那正是别人点开链接
   * 看到的第一眼，而且截图下来是假的。
   *
   * 本地模式下 ready 也很快：getClient() 认出没有配置就立刻置位，
   * 代价是一瞬间的「正在打开…」——比一瞬间的假新闻便宜得多。
   */
  if (!ready) return <SignInGate />

  /*
   * 取数失败、而且一条内容都没有——那就明说，别装作今天没有新闻。
   *
   * `ready` 在 finally 里置位，成功失败都会放行渲染。于是读不到数据库的时候，
   * 读者拿到的是一张排版完好的首页，上面写着「今日 0 条报道」。
   * 这句话读起来完全正常，也完全是假的：内容好好地在库里，只是这台设备
   * 现在够不着。对一份日报来说，这是最坏的一种坏法——它不像坏了。
   *
   * 手里还有上一次的内容就不拦（陈旧胜过空白）；一条都没有才顶上来。
   */
  const nothing = state.news.length === 0 && state.studies.length === 0
  if (mode === 'shared' && syncError && nothing) return <LoadFailed onRetry={refresh} />

  /*
   * 「暂停对外显示」得真的暂停。
   *
   * 这里原来只有下面那条横幅——横幅底下，全部内容照旧给所有人看。而控制端上
   * 写的是「现在别人打开网站看不到内容」。一个说话不算数的紧急开关比没有更糟：
   * 站长以为关掉了，于是不再做别的处置，内容其实一条没少地挂在公网上。
   *
   * 编辑不受影响——他们要能看着内容决定什么时候恢复，横幅照旧提醒着状态。
   */
  if (state.publicOffline && !canEdit) return <Paused />

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

            {/*
              * 研究与数据也给一个下拉。
              *
              * 站长：「研究与数据也要有各类分类。」它一直有筛选，但那些筛选
              * 在页面里、要滚下去才看得到；导航上它是一个光秃秃的链接，
              * 旁边两个都能展开——读者自然会以为这一栏没有分类。
              *
              * 分的是**类型**，不是议题：一份同行评审的论文和一份倡议机构的
              * 报告，可信的程度不一样，而这正是这一页存在的理由。
              */}
            <div className="slyt__drop">
              <button
                type="button"
                className={cx('slyt__link', 'slyt__dropbtn', menu === 'kind' && 'slyt__link--on')}
                aria-expanded={menu === 'kind'}
                onClick={() => setMenu((m) => (m === 'kind' ? 'none' : 'kind'))}
              >
                研究与数据 <Icon name="chevron-down" size={13} />
              </button>
              {menu === 'kind' && (
                <div className="slyt__panel" role="menu">
                  <div className="slyt__panelgrid slyt__panelgrid--wide">
                    <Link className="slyt__panelitem" to="/studies" role="menuitem">
                      <span className="slyt__panelgem" style={{ background: 'var(--fg-faint)' }} aria-hidden="true" />
                      <span>
                        <span className="slyt__panelname">全部</span>
                        <span className="slyt__panelblurb">所有研究、统计与数据集。</span>
                      </span>
                    </Link>
                    {(Object.keys(STUDY_KIND) as (keyof typeof STUDY_KIND)[]).map((k) => (
                      <Link key={k} className="slyt__panelitem" to={`/studies/${k}`} role="menuitem">
                        <span className="slyt__panelgem" style={{ background: KIND_HUE[STUDY_KIND[k].tone] }} aria-hidden="true" />
                        <span>
                          <span className="slyt__panelname">{STUDY_KIND[k].zh}</span>
                          <span className="slyt__panelblurb">{STUDY_KIND[k].note}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <NavLink className={({ isActive }) => cx('slyt__link', isActive && 'slyt__link--on')} to="/about">关于</NavLink>
          </nav>

          <div className="slyt__tools">
            {/* 站长要「一键繁简转换」，所以它在顶栏上，不在设置菜单里面。 */}
            <ScriptToggle />
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
