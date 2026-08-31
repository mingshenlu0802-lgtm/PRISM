import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { AuditAction, AuditEntry } from '../../lib/types'
import { usePrism } from '../../lib/store'
import { cx, fmtClock, fmtDate, sortBy, unique } from '../../lib/util'
import { Badge, EmptyState, Field, Icon, Segmented, Select, TextInput } from '../../components/common'
import { PanelCard } from '../../components/command/PanelCard'
import './AuditPage.css'

/**
 * 操作、审批与发布记录。
 *
 * The log has one job: make it possible to reconstruct how each published
 * entry got approved, and by whom. It is filterable rather than summarised,
 * because a summary is exactly where an inconvenient entry would go missing.
 */

type Actor = 'all' | 'editor' | 'ai-desk' | 'system'

const ACTION_LABEL: Record<AuditAction, string> = {
  discovered: '发现线索',
  drafted: '生成草稿',
  'ai-review': '自动检查',
  edited: '编辑修改',
  'vibe-instruction': '自然语言指令',
  'version-adopted': '采用版本',
  'version-discarded': '弃用版本',
  approved: '批准',
  scheduled: '排程',
  published: '发布',
  'more-sources-requested': '要求增加来源',
  'returned-for-research': '退回重新研究',
  rejected: '拒绝',
  archived: '归档',
  updated: '更新',
  retracted: '撤回',
  'lock-engaged': '开启发布锁',
  'lock-released': '解除发布锁',
  'image-generated': '生成图像',
  'image-approved': '批准图像',
  'image-rejected': '退回图像',
  'brief-sent': '送出简报',
}

/** Actions that change what the public can see. */
const PUBLIC_ACTIONS: AuditAction[] = ['published', 'updated', 'retracted']

const ACTOR_LABEL: Record<AuditEntry['actorKind'], string> = {
  editor: '主编',
  'ai-desk': '自动编辑台',
  system: '系统',
}

