import type { TopicKey } from '../../lib/types'
import type { RegionKey } from '../../lib/regions'
import { REGIONS } from '../../lib/regions'
import { TOPICS } from '../../lib/constants'
import { cx } from '../../lib/util'
import { Icon } from '../common'
import './FilterBar.css'

/**
 * 首页筛选。一次可以选多个地区和多个议题——因为一条新闻本来就可以属于多个。
 * 选中的条件用「与」连接地区组与议题组，组内用「或」：选了香港和台湾，
 * 就是「香港或台湾」；再选暴力，就是「（香港或台湾）且 涉及暴力议题」。
 */

export interface FilterBarProps {
  regions: RegionKey[]
  topics: TopicKey[]
  onRegions: (next: RegionKey[]) => void
  onTopics: (next: TopicKey[]) => void
  counts?: { regions: Partial<Record<RegionKey, number>>; topics: Partial<Record<TopicKey, number>> }
}

export function FilterBar({ regions, topics, onRegions, onTopics, counts }: FilterBarProps): JSX.Element {
  const toggle = <T extends string>(list: T[], key: T): T[] =>
    (list.includes(key) ? list.filter((k) => k !== key) : [...list, key])

  const active = regions.length + topics.length

  return (
    <div className="fbar">
      <div className="fbar__group">
        <p className="fbar__label">地区</p>
        <div className="fbar__chips">
          {REGIONS.map((r) => {
            const n = counts?.regions[r.key]
            if (n === 0 && !regions.includes(r.key)) return null
            return (
              <button
                key={r.key}
                type="button"
                className={cx('fbar__chip', regions.includes(r.key) && 'fbar__chip--on')}
                aria-pressed={regions.includes(r.key)}
                onClick={() => onRegions(toggle(regions, r.key))}
              >
                <span className="fbar__dot" style={{ background: r.hue }} aria-hidden="true" />
                {r.zh}
                {typeof n === 'number' && <span className="fbar__n">{n}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="fbar__group">
        <p className="fbar__label">议题</p>
        <div className="fbar__chips">
          {TOPICS.map((t) => {
            const n = counts?.topics[t.key]
            if (n === 0 && !topics.includes(t.key)) return null
            return (
              <button
                key={t.key}
                type="button"
                className={cx('fbar__chip', topics.includes(t.key) && 'fbar__chip--on')}
                aria-pressed={topics.includes(t.key)}
                title={t.zh}
                onClick={() => onTopics(toggle(topics, t.key))}
              >
                <span className="fbar__gem" style={{ background: t.hue }} aria-hidden="true" />
                {t.short}
                {typeof n === 'number' && <span className="fbar__n">{n}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {active > 0 && (
        <button
          type="button"
          className="fbar__clear"
          onClick={() => { onRegions([]); onTopics([]) }}
        >
          <Icon name="x" size={13} />
          清除 {active} 个筛选
        </button>
      )}
    </div>
  )
}
