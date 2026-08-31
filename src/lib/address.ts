/**
 * 网址里有没有人名。
 *
 * 站长问过一句很要紧的话：「这个网址怎么有我的名字？」
 *
 * 那个名字不在代码里——代码里一个人的信息都没有，发布前还有 `npm run privacy`
 * 在挡着。它来自 GitHub Pages 的网址规则：`账号名.github.io/仓库名/`。
 * 也就是说**改代码去不掉它**，只能换一个「这个仓库挂在谁名下」。
 *
 * 判断逻辑单独放在这里，是为了能脱离浏览器直接测——
 * 「什么样的网址算干净」这种事说错了代价很大，不该只靠肉眼看界面。
 */

export type AddressKind =
  /** GitHub Pages：`账号名.github.io/仓库名/`，前半截是账号名。 */
  | 'pages'
  /** 自有域名，网址里没有任何账号名。 */
  | 'custom'
  /** 本机预览，别人打不开。 */
  | 'local'
  /** 跑在别人的框里（比如 claude.ai 的预览），这不是正式网址。 */
  | 'sandbox'

export interface AddressFacts {
  /** 读者会看到的完整地址（不含 `#/` 后面的部分）。 */
  full: string
  host: string
  /** 主机名后面那一段，例如 `/PRISM/`。 */
  path: string
  /** GitHub Pages 网址前半截的账号名/组织名。不是 Pages 就是 null。 */
  account: string | null
  kind: AddressKind
  /** 这个账号名看起来跟某个人有关吗。 */
  personal: boolean
}

/**
 * 看起来跟站点有关、跟个人无关的名字，就不再唠叨。
 *
 * 故意只做这一件事：**认出明显已经处理好的**。认不出来就当成还没处理，
 * 宁可多提醒一次。反过来（试图判断一串字符是不是真名）做不到，
 * 也不该做——猜错的代价是把名字留在公开网址上。
 */
const IMPERSONAL = /prism|refract|lens|spectrum|beacon|desk|wire|daily|press|media|news/i

export function readAddress(href: string, framed = false): AddressFacts {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return { full: href, host: '', path: '', account: null, kind: 'local', personal: false }
  }
  const full = `${url.origin}${url.pathname}`
  const host = url.hostname
  const path = url.pathname
  const base = { full, host, path, account: null, personal: false }

  if (framed) return { ...base, kind: 'sandbox' }
  if (url.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host)) {
    return { ...base, kind: 'local' }
  }

  const m = /^([a-z0-9-]+)\.github\.io$/i.exec(host)
  if (m) {
    const account = m[1]
    return { full, host, path, account, kind: 'pages', personal: !IMPERSONAL.test(account) }
  }
  return { ...base, kind: 'custom' }
}
