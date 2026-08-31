import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrism } from '../../lib/store'
import { cx } from '../../lib/util'
import { signOut } from '../../lib/session'
import { Icon, toast } from '../common'
import { SignInPanel } from './SignInGate'
import './AccountMenu.css'

/**
 * 账号入口。
 *
 * 本地模式下不显示账号——内容只存在这台浏览器里，没有第二个人，也就没有
 * 账号这回事，摆一个「登录」按钮只会让人以为自己漏了什么。那时直接给
 * 控制端入口就好。
 *
 * 共享模式下：没登录的人看到一个「登录」——但看内容本来就不需要登录，
 * 所以面板里第一句话就说清楚这件事，免得有人以为自己被挡住了。
 * 登录之后显示身份；能进控制端的（站长和编辑）才看得到入口。
 *
 * **没登录时这个按钮是实心的、带信封图标、手机上也保留文字。**
 * 站长的原话：「请把登陆功能做得更加 obvious，这个是给我的朋友的。」
 * 朋友不是天天用这个网站的人，一个跟别的图标长得一样的小圆按钮，他找不到。
 * 登录之后就恢复成安静的样式——那时它只是个账号菜单，不该再抢注意力。
 */
export function AccountMenu(): JSX.Element | null {
  const { state, dispatch, isOwner, isAdmin, mode } = usePrism()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const auth = state.auth

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

  if (mode === 'local') {
    return (
      <Link className="acct__bare" to="/console">
        <Icon name="lock" size={13} />
        <span className="acct__label">控制端</span>
      </Link>
    )
  }

  const signedIn = Boolean(auth.email)
  const role = isOwner ? '站长' : isAdmin ? '编辑' : '已登录'

  return (
    <div className="acct" ref={ref}>
      <button
        type="button"
        className={cx('acct__btn', !signedIn && 'acct__btn--in')}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={signedIn ? `账号：${auth.email}` : '用邮箱登录'}
        onClick={() => setOpen((v) => !v)}
      >
        {signedIn
          ? (auth.picture
              ? <img className="acct__avatar" src={auth.picture} alt="" width={20} height={20} />
              : <Icon name="users" size={15} />)
          : <Icon name="mail" size={15} />}
        <span className={cx('acct__label', !signedIn && 'acct__label--always')}>
          {signedIn ? (auth.name ?? auth.email) : '登录'}
        </span>
      </button>

      {open && !signedIn && (
        <div className="acct__panel acct__panel--wide" role="dialog" aria-label="登录">
          <SignInPanel onDone={() => undefined} />
        </div>
      )}

      {open && signedIn && (
        <div className="acct__panel" role="dialog" aria-label="账号">
          <div className="acct__me">
            {auth.picture
              ? <img className="acct__meavatar" src={auth.picture} alt="" width={36} height={36} />
              : <span className="acct__meavatar acct__meavatar--blank" aria-hidden="true" />}
            <div className="acct__meinfo">
              <p className="acct__mename">{auth.name ?? auth.email}</p>
              <p className="acct__memail">{auth.email}</p>
            </div>
          </div>

          <p className={cx('acct__role', isOwner && 'acct__role--owner')}>{role}</p>

          {isAdmin && (
            <Link className="acct__console" to="/console" onClick={() => setOpen(false)}>
              <Icon name="lock" size={14} />进入控制端
            </Link>
          )}

          <button
            type="button"
            className="acct__out"
            onClick={() => {
              void signOut().then(() => {
                dispatch({ type: 'signout' })
                toast('已退出登录。', 'info')
                window.location.reload()
              })
            }}
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}
