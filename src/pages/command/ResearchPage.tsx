import { useMemo, useState } from 'react'

import { Link } from 'react-router-dom'

import type { ResearchItem, TopicKey } from '../../lib/types'
import { TOPICS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { cx, fmtDate, sortBy } from '../../lib/util'
import {
  Badge, EmptyState, Field, Icon, Select, TopicChip,
} from '../../components/common'
import './ResearchPage.css'

/**
 * 研究雷达 — the study material available for drafting.
 *
 * Each item's limitation is given the same weight as its finding: an effect
 * size without the design that produced it is a claim, not a finding.
 */

const TYPE_META: Record<ResearchItem['type'], { zh: string; tone: 'go' | 'info' | 'warn' | 'neutral'; note: string }> = {
  'peer-reviewed': { zh: '同行评审', tone: 'go', note: '经过外部评审，方法与数据通常可复核。' },
  'systematic-review': { zh: '系统综述', tone: 'go', note: '按预设标准检索并汇总既有研究，评的是证据强度。' },
  'official-statistics': { zh: '官方统计', tone: 'info', note: '统计机构发布，口径随表公布，但口径本身可能变动。' },
  'ngo-study': { zh: '民间研究', tone: 'neutral', note: '由利益相关方发布；数字可核对，但选题与提问服务于其立场。' },
  preprint: { zh: '预印本 · 未经同行评审', tone: 'warn', note: '尚未经过外部评审，结论可能在评审中改变，不用于支撑事实陈述。' },
}


export default function ResearchPage() {
  const { state } = usePrism()
  const [type, setType] = useState<'all' | ResearchItem['type']>('all')
  const [topic, setTopic] = useState<'all' | TopicKey>('all')

  const research = useMemo(() => {
    let list = state.research
    if (type !== 'all') list = list.filter((r) => r.type === type)
    if (topic !== 'all') list = list.filter((r) => r.topics.includes(topic))
    return sortBy(list, (r) => r.date, 'desc')
  }, [state.research, type, topic])


  const preprints = state.research.filter((r) => r.type === 'preprint').length

  return (
    <div className="resp">
      <header className="resp__head">
        <p className="u-eyebrow">研究雷达 · Research &amp; claims</p>
        <h1 className="resp__title">证据基础</h1>
        <p className="resp__lede">
          可用于起草的研究材料。每一项都注明它的设计能支持什么、不能支持什么，
          预印本一律标注为未经同行评审。
        </p>
      </header>

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
    </div>
  )
}
