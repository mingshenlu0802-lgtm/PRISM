/**
 * Google 登录。
 *
 * 用的是 Google Identity Services 的浏览器端登录。它能确认「谁登录了」，
 * 但**不能**在纯静态网站上真正保护控制端：任何懂技术的人都可以绕过界面上的
 * 判断。要做到真正的权限控制，需要一台服务器在后端校验这个 token。
 * 这一点在设置页会如实写给站长看，不藏起来。
 */

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

export interface GoogleProfile {
  email: string
  name?: string
  picture?: string
}

interface CredentialResponse { credential?: string }

interface GsiApi {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (r: CredentialResponse) => void; auto_select?: boolean }): void
      renderButton(el: HTMLElement, options: Record<string, string | number>): void
      disableAutoSelect(): void
    }
  }
}

declare global {
  interface Window { google?: GsiApi }
}

let loading: Promise<void> | null = null

export function loadGoogleScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.google?.accounts?.id) return Promise.resolve()
  if (loading) return loading
  loading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Google 登录脚本加载失败')))
      return
    }
    const el = document.createElement('script')
    el.src = SCRIPT_SRC
    el.async = true
    el.defer = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error('Google 登录脚本加载失败（可能是网络被拦截）'))
    document.head.appendChild(el)
  })
  return loading
}

/** Decode the ID token payload. Reading only — verification needs a server. */
export function readIdToken(credential: string): GoogleProfile | null {
  try {
    const payload = credential.split('.')[1]
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    )
    const data = JSON.parse(json) as { email?: string; name?: string; picture?: string }
    if (!data.email) return null
    return { email: data.email.toLowerCase(), name: data.name, picture: data.picture }
  } catch {
    return null
  }
}

export interface RenderOptions {
  clientId: string
  target: HTMLElement
  onSignIn: (profile: GoogleProfile) => void
  onError: (message: string) => void
}

export async function renderGoogleButton({ clientId, target, onSignIn, onError }: RenderOptions): Promise<void> {
  if (!clientId) { onError('尚未填写 Google 客户端 ID'); return }
  try {
    await loadGoogleScript()
    const api = window.google
    if (!api) { onError('Google 登录不可用'); return }
    api.accounts.id.initialize({
      client_id: clientId,
      callback: (res) => {
        const profile = res.credential ? readIdToken(res.credential) : null
        if (profile) onSignIn(profile)
        else onError('登录返回的信息无法读取')
      },
    })
    target.replaceChildren()
    api.accounts.id.renderButton(target, {
      type: 'standard', theme: 'outline', size: 'large',
      text: 'signin_with', shape: 'pill', locale: 'zh_CN', width: 260,
    })
  } catch (e) {
    onError(e instanceof Error ? e.message : '登录初始化失败')
  }
}

export function googleSignOut(): void {
  try { window.google?.accounts.id.disableAutoSelect() } catch { /* ignore */ }
}
