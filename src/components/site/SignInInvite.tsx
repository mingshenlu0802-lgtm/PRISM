import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrism } from '../../lib/store'
import { Icon } from '../common'
import './SignInInvite.css'

/**
 * 「想收到更新吗」——给朋友看的一条。
 *
 * 站长的话：「请把登陆功能做得更加 obvious，这个是给我的朋友的。」
 *
 * 朋友不是天天用这个网站的人。右上角一个按钮，他不会注意到，更不会去想
 * 「我要不要登录」。所以这里明说一次，而且**第一句必须是「看内容不用登录」**——
 * 一条在页面顶上的登录条，最容易被读成「你被挡住了，先登录」，
 * 那正好是这个网站要避免的误会。
 *
 * 三条自我约束：
 * - 只在**共享模式**下出现。本地模式根本没有账号这回事。
 * - 只对**没登录**的人出现。登录过的人不需要再被邀请一次。
 * - **能关掉，而且记住。** 一条关不掉的横幅，第二次看到就是骚扰。
 */

const HIDE_KEY = 'prism.invite.off.v1'

export function SignInInvite(): JSX.Element | null {
  const { state, mode } = usePrism()
  const [gone, setGone] = useState(() => {
    try { return window.localStorage.getItem(HIDE_KEY) === '1' } catch { return false }
  })

  if (mode !== 'shared' || state.auth.email || gone) return null

  const dismiss = () => {
    try { window.localStorage.setItem(HIDE_KEY, '1') } catch { /* 存不下就这次不再显示 */ }
    setGone(true)
  }

  return (
    <aside className="invite" aria-label="登录说明">
      <div className="u-shell invite__in">
        <Icon name="mail" size={16} />
        <p className="invite__text">
          <strong>看内容不用登录</strong>，你现在看到的就是全部。
          想在有新内容时收到通知，或者站长要给你<strong>编辑</strong>权限，
          才需要用邮箱登录一次——<strong>不用设密码</strong>，收一封信点一下链接就好。
        </p>
        <Link className="invite__go" to="/signin">
          <Icon name="arrow-right" size={14} />用邮箱登录
        </Link>
        <button type="button" className="invite__x" aria-label="不再显示这条" onClick={dismiss}>
          <Icon name="x" size={15} />
        </button>
      </div>
    </aside>
  )
}
