import { useState } from 'react'
import type { MediaLink, NewsItem, TopicKey } from '../../lib/types'
import type { RegionKey } from '../../lib/regions'
import { REGIONS } from '../../lib/regions'
import { TOPICS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { cx, fmtDateTime, isPlaceholderUrl, textLength, uid } from '../../lib/util'
import { Icon, Modal, TextArea, TextInput, toast } from '../common'
import './NewsEditor.css'

/**
 * 一条新闻的编辑卡。
 *
 * 目标是「站长敢按」：每个按钮都写明后果，删除要二次确认，下架可以一键恢复，
 * 改坏了有「还原」。任何字段都能改——总结、要点、标签、每一个媒体链接。
 */
export function NewsEditor({ item }: { item: NewsItem }): JSX.Element {
  const { dispatch, who, isAdmin } = usePrism()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draft, setDraft] = useState({
    headline: item.headline,
    summary: item.summary,
    bullets: item.bullets.join('\n'),
    editorNote: item.editorNote ?? '',
  })
  const [newLink, setNewLink] = useState({ outlet: '', title: '', url: '' })

  const dirty =
    draft.headline !== item.headline
    || draft.summary !== item.summary
    || draft.bullets !== item.bullets.join('\n')
    || draft.editorNote !== (item.editorNote ?? '')

  const save = () => {
    dispatch({
      type: 'news-edit', id: item.id, who,
      patch: {
        headline: draft.headline.trim() || item.headline,
        summary: draft.summary.trim(),
        bullets: draft.bullets.split('\n').map((b) => b.trim()).filter(Boolean),
        editorNote: draft.editorNote.trim() || undefined,
      },
    })
    toast('已保存。', 'go')
  }

  const revert = () => setDraft({
    headline: item.headline,
    summary: item.summary,
    bullets: item.bullets.join('\n'),
    editorNote: item.editorNote ?? '',
  })

  const toggleTag = <T extends string>(list: T[], key: T): T[] =>
    (list.includes(key) ? list.filter((k) => k !== key) : [...list, key])

  const addLink = () => {
    if (!newLink.outlet.trim() || !newLink.url.trim()) { toast('媒体名称和链接都要填。', 'warn'); return }
    const link: MediaLink = {
      id: uid('l'),
      outlet: newLink.outlet.trim(),
      title: newLink.title.trim() || newLink.outlet.trim(),
      url: newLink.url.trim(),
      lang: 'zh-Hans',
      date: new Date().toISOString().slice(0, 10),
    }
    dispatch({ type: 'news-link-add', id: item.id, link, who })
    setNewLink({ outlet: '', title: '', url: '' })
    toast('链接已加上。', 'go')
  }

  return (
    <article className={cx('nedit', item.status === 'hidden' && 'nedit--hidden')}>
      <header className="nedit__head">
        <button
          type="button"
          className="nedit__toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={16} />
          <span className="nedit__headline">{item.headline}</span>
        </button>
        <div className="nedit__badges">
          {item.status === 'hidden' && <span className="nedit__badge nedit__badge--off">已下架</span>}
          {item.origin === 'auto' && !item.editedByHuman && <span className="nedit__badge">AI 自动</span>}
          {item.editedByHuman && <span className="nedit__badge nedit__badge--edited">你改过</span>}
          <span className="nedit__linkn">{item.links.length} 链接</span>
        </div>
      </header>

      {!open && <p className="nedit__peek">{item.summary}</p>}

      {open && (
        <div className="nedit__body">
          <label className="nedit__label" htmlFor={`h-${item.id}`}>标题</label>
          <TextInput
            id={`h-${item.id}`} value={draft.headline}
            onChange={(e) => setDraft((d) => ({ ...d, headline: e.currentTarget.value }))}
            disabled={!isAdmin}
          />

          <label className="nedit__label" htmlFor={`s-${item.id}`}>
            总结
            <span className="nedit__hint">两到四句就好。当前 {textLength(draft.summary)} 字。</span>
          </label>
          <TextArea
            id={`s-${item.id}`} rows={5} value={draft.summary}
            onChange={(e) => setDraft((d) => ({ ...d, summary: e.currentTarget.value }))}
            disabled={!isAdmin}
          />

          <label className="nedit__label" htmlFor={`b-${item.id}`}>
            要点
            <span className="nedit__hint">一行一条，留空就不显示。</span>
          </label>
          <TextArea
            id={`b-${item.id}`} rows={3} value={draft.bullets}
            onChange={(e) => setDraft((d) => ({ ...d, bullets: e.currentTarget.value }))}
            disabled={!isAdmin}
          />

          <label className="nedit__label" htmlFor={`e-${item.id}`}>
            你的补充
            <span className="nedit__hint">会以「站长补充」显示在总结下方。</span>
          </label>
          <TextArea
            id={`e-${item.id}`} rows={2} value={draft.editorNote}
            onChange={(e) => setDraft((d) => ({ ...d, editorNote: e.currentTarget.value }))}
            disabled={!isAdmin}
          />

          {dirty && (
            <div className="nedit__saverow">
              <button type="button" className="nedit__save" onClick={save} disabled={!isAdmin}>
                <Icon name="check" size={14} />保存修改
              </button>
              <button type="button" className="nedit__revert" onClick={revert}>还原</button>
            </div>
          )}

          <p className="nedit__label">地区标签<span className="nedit__hint">可以选多个</span></p>
          <div className="nedit__tags">
            {REGIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                disabled={!isAdmin}
                className={cx('nedit__tag', item.regions.includes(r.key) && 'nedit__tag--on')}
                aria-pressed={item.regions.includes(r.key)}
                onClick={() => dispatch({ type: 'news-edit', id: item.id, who, patch: { regions: toggleTag(item.regions, r.key) as RegionKey[] } })}
              >
                <span className="nedit__dot" style={{ background: r.hue }} aria-hidden="true" />{r.zh}
              </button>
            ))}
          </div>

          <p className="nedit__label">议题标签<span className="nedit__hint">可以选多个</span></p>
          <div className="nedit__tags">
            {TOPICS.map((t) => (
              <button
                key={t.key}
                type="button"
                disabled={!isAdmin}
                className={cx('nedit__tag', item.topics.includes(t.key) && 'nedit__tag--on')}
                aria-pressed={item.topics.includes(t.key)}
                onClick={() => dispatch({ type: 'news-edit', id: item.id, who, patch: { topics: toggleTag(item.topics, t.key) as TopicKey[] } })}
              >
                <span className="nedit__gem" style={{ background: t.hue }} aria-hidden="true" />{t.short}
              </button>
            ))}
          </div>

          <p className="nedit__label">媒体链接<span className="nedit__hint">删掉不想要的，或自己加一个</span></p>
          <ul className="nedit__links">
            {item.links.map((l) => (
              <li key={l.id} className="nedit__link">
                <div className="nedit__linkmain">
                  <span className="nedit__linkoutlet">{l.outlet}</span>
                  <span className="nedit__linktitle">{l.title}</span>
                  <span className={cx('nedit__linkurl', isPlaceholderUrl(l.url) && 'nedit__linkurl--demo')}>
                    {l.url}{isPlaceholderUrl(l.url) && ' · 示例链接'}
                  </span>
                </div>
                <button
                  type="button"
                  className="nedit__linkdel"
                  disabled={!isAdmin}
                  aria-label={`删除 ${l.outlet} 的链接`}
                  onClick={() => {
                    dispatch({ type: 'news-link-remove', id: item.id, linkId: l.id, who })
                    toast(`已删除 ${l.outlet} 的链接。`, 'info')
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </li>
            ))}
          </ul>

          <div className="nedit__addlink">
            <TextInput placeholder="媒体名称，例：端传媒" value={newLink.outlet}
              onChange={(e) => setNewLink((l) => ({ ...l, outlet: e.currentTarget.value }))} disabled={!isAdmin} />
            <TextInput placeholder="标题（可留空）" value={newLink.title}
              onChange={(e) => setNewLink((l) => ({ ...l, title: e.currentTarget.value }))} disabled={!isAdmin} />
            <TextInput placeholder="https://…" value={newLink.url}
              onChange={(e) => setNewLink((l) => ({ ...l, url: e.currentTarget.value }))} disabled={!isAdmin} />
            <button type="button" className="nedit__addbtn" onClick={addLink} disabled={!isAdmin}>
              <Icon name="plus" size={14} />加链接
            </button>
          </div>

          <div className="nedit__actions">
            {item.status === 'live' ? (
              <button type="button" className="nedit__act" disabled={!isAdmin}
                onClick={() => { dispatch({ type: 'news-hide', id: item.id, who }); toast('已下架，公众站看不到了。随时可以恢复。', 'info') }}>
                <Icon name="eye-off" size={14} />下架（可恢复）
              </button>
            ) : (
              <button type="button" className="nedit__act nedit__act--go" disabled={!isAdmin}
                onClick={() => { dispatch({ type: 'news-restore', id: item.id, who }); toast('已重新上线。', 'go') }}>
                <Icon name="eye" size={14} />重新上线
              </button>
            )}
            <button type="button" className="nedit__act nedit__act--danger" disabled={!isAdmin}
              onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" size={14} />永久删除
            </button>
            <span className="nedit__stamp">收录 {fmtDateTime(item.publishedAt)}</span>
          </div>
        </div>
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="永久删除这条？"
        subtitle={item.headline}
        tone="danger"
        footer={
          <>
            <button type="button" className="nedit__mbtn" onClick={() => setConfirmDelete(false)}>算了</button>
            <button type="button" className="nedit__mbtn nedit__mbtn--danger"
              onClick={() => { dispatch({ type: 'news-delete', id: item.id, who }); setConfirmDelete(false); toast('已永久删除。', 'info') }}>
              删除
            </button>
          </>
        }
      >
        <p className="nedit__mtext">
          删除之后找不回来。如果只是暂时不想让别人看到，用<strong>下架</strong>就好——下架随时可以恢复。
        </p>
      </Modal>
    </article>
  )
}
