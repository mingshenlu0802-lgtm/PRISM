import { useMemo, useState } from 'react'
import type { StudyKind, TopicKey } from '../../lib/types'
import type { RegionKey } from '../../lib/regions'
import { STUDY_KIND } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { byNewest, cx } from '../../lib/util'
import { EmptyState } from '../../components/common'
import { StudyCard } from '../../components/site/StudyCard'
import { FilterBar } from '../../components/site/FilterBar'
import './StudiesPage.css'

/**
 * 研究与公开数据。
 *
 * 与新闻分开是有意的：一项研究能说明什么，取决于它的设计；一条新闻能说明
 * 什么，取决于报道它的人。把两者混在一个信息流里，读者会用同一种方式对待。
 */
export default function StudiesPage(): JSX.Element {
  const { state } = usePrism()
  const [regions, setRegions] = useState<RegionKey[]>([])
  const [topics, setTopics] = useState<TopicKey[]>([])
  const [kind, setKind] = useState<'all' | StudyKind>('all')

  const live = useMemo(() => byNewest(state.studies.filter((s) => s.status === 'live')), [state.studies])

  const counts = useMemo(() => {
    const r: Partial<Record<RegionKey, number>> = {}
    const t: Partial<Record<TopicKey, number>> = {}
    for (const s of live) {
      for (const k of s.regions) r[k] = (r[k] ?? 0) + 1
      for (const k of s.topics) t[k] = (t[k] ?? 0) + 1
    }
    return { regions: r, topics: t }
  }, [live])

  const shown = useMemo(() => live.filter((s) => {
    const okR = regions.length === 0 || s.regions.some((k) => regions.includes(k))
    const okT = topics.length === 0 || s.topics.some((k) => topics.includes(k))
    const okK = kind === 'all' || s.kind === kind
    return okR && okT && okK
  }), [live, regions, topics, kind])

  const withData = live.filter((s) => s.datasetUrl).length
  const kinds = Object.keys(STUDY_KIND) as StudyKind[]

  return (
    <div className="spage u-shell">
      <header className="spage__head">
        <h1 className="spage__title">研究与公开数据</h1>
        <p className="spage__intro">
          已发表的研究、官方统计与可以直接下载的数据集。每一项都写明它<strong>不能</strong>说明什么——
          一个数字如果没有它的局限一起给出，就只是一个说法。
        </p>
        <p className="spage__count">{live.length} 项 · 其中 {withData} 项数据可直接下载</p>
      </header>

      <div className="spage__kinds">
        <button
          type="button"
          className={cx('spage__kind', kind === 'all' && 'spage__kind--on')}
          aria-pressed={kind === 'all'}
          onClick={() => setKind('all')}
        >全部类型</button>
        {kinds.map((k) => {
          const n = live.filter((s) => s.kind === k).length
          if (n === 0) return null
          return (
            <button
              key={k}
              type="button"
              className={cx('spage__kind', kind === k && 'spage__kind--on')}
              aria-pressed={kind === k}
              title={STUDY_KIND[k].note}
              onClick={() => setKind(k)}
            >
              {STUDY_KIND[k].zh}
              <span className="spage__kindn">{n}</span>
            </button>
          )
        })}
      </div>

      <FilterBar regions={regions} topics={topics} onRegions={setRegions} onTopics={setTopics} counts={counts} />

      {shown.length === 0 ? (
        <EmptyState title="这个筛选下没有条目" hint="放宽筛选条件再试。" icon="book" />
      ) : (
        <div className="spage__grid">
          {shown.map((s) => <StudyCard key={s.id} item={s} />)}
        </div>
      )}
    </div>
  )
}
