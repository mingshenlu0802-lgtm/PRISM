import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import type { AssetKind, ImageAsset, RiskKind } from '../../lib/types'
import { RISK_LABEL } from '../../lib/constants'
import { useArticle, usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { cx, fmtDateTime, nowIso, uid } from '../../lib/util'
import {
  Badge, EmptyState, Field, Icon, Select, TextArea, TextInput, toast,
} from '../../components/common'
import { ChartRenderer } from '../../components/charts'
import { ConceptImage } from '../../components/visual/ConceptImage'
import { PanelCard } from '../../components/command/PanelCard'
import './StudioPage.css'

/**
 * 图像与视觉素材工作室。
 *
 * This is where the image-ethics rules stop being policy text and become
 * interface: the guardrail field cannot be emptied, a chart asset must bind to
 * a real dataset, and an entry carrying sexual-violence, minors or
 * identity-exposure flags gets a specific warning about what its cover may not
 * show — read from its own flags, not from a generic template.
 */

const KIND_LABEL: Record<AssetKind, { zh: string; note: string }> = {
  cover: { zh: '封面图', note: '文章顶部的主视觉。抽象构图，绝不呈现当事人或事发现场。' },
  map: { zh: '示意地图', note: '示意投影，不对应真实地理；用于表示分布而非位置。' },
  chart: { zh: '数据图表', note: '必须绑定既有数据集，图注同时给出数据来源与本图无法说明的内容。' },
  timeline: { zh: '时间线', note: '节点形状标注证据地位：已有一手记录 / 单一来源报道 / 存在争议。' },
  social: { zh: '社交素材', note: '只承载标题与核查结论，不摘录可能脱离语境的片段。' },
}

const MOTIFS: { key: ImageAsset['motif']; zh: string; note: string }[] = [
  { key: 'prism-fold', zh: '棱镜折射', note: '一束光进入棱镜后分成六道——本站的基本母题，适合综合性报道。' },
  { key: 'graticule', zh: '经纬网格', note: '示意投影的网格与柔和地块，适合跨辖区比较。' },
  { key: 'strata', zh: '地层', note: '层叠的沉积带，适合历史脉络与长期趋势。' },
  { key: 'aperture', zh: '光圈', note: '同心环与门槛，适合关于可及性、准入与把关的报道。' },
  { key: 'ledger', zh: '条文', note: '分层的条目结构，适合法律文本与制度分析。' },
  { key: 'signal', zh: '信号网络', note: '节点与连线的干涉图样，适合网络协同与传播分析。' },
]

const PALETTES: { key: string; zh: string; colors: string[] }[] = [
  { key: 'indigo', zh: '深靛蓝主调', colors: ['var(--prism-1)', 'var(--prism-6)', 'var(--ink-400)'] },
  { key: 'coral', zh: '珊瑚强调', colors: ['var(--coral-500)', 'var(--prism-1)', 'var(--prism-3)'] },
  { key: 'prism', zh: '克制棱镜', colors: ['var(--prism-1)', 'var(--prism-2)', 'var(--prism-3)', 'var(--prism-4)', 'var(--prism-6)', 'var(--coral-500)'] },
  { key: 'mono', zh: '单色档案', colors: ['var(--ink-400)', 'var(--ink-300)'] },
]

/** Kinds that constrain what a cover may show, beyond the standing rules. */
const SENSITIVE_KINDS: RiskKind[] = ['sexual-violence', 'minors', 'identity-exposure', 'active-litigation']

/** The default ethical constraint, derived from the entry's own risk profile. */
function defaultGuardrail(kinds: string[]): string {
  const parts: string[] = []
  if (kinds.includes('sexual-violence')) parts.push('不得呈现当事人形象、事发现场或任何可被读作侵害情境的意象')
  if (kinds.includes('minors')) parts.push('不得出现任何可识别未成年人的元素，包括校服、校名与年龄暗示')
  if (kinds.includes('identity-exposure')) parts.push('不得出现地点、机构标识或可拼合出身份的细节')
  if (kinds.includes('active-litigation')) parts.push('不得出现法庭场景或可被读作预判司法结论的构图')
  if (parts.length === 0) parts.push('抽象几何构图，不虚构新闻现场，不出现可识别的真实人物或场所')
  return `${parts.join('；')}。AI 生成图一律标注为「概念插图」。`
}

export default function StudioPage() {
  const { id } = useParams()
  const { state, dispatch } = usePrism()
  const article = useArticle(id)

  const [kind, setKind] = useState<AssetKind>('cover')
  const [motif, setMotif] = useState<ImageAsset['motif']>('prism-fold')
  const [palette, setPalette] = useState('indigo')
  const [caption, setCaption] = useState('')
  const [prompt, setPrompt] = useState('')
  const [guardrail, setGuardrail] = useState('')
  const [chartId, setChartId] = useState('')
  const [picked, setPicked] = useState<number | null>(null)
  const [nonce, setNonce] = useState(0)

  const openKinds = useMemo(
    () => (article ? article.riskFlags.map((r) => r.kind) : []),
    [article],
  )
  const sensitive = useMemo(
    () => openKinds.filter((k) => SENSITIVE_KINDS.includes(k)),
    [openKinds],
  )

  // Seed the guardrail from the entry's risk profile the first time we know it.
  const effectiveGuardrail = guardrail || defaultGuardrail(openKinds)

  const assets = useMemo(() => (article ? sel.assetsOf(state, article.id) : []), [state, article])
  const cover = article ? sel.coverOf(state, article) : undefined

  const paletteColors = PALETTES.find((p) => p.key === palette)?.colors ?? PALETTES[0].colors

  /** Three deterministic candidates, previewed before anything is committed. */
  const candidates: ImageAsset[] = useMemo(() => {
    if (!article) return []
    const order = MOTIFS.map((m) => m.key)
    const start = order.indexOf(motif)
    return [0, 1, 2].map((i) => ({
      id: `cand-${article.id}-${kind}-${nonce}-${i}`,
      articleId: article.id,
      kind,
      label: `${article.title} · ${KIND_LABEL[kind].zh}候选 ${i + 1}`,
      caption: caption || KIND_LABEL[kind].note,
      conceptual: kind !== 'chart',
      prompt: prompt || undefined,
      palette: paletteColors,
      motif: order[(start + i) % order.length],
      status: 'draft' as const,
      guardrail: effectiveGuardrail,
      createdAt: '2026-08-31T00:00:00Z',
      chartId: kind === 'chart' && chartId ? chartId : undefined,
    }))
  }, [article, kind, motif, caption, prompt, paletteColors, effectiveGuardrail, chartId, nonce])

  if (!article || candidates.length === 0) {
    return (
      <EmptyState
        title="找不到这个条目"
        hint="它可能已被归档，或链接有误。"
        icon="image"
        action={<Link className="stup__link" to="/command/queue">返回审批队列</Link>}
      />
    )
  }

  const canCreate = effectiveGuardrail.trim().length >= 8 && picked !== null && (kind !== 'chart' || Boolean(chartId))

  function create() {
    if (!article || picked === null || !canCreate) return
    const chosen = candidates[picked]
    const asset: ImageAsset = {
      ...chosen,
      id: uid('img'),
      label: `${article.title} · ${KIND_LABEL[kind].zh}`,
      createdAt: nowIso(),
    }
    dispatch({ type: 'asset-add', asset })
    toast('素材已加入草稿。它需要经过审核才能用于发布。', 'go')
    setPicked(null)
    setNonce((n) => n + 1)
  }

  const selectedChart = chartId ? state.charts.find((c) => c.id === chartId) : undefined

  return (
    <div className="stup">
      <header className="stup__head">
        <div>
          <p className="u-eyebrow">图像工作室 · Visual studio</p>
          <h1 className="stup__title">{article.title}</h1>
          <p className="stup__sub">
            <Link className="stup__link" to={`/command/article/${article.id}`}>返回工作台</Link>
            <span className="stup__dot" aria-hidden="true">·</span>
            <Link className="stup__link" to={`/command/article/${article.id}/versions`}>版本历史</Link>
          </p>
        </div>
        {cover && cover.status !== 'approved' && (
          <p className="stup__blocker">
            <Icon name="alert" size={15} />
            封面图尚未通过审核——这是发布闸门中的一项硬性阻断，必须先批准封面才能发布。
          </p>
        )}
      </header>

      {/* ---------------------------- guardrails ---------------------------- */}
      <section className="stup__rules" aria-labelledby="stup-rules-h">
        <h2 id="stup-rules-h" className="stup__rules-h">
          <Icon name="shield" size={16} /> 图像伦理约束
        </h2>
        <ul className="stup__rules-list">
          <li>不得虚构新闻现场，不得生成真实当事人或受害者的形象。</li>
          <li>AI 生成图一律标注为「概念插图 · AI 生成 · 非新闻现场」，且只使用抽象几何构图。</li>
          <li>数据图表必须来自具体数据集，并同时给出数据来源与本图无法说明的内容。</li>
          <li>地图为示意投影；本原型中的司法辖区均为虚构，不对应任何真实地理。</li>
        </ul>
        {sensitive.length > 0 && (
          <div className="stup__sensitive">
            <span className="stup__sensitive-k">
              <Icon name="alert" size={14} /> 本条目的额外限制
            </span>
            <ul className="stup__sensitive-list">
              {article.riskFlags
                .filter((r) => sensitive.includes(r.kind))
                .map((r) => (
                  <li key={r.id}>
                    <strong>{RISK_LABEL[r.kind].zh}</strong>：{RISK_LABEL[r.kind].guidance}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      <div className="stup__work">
        {/* ------------------------------ brief ----------------------------- */}
        <section className="stup__brief" aria-labelledby="stup-brief-h">
          <h2 id="stup-brief-h" className="stup__brief-h">生成简报</h2>

          <Field label="素材类型" htmlFor="stup-kind" hint={KIND_LABEL[kind].note}>
            <Select id="stup-kind" value={kind} onChange={(ev) => { setKind(ev.target.value as AssetKind); setPicked(null) }}>
              {(Object.keys(KIND_LABEL) as AssetKind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k].zh}</option>
              ))}
            </Select>
          </Field>

          {kind === 'chart' && (
            <Field
              label="绑定数据集"
              htmlFor="stup-chart"
              hint="数据图表不能被「生成」。它必须绑定一个既有数据集，图注会自动带出来源与局限。"
              required
            >
              <Select id="stup-chart" value={chartId} onChange={(ev) => setChartId(ev.target.value)}>
                <option value="">选择一个数据集…</option>
                {state.charts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </Field>
          )}

          <fieldset className="stup__fieldset">
            <legend className="stup__legend">构图母题</legend>
            <div className="stup__motifs">
              {MOTIFS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={cx('stup__motif', motif === m.key && 'stup__motif--on')}
                  aria-pressed={motif === m.key}
                  onClick={() => { setMotif(m.key); setPicked(null) }}
                >
                  <span className="stup__motif-k">{m.zh}</span>
                  <span className="stup__motif-t">{m.note}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="stup__fieldset">
            <legend className="stup__legend">调色</legend>
            <div className="stup__palettes">
              {PALETTES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={cx('stup__palette', palette === p.key && 'stup__palette--on')}
                  aria-pressed={palette === p.key}
                  onClick={() => { setPalette(p.key); setPicked(null) }}
                >
                  <span className="stup__swatches" aria-hidden="true">
                    {p.colors.map((c, i) => (
                      <span key={i} className="stup__swatch" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="stup__palette-k">{p.zh}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <Field label="说明文字" htmlFor="stup-caption" hint="会作为图注显示在素材下方。">
            <TextInput
              id="stup-caption" value={caption}
              onChange={(ev) => setCaption(ev.target.value)}
              placeholder="例：概念插图：以分层的条文结构为母题。"
            />
          </Field>

          <Field label="生成指令" htmlFor="stup-prompt" hint="会保留在素材记录中，供日后审计。">
            <TextArea
              id="stup-prompt" rows={3} value={prompt}
              onChange={(ev) => setPrompt(ev.target.value)}
              placeholder="例：抽象的法律条文分层结构，深靛蓝底，六道细线，其中三道以珊瑚色标出；不出现任何人物或场景。"
            />
          </Field>

          <Field
            label="伦理约束"
            htmlFor="stup-guard"
            hint="不能为空。这条约束会随素材长期保存，是日后回溯这张图为何这样构图的依据。"
            required
          >
            <TextArea
              id="stup-guard" rows={3}
              value={effectiveGuardrail}
              onChange={(ev) => setGuardrail(ev.target.value)}
            />
          </Field>

          <div className="stup__actions">
            <button
              type="button"
              className="stup__btn"
              disabled={!canCreate}
              onClick={create}
            >
              <Icon name="plus" size={15} /> 加入草稿素材
            </button>
            <button type="button" className="stup__btn stup__btn--quiet" onClick={() => { setNonce((n) => n + 1); setPicked(null) }}>
              <Icon name="refresh" size={15} /> 换一组候选
            </button>
            <p className="stup__hint">
              {picked === null
                ? '先从右侧三个候选中选择一个，再加入草稿。'
                : kind === 'chart' && !chartId
                  ? '数据图表必须先绑定数据集。'
                  : '加入后仍为草稿状态，需经审核才能用于发布。'}
            </p>
          </div>
        </section>

        {/* ---------------------------- candidates -------------------------- */}
        <section className="stup__preview" aria-labelledby="stup-prev-h">
          <h2 id="stup-prev-h" className="stup__brief-h">候选（三选一）</h2>
          {kind === 'chart' ? (
            selectedChart ? (
              <div className="stup__chart">
                <ChartRenderer chart={selectedChart} />
                <p className="stup__chart-note">
                  数据图表直接来自已入库的数据集。工作室不会「生成」数据，
                  也不会修改这张图的数值——它只决定这张图是否用于本文。
                </p>
                <button
                  type="button"
                  className={cx('stup__btn', picked === 0 && 'stup__btn--on')}
                  onClick={() => setPicked(0)}
                  aria-pressed={picked === 0}
                >
                  {picked === 0 ? '已选择这张图表' : '选择这张图表'}
                </button>
              </div>
            ) : (
              <EmptyState title="尚未绑定数据集" hint="在左侧选择一个既有数据集。" icon="chart" />
            )
          ) : (
            <ul className="stup__cands">
              {candidates.map((c, i) => (
                <li key={c.id} className={cx('stup__cand', picked === i && 'stup__cand--on')}>
                  <button
                    type="button"
                    className="stup__cand-btn"
                    aria-pressed={picked === i}
                    onClick={() => setPicked(i)}
                  >
                    <ConceptImage asset={c} ratio={kind === 'social' ? '1-1' : '16-9'} />
                    <span className="stup__cand-foot">
                      <span className="stup__cand-k">
                        {MOTIFS.find((m) => m.key === c.motif)?.zh}
                      </span>
                      <span className="stup__cand-sel">{picked === i ? '已选择' : '选择'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="stup__social">
            <h3 className="stup__social-h">社交素材预览</h3>
            <p className="stup__social-t">
              社交素材只承载标题与最重要的一条核查结论，不摘录正文片段。原型不导出文件。
            </p>
            <div className="stup__social-grid">
              {(['1-1', '16-9'] as const).map((ratio) => (
                <figure key={ratio} className="stup__social-card">
                  <ConceptImage
                    asset={{
                      ...candidates[0],
                      id: `social-${article.id}-${ratio}`,
                      kind: 'social',
                      conceptual: true,
                    }}
                    ratio={ratio}
                  />
                  <figcaption className="stup__social-cap">
                    <span className="stup__social-title">{article.title}</span>
                    <span className="stup__social-stand">{article.standfirst.slice(0, 72)}…</span>
                    <span className="stup__social-ratio u-mono">{ratio}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------ gallery ----------------------------- */}
      <PanelCard title={`本条目的素材（${assets.length}）`} icon="image">
        {assets.length === 0 ? (
          <EmptyState title="尚未生成任何素材" hint="用上方的生成简报创建第一张。" icon="image" />
        ) : (
          <ul className="stup__gallery">
            {assets.map((a) => (
              <li key={a.id} className={cx('stup__asset', a.status === 'rejected' && 'stup__asset--rejected')}>
                {a.kind === 'chart' && a.chartId ? (
                  (() => {
                    const c = state.charts.find((x) => x.id === a.chartId)
                    return c ? <ChartRenderer chart={c} dense /> : <p className="stup__asset-missing">图表数据缺失</p>
                  })()
                ) : (
                  <ConceptImage asset={a} ratio={a.kind === 'social' ? '1-1' : '16-9'} />
                )}
                <div className="stup__asset-body">
                  <div className="stup__asset-top">
                    <Badge tone={a.status === 'approved' ? 'go' : a.status === 'rejected' ? 'stop' : 'hold'} size="sm">
                      {a.status === 'approved' ? '已通过' : a.status === 'rejected' ? '已退回' : '草稿'}
                    </Badge>
                    <span className="stup__asset-kind">{KIND_LABEL[a.kind].zh}</span>
                    {cover?.id === a.id && <Badge tone="info" size="sm">当前封面</Badge>}
                  </div>
                  <p className="stup__asset-label">{a.label}</p>
                  <p className="stup__asset-guard">
                    <span className="stup__asset-k">伦理约束</span>{a.guardrail}
                  </p>
                  {a.prompt && (
                    <p className="stup__asset-guard">
                      <span className="stup__asset-k">生成指令</span>{a.prompt}
                    </p>
                  )}
                  <p className="stup__asset-at u-mono">{fmtDateTime(a.createdAt)}</p>
                  <div className="stup__asset-actions">
                    <button
                      type="button"
                      className="stup__btn stup__btn--sm"
                      disabled={a.status === 'approved'}
                      onClick={() => { dispatch({ type: 'asset-status', assetId: a.id, status: 'approved' }); toast('素材已通过审核。', 'go') }}
                    >
                      <Icon name="check" size={13} /> 批准
                    </button>
                    <button
                      type="button"
                      className="stup__btn stup__btn--sm stup__btn--quiet"
                      disabled={a.status === 'rejected'}
                      onClick={() => { dispatch({ type: 'asset-status', assetId: a.id, status: 'rejected' }); toast('素材已退回。', 'warn') }}
                    >
                      <Icon name="x" size={13} /> 退回
                    </button>
                    {a.kind === 'cover' && cover?.id !== a.id && (
                      <button
                        type="button"
                        className="stup__btn stup__btn--sm stup__btn--quiet"
                        onClick={() => { dispatch({ type: 'set-cover', articleId: article.id, assetId: a.id }); toast('已更换封面图。', 'go') }}
                      >
                        <Icon name="pin" size={13} /> 设为封面
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  )
}
