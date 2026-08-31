import { useState } from 'react'
import type { MediaLink, StudyFigure, StudyItem, StudyKind, TopicKey } from '../../lib/types'
import type { RegionKey } from '../../lib/regions'
import { REGIONS } from '../../lib/regions'
import { STUDY_KIND, TOPICS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { cx, fmtDate, isPlaceholderUrl, textLength, uid } from '../../lib/util'
import { Icon, Modal, Select, TextArea, TextInput, toast } from '../common'
import './NewsEditor.css'
import './StudyEditor.css'

/**
 * 一项研究的编辑卡。
 *
 * 跟 `NewsEditor` 是一对，刻意长得一模一样、用同一套 `nedit` 样式——
 * 站长在「内容」里来回切「新闻／研究」，两边的操作不该要重新学一遍。
 *
 * 在这之前研究只能下架和删除，改不了一个字。于是「＋自己写一项研究」建出来的
 * 那条，标题写着「点开写标题」，却**根本没有可以点开的地方**——比不给这个按钮
 * 还糟。读者在研究卡上看得到的每一样东西，这里都要能写：来源机构、日期、
 * 类型、总结、关键数字、这份研究说不了什么、数据链接、报道链接。
 */
export function StudyEditor(
  { item, openAtFirst = false }: { item: StudyItem; openAtFirst?: boolean },
): JSX.Element {
  const { dispatch, who, canEdit } = usePrism()
  // 刚按「自己写一项研究」建出来的，直接展开——跟新闻那边一个道理。
  const [open, setOpen] = useState(openAtFirst)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const asDraft = (s: StudyItem) => ({
    title: s.title,
    publisher: s.publisher,
    date: s.date,
    summary: s.summary,
    limitation: s.limitation,
    datasetUrl: s.datasetUrl ?? '',
  })
  const [draft, setDraft] = useState(asDraft(item))
  /*
   * 关键数字也走草稿，不是每敲一个字符就存一次。
   *
   * 每一次 study-edit 都会往「最近编辑」里记一条、并且往数据库写一次——
   * 逐字符派发的话，写一句「样本只覆盖城市地区」就能把站长的操作记录冲掉，
   * 顺带发出去几十个网络请求。跟标题、总结一样：改完按「保存」。
   */
  const [figures, setFigures] = useState<StudyFigure[]>(item.figures)
  const [newLink, setNewLink] = useState({ outlet: '', title: '', url: '' })

  const dirty = (Object.keys(draft) as (keyof typeof draft)[])
    .some((k) => draft[k] !== asDraft(item)[k])
    || JSON.stringify(figures) !== JSON.stringify(item.figures)

  const save = () => {
    dispatch({
      type: 'study-edit',
      id: item.id,
      who,
      patch: {
        title: draft.title.trim() || item.title,
        publisher: draft.publisher.trim(),
        date: draft.date,
        summary: draft.summary.trim(),
        limitation: draft.limitation.trim(),
        datasetUrl: draft.datasetUrl.trim() || undefined,
        // 三格全空的那一组是加了没写的，存进去只会在读者页面上留个空壳。
        figures: figures
          .map((f) => ({ label: f.label.trim(), value: f.value.trim(), note: f.note.trim() }))
          .filter((f) => f.label || f.value),
      },
    })
    toast('已保存。', 'go')
  }

  const revert = () => { setDraft(asDraft(item)); setFigures(item.figures) }

  const toggleTag = <T extends string>(list: T[], key: T): T[] =>
    (list.includes(key) ? list.filter((k) => k !== key) : [...list, key])

  /** 关键数字：一个数字旁边必须写清楚它**说不了**什么，所以三格是一组。 */
  const patchFigure = (i: number, patch: Partial<StudyFigure>) =>
    setFigures((fs) => fs.map((f, n) => (n === i ? { ...f, ...patch } : f)))

  const addLink = () => {
    if (!newLink.outlet.trim() || !newLink.url.trim()) { toast('来源名称和链接都要填。', 'warn'); return }
    const link: MediaLink = {
      id: uid('l'),
      outlet: newLink.outlet.trim(),
      title: newLink.title.trim() || newLink.outlet.trim(),
      url: newLink.url.trim(),
      lang: 'zh-Hans',
      date: new Date().toISOString().slice(0, 10),
    }
    dispatch({ type: 'study-edit', id: item.id, who, patch: { links: [...item.links, link] } })
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
          <span className="nedit__headline">{item.title}</span>
        </button>
        <div className="nedit__badges">
          {item.status === 'hidden' && <span className="nedit__badge nedit__badge--off">已下架</span>}
          {item.origin === 'editor' && <span className="nedit__badge nedit__badge--mine">你写的</span>}
          {item.origin === 'auto' && !item.editedByHuman && <span className="nedit__badge">AI 自动</span>}
          {item.origin === 'auto' && item.editedByHuman && <span className="nedit__badge nedit__badge--edited">你编辑过</span>}
          <span className="nedit__linkn">{item.links.length} 链接</span>
        </div>
      </header>

      {!open && <p className="nedit__peek">{item.summary}</p>}

      {open && (
        <div className="nedit__body">
          <label className="nedit__label" htmlFor={`st-${item.id}`}>标题</label>
          <TextInput
            id={`st-${item.id}`} value={draft.title}
            onChange={(e) => { const v = e.currentTarget.value; setDraft((d) => ({ ...d, title: v })) }}
            disabled={!canEdit}
          />

          <div className="sedit__meta">
            <div>
              <label className="nedit__label" htmlFor={`sp-${item.id}`}>
                来源机构
                <span className="nedit__hint">谁做的这项研究</span>
              </label>
              <TextInput
                id={`sp-${item.id}`} value={draft.publisher} placeholder="例：联合国妇女署"
                onChange={(e) => { const v = e.currentTarget.value; setDraft((d) => ({ ...d, publisher: v })) }}
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="nedit__label" htmlFor={`sd-${item.id}`}>发布日期</label>
              <TextInput
                id={`sd-${item.id}`} type="date" value={draft.date}
                onChange={(e) => { const v = e.currentTarget.value; setDraft((d) => ({ ...d, date: v })) }}
                disabled={!canEdit}
              />
            </div>
          </div>

          <label className="nedit__label" htmlFor={`sk-${item.id}`}>
            类型
            <span className="nedit__hint">决定读者看到的可信度标签</span>
          </label>
          <Select
            id={`sk-${item.id}`}
            value={item.kind}
            disabled={!canEdit}
            onChange={(e) => dispatch({
              type: 'study-edit', id: item.id, who,
              patch: { kind: e.currentTarget.value as StudyKind },
            })}
          >
            {(Object.keys(STUDY_KIND) as StudyKind[]).map((k) => (
              <option key={k} value={k}>{STUDY_KIND[k].zh}</option>
            ))}
          </Select>
          <p className="sedit__kindnote">{STUDY_KIND[item.kind].note}</p>

          <label className="nedit__label" htmlFor={`ss-${item.id}`}>
            总结
            <span className="nedit__hint">
              这项研究做了什么、发现了什么。空一行分段。当前 {textLength(draft.summary)} 字。
            </span>
          </label>
          <TextArea
            id={`ss-${item.id}`} rows={10} value={draft.summary}
            onChange={(e) => { const v = e.currentTarget.value; setDraft((d) => ({ ...d, summary: v })) }}
            disabled={!canEdit}
          />

          <label className="nedit__label" htmlFor={`sl-${item.id}`}>
            这份研究说不了什么
            <span className="nedit__hint">
              样本、口径、立场上的局限。会显示在总结下面——一个数字旁边不写清楚它的边界，
              就等于让读者过度解读它。
            </span>
          </label>
          <TextArea
            id={`sl-${item.id}`} rows={3} value={draft.limitation}
            onChange={(e) => { const v = e.currentTarget.value; setDraft((d) => ({ ...d, limitation: v })) }}
            disabled={!canEdit}
          />

          <label className="nedit__label" htmlFor={`su-${item.id}`}>
            数据下载链接
            <span className="nedit__hint">数据是公开的才填，留空就不显示。</span>
          </label>
          <TextInput
            id={`su-${item.id}`} value={draft.datasetUrl} placeholder="https://…（可留空）"
            onChange={(e) => { const v = e.currentTarget.value; setDraft((d) => ({ ...d, datasetUrl: v })) }}
            disabled={!canEdit}
          />

          <p className="nedit__label">
            关键数字
            <span className="nedit__hint">
              每个数字都要写「它说不了什么」——这一栏留空，读者就会把它当成全部事实。
            </span>
          </p>
          <ul className="sedit__figs">
            {figures.map((f, i) => (
              <li key={i} className="sedit__fig">
                <div className="sedit__figrow">
                  <TextInput
                    placeholder="这个数字是什么" value={f.label} disabled={!canEdit}
                    onChange={(e) => patchFigure(i, { label: e.currentTarget.value })}
                  />
                  <TextInput
                    placeholder="数值，例：31.4%" value={f.value} disabled={!canEdit}
                    onChange={(e) => patchFigure(i, { value: e.currentTarget.value })}
                  />
                  <button
                    type="button" className="nedit__linkdel" disabled={!canEdit}
                    aria-label={`删除数字「${f.label || '未命名'}」`}
                    onClick={() => setFigures((fs) => fs.filter((_, n) => n !== i))}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <TextInput
                  placeholder="它说不了什么（必写）" value={f.note} disabled={!canEdit}
                  onChange={(e) => patchFigure(i, { note: e.currentTarget.value })}
                />
              </li>
            ))}
          </ul>
          <button
            type="button" className="nedit__addbtn" disabled={!canEdit}
            onClick={() => setFigures((fs) => [...fs, { label: '', value: '', note: '' }])}
          >
            <Icon name="plus" size={14} />加一个数字
          </button>

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
                onClick={() => dispatch({ type: 'study-edit', id: item.id, who, patch: { regions: toggleTag(item.regions, r.key) as RegionKey[] } })}
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
                onClick={() => dispatch({ type: 'study-edit', id: item.id, who, patch: { topics: toggleTag(item.topics, t.key) as TopicKey[] } })}
              >
                <span className="nedit__gem" style={{ background: t.hue }} aria-hidden="true" />{t.short}
              </button>
            ))}
          </div>

          <p className="nedit__label">原文与报道链接<span className="nedit__hint">删掉不想要的，或自己加一个</span></p>
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
                    dispatch({
                      type: 'study-edit', id: item.id, who,
                      patch: { links: item.links.filter((x) => x.id !== l.id) },
                    })
                    toast(`已删除 ${l.outlet} 的链接。`, 'info')
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </li>
            ))}
          </ul>

          <div className="nedit__addlink">
            <TextInput placeholder="来源名称，例：世界卫生组织" value={newLink.outlet}
              onChange={(e) => { const v = e.currentTarget.value; setNewLink((l) => ({ ...l, outlet: v })) }} disabled={!canEdit} />
            <TextInput placeholder="标题（可留空）" value={newLink.title}
              onChange={(e) => { const v = e.currentTarget.value; setNewLink((l) => ({ ...l, title: v })) }} disabled={!canEdit} />
            <TextInput placeholder="https://…" value={newLink.url}
              onChange={(e) => { const v = e.currentTarget.value; setNewLink((l) => ({ ...l, url: v })) }} disabled={!canEdit} />
            <button type="button" className="nedit__addbtn" onClick={addLink} disabled={!canEdit}>
              <Icon name="plus" size={14} />加链接
            </button>
          </div>

          <div className="nedit__actions">
            {item.status === 'live' ? (
              <button type="button" className="nedit__act" disabled={!canEdit}
                onClick={() => { dispatch({ type: 'study-hide', id: item.id, who }); toast('已下架，公众站看不到了。随时可以恢复。', 'info') }}>
                <Icon name="eye-off" size={14} />下架（可恢复）
              </button>
            ) : (
              <button type="button" className="nedit__act nedit__act--go" disabled={!canEdit}
                onClick={() => { dispatch({ type: 'study-restore', id: item.id, who }); toast('已重新上线。', 'go') }}>
                <Icon name="eye" size={14} />重新上线
              </button>
            )}
            <button type="button" className="nedit__act nedit__act--danger" disabled={!canEdit}
              onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" size={14} />永久删除
            </button>
            <span className="nedit__stamp">发布于 {fmtDate(item.date)}</span>
          </div>
        </div>
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="永久删除这项研究？"
        subtitle={item.title}
        tone="danger"
        footer={
          <>
            <button type="button" className="nedit__mbtn" onClick={() => setConfirmDelete(false)}>算了</button>
            <button type="button" className="nedit__mbtn nedit__mbtn--danger"
              onClick={() => { dispatch({ type: 'study-delete', id: item.id, who }); setConfirmDelete(false); toast('已永久删除。', 'info') }}>
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
