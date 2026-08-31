import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { Source, SourceTier, SourceType } from '../../lib/types'
import { SOURCE_TYPE_LABEL } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { cx, fmtDate, isPrimarySource, sortBy, unique } from '../../lib/util'
import {
  Badge, Checkbox, EmptyState, Field, Icon, Meter, Segmented, Select, TextInput, Tooltip,
} from '../../components/common'
import { DistributionBars, WorldGraticule } from '../../components/charts'
import { PanelCard } from '../../components/command/PanelCard'
import './SourcesPage.css'

/**
 * 来源库与全球分布。
 *
 * Every claim in this newsroom points at a row in this table. The page is
 * built so an editor can ask two questions quickly: where is our evidence
 * actually coming from, and which of it should we be careful with.
 */

type Dist = 'country' | 'language' | 'type' | 'tier'
type SortKey = 'credibility' | 'date' | 'uses'

/** Deterministic positions on the schematic graticule — fictional geography. */
const PLACES: Record<string, [number, number]> = {
  韦拉共和国: [26, 66],
  卡利桑邦: [63, 47],
  北屿联合王国: [44, 20],
  塞尔瓦联邦: [30, 76],
  阿米拉特王国: [55, 40],
  东埃斯特里亚: [70, 30],
  西埃斯特里亚: [61, 29],
  马兰岛自治区: [80, 62],
  图兰共和国: [52, 33],
  '泛洲（跨国机构）': [46, 52],
  '多辖区（跨国比较）': [38, 44],
}

function place(name: string): [number, number] {
  const known = PLACES[name]
  if (known) return known
  // Stable fallback so an unseen jurisdiction still lands somewhere sensible.
  let h = 0
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return [12 + (h % 76), 14 + ((h >> 8) % 70)]
}

const TIER_LABEL: Record<SourceTier, string> = { primary: '一手', secondary: '二手', tertiary: '三手' }

