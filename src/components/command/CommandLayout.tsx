import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Badge, Icon, Modal, PrismMark, ToastHost, toast } from '../common'
import type { IconName } from '../common'
import { LockBanner } from './LockBanner'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { cx, fmtClock, fmtDate, relTime } from '../../lib/util'
import './CommandLayout.css'

/**
 * PRISM Command — the editor's private console.
 *
 * A low-light room: one dark surface, a collapsible left rail, and a top bar
 * that never stops repeating the two facts the whole product turns on — the
 * automated desk cannot publish, and the Global Publishing Lock outranks every
 * approval in the building.
 */

const RAIL_KEY = 'prism.command.rail'

interface NavItem {
  icon: IconName
  label: string
  path: string
  hint: string
  match: (p: string) => boolean
}

const NAV: NavItem[] = [
  { icon: 'grid', label: '总览', path: '/command', hint: '今日控制台', match: (p) => p === '/command' || p === '/command/' },
  { icon: 'list', label: '审批队列', path: '/command/queue', hint: '等待人工审核的稿件', match: (p) => p.startsWith('/command/queue') || p.startsWith('/command/article') },
  { icon: 'target', label: '今日信号', path: '/command/signals', hint: '合并后的选题线索', match: (p) => p.startsWith('/command/signals') },
  { icon: 'book', label: '研究雷达', path: '/command/research', hint: '新研究与可疑说法', match: (p) => p.startsWith('/command/research') },
  { icon: 'database', label: '来源库', path: '/command/sources', hint: '来源分级与可信度依据', match: (p) => p.startsWith('/command/sources') },
  { icon: 'mail', label: '每日简报', path: '/command/brief', hint: '发给主编的当日简报', match: (p) => p.startsWith('/command/brief') },
  { icon: 'history', label: '操作记录', path: '/command/audit', hint: '不可省略的审计轨迹', match: (p) => p.startsWith('/command/audit') },
  { icon: 'lock', label: '发布控制', path: '/command/settings', hint: '全局发布锁与发布策略', match: (p) => p.startsWith('/command/settings') },
]

/** The four the editor touches every day; the rest live behind 「更多」. */
const TAB_PATHS = ['/command', '/command/queue', '/command/signals', '/command/brief']

