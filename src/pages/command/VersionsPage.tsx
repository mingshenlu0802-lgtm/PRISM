import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { ID, Source, Version } from '../../lib/types'
import { usePrism, useArticle } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { diffArticles, diffRefs } from '../../lib/diff'
import { STATUS_LABEL } from '../../lib/constants'
import { articleWordCount, cx, fmtDateTime } from '../../lib/util'
import {
  Badge, EmptyState, Field, Icon, Modal, Select, SourceCard, StatusBadge, TopicChip, toast,
} from '../../components/common'
import { PanelCard } from '../../components/command/PanelCard'
import { DiffView } from '../../components/command/DiffView'
import { ConceptImage } from '../../components/visual/ConceptImage'
import './VersionsPage.css'

/**
 * 版本历史 — every revision this entry has ever had, and what any two of them
 * differ by.
 *
 * The rule this page exists to enforce (编辑方法 §8): a revision NEVER
 * overwrites its predecessor. Adopting a proposal writes a new current version
 * and leaves every earlier snapshot in place — which is why 「采用」 is safe to
 * offer, and why it still goes through a confirmation that spells out exactly
 * what the entry will look like afterwards.
 *
 * The most dangerous change is the quiet one: a rewrite that drops a source.
 * So the reference delta is never folded into a count — it is resolved to full
 * source records, and a removal is called out in coral on every surface here.
 */

const AUTHOR_META: Record<Version['author'], { zh: string; en: string; icon: 'sparkle' | 'edit'; cls: string }> = {
  'ai-desk': { zh: '自动编辑台', en: 'Automated desk', icon: 'sparkle', cls: 'desk' },
  editor: { zh: '主编', en: 'Editor', icon: 'edit', cls: 'editor' },
}

const STATE_META: Record<Version['state'], { zh: string; tone: 'go' | 'warn' | 'neutral'; icon: 'check-double' | 'clock' | 'archive' }> = {
  adopted: { zh: '已采用', tone: 'go', icon: 'check-double' },
  proposal: { zh: '提案 · 待确认', tone: 'warn', icon: 'clock' },
  discarded: { zh: '未采用', tone: 'neutral', icon: 'archive' },
}

function versionOptionLabel(v: Version, currentId: string): string {
  const marks: string[] = []
  if (v.id === currentId) marks.push('当前')
  if (v.state === 'proposal') marks.push('提案')
  if (v.state === 'discarded') marks.push('未采用')
  return `v${v.n} · ${v.label}${marks.length > 0 ? `（${marks.join(' · ')}）` : ''}`
}

