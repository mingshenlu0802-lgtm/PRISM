import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { ResearchItem, TopicKey } from '../../lib/types'
import { TOPICS, VERDICT_MAP } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { cx, fmtDate, sortBy } from '../../lib/util'
import {
  Badge, EmptyState, Field, Icon, Meter, Segmented, Select, TopicChip, VerdictBadge,
} from '../../components/common'
import { PanelCard } from '../../components/command/PanelCard'
import './ResearchPage.css'

/**
 * 研究雷达与可疑说法。
 *
 * Two lists that must never be confused with each other. Research is what the
 * evidence base says, with its limitation given the same weight as its
 * finding. Suspicious claims are what is circulating — watching a claim is not
 * the same as having checked it, and the page says so where it cannot be
 * missed.
 */

type Pane = 'research' | 'claims'

const TYPE_META: Record<ResearchItem['type'], { zh: string; tone: 'go' | 'info' | 'warn' | 'neutral'; note: string }> = {
  'peer-reviewed': { zh: '同行评审', tone: 'go', note: '经过外部评审，方法与数据通常可复核。' },
  'systematic-review': { zh: '系统综述', tone: 'go', note: '按预设标准检索并汇总既有研究，评的是证据强度。' },
  'official-statistics': { zh: '官方统计', tone: 'info', note: '统计机构发布，口径随表公布，但口径本身可能变动。' },
  'ngo-study': { zh: '民间研究', tone: 'neutral', note: '由利益相关方发布；数字可核对，但选题与提问服务于其立场。' },
  preprint: { zh: '预印本 · 未经同行评审', tone: 'warn', note: '尚未经过外部评审，结论可能在评审中改变，不用于支撑事实陈述。' },
}

const CLAIM_STATUS: Record<'watching' | 'checking' | 'published-check', { zh: string; tone: 'neutral' | 'warn' | 'go'; note: string }> = {
  watching: { zh: '观察中', tone: 'neutral', note: '已记录传播情况，尚未开始核查。观察不等于核查。' },
  checking: { zh: '核查中', tone: 'warn', note: '正在回溯原始材料，尚未得出结论。' },
  'published-check': { zh: '已发布核查', tone: 'go', note: '核查已完成并公开，结论与依据可查。' },
}

