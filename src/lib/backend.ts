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

/**
 * 危险的那一类错误：**必须一边打字一边拦**。
 *
 * Supabase 新界面上「Publishable key」和「Secret key」挨在一起，长得也像，
 * 复制错一个的后果是**把绕过全部权限规则的钥匙印在网页上**，谁都能拿去改
 * 你的数据库。这种错不能等到按按钮才说——那时候人可能已经点了「发布出去」。
 *
 * 只有这一类立刻报。别的都等他打完再说（见 `keyProblem`）。
 */
export function keyDanger(key: string): string | null {
  const k = key.trim()
  if (!k) return null
  if (/^sb_secret_/i.test(k)) {
    return '这是 Secret key，绝对不能填在网页上——它能绕过所有权限规则。请改用 Publishable key（sb_publishable_ 开头）。'
  }
  if (/^service_role/i.test(k) || /"role"\s*:\s*"service_role"/.test(k)) {
    return '这是 service_role 密钥，不能填在网页上。请改用 anon / Publishable key。'
  }
  return null
}

/**
 * 这一串填对了没有——**完整地判断**，用于失焦之后和按按钮之前。
 *
 * 不要拿它一边打字一边判断。站长反馈过：「我尝试给 publishable key
 * enter anything 的时候就出现错误」——因为才敲了一两个字母就被判「太短」。
 * 一个人在打字中途本来就是「还没填对」，那不是错误，那是打字。
 */
export function keyProblem(key: string): string | null {
  const k = key.trim()
  if (!k) return null
  const danger = keyDanger(k)
  if (danger) return danger
  if (!/^(sb_publishable_|eyJ)/.test(k)) {
    return '这一串不像 Supabase 的 Publishable key（应当以 sb_publishable_ 开头，旧版是 eyJ 开头）。'
  }
  if (k.length < 20) return '这一串太短，像是没复制全。回 Supabase 用那一栏的复制图标，别手打。'
  return null
}

/**
 * 这一串还在打字的中途吗。
 *
 * 「是」的时候界面什么都不说——它只是还没打完，不是填错了。
 */
export function keyTyping(key: string): boolean {
  const k = key.trim()
  if (!k) return true
  if (keyDanger(k)) return false
  // 正在往「sb_publishable_」或「eyJ」这两个开头上凑，就还算在打字。
  const prefixes = ['sb_publishable_', 'eyJ']
  if (prefixes.some((p) => p.startsWith(k) || k.startsWith(p))) {
    return keyProblem(k) !== null
  }
  return false
}

