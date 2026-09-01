/**
 * 把登录邮件带回来的令牌，抢在路由前面接住。
 *
 * Supabase 的 magic link 用的是 implicit 流程（supabase-js v2 的默认），
 * 点完链接回到网站时，令牌挂在**地址的 hash 里**：
 *
 *     https://你的网址/#access_token=ey…&refresh_token=…&type=magiclink
 *
 * 而这个网站用的是 HashRouter——hash 就是它的路由。于是 `#access_token=…`
 * 被当成一个页面地址去匹配，当然匹配不上，兜底路由 `<Navigate to="/" replace>`
 * 立刻把 hash 换成 `#/`，**令牌在几十毫秒内就被抹掉了**。
 * Supabase 客户端是懒加载的（要动态 import 一个几十 KB 的包），等它起来的时候
 * 地址栏早就干净了，`detectSessionInUrl` 什么也读不到。
 *
 * 表现就是：站长点了邮件里的链接，回到网站，一切正常——只是没登录，
 * 而且没有任何地方说为什么。
 *
 * 所以这个模块必须在 `createRoot()` **之前**同步跑一次，先把令牌抄下来，
 * 再把 hash 换成干净的 `#/`。等 Supabase 客户端起来之后再交给它。
 *
 * 顺带也接住失败的情况。链接过期时 Supabase 回来的是
 * `#error=access_denied&error_code=otp_expired&error_description=…`，
 * 同样会被路由抹掉——不接的话，一条过期的链接和一条正常的链接**表现完全一样**：
 * 都是回到首页、没登录、没有解释。
 */

export interface PendingAuth {
  accessToken: string
  refreshToken: string
}

let pending: PendingAuth | null = null
let failure = ''

/** 这一串 hash 是登录回调，不是路由地址吗。 */
function isAuthPayload(hash: string): boolean {
  const raw = hash.replace(/^#/, '')
  // 真正的路由永远是 `#/…` 开头，不会跟这些参数撞上。
  if (!raw || raw.startsWith('/')) return false
  return /(^|&)(access_token|error|error_description|error_code)=/.test(raw)
}

/**
 * 在路由启动前调用一次。
 *
 * 认出登录回调就把内容抄走，并且把地址换成 `#/`，让路由从首页干净地起来。
 * 不是登录回调就什么都不做——普通的 `#/console/manage` 必须原样留着。
 */
export function takeAuthFromHash(): void {
  if (typeof window === 'undefined') return
  const hash = window.location.hash
  if (!isAuthPayload(hash)) return

  const p = new URLSearchParams(hash.replace(/^#/, ''))
  const accessToken = p.get('access_token') ?? ''
  const refreshToken = p.get('refresh_token') ?? ''
  if (accessToken && refreshToken) {
    pending = { accessToken, refreshToken }
  } else {
    // 把 Supabase 的英文原话留着当兜底，但先给一句人话。
    const code = p.get('error_code') ?? ''
    const desc = p.get('error_description')?.replace(/\+/g, ' ') ?? ''
    failure = /expired/i.test(`${code} ${desc}`)
      ? '这个登录链接已经过期了（链接只在一小时内有效，而且只能用一次）。请重新发一封。'
      : desc || '这个登录链接用不了。请重新发一封。'
  }

  // 换掉地址，别让路由看见这一串——也别把令牌留在地址栏和浏览历史里。
  const { pathname, search } = window.location
  window.history.replaceState(null, '', `${pathname}${search}#/`)
}

/** 有没有接到令牌等着用。**不消费**——存成功了才清掉。 */
export function pendingAuth(): PendingAuth | null {
  return pending
}

/** 令牌用掉了。 */
export function clearPendingAuth(): void {
  pending = null
}

/** 登录链接本身有问题时的说明，没有就是空串。读一次就清掉，只说一遍。 */
export function takeAuthLinkError(): string {
  const f = failure
  failure = ''
  return f
}
