import { useEffect, useRef } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import { usePrism } from '../../lib/store'
import { cx, fmtDate } from '../../lib/util'
import { googleSignOut, renderGoogleButton } from '../../lib/google'
import { isOwnerEmail } from '../../lib/owner'
import { Icon, PrismMark, ToastHost, toast } from '../common'
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
  const { state, isAdmin, isOwner, consoleOpen, consoleUnlocked } = usePrism()
  const email = state.auth.email

  if (!consoleOpen) return <Gate />

  return (
    <div className="clyt">
      <a className="u-skip" href="#cmain">跳到正文</a>

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
                {isOwner ? '站长' : isAdmin ? '管理员' : '未授权'}
              </span>
              <span className="clyt__hint">
                {isOwner
                  ? '你拥有全部权限：搜集、编辑、删除、加管理员。'
                  : isAdmin
                    ? '你可以搜集与编辑内容，但不能增删管理员。'
                    : '这个账号不在管理员名单里，只能查看。'}
              </span>
            </>
          ) : (
            <>
              <Icon name="users" size={15} />
              <span className="clyt__hint">
                当前未登录。在「编辑 → 账号」里用 Google 登录后才能保存编辑。
              </span>
            </>
          )}
        </div>
      </div>

      {consoleUnlocked && (
        <div className="clyt__unlocked" role="status">
          <Icon name="unlock" size={15} />
          <span>
            还没接上 Google 登录，所以控制端现在对所有人开着。
            在「编辑 → 账号与同步」里填好客户端 ID 之后，这里就只有站长和管理员进得来。
          </span>
        </div>
      )}

      {state.publicOffline && (
        <div className="clyt__offline" role="status">
          <Icon name="alert" size={15} />
          <span>公众站正处于「暂停对外显示」。别人打开网站会看到空白提示，只有你能看到内容。</span>
        </div>
      )}

      <main id="cmain" className="clyt__main" data-scroll-root>
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
 * 没登录、或者登录的账号不在管理员名单里，就停在这里。说清楚三件事：
 * 这地方是干什么的、你现在是谁、下一步该找谁——而不是把一个按不动的控制端
 * 摆在人面前。
 */
function Gate(): JSX.Element {
  const { state, dispatch } = usePrism()
  const auth = state.auth
  const btnRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (auth.email || !auth.clientId || !btnRef.current) return
    void renderGoogleButton({
      clientId: auth.clientId,
      target: btnRef.current,
      onSignIn: (p) => {
        void isOwnerEmail(p.email).then((owner) => {
          dispatch({ type: 'signin', email: p.email, name: p.name, picture: p.picture, isOwner: owner })
          toast(`已登录：${p.email}`, 'go')
        })
      },
      onError: (m) => toast(m, 'warn'),
    })
  }, [auth.email, auth.clientId, dispatch])

  return (
    <div className="cgate">
      <main className="cgate__box">
        <PrismMark size={40} />
        <h1 className="cgate__title">控制端</h1>

        {auth.email ? (
          <>
            <p className="cgate__lede">
              你现在登录的是 <strong>{auth.email}</strong>，这个账号不在管理员名单里。
            </p>
            <p className="cgate__note">
              网站内容随便看，不需要登录。要编辑内容，得请站长把你的 Gmail
              加进管理员名单。
            </p>
            <div className="cgate__acts">
              <Link className="cgate__back" to="/">回到网站</Link>
              <button
                type="button"
                className="cgate__out"
                onClick={() => { googleSignOut(); dispatch({ type: 'signout' }); toast('已退出登录。', 'info') }}
              >
                换一个账号
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="cgate__lede">这里是站长和管理员编辑网站的地方。</p>
            {auth.clientId ? (
              <div ref={btnRef} className="cgate__gbtn" />
            ) : (
              <p className="cgate__note">
                网站还没接上 Google 登录，所以这里暂时进不去。
                站长需要先申请一个 Google 客户端 ID——步骤写在控制端的「编辑 → 账号与同步」里。
              </p>
            )}
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
