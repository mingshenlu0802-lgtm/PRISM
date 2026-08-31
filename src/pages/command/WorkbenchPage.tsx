import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import type { Article, CitationCheck, SectionKind } from '../../lib/types'
import { SECTION_LABEL, SOURCE_TYPE_LABEL } from '../../lib/constants'
import { useArticle, usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { articleWordCount, citationNumbers, cx, fmtDateTime, relTime, nowIso } from '../../lib/util'

import {
  Badge, DemoTag, EmptyState, Field, Icon, Meter, Modal, RiskChip, Segmented,
  StatusBadge, TextArea, TopicChip, toast,
} from '../../components/common'
import { ArticleBody, sectionAnchor } from '../../components/public/ArticleBody'
import { SourceDrawer } from '../../components/public/SourceDrawer'
import { FactCheckCard } from '../../components/public/FactCheckCard'
import { ConceptImage } from '../../components/visual/ConceptImage'

import { SourcePanel } from '../../components/command/SourcePanel'
import { AssistantPanel } from '../../components/command/AssistantPanel'
import type { AssistantAction } from '../../components/command/AssistantPanel'
import { VibeConsole } from '../../components/command/VibeConsole'
import { RiskPanel } from '../../components/command/RiskPanel'
import { DecisionBar } from '../../components/command/DecisionBar'
import { PublishDialog } from '../../components/command/PublishDialog'
import type { PublishMode } from '../../components/command/PublishDialog'

import './WorkbenchPage.css'

/**
 * 文章工作台 — the three-column editing console.
 *
 *   材料 (left)   every record the entry rests on, plus the unattached pool
 *   文章 (centre) the entry itself, editable in place
 *   助手 (right)  the desk's read, the vibe console, the checks, the risks,
 *                 and the publish gate
 *
 * The console never publishes on its own: the desk can propose, flag and check,
 * but every state change on this page is an explicit act by the editor, and
 * every one of them lands in the audit trail.
 */

type ViewKey = 'sources' | 'article' | 'assist'
type TabKey = 'assistant' | 'vibe' | 'factcheck' | 'risk' | 'publish'

const CHECK_META: Record<CitationCheck['status'], { zh: string; tone: 'go' | 'warn' | 'stop'; mark: string }> = {
  pass: { zh: '通过', tone: 'go', mark: '✓' },
  warn: { zh: '保留', tone: 'warn', mark: '!' },
  fail: { zh: '未通过', tone: 'stop', mark: '✕' },
}

const TRANSLATION_STATUS: Record<string, { zh: string; tone: 'go' | 'warn' | 'neutral' }> = {
  'human-reviewed': { zh: '人工校订', tone: 'go' },
  'machine-draft': { zh: '机器初稿', tone: 'warn' },
  'not-started': { zh: '未开始', tone: 'neutral' },
}

const MIN_ACK = 10

function reduceMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* ------------------------------------------------------------------ *
 * Auto-growing editable field
 * ------------------------------------------------------------------ */

interface GrowFieldProps {
  id: string
  label: string
  value: string
  onCommit: (next: string) => void
  className: string
  placeholder: string
  readOnly?: boolean
}

function GrowField({ id, label, value, onCommit, className, placeholder, readOnly = false }: GrowFieldProps): JSX.Element {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  return (
    <>
      <label className="u-sr" htmlFor={id}>{label}</label>
      <textarea
        id={id}
        ref={ref}
        className={className}
        value={draft}
        rows={1}
        readOnly={readOnly}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={() => {
          const next = draft.trim()
          if (readOnly || next === value) return
          if (next.length === 0) { setDraft(value); return }
          onCommit(next)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setDraft(value); e.currentTarget.blur() }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.blur()
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

export default function WorkbenchPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const article = useArticle(id)

  if (!article) {
    return (
      <div className="wbp wbp--missing">
        <EmptyState
          title="找不到这篇条目"
          hint="链接可能已过期，或演示数据已被重置。回到审批队列重新选择一篇。"
          icon="search"
          action={<Link className="wbp__backlink" to="/command/queue">返回审批队列</Link>}
        />
      </div>
    )
  }

  return <Workbench key={article.id} article={article} />
}

/* ------------------------------------------------------------------ */

function Workbench({ article }: { article: Article }): JSX.Element {
  const { state, dispatch } = usePrism()
  const navigate = useNavigate()

  const [view, setView] = useState<ViewKey>('article')
  const [tab, setTab] = useState<TabKey>('assistant')
  const [citationId, setCitationId] = useState<string | null>(null)
  const [ackTarget, setAckTarget] = useState<CitationCheck | null>(null)
  const [ackNote, setAckNote] = useState('')
  const [publishMode, setPublishMode] = useState<PublishMode | null>(null)

  const centreRef = useRef<HTMLElement | null>(null)
  const leftRef = useRef<HTMLElement | null>(null)
  const langRef = useRef<HTMLDivElement | null>(null)

  const originalLang = useMemo(() => {
    const original = article.translations.find((t) => t.label.includes('原文'))
    return original?.lang ?? article.translations[0]?.lang ?? 'zh-Hans'
  }, [article.translations])
  const [lang, setLang] = useState(originalLang)
  useEffect(() => { setLang(originalLang) }, [originalLang])

  const numbers = useMemo(() => citationNumbers(article), [article])
  const gate = useMemo(() => sel.publishGate(article, state), [article, state])
  const profile = useMemo(() => sel.sourceProfile(article, state), [article, state])
  const health = useMemo(() => sel.citationHealth(article), [article])
  const version = useMemo(() => sel.currentVersion(state, article), [state, article])
  const versionCount = useMemo(
    () => state.versions.filter((v) => v.articleId === article.id).length,
    [state.versions, article.id],
  )
  const proposals = useMemo(() => sel.proposalsOf(state, article.id), [state, article.id])
  const factChecks = useMemo(
    () => state.factChecks.filter((f) => article.factCheckIds.includes(f.id)),
    [state.factChecks, article.factCheckIds],
  )
  const assets = useMemo(
    () => article.assetIds.map((x) => state.assets.find((a) => a.id === x)).filter((a): a is NonNullable<typeof a> => Boolean(a)),
    [article.assetIds, state.assets],
  )
  const charts = useMemo(
    () => article.chartIds.map((x) => state.charts.find((c) => c.id === x)).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [article.chartIds, state.charts],
  )
  const openRisks = sel.openRisks(article)
  const blocking = sel.blockingChecks(article)
  const words = useMemo(() => articleWordCount(article), [article])

  const translation = article.translations.find((t) => t.lang === lang)
  const isOriginal = lang === originalLang
  const machineDraft = translation?.status === 'machine-draft'
  const notStarted = translation?.status === 'not-started'

  const shownTitle = isOriginal ? article.title : translation?.title ?? article.title
  const shownStandfirst = isOriginal ? article.standfirst : translation?.standfirst ?? article.standfirst

  /* ------------------------------ actions ------------------------------ */

  const jump = (kind: SectionKind) => {
    const el = centreRef.current?.querySelector(`#${sectionAnchor(kind)}`)
    if (!(el instanceof HTMLElement)) return
    el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
  }

  const editBlock = (sectionId: string, blockId: string, text: string) => {
    dispatch({ type: 'edit-block', articleId: article.id, sectionId, blockId, text })
    toast('已写入当前工作副本。发布前请在版本比对中复核。', 'info')
  }

  const commitTitle = (next: string) => {
    dispatch({ type: 'edit-meta', articleId: article.id, patch: { title: next } })
    toast('标题已更新。', 'go')
  }

  const commitStandfirst = (next: string) => {
    dispatch({ type: 'edit-meta', articleId: article.id, patch: { standfirst: next } })
    toast('导语已更新。', 'go')
  }

  const recheck = () => {
    dispatch({ type: 'recheck-citations', articleId: article.id })
    toast('已重新核查全部 references：未通过项不会被自动改判。', 'info')
  }

  const submitAck = () => {
    if (!ackTarget || ackNote.trim().length < MIN_ACK) return
    dispatch({ type: 'ack-citation', articleId: article.id, citationId: ackTarget.citationId, note: ackNote.trim() })
    toast('已记录处理说明：该项仍显示为未通过，但不再阻断发布。', 'go')
    setAckTarget(null)
    setAckNote('')
  }

  /** Roving-tabindex keyboard support for the language tab row. */
  const onLangKey = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = {
      ArrowRight: index + 1, ArrowDown: index + 1,
      ArrowLeft: index - 1, ArrowUp: index - 1,
      Home: 0, End: article.translations.length - 1,
    }
    const next = keys[event.key]
    if (next === undefined) return
    event.preventDefault()
    const total = article.translations.length
    const target = article.translations[((next % total) + total) % total]
    if (!target) return
    setLang(target.lang)
    const button = langRef.current?.querySelector<HTMLButtonElement>(`#wbp-lang-${CSS.escape(target.lang)}`)
    button?.focus()
  }

  const handleAssistant = (action: AssistantAction) => {
    switch (action) {
      case 'sources':
        setView('sources')
        leftRef.current?.focus({ preventScroll: true })
        leftRef.current?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' })
        break
      case 'factcheck': setTab('factcheck'); setView('assist'); break
      case 'risk': setTab('risk'); setView('assist'); break
      case 'vibe': setTab('vibe'); setView('assist'); break
      case 'publish': setTab('publish'); setView('assist'); break
      case 'versions': navigate(`/command/article/${article.id}/versions`); break
    }
  }

  /* ------------------------------- render ------------------------------ */

  return (
    <div className={cx('wbp', `wbp--view-${view}`)}>
      {/* ------------------------------ top bar --------------------------- */}
      <header className="wbp__top">
        <div className="wbp__crumbs">
          <Link className="wbp__crumb" to="/command/queue">
            <Icon name="chevron-left" size={12} />
            审批队列
          </Link>
          <span className="wbp__crumbsep" aria-hidden="true">/</span>
          <span className="wbp__crumbnow">文章工作台</span>
          <DemoTag compact />
        </div>

        <div className="wbp__topmeta">
          <StatusBadge status={article.status} />
          <Badge tone="neutral" size="sm" icon={<Icon name="layers" size={11} />}>
            当前 v{version?.n ?? 1} · 共 {versionCount} 版
          </Badge>
          {proposals.length > 0 ? (
            <Badge tone="warn" size="sm" icon={<Icon name="clock" size={11} />}>
              {proposals.length} 份提案待确认
            </Badge>
          ) : null}
          {blocking.length > 0 ? (
            <Badge tone="stop" size="sm" icon={<Icon name="lock" size={11} />}>
              {blocking.length} 项引用阻断发布
            </Badge>
          ) : null}
          <span className="wbp__updated">
            更新于 {relTime(article.updatedAt, nowIso())}
            <span className="u-sr">（{fmtDateTime(article.updatedAt)}）</span>
          </span>
        </div>

        <nav className="wbp__toplinks" aria-label="本条目的其他工作台">
          <Link className="wbp__toplink" to={`/command/article/${article.id}/versions`}>
            <Icon name="diff" size={13} />
            版本比对
          </Link>
          <Link className="wbp__toplink" to={`/command/article/${article.id}/studio`}>
            <Icon name="image" size={13} />
            视觉工作台
          </Link>
          {article.status === 'published' || article.status === 'update-needed' || article.status === 'retracted' ? (
            <Link className="wbp__toplink" to={`/article/${article.slug}`}>
              <Icon name="external" size={13} />
              公开页面
            </Link>
          ) : (
            <span className="wbp__toplink wbp__toplink--off">
              <Icon name="eye-off" size={13} />
              尚未公开
            </span>
          )}
        </nav>
      </header>

      <div className="wbp__switch">
        <Segmented<ViewKey>
          value={view}
          onChange={setView}
          ariaLabel="工作台视图"
          size="sm"
          options={[
            { value: 'sources', label: '材料', count: profile.total },
            { value: 'article', label: '文章' },
            { value: 'assist', label: '助手', count: openRisks.length + blocking.length },
          ]}
        />
      </div>

      <div className="wbp__grid">
        {/* ------------------------------ 材料 ---------------------------- */}
        <section className="wbp__col wbp__col--left" aria-label="材料" ref={leftRef} tabIndex={-1}>
          <SourcePanel article={article} />
        </section>

        {/* ------------------------------ 文章 ---------------------------- */}
        <section className="wbp__col wbp__col--centre" aria-label="文章" ref={centreRef}>
          <div className="wbp__doc">
            <header className="wbp__dochead">
              <div className="wbp__docmeta">
                {article.topics.map((t) => <TopicChip key={t} topic={t} size="sm" />)}
                <span className="wbp__docwhere">{article.countries.join('、')} · {article.region}</span>
              </div>

              <GrowField
                id="wbp-title"
                label="文章标题"
                value={shownTitle}
                onCommit={commitTitle}
                className="wbp__title"
                placeholder="写下这篇条目的标题"
                readOnly={!isOriginal}
              />
              <GrowField
                id="wbp-standfirst"
                label="导语"
                value={shownStandfirst}
                onCommit={commitStandfirst}
                className="wbp__standfirst"
                placeholder="用两三句话说明这篇条目处理了什么、以及它的证据边界在哪里"
                readOnly={!isOriginal}
              />

              <p className="wbp__editnote">
                {isOriginal
                  ? '标题与导语可直接编辑，失焦即保存到当前工作副本；按 Esc 放弃本次修改。'
                  : '译文条目只读：本原型的翻译记录由自动编辑台维护，正文修改一律回到原文进行。'}
              </p>

              <dl className="wbp__docstats">
                <div className="wbp__docstat">
                  <dt>字数</dt>
                  <dd className="u-num">{words}</dd>
                </div>
                <div className="wbp__docstat">
                  <dt>阅读</dt>
                  <dd className="u-num">{article.readingTime} 分钟</dd>
                </div>
                <div className="wbp__docstat">
                  <dt>引用</dt>
                  <dd className="u-num">{article.citations.length}</dd>
                </div>
                <div className="wbp__docstat">
                  <dt>来源</dt>
                  <dd className="u-num">{profile.total}</dd>
                </div>
              </dl>

              <div className="wbp__docmeters">
                <Meter value={article.confidence} label="整体可信度" size="sm" hint={article.confidenceBasis} />
                <Meter value={health} label="引用核查健康度" size="sm" />
              </div>

              <p className="wbp__byline">
                <Icon name="users" size={12} />
                {article.byline}
              </p>

              {article.contentNotice ? (
                <p className="wbp__notice" role="note">
                  <Icon name="alert" size={13} />
                  <span><b>内容提示</b>：{article.contentNotice}</span>
                </p>
              ) : null}
            </header>

            {/* --------------------------- languages ------------------------ */}
            <div className="wbp__langs">
              <p className="wbp__langlab" id="wbp-lang-label">语言版本</p>
              <div className="wbp__langrow" role="tablist" aria-labelledby="wbp-lang-label" ref={langRef}>
                {article.translations.map((t, i) => {
                  const meta = TRANSLATION_STATUS[t.status]
                  const on = t.lang === lang
                  return (
                    <button
                      key={t.lang}
                      type="button"
                      role="tab"
                      id={`wbp-lang-${t.lang}`}
                      aria-selected={on}
                      aria-controls="wbp-lang-panel"
                      tabIndex={on ? 0 : -1}
                      className={cx('wbp__lang', on && 'wbp__lang--on', `wbp__lang--${t.status}`)}
                      onClick={() => setLang(t.lang)}
                      onKeyDown={(e) => onLangKey(e, i)}
                    >
                      <span className="wbp__langname">{t.label}</span>
                      <span className="wbp__langstate">{meta ? meta.zh : t.status}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div id="wbp-lang-panel" role="tabpanel" aria-labelledby={`wbp-lang-${lang}`} className="wbp__langpanel">
              {machineDraft ? (
                <p className="wbp__mtbanner" role="note">
                  <Icon name="alert" size={14} />
                  <span>
                    <b>机器初稿，未经人工校订。</b>
                    这一语言版本的标题与导语由自动编辑台生成，尚未经过人工语言校订，不得作为对外发布的定稿使用。
                    下方正文始终是原文（{article.translations.find((t) => t.lang === originalLang)?.label ?? '原文'}），未随语言切换。
                  </span>
                </p>
              ) : null}
              {notStarted ? (
                <p className="wbp__mtbanner wbp__mtbanner--off" role="note">
                  <Icon name="clock" size={14} />
                  <span>
                    <b>此语言尚未开始翻译。</b>
                    上方显示的仍是原文标题与导语。翻译不会自动生成：本站要求每个语言版本都要经过人工校订才能对外。
                  </span>
                </p>
              ) : null}
              {!isOriginal && !machineDraft && !notStarted ? (
                <p className="wbp__mtbanner wbp__mtbanner--ok" role="note">
                  <Icon name="check-double" size={14} />
                  <span>
                    <b>已经过人工校订。</b>正文仍以原文为准；此处显示的是该语言版本的标题与导语。
                  </span>
                </p>
              ) : null}
            </div>

            {/* -------------------------- section jump ---------------------- */}
            <nav className="wbp__jump" aria-label="跳转到章节">
              <span className="wbp__jumplab">章节</span>
              <ul className="wbp__jumplist">
                {article.sections.map((s, i) => (
                  <li key={s.id}>
                    <button type="button" className="wbp__jumpbtn" onClick={() => jump(s.kind)}>
                      <span className="wbp__jumpn u-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                      {SECTION_LABEL[s.kind]?.zh ?? s.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* ------------------------------ body -------------------------- */}
            <ArticleBody
              article={article}
              numbers={numbers}
              onCite={setCitationId}
              editable
              onEditBlock={editBlock}
              anchors
            />

            {/* ---------------------------- references ---------------------- */}
            <section className="wbp__after" aria-label="参考文献与素材">
              <div className="wbp__refcount">
                <h3 className="wbp__aftertitle">
                  <Icon name="quote" size={13} />
                  参考文献
                </h3>
                <p className="wbp__reftext">
                  正文共 <b className="u-num">{article.citations.length}</b> 条引用，指向
                  {' '}<b className="u-num">{profile.total}</b> 份来源，其中一手记录
                  {' '}<b className="u-num">{profile.primary}</b> 份、独立来源
                  {' '}<b className="u-num">{profile.independent}</b> 家，覆盖
                  {' '}<b className="u-num">{profile.languages.length}</b> 种语言与
                  {' '}<b className="u-num">{profile.countries.length}</b> 个辖区。
                  完整的来源卡片在左栏「材料」中逐条列出，点击正文任意 [n] 可直接打开对应记录。
                </p>
              </div>

              <div className="wbp__media">
                <h3 className="wbp__aftertitle">
                  <Icon name="image" size={13} />
                  本文使用的图像（{assets.length}）
                </h3>
                {assets.length === 0 ? (
                  <p className="wbp__mediaempty">这篇条目还没有任何图像素材。</p>
                ) : (
                  <ul className="wbp__assets">
                    {assets.map((asset) => (
                      <li key={asset.id} className="wbp__asset">
                        <ConceptImage asset={asset} ratio="3-2" />
                        <div className="wbp__assetmeta">
                          <p className="wbp__assetlabel">{asset.label}</p>
                          <p className="wbp__assetsub">
                            <Badge
                              tone={asset.status === 'approved' ? 'go' : asset.status === 'rejected' ? 'stop' : 'warn'}
                              size="sm"
                            >
                              {asset.status === 'approved' ? '已通过' : asset.status === 'rejected' ? '已否决' : '待审核'}
                            </Badge>
                            <span className="wbp__assetkind">{asset.kind}</span>
                          </p>
                          <p className="wbp__assetguard">{asset.guardrail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Link className="wbp__medialink" to={`/command/article/${article.id}/studio`}>
                  <Icon name="arrow-right" size={12} />
                  在视觉工作台中审批或重做
                </Link>
              </div>

              <div className="wbp__media">
                <h3 className="wbp__aftertitle">
                  <Icon name="chart" size={13} />
                  本文使用的图表（{charts.length}）
                </h3>
                {charts.length === 0 ? (
                  <p className="wbp__mediaempty">这篇条目没有图表。</p>
                ) : (
                  <ul className="wbp__charts">
                    {charts.map((chart) => (
                      <li key={chart.id} className="wbp__chartrow">
                        <p className="wbp__charttitle">{chart.title}</p>
                        <p className="wbp__chartmeta">
                          <Badge tone="neutral" size="sm">{chart.kind}</Badge>
                          <span>单位：{chart.unit}</span>
                          <span>{chart.sourceNote}</span>
                        </p>
                        <p className="wbp__chartlimit">
                          <span className="wbp__chartlimitlab">本图无法说明</span>
                          {chart.limitation}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </section>

        {/* ------------------------------ 助手 ---------------------------- */}
        <section className="wbp__col wbp__col--right" aria-label="助手">
          <div className="wbp__tabs">
            <Segmented<TabKey>
              value={tab}
              onChange={setTab}
              ariaLabel="助手面板"
              size="sm"
              options={[
                { value: 'assistant', label: 'AI 编辑助手' },
                { value: 'vibe', label: 'Vibe Coding' },
                { value: 'factcheck', label: '事实检查', count: factChecks.length },
                { value: 'risk', label: '风险提示', count: openRisks.length },
                { value: 'publish', label: '发布控制', count: gate.blockers.length },
              ]}
            />
          </div>

          <div className="wbp__panel">
            {tab === 'assistant' ? <AssistantPanel article={article} onAction={handleAssistant} /> : null}

            {tab === 'vibe' ? <VibeConsole article={article} /> : null}

            {tab === 'risk' ? <RiskPanel article={article} /> : null}

            {/* ---------------------------- 事实检查 ---------------------- */}
            {tab === 'factcheck' ? (
              <div className="wbp__fc">
                <section aria-label="本条目的事实核查">
                  <h3 className="wbp__sectiontitle">
                    <Icon name="check-double" size={13} />
                    事实核查（{factChecks.length}）
                  </h3>
                  {factChecks.length === 0 ? (
                    <p className="wbp__note">
                      这篇条目没有独立的事实核查条目。核查针对的是「正在流传的具体说法」，
                      不是文章本身；没有流传中的说法时，不硬造一条。
                    </p>
                  ) : (
                    <ul className="wbp__fclist">
                      {factChecks.map((check) => (
                        <li key={check.id}>
                          <FactCheckCard check={check} article={article} compact />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-label="引用检查表">
                  <div className="wbp__fchead">
                    <h3 className="wbp__sectiontitle">
                      <Icon name="link" size={13} />
                      引用检查（{article.citationChecks.length}）
                    </h3>
                    <button type="button" className="wbp__recheck" onClick={recheck}>
                      <Icon name="refresh" size={13} />
                      重新核查全部 references
                    </button>
                  </div>
                  <p className="wbp__note">
                    重新核查不会把「未通过」洗成「通过」，也不会清除已记录的处理说明。
                    未通过且未处理的项会硬性阻断发布；写下处理说明后它仍显示为未通过，但不再阻断。
                  </p>

                  {article.citationChecks.length === 0 ? (
                    <p className="wbp__note">这篇条目还没有引用检查记录。</p>
                  ) : (
                    <div className="wbp__tablewrap">
                      <table className="wbp__table">
                        <caption className="u-sr">
                          本条目每一条引用的自动核查结果，含状态、核查说明与处理记录。
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">编号</th>
                            <th scope="col">结果</th>
                            <th scope="col">引用所承载的论断</th>
                            <th scope="col">核查说明</th>
                            <th scope="col">处理</th>
                          </tr>
                        </thead>
                        <tbody>
                          {article.citationChecks.map((check) => {
                            const meta = CHECK_META[check.status]
                            const citation = article.citations.find((c) => c.id === check.citationId)
                            return (
                              <tr key={check.citationId} className={`wbp__trow wbp__trow--${check.status}`}>
                                <th scope="row" className="wbp__tn u-num">
                                  <button
                                    type="button"
                                    className="wbp__tnbtn"
                                    onClick={() => setCitationId(check.citationId)}
                                    aria-label={`打开引用 ${numbers.get(check.citationId) ?? ''} 的来源记录`}
                                  >
                                    [{numbers.get(check.citationId) ?? '—'}]
                                  </button>
                                </th>
                                <td>
                                  <span className={cx('wbp__status', `wbp__status--${check.status}`)}>
                                    <span className="wbp__statusmark" aria-hidden="true">{meta.mark}</span>
                                    {meta.zh}
                                  </span>
                                  {check.acknowledged ? (
                                    <span className="wbp__acked">已记录处理说明</span>
                                  ) : null}
                                </td>
                                <td className="wbp__tclaim">{citation?.claim ?? check.citationId}</td>
                                <td className="wbp__treason">
                                  {check.reason}
                                  {check.acknowledgedNote ? (
                                    <span className="wbp__tack">处理说明：{check.acknowledgedNote}</span>
                                  ) : null}
                                  <span className="wbp__tat u-num">{fmtDateTime(check.checkedAt)}</span>
                                </td>
                                <td>
                                  {check.status === 'fail' && !check.acknowledged ? (
                                    <button
                                      type="button"
                                      className="wbp__ackbtn"
                                      onClick={() => { setAckTarget(check); setAckNote('') }}
                                    >
                                      记录处理说明
                                    </button>
                                  ) : (
                                    <span className="wbp__tnone">—</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            ) : null}

            {/* ---------------------------- 发布控制 ---------------------- */}
            {tab === 'publish' ? (
              <div className="wbp__pub">
                <section className="wbp__gate" aria-label="发布前校验">
                  <h3 className="wbp__sectiontitle">
                    <Icon name="shield" size={13} />
                    发布前校验
                  </h3>

                  {gate.lockEngaged ? (
                    <p className="wbp__lock" role="status">
                      <Icon name="lock" size={14} />
                      <span>
                        <b>Global Publishing Lock 已开启。</b>
                        全站公开发布被暂停：批准仍会被记录，但内容不会公开。解除锁在「发布控制」设置页。
                      </span>
                    </p>
                  ) : null}

                  <div className="wbp__gategroup wbp__gategroup--stop">
                    <h4 className="wbp__gatetitle">
                      <Icon name="x" size={12} />
                      阻断项（{gate.blockers.length}）
                    </h4>
                    {gate.blockers.length === 0 ? (
                      <p className="wbp__gateok">没有阻断项。</p>
                    ) : (
                      <ul className="wbp__gatelist">
                        {gate.blockers.map((b) => <li key={b}>{b}</li>)}
                      </ul>
                    )}
                  </div>

                  <div className="wbp__gategroup wbp__gategroup--warn">
                    <h4 className="wbp__gatetitle">
                      <Icon name="alert" size={12} />
                      须阅读的警告（{gate.warnings.length}）
                    </h4>
                    {gate.warnings.length === 0 ? (
                      <p className="wbp__gateok">没有需要确认的警告。</p>
                    ) : (
                      <ul className="wbp__gatelist">
                        {gate.warnings.map((w) => <li key={w}>{w}</li>)}
                      </ul>
                    )}
                  </div>

                  <div className="wbp__gategroup wbp__gategroup--confirm">
                    <h4 className="wbp__gatetitle">
                      <Icon name="lock" size={12} />
                      敏感内容二次确认（{gate.confirmations.length}）
                    </h4>
                    {gate.confirmations.length === 0 ? (
                      <p className="wbp__gateok">没有需要键入确认短语的敏感类别。</p>
                    ) : (
                      <ul className="wbp__gatechips">
                        {gate.confirmations.map((flag) => (
                          <li key={flag.id}>
                            <RiskChip flag={flag} compact onClick={() => setTab('risk')} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                <section aria-label="审批决定">
                  <h3 className="wbp__sectiontitle">
                    <Icon name="send" size={13} />
                    审批决定
                  </h3>
                  <p className="wbp__note">
                    七个决定都会写入操作记录。自动编辑台没有发布权限：无论它的检查结果多干净，
                    这一步只能由你来做。
                  </p>
                  <DecisionBar article={article} layout="grid" />
                </section>

                {article.status === 'published' || article.status === 'update-needed' || article.status === 'retracted' ? (
                  <section aria-label="已发布内容的更正与撤回">
                    <h3 className="wbp__sectiontitle">
                      <Icon name="history" size={13} />
                      已发布内容
                    </h3>
                    <p className="wbp__note">
                      已发布的条目不静默修改：更正、澄清、更新与撤回都会作为公开记录永久保留。
                    </p>
                    <div className="wbp__pubbtns">
                      <button type="button" className="wbp__pubbtn" onClick={() => setPublishMode('update')}>
                        <Icon name="edit" size={13} />
                        发布更正／更新说明
                      </button>
                      <button type="button" className="wbp__pubbtn wbp__pubbtn--stop" onClick={() => setPublishMode('retract')}>
                        <Icon name="archive" size={13} />
                        撤回这篇条目
                      </button>
                    </div>
                    {article.corrections.length > 0 ? (
                      <ol className="wbp__corrections">
                        {article.corrections.map((c) => (
                          <li key={c.id} className="wbp__correction">
                            <span className="wbp__correctionkind">{c.kind}</span>
                            <span className="wbp__correctiontext">{c.text}</span>
                            <span className="wbp__correctionat u-num">{fmtDateTime(c.at)} · {c.by}</span>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </section>
                ) : null}

                <nav className="wbp__publinks" aria-label="相关工作台">
                  <Link className="wbp__toplink" to={`/command/article/${article.id}/versions`}>
                    <Icon name="diff" size={13} />
                    版本历史（{versionCount} 版{proposals.length > 0 ? ` · ${proposals.length} 份待确认` : ''}）
                  </Link>
                  <Link className="wbp__toplink" to={`/command/article/${article.id}/studio`}>
                    <Icon name="image" size={13} />
                    视觉工作台（{assets.length} 份素材）
                  </Link>
                </nav>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {/* ------------------------------ overlays --------------------------- */}
      <SourceDrawer
        article={article}
        citationId={citationId}
        onClose={() => setCitationId(null)}
      />

      <PublishDialog
        article={article}
        open={publishMode !== null}
        mode={publishMode ?? 'update'}
        onClose={() => setPublishMode(null)}
      />

      <Modal
        open={ackTarget !== null}
        onClose={() => { setAckTarget(null); setAckNote('') }}
        title="记录引用检查未通过项的处理说明"
        subtitle={ackTarget ? `引用 [${numbers.get(ackTarget.citationId) ?? '—'}] · ${ackTarget.citationId}` : undefined}
        width="md"
        footer={
          <>
            <button type="button" className="wbp__modalbtn" onClick={() => { setAckTarget(null); setAckNote('') }}>
              取消
            </button>
            <button
              type="button"
              className="wbp__modalbtn wbp__modalbtn--go"
              onClick={submitAck}
              disabled={ackNote.trim().length < MIN_ACK}
            >
              <Icon name="check" size={14} />
              记录并解除阻断
            </button>
          </>
        }
      >
        {ackTarget ? (
          <div className="wbp__ackbody">
            <p className="wbp__ackclaim">
              {article.citations.find((c) => c.id === ackTarget.citationId)?.claim ?? ackTarget.citationId}
            </p>
            <p className="wbp__ackreason">
              <span className="wbp__ackreasonlab">核查说明</span>
              {ackTarget.reason}
            </p>
            {(() => {
              const citation = article.citations.find((c) => c.id === ackTarget.citationId)
              const source = citation ? state.sources.find((s) => s.id === citation.sourceId) : undefined
              return source ? (
                <p className="wbp__acksource">
                  来源：{source.publisher} · {SOURCE_TYPE_LABEL[source.sourceType].zh}
                  {source.caution ? ` · 使用提示：${source.caution}` : ''}
                </p>
              ) : null
            })()}
            <Field
              label="处理说明"
              required
              hint={`写明你对正文做了什么，让这句话不再依赖这条引用。不少于 ${MIN_ACK} 个字。该项仍会显示为「未通过」，但不再阻断发布。`}
            >
              <TextArea
                value={ackNote}
                rows={5}
                onChange={(e) => setAckNote(e.currentTarget.value)}
                placeholder="例：该句已改为「据该通讯社通稿」，不再作为事实陈述；同时删去引用该数字的因果表述，并在「尚未确定的信息」中写明未取得独立复核。"
              />
            </Field>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
