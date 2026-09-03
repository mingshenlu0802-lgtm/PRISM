import { Link, NavLink, Outlet } from 'react-router-dom'
import { usePrism } from '../../lib/store'
import { cx, fmtDate } from '../../lib/util'
import { signOut } from '../../lib/session'
import { Icon, PrismMark, SkipLink, ToastHost } from '../common'
import { AppearanceMenu } from '../site/AppearanceMenu'
import './ConsoleLayout.css'

/**
 * 控制端外框。
 *
 * 只有两个页面，因为两个页面就够了：一个用来「让它去找」，一个用来「编辑我看到的」。
 * 顶部永远显示当前身份和一句话说明你现在能做什么——不需要记住权限规则。
 *
 * 不是管理员的人到这里看到的是一扇门，不是一个处处按不动的控制端。
 */
export default function ConsoleLayout(): JSX.Element {
  const { state, isAdmin, isOwner, consoleOpen, syncError, ready } = usePrism()
  const email = state.auth.email

  /*
   * 还没弄清是本地还是共享之前，不给任何人开门。
   *
   * mode 的初值是 'local'，而本地模式里「谁打开谁就是站长」——于是共享模式
   * 认出来之前的那两三百毫秒，任何一个直接打开 #/console 的人都会看到
   * 一个完整的控制端，连站长的改动记录和成员名单一起。写是写不进去的
   * （RLS 挡着），但那一眼本来就不该有。
   */
  if (!ready) return <p className="clyt__wait">正在打开控制端…</p>

  if (!consoleOpen) return <Gate />

  return (
    <div className="clyt">
      <SkipLink to="cmain" />

      <header className="clyt__bar">
        <div className="u-shell-wide clyt__barin">
          <Link className="clyt__brand" to="/console">
            <PrismMark size={24} />
            <span className="clyt__word">控制端</span>
          </Link>
          <span className="clyt__date">{fmtDate(state.today)}</span>

          <nav className="clyt__nav" aria-label="控制端导航">
            <NavLink end to="/console" className={({ isActive }) => cx('clyt__tab', isActive && 'clyt__tab--on')}>
              <Icon name="search" size={15} />
              <span>找新闻</span>
            </NavLink>
            <NavLink to="/console/manage" className={({ isActive }) => cx('clyt__tab', isActive && 'clyt__tab--on')}>
              <Icon name="edit" size={15} />
              <span>编辑</span>
            </NavLink>
          </nav>

          <div className="clyt__tools">
            <AppearanceMenu compact />
            <Link className="clyt__view" to="/"><Icon name="eye" size={14} /><span>看公众站</span></Link>
          </div>
        </div>
      </header>

      <div className={cx('clyt__who', !isAdmin && 'clyt__who--out')}>
        <div className="u-shell-wide clyt__whoin">
          {email ? (
            <>
              {state.auth.picture
                ? <img className="clyt__avatar" src={state.auth.picture} alt="" width={22} height={22} />
                : <span className="clyt__avatar clyt__avatar--blank" aria-hidden="true" />}
              <span className="clyt__email">{email}</span>
              <span className={cx('clyt__role', isOwner && 'clyt__role--owner')}>
                {isOwner ? '站长' : isAdmin ? '编辑' : '只能看'}
              </span>
              <span className="clyt__hint">
                {isOwner
                  ? '你拥有全部权限：搜集、编辑、删除、增删成员。'
                  : '你可以搜集与编辑内容，但不能增删成员。'}
              </span>
            </>
          ) : (
            <>
              <Icon name="users" size={15} />
              {/*
                * 本地模式只说一次。
                *
                * 这句话原来在页面上出现两遍：这里一条，下面还有一条黄色横幅，
                * 内容几乎一样。两条一模一样的提示叠在一起，读者第一反应是
                * 「是不是出错了」，第二反应是两条都不看。所以合成一条，
                * 把下面那条里真正多出来的信息（别人看不到）搬进来。
                */}
              <span className="clyt__hint">
                <strong>本地模式</strong>：内容只存在这台浏览器里，不需要登录，别人也看不到。
                想让朋友看到同一份，去「编辑 → 账号与同步」。
              </span>
            </>
          )}
        </div>
      </div>

      {syncError && (
        <div className="clyt__syncerr" role="alert">
          <Icon name="alert" size={15} />
          <span>{syncError}</span>
        </div>
      )}

      {state.publicOffline && (
        <div className="clyt__offline" role="status">
          <Icon name="alert" size={15} />
          <span>公众站正处于「暂停对外显示」。别人打开网站会看到一页「暂停更新」，只有登录的编辑还看得到内容。</span>
        </div>
      )}

      <main id="cmain" tabIndex={-1} className="clyt__main" data-scroll-root>
        <div className="u-shell-wide clyt__mainin">
          <Outlet />
        </div>
      </main>

      <ToastHost />
    </div>
  )
}

/**
 * 门口。
 *
 * 只有共享模式才会走到这里——本地模式下这台浏览器就是你自己的，没有门。
 * 停在这里的人已经登录了，只是身份不够。说清楚他是谁、该找谁，
 * 而不是把一个处处按不动的控制端摆在他面前。
 */
function Gate(): JSX.Element {
  const { state, dispatch } = usePrism()
  const email = state.auth.email

  return (
    <div className="cgate">
      <main className="cgate__box">
        <PrismMark size={40} />
        <h1 className="cgate__title">控制端</h1>

        {email ? (
          <>
            <p className="cgate__lede">
              你现在登录的是 <strong>{email}</strong>，这个账号只能看内容。
            </p>
            <p className="cgate__note">
              控制端是站长和编辑用的。想要编辑权限，跟站长说一声，
              他在名单里把你从「只能看」改成「编辑」就行，你刷新一下就能进。
            </p>
            <div className="cgate__acts">
              <Link className="cgate__back" to="/">回到网站</Link>
              <button
                type="button"
                className="cgate__out"
                onClick={() => {
                  void signOut().then(() => {
                    dispatch({ type: 'signout' })
                    window.location.reload()
                  })
                }}
              >
                换一个账号
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="cgate__lede">这里是站长和编辑用的地方。</p>
            <p className="cgate__note">先回到网站首页登录，再回来。</p>
            <div className="cgate__acts">
              <Link className="cgate__back" to="/">回到网站</Link>
            </div>
          </>
        )}
      </main>
      <ToastHost />
    </div>
  )
}
