import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import type {
  Article, ArticleStatus, AuditAction, AuditEntry, Correction, ID, ImageAsset,
  PrismState, ReviewDecision, Version, VibeRun,
} from './types'
import { ENGINE_MAP } from './constants'
import { buildInitialState } from './demo'
import { nowIso, uid } from './util'

const STORAGE_KEY = 'prism.console.v1'
/** Bumped whenever the demo dataset changes shape, so stale state is dropped. */
const SCHEMA = 3

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

export type Action =
  | { type: 'reset' }
  | { type: 'audit'; entry: AuditEntry }
  | { type: 'decide'; articleId: ID; decision: ReviewDecision; note?: string; scheduledFor?: string }
  | { type: 'publish'; articleId: ID }
  | { type: 'retract'; articleId: ID; reason: string }
  | { type: 'update-published'; articleId: ID; correction: Correction }
  | { type: 'set-status'; articleId: ID; status: ArticleStatus }
  | { type: 'resolve-risk'; articleId: ID; riskId: ID; note: string }
  | { type: 'recheck-citations'; articleId: ID }
  | { type: 'ack-citation'; articleId: ID; citationId: ID; note: string }
  | { type: 'attach-source'; articleId: ID; sourceId: ID }
  | { type: 'edit-block'; articleId: ID; sectionId: ID; blockId: ID; text: string }
  | { type: 'edit-meta'; articleId: ID; patch: Partial<Pick<Article, 'title' | 'standfirst' | 'contentNotice'>> }
  | { type: 'vibe-start'; run: VibeRun }
  | { type: 'vibe-propose'; runId: ID; version: Version; rationale: string }
  | { type: 'vibe-adopt'; runId: ID }
  | { type: 'vibe-discard'; runId: ID }
  | { type: 'version-adopt'; versionId: ID }
  | { type: 'version-discard'; versionId: ID }
  | { type: 'asset-add'; asset: ImageAsset }
  | { type: 'asset-status'; assetId: ID; status: ImageAsset['status'] }
  | { type: 'set-cover'; articleId: ID; assetId: ID }
  | { type: 'lock'; engaged: boolean; reason?: string }
  | { type: 'signal-decline'; signalId: ID; reason: string }
  | { type: 'signal-promote'; signalId: ID }
  | { type: 'brief-sent'; briefId: ID }
  | { type: 'set-retrieval-engine'; engineId: string }

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const EDITOR = '主编（你）'
const DESK = 'PRISM 自动编辑台'

function audit(state: PrismState, action: AuditAction, target: string, detail: string, articleId?: ID, actorKind: AuditEntry['actorKind'] = 'editor'): AuditEntry[] {
  const entry: AuditEntry = {
    id: uid('aud'),
    at: nowIso(),
    actor: actorKind === 'editor' ? EDITOR : actorKind === 'ai-desk' ? DESK : '系统',
    actorKind,
    action,
    articleId,
    target,
    detail,
  }
  return [entry, ...state.audit]
}

function mapArticle(state: PrismState, id: ID, fn: (a: Article) => Article): Article[] {
  return state.articles.map((a) => (a.id === id ? fn({ ...a, updatedAt: nowIso() }) : a))
}

const DECISION_STATUS: Record<ReviewDecision, ArticleStatus> = {
  'approve-publish': 'published',
  'approve-schedule': 'scheduled',
  'save-draft': 'drafting',
  'request-sources': 'needs-sources',
  'return-research': 'changes-requested',
  reject: 'rejected',
  archive: 'archived',
}

const DECISION_AUDIT: Record<ReviewDecision, AuditAction> = {
  'approve-publish': 'published',
  'approve-schedule': 'scheduled',
  'save-draft': 'edited',
  'request-sources': 'more-sources-requested',
  'return-research': 'returned-for-research',
  reject: 'rejected',
  archive: 'archived',
}

/* ------------------------------------------------------------------ *
 * Reducer
 * ------------------------------------------------------------------ */

