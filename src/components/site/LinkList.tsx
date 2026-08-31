import type { MediaLink } from '../../lib/types'
import { cx, displayHost, fmtDate, isPlaceholderUrl } from '../../lib/util'
import { Icon } from '../common'
import './LinkList.css'

/**
 * 报道这条新闻的媒体链接。
 *
 * 这是网站的重点：总结只是让你知道发生了什么，链接才是让你自己去读的入口。
 * 真实链接渲染成可点击的外链；只有演示用的占位链接（保留域名 .invalid）
 * 不跳转，并明确标注。
 */

export interface LinkListProps {
  links: MediaLink[]
  compact?: boolean
  /** 显示「主要文件」分组标记 */
  groupPrimary?: boolean
}

export function LinkList({ links, compact, groupPrimary = true }: LinkListProps): JSX.Element {
  if (links.length === 0) {
    return <p className="lnk__none">这条还没有附上媒体链接。</p>
  }
  const primary = groupPrimary ? links.filter((l) => l.primary) : []
  const rest = groupPrimary ? links.filter((l) => !l.primary) : links

  return (
    <div className={cx('lnk', compact && 'lnk--compact')}>
      {primary.length > 0 && (
        <>
          <p className="lnk__group">原始文件</p>
          <ul className="lnk__list">
            {primary.map((l) => <LinkRow key={l.id} link={l} primary />)}
          </ul>
        </>
      )}
      {rest.length > 0 && (
        <>
          {primary.length > 0 && <p className="lnk__group">媒体报道</p>}
          <ul className="lnk__list">
            {rest.map((l) => <LinkRow key={l.id} link={l} />)}
          </ul>
        </>
      )}
    </div>
  )
}

function LinkRow({ link, primary }: { link: MediaLink; primary?: boolean }): JSX.Element {
  const placeholder = isPlaceholderUrl(link.url)
  const inner = (
    <>
      <span className="lnk__outlet">{link.outlet}</span>
      <span className="lnk__title">{link.title}</span>
      <span className="lnk__meta">
        <span className="lnk__lang">{link.lang}</span>
        {link.date && <><span aria-hidden="true">·</span><time dateTime={link.date}>{fmtDate(link.date)}</time></>}
        {!placeholder && <><span aria-hidden="true">·</span><span className="lnk__host">{displayHost(link.url)}</span></>}
      </span>
    </>
  )

  return (
    <li className={cx('lnk__item', primary && 'lnk__item--primary')}>
      {placeholder ? (
        <span className="lnk__row lnk__row--demo" title="示例链接：本原型的演示数据位于保留域名 .invalid，不会跳转。接入真实来源后这里就是可点击的真实链接。">
          <Icon name="link" size={14} className="lnk__icon" />
          <span className="lnk__body">{inner}</span>
          <span className="lnk__demo">示例</span>
        </span>
      ) : (
        <a className="lnk__row" href={link.url} target="_blank" rel="noreferrer noopener">
          <Icon name="external" size={14} className="lnk__icon" />
          <span className="lnk__body">{inner}</span>
        </a>
      )}
      {link.note && <p className="lnk__note">{link.note}</p>}
    </li>
  )
}