export default function SourcesPage() {
  const { state } = usePrism()
  const [dist, setDist] = useState<Dist>('country')
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | SourceType>('all')
  const [tier, setTier] = useState<'all' | SourceTier>('all')
  const [lang, setLang] = useState('all')
  const [country, setCountry] = useState('all')
  const [onlyPool, setOnlyPool] = useState(false)
  const [onlyCaution, setOnlyCaution] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('credibility')
  const [open, setOpen] = useState<string | null>(null)

  /** How many entries cite each source. */
  const uses = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of state.articles) {
      for (const id of unique(a.sourceIds)) {
        const list = map.get(id)
        if (list) list.push(a.id)
        else map.set(id, [a.id])
      }
    }
    return map
  }, [state.articles])

  const languages = useMemo(() => unique(state.sources.map((s) => s.language)).sort(), [state.sources])
  const countries = useMemo(() => unique(state.sources.map((s) => s.country)).sort(), [state.sources])

  const distData = useMemo(() => {
    if (dist === 'country') return sel.countryDistribution(state).filter((d) => countries.includes(d.label))
    if (dist === 'language') return sel.languageDistribution(state)
    if (dist === 'tier') {
      const counts = new Map<string, number>()
      for (const s of state.sources) counts.set(TIER_LABEL[s.tier], (counts.get(TIER_LABEL[s.tier]) ?? 0) + 1)
      return Array.from(counts, ([label, value]) => ({ label, value }))
    }
    return sel.sourceTypeDistribution(state).map((d) => ({
      label: SOURCE_TYPE_LABEL[d.label as SourceType]?.zh ?? d.label,
      value: d.value,
    }))
  }, [dist, state, countries])

  const points = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of state.sources) counts.set(s.country, (counts.get(s.country) ?? 0) + 1)
    return Array.from(counts, ([label, value]) => {
      const [x, y] = place(label)
      return { label, x, y, value }
    })
  }, [state.sources])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = state.sources
    if (needle) {
      list = list.filter((s) =>
        s.title.toLowerCase().includes(needle) ||
        s.publisher.toLowerCase().includes(needle) ||
        s.id.includes(needle))
    }
    if (type !== 'all') list = list.filter((s) => s.sourceType === type)
    if (tier !== 'all') list = list.filter((s) => s.tier === tier)
    if (lang !== 'all') list = list.filter((s) => s.language === lang)
    if (country !== 'all') list = list.filter((s) => s.country === country)
    if (onlyPool) list = list.filter((s) => (uses.get(s.id) ?? []).length === 0)
    if (onlyCaution) list = list.filter((s) => Boolean(s.caution))
    const key = sortKey === 'credibility' ? (s: Source) => s.credibility
      : sortKey === 'uses' ? (s: Source) => (uses.get(s.id) ?? []).length
      : (s: Source) => s.date
    return sortBy(list, key, 'desc')
  }, [state.sources, q, type, tier, lang, country, onlyPool, onlyCaution, sortKey, uses])

  const totals = useMemo(() => ({
    all: state.sources.length,
    primary: state.sources.filter(isPrimarySource).length,
    caution: state.sources.filter((s) => s.caution).length,
    unused: state.sources.filter((s) => (uses.get(s.id) ?? []).length === 0).length,
    avg: Math.round(state.sources.reduce((n, s) => n + s.credibility, 0) / state.sources.length),
  }), [state.sources, uses])

  return (
    <div className="srcp">
      <header className="srcp__head">
        <p className="u-eyebrow">来源库 · Source registry</p>
        <h1 className="srcp__title">全部证据从哪里来</h1>
        <p className="srcp__lede">
          本站每一句承载事实的话都指向下表中的一行。这个页面存在的目的是让两个问题可以被快速回答：
          我们的证据实际来自哪里，以及其中哪些必须小心对待。
        </p>
      </header>

      <div className="srcp__totals">
        {[
          { n: totals.all, k: '来源记录' },
          { n: totals.primary, k: '一手材料' },
          { n: totals.avg, k: '平均可信度' },
          { n: totals.caution, k: '带使用提醒' },
          { n: totals.unused, k: '未被引用的候选' },
          { n: countries.length, k: '辖区' },
        ].map((s) => (
          <div key={s.k} className="srcp__total">
            <span className="srcp__total-n u-num">{s.n}</span>
            <span className="srcp__total-k">{s.k}</span>
          </div>
        ))}
      </div>

      <div className="srcp__dists">
        <PanelCard
          title="全球来源分布"
          subtitle="示意投影：本原型中的司法辖区均为虚构，不对应任何真实地理"
          icon="globe"
          className="srcp__map"
        >
          <WorldGraticule
            points={points}
            title="各虚构辖区的来源记录数量"
            onSelect={(label) => setCountry((c) => (c === label ? 'all' : label))}
          />
          {country !== 'all' && (
            <p className="srcp__map-sel">
              已筛选：<strong>{country}</strong>
              <button type="button" className="srcp__clear" onClick={() => setCountry('all')}>清除</button>
            </p>
          )}
        </PanelCard>

        <PanelCard title="构成" icon="chart" className="srcp__dist">
          <Segmented<Dist>
            ariaLabel="切换分布维度"
            size="sm"
            value={dist}
            onChange={setDist}
            options={[
              { value: 'country', label: '辖区' },
              { value: 'language', label: '语言' },
              { value: 'type', label: '类型' },
              { value: 'tier', label: '证据层级' },
            ]}
          />
          <div className="srcp__dist-bars">
            <DistributionBars data={distData} limit={10} unit="份" />
          </div>
        </PanelCard>
      </div>

      <PanelCard
        title="来源政策"
        icon="scale"
        subtitle="下表的排序不是偏好，是证据层级"
        className="srcp__policy"
        action={<Link className="srcp__policy-link" to="/method">公开版本</Link>}
      >
        <ol className="srcp__ladder">
          {[
            '原始研究（同行评审、公开方法与数据）',
            '法律文本与法院判决原文',
            '政府与统计机构的原始数据发布',
            '国际机构的条约机构意见与调查报告',
            '可靠的当地媒体与当地民间组织报告',
            '通讯社报道',
            '公开声明',
            '社交平台内容（只能证明「说法存在」，不能证明「说法成立」）',
          ].map((t, i) => (
            <li key={t} className="srcp__rung">
              <span className="srcp__rung-n u-mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="srcp__rung-t">{t}</span>
            </li>
          ))}
        </ol>
        <p className="srcp__policy-t">
          硬性下限：每篇文章至少 <strong>2 份一手材料</strong>，每个关键事实至少
          <strong> 2 个独立来源</strong>——独立指不共享同一原始信源，而不只是不同署名。
          低于下限的稿件会在发布闸门中给出警告。
        </p>
      </PanelCard>

      <div className="srcp__filters">
        <Field label="搜索" htmlFor="src-q">
          <TextInput
            id="src-q" type="search" value={q}
            onChange={(ev) => setQ(ev.target.value)}
            placeholder="标题、机构或 id"
          />
        </Field>
        <Field label="类型" htmlFor="src-type">
          <Select id="src-type" value={type} onChange={(ev) => setType(ev.target.value as 'all' | SourceType)}>
            <option value="all">全部类型</option>
            {(Object.keys(SOURCE_TYPE_LABEL) as SourceType[]).map((t) => (
              <option key={t} value={t}>{SOURCE_TYPE_LABEL[t].zh}</option>
            ))}
          </Select>
        </Field>
        <Field label="证据层级" htmlFor="src-tier">
          <Select id="src-tier" value={tier} onChange={(ev) => setTier(ev.target.value as 'all' | SourceTier)}>
            <option value="all">全部层级</option>
            <option value="primary">一手</option>
            <option value="secondary">二手</option>
            <option value="tertiary">三手</option>
          </Select>
        </Field>
        <Field label="语言" htmlFor="src-lang">
          <Select id="src-lang" value={lang} onChange={(ev) => setLang(ev.target.value)}>
            <option value="all">全部语言</option>
            {languages.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="排序" htmlFor="src-sort">
          <Select id="src-sort" value={sortKey} onChange={(ev) => setSortKey(ev.target.value as SortKey)}>
            <option value="credibility">可信度</option>
            <option value="date">日期</option>
            <option value="uses">被引用次数</option>
          </Select>
        </Field>
        <div className="srcp__checks">
          <Checkbox checked={onlyPool} onChange={setOnlyPool} label="仅未被引用的候选来源" />
          <Checkbox checked={onlyCaution} onChange={setOnlyCaution} label="仅带使用提醒的来源" />
        </div>
      </div>

      <p className="srcp__count">
        显示 {rows.length} / {state.sources.length} 条
      </p>

      {rows.length === 0 ? (
        <EmptyState title="没有符合条件的来源" hint="放宽筛选条件再试。" icon="database" />
      ) : (
        <ul className="srcp__rows">
          {rows.map((s) => {
            const used = uses.get(s.id) ?? []
            const isOpen = open === s.id
            return (
              <li key={s.id} className={cx('srcp__row', s.caution && 'srcp__row--caution')}>
                <button
                  type="button"
                  className="srcp__row-btn"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : s.id)}
                >
                  <span className="srcp__row-main">
                    <span className="srcp__row-h">{s.title}</span>
                    <span className="srcp__row-meta">
                      <span className="srcp__row-pub">{s.publisher}</span>
                      <Badge tone={s.tier === 'primary' ? 'go' : s.tier === 'secondary' ? 'info' : 'neutral'} size="sm">
                        {TIER_LABEL[s.tier]}
                      </Badge>
                      <span>{SOURCE_TYPE_LABEL[s.sourceType].zh}</span>
                      <span className="u-mono">{s.language}</span>
                      <span>{s.country}</span>
                      <time className="u-mono" dateTime={s.date}>{fmtDate(s.date)}</time>
                      {s.caution && (
                        <Tooltip label={s.caution}>
                          <span className="srcp__caution"><Icon name="alert" size={12} /> 使用提醒</span>
                        </Tooltip>
                      )}
                    </span>
                  </span>
                  <span className="srcp__row-right">
                    <span className="srcp__row-meter">
                      <Meter value={s.credibility} label="可信度" size="sm" tone="auto" />
                    </span>
                    <span className="srcp__row-uses u-num">
                      {used.length > 0 ? `${used.length} 篇引用` : '未被引用'}
                    </span>
                    <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} />
                  </span>
                </button>

                {isOpen && (
                  <div className="srcp__detail">
                    <p className="srcp__detail-k">可信度依据</p>
                    <p className="srcp__detail-t">{s.credibilityBasis}</p>
                    {s.notes && (
                      <>
                        <p className="srcp__detail-k">备注</p>
                        <p className="srcp__detail-t">{s.notes}</p>
                      </>
                    )}
                    {s.caution && (
                      <div className="srcp__detail-caution">
                        <span className="srcp__detail-k"><Icon name="alert" size={13} /> 使用提醒</span>
                        <p className="srcp__detail-t">{s.caution}</p>
                      </div>
                    )}
                    <p className="srcp__detail-k">链接</p>
                    <p className="srcp__url">
                      <span className="srcp__url-pill">{s.url}</span>
                      <span className="srcp__url-note">示例链接（不可访问）· 保留域名，永不解析</span>
                    </p>
                    <p className="srcp__detail-k">引用本来源的条目</p>
                    {used.length === 0 ? (
                      <p className="srcp__detail-t">
                        目前没有条目引用它。候选来源池中的记录可在文章工作台的左栏「加入本文」。
                      </p>
                    ) : (
                      <ul className="srcp__used">
                        {used.map((id) => {
                          const a = state.articles.find((x) => x.id === id)
                          if (!a) return null
                          return (
                            <li key={id}>
                              <Link className="srcp__used-link" to={`/command/article/${a.id}`}>
                                <Icon name="file" size={13} /> {a.title}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    <p className="srcp__id u-mono">{s.id}</p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
