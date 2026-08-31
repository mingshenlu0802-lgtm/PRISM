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
  const { dispatch, who, canEdit } = usePrism()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draft, setDraft] = useState({
    headline: item.headline,
    summary: item.summary,
    bullets: item.bullets.join('\n'),
    editorNote: item.editorNote ?? '',
    imageUrl: item.image?.url ?? '',
    imageAlt: item.image?.alt ?? '',
    imageCredit: item.image?.credit ?? '',
    imageCreditUrl: item.image?.creditUrl ?? '',
  })
  const [newLink, setNewLink] = useState({ outlet: '', title: '', url: '' })

  const dirty =
    draft.headline !== item.headline
    || draft.summary !== item.summary
    || draft.bullets !== item.bullets.join('\n')
    || draft.editorNote !== (item.editorNote ?? '')
    || draft.imageUrl !== (item.image?.url ?? '')
    || draft.imageAlt !== (item.image?.alt ?? '')
    || draft.imageCredit !== (item.image?.credit ?? '')
    || draft.imageCreditUrl !== (item.image?.creditUrl ?? '')

  const save = () => {
    const url = draft.imageUrl.trim()
    // 图必须带署名和描述，缺一样就不存这张图——挂着别人的照片不写来源是不行的，
    // 而没有描述等于把看不见图的读者排除在外。
    if (url && (!draft.imageCredit.trim() || !draft.imageAlt.trim())) {
      toast('配图要填「图片说明」和「来源署名」，两样都填了才能保存这张图。', 'warn')
      return
    }
    dispatch({
      type: 'news-edit', id: item.id, who,
      patch: {
        headline: draft.headline.trim() || item.headline,
        summary: draft.summary.trim(),
        bullets: draft.bullets.split('\n').map((b) => b.trim()).filter(Boolean),
        editorNote: draft.editorNote.trim() || undefined,
        image: url
          ? {
            url,
            alt: draft.imageAlt.trim(),
            credit: draft.imageCredit.trim(),
            creditUrl: draft.imageCreditUrl.trim() || undefined,
          }
          : undefined,
      },
    })
    toast('已保存。', 'go')
  }

  const revert = () => setDraft({
    headline: item.headline,
    summary: item.summary,
    bullets: item.bullets.join('\n'),
    editorNote: item.editorNote ?? '',
    imageUrl: item.image?.url ?? '',
    imageAlt: item.image?.alt ?? '',
    imageCredit: item.image?.credit ?? '',
    imageCreditUrl: item.image?.creditUrl ?? '',
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
          {item.featured && <span className="nedit__badge nedit__badge--lead">头条</span>}
          {item.status === 'hidden' && <span className="nedit__badge nedit__badge--off">已下架</span>}
          {item.origin === 'auto' && !item.editedByHuman && <span className="nedit__badge">AI 自动</span>}
          {item.editedByHuman && <span className="nedit__badge nedit__badge--edited">你编辑过</span>}
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
            disabled={!canEdit}
          />

          <label className="nedit__label" htmlFor={`s-${item.id}`}>
            总结
            <span className="nedit__hint">
              想写多长写多长，几百上千字都行。空一行分段。当前 {textLength(draft.summary)} 字。
            </span>
          </label>
          <TextArea
            id={`s-${item.id}`} rows={14} value={draft.summary}
            onChange={(e) => setDraft((d) => ({ ...d, summary: e.currentTarget.value }))}
            disabled={!canEdit}
          />

          <label className="nedit__label" htmlFor={`b-${item.id}`}>
            要点
            <span className="nedit__hint">一行一条，留空就不显示。</span>
          </label>
          <TextArea
            id={`b-${item.id}`} rows={3} value={draft.bullets}
            onChange={(e) => setDraft((d) => ({ ...d, bullets: e.currentTarget.value }))}
            disabled={!canEdit}
          />

          <label className="nedit__label" htmlFor={`e-${item.id}`}>
            你的补充
            <span className="nedit__hint">会以「站长补充」显示在总结下方。</span>
          </label>
          <TextArea
            id={`e-${item.id}`} rows={2} value={draft.editorNote}
            onChange={(e) => setDraft((d) => ({ ...d, editorNote: e.currentTarget.value }))}
            disabled={!canEdit}
          />

          <p className="nedit__label">
            配图
            <span className="nedit__hint">
              留空就用系统自动画的封面。填了图片网址，署名和说明就必须一起填。
            </span>
          </p>
          <div className="nedit__img">
            {draft.imageUrl.trim() && (
              <img className="nedit__imgprev" src={draft.imageUrl.trim()} alt="" />
            )}
            <div className="nedit__imgfields">
              <TextInput
                placeholder="图片网址（https://…）"
                value={draft.imageUrl}
                onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.currentTarget.value }))}
                disabled={!canEdit}
              />
              <TextInput
                placeholder="图片说明：图里有什么（给看不见图的人读）"
                value={draft.imageAlt}
                onChange={(e) => setDraft((d) => ({ ...d, imageAlt: e.currentTarget.value }))}
                disabled={!canEdit}
              />
              <TextInput
                placeholder="来源署名：摄影师或机构"
                value={draft.imageCredit}
                onChange={(e) => setDraft((d) => ({ ...d, imageCredit: e.currentTarget.value }))}
                disabled={!canEdit}
              />
              <TextInput
                placeholder="图片出处网址（可留空）"
                value={draft.imageCreditUrl}
                onChange={(e) => setDraft((d) => ({ ...d, imageCreditUrl: e.currentTarget.value }))}
                disabled={!canEdit}
              />
            </div>
          </div>
          <p className="nedit__imgnote">
            <Icon name="alert" size={12} />
            图是别人拍的。直接引用别人网站上的图，对方随时可能换掉或封掉外链，
            而且未必允许转载——最稳妥的做法是取得授权后自己存一份，再把网址填这里。
          </p>

          {dirty && (
            <div className="nedit__saverow">
              <button type="button" className="nedit__save" onClick={save} disabled={!canEdit}>
                <Icon name="check" size={14} />保存
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
                disabled={!canEdit}
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
                disabled={!canEdit}
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
                  disabled={!canEdit}
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
              onChange={(e) => setNewLink((l) => ({ ...l, outlet: e.currentTarget.value }))} disabled={!canEdit} />
            <TextInput placeholder="标题（可留空）" value={newLink.title}
              onChange={(e) => setNewLink((l) => ({ ...l, title: e.currentTarget.value }))} disabled={!canEdit} />
            <TextInput placeholder="https://…" value={newLink.url}
              onChange={(e) => setNewLink((l) => ({ ...l, url: e.currentTarget.value }))} disabled={!canEdit} />
            <button type="button" className="nedit__addbtn" onClick={addLink} disabled={!canEdit}>
              <Icon name="plus" size={14} />加链接
            </button>
          </div>

          <div className="nedit__actions">
            {item.featured ? (
              <button type="button" className="nedit__act nedit__act--lead" disabled={!canEdit}
                onClick={() => { dispatch({ type: 'news-feature', id: item.id, on: false, who }); toast('已取消头条。首页会用最新的一条顶上。', 'info') }}>
                <Icon name="star" size={14} />取消头条
              </button>
            ) : (
              <button type="button" className="nedit__act" disabled={!canEdit || item.status !== 'live'}
                title={item.status !== 'live' ? '下架的条目不能当头条，先重新上线' : undefined}
                onClick={() => { dispatch({ type: 'news-feature', id: item.id, on: true, who }); toast('已设为头条，原来的头条自动让位。', 'go') }}>
                <Icon name="star" size={14} />设为头条
              </button>
            )}
            {item.status === 'live' ? (
              <button type="button" className="nedit__act" disabled={!canEdit}
                onClick={() => { dispatch({ type: 'news-hide', id: item.id, who }); toast('已下架，公众站看不到了。随时可以恢复。', 'info') }}>
                <Icon name="eye-off" size={14} />下架（可恢复）
              </button>
            ) : (
              <button type="button" className="nedit__act nedit__act--go" disabled={!canEdit}
                onClick={() => { dispatch({ type: 'news-restore', id: item.id, who }); toast('已重新上线。', 'go') }}>
                <Icon name="eye" size={14} />重新上线
              </button>
            )}
            <button type="button" className="nedit__act nedit__act--danger" disabled={!canEdit}
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
