/**
 * 把站点内容同步回 GitHub。
 *
 * 浏览器要写 GitHub 必须带一个你自己的 token。它只存在这台电脑的浏览器里，
 * 不会发给别人，也不会进代码库。给 token 的时候只勾 `Contents: Read and write`
 * 这一项权限就够了。
 *
 * 同步写的是一个 JSON 内容文件，不是代码——所以同步永远不会弄坏网站。
 */
import type { PrismState } from './types'

export interface SyncResult {
  ok: boolean
  message: string
  url?: string
}

interface ContentPayload {
  news: PrismState['news']
  studies: PrismState['studies']
  copy: PrismState['copy']
  appearance: PrismState['appearance']
  publicOffline: boolean
  savedAt: string
}

export function contentSnapshot(state: PrismState): ContentPayload {
  return {
    news: state.news,
    studies: state.studies,
    copy: state.copy,
    appearance: state.appearance,
    publicOffline: state.publicOffline,
    savedAt: new Date().toISOString(),
  }
}

function b64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin)
}

async function getSha(cfg: PrismState['github'], path = cfg.path): Promise<string | undefined> {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(cfg.branch)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json' },
  })
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`读取文件失败（${res.status}）`)
  const data = await res.json() as { sha?: string }
  return data.sha
}

/**
 * 往仓库里写一个文件。
 *
 * 跟 syncToGitHub 的区别只在于「写哪个文件」——内容同步写的是内容文件，
 * 而连接配置要写进 public/ 才会跟网站一起发布出去。
 */
export async function syncFile(
  cfg: PrismState['github'],
  path: string,
  body: string,
  message: string,
): Promise<SyncResult> {
  if (!cfg.token) return { ok: false, message: '还没有填 GitHub token，先在下面填一个。' }
  if (!cfg.owner || !cfg.repo) return { ok: false, message: '仓库信息不完整。' }
  try {
    const sha = await getSha(cfg, path)
    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, content: b64(body), branch: cfg.branch, ...(sha ? { sha } : {}) }),
    })
    if (!res.ok) {
      if (res.status === 401) return { ok: false, message: 'token 无效或已过期，请换一个。' }
      if (res.status === 403) return { ok: false, message: 'token 权限不足：需要 Contents 的写权限。' }
      if (res.status === 404) return { ok: false, message: '找不到这个仓库或分支，请检查名称拼写。' }
      return { ok: false, message: `写入失败（${res.status}）` }
    }
    const data = await res.json() as { commit?: { html_url?: string } }
    return { ok: true, message: '已写入仓库。网站会自动重新发布，一两分钟后生效。', url: data.commit?.html_url }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? `写入失败：${e.message}` : '写入失败' }
  }
}

export async function syncToGitHub(state: PrismState, message: string): Promise<SyncResult> {
  const cfg = state.github
  if (!cfg.token) return { ok: false, message: '还没有填 GitHub token，先在「同步」里填一个。' }
  if (!cfg.owner || !cfg.repo) return { ok: false, message: '仓库信息不完整。' }

  try {
    const sha = await getSha(cfg)
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(cfg.path)}`
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: b64(JSON.stringify(contentSnapshot(state), null, 2)),
        branch: cfg.branch,
        ...(sha ? { sha } : {}),
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      if (res.status === 401) return { ok: false, message: 'token 无效或已过期，请换一个。' }
      if (res.status === 403) return { ok: false, message: 'token 权限不足：需要 Contents 的写权限。' }
      if (res.status === 404) return { ok: false, message: '找不到这个仓库或分支，请检查名称拼写。' }
      return { ok: false, message: `同步失败（${res.status}）：${body.slice(0, 120)}` }
    }
    const data = await res.json() as { commit?: { html_url?: string } }
    return { ok: true, message: '已同步到 GitHub。', url: data.commit?.html_url }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? `同步失败：${e.message}` : '同步失败' }
  }
}

/* ------------------------------------------------------------------ *
 * 把「要改代码」的需求开成 issue
 * ------------------------------------------------------------------ */

/**
 * 代码改动走 GitHub，不走浏览器。
 *
 * 控制端能改内容和外观，改不了源码——静态站的页面是提前构建好的。所以当
 * Claude 判断某件事必须改代码时，把需求原样开成一个 issue：站长在 Claude Code
 * 里打开这个仓库就能接着做，推送之后 Actions 会自动重新发布。
 */
export async function openIssue(cfg: PrismState['github'], title: string, body: string): Promise<SyncResult> {
  if (!cfg.token) return { ok: false, message: '还没有填 GitHub token，先在下面填一个。' }
  if (!cfg.owner || !cfg.repo) return { ok: false, message: '仓库信息不完整。' }
  try {
    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body }),
    })
    if (!res.ok) {
      if (res.status === 401) return { ok: false, message: 'token 无效或已过期，请换一个。' }
      if (res.status === 403) return { ok: false, message: 'token 权限不足：开 issue 需要 Issues 的写权限。' }
      if (res.status === 404) return { ok: false, message: '找不到这个仓库，或者仓库关掉了 Issues。' }
      return { ok: false, message: `开 issue 失败（${res.status}）` }
    }
    const data = await res.json() as { html_url?: string; number?: number }
    return { ok: true, message: `已开 issue #${data.number}。`, url: data.html_url }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? `开 issue 失败：${e.message}` : '开 issue 失败' }
  }
}

/* ------------------------------------------------------------------ *
 * 下载内容文件
 * ------------------------------------------------------------------ */

export interface SaveOutcome {
  ok: boolean
  message: string
}

/**
 * Two places this site runs, two ways a browser will hand over a file.
 *
 * On a normal static host (GitHub Pages, or the single-file copy opened from
 * disk) an `<a download>` is the whole story. Inside the claude.ai artifact
 * viewer that link is inert — the frame is not allowed to start a download —
 * and the page has to ask the host to save the file instead. Feature-detect,
 * and never leave the owner staring at a button that quietly did nothing.
 */
interface ClaudeHost {
  use?: (name: string) => Promise<{ save?: (r: { filename: string; data: string }) => Promise<unknown> } | null>
}

// Start resolving at load so pressing the button is instant. On a plain static
// host there is no such object and this settles to null right away.
const hostSaver = (async () => {
  const host = (globalThis as { claude?: ClaudeHost }).claude
  if (!host?.use) return null
  try { return await host.use('downloads') } catch { return null }
})()

function saveViaLink(text: string): SaveOutcome {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'site-content.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { ok: true, message: '已下载 site-content.json。' }
}

/** Hand the owner a copy of everything, for when they would rather not give the browser a token. */
export async function downloadSnapshot(state: PrismState): Promise<SaveOutcome> {
  const text = JSON.stringify(contentSnapshot(state), null, 2)
  const saver = await hostSaver
  if (!saver?.save) return saveViaLink(text)
  try {
    await saver.save({ filename: 'site-content.json', data: text })
    return { ok: true, message: '已保存 site-content.json。' }
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (code === 'declined') return { ok: false, message: '你取消了保存。' }
    if (code === 'rate_limited') return { ok: false, message: '刚刚已经在保存了，等一下再按。' }
    // The host cannot save here; the plain link is still worth a try.
    return saveViaLink(text)
  }
}
