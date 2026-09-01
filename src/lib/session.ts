/**
 * 邮箱登录。
 *
 * 没有密码，没有 Google。输入邮箱，收到一封信，点里面的链接就登录了——
 * 这叫 magic link。选它有三个理由：朋友不用再记一个密码；没有密码就没有
 * 密码泄露；而且它天然验证了「这个邮箱确实是他的」，所以站长之后给成员发信
 * 时，名单是可信的。
 *
 * 登录本身不代表能看内容。能不能看，取决于这个邮箱在不在 members 表里，
 * 而那张表只有站长能改。这是两件事，界面上也分开说。
 */
import type { SupabaseClient, Session } from '@supabase/supabase-js'
import { friendly, getClient } from './backend'
import { clearPendingAuth, pendingAuth } from './authlink'

export interface Who {
  email: string
  name?: string
}

function whoFrom(session: Session | null): Who | null {
  const email = session?.user?.email
  if (!email) return null
  const meta = session.user.user_metadata as { full_name?: string; name?: string } | undefined
  return { email: email.toLowerCase(), name: meta?.full_name ?? meta?.name }
}

/** 当前登录的人，没登录就是 null。 */
export async function currentWho(): Promise<Who | null> {
  const db = await getClient()
  if (!db) return null
  const { data } = await db.auth.getSession()
  return whoFrom(data.session)
}

export interface SendResult {
  ok: boolean
  message: string
}

/**
 * 寄一封登录信。
 *
 * `shouldCreateUser` 保持默认的 true：一个被站长加进名单、但从没登录过的朋友，
 * 第一次点链接时才会建账号。关掉它会让「已经在名单上却收不到信」变成一个
 * 没人看得懂的失败。
 */
export async function sendCode(email: string): Promise<SendResult> {
  const db = await getClient()
  if (!db) return { ok: false, message: '这个网站还没有连上后端。' }
  const clean = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return { ok: false, message: '这个邮箱地址看起来不完整。' }
  }
  try {
    const { error } = await db.auth.signInWithOtp({
      email: clean,
      options: {
        // 点完链接回到网站首页。带上完整地址，子目录部署也回得来。
        emailRedirectTo: new URL('.', document.baseURI).href,
      },
    })
    if (error) throw error
    return { ok: true, message: `验证码已发到 ${clean}，一小时内有效。` }
  } catch (e) {
    return { ok: false, message: friendly(e) }
  }
}

/**
 * 用邮件里的验证码登录。
 *
 * 站长要的是「在邮件里 confirm 数字就可以进入」，而不是点一条链接。理由很实在：
 * 链接那条路已经坏过三次——额度用完、SMTP 配错、令牌被 HashRouter 吃掉。
 * 验证码不经过跳转，也就绕过了最后那一类问题。
 *
 * **前提是邮件模板里有 `{{ .Token }}`。** Supabase 默认的模板只放链接，
 * 不放数字；没有它，这封信里就没有码可填。所以下面的错误信息会指到那里去，
 * 而不是让人对着一封没有数字的邮件反复重发。
 */
export async function verifyCode(email: string, code: string): Promise<SendResult> {
  const db = await getClient()
  if (!db) return { ok: false, message: '这个网站还没有连上后端。' }
  const clean = email.trim().toLowerCase()
  const token = code.replace(/\s+/g, '')
  if (!clean) return { ok: false, message: '先填邮箱。' }
  if (!token) return { ok: false, message: '把邮件里的验证码填进来。' }
  try {
    const { error } = await db.auth.verifyOtp({ email: clean, token, type: 'email' })
    if (error) throw error
    return { ok: true, message: '登录成功。' }
  } catch (e) {
    const msg = friendly(e)
    return {
      ok: false,
      message: /invalid|expired|token/i.test(msg)
        ? '验证码不对或已过期。如果邮件里根本没有数字，是 Supabase 的邮件模板里缺 {{ .Token }}——去 Authentication → Email Templates 加上。'
        : msg,
    }
  }
}

/**
 * 用密码登录。
 *
 * 网站给朋友准备的是邮件链接——没有密码要记，也不会有密码泄露。但那条路
 * **依赖一个会限流的邮件服务**：站长要装上自己的网站，就得先等一封信发出来，
 * 而额度用完、SMTP 配错，都会把他挡在自己的控制端外面。发生过，挡了两天。
 *
 * 所以留一条不经过邮件的路。密码在 Supabase 后台设（Authentication → Users），
 * 网站这边只是把它交给 Supabase 验。权限一点没变：能读能写仍然由数据库的
 * 规则按身份判断，密码只是证明「你是谁」的另一种方式。
 */
export async function signInWithPassword(email: string, password: string): Promise<SendResult> {
  const db = await getClient()
  if (!db) return { ok: false, message: '这个网站还没有连上后端。' }
  const clean = email.trim().toLowerCase()
  if (!clean || !password) return { ok: false, message: '邮箱和密码都要填。' }
  try {
    const { error } = await db.auth.signInWithPassword({ email: clean, password })
    if (error) throw error
    return { ok: true, message: '登录成功。' }
  } catch (e) {
    return { ok: false, message: friendly(e) }
  }
}

/**
 * 用登录链接带回来的令牌，把登录状态真正建立起来。
 *
 * 令牌是 `authlink` 在路由启动前抢下来的（否则会被 HashRouter 抹掉）。
 * 这里等 Supabase 客户端就绪之后交给它。
 *
 * 存成功了才清——否则 React 严格模式下 effect 跑两遍时，
 * 第一遍取走、第二遍就没了，反而把登录弄丢。
 */
export async function completeLinkSignIn(db: SupabaseClient): Promise<void> {
  const p = pendingAuth()
  if (!p) return
  try {
    const { error } = await db.auth.setSession({
      access_token: p.accessToken,
      refresh_token: p.refreshToken,
    })
    if (error) throw error
    clearPendingAuth()
  } catch {
    // 令牌无效或过期。清掉，免得每次刷新都再试一遍一定会失败的事。
    clearPendingAuth()
  }
}

export async function signOut(): Promise<void> {
  const db = await getClient()
  await db?.auth.signOut()
}

/** 登录状态一变就通知调用方——点了邮件链接回来时靠它刷新界面。 */
export async function onAuthChange(fn: (who: Who | null) => void): Promise<() => void> {
  const db = await getClient()
  if (!db) return () => {}
  const { data } = db.auth.onAuthStateChange((_event, session) => fn(whoFrom(session)))
  return () => data.subscription.unsubscribe()
}

/** 有没有连上后端。界面用它决定显示「登录」还是什么都不显示。 */
export async function hasBackend(): Promise<boolean> {
  return (await getClient()) !== null
}

export type { SupabaseClient }
