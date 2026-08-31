import { useState } from 'react'
import { usePrism } from '../../lib/store'
import { sendLink, signOut } from '../../lib/session'
import { PrismMark, TextInput, ToastHost, toast } from '../common'
import './SignInGate.css'

/**
 * 门口。
 *
 * 这个网站不对外公开，只给站长请进来的人看。所以没登录、或者登录的账号
 * 不在名单上的人，停在这里。
 *
 * 分两种情况说，因为该做的事完全不同：
 * - 没登录 → 给一个输入框，输邮箱，收信，点链接。
 * - 登录了但不在名单上 → 告诉他你是谁、以及要找站长，别让他反复试。
 *
 * 这里的拦截是给人看的。真正拦住数据的是数据库那边的规则：就算有人绕过
 * 这个界面，他也一条内容都读不到。
 */
export function SignInGate(): JSX.Element {
  const { state, isMember, ready } = usePrism()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState('')
  const signedIn = Boolean(state.auth.email)

  if (!ready) {
    return (
      <div className="gate">
        <p className="gate__loading">正在打开…</p>
      </div>
    )
  }

  async function send() {
    if (sending) return
    setSending(true)
    const r = await sendLink(email)
    setSending(false)
    if (r.ok) setSent(r.message)
    else toast(r.message, 'warn')
  }

  return (
    <div className="gate">
      <main className="gate__box">
        <PrismMark size={44} />
        <h1 className="gate__title">{state.copy.title}</h1>

        {signedIn && !isMember ? (
          <>
            <p className="gate__lede">
              你现在登录的是 <strong>{state.auth.email}</strong>，这个账号还不在名单里。
            </p>
            <p className="gate__note">
              这是一个不对外公开的站点，只有站长请进来的人能看。
              如果你觉得应该有你，直接找站长，把这个邮箱地址给他就行——他加一下，你刷新就能进。
            </p>
            <button
              type="button"
              className="gate__ghost"
              onClick={() => { void signOut().then(() => window.location.reload()) }}
            >
              换一个邮箱试试
            </button>
          </>
        ) : sent ? (
          <>
            <p className="gate__lede">信已经发出去了。</p>
            <p className="gate__note">{sent}</p>
            <p className="gate__note gate__note--small">
              没收到？先看看垃圾邮件。还是没有的话，
              <button type="button" className="gate__link" onClick={() => setSent('')}>换个地址再试一次</button>。
            </p>
          </>
        ) : (
          <>
            <p className="gate__lede">这是一个只给朋友看的站点。</p>
            <p className="gate__note">
              输入你的邮箱，我们发一封信给你，点里面的链接就进来了。
              <strong>不用设密码。</strong>
            </p>
            <div className="gate__row">
              <TextInput
                type="email"
                placeholder="你的邮箱"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void send() }}
              />
              <button
                type="button"
                className="gate__go"
                onClick={() => void send()}
                disabled={sending || !email.trim()}
              >
                {sending ? '发送中…' : '发登录链接'}
              </button>
            </div>
            <p className="gate__note gate__note--small">
              邮箱只用来登录和给你发站点通知。站长看得到成员名单，别人看不到。
            </p>
          </>
        )}
      </main>
      {/* 门口是单独渲染的，不挂这个的话「发送失败」会石沉大海。 */}
      <ToastHost />
    </div>
  )
}
