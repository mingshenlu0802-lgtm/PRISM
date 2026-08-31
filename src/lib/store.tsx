import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import type {
  Account, Appearance, ChangeEntry, ChangeKind, CollectConfig, CollectRun,
  GitHubConfig, ID, MediaLink, NewsItem, PrismState, Role, SiteCopy, StudyItem,
} from './types'

import { buildInitialState } from './demo'
import type { Mode } from './backend'
import { backendFailure, getClient, inSandboxFrame, loadConfig } from './backend'
import { fetchAll, watch } from './remote'
import { currentWho, onAuthChange } from './session'
import { mirror } from './sync'
import { nowIso, uid } from './util'

const STORAGE_KEY = 'prism.site.v3'
const SCHEMA = 3

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

export type Action =
  | { type: 'reset' }
  | { type: 'hydrate'; state: PrismState }
  /* content */
  | { type: 'news-add'; items: NewsItem[]; who: string }
  | { type: 'news-edit'; id: ID; patch: Partial<NewsItem>; who: string }
  | { type: 'news-hide'; id: ID; who: string }
  | { type: 'news-restore'; id: ID; who: string }
  | { type: 'news-delete'; id: ID; who: string }
  | { type: 'news-feature'; id: ID; on: boolean; who: string }
  | { type: 'news-link-add'; id: ID; link: MediaLink; who: string }
  | { type: 'news-link-edit'; id: ID; linkId: ID; patch: Partial<MediaLink>; who: string }
  | { type: 'news-link-remove'; id: ID; linkId: ID; who: string }
  | { type: 'study-add'; items: StudyItem[]; who: string }
  | { type: 'study-edit'; id: ID; patch: Partial<StudyItem>; who: string }
  | { type: 'study-hide'; id: ID; who: string }
  | { type: 'study-restore'; id: ID; who: string }
  | { type: 'study-delete'; id: ID; who: string }
  /* collection */
  | { type: 'collect-config'; patch: Partial<CollectConfig> }
  | { type: 'run-start'; run: CollectRun }
  | { type: 'run-step'; runId: ID; index: number }
  | { type: 'run-finish'; runId: ID; addedNews: ID[]; addedStudies: ID[]; skipped: CollectRun['skipped'] }
  | { type: 'run-stop'; runId: ID }
  | { type: 'run-undo'; runId: ID; who: string }
  /* appearance & copy */
  | { type: 'appearance'; patch: Partial<Appearance>; who: string }
  | { type: 'copy'; patch: Partial<SiteCopy>; who: string }
  /* accounts */
  | { type: 'signin'; email: string; name?: string; picture?: string }
  | { type: 'signout' }
  | { type: 'admin-add'; email: string; who: string }
  | { type: 'admin-remove'; email: string; who: string }
  | { type: 'member-role'; email: string; role: Role; who: string }
  /* system */
  | { type: 'github'; patch: Partial<GitHubConfig> }
  | { type: 'public-offline'; off: boolean; who: string }

/* ------------------------------------------------------------------ *
 * Change log
 * ------------------------------------------------------------------ */

function log(state: PrismState, who: string, kind: ChangeKind, text: string, undo?: ChangeEntry['undo']): ChangeEntry[] {
  const entry: ChangeEntry = { id: uid('chg'), at: nowIso(), who, kind, text, undo }
  return [entry, ...state.changes].slice(0, 300)
}

