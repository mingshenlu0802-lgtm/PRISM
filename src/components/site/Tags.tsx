import { Link } from 'react-router-dom'
import type { TopicKey } from '../../lib/types'
import type { RegionKey } from '../../lib/regions'
import { REGION_MAP } from '../../lib/regions'
import { TOPIC_MAP } from '../../lib/constants'
import { cx } from '../../lib/util'
import './Tags.css'

/**
 * 地区标签与议题标签。
 *
 * 一条内容可以同时带多个地区和多个议题，所以标签必须小、能换行、并且一眼能
 * 分出「这是地区」还是「这是议题」——地区带实心色点，议题带菱形。
 */

export function RegionTag({ region, link = true, size = 'md' }: {
  region: RegionKey; link?: boolean; size?: 'sm' | 'md'
}): JSX.Element {
  const meta = REGION_MAP[region]
  const label = meta?.zh ?? region
  const body = (
    <>
      <span className="tagx__dot" style={{ background: meta?.hue ?? 'var(--fg-faint)' }} aria-hidden="true" />
      {label}
    </>
  )
  const cls = cx('tagx', 'tagx--region', size === 'sm' && 'tagx--sm')
  if (!link) return <span className={cls}>{body}</span>
  return <Link className={cls} to={`/region/${region}`}>{body}</Link>
}

export function TopicTag({ topic, link = true, size = 'md' }: {
  topic: TopicKey; link?: boolean; size?: 'sm' | 'md'
}): JSX.Element {
  const meta = TOPIC_MAP[topic]
  const body = (
    <>
      <span className="tagx__gem" style={{ background: meta?.hue ?? 'var(--fg-faint)' }} aria-hidden="true" />
      {meta?.short ?? topic}
    </>
  )
  const cls = cx('tagx', 'tagx--topic', size === 'sm' && 'tagx--sm')
  if (!link) return <span className={cls}>{body}</span>
  return <Link className={cls} to={`/topic/${topic}`} title={meta?.zh}>{body}</Link>
}

export function TagRow({ regions, topics, link = true, size = 'md' }: {
  regions: RegionKey[]; topics: TopicKey[]; link?: boolean; size?: 'sm' | 'md'
}): JSX.Element {
  return (
    <div className="tagx__row">
      {regions.map((r) => <RegionTag key={r} region={r} link={link} size={size} />)}
      {topics.map((t) => <TopicTag key={t} topic={t} link={link} size={size} />)}
    </div>
  )
}
