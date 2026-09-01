import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrism } from '../../lib/store'
import { sendLink, signInWithPassword } from '../../lib/session'
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
  /*
   * 密码登录默认收起来。
   *
   * 朋友要的是「不用记密码」那条路，把两个表单并排摆出来只会让人犹豫。
   * 但站长需要一条**不经过邮件**的路：邮件服务会限流，配错了还会整个发不出去，
   * 那时候他会被挡在自己的控制端外面——已经发生过，挡了两天。
   */
  const [pwOpen, setPwOpen] = useState(false)
  const [password, setPassword] = useState('')

  async function send() {
    if (sending) return
    setSending(true)
    const r = await sendLink(email)
    setSending(false)
    if (r.ok) { setSent(r.message); onDone?.() }
    else toast(r.message, 'warn')
  }

  async function byPassword() {
    if (sending) return
    setSending(true)
    const r = await signInWithPassword(email, password)
    setSending(false)
    if (r.ok) {
      toast('登录成功。', 'go')
      onDone?.()
      // 整个网站要按「已登录」重新起来——跟接上后端时一样，最干净的是重载。
      window.location.reload()
    } else {
      toast(r.message, 'warn')
    }
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
        <strong>看内容不需要登录</strong>——你现在看到的就是全部，
        直接关掉这一页继续读也完全可以。
      </p>
      <ul className="gate__why">
        <li><strong>想收到更新通知</strong>：{state.copy.title}有新内容时给你发一封信。</li>
        <li><strong>站长要给你编辑权限</strong>：登录一次之后，他才能在名单里找到你。</li>
      </ul>
      <ol className="gate__how">
        <li>下面填你的邮箱，按<strong>发登录链接</strong>。</li>
        <li>去邮箱收信（<strong>记得看垃圾邮件</strong>），点里面的链接。</li>
        <li>自动跳回网站，就登录好了。<strong>不用设密码。</strong></li>
      </ol>
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
        邮箱只用来登录和给你发站点通知。<strong>别的读者看不到你的地址</strong>——
        成员名单在数据库里是锁着的，只有站长能看。
      </p>

      {pwOpen ? (
        <div className="gate__pw">
          <p className="gate__note gate__note--small">
            <strong>用密码登录</strong>——给设过密码的人用，不发邮件。
            没设过就用上面那条路。
          </p>
          <div className="gate__row">
            <TextInput
              type="password"
              placeholder="密码"
              value={password}
              autoComplete="current-password"
              onChange={(e) => { const v = e.currentTarget.value; setPassword(v) }}
              onKeyDown={(e) => { if (e.key === 'Enter') void byPassword() }}
            />
            <button
              type="button"
              className="gate__go"
              onClick={() => void byPassword()}
              disabled={sending || !email.trim() || !password}
            >
              {sending ? '登录中…' : '登录'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="gate__link gate__pwlink" onClick={() => setPwOpen(true)}>
          有密码？用密码登录
        </button>
      )}
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
