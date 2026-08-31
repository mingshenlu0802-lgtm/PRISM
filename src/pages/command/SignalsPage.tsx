import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { Signal, TopicKey } from '../../lib/types'
import { ENGINE_MAP, TOPICS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { cx, relTime, sortBy, unique } from '../../lib/util'
import {
  Badge, Checkbox, EmptyState, Field, Icon, Meter, Modal, Segmented, Select, TextArea, toast, TopicChip,
} from '../../components/common'
import { PanelCard } from '../../components/command/PanelCard'
import './SignalsPage.css'

/**
 * 今日信号 — what the desk collected overnight, before any of it became an
 * entry.
 *
 * The point of this page is that nothing disappears quietly. A cluster shows
 * the duplicate reports merged into it, states its corroboration honestly, and
 * a spiked story keeps its reason on the record where the editor can be held
 * to it later.
 */

type Tab = 'all' | 'top' | 'new' | 'clustered' | 'drafted' | 'declined'
type SortKey = 'newsValue' | 'firstSeen' | 'reports'

const CORROBORATION: Record<Signal['corroboration'], { zh: string; note: string; tone: 'go' | 'warn' | 'hold' | 'stop' }> = {
  'multi-source': { zh: '多来源印证', tone: 'go', note: '两个以上互不依赖的来源给出一致的核心事实。' },
  'single-source': { zh: '单一来源', tone: 'warn', note: '目前只有一个来源，未达本站两个独立来源的下限。' },
  contested: { zh: '来源相互矛盾', tone: 'hold', note: '可靠程度相当的来源给出互斥说法，现有证据无法判定。' },
  unverified: { zh: '未获证实', tone: 'stop', note: '无法回溯到任何可查的原始记录；只能证明「说法在流传」。' },
}

export default function SignalsPage() {
  const { state, dispatch } = usePrism()
  const [tab, setTab] = useState<Tab>('all')
  const [topic, setTopic] = useState<'all' | TopicKey>('all')
  const [country, setCountry] = useState('all')
  const [lang, setLang] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('newsValue')
  const [open, setOpen] = useState<string | null>(null)
  const [declining, setDeclining] = useState<Signal | null>(null)
  const [reason, setReason] = useState('')
  const [ack, setAck] = useState(false)

  const signals = state.signals
  const countries = useMemo(() => unique(signals.map((s) => s.country)).sort(), [signals])
  const langs = useMemo(() => unique(signals.map((s) => s.language)).sort(), [signals])

  const stats = useMemo(() => {
    const active = signals.filter((s) => s.status !== 'declined')
    return {
      reports: signals.reduce((n, s) => n + s.reportCount, 0),
      merged: signals.reduce((n, s) => n + s.mergedFrom.length, 0),
      clusters: signals.length,
      active: active.length,
      countries: unique(signals.map((s) => s.country)).length,
      languages: unique(signals.map((s) => s.language)).length,
      primary: signals.reduce((n, s) => n + s.primarySourceCount, 0),
      declined: signals.filter((s) => s.status === 'declined').length,
    }
  }, [signals])

  const top5 = useMemo(
    () => sortBy(signals.filter((s) => s.status !== 'declined'), (s) => s.newsValue, 'desc').slice(0, 5).map((s) => s.id),
    [signals],
  )

  const filtered = useMemo(() => {
    let list = signals
    if (tab === 'top') list = list.filter((s) => top5.includes(s.id))
    else if (tab !== 'all') list = list.filter((s) => s.status === tab)
    if (topic !== 'all') list = list.filter((s) => s.topics.includes(topic))
    if (country !== 'all') list = list.filter((s) => s.country === country)
    if (lang !== 'all') list = list.filter((s) => s.language === lang)
    const key = sortKey === 'newsValue' ? (s: Signal) => s.newsValue
      : sortKey === 'reports' ? (s: Signal) => s.reportCount
      : (s: Signal) => s.firstSeen
    return sortBy(list, key, 'desc')
  }, [signals, tab, topic, country, lang, sortKey, top5])

  const counts: Record<Tab, number> = {
    all: signals.length,
    top: top5.length,
    new: signals.filter((s) => s.status === 'new').length,
    clustered: signals.filter((s) => s.status === 'clustered').length,
    drafted: signals.filter((s) => s.status === 'drafted').length,
    declined: signals.filter((s) => s.status === 'declined').length,
  }

  function promote(s: Signal) {
    dispatch({ type: 'signal-promote', signalId: s.id })
    toast('已转入起草队列。起草完成后仍需经审批流程，本页不会发布任何内容。', 'go')
  }

  function confirmDecline() {
    if (!declining || reason.trim().length < 8 || !ack) return
    dispatch({ type: 'signal-decline', signalId: declining.id, reason: reason.trim() })
    toast('已记录不采用的理由。该信号保留在「已不采用」中，不会消失。', 'info')
    setDeclining(null); setReason(''); setAck(false)
  }

  return (
    <div className="sigp">
      <header className="sigp__head">
        <div>
          <p className="u-eyebrow">今日信号 · Intake</p>
          <h1 className="sigp__title">自动编辑台昨夜收集到什么</h1>
          <p className="sigp__lede">
            信号不是文章。这里是搜集与去重之后、起草之前的原始状态：哪些报道被合并成同一个聚类、
            引用到的资源检索到什么程度、为什么某些线索没有被采用。
          </p>
        </div>
        <div className="sigp__nopub">
          <Icon name="lock" size={15} />
          <span>
            本页不会发布任何内容。转入起草只是把线索交给编辑台，之后仍须经完整审批流程。
            <span className="sigp__engine">
              检索引擎：{ENGINE_MAP[state.engines.retrieval]?.name ?? state.engines.retrieval}
              <Link className="sigp__engine-link" to="/command/settings">更改</Link>
            </span>
          </span>
        </div>
      </header>

      <div className="sigp__stats">
        {[
          { n: stats.reports.toLocaleString(), k: '原始报道', t: '搜集阶段进入去重的条目总数' },
          { n: stats.clusters, k: '聚类', t: `合并了 ${stats.merged} 条重复报道` },
          { n: stats.countries, k: '辖区', t: '当日有材料进入的司法辖区' },
          { n: stats.languages, k: '语种', t: '搜集覆盖的语言' },
          { n: stats.primary, k: '一手材料', t: '判决、法案、统计发布与同行评审研究' },
          { n: stats.declined, k: '未采用', t: '全部保留理由，可在下方筛选查看' },
        ].map((s) => (
          <div key={s.k} className="sigp__stat">
            <span className="sigp__stat-n u-num">{s.n}</span>
            <span className="sigp__stat-k">{s.k}</span>
            <span className="sigp__stat-t">{s.t}</span>
          </div>
        ))}
      </div>

      <div className="sigp__filters">
        <Segmented<Tab>
          ariaLabel="信号状态筛选"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: '全部', count: counts.all },
            { value: 'top', label: '今日五个重要事件', count: counts.top },
            { value: 'new', label: '新发现', count: counts.new },
            { value: 'clustered', label: '已聚类', count: counts.clustered },
            { value: 'drafted', label: '已起草', count: counts.drafted },
            { value: 'declined', label: '已不采用', count: counts.declined },
          ]}
        />
        <div className="sigp__selects">
          <Field label="议题" htmlFor="sig-topic">
            <Select id="sig-topic" value={topic} onChange={(ev) => setTopic(ev.target.value as 'all' | TopicKey)}>
              <option value="all">全部议题</option>
              {TOPICS.map((t) => <option key={t.key} value={t.key}>{t.zh}</option>)}
            </Select>
          </Field>
          <Field label="辖区" htmlFor="sig-country">
            <Select id="sig-country" value={country} onChange={(ev) => setCountry(ev.target.value)}>
              <option value="all">全部辖区</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="语言" htmlFor="sig-lang">
            <Select id="sig-lang" value={lang} onChange={(ev) => setLang(ev.target.value)}>
              <option value="all">全部语言</option>
              {langs.map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
          </Field>
          <Field label="排序" htmlFor="sig-sort">
            <Select id="sig-sort" value={sortKey} onChange={(ev) => setSortKey(ev.target.value as SortKey)}>
              <option value="newsValue">选题价值</option>
              <option value="firstSeen">首次出现</option>
              <option value="reports">报道数量</option>
            </Select>
          </Field>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="没有符合条件的信号" hint="调整上方筛选条件再试。" icon="target" />
      ) : (
        <ul className="sigp__list">
          {filtered.map((s) => {
            const corr = CORROBORATION[s.corroboration]
            const isOpen = open === s.id
            const linked = s.linkedArticleId ? state.articles.find((a) => a.id === s.linkedArticleId) : undefined
            return (
              <li key={s.id} className={cx('sigp__item', s.status === 'declined' && 'sigp__item--declined')}>
                <div className="sigp__row">
                  <div className="sigp__score" aria-hidden="true">
                    <span className="sigp__score-n u-num">{s.newsValue}</span>
                    <span className="sigp__score-k">选题价值</span>
                  </div>
                  <div className="sigp__main">
                    <h2 className="sigp__h">{s.headline}</h2>
                    <div className="sigp__meta">
                      <span className="sigp__country">{s.country}</span>
                      <span className="u-mono">{s.language}</span>
                      <Badge tone={corr.tone} size="sm">{corr.zh}</Badge>
                      <span className="sigp__meta-t">
                        {s.reportCount} 条报道 · {s.independentSourceCount} 个独立来源 · {s.primarySourceCount} 份一手材料
                      </span>
                      <span className="sigp__meta-t">{relTime(s.firstSeen, `${state.today}T07:00:00Z`)}</span>
                      {top5.includes(s.id) && <Badge tone="info" size="sm">今日重要</Badge>}
                      {s.status === 'declined' && <Badge tone="stop" size="sm">未采用</Badge>}
                    </div>
                    <div className="sigp__topics">
                      {s.topics.map((t) => <TopicChip key={t} topic={t} size="sm" />)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="sigp__toggle"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : s.id)}
                  >
                    <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} />
                    {isOpen ? '收起' : '展开'}
                  </button>
                </div>

                {isOpen && (
                  <div className="sigp__detail">
                    <div className="sigp__detail-grid">
                      <section className="sigp__sub">
                        <h3 className="sigp__sub-h">已合并的重复报道（{s.mergedFrom.length}）</h3>
                        <ul className="sigp__merged">
                          {s.mergedFrom.map((m) => <li key={m} className="sigp__merged-item">{m}</li>)}
                        </ul>
                        <p className="sigp__sub-t">
                          去重按原始信源指纹进行。若多家「独立来源」实为同一通讯社供稿，独立来源计数会被下调。
                        </p>
                      </section>

                      <section className="sigp__sub">
                        <h3 className="sigp__sub-h">来源可得状态</h3>
                        <p className="sigp__corr">
                          <Badge tone={corr.tone} size="sm">{corr.zh}</Badge>
                          <span className="sigp__sub-t">{corr.note}</span>
                        </p>
                        <Meter
                          value={s.newsValue}
                          label="选题价值"
                          hint={s.newsValueBasis}
                          tone="info"
                        />
                      </section>
                    </div>

                    {s.status === 'declined' && s.declineReason && (
                      <div className="sigp__declined">
                        <span className="sigp__declined-k"><Icon name="x" size={14} /> 不采用的理由</span>
                        <p className="sigp__declined-t">{s.declineReason}</p>
                      </div>
                    )}

                    <div className="sigp__actions">
                      {linked ? (
                        <Link className="sigp__link" to={`/command/article/${linked.id}`}>
                          <Icon name="file" size={14} /> 已起草：{linked.title}
                        </Link>
                      ) : s.status === 'declined' ? (
                        <span className="sigp__note">已不采用的信号保留在记录中，可随时重新评估。</span>
                      ) : (
                        <>
                          <button type="button" className="sigp__btn" onClick={() => promote(s)}>
                            <Icon name="edit" size={14} /> 转入起草
                          </button>
                          <button
                            type="button"
                            className="sigp__btn sigp__btn--quiet"
                            onClick={() => { setDeclining(s); setReason(''); setAck(false) }}
                          >
                            <Icon name="x" size={14} /> 不采用
                          </button>
                          <span className="sigp__note">转入起草不等于发布：草稿仍会进入审批队列。</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <PanelCard title="去重是怎么做的" icon="layers" className="sigp__explainer">
        <p className="sigp__explainer-t">
          搜集阶段的每一条原始报道都会计算一个原始信源指纹：引用的文件、数字、直接引语与时间点。
          指纹一致的报道被合并为同一聚类，并保留全部被合并来源的名称——这样「五家媒体都报道了」
          与「五家媒体转载了同一条通讯社稿」不会被混为一谈。
        </p>
        <p className="sigp__explainer-t">
          聚类的<strong>选题价值</strong>不是热度。它衡量的是：是否有新的一手材料可取得、
          影响的人群是否可量化、是否属于报道不足的辖区、以及是否存在可核查的具体主张。
          传播量高但没有可核查事实主张、也没有制度后果的争议，会被明确记为不采用。
        </p>
      </PanelCard>

      <Modal
        open={declining !== null}
        onClose={() => setDeclining(null)}
        title="不采用这条信号"
        subtitle={declining?.headline}
        tone="danger"
        footer={
          <>
            <button type="button" className="sigp__btn sigp__btn--quiet" onClick={() => setDeclining(null)}>取消</button>
            <button
              type="button"
              className="sigp__btn sigp__btn--danger"
              disabled={reason.trim().length < 8 || !ack}
              onClick={confirmDecline}
            >
              记录理由并不采用
            </button>
          </>
        }
      >
        <p className="sigp__modal-t">
          不采用的理由会写入信号记录并长期保留。被放弃的选题不会从这个页面消失——
          它会留在「已不采用」中，让日后的你（和任何审阅这份记录的人）能看到当初的判断依据。
        </p>
        <Field label="不采用的理由" hint="至少 8 个字。写清楚是证据问题、重复问题，还是伦理判断。" required>
          <TextArea
            rows={4}
            value={reason}
            onChange={(ev) => setReason(ev.target.value)}
            placeholder="例：唯一来源为匿名转述，原始记录不可得；已转入可疑说法观察，待有一手材料再评估。"
          />
        </Field>
        <Checkbox
          checked={ack}
          onChange={setAck}
          label="我确认这是编辑判断，不是因为处理起来麻烦"
          hint="选题价值低、证据不足、与既有报道重复、或按创伤知情准则不予报道，都是正当理由。"
        />
      </Modal>
    </div>
  )
}
