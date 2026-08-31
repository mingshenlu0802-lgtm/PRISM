import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { OWNER_EMAIL } from '../../lib/types'
import { usePrism } from '../../lib/store'
import { cx } from '../../lib/util'
import { googleSignOut, renderGoogleButton } from '../../lib/google'
import { Icon, toast } from '../common'
import './AccountMenu.css'

/**
 * 公众站的账号入口。
 *
 * 任何人都可以用 Google 账号登录——登录本身不解锁任何东西，它只是让网站知道
 * 你是谁。控制端的入口只对站长和管理员出现；别的账号看到的就是一个普通的
 * 已登录状态，不会有一个按了会被拒绝的按钮在那里晃。
 */
export function AccountMenu(): JSX.Element {
  const { state, dispatch, isAdmin, isOwner, consoleOpen } = usePrism()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLDivElement | null>(null)
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

  // Google 的按钮由它自己的脚本画进这个容器，所以要等面板真的展开之后再挂。
  useEffect(() => {
    if (!open || auth.email || !auth.clientId || !btnRef.current) return
    void renderGoogleButton({
      clientId: auth.clientId,
      target: btnRef.current,
      onSignIn: (p) => {
        dispatch({ type: 'signin', email: p.email, name: p.name, picture: p.picture })
        setOpen(false)
        toast(`已登录：${p.email}`, 'go')
      },
      onError: (m) => toast(m, 'warn'),
    })
  }, [open, auth.email, auth.clientId, dispatch])

  const signedIn = Boolean(auth.email)
  const label = signedIn ? (auth.name ?? auth.email ?? '') : '登录'

  return (
    <div className="acct" ref={ref}>
      <button
        type="button"
        className="acct__btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={signedIn ? `账号：${auth.email}` : '用 Google 账号登录'}
        onClick={() => setOpen((v) => !v)}
      >
        {signedIn && auth.picture
          ? <img className="acct__avatar" src={auth.picture} alt="" width={20} height={20} />
          : <Icon name="users" size={15} />}
        <span className="acct__label">{label}</span>
      </button>

      {open && (
        <div className="acct__panel" role="dialog" aria-label="账号">
          {signedIn ? (
            <>
              <div className="acct__me">
                {auth.picture
                  ? <img className="acct__meavatar" src={auth.picture} alt="" width={36} height={36} />
                  : <span className="acct__meavatar acct__meavatar--blank" aria-hidden="true" />}
                <div className="acct__meinfo">
                  <p className="acct__mename">{auth.name ?? auth.email}</p>
                  <p className="acct__memail">{auth.email}</p>
                </div>
              </div>

              {isAdmin && (
                <p className={cx('acct__role', isOwner && 'acct__role--owner')}>
                  {isOwner ? '站长' : '管理员'}
                </p>
              )}
              {consoleOpen && (
                <Link className="acct__console" to="/console" onClick={() => setOpen(false)}>
                  <Icon name="lock" size={14} />进入控制端
                </Link>
              )}

              <button
                type="button"
                className="acct__out"
                onClick={() => {
                  googleSignOut()
                  dispatch({ type: 'signout' })
                  setOpen(false)
                  toast('已退出登录。', 'info')
                }}
              >
                退出登录
              </button>
            </>
          ) : (
            <>
              <p className="acct__lede">用 Google 账号登录。</p>
              {auth.clientId ? (
                <div ref={btnRef} className="acct__gbtn" />
              ) : (
                <p className="acct__note">
                  网站还没接上 Google 登录。站长在控制端「编辑 → 账号与同步」里填好
                  客户端 ID 之后，这里就会出现登录按钮。
                </p>
              )}
              {consoleOpen && (
                <Link className="acct__console" to="/console" onClick={() => setOpen(false)}>
                  <Icon name="lock" size={14} />进入控制端
                </Link>
              )}
              <p className="acct__note acct__note--small">
                站长账号是 {OWNER_EMAIL}。
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