/** 网址的危险类错误：暂时没有——填错网址顶多是连不上，不会泄漏什么。 */
export function urlProblem(url: string): string | null {
  const u = url.trim()
  if (!u) return null
  if (!/^https?:\/\//.test(u)) return '网址要以 https:// 开头。'
  try {
    const parsed = new URL(u)
    if (!/\.supabase\.(co|in)$/.test(parsed.hostname)) {
      return '这个网址不像 Supabase 的项目地址（应当是 https://你的项目ID.supabase.co）。'
    }
    if (parsed.protocol !== 'https:') return '网址要以 https:// 开头。'
    return null
  } catch {
    return '这不是一个合法的网址。'
  }
}

/** 网址还在打字的中途吗。`https://` 这半截显然是。 */
export function urlTyping(url: string): boolean {
  const u = url.trim()
  if (!u) return true
  return 'https://'.startsWith(u) || u === 'https://'
}

function valid(c: Partial<BackendConfig> | null | undefined): boolean {
  if (!c?.url || !c?.anonKey) return false
  return urlProblem(c.url) === null && keyProblem(c.anonKey) === null
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

/**
 * 这个页面跑在别人的框里吗（比如 claude.ai 的 artifact 预览）。
 *
 * 那种沙箱禁止一切对外请求，Supabase 在里面永远连不上。这不是配置错，
 * 但表现得一模一样，所以要单独认出来告诉站长「换到你自己的网址去操作」——
 * 否则他会一遍遍检查两串没错的字符。
 */
export function inSandboxFrame(): boolean {
  try { return window.self !== window.top } catch { return true }
}

/** 上一次连后端为什么没成。界面拿它告诉站长，而不是默默退回本地模式。 */
let lastFailure = ''
export const backendFailure = (): string => lastFailure

/**
 * 拿到客户端。
 *
 * 没配置后端就是 null——调用方据此走本地模式，这是正常路径。
 * 配置了却连不上也返回 null，但会把原因记下来：**「说配置了却看到演示数据」
 * 是最让人困惑的失败**，站长会以为自己填错了，其实可能只是网络被挡。
 */
export function getClient(): Promise<SupabaseClient | null> {
  if (clientPromise) return clientPromise
  clientPromise = (async () => {
    const cfg = await loadConfig()
    if (!cfg) return null
    try {
      // 动态引入：本地模式下读者不会下载这一大坨。
      const { createClient } = await import('@supabase/supabase-js')
      lastFailure = ''
      return createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    } catch (e) {
      lastFailure = friendly(e)
      return null
    }
  })()
  return clientPromise
}

/** 把报错翻译成人话，并且说下一步做什么。 */
export function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  if (/Invalid login credentials|Email not confirmed/i.test(msg)) return '这个邮箱还没通过验证，请点邮件里的链接。'
  /*
   * 发信被限流。
   *
   * 这里分两种，因为它们的等待时间差了两个数量级，说错了就是把人支去白等：
   *
   * - **短冷却**：Supabase 对同一个地址的连续请求有几十秒的间隔，报错里会
   *   明说等多少秒。照它说的等就行。
   * - **发信配额**：Supabase 自带的邮件服务是给开发和试用的，**按小时**计数，
   *   额度很小。等一分钟没有任何用——得等配额刷新，或者干脆换成自己的 SMTP。
   *   站长的朋友们以后也要收这些信，所以自己的 SMTP 迟早要配。
   *
   * 原来这两种都回一句「等一分钟再试」，于是配额用完的人会一分钟试一次，
   * 每次都失败，而且每次失败都以为是自己哪里做错了。
   */
  const seconds = /after (\d+) seconds?/i.exec(msg)?.[1]
  if (seconds) return `发得太快了，等 ${seconds} 秒再按一次。`
  if (/rate.?limit|too many|over_email_send|over_request_rate/i.test(msg)) {
    return '这个项目今天的发信额度用完了。Supabase 自带的邮件服务是给试用的，'
      + '按小时算、额度很小——再等一分钟没用，要么等额度刷新，'
      + '要么在 Supabase 里配置自己的 SMTP（Authentication → Emails / SMTP Settings）。'
      + '当前额度在 Authentication → Rate Limits 里看得到。'
  }
  if (/row-level security|violates row-level/i.test(msg)) return '你的账号没有这项权限。要改内容，请让站长把你设成编辑。'
  if (/JWT|not authenticated|session/i.test(msg)) return '登录状态过期了，请重新登录。'
  if (/Failed to fetch|NetworkError/i.test(msg)) return '连不上服务器，检查一下网络。'
  return msg || '出错了。'
}

/**
 * 从一坨粘贴进来的文字里，把网址和 key 分别认出来。
 *
 * 站长的原话：「我不能同时输入两行进输入框。」——他是想**把两行一起粘**。
 * 那完全合理：这两串在 Supabase 后台常常是连着抄下来的，中间就一个换行。
 * 单行输入框会把换行吃掉，于是两串黏成一串，怎么填都不对。
 *
 * 与其教他「要分两次粘」，不如让粘贴这件事直接管用：
 * 不管他粘的是哪一个框、粘的是一行还是两行，能认出来的就各自归位。
 *
 * 认法很笨但很稳：按空白字符切开，逐段看它像网址还是像 key。
 * 认不出来的段落一概忽略——宁可少填一个让他自己补，也不要把垃圾塞进去。
 */
export function parsePasted(text: string): { url?: string; anonKey?: string } {
  const out: { url?: string; anonKey?: string } = {}
  for (const raw of text.split(/[\s\n\r]+/)) {
    const piece = raw.trim().replace(/[,;"'<>]+$/, '')
    if (!piece) continue
    if (!out.url && /^https?:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(piece)) {
      out.url = piece.replace(/\/$/, '')
      continue
    }
    if (!out.anonKey && /^(sb_publishable_|sb_secret_|eyJ)/.test(piece) && piece.length >= 20) {
      out.anonKey = piece
    }
  }
  return out
}
