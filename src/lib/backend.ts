/**
 * 后端连接。
 *
 * 网站有两种运行方式，启动时自动判断：
 *
 * - **本地模式**（没有配置后端）：内容存在你自己的浏览器里，跟以前一样。
 *   适合一个人试用，也是这个仓库开箱即用的样子。
 * - **共享模式**（配置了 Supabase）：内容存在一个共用的数据库里，
 *   你和朋友看到的是同一份；用邮箱登录；谁能读、谁能改由数据库说了算。
 *
 * 判断依据是 `prism-config.json` —— 一个跟网站一起发布的小文件。
 * 没有它，或者读不到，就退回本地模式，网站照常能用。
 *
 * 关于把 URL 和 anon key 写进这个文件：**它们本来就是公开的**。
 * Supabase 的 anon key 不授予任何权限，权限全部来自登录之后的身份和数据库规则
 * （schema.sql 里的那些 policy）。所以把它们放进发布产物是标准做法，不是疏忽。
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface BackendConfig {
  url: string
  anonKey: string
}

export type Mode = 'local' | 'shared'

let cached: BackendConfig | null | undefined
let clientPromise: Promise<SupabaseClient | null> | null = null

/** 站长在控制端里填过之后，先用这台浏览器里的那份——省得等发布。 */
const LOCAL_KEY = 'prism.backend.v1'

function readLocal(): BackendConfig | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<BackendConfig>
    return valid(parsed) ? { url: parsed.url!.trim(), anonKey: parsed.anonKey!.trim() } : null
  } catch {
    return null
  }
}

export function saveLocal(cfg: BackendConfig | null): void {
  try {
    if (cfg) window.localStorage.setItem(LOCAL_KEY, JSON.stringify(cfg))
    else window.localStorage.removeItem(LOCAL_KEY)
  } catch { /* 存不下也不影响这次会话 */ }
  cached = undefined
  clientPromise = null
}

function valid(c: Partial<BackendConfig> | null | undefined): boolean {
  if (!c?.url || !c?.anonKey) return false
  try {
    const u = new URL(c.url)
    return u.protocol === 'https:' && c.anonKey.length > 20
  } catch {
    return false
  }
}

/**
 * 找配置。先看这台浏览器，再看跟网站一起发布的文件。
 *
 * 发布的那份是给**朋友**用的——他们第一次打开网站时，浏览器里什么都没有，
 * 必须能从网站本身拿到连接信息，否则连登录页都到不了。
 */
export async function loadConfig(): Promise<BackendConfig | null> {
  if (cached !== undefined) return cached
  const local = readLocal()
  if (local) { cached = local; return cached }
  try {
    // 相对路径：网站放在子目录里（GitHub Pages 常见）也找得到。
    const res = await fetch(new URL('prism-config.json', document.baseURI), { cache: 'no-store' })
    if (!res.ok) { cached = null; return null }
    const parsed = await res.json() as Partial<BackendConfig>
    cached = valid(parsed) ? { url: parsed.url!.trim(), anonKey: parsed.anonKey!.trim() } : null
  } catch {
    cached = null
  }
  return cached
}

/** 拿到客户端；没配置后端就是 null，调用方据此走本地模式。 */
export function getClient(): Promise<SupabaseClient | null> {
  if (clientPromise) return clientPromise
  clientPromise = (async () => {
    const cfg = await loadConfig()
    if (!cfg) return null
    // 动态引入：本地模式下读者不会下载这一大坨。
    const { createClient } = await import('@supabase/supabase-js')
    return createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  })()
  return clientPromise
}

/** 把报错翻译成人话，并且说下一步做什么。 */
export function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  if (/Invalid login credentials|Email not confirmed/i.test(msg)) return '这个邮箱还没通过验证，请点邮件里的链接。'
  if (/rate limit|too many/i.test(msg)) return '发得太频繁了，等一分钟再试。'
  if (/row-level security|violates row-level/i.test(msg)) return '你的账号没有这项权限。要改内容，请让站长把你设成编辑。'
  if (/JWT|not authenticated|session/i.test(msg)) return '登录状态过期了，请重新登录。'
  if (/Failed to fetch|NetworkError/i.test(msg)) return '连不上服务器，检查一下网络。'
  return msg || '出错了。'
}