function whereLabel(path: string): { title: string; parent?: string } {
  if (/^\/command\/article\/[^/]+\/versions/.test(path)) return { title: '版本与差异', parent: '审批队列' }
  if (/^\/command\/article\/[^/]+\/studio/.test(path)) return { title: '图像工作室', parent: '审批队列' }
  if (/^\/command\/article\//.test(path)) return { title: '文章工作台', parent: '审批队列' }
  const item = NAV.find((n) => n.match(path))
  if (item) return { title: item.label === '总览' ? '今日控制台' : item.label }
  return { title: 'PRISM Command' }
}

function readRail(): boolean {
  try {
    return window.localStorage.getItem(RAIL_KEY) === 'collapsed'
  } catch {
    return false
  }
}

export default function CommandLayout(): JSX.Element {
  const { state, resetDemo } = usePrism()
  const { pathname } = useLocation()

  const [collapsed, setCollapsed] = useState(readRail)
  const [moreOpen, setMoreOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  // The console is always dark. PublicLayout re-claims the surface on its own
  // mount, so this never needs a teardown that could race the next layout.
  useEffect(() => {
    document.documentElement.dataset.surface = 'command'
  }, [])

  useEffect(() => { setMoreOpen(false) }, [pathname])

  const toggleRail = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { window.localStorage.setItem(RAIL_KEY, next ? 'collapsed' : 'expanded') } catch { /* storage unavailable */ }
      return next
    })
  }, [])

  const pending = sel.pendingReview(state)
  const run = sel.latestPipeline(state)
  const where = whereLabel(pathname)
  const locked = state.lock.engaged

  const runLine = run
    ? run.outcome === 'running'
      ? `运行中 · 已完成 ${run.stages.filter((s) => s.state === 'done').length}/${run.stages.length} 个阶段`
      : run.outcome === 'blocked'
        ? `已中止 · ${run.stages.find((s) => s.state === 'blocked')?.zh ?? '未知阶段'}阶段`
        : `${run.finishedAt ? fmtClock(run.finishedAt) : fmtClock(run.startedAt)} UTC 完成 · 已移交控制端`
    : '今日尚无运行记录'

  const runTone: 'go' | 'hold' | 'stop' = run
    ? run.outcome === 'blocked' ? 'stop' : run.outcome === 'running' ? 'hold' : 'go'
    : 'hold'

  const overflow = NAV.filter((n) => !TAB_PATHS.includes(n.path))

  return (
    <div className={cx('cmdl', collapsed && 'cmdl--collapsed')}>
      <a className="u-skip" href="#cmd-main">跳到主要内容</a>

      {/* ------------------------------- rail ------------------------------ */}
      <aside className="cmdl__rail" aria-label="控制台导航">
        <div className="cmdl__railhead">
          <Link className="cmdl__brand" to="/command" aria-label="PRISM Command 总览">
            <PrismMark size={26} />
            <span className="cmdl__brandtext">
              <span className="cmdl__brandname">PRISM</span>
              <span className="cmdl__brandsub">Command</span>
            </span>
          </Link>
        </div>

        <nav className="cmdl__nav">
          <ul className="cmdl__navlist">
            {NAV.map((item) => {
              const active = item.match(pathname)
              return (
                <li key={item.path}>
                  <Link
                    className={cx('cmdl__navlink', active && 'cmdl__navlink--active')}
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    title={`${item.label} · ${item.hint}`}
                  >
                    <span className="cmdl__navicon" aria-hidden="true"><Icon name={item.icon} size={17} /></span>
                    <span className="cmdl__navlabel">
                      <span className="cmdl__navname">{item.label}</span>
                      <span className="cmdl__navhint">{item.hint}</span>
                    </span>
                    {item.path === '/command/queue' && pending.length > 0 ? (
                      <span className="cmdl__navcount u-num" aria-hidden="true">{pending.length}</span>
                    ) : null}
                    {item.path === '/command/settings' && locked ? (
                      <span className="cmdl__navdot" aria-hidden="true" />
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="cmdl__railfoot">
          <p className="cmdl__railnote">
            <Icon name="shield" size={12} />
            <span className="cmdl__navlabel">自动编辑台无发布权限</span>
          </p>
          <button type="button" className="cmdl__reset" onClick={() => setResetOpen(true)}>
            <Icon name="refresh" size={13} />
            <span className="cmdl__navlabel">重置演示数据</span>
          </button>
        </div>
      </aside>

      {/* ------------------------------- main ------------------------------ */}
      <div className="cmdl__main">
        <header className="cmdl__top">
          <div className="cmdl__toprow">
            <Link className="cmdl__brandm" to="/command" aria-label="PRISM Command 总览">
              <PrismMark size={22} />
              <span className="cmdl__brandname">PRISM Command</span>
            </Link>

            <button
              type="button"
              className="cmdl__collapse"
              onClick={toggleRail}
              aria-expanded={!collapsed}
              aria-label={collapsed ? '展开侧栏导航' : '收起侧栏导航'}
            >
              <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
            </button>

            <div className="cmdl__where">
              {where.parent ? <span className="cmdl__whereparent">{where.parent} ／</span> : null}
              <span className="cmdl__wheretitle">{where.title}</span>
            </div>

            <div className="cmdl__tools">
              <Link
                className="cmdl__chip cmdl__chip--pending"
                to="/command/queue"
                aria-label={`待审文章 ${pending.length} 篇，前往审批队列`}
              >
                <Icon name="eye" size={13} />
                <span className="cmdl__chiplabel" aria-hidden="true">待审</span>
                <span className="cmdl__chipnum u-num" aria-hidden="true">{pending.length}</span>
              </Link>

              <Link
                className={cx('cmdl__chip', 'cmdl__lock', locked && 'cmdl__lock--on')}
                to="/command/settings"
                aria-label={
                  locked
                    ? `Global Publishing Lock 已开启${state.lock.since ? `，自 ${fmtDate(state.lock.since)}` : ''}，全站公开发布被暂停。前往发布控制`
                    : 'Global Publishing Lock 未开启，发布流程正常。前往发布控制'
                }
              >
                <Icon name={locked ? 'lock' : 'unlock'} size={13} />
                <span className="cmdl__chiplabel" aria-hidden="true">
                  {locked ? '发布锁已开启' : '发布未锁定'}
                </span>
              </Link>

              <span className="cmdl__who" title="当前身份：主编（你）——只有你可以批准与发布">
                <Icon name="users" size={13} />
                <span className="cmdl__whotext">主编（你）</span>
              </span>

              <Link className="cmdl__chip cmdl__public" to="/" aria-label="查看公众站">
                <Icon name="arrow-up-right" size={13} />
                <span className="cmdl__chiplabel" aria-hidden="true">查看公众站</span>
              </Link>
            </div>
          </div>

          <div className="cmdl__strip">
            <span className="cmdl__stripitem u-num">
              <Icon name="calendar" size={12} />
              {fmtDate(state.today)}
            </span>
            <span className={cx('cmdl__stripitem', 'cmdl__runstate', `cmdl__runstate--${runTone}`)}>
              <span className="cmdl__runmark" aria-hidden="true" />
              自动编辑台：{runLine}
            </span>
            {run ? (
              <span className="cmdl__stripitem cmdl__striphide">
                产出草稿 {run.producedArticleIds.length} 篇 · 信号 {run.producedSignalIds.length} 条
              </span>
            ) : null}
            <span className="cmdl__stripitem cmdl__nopub">
              <Icon name="shield" size={12} />
              自动编辑台无发布权限：批准与发布只能由主编在本控制端完成
            </span>
            {locked && state.lock.since ? (
              <span className="cmdl__stripitem cmdl__striplock">
                发布锁已开启 {relTime(state.lock.since, state.today)}
              </span>
            ) : null}
          </div>
        </header>

        <main className="cmdl__scroll" id="cmd-main" data-scroll-root tabIndex={-1}>
          <LockBanner />
          <Outlet />
        </main>

        {/* --------------------------- bottom tabs -------------------------- */}
        <nav className="cmdl__tabs" aria-label="控制台主导航">
          {NAV.filter((n) => TAB_PATHS.includes(n.path)).map((item) => {
            const active = item.match(pathname)
            return (
              <Link
                key={item.path}
                className={cx('cmdl__tab', active && 'cmdl__tab--active')}
                to={item.path}
                aria-current={active ? 'page' : undefined}
              >
                <span className="cmdl__tabicon" aria-hidden="true"><Icon name={item.icon} size={18} /></span>
                <span className="cmdl__tabtext">{item.label}</span>
                {item.path === '/command/queue' && pending.length > 0 ? (
                  <span className="cmdl__tabcount u-num" aria-hidden="true">{pending.length}</span>
                ) : null}
              </Link>
            )
          })}
          <button
            type="button"
            className={cx('cmdl__tab', overflow.some((n) => n.match(pathname)) && 'cmdl__tab--active')}
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
          >
            <span className="cmdl__tabicon" aria-hidden="true"><Icon name="menu" size={18} /></span>
            <span className="cmdl__tabtext">更多</span>
            {locked ? <span className="cmdl__tabdot" aria-hidden="true" /> : null}
          </button>
        </nav>
      </div>

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="更多控制台页面"
        subtitle="所有页面共用同一份操作记录；发布仍然只能在「发布控制」与稿件页完成。"
        width="sm"
      >
        <ul className="cmdl__sheet">
          {overflow.map((item) => (
            <li key={item.path}>
              <Link className="cmdl__sheetitem" to={item.path} onClick={() => setMoreOpen(false)}>
                <span className="cmdl__sheeticon" aria-hidden="true"><Icon name={item.icon} size={16} /></span>
                <span className="cmdl__sheettext">
                  <span className="cmdl__sheetname">{item.label}</span>
                  <span className="cmdl__sheethint">{item.hint}</span>
                </span>
                {item.path === '/command/settings' && locked ? <Badge tone="stop" size="sm">已锁</Badge> : null}
                <Icon name="chevron-right" size={14} />
              </Link>
            </li>
          ))}
          <li>
            <Link className="cmdl__sheetitem" to="/" onClick={() => setMoreOpen(false)}>
              <span className="cmdl__sheeticon" aria-hidden="true"><Icon name="arrow-up-right" size={16} /></span>
              <span className="cmdl__sheettext">
                <span className="cmdl__sheetname">查看公众站</span>
                <span className="cmdl__sheethint">读者看到的版本</span>
              </span>
              <Icon name="chevron-right" size={14} />
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="cmdl__sheetitem"
              onClick={() => { setMoreOpen(false); setResetOpen(true) }}
            >
              <span className="cmdl__sheeticon" aria-hidden="true"><Icon name="refresh" size={16} /></span>
              <span className="cmdl__sheettext">
                <span className="cmdl__sheetname">重置演示数据</span>
                <span className="cmdl__sheethint">恢复到初始的虚构数据集</span>
              </span>
            </button>
          </li>
        </ul>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="重置演示数据？"
        subtitle="本原型的全部内容都是虚构演示数据。"
        width="sm"
        tone="danger"
        footer={
          <>
            <button type="button" className="cmdl__btn" onClick={() => setResetOpen(false)}>取消</button>
            <button
              type="button"
              className="cmdl__btn cmdl__btn--danger"
              onClick={() => { resetDemo(); setResetOpen(false); toast('演示数据已重置。', 'go') }}
            >
              重置
            </button>
          </>
        }
      >
        <p className="cmdl__modaltext">
          你在本次会话中做出的审批、版本采用、风险处理、发布锁记录与操作记录都会被清除，数据集恢复到初始状态。
          此操作只影响浏览器本地存储，不会发送到任何服务器。
        </p>
      </Modal>

      <ToastHost />
    </div>
  )
}
