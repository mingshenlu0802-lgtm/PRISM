import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import type { Article, Correction } from '../../lib/types'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { cx, fmtDate, fmtDateTime, sortBy } from '../../lib/util'
import { Badge, DemoTag, EmptyState, Icon, StatusBadge } from '../../components/common'
import './CorrectionsPage.css'

/**
 * 更正记录 — every correction, clarification, update and retraction the
 * newsroom has made, kept permanently and in public.
 *
 * A correction log that quietly disappears is worse than none: it teaches
 * readers that the record can be edited behind them. So nothing here is ever
 * removed, entries keep the name of whoever made them, and an entry that is
 * still pending an update says so rather than looking settled.
 */

const KIND_META: Record<Correction['kind'], { zh: string; en: string; note: string; tone: 'info' | 'warn' | 'stop' | 'neutral' }> = {
  correction: {
    zh: '更正', en: 'Correction', tone: 'warn',
    note: '原文中有事实性错误，已改正并说明改了什么。',
  },
  clarification: {
    zh: '澄清', en: 'Clarification', tone: 'info',
    note: '原文事实无误，但表述可能被读成别的意思，已补充语境。',
  },
  update: {
    zh: '更新', en: 'Update', tone: 'neutral',
    note: '出现新的证据或进展，原文据此补充，旧表述保留可查。',
  },
  retraction: {
    zh: '撤回', en: 'Retraction', tone: 'stop',
    note: '核心陈述不再成立，全文撤回；原文与撤回理由一并保留。',
  },
}

interface Row {
  correction: Correction
  article: Article
}

export default function CorrectionsPage() {
  const { state } = usePrism()

  const rows = useMemo<Row[]>(() => {
    const all: Row[] = []
    for (const article of state.articles) {
      for (const correction of article.corrections) all.push({ correction, article })
    }
    return sortBy(all, (r) => r.correction.at, 'desc')
  }, [state.articles])

  const byMonth = useMemo(() => {
    const map = new Map<string, Row[]>()
    for (const r of rows) {
      const key = r.correction.at.slice(0, 7)
      const list = map.get(key)
      if (list) list.push(r)
      else map.set(key, [r])
    }
    return Array.from(map, ([month, items]) => ({ month, items }))
  }, [rows])

  const counts = useMemo(() => {
    const c: Record<Correction['kind'], number> = { correction: 0, clarification: 0, update: 0, retraction: 0 }
    for (const r of rows) c[r.correction.kind] += 1
    return c
  }, [rows])

  const pendingUpdate = sel.needsUpdate(state)
  const retracted = state.articles.filter((a) => a.status === 'retracted')

  return (
    <main className="corrpg u-shell">
      <header className="corrpg__head">
        <p className="u-eyebrow">更正记录 · Corrections &amp; updates</p>
        <h1 className="corrpg__title">我们改过什么</h1>
        <p className="corrpg__lede">
          更正、澄清、更新与撤回在本站永久公开保存，附时间与执行人。
          我们不静默修改已发布的内容——如果一段话变了，这里会写明它原本是什么、为什么变。
        </p>
        <hr className="prism-rule corrpg__rule" />
        <div className="corrpg__counts">
          {(Object.keys(KIND_META) as Correction['kind'][]).map((k) => (
            <div key={k} className="corrpg__count">
              <span className="corrpg__count-n u-num">{counts[k]}</span>
              <span className="corrpg__count-k">{KIND_META[k].zh}</span>
              <span className="corrpg__count-t">{KIND_META[k].note}</span>
            </div>
          ))}
        </div>
      </header>

      {(pendingUpdate.length > 0 || retracted.length > 0) && (
        <section className="corrpg__pending" aria-labelledby="corr-pending">
          <h2 id="corr-pending" className="corrpg__h2">当前状态有变的条目</h2>
          <p className="corrpg__note">
            以下条目仍在处理中。它们保持可访问，但顶部标注了当前状态，读者不必先读完再发现内容已经过时。
          </p>
          <ul className="corrpg__pending-list">
            {[...pendingUpdate, ...retracted].map((a) => (
              <li key={a.id} className="corrpg__pending-item">
                <StatusBadge status={a.status} size="sm" />
                <Link className="corrpg__pending-link" to={`/article/${a.slug}`}>{a.title}</Link>
                <span className="corrpg__pending-t">
                  {a.status === 'update-needed'
                    ? '已发布内容出现新的一手材料，原文的解释框架正在重新评估；在更新完成前不静默修改正文。'
                    : '核心陈述不再成立，全文已撤回；原文与撤回理由保留可查。'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="corrpg__log" aria-labelledby="corr-log">
        <h2 id="corr-log" className="corrpg__h2">完整记录</h2>
        {rows.length === 0 ? (
          <EmptyState
            title="目前没有更正记录"
            hint="这不代表我们没有出错——只代表还没有出错被发现并记录。发现错误请循「关于」页的方式告诉我们。"
            icon="history"
          />
        ) : (
          byMonth.map(({ month, items }) => (
            <div key={month} className="corrpg__month">
              <h3 className="corrpg__month-h u-mono">{month.replace('-', ' / ')}</h3>
              <ol className="corrpg__items">
                {items.map(({ correction, article }) => {
                  const meta = KIND_META[correction.kind]
                  return (
                    <li key={correction.id} className={cx('corrpg__item', `corrpg__item--${correction.kind}`)}>
                      <div className="corrpg__item-top">
                        <Badge tone={meta.tone} size="sm">{meta.zh}</Badge>
                        <span className="corrpg__item-en u-mono">{meta.en}</span>
                        <time className="corrpg__item-at u-mono" dateTime={correction.at}>
                          {fmtDateTime(correction.at)}
                        </time>
                      </div>
                      <p className="corrpg__item-body">{correction.text}</p>
                      <div className="corrpg__item-foot">
                        <Link className="corrpg__item-link" to={`/article/${article.slug}`}>
                          <Icon name="file" size={13} />
                          {article.title}
                        </Link>
                        <span className="corrpg__item-by">执行：{correction.by}</span>
                        <span className="corrpg__item-pub">
                          原文发表于 {article.publishedAt ? fmtDate(article.publishedAt) : '未发表'}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          ))
        )}
      </section>

      <section className="corrpg__policy" aria-labelledby="corr-policy">
        <h2 id="corr-policy" className="corrpg__h2">我们的更正政策</h2>
        <ul className="corrpg__policy-list">
          <li className="corrpg__policy-item">
            <strong>不静默修改。</strong>任何影响读者理解的改动都会在这里留下记录，包括我们自己发现的错误。
          </li>
          <li className="corrpg__policy-item">
            <strong>结论也会被修订。</strong>事实核查的结论如果因新证据而改变，旧结论与修订理由一并公开保留，不覆盖。
          </li>
          <li className="corrpg__policy-item">
            <strong>撤回不等于删除。</strong>撤回的条目保留可访问，并写明撤回理由；把错误从网上抹掉，读者就无法判断我们的可靠性。
          </li>
          <li className="corrpg__policy-item">
            <strong>更正由人执行。</strong>自动编辑台可以标记疑点，但更正、澄清、更新与撤回都由主编决定并署名。
          </li>
        </ul>
        <p className="corrpg__policy-foot">
          完整标准见 <Link to="/method">方法与标准</Link>。 <DemoTag />
        </p>
      </section>
    </main>
  )
}
