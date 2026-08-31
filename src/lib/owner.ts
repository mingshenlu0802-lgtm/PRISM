/**
 * 站长是谁，不写在代码里。
 *
 * 网站的 JS 是公开的，任何人都能下载下来读。所以站长的邮箱地址不能出现在里面——
 * 否则一个每天更新的公开网站就成了一个稳定的邮箱来源，爬虫拿走它不费一点力气。
 *
 * 这里只放邮箱的 SHA-256。登录时把邮箱算一遍哈希再比对：对得上就是站长。
 * 地址本身只存在站长自己的浏览器里，从不发布。
 *
 * 说清楚这做到了什么、没做到什么：
 * - 做到了：公开文件里没有任何人的邮箱地址，爬不走。
 * - 没做到：这不是密码。知道站长是谁的人可以自己算哈希验证猜测——
 *   哈希防的是「顺手扫走」，不是「针对性追查」。
 * - 真正的权限保护要靠服务端（见 docs/SECURITY.md），不靠这一行。
 */

/** sha256('站长的邮箱地址')。改站长就换这一串，见 docs/SECURITY.md。 */
export const OWNER_HASH = '8711e46ecf79255214ff3d76702d6a2c439f9a9aeee52cd128b7c426695c43d3'

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 这个邮箱是不是站长的。
 *
 * 大小写和首尾空格都先归一化——Google 返回的地址大小写不保证稳定，
 * 而一个因为大写就登不进自己网站的站长会以为是自己记错了账号。
 */
export async function isOwnerEmail(email: string): Promise<boolean> {
  try {
    return (await sha256Hex(email.trim().toLowerCase())) === OWNER_HASH
  } catch {
    // crypto.subtle 只在 https 和 localhost 上有。拿不到就当作不是站长——
    // 宁可少给权限，也不要在不确定的时候多给。
    return false
  }
}
