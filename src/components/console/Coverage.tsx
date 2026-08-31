import { useMemo } from 'react'
import { usePrism } from '../../lib/store'
import { PRIORITY_REGIONS, REGION_MAP } from '../../lib/regions'
import { TOPICS } from '../../lib/constants'
import { cx, relTime } from '../../lib/util'
import { Icon } from '../common'
import './Coverage.css'

/**
 * 覆盖情况。
 *
 * 一个编辑最容易犯的错，不是写错了什么，而是**没注意到自己漏了什么**。
 * 内地的新闻天天有，台湾的可能两周没动过，而你不会主动想起来去查。
 *
 * 这一栏就是替你想起来：哪个地区、哪个议题多久没有新内容了。
 * 它不替你决定该不该补——一个地区安静两周，可能真的没发生什么值得报的事。
 * 它只是把事实摆出来。
 */

/** 多久算「安静了」。优先地区盯得紧一些，因为你说过要先看它们。 */
const QUIET_DAYS = { priority: 7, other: 21 }

interface Row {
  key: string
  label: string
  hue: string
  count: number
  lastAt?: string
  days: number
  priority: boolean
}

function daysSince(iso: string | undefined, now: number): number {
  if (!iso) return Infinity
  return Math.floor((now - Date.parse(iso)) / 86_400_000)
}

export function Coverage(): JSX.Element {
  const { state } = usePrism()

  const { regions, topics, now } = useMemo(() => {
    const live = state.news.filter((n) => n.status === 'live')
    const at = Date.parse(`${state.today}T23:59:59Z`)

    const build = (
      keys: { key: string; label: string; hue: string }[],
      pick: (n: typeof live[number]) => string[],
      isPriority: (k: string) => boolean,
    ): Row[] => keys.map(({ key, label, hue }) => {
      const mine = live.filter((n) => pick(n).includes(key))
      const lastAt = mine.map((n) => n.publishedAt).sort().at(-1)
      return { key, label, hue, count: mine.length, lastAt, days: daysSince(lastAt, at), priority: isPriority(key) }
    })

    return {
      now: at,
      regions: build(
        Object.values(REGION_MAP).map((r) => ({ key: r.key, label: r.zh, hue: r.hue })),
        (n) => n.regions,
        (k) => (PRIORITY_REGIONS as readonly string[]).includes(k),
      ),
      topics: build(
        TOPICS.map((t) => ({ key: t.key, label: t.short, hue: t.hue })),
        (n) => n.topics,
        () => false,
      ),
    }
  }, [state.news, state.today])

  const quiet = regions.filter((r) => r.days > (r.priority ? QUIET_DAYS.priority : QUIET_DAYS.other))
  const quietPriority = quiet.filter((r) => r.priority)

  return (
    <section className="cov">
      <div className="cov__head">
        <h3 className="cov__title">覆盖情况</h3>
        <p className="cov__lede">
          哪些地方最近没有新内容了。这不是提醒你「必须去补」——安静两周也可能是真的没事发生。
          它只是让你不至于漏掉。
        </p>
      </div>

      {quietPriority.length > 0 && (
        <p className="cov__alert">
          <Icon name="alert" size={14} />
          你的优先地区里，<strong>{quietPriority.map((r) => r.label).join('、')}</strong>
          已经超过 {QUIET_DAYS.priority} 天没有新内容。
        </p>
      )}

      <p className="cov__group">地区</p>
      <ul className="cov__list">
        {regions.map((r) => <CovRow key={r.key} row={r} now={now} />)}
      </ul>

      <p className="cov__group">议题</p>
      <ul className="cov__list">
        {topics.map((t) => <CovRow key={t.key} row={t} now={now} />)}
      </ul>
    </section>
  )
}

function CovRow({ row, now }: { row: Row; now: number }): JSX.Element {
  const limit = row.priority ? QUIET_DAYS.priority : QUIET_DAYS.other
  const quiet = row.days > limit
  // 条形按「有多少条」画，但长度封顶，免得一个地区有 40 条就把别的都压扁了。
  const bar = Math.min(100, row.count * 12)

  return (
    <li className={cx('cov__row', quiet && 'cov__row--quiet', row.count === 0 && 'cov__row--empty')}>
      <span className="cov__dot" style={{ background: row.hue }} aria-hidden="true" />
      <span className="cov__name">
        {row.label}
        {row.priority && <span className="cov__pri">优先</span>}
      </span>
      <span className="cov__bar" aria-hidden="true">
        <span className="cov__fill" style={{ width: `${bar}%`, background: row.hue }} />
      </span>
      <span className="cov__num u-num">{row.count}</span>
      <span className="cov__when">
        {row.lastAt ? relTime(row.lastAt, new Date(now).toISOString()) : '还没有内容'}
      </span>
    </li>
  )
}
