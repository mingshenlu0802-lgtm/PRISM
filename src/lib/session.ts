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
export async function sendLink(email: string): Promise<SendResult> {
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
    return { ok: true, message: `登录链接已发到 ${clean}。去邮箱点一下就好，链接一小时内有效。` }
  } catch (e) {
    return { ok: false, message: friendly(e) }
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
