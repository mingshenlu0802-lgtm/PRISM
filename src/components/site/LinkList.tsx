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
 *
 * 官方文件和官方媒体各带一个标记。这不是打分，是给读者一个判断的依据：
 * 在新闻不自由的地方，官方媒体是政府自己的说法，不是独立的第三方记述——
 * 这一点值得读者在点开之前就知道，所以标出来而不是悄悄排到后面。
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

  /*
   * 信息流里只列媒体的名字，一行。
   *
   * `compact` 这个参数一直传进来，而样式表里**根本没有 .lnk--compact**——
   * 于是首页的每张卡片都在渲染文章页那一整套：分组标题、原报道的标题、
   * 语种、日期、域名，一个来源一个方框。截图上量过，一张卡片有四成五的
   * 高度是这一块。信息流里读者要判断的是「这条值不值得点进去」，
   * 那需要知道**是谁报的**，不需要每一家的标题和发布日期。
   *
   * 所以这里只给名字，横着排。官方文件和官方媒体的标记留着——那是
   * 点进去之前就该知道的事，不是细节。完整的清单在文章页上。
   */
  if (compact) {
    return (
      <ul className="lnk__strip">
        {[...primary, ...rest].map((l) => {
          const placeholder = isPlaceholderUrl(l.url)
          const label = (
            <>
              {l.outlet}
              {l.outletKind === 'official' && <span className="lnk__kind lnk__kind--official">官方文件</span>}
              {l.outletKind === 'state' && (
                <span className="lnk__kind lnk__kind--state" title="受国家控制的媒体。可以看它说了什么，但它不是独立信源。">
                  官方媒体
                </span>
              )}
            </>
          )
          return (
            <li key={l.id} className="lnk__stripitem">
              {placeholder ? (
                <span className="lnk__strplink lnk__strplink--demo" title="示例链接：本原型的演示数据位于保留域名 .invalid，不会跳转。">
                  {label}
                </span>
              ) : (
                <a className="lnk__strplink" href={l.url} target="_blank" rel="noreferrer noopener">{label}</a>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="lnk">
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
      <span className="lnk__outlet">
        {link.outlet}
        {link.outletKind === 'official' && <span className="lnk__kind lnk__kind--official">官方文件</span>}
        {link.outletKind === 'state' && (
          <span className="lnk__kind lnk__kind--state" title="受国家控制的媒体。可以看它说了什么，但它不是独立信源。">
            官方媒体
          </span>
        )}
      </span>
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
