import { NavLink, Link, Outlet } from 'react-router-dom'
import { OWNER_EMAIL } from '../../lib/types'
import { usePrism } from '../../lib/store'
import { cx, fmtDate } from '../../lib/util'
import { Icon, PrismMark, ToastHost } from '../common'
import { AppearanceMenu } from '../site/AppearanceMenu'
import './ConsoleLayout.css'

/**
 * 控制端外框。
 *
 * 只有两个页面，因为两个页面就够了：一个用来「让它去找」，一个用来「改我看到的」。
 * 顶部永远显示当前身份和一句话说明你现在能做什么——不需要记住权限规则。
 */
export default function ConsoleLayout(): JSX.Element {
  const { state, isAdmin, isOwner } = usePrism()
  const email = state.auth.email

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
              <span>改网站</span>
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
                  ? '你拥有全部权限：搜集、修改、删除、加管理员。'
                  : isAdmin
                    ? '你可以搜集与修改内容，但不能增删管理员。'
                    : '这个账号不在管理员名单里，只能查看。'}
              </span>
            </>
          ) : (
            <>
              <Icon name="users" size={15} />
              <span className="clyt__hint">
                当前未登录。在「改网站 → 账号」里用 Google 登录后才能保存改动；
                站长账号是 <strong>{OWNER_EMAIL}</strong>。
              </span>
            </>
          )}
        </div>
      </div>

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
