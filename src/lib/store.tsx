import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import type {
  Account, Appearance, ChangeEntry, ChangeKind, CollectConfig, CollectRun,
  GitHubConfig, ID, MediaLink, NewsItem, PrismState, SiteCopy, StudyItem,
} from './types'
import { OWNER_EMAIL } from './types'
import { buildInitialState } from './demo'
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
  | { type: 'client-id'; clientId: string }
  | { type: 'admin-add'; email: string; who: string }
  | { type: 'admin-remove'; email: string; who: string }
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
        news: state.news.map((n) => (n.id === action.id ? { ...n, status: 'hidden', updatedAt: nowIso() } : n)),
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

    case 'signin':
      return { ...state, auth: { ...state.auth, email: action.email, name: action.name, picture: action.picture } }

    case 'signout':
      return { ...state, auth: { ...state.auth, email: undefined, name: undefined, picture: undefined } }

    case 'client-id':
      return { ...state, auth: { ...state.auth, clientId: action.clientId.trim() } }

    case 'admin-add': {
      const email = action.email.trim().toLowerCase()
      if (!email || state.auth.admins.some((a) => a.email === email)) return state
      const account: Account = { email, role: 'admin', addedAt: nowIso() }
      return {
        ...state,
        auth: { ...state.auth, admins: [...state.auth.admins, account] },
        changes: log(state, action.who, 'admin', `把 ${email} 加为管理员`),
      }
    }

    case 'admin-remove': {
      // The owner can never be removed, by anyone, including the owner.
      if (action.email === OWNER_EMAIL) return state
      return {
        ...state,
        auth: { ...state.auth, admins: state.auth.admins.filter((a) => a.email !== action.email) },
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
}

const PrismContext = createContext<Ctx | null>(null)

export function PrismProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    persist(state)
  }, [state])

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
  const isOwner = email.toLowerCase() === OWNER_EMAIL
  const isAdmin = isOwner || state.auth.admins.some((a) => a.email === email.toLowerCase())

  const value = useMemo<Ctx>(
    () => ({ state, dispatch, reset, who: email || '未登录', isOwner, isAdmin }),
    [state, reset, email, isOwner, isAdmin],
  )
  return <PrismContext.Provider value={value}>{children}</PrismContext.Provider>
}

export function usePrism(): Ctx {
  const ctx = useContext(PrismContext)
  if (!ctx) throw new Error('usePrism must be used inside <PrismProvider>')
  return ctx
}
