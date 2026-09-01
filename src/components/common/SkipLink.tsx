/**
 * 「跳到正文」。
 *
 * 为什么不是一个普通的 `<a href="#main">`：这个站用 HashRouter，
 * 地址栏里的 `#/news/xxx` **就是路由**。点一个 `#main`，hash 被整个换掉，
 * 路由匹配不到，兜底规则把人送回首页——用键盘的人想跳过导航，
 * 结果被踢出了正在读的文章。
 *
 * 实测过：hash 从 `#/news/…` 变成 `#/`。这条链接恰恰是给键盘和读屏用户的，
 * 坏在这里格外糟。
 *
 * 所以自己搬焦点，不碰地址栏。href 留着是为了让它仍然是一个「链接」——
 * 读屏会念成链接，用户按 Enter 触发 click，行为和预期一致。
 */
export function SkipLink({ to, children = '跳到正文' }: { to: string; children?: string }): JSX.Element {
  return (
    <a
      className="u-skip"
      href={`#${to}`}
      onClick={(e) => {
        const el = document.getElementById(to)
        if (!el) return // 找不到就让浏览器按默认行为走，总比什么都不做好
        e.preventDefault()
        // tabindex=-1 让不可聚焦的 <main> 也能接住焦点；
        // 只搬焦点还不够，屏幕也要跟过去。
        el.focus({ preventScroll: true })
        el.scrollIntoView({ block: 'start' })
      }}
    >
      {children}
    </a>
  )
}
