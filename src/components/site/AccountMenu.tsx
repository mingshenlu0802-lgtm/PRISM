import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrism } from '../../lib/store'
import { cx } from '../../lib/util'
import { signOut } from '../../lib/session'
import { Icon, toast } from '../common'
import './AccountMenu.css'

/**
 * 账号入口。
 *
 * 本地模式下不显示账号——内容只存在这台浏览器里，没有第二个人，也就没有
 * 账号这回事，摆一个「登录」按钮只会让人以为自己漏了什么。那时直接给
 * 控制端入口就好。
 *
 * 共享模式下显示当前登录的人和他的身份。能进控制端的（站长和编辑）才看得到
 * 入口；只能看的人不会看到一个按了会被拒绝的按钮。
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

  if (!auth.email) return null

  const role = isOwner ? '站长' : isAdmin ? '编辑' : '只能看'

  return (
    <div className="acct" ref={ref}>
      <button
        type="button"
        className="acct__btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`账号：${auth.email}`}
        onClick={() => setOpen((v) => !v)}
      >
        {auth.picture
          ? <img className="acct__avatar" src={auth.picture} alt="" width={20} height={20} />
          : <Icon name="users" size={15} />}
        <span className="acct__label">{auth.name ?? auth.email}</span>
      </button>

      {open && (
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