export default function AuditPage() {
  const { state } = usePrism()
  const [actor, setActor] = useState<Actor>('all')
  const [action, setAction] = useState<'all' | AuditAction>('all')
  const [articleId, setArticleId] = useState('all')
  const [q, setQ] = useState('')

  const entries = useMemo(() => sortBy(state.audit, (e) => e.at, 'desc'), [state.audit])

  const usedActions = useMemo(
    () => unique(entries.map((e) => e.action)).sort((a, b) => ACTION_LABEL[a].localeCompare(ACTION_LABEL[b], 'zh')),
    [entries],
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return entries.filter((e) => {
      if (actor !== 'all' && e.actorKind !== actor) return false
      if (action !== 'all' && e.action !== action) return false
      if (articleId !== 'all' && e.articleId !== articleId) return false
      if (needle && !`${e.target} ${e.detail}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [entries, actor, action, articleId, q])

  const byDay = useMemo(() => {
    const map = new Map<string, AuditEntry[]>()
    for (const e of filtered) {
      const day = e.at.slice(0, 10)
      const list = map.get(day)
      if (list) list.push(e)
      else map.set(day, [e])
    }
    return Array.from(map, ([day, items]) => ({ day, items }))
  }, [filtered])

  const summary = useMemo(() => {
    const today = entries.filter((e) => e.at.slice(0, 10) === state.today)
    const publishEvents = entries.filter((e) => PUBLIC_ACTIONS.includes(e.action))
    return {
      today: today.length,
      byDesk: entries.filter((e) => e.actorKind === 'ai-desk').length,
      byEditor: entries.filter((e) => e.actorKind === 'editor').length,
      publishEvents: publishEvents.length,
      publishByDesk: publishEvents.filter((e) => e.actorKind !== 'editor').length,
    }
  }, [entries, state.today])

  return (
    <div className="audp">
      <header className="audp__head">
        <p className="u-eyebrow">操作记录 · Audit log</p>
        <h1 className="audp__title">谁在什么时候做了什么</h1>
        <p className="audp__lede">
          搜集、起草、自动检查、修改、审批、发布、更新、撤回与发布锁操作的完整记录。
          这份日志的用途是：任何一条已发布的内容，都能被回溯到是谁批准的、依据是什么。
        </p>
      </header>

      <PanelCard title="这份记录说明了什么" icon="shield" className="audp__summary">
        <div className="audp__sum-grid">
          <div className="audp__sum">
            <span className="audp__sum-n u-num">{summary.today}</span>
            <span className="audp__sum-k">今日操作</span>
          </div>
          <div className="audp__sum">
            <span className="audp__sum-n u-num">{summary.byDesk}</span>
            <span className="audp__sum-k">由自动编辑台执行</span>
          </div>
          <div className="audp__sum">
            <span className="audp__sum-n u-num">{summary.byEditor}</span>
            <span className="audp__sum-k">由主编执行</span>
          </div>
          <div className="audp__sum audp__sum--key">
            <span className="audp__sum-n u-num">{summary.publishEvents}</span>
            <span className="audp__sum-k">影响公开内容的操作</span>
          </div>
        </div>
        <p className={cx('audp__claim', summary.publishByDesk === 0 && 'audp__claim--ok')}>
          <Icon name={summary.publishByDesk === 0 ? 'check-double' : 'alert'} size={15} />
          {summary.publishByDesk === 0
            ? `全部 ${summary.publishEvents} 次影响公开内容的操作（发布、更新、撤回）都由人执行。自动编辑台在这份记录中没有任何一次发布行为——它没有这个权限。`
            : `注意：有 ${summary.publishByDesk} 次影响公开内容的操作不是由主编执行的。这不应当发生，请核查。`}
        </p>
      </PanelCard>

      <div className="audp__filters">
        <Segmented<Actor>
          ariaLabel="按执行者筛选"
          value={actor}
          onChange={setActor}
          options={[
            { value: 'all', label: '全部', count: entries.length },
            { value: 'editor', label: '主编', count: summary.byEditor },
            { value: 'ai-desk', label: '自动编辑台', count: summary.byDesk },
            { value: 'system', label: '系统', count: entries.filter((e) => e.actorKind === 'system').length },
          ]}
        />
        <div className="audp__selects">
          <Field label="操作类型" htmlFor="aud-action">
            <Select id="aud-action" value={action} onChange={(ev) => setAction(ev.target.value as 'all' | AuditAction)}>
              <option value="all">全部操作</option>
              {usedActions.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
            </Select>
          </Field>
          <Field label="条目" htmlFor="aud-article">
            <Select id="aud-article" value={articleId} onChange={(ev) => setArticleId(ev.target.value)}>
              <option value="all">全部条目</option>
              {state.articles.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </Select>
          </Field>
          <Field label="搜索" htmlFor="aud-q">
            <TextInput
              id="aud-q" type="search" value={q}
              onChange={(ev) => setQ(ev.target.value)}
              placeholder="在对象与说明中搜索"
            />
          </Field>
        </div>
      </div>

      <p className="audp__count">显示 {filtered.length} / {entries.length} 条</p>

      {byDay.length === 0 ? (
        <EmptyState title="没有符合条件的记录" hint="放宽筛选条件再试。" icon="history" />
      ) : (
        <div className="audp__log">
          {byDay.map(({ day, items }) => (
            <section key={day} className="audp__day">
              <h2 className="audp__day-h">
                <span className="u-mono">{fmtDate(day)}</span>
                <span className="audp__day-n">{items.length} 条</span>
              </h2>
              <ol className="audp__items">
                {items.map((e) => {
                  const article = e.articleId ? state.articles.find((a) => a.id === e.articleId) : undefined
                  const isPublic = PUBLIC_ACTIONS.includes(e.action)
                  return (
                    <li
                      key={e.id}
                      className={cx(
                        'audp__item',
                        `audp__item--${e.actorKind}`,
                        isPublic && 'audp__item--public',
                      )}
                    >
                      <time className="audp__at u-mono" dateTime={e.at}>{fmtClock(e.at)}</time>
                      <span className={cx('audp__actor', `audp__actor--${e.actorKind}`)}>
                        <Icon name={e.actorKind === 'editor' ? 'users' : e.actorKind === 'ai-desk' ? 'sparkle' : 'database'} size={12} />
                        {ACTOR_LABEL[e.actorKind]}
                      </span>
                      <div className="audp__body">
                        <p className="audp__line">
                          <Badge tone={isPublic ? 'live' : 'neutral'} size="sm">{ACTION_LABEL[e.action]}</Badge>
                          {article ? (
                            <Link className="audp__target" to={`/command/article/${article.id}`}>{e.target}</Link>
                          ) : (
                            <span className="audp__target audp__target--plain">{e.target}</span>
                          )}
                        </p>
                        <p className="audp__detail">{e.detail}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
