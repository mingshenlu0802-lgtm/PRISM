import { Link } from 'react-router-dom'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { fmtDateTime, nowIso, relTime } from '../../lib/util'
import { Icon } from '../common'
import './LockBanner.css'

/**
 * Global Publishing Lock — the console-wide stop sign.
 *
 * Renders nothing when the lock is off. When it is on, every command page
 * carries this banner: who engaged it, when, why, how much work it is holding,
 * and the one link that releases it. Colour never carries the message alone —
 * the word 「已开启」 and the lock glyph do.
 */

export function LockBanner(): JSX.Element | null {
  const { state } = usePrism()
  const lock = state.lock

  if (!lock.engaged) return null

  const held = sel.approvedNotLive(state).length + sel.scheduled(state).length
  const since = lock.since

  return (
    <aside className="lockb" role="region" aria-label="全局发布锁状态">
      <span className="lockb__glyph" aria-hidden="true">
        <Icon name="lock" size={18} />
      </span>

      <div className="lockb__body">
        <p className="lockb__title">
          <span className="lockb__flag">已开启</span>
          Global Publishing Lock · 全站公开发布已暂停
        </p>

        <p className="lockb__meta">
          由 <strong className="lockb__who">{lock.by ?? '主编'}</strong>
          {since ? (
            <>
              {' '}于 <time dateTime={since}>{fmtDateTime(since)}</time>
              <span className="lockb__rel">（{relTime(since, nowIso())}）</span>
            </>
          ) : null}
          {' '}开启。
          {held > 0 ? (
            <>
              {' '}目前有 <span className="lockb__num u-num">{held}</span> 篇已批准或已排程的条目被扣住；
              「批准并立即发布」只会记录批准，不会公开。
            </>
          ) : (
            <> 目前没有等待发布的条目。</>
          )}
        </p>

        {lock.reason ? (
          <p className="lockb__reason">
            <span className="lockb__reason-key">开启原因</span>
            {lock.reason}
          </p>
        ) : (
          <p className="lockb__reason">
            <span className="lockb__reason-key">开启原因</span>
            未填写原因 —— 解除前请在发布控制中补记，操作记录需要可追溯的理由。
          </p>
        )}
      </div>

      <Link className="lockb__cta" to="/command/settings">
        前往发布控制解除
        <Icon name="arrow-right" size={14} />
      </Link>
    </aside>
  )
}