const short = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n)}…` : s)

/* ------------------------------------------------------------------ *
 * Reducer
 * ------------------------------------------------------------------ */

export function reducer(state: PrismState, action: Action): PrismState {
  switch (action.type) {
    case 'reset': return buildInitialState()
    case 'hydrate': return action.state

    /* ------------------------------- news ------------------------------- */

    case 'news-add': {
      if (action.items.length === 0) return state
      return {
        ...state,
        news: [...action.items, ...state.news],
        changes: log(state, action.who, 'collected',
          `搜集到 ${action.items.length} 条新闻：${action.items.map((i) => short(i.headline, 14)).join('、')}`),
      }
    }

    case 'news-edit': {
      const item = state.news.find((n) => n.id === action.id)
      if (!item) return state
      const touchedSummary = action.patch.summary !== undefined && action.patch.summary !== item.summary
      return {
        ...state,
        news: state.news.map((n) => (n.id === action.id
          ? { ...n, ...action.patch, updatedAt: nowIso(), editedByHuman: n.editedByHuman || touchedSummary }
          : n)),
        changes: log(state, action.who, 'edited', `修改了「${short(item.headline)}」`),
      }
    }

    case 'news-hide': {
      const item = state.news.find((n) => n.id === action.id)
      if (!item) return state
      return {
        ...state,
        // 下架就不再是头条了——否则状态里会留着一个「看不见的头条」。
        news: state.news.map((n) => (n.id === action.id
          ? { ...n, status: 'hidden', featured: false, updatedAt: nowIso() }
          : n)),
        changes: log(state, action.who, 'hidden', `下架了「${short(item.headline)}」，公众站不再显示`,
          { type: 'restore-news', id: action.id }),
      }
    }

    case 'news-restore': {
      const item = state.news.find((n) => n.id === action.id)
      if (!item) return state
      return {
        ...state,
        news: state.news.map((n) => (n.id === action.id ? { ...n, status: 'live', updatedAt: nowIso() } : n)),
        changes: log(state, action.who, 'restored', `恢复了「${short(item.headline)}」`),
      }
    }

    case 'news-delete': {
      const item = state.news.find((n) => n.id === action.id)
      if (!item) return state
      return {
        ...state,
        news: state.news.filter((n) => n.id !== action.id),
        changes: log(state, action.who, 'deleted', `永久删除了「${short(item.headline)}」`),
      }
    }

    /**
     * 头条由站长指定，不是算法挑的。
     * 一次只有一条——设了新的，旧的自动让位，并在改动记录里写清楚是哪一条让了位。
     */
    case 'news-feature': {
      const item = state.news.find((n) => n.id === action.id)
      if (!item) return state
      const previous = action.on ? state.news.find((n) => n.featured && n.id !== action.id) : undefined
      return {
        ...state,
        news: state.news.map((n) => {
          if (n.id === action.id) return { ...n, featured: action.on, updatedAt: nowIso() }
          return action.on && n.featured ? { ...n, featured: false } : n
        }),
        changes: log(state, action.who, 'edited', action.on
          ? `把「${short(item.headline)}」设为头条${previous ? `，原来的头条「${short(previous.headline, 14)}」已让位` : ''}`
          : `取消了「${short(item.headline)}」的头条`),
      }
    }

    case 'news-link-add': {
      const item = state.news.find((n) => n.id === action.id)
      if (!item) return state
      return {
        ...state,
        news: state.news.map((n) => (n.id === action.id
          ? { ...n, links: [...n.links, action.link], updatedAt: nowIso() } : n)),
        changes: log(state, action.who, 'link-added', `给「${short(item.headline)}」加了一个链接：${action.link.outlet}`),
      }
    }

    case 'news-link-edit':
      return {
        ...state,
        news: state.news.map((n) => (n.id === action.id
          ? { ...n, links: n.links.map((l) => (l.id === action.linkId ? { ...l, ...action.patch } : l)), updatedAt: nowIso() }
          : n)),
        changes: log(state, action.who, 'edited', '修改了一个媒体链接'),
      }

    case 'news-link-remove': {
      const item = state.news.find((n) => n.id === action.id)
      const link = item?.links.find((l) => l.id === action.linkId)
      if (!item || !link) return state
      return {
        ...state,
        news: state.news.map((n) => (n.id === action.id
          ? { ...n, links: n.links.filter((l) => l.id !== action.linkId), updatedAt: nowIso() } : n)),
        changes: log(state, action.who, 'link-removed', `从「${short(item.headline)}」移除了 ${link.outlet} 的链接`),
      }
    }

    /* ------------------------------ studies ----------------------------- */

    case 'study-add': {
      if (action.items.length === 0) return state
      return {
        ...state,
        studies: [...action.items, ...state.studies],
        changes: log(state, action.who, 'collected', `搜集到 ${action.items.length} 项研究/数据`),
      }
    }

    case 'study-edit': {
      const item = state.studies.find((s) => s.id === action.id)
      if (!item) return state
      return {
        ...state,
        studies: state.studies.map((s) => (s.id === action.id ? { ...s, ...action.patch, editedByHuman: true } : s)),
        changes: log(state, action.who, 'edited', `修改了研究「${short(item.title)}」`),
      }
    }

    case 'study-hide': {
      const item = state.studies.find((s) => s.id === action.id)
      if (!item) return state
      return {
        ...state,
        studies: state.studies.map((s) => (s.id === action.id ? { ...s, status: 'hidden' } : s)),
        changes: log(state, action.who, 'hidden', `下架了研究「${short(item.title)}」`,
          { type: 'restore-study', id: action.id }),
      }
    }

    case 'study-restore':
      return {
        ...state,
        studies: state.studies.map((s) => (s.id === action.id ? { ...s, status: 'live' } : s)),
        changes: log(state, action.who, 'restored', '恢复了一项研究'),
      }

    case 'study-delete': {
      const item = state.studies.find((s) => s.id === action.id)
      if (!item) return state
      return {
        ...state,
        studies: state.studies.filter((s) => s.id !== action.id),
        changes: log(state, action.who, 'deleted', `永久删除了研究「${short(item.title)}」`),
      }
    }

    /* ---------------------------- collection ---------------------------- */

    case 'collect-config':
      return { ...state, collect: { ...state.collect, ...action.patch } }

    case 'run-start':
      return { ...state, runs: [action.run, ...state.runs].slice(0, 20) }

    case 'run-step':
      return {
        ...state,
        runs: state.runs.map((r) => (r.id === action.runId
          ? { ...r, steps: r.steps.map((s, i) => (i <= action.index ? { ...s, done: true } : s)) }
          : r)),
      }

    case 'run-finish':
      return {
        ...state,
        runs: state.runs.map((r) => (r.id === action.runId
          ? { ...r, state: 'done', finishedAt: nowIso(), addedNewsIds: action.addedNews, addedStudyIds: action.addedStudies, skipped: action.skipped }
          : r)),
      }

    case 'run-stop':
      return {
        ...state,
        runs: state.runs.map((r) => (r.id === action.runId ? { ...r, state: 'stopped', finishedAt: nowIso() } : r)),
      }

    case 'run-undo': {
      const run = state.runs.find((r) => r.id === action.runId)
      if (!run) return state
      const n = new Set(run.addedNewsIds)
      const s = new Set(run.addedStudyIds)
      return {
        ...state,
        news: state.news.filter((x) => !n.has(x.id)),
        studies: state.studies.filter((x) => !s.has(x.id)),
        runs: state.runs.map((r) => (r.id === action.runId ? { ...r, addedNewsIds: [], addedStudyIds: [] } : r)),
        changes: log(state, action.who, 'deleted', `撤销了一次搜集，移除 ${n.size + s.size} 条内容`),
      }
    }

    /* --------------------------- appearance ----------------------------- */

    case 'appearance':
      return {
        ...state,
        appearance: { ...state.appearance, ...action.patch },
        changes: log(state, action.who, 'appearance', '调整了网站外观'),
      }

    case 'copy':
      return {
        ...state,
        copy: { ...state.copy, ...action.patch },
        changes: log(state, action.who, 'copy', '修改了网站文案'),
      }

    /* ----------------------------- accounts ----------------------------- */

    /** 记下当前登录的是谁。是不是站长由数据库的名单决定，不在这里判断。 */
    case 'signin':
      return {
        ...state,
        auth: {
          ...state.auth,
          email: action.email.trim().toLowerCase(),
          name: action.name,
          picture: action.picture,
        },
      }

    case 'signout':
      return { ...state, auth: { ...state.auth, email: undefined, name: undefined, picture: undefined } }

    case 'admin-add': {
      const email = action.email.trim().toLowerCase()
      if (!email || state.auth.admins.some((a) => a.email === email)) return state
      const account: Account = { email, role: 'editor', addedAt: nowIso(), notify: true }
      return {
        ...state,
        auth: { ...state.auth, admins: [...state.auth.admins, account] },
        changes: log(state, action.who, 'admin', `把 ${email} 加为管理员`),
      }
    }

    /** 改一个成员的身份。站长自己那一行动不了——否则可以把自己降级锁死。 */
    case 'member-role': {
      const email = action.email.trim().toLowerCase()
      if (email === state.auth.ownerEmail) return state
      const before = state.auth.admins.find((a) => a.email === email)
      if (!before || before.role === action.role) return state
      const label = { owner: '站长', editor: '编辑', member: '只能看' }[action.role]
      return {
        ...state,
        auth: {
          ...state.auth,
          admins: state.auth.admins.map((a) => (a.email === email ? { ...a, role: action.role } : a)),
        },
        changes: log(state, action.who, 'admin', `把 ${email} 设成${label}`),
      }
    }

    case 'admin-remove': {
      // 站长删不掉，谁都不行，站长自己也不行。用存下来的地址比对——
      // 代码里本来就没有它。名单上标了 owner 的那一行同样受保护，
      // 免得站长还没登录过就有人把它清掉。
      const target = action.email.trim().toLowerCase()
      if (target && target === state.auth.ownerEmail) return state
      if (state.auth.admins.some((a) => a.email === target && a.role === 'owner')) return state
      return {
        ...state,
        auth: { ...state.auth, admins: state.auth.admins.filter((a) => a.email !== target) },
        changes: log(state, action.who, 'admin', `移除了管理员 ${action.email}`),
      }
    }

    /* ------------------------------ system ------------------------------ */

    case 'github':
      return { ...state, github: { ...state.github, ...action.patch } }

    case 'public-offline':
      return {
        ...state,
        publicOffline: action.off,
        changes: log(state, action.who, 'lock',
          action.off ? '把公众站切换为「暂停对外显示」' : '恢复了公众站的对外显示'),
      }

    default:
      return state
  }
}

/* ------------------------------------------------------------------ *
 * Persistence
 * ------------------------------------------------------------------ */

interface Persisted extends PrismState { __schema?: number }

function load(): PrismState {
  const fresh = buildInitialState()
  if (typeof window === 'undefined') return fresh
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fresh
    const parsed = JSON.parse(raw) as Persisted
    if (!parsed || parsed.__schema !== SCHEMA) return fresh
    if (!Array.isArray(parsed.news) || !Array.isArray(parsed.studies)) return fresh
    // Fill in anything a newer build added, so an old save never blanks a field.
    return {
      ...fresh,
      ...parsed,
      appearance: { ...fresh.appearance, ...parsed.appearance },
      collect: { ...fresh.collect, ...parsed.collect },
      auth: { ...fresh.auth, ...parsed.auth },
      github: { ...fresh.github, ...parsed.github },
      copy: { ...fresh.copy, ...parsed.copy },
    }
  } catch {
    return fresh
  }
}

function persist(state: PrismState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, __schema: SCHEMA }))
  } catch {
    // Storage full or blocked. The app keeps working from memory.
  }
}

/* ------------------------------------------------------------------ *
 * 谁能进控制端
 * ------------------------------------------------------------------ */

export interface Access {
  isOwner: boolean
  isAdmin: boolean
  /** 共享模式下：这个人在不在成员名单里。本地模式恒为 true。 */
  isMember: boolean
  mode: Mode
  /** 控制端是否放行。 */
  consoleOpen: boolean
  /**
   * 控制端里的按钮能不能按。
   *
   * 跟 consoleOpen 一样的道理，而且必须一样：还没接上登录时把人放进来、
   * 又把每一个按钮都禁掉，等于给了一间锁着所有抽屉的房间——站长连接登录
   * 之前想改点东西都做不到。开着就是真开着。
   */
  canEdit: boolean
}

/**
 * 谁能做什么。规则只写一遍。
 *
 * **本地模式**：内容只存在这台浏览器里，没有第二个人，所以没有「登录」
 * 这回事——打开的人就是这份副本的主人，什么都能做。这不是漏洞：
 * 他改的只是自己屏幕上的东西，真正发布出去还要 GitHub token。
 *
 * **共享模式**：身份全部来自数据库的 members 表。这里算出来的
 * canEdit 只是**给界面用的**，决定按钮灰不灰；真正的把关在数据库的
 * policy 里，所以改浏览器里的代码没有用，写入会被服务端挡回去。
 */
export function accessOf(state: PrismState, mode: Mode = 'local'): Access {
  if (mode === 'local') {
    return {
      isOwner: true, isAdmin: true, canEdit: true,
      consoleOpen: true, isMember: true, mode,
    }
  }

  const email = (state.auth.email ?? '').toLowerCase()
  const me = state.auth.admins.find((a) => a.email === email)
  const isOwner = me?.role === 'owner'
  const isAdmin = isOwner || me?.role === 'editor'
  return {
    isOwner, isAdmin, canEdit: isAdmin,
    consoleOpen: isAdmin, isMember: Boolean(me), mode,
  }
}

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

interface Ctx {
  state: PrismState
  dispatch: React.Dispatch<Action>
  reset: () => void
  /** Signed-in email, or '' — used as the `who` on every change. */
  who: string
  isOwner: boolean
  isAdmin: boolean
  /** 控制端里的按钮能不能按。 */
  canEdit: boolean
  /** 控制端是否放行。本地模式恒开；共享模式看数据库里的身份。 */
  consoleOpen: boolean
  /** 'local' 内容在这台浏览器里；'shared' 内容在共用数据库里。 */
  mode: Mode
  /** 共享模式下：这个人在不在成员名单里。 */
  isMember: boolean
  /** 首次加载还没完成时为 false——界面据此显示「正在打开」而不是空白。 */
  ready: boolean
  /** 上一次写库失败的原因，成功时为空。 */
  syncError: string
  /** 手动重新从数据库取一次。 */
  refresh: () => void
}

const PrismContext = createContext<Ctx | null>(null)

export function PrismProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, load)
  const [mode, setMode] = React.useState<Mode>('local')
  const [ready, setReady] = React.useState(false)
  const [syncError, setSyncError] = React.useState('')
  const first = useRef(true)

  // mirror 需要知道「改之前是什么」，而 dispatch 之后再读 state 已经晚了。
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (first.current) { first.current = false; return }
    persist(state)
  }, [state])

  /* ---------------- 共享模式：连库、取数、跟着变 ---------------- */

  const pull = useCallback(async () => {
    const db = await getClient()
    if (!db) return
    const who = await currentWho()
    if (!who) {
      // 没登录就不去读——RLS 会挡回来，读了也是空的。
      rawDispatch({ type: 'signout' })
      setReady(true)
      return
    }
    try {
      const snap = await fetchAll(db)
      const base = stateRef.current
      rawDispatch({
        type: 'hydrate',
        state: {
          ...base,
          news: snap.news,
          studies: snap.studies,
          changes: snap.changes,
          publicOffline: snap.offline,
          copy: { ...base.copy, ...snap.copy },
          appearance: { ...base.appearance, ...snap.appearance },
          auth: {
            ...base.auth,
            email: who.email,
            name: who.name,
            admins: snap.members,
            ownerEmail: snap.members.find((m) => m.role === 'owner')?.email,
          },
        },
      })
      setSyncError('')
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : '读取失败')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    let stopWatch: (() => void) | undefined
    let stopAuth: (() => void) | undefined
    let alive = true

    void (async () => {
      let db = null
      try {
        db = await getClient()
      } catch (e) {
        // 连后端出任何岔子都不该把整个网站带下水。
        setSyncError(e instanceof Error ? e.message : '连接后端失败')
      }
      if (!alive) return
      if (!db) {
        setMode('local')
        setReady(true)
        // 「配置了却在看演示数据」是最让人困惑的失败——如果确实配了，就说出来。
        const cfg = await loadConfig().catch(() => null)
        if (cfg && alive) {
          setSyncError(inSandboxFrame()
            ? '这里是预览环境，禁止一切对外请求，所以连不上数据库——这不是你填错了。请到你自己的网址上操作（GitHub Pages 或你的域名）。'
            : backendFailure() || '配置了共享数据库，但连不上。检查网址和 key 是否填对、网络是否被挡。')
        }
        return
      }
      setMode('shared')
      await pull()
      if (!alive) return
      // 别人改了东西，这边不用刷新就跟着变。
      stopWatch = watch(db, () => { void pull() })
      stopAuth = await onAuthChange(() => { void pull() })
    })()

    return () => { alive = false; stopWatch?.(); stopAuth?.() }
  }, [pull])

  /**
   * 共享模式下，每一次改动先落到本地（界面立刻有反应），再推到数据库。
   *
   * 推失败不撤销本地——那会把用户刚打的字吞掉，是最让人恼火的处理方式。
   * 正确的做法是把失败说出来，让他自己决定重试还是算了。
   */
  const dispatch = useCallback<React.Dispatch<Action>>((action) => {
    const prev = stateRef.current
    rawDispatch(action)
    if (mode !== 'shared') return
    const next = reducer(prev, action)
    void (async () => {
      const db = await getClient()
      if (!db) return
      try {
        await mirror(db, action, prev, next)
        setSyncError('')
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : '保存失败')
      }
    })()
  }, [mode])

  // Appearance is applied to <html> so both surfaces follow it.
  useEffect(() => {
    const el = document.documentElement
    el.dataset.theme = state.appearance.theme
    el.dataset.accent = state.appearance.accent
    el.dataset.fs = String(state.appearance.fontScale)
    el.dataset.roomy = String(state.appearance.roomy)
    el.dataset.body = state.appearance.bodyFont
  }, [state.appearance])

  const reset = useCallback(() => {
    try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    dispatch({ type: 'reset' })
  }, [])

  const email = state.auth.email ?? ''
  const { isOwner, isAdmin, consoleOpen, canEdit, isMember } = accessOf(state, mode)
  const refresh = useCallback(() => { void pull() }, [pull])

  const value = useMemo<Ctx>(
    () => ({
      state, dispatch, reset, who: email || '未登录',
      isOwner, isAdmin, canEdit, consoleOpen,
      mode, isMember, ready, syncError, refresh,
    }),
    [state, dispatch, reset, email, isOwner, isAdmin, canEdit, consoleOpen,
      mode, isMember, ready, syncError, refresh],
  )
  return <PrismContext.Provider value={value}>{children}</PrismContext.Provider>
}

export function usePrism(): Ctx {
  const ctx = useContext(PrismContext)
  if (!ctx) throw new Error('usePrism must be used inside <PrismProvider>')
  return ctx
}