export default function ResearchPage() {
  const { state } = usePrism()
  const [pane, setPane] = useState<Pane>('research')
  const [type, setType] = useState<'all' | ResearchItem['type']>('all')
  const [topic, setTopic] = useState<'all' | TopicKey>('all')

  const research = useMemo(() => {
    let list = state.research
    if (type !== 'all') list = list.filter((r) => r.type === type)
    if (topic !== 'all') list = list.filter((r) => r.topics.includes(topic))
    return sortBy(list, (r) => r.date, 'desc')
  }, [state.research, type, topic])

  const claims = useMemo(
    () => sortBy(state.suspiciousClaims, (c) => c.velocity, 'desc'),
    [state.suspiciousClaims],
  )

  const preprints = state.research.filter((r) => r.type === 'preprint').length
  const unchecked = state.suspiciousClaims.filter((c) => c.status !== 'published-check').length

  return (
    <div className="resp">
      <header className="resp__head">
        <p className="u-eyebrow">研究雷达 · Research &amp; claims</p>
        <h1 className="resp__title">证据基础与正在流传的说法</h1>
        <p className="resp__lede">
          左边是证据，右边是传言。两者在这个页面上被刻意分开：
          一项研究能支持什么由它的设计决定，一个说法在传播多广与它是否属实无关。
        </p>
      </header>

      <Segmented<Pane>
        ariaLabel="切换研究雷达与可疑说法"
        value={pane}
        onChange={setPane}
        options={[
          { value: 'research', label: '最新研究', count: state.research.length },
          { value: 'claims', label: '正在传播的可疑说法', count: state.suspiciousClaims.length },
        ]}
      />

      {pane === 'research' ? (
        <>
          <div className="resp__filters">
            <Field label="研究类型" htmlFor="res-type">
              <Select id="res-type" value={type} onChange={(ev) => setType(ev.target.value as 'all' | ResearchItem['type'])}>
                <option value="all">全部类型</option>
                {(Object.keys(TYPE_META) as ResearchItem['type'][]).map((t) => (
                  <option key={t} value={t}>{TYPE_META[t].zh}</option>
                ))}
              </Select>
            </Field>
            <Field label="议题" htmlFor="res-topic">
              <Select id="res-topic" value={topic} onChange={(ev) => setTopic(ev.target.value as 'all' | TopicKey)}>
                <option value="all">全部议题</option>
                {TOPICS.map((t) => <option key={t.key} value={t.key}>{t.zh}</option>)}
              </Select>
            </Field>
            <p className="resp__filter-note">
              其中 {preprints} 项为预印本，未经同行评审——它们在本站不用于支撑任何事实陈述。
            </p>
          </div>

          {research.length === 0 ? (
            <EmptyState title="没有符合条件的研究" hint="调整类型或议题筛选。" icon="book" />
          ) : (
            <ul className="resp__list">
              {research.map((r) => {
                const meta = TYPE_META[r.type]
                const source = state.sources.find((s) => s.id === r.sourceId)
                return (
                  <li key={r.id} className={cx('resp__item', r.type === 'preprint' && 'resp__item--preprint')}>
                    <div className="resp__item-top">
                      <Badge tone={meta.tone} size="sm">{meta.zh}</Badge>
                      <span className="resp__item-pub">{r.publisher}</span>
                      <time className="resp__item-date u-mono" dateTime={r.date}>{fmtDate(r.date)}</time>
                    </div>
                    <h2 className="resp__item-h">{r.title}</h2>
                    <p className="resp__item-sum">{r.summary}</p>
                    <div className="resp__two">
                      <div className="resp__cell resp__cell--strength">
                        <span className="resp__cell-k"><Icon name="check" size={13} /> 这项研究能支持什么</span>
                        <p className="resp__cell-t">{r.strength}</p>
                      </div>
                      <div className="resp__cell resp__cell--limit">
                        <span className="resp__cell-k"><Icon name="alert" size={13} /> 它不能支持什么</span>
                        <p className="resp__cell-t">{r.limitation}</p>
                      </div>
                    </div>
                    <div className="resp__item-foot">
                      <div className="resp__topics">
                        {r.topics.map((t) => <TopicChip key={t} topic={t} size="sm" />)}
                      </div>
                      {source && (
                        <span className="resp__src">
                          来源可信度
                          <span className="resp__src-n u-num">{source.credibility}</span>
                          <Link className="resp__src-link" to="/command/sources">在来源库中查看</Link>
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="resp__warn">
            <Icon name="alert" size={16} />
            <p>
              <strong>观察中的说法不等于已核查的说法。</strong>
              这个列表记录的是「有什么在传播」，不是「什么是真的」。目前 {unchecked} 条尚未得出结论——
              在结论发布之前，本站不会以任何形式转述这些说法的内容作为事实。
            </p>
          </div>

          <ul className="resp__claims">
            {claims.map((c) => {
              const st = CLAIM_STATUS[c.status]
              const check = c.linkedFactCheckId ? state.factChecks.find((f) => f.id === c.linkedFactCheckId) : undefined
              return (
                <li key={c.id} className="resp__claim">
                  <div className="resp__claim-top">
                    <Badge tone={st.tone} size="sm">{st.zh}</Badge>
                    {check && <VerdictBadge verdict={check.verdict} size="sm" />}
                  </div>
                  <blockquote className="resp__claim-q">{c.claim}</blockquote>
                  <p className="resp__claim-spread">{c.spread}</p>
                  <div className="resp__claim-venues">
                    <span className="resp__claim-k">流传于</span>
                    {c.venues.map((v) => <span key={v} className="resp__venue">{v}</span>)}
                  </div>
                  <Meter
                    value={c.velocity}
                    label="传播强度"
                    tone={c.velocity >= 70 ? 'bad' : c.velocity >= 45 ? 'warn' : 'info'}
                    hint="传播强度只反映扩散速度，与真假无关；高传播强度只意味着核查更紧迫。"
                  />
                  <div className="resp__claim-foot">
                    <span className="resp__claim-note">{st.note}</span>
                    {check && (
                      <Link className="resp__claim-link" to={`/fact-checks/${check.id}`}>
                        <Icon name="arrow-up-right" size={13} />
                        查看已发布的核查：{VERDICT_MAP[check.verdict].zh}
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <PanelCard title="为什么这两个列表不能合并" icon="scale" className="resp__explainer">
        <p className="resp__explainer-t">
          把研究与传言放进同一个信息流，会让读者用同一种方式对待它们。
          一项系统综述与一条无法回溯到原始记录的截图，在传播层面可能强度相当，
          在证据层面则完全不可比——前者能支持推论，后者只能证明「有人这么说」。
        </p>
        <p className="resp__explainer-t">
          因此本站对两者采用不同的处理：研究会被引用，并附上它<strong>不能</strong>支持什么；
          可疑说法只会被核查，在结论出来之前不进入任何一篇报道的正文。
        </p>
      </PanelCard>
    </div>
  )
}
