import { useState } from 'react'
import { usePrism } from '../../lib/store'
import { sendLink } from '../../lib/session'
import { PrismMark, TextInput, ToastHost, toast } from '../common'
import './SignInGate.css'

/**
 * 首次加载时的占位。
 *
 * 内容不需要登录就能看——有链接就能读，这是站长要的。所以这里不是一道门，
 * 只是在第一次从数据库取数的那一两秒里，给屏幕一个东西看，
 * 免得先闪一下空列表再跳出内容。
 */
export function SignInGate(): JSX.Element {
  return (
    <div className="gate">
      <p className="gate__loading">正在打开…</p>
    </div>
  )
}

/**
 * 登录。
 *
 * 登录**不是**看内容的条件——它有两个用处：让站长知道你是谁、以后能给你
 * 发站点通知；以及站长可以把某个人设成编辑，让他能改内容。
 *
 * 所以这一页的措辞很重要：不能让人以为「不登录就看不了」。
 */
export function SignInPanel({ onDone }: { onDone?: () => void }): JSX.Element {
  const { state } = usePrism()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState('')

  async function send() {
    if (sending) return
    setSending(true)
    const r = await sendLink(email)
    setSending(false)
    if (r.ok) { setSent(r.message); onDone?.() }
    else toast(r.message, 'warn')
  }

  if (sent) {
    return (
      <div className="gate__inner">
        <p className="gate__lede">信已经发出去了。</p>
        <p className="gate__note">{sent}</p>
        <p className="gate__note gate__note--small">
          没收到？先看看垃圾邮件。还是没有的话，
          <button type="button" className="gate__link" onClick={() => setSent('')}>换个地址再试一次</button>。
        </p>
      </div>
    )
  }

  return (
    <div className="gate__inner">
      <p className="gate__lede">用邮箱登录</p>
      <p className="gate__note">
        <strong>看内容不需要登录。</strong>
        登录是为了让{state.copy.title}知道你是谁——以后有更新可以通知你；
        站长也可以把你设成编辑，让你能改内容。
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
        不用设密码。邮箱只用来登录和给你发站点通知，别的成员看不到你的地址。
      </p>
    </div>
  )
}

/** 独立的一页，给「我想登录」的人。 */
export function SignInPage(): JSX.Element {
  const { state } = usePrism()
  return (
    <div className="gate">
      <main className="gate__box">
        <PrismMark size={44} />
        <h1 className="gate__title">{state.copy.title}</h1>
        <SignInPanel />
      </main>
      <ToastHost />
    </div>
  )
}