export function reducer(state: PrismState, action: Action): PrismState {
  switch (action.type) {
    case 'reset':
      return buildInitialState()

    case 'audit':
      return { ...state, audit: [action.entry, ...state.audit] }

    case 'decide': {
      const article = state.articles.find((a) => a.id === action.articleId)
      if (!article) return state
      // The desk can never publish on its own, and the global lock outranks
      // every approval: an "approve & publish" under lock lands as approved.
      const locked = state.lock.engaged
      const wantsPublish = action.decision === 'approve-publish'
      const status: ArticleStatus = wantsPublish && locked ? 'approved' : DECISION_STATUS[action.decision]
      const at = nowIso()
      return {
        ...state,
        articles: mapArticle(state, action.articleId, (a) => ({
          ...a,
          status,
          publishedAt: status === 'published' ? at : a.publishedAt,
          scheduledFor: action.decision === 'approve-schedule' ? action.scheduledFor : undefined,
        })),
        audit: audit(
          state,
          wantsPublish && locked ? 'approved' : DECISION_AUDIT[action.decision],
          article.title,
          wantsPublish && locked
            ? 'Global Publishing Lock 已开启：批准已记录，内容未公开发布。'
            : action.note || '—',
          action.articleId,
        ),
      }
    }

    case 'publish': {
      const article = state.articles.find((a) => a.id === action.articleId)
      if (!article || state.lock.engaged) return state
      const at = nowIso()
      return {
        ...state,
        articles: mapArticle(state, action.articleId, (a) => ({
          ...a, status: 'published', publishedAt: at, scheduledFor: undefined,
        })),
        audit: audit(state, 'published', article.title, '经发布前确认后公开。', action.articleId),
      }
    }

    case 'retract': {
      const article = state.articles.find((a) => a.id === action.articleId)
      if (!article) return state
      const correction: Correction = {
        id: uid('cor'), at: nowIso(), kind: 'retraction', text: action.reason, by: EDITOR,
      }
      return {
        ...state,
        articles: mapArticle(state, action.articleId, (a) => ({
          ...a, status: 'retracted', corrections: [correction, ...a.corrections],
        })),
        audit: audit(state, 'retracted', article.title, action.reason, action.articleId),
      }
    }

    case 'update-published': {
      const article = state.articles.find((a) => a.id === action.articleId)
      if (!article) return state
      return {
        ...state,
        articles: mapArticle(state, action.articleId, (a) => ({
          ...a,
          status: a.status === 'retracted' ? 'retracted' : 'published',
          corrections: [action.correction, ...a.corrections],
        })),
        audit: audit(state, 'updated', article.title, `${action.correction.kind}：${action.correction.text}`, action.articleId),
      }
    }

    case 'set-status':
      return {
        ...state,
        articles: mapArticle(state, action.articleId, (a) => ({ ...a, status: action.status })),
      }

    case 'resolve-risk': {
      const article = state.articles.find((a) => a.id === action.articleId)
      if (!article) return state
      const flag = article.riskFlags.find((r) => r.id === action.riskId)
      return {
        ...state,
        articles: mapArticle(state, action.articleId, (a) => ({
          ...a,
          riskFlags: a.riskFlags.map((r) =>
            r.id === action.riskId ? { ...r, resolved: true, resolutionNote: action.note } : r),
        })),
        audit: audit(state, 'edited', `${article.title} · 风险项`, `${flag?.note ?? action.riskId} → ${action.note}`, action.articleId),
      }
    }

    case 'recheck-citations': {
      const article = state.articles.find((a) => a.id === action.articleId)
      if (!article) return state
      const at = nowIso()
      return {
        ...state,
        articles: mapArticle(state, action.articleId, (a) => ({
          ...a,
          // Re-checking never launders a failure into a pass, and never
          // clears an acknowledgement the editor already recorded.
          citationChecks: a.citationChecks.map((c) =>
            c.status === 'missing' && !c.acknowledged
              ? { ...c, reason: `${c.reason}（已重新核查：仍未取得可验证的一手记录，等待人工判断）`, checkedAt: at }
              : { ...c, checkedAt: at }),
        })),
        audit: audit(state, 'ai-review', `${article.title} · 资源检索`, '重新检索全部 references。', action.articleId, 'ai-desk'),
      }
    }

    case 'ack-citation': {
      const article = state.articles.find((a) => a.id === action.articleId)
      if (!article) return state
      return {
        ...state,
        articles: mapArticle(state, action.articleId, (a) => ({
          ...a,
          citationChecks: a.citationChecks.map((c) =>
            c.citationId === action.citationId
              ? { ...c, acknowledged: true, acknowledgedNote: action.note, acknowledgedBy: EDITOR }
              : c),
        })),
        audit: audit(state, 'edited', `${article.title} · ${action.citationId}`,
          `资源未找到的引用已记录处理说明：${action.note}`, action.articleId),
      }
    }

    case 'attach-source': {
      const article = state.articles.find((a) => a.id === action.articleId)
      if (!article || article.sourceIds.includes(action.sourceId)) return state
      const src = state.sources.find((s) => s.id === action.sourceId)
      return {
        ...state,
        articles: mapArticle(state, action.articleId, (a) => ({ ...a, sourceIds: [...a.sourceIds, action.sourceId] })),
        audit: audit(state, 'edited', article.title, `加入来源：${src?.title ?? action.sourceId}`, action.articleId),
      }
    }

    case 'edit-block':
      return {
        ...state,
        articles: mapArticle(state, action.articleId, (a) => ({
          ...a,
          sections: a.sections.map((s) =>
            s.id !== action.sectionId ? s : {
              ...s,
              blocks: s.blocks.map((b) =>
                b.id === action.blockId && (b.type === 'paragraph' || b.type === 'heading' || b.type === 'pullquote')
                  ? { ...b, text: action.text }
                  : b),
            }),
        })),
      }

    case 'edit-meta':
      return {
        ...state,
        articles: mapArticle(state, action.articleId, (a) => ({ ...a, ...action.patch })),
      }

    case 'vibe-start':
      return {
        ...state,
        vibeRuns: [action.run, ...state.vibeRuns],
        audit: audit(state, 'vibe-instruction', '文章工作台', action.run.instruction, action.run.articleId),
      }

    case 'vibe-propose':
      return {
        ...state,
        versions: [...state.versions, action.version],
        vibeRuns: state.vibeRuns.map((r) =>
          r.id === action.runId
            ? { ...r, state: 'proposed', proposedVersionId: action.version.id, rationale: action.rationale, steps: r.steps.map((s) => ({ ...s, done: true })) }
            : r),
      }

    case 'vibe-adopt': {
      const run = state.vibeRuns.find((r) => r.id === action.runId)
      const version = state.versions.find((v) => v.id === run?.proposedVersionId)
      if (!run || !version) return state
      return {
        ...state,
        vibeRuns: state.vibeRuns.map((r) => (r.id === action.runId ? { ...r, state: 'adopted' } : r)),
        versions: state.versions.map((v) => (v.id === version.id ? { ...v, state: 'adopted' } : v)),
        articles: state.articles.map((a) =>
          a.id === version.articleId
            ? { ...version.snapshot, currentVersionId: version.id, updatedAt: nowIso(), status: a.status }
            : a),
        audit: audit(state, 'version-adopted', `${version.snapshot.title} · v${version.n}`, version.summary, version.articleId),
      }
    }

    case 'vibe-discard': {
      const run = state.vibeRuns.find((r) => r.id === action.runId)
      if (!run) return state
      return {
        ...state,
        vibeRuns: state.vibeRuns.map((r) => (r.id === action.runId ? { ...r, state: 'discarded' } : r)),
        versions: state.versions.map((v) => (v.id === run.proposedVersionId ? { ...v, state: 'discarded' } : v)),
        audit: audit(state, 'version-discarded', '文章工作台', `未采用：${run.instruction}`, run.articleId),
      }
    }

    case 'version-adopt': {
      const version = state.versions.find((v) => v.id === action.versionId)
      if (!version) return state
      return {
        ...state,
        versions: state.versions.map((v) => (v.id === version.id ? { ...v, state: 'adopted' } : v)),
        articles: state.articles.map((a) =>
          a.id === version.articleId
            ? { ...version.snapshot, currentVersionId: version.id, updatedAt: nowIso(), status: a.status }
            : a),
        audit: audit(state, 'version-adopted', `${version.snapshot.title} · v${version.n}`, version.summary, version.articleId),
      }
    }

    case 'version-discard':
      return {
        ...state,
        versions: state.versions.map((v) => (v.id === action.versionId ? { ...v, state: 'discarded' } : v)),
      }

    case 'asset-add':
      return {
        ...state,
        assets: [action.asset, ...state.assets],
        articles: action.asset.articleId
          ? mapArticle(state, action.asset.articleId, (a) => ({ ...a, assetIds: [action.asset.id, ...a.assetIds] }))
          : state.articles,
        audit: audit(state, 'image-generated', action.asset.label, action.asset.guardrail, action.asset.articleId, 'ai-desk'),
      }

    case 'asset-status': {
      const asset = state.assets.find((a) => a.id === action.assetId)
      if (!asset) return state
      return {
        ...state,
        assets: state.assets.map((a) => (a.id === action.assetId ? { ...a, status: action.status } : a)),
        audit: audit(state, action.status === 'approved' ? 'image-approved' : 'image-rejected', asset.label, `图片状态 → ${action.status}`, asset.articleId),
      }
    }

    case 'set-cover': {
      const article = state.articles.find((a) => a.id === action.articleId)
      if (!article) return state
      return {
        ...state,
        articles: mapArticle(state, action.articleId, (a) => ({
          ...a, assetIds: [action.assetId, ...a.assetIds.filter((id) => id !== action.assetId)],
        })),
        audit: audit(state, 'edited', article.title, '更换封面图。', action.articleId),
      }
    }

    case 'lock':
      return {
        ...state,
        lock: action.engaged
          ? { engaged: true, since: nowIso(), reason: action.reason, by: EDITOR }
          : { engaged: false },
        audit: audit(
          state,
          action.engaged ? 'lock-engaged' : 'lock-released',
          'Global Publishing Lock',
          action.engaged ? (action.reason || '未填写原因') : '发布已恢复。',
        ),
      }

    case 'signal-decline':
      return {
        ...state,
        signals: state.signals.map((s) =>
          s.id === action.signalId ? { ...s, status: 'declined', declineReason: action.reason } : s),
      }

    case 'signal-promote':
      return {
        ...state,
        signals: state.signals.map((s) => (s.id === action.signalId ? { ...s, status: 'drafted' } : s)),
      }

    case 'set-retrieval-engine': {
      const engine = ENGINE_MAP[action.engineId]
      // Authoring is not reassignable, so only the retrieval slot moves.
      if (!engine || !engine.jobs.includes('retrieval')) return state
      return {
        ...state,
        engines: { ...state.engines, retrieval: action.engineId },
        audit: audit(state, 'edited', '资料检索引擎', `检索引擎改为：${engine.name}`),
      }
    }

    case 'brief-sent': {
      const brief = state.briefs.find((b) => b.id === action.briefId)
      return {
        ...state,
        audit: audit(state, 'brief-sent', `Daily Editorial Brief · ${brief?.date ?? ''}`, '简报仅含摘要与安全链接；审批与发布只能在控制端完成。', undefined, 'system'),
      }
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
    // Stale or reshaped demo data is dropped rather than half-migrated.
    if (!parsed || parsed.__schema !== SCHEMA) return fresh
    if (!Array.isArray(parsed.articles) || parsed.articles.length !== fresh.articles.length) return fresh
    if (!Array.isArray(parsed.sources) || parsed.sources.length !== fresh.sources.length) return fresh
    // Version snapshots may have been dropped under storage pressure; restore
    // the deterministic ones from the freshly built dataset.
    const rebuilt = new Map(fresh.versions.map((v) => [v.id, v.snapshot]))
    const versions = parsed.versions.flatMap((v) => {
      if (v.snapshot) return [v]
      const snapshot = rebuilt.get(v.id) ?? parsed.articles.find((a) => a.id === v.articleId)
      // A version we can neither restore nor rebuild is dropped rather than
      // left dangling — the version list must never contain an empty snapshot.
      return snapshot ? [{ ...v, snapshot }] : []
    })
    return { ...parsed, versions }
  } catch {
    return fresh
  }
}

/**
 * Version snapshots are whole articles, so a corpus of long entries can push
 * past the ~5MB localStorage budget. Degrade in stages rather than losing the
 * editor's decisions: full state first, then without the snapshots that
 * buildInitialState() can deterministically rebuild, then metadata only.
 */
function persist(state: PrismState): void {
  const attempts: (() => string)[] = [
    () => JSON.stringify({ ...state, __schema: SCHEMA }),
    () => JSON.stringify({
      ...state,
      __schema: SCHEMA,
      versions: state.versions.map((v) =>
        v.state === 'proposal' || state.articles.some((a) => a.currentVersionId === v.id)
          ? v
          : { ...v, snapshot: undefined }),
    }),
    () => JSON.stringify({
      ...state,
      __schema: SCHEMA,
      versions: state.versions.map((v) => ({ ...v, snapshot: undefined })),
      audit: state.audit.slice(0, 120),
    }),
  ]
  for (const attempt of attempts) {
    try {
      window.localStorage.setItem(STORAGE_KEY, attempt())
      return
    } catch {
      /* quota exceeded or storage unavailable — try the next, smaller shape */
    }
  }
}

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

interface PrismContextValue {
  state: PrismState
  dispatch: React.Dispatch<Action>
  resetDemo: () => void
}

const PrismContext = createContext<PrismContextValue | null>(null)

export function PrismProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    persist(state)
  }, [state])

  const resetDemo = useCallback(() => {
    try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    dispatch({ type: 'reset' })
  }, [])

  const value = useMemo(() => ({ state, dispatch, resetDemo }), [state, resetDemo])
  return <PrismContext.Provider value={value}>{children}</PrismContext.Provider>
}

export function usePrism(): PrismContextValue {
  const ctx = useContext(PrismContext)
  if (!ctx) throw new Error('usePrism must be used inside <PrismProvider>')
  return ctx
}

export function useArticle(idOrSlug: string | undefined): Article | undefined {
  const { state } = usePrism()
  return useMemo(
    () => state.articles.find((a) => a.id === idOrSlug || a.slug === idOrSlug),
    [state.articles, idOrSlug],
  )
}