export default function VersionsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const article = useArticle(id)
  const { state, dispatch } = usePrism()
  const [searchParams, setSearchParams] = useSearchParams()
  const [confirm, setConfirm] = useState<{ kind: 'adopt' | 'discard'; versionId: ID } | null>(null)
  const [openRefs, setOpenRefs] = useState<string[]>([])

  const versions = useMemo(
    () => (article ? sel.versionsOf(state, article.id) : []),
    [state, article],
  )
  const current = article ? sel.currentVersion(state, article) : undefined
  const proposals = versions.filter((v) => v.state === 'proposal')

  const sourceById = useMemo(() => {
    const map = new Map<ID, Source>()
    for (const s of state.sources) map.set(s.id, s)
    return map
  }, [state.sources])

  /* --------------------------- selected pair --------------------------- */

  const defaults = useMemo(() => {
    if (versions.length === 0) return { base: '', cmp: '' }
    const cmpId = current?.id ?? versions[0].id
    const idx = versions.findIndex((v) => v.id === cmpId)
    const previous = versions[idx + 1] ?? versions.find((v) => v.id !== cmpId)
    return { base: previous?.id ?? cmpId, cmp: cmpId }
  }, [versions, current])

  const rawBase = searchParams.get('base')
  const rawCmp = searchParams.get('cmp')
  const baseId = rawBase && versions.some((v) => v.id === rawBase) ? rawBase : defaults.base
  const cmpId = rawCmp && versions.some((v) => v.id === rawCmp) ? rawCmp : defaults.cmp
  const baseVersion = versions.find((v) => v.id === baseId)
  const cmpVersion = versions.find((v) => v.id === cmpId)

  const setPair = (b: string, c: string) => setSearchParams({ base: b, cmp: c }, { replace: true })

  /* --------------------------- reference delta -------------------------- */

  const pairRefs = useMemo(() => {
    if (!baseVersion || !cmpVersion) return { added: [] as ID[], removed: [] as ID[] }
    return diffRefs(baseVersion.snapshot, cmpVersion.snapshot)
  }, [baseVersion, cmpVersion])

  /* ------------------------- adoption preview --------------------------- */

  const target = confirm ? versions.find((v) => v.id === confirm.versionId) : undefined

  const adoptPreview = useMemo(() => {
    if (!article || !target || confirm?.kind !== 'adopt') return null
    return {
      diff: diffArticles(article, target.snapshot),
      refs: diffRefs(article, target.snapshot),
    }
  }, [article, target, confirm])

  /* ------------------------------ 404 safe ------------------------------ */

  if (!article) {
    return (
      <div className="vpage vpage--missing">
        <EmptyState
          icon="history"
          title="找不到这个条目"
          hint="版本历史按条目 id 打开。这条链接指向的条目不在本次演示数据中，可能已被重置或从未存在。"
          action={<Link className="vpage__btn vpage__btn--ghost" to="/command/queue">返回审批队列</Link>}
        />
      </div>
    )
  }

  const cover = sel.coverOf(state, article)
  const statusLabel = STATUS_LABEL[article.status]?.zh ?? article.status
  const isPublic = article.status === 'published' || article.status === 'update-needed' || article.status === 'retracted'

  const sourceOf = (sid: ID): Source | undefined => sourceById.get(sid)
  const titleOf = (sid: ID): string => sourceOf(sid)?.title ?? sid

  const toggleRefs = (vid: string) =>
    setOpenRefs((prev) => (prev.includes(vid) ? prev.filter((k) => k !== vid) : [...prev, vid]))

  const onAdopt = (v: Version) => {
    dispatch({ type: 'version-adopt', versionId: v.id })
    setConfirm(null)
    setSearchParams({}, { replace: true })
    toast(`已采用 v${v.n}「${v.label}」；此前的全部快照仍保留在版本历史中。`, 'go')
  }

  const onDiscard = (v: Version) => {
    dispatch({ type: 'version-discard', versionId: v.id })
    setConfirm(null)
    toast(`v${v.n} 已标记为未采用；快照仍可查阅，正文未被修改。`, 'info')
  }

  const renderRefList = (ids: ID[], sign: '+' | '−', vid: string) => {
    if (ids.length === 0) return null
    const open = openRefs.includes(vid)
    const shown = open ? ids : ids.slice(0, 3)
    return (
      <ul className={cx('vpage__reflist', sign === '−' && 'vpage__reflist--del')}>
        {shown.map((sid) => {
          const s = sourceOf(sid)
          return (
            <li key={`${sign}${sid}`} className="vpage__refitem">
              <span className="vpage__refsign u-mono" aria-hidden="true">{sign}</span>
              <span className="u-sr">{sign === '+' ? '新增来源：' : '移除来源：'}</span>
              <span className="vpage__reftitle">{titleOf(sid)}</span>
              {s ? <span className="vpage__refpub">{s.publisher} · 可信度 {s.credibility}</span> : null}
            </li>
          )
        })}
        {ids.length > 3 ? (
          <li className="vpage__refitem">
            <button type="button" className="vpage__more" onClick={() => toggleRefs(vid)} aria-expanded={open}>
              <Icon name={open ? 'chevron-up' : 'chevron-down'} size={12} />
              {open ? '收起来源列表' : `展开全部 ${ids.length} 份`}
            </button>
          </li>
        ) : null}
      </ul>
    )
  }

  /* -------------------------------- view -------------------------------- */

  return (
    <div className="vpage">
      {/* ------------------------------ header ----------------------------- */}
      <header className="vpage__head">
        <div className="vpage__headmain">
          <p className="u-eyebrow vpage__eyebrow">PRISM COMMAND · 版本历史</p>
          <h1 className="vpage__title">{article.title}</h1>
          <p className="vpage__lede">
            这一页记录该条目的每一次修改。任何一次修改都会生成新版本，而不会覆盖上一版：
            采用一个版本只是把「当前版本」的指针移过去，此前的全部快照原样保留。
          </p>

          <div className="vpage__chips">
            <StatusBadge status={article.status} />
            {article.topics.map((t) => <TopicChip key={t} topic={t} size="sm" />)}
            <span className="vpage__where">{article.countries.join(' · ')}</span>
          </div>

          <ul className="vpage__stats">
            <li className="vpage__stat">
              <span className="vpage__stat-v u-num">{versions.length}</span>
              <span className="vpage__stat-l">版本总数</span>
            </li>
            <li className="vpage__stat">
              <span className="vpage__stat-v u-num">{current ? `v${current.n}` : '—'}</span>
              <span className="vpage__stat-l">当前版本</span>
            </li>
            <li className={cx('vpage__stat', proposals.length > 0 && 'vpage__stat--warn')}>
              <span className="vpage__stat-v u-num">{proposals.length}</span>
              <span className="vpage__stat-l">待确认提案</span>
            </li>
            <li className="vpage__stat">
              <span className="vpage__stat-v u-num">{article.citations.length}</span>
              <span className="vpage__stat-l">当前引用条数</span>
            </li>
          </ul>

          <nav className="vpage__links" aria-label="相关页面">
            <Link className="vpage__btn vpage__btn--ghost" to={`/command/article/${article.id}`}>
              <Icon name="edit" size={13} />返回文章工作台
            </Link>
            <Link className="vpage__btn vpage__btn--ghost" to={`/command/article/${article.id}/studio`}>
              <Icon name="image" size={13} />图像工作室
            </Link>
            {isPublic ? (
              <Link className="vpage__btn vpage__btn--ghost" to={`/article/${article.slug}`}>
                <Icon name="external" size={13} />查看公开页面
              </Link>
            ) : null}
          </nav>
        </div>

        {cover ? (
          <figure className="vpage__cover">
            <ConceptImage asset={cover} ratio="3-2" />
            <figcaption className="vpage__covercap">{cover.label}</figcaption>
          </figure>
        ) : null}
      </header>

      <p className="vpage__guarantee">
        <Icon name="history" size={14} />
        <span>
          <strong>采用不会销毁历史。</strong>
          采用一个版本会创建新的「当前版本」，此前每一个快照——包括未被采用的提案——都完整保留，可随时回看与再次对照。
          采用也不等于批准或发布：条目状态仍停留在「{statusLabel}」，公开发布只能在发布前确认流程里由人完成。
        </span>
      </p>

      {versions.length === 0 ? (
        <EmptyState
          icon="history"
          title="这个条目还没有版本记录"
          hint="自动编辑台每完成一次改写都会留下快照。工作台里的 Further Vibe Coding 指令也会在这里生成一个待确认的提案版本。"
        />
      ) : (
        <>
          {/* --------------------------- proposals -------------------------- */}
          {proposals.length > 0 ? (
            <PanelCard
              title={`${proposals.length} 个提案等待你确认`}
              subtitle="提案是已经算好、但尚未生效的改写。在你按下「采用此版本」之前，正文不会有任何变化。"
              icon="clock"
              tone="warn"
              className="vpage__proposals"
            >
              <ul className="vpage__proplist">
                {proposals.map((v) => (
                  <li key={v.id} className="vpage__prop">
                    <div className="vpage__prophead">
                      <span className="vpage__vn u-mono">v{v.n}</span>
                      <span className="vpage__proplabel">{v.label}</span>
                      <span className="vpage__propstats u-mono">
                        ＋{v.stats.added} −{v.stats.removed} ～{v.stats.changed}
                      </span>
                    </div>
                    {v.instruction ? <p className="vpage__propinstr">指令：「{v.instruction}」</p> : null}
                    <p className="vpage__propsum">{v.summary}</p>
                    <div className="vpage__vactions">
                      <button
                        type="button"
                        className="vpage__btn vpage__btn--ghost"
                        onClick={() => setPair(current?.id ?? baseId, v.id)}
                      >
                        <Icon name="diff" size={13} />查看这个提案的差异
                      </button>
                      <button type="button" className="vpage__btn vpage__btn--go" onClick={() => setConfirm({ kind: 'adopt', versionId: v.id })}>
                        <Icon name="check" size={13} />采用此版本
                      </button>
                      <button type="button" className="vpage__btn vpage__btn--stop" onClick={() => setConfirm({ kind: 'discard', versionId: v.id })}>
                        <Icon name="x" size={13} />不采用
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </PanelCard>
          ) : null}

          <div className="vpage__cols">
            {/* ---------------------------- compare -------------------------- */}
            <div className="vpage__main">
              <PanelCard
                title="版本对照"
                subtitle="选择任意两个版本进行比较。左侧为基准（较早）版本，右侧为对照版本。"
                icon="diff"
                action={
                  <button
                    type="button"
                    className="vpage__swap"
                    onClick={() => setPair(cmpId, baseId)}
                    aria-label="互换基准版本与对照版本"
                    disabled={baseId === cmpId}
                  >
                    <Icon name="refresh" size={13} />
                    <span>互换</span>
                  </button>
                }
              >
                <div className="vpage__picker">
                  <Field label="基准版本" htmlFor="vp-base" hint="比较的起点，通常是较早的一版。">
                    <Select
                      id="vp-base"
                      value={baseId}
                      onChange={(e) => setPair(e.target.value, cmpId)}
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>{versionOptionLabel(v, article.currentVersionId)}</option>
                      ))}
                    </Select>
                  </Field>

                  <span className="vpage__arrow" aria-hidden="true">
                    <Icon name="arrow-right" size={16} />
                  </span>

                  <Field label="对照版本" htmlFor="vp-cmp" hint="要检视的那一版；默认是当前版本。">
                    <Select
                      id="vp-cmp"
                      value={cmpId}
                      onChange={(e) => setPair(baseId, e.target.value)}
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>{versionOptionLabel(v, article.currentVersionId)}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="vpage__quick">
                  <span className="vpage__quicklabel">快速对照</span>
                  <button
                    type="button"
                    className="vpage__btn vpage__btn--ghost vpage__btn--sm"
                    onClick={() => {
                      const oldest = versions[versions.length - 1]
                      if (oldest && current) setPair(oldest.id, current.id)
                    }}
                    disabled={!current || versions.length < 2}
                  >
                    初版 → 当前版本
                  </button>
                  <button
                    type="button"
                    className="vpage__btn vpage__btn--ghost vpage__btn--sm"
                    onClick={() => {
                      if (!current) return
                      const idx = versions.findIndex((v) => v.id === current.id)
                      const prev = versions[idx + 1]
                      if (prev) setPair(prev.id, current.id)
                    }}
                    disabled={!current || versions.length < 2}
                  >
                    当前版本与上一版
                  </button>
                </div>

                {baseVersion && cmpVersion ? (
                  <>
                    {baseId === cmpId ? (
                      <p className="vpage__flag">
                        <Icon name="info" size={13} />
                        基准版本与对照版本相同，因此没有差异可显示。请换一个版本。
                      </p>
                    ) : null}
                    {baseVersion.n > cmpVersion.n ? (
                      <p className="vpage__flag vpage__flag--warn">
                        <Icon name="alert" size={13} />
                        基准版本（v{baseVersion.n}）比对照版本（v{cmpVersion.n}）更新，下面显示的是「回退」方向的差异。
                      </p>
                    ) : null}

                    <DiffView
                      key={`${baseVersion.id}->${cmpVersion.id}`}
                      before={baseVersion.snapshot}
                      after={cmpVersion.snapshot}
                      beforeLabel={`v${baseVersion.n} · ${baseVersion.label}`}
                      afterLabel={`v${cmpVersion.n} · ${cmpVersion.label}`}
                      sources={state.sources}
                      className="vpage__diff"
                    />
                  </>
                ) : (
                  <EmptyState
                    icon="diff"
                    title="没有可比较的版本"
                    hint="至少需要两个快照才能生成差异。"
                  />
                )}
              </PanelCard>

              {/* ------------------------ references ------------------------- */}
              <PanelCard
                title="引用来源变化"
                subtitle="正文改写最危险的一种，是悄悄少了一份来源。这里把这次对照增减的每一份来源完整列出。"
                icon="book"
                tone={pairRefs.removed.length > 0 ? 'warn' : 'default'}
              >
                {pairRefs.added.length === 0 && pairRefs.removed.length === 0 ? (
                  <p className="vpage__refnone">
                    <Icon name="check" size={14} />
                    这两个版本使用完全相同的来源集合，没有来源被加入或移除。
                  </p>
                ) : (
                  <div className="vpage__refcols">
                    <section className="vpage__refcol">
                      <h3 className="vpage__refhead">
                        <Icon name="plus" size={13} />
                        新增来源
                        <span className="vpage__refn u-num">{pairRefs.added.length}</span>
                      </h3>
                      {pairRefs.added.length === 0 ? (
                        <p className="vpage__refempty">没有新增来源。</p>
                      ) : (
                        <ul className="vpage__cards">
                          {pairRefs.added.map((sid) => {
                            const s = sourceOf(sid)
                            return (
                              <li key={sid}>
                                {s ? <SourceCard source={s} compact /> : <p className="vpage__refmissing">来源 {sid} 不在来源库中。</p>}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </section>

                    <section className="vpage__refcol vpage__refcol--del">
                      <h3 className="vpage__refhead">
                        <Icon name="minus" size={13} />
                        移除来源
                        <span className="vpage__refn u-num">{pairRefs.removed.length}</span>
                      </h3>
                      {pairRefs.removed.length === 0 ? (
                        <p className="vpage__refempty">没有来源被移除。</p>
                      ) : (
                        <>
                          <p className="vpage__refalert">
                            <Icon name="alert" size={13} />
                            请逐份确认：被移除的来源，不再被任何仍然保留的陈述所依赖。
                          </p>
                          <ul className="vpage__cards">
                            {pairRefs.removed.map((sid) => {
                              const s = sourceOf(sid)
                              return (
                                <li key={sid}>
                                  {s ? <SourceCard source={s} compact /> : <p className="vpage__refmissing">来源 {sid} 不在来源库中。</p>}
                                </li>
                              )
                            })}
                          </ul>
                        </>
                      )}
                    </section>
                  </div>
                )}
              </PanelCard>
            </div>

            {/* --------------------------- timeline -------------------------- */}
            <div className="vpage__rail-col">
              <PanelCard
                title="版本时间线"
                subtitle="由新到旧。每一条都是一份完整快照，不是差异记录。"
                icon="history"
              >
                <ol className="vpage__timeline">
                  {versions.map((v) => {
                    const author = AUTHOR_META[v.author]
                    const stateMeta = STATE_META[v.state]
                    const isCurrent = v.id === article.currentVersionId
                    const words = articleWordCount(v.snapshot)
                    return (
                      <li
                        key={v.id}
                        className={cx(
                          'vpage__ver',
                          `vpage__ver--${author.cls}`,
                          isCurrent && 'vpage__ver--current',
                          v.state === 'discarded' && 'vpage__ver--discarded',
                          (v.id === baseId || v.id === cmpId) && 'vpage__ver--selected',
                        )}
                      >
                        <div className="vpage__rail" aria-hidden="true">
                          <span className={cx('vpage__node', `vpage__node--${author.cls}`)} />
                        </div>

                        <div className="vpage__vbody">
                          <div className="vpage__vtop">
                            <span className="vpage__vn u-mono">v{v.n}</span>
                            <h3 className="vpage__vlabel">{v.label}</h3>
                          </div>

                          <div className="vpage__vbadges">
                            <Badge tone={stateMeta.tone} icon={<Icon name={stateMeta.icon} size={11} />}>
                              {stateMeta.zh}
                            </Badge>
                            {isCurrent ? (
                              <Badge tone="live" icon={<Icon name="pin" size={11} />}>当前版本</Badge>
                            ) : null}
                            {v.id === baseId ? <span className="vpage__pick vpage__pick--base">基准</span> : null}
                            {v.id === cmpId ? <span className="vpage__pick vpage__pick--cmp">对照</span> : null}
                          </div>

                          <p className="vpage__vmeta">
                            <span className={cx('vpage__author', `vpage__author--${author.cls}`)}>
                              <Icon name={author.icon} size={11} />
                              {author.zh}
                              <span className="vpage__authoren">{author.en}</span>
                            </span>
                            <time className="vpage__vtime" dateTime={v.createdAt}>{fmtDateTime(v.createdAt)}</time>
                          </p>

                          {v.instruction ? (
                            <blockquote className="vpage__instr">
                              <span className="vpage__instrtag">
                                <Icon name="quote" size={11} />
                                产生这一版的指令
                              </span>
                              {v.instruction}
                            </blockquote>
                          ) : null}

                          <p className="vpage__vsum">{v.summary}</p>

                          <ul className="vpage__vstats">
                            <li className="vpage__vstat vpage__vstat--add">＋{v.stats.added} 段</li>
                            <li className="vpage__vstat vpage__vstat--del">−{v.stats.removed} 段</li>
                            <li className="vpage__vstat vpage__vstat--chg">～{v.stats.changed} 段</li>
                            <li className="vpage__vstat">{words} 字</li>
                            <li className="vpage__vstat">{v.snapshot.citations.length} 条引用</li>
                            <li className="vpage__vstat">可信度 {v.snapshot.confidence}</li>
                          </ul>

                          {v.refDelta.added.length > 0 || v.refDelta.removed.length > 0 ? (
                            <div className="vpage__vrefs">
                              <p className="vpage__vrefhead">
                                较上一版：来源 ＋{v.refDelta.added.length} / −{v.refDelta.removed.length}
                              </p>
                              {renderRefList(v.refDelta.added, '+', v.id)}
                              {renderRefList(v.refDelta.removed, '−', v.id)}
                            </div>
                          ) : (
                            <p className="vpage__vrefnone">较上一版：来源集合未变。</p>
                          )}

                          <div className="vpage__vactions">
                            <button
                              type="button"
                              className="vpage__btn vpage__btn--ghost vpage__btn--sm"
                              onClick={() => setPair(v.id, cmpId)}
                              disabled={v.id === baseId || v.id === cmpId}
                            >
                              设为基准
                            </button>
                            <button
                              type="button"
                              className="vpage__btn vpage__btn--ghost vpage__btn--sm"
                              onClick={() => setPair(baseId, v.id)}
                              disabled={v.id === cmpId || v.id === baseId}
                            >
                              设为对照
                            </button>
                            <button
                              type="button"
                              className="vpage__btn vpage__btn--ghost vpage__btn--sm"
                              onClick={() => { if (current) setPair(v.id, current.id) }}
                              disabled={!current || v.id === article.currentVersionId}
                            >
                              <Icon name="diff" size={12} />与当前版本比较
                            </button>

                            {v.state === 'proposal' ? (
                              <>
                                <button
                                  type="button"
                                  className="vpage__btn vpage__btn--go vpage__btn--sm"
                                  onClick={() => setConfirm({ kind: 'adopt', versionId: v.id })}
                                >
                                  <Icon name="check" size={12} />采用此版本
                                </button>
                                <button
                                  type="button"
                                  className="vpage__btn vpage__btn--stop vpage__btn--sm"
                                  onClick={() => setConfirm({ kind: 'discard', versionId: v.id })}
                                >
                                  <Icon name="x" size={12} />不采用
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </PanelCard>
            </div>
          </div>
        </>
      )}

      {/* ------------------------------ modals ------------------------------ */}
      <Modal
        open={confirm?.kind === 'adopt' && Boolean(target)}
        onClose={() => setConfirm(null)}
        title={target ? `采用 v${target.n}「${target.label}」？` : '采用此版本'}
        subtitle="确认前请先读一遍这一版会把当前正文改成什么样。"
        width="lg"
        footer={
          <div className="vpage__modalfoot">
            <button type="button" className="vpage__btn vpage__btn--ghost" onClick={() => setConfirm(null)}>取消</button>
            <button
              type="button"
              className="vpage__btn vpage__btn--go"
              onClick={() => { if (target) onAdopt(target) }}
            >
              <Icon name="check" size={13} />
              {target ? `确认采用 v${target.n}` : '确认采用'}
            </button>
          </div>
        }
      >
        {target && adoptPreview ? (
          <div className="vpage__confirm">
            <ul className="vpage__changes">
              <li className="vpage__change">
                <span className="vpage__changek">正文</span>
                <span className="vpage__changev">
                  相对当前正文：新增 {adoptPreview.diff.stats.added} 段 · 删除 {adoptPreview.diff.stats.removed} 段 ·
                  改写 {adoptPreview.diff.stats.changed} 段。
                </span>
              </li>
              <li className="vpage__change">
                <span className="vpage__changek">引用来源</span>
                <span className="vpage__changev">
                  新增 {adoptPreview.refs.added.length} 份，移除 {adoptPreview.refs.removed.length} 份。
                  {adoptPreview.refs.removed.length > 0 ? (
                    <span className="vpage__changewarn">
                      将被移除：{adoptPreview.refs.removed.map((sid) => `《${titleOf(sid)}》`).join('、')}。
                      采用前请确认没有任何保留下来的陈述仍依赖这些来源。
                    </span>
                  ) : null}
                  {adoptPreview.refs.added.length > 0 ? (
                    <span className="vpage__changeadd">
                      将被加入：{adoptPreview.refs.added.map((sid) => `《${titleOf(sid)}》`).join('、')}。
                    </span>
                  ) : null}
                </span>
              </li>
              <li className="vpage__change">
                <span className="vpage__changek">当前版本指针</span>
                <span className="vpage__changev">
                  {current ? `v${current.n}「${current.label}」` : '（未设置）'} → v{target.n}「{target.label}」
                </span>
              </li>
              <li className="vpage__change">
                <span className="vpage__changek">可信度</span>
                <span className="vpage__changev">
                  {article.confidence} → {target.snapshot.confidence}
                  <span className="vpage__changenote">（可信度来自快照本身，采用不会重新计算证据。）</span>
                </span>
              </li>
              <li className="vpage__change">
                <span className="vpage__changek">条目状态</span>
                <span className="vpage__changev">
                  保持「{statusLabel}」不变。<strong>采用不等于批准，也不等于发布</strong>——公开发布仍需走发布前确认流程。
                </span>
              </li>
            </ul>

            <p className="vpage__keep">
              <Icon name="history" size={14} />
              <span>
                <strong>历史不会被销毁。</strong>
                采用会新增一个「当前版本」指向 v{target.n}，v1 到 v{versions.length > 0 ? versions[0].n : target.n} 的全部快照
                （包括未被采用的提案）继续保留在这一页，可随时回看、对照或重新采用。本次采用会写入操作记录。
              </span>
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={confirm?.kind === 'discard' && Boolean(target)}
        onClose={() => setConfirm(null)}
        title={target ? `不采用 v${target.n}「${target.label}」？` : '不采用此版本'}
        subtitle="这会把该提案标记为「未采用」，正文与当前版本指针都不会改变。"
        width="md"
        tone="danger"
        footer={
          <div className="vpage__modalfoot">
            <button type="button" className="vpage__btn vpage__btn--ghost" onClick={() => setConfirm(null)}>取消</button>
            <button
              type="button"
              className="vpage__btn vpage__btn--stop"
              onClick={() => { if (target) onDiscard(target) }}
            >
              <Icon name="x" size={13} />确认不采用
            </button>
          </div>
        }
      >
        {target ? (
          <div className="vpage__confirm">
            <p className="vpage__confirmlede">
              这一版提出的修改是：{target.summary}
              {target.instruction ? `（由指令「${target.instruction}」产生。）` : ''}
            </p>
            <ul className="vpage__changes">
              <li className="vpage__change">
                <span className="vpage__changek">正文</span>
                <span className="vpage__changev">不变。当前版本仍为 {current ? `v${current.n}「${current.label}」` : '现有版本'}。</span>
              </li>
              <li className="vpage__change">
                <span className="vpage__changek">快照</span>
                <span className="vpage__changev">
                  仍然保留在版本时间线上，标记为「未采用」。它不会被删除，日后可以重新对照，也可以再次采用。
                </span>
              </li>
              <li className="vpage__change">
                <span className="vpage__changek">引用来源</span>
                <span className="vpage__changev">
                  这一版原本会带来 ＋{target.refDelta.added.length} / −{target.refDelta.removed.length} 份来源变化；不采用即全部不发生。
                </span>
              </li>
            </ul>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
