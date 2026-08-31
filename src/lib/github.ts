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

async function getSha(cfg: PrismState['github']): Promise<string | undefined> {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(cfg.path)}?ref=${encodeURIComponent(cfg.branch)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json' },
  })
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`读取文件失败（${res.status}）`)
  const data = await res.json() as { sha?: string }
  return data.sha
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

/** A local download, for when you would rather not hand a token to the browser. */
export function downloadSnapshot(state: PrismState): void {
  const blob = new Blob([JSON.stringify(contentSnapshot(state), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'site-content.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
