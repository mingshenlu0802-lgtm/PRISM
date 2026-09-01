import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrism } from '../../lib/store'
import { usePageTitle } from '../../lib/title'
import { sendCode, signInWithPassword, verifyCode } from '../../lib/session'
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
  const [email, setEmail] = useState('')
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function send() {
    if (busy || !email.trim()) return
    setBusy(true)
    const r = await sendCode(email)
    setBusy(false)
    if (r.ok) { setSent(true); toast(r.message, 'go') } else toast(r.message, 'warn')
  }

  /*
   * 一个输入框，两种凭据。
   *
   * 站长要的就是两格：邮箱和「密码输入」。所以这一格两样都收——
   * 六位数字当验证码验，其余当密码试。分成两个框只会多一次「我该填哪个」的犹豫，
   * 而这两样东西在使用者眼里本来就是同一件事：「证明我是我」。
   */
  async function enter() {
    if (busy || !email.trim() || !secret.trim()) return
    setBusy(true)
    const code = secret.replace(/\s+/g, '')
    const r = /^\d{6}$/.test(code)
      ? await verifyCode(email, code)
      : await signInWithPassword(email, secret)
    setBusy(false)
    if (!r.ok) { toast(r.message, 'warn'); return }
    toast('登录成功。', 'go')
    onDone?.()
    // 整个网站要按「已登录」重新起来——跟接上后端时一样，最干净的是重载。
    window.location.reload()
  }

  return (
    <div className="gate__inner">
      <p className="gate__lede">登录</p>

      <div className="gate__row">
        <TextInput
          type="email"
          placeholder="邮箱"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void send() }}
        />
        <button
          type="button"
          className="gate__go gate__go--ghost"
          onClick={() => void send()}
          disabled={busy || !email.trim()}
        >
          {busy && !sent ? '发送中…' : sent ? '重发验证码' : '发送验证码'}
        </button>
      </div>

      <div className="gate__row">
        <TextInput
          type="password"
          placeholder="验证码或密码"
          value={secret}
          autoComplete="current-password"
          onChange={(e) => { const v = e.currentTarget.value; setSecret(v) }}
          onKeyDown={(e) => { if (e.key === 'Enter') void enter() }}
        />
        <button
          type="button"
          className="gate__go"
          onClick={() => void enter()}
          disabled={busy || !email.trim() || !secret.trim()}
        >
          {busy ? '登录中…' : '进入'}
        </button>
      </div>

      {/*
        * 只留一句。原本这里有三段说明加一个分步清单，讲「看内容不需要登录」
        * 和「链接会发到邮箱」——站长要求简化成两个输入框，那些话就该走。
        * 唯一留下的是这句：不登录也能看。它防的是「以为要注册才能读」而直接关掉，
        * 那是这个网站最不该发生的误会。
        */}
      <p className="gate__note gate__note--small">
        看内容不需要登录。登录只是为了让站长认出你，或者给你编辑权限。
      </p>
    </div>
  )
}

/**
 * 独立的一页，给「我想登录」的人。
 *
 * 有自己的地址是有用的：站长可以直接说「你去这个链接登录一下，我把你设成编辑」，
 * 比「点右上角那个按钮」好说得多。
 *
 * 这一页必须给一条**回去的路**。朋友多半是顺手点进来的，如果发现自己不需要登录，
 * 却只剩一个输入框和一个按钮，那就是把人晾在这儿了。
 */
export function SignInPage(): JSX.Element {
  const { state } = usePrism()
  usePageTitle('登录')
  return (
    <div className="gate">
      <main className="gate__box">
        <PrismMark size={44} />
        <h1 className="gate__title">{state.copy.title}</h1>
        <SignInPanel />

        <div className="gate__after">
          <p className="gate__afterhead">登录之后会怎样</p>
          <ul className="gate__afterlist">
            <li>网站看起来<strong>一模一样</strong>——登录不会解锁什么隐藏内容，本来就都给你看了。</li>
            <li>{state.copy.title}有新内容时可以给你发信；不想收了随时跟站长说一声。</li>
            <li>如果站长把你设成<strong>编辑</strong>，右上角会多出一个「控制端」入口。</li>
            <li>你的邮箱<strong>别的读者看不到</strong>，成员名单在数据库里是锁着的。</li>
          </ul>
        </div>

        <Link className="gate__back" to="/">先不登录，回去看内容 →</Link>
      </main>
      <ToastHost />
    </div>
  )
}
