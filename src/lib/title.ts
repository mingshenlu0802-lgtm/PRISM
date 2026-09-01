import { useEffect } from 'react'

/**
 * 每一页有自己的标题。
 *
 * 这个站是靠**转发链接**传播的：朋友收到一条链接，可能同时开好几个标签页，
 * 也可能把它加进书签、发到聊天窗口里。而在此之前，每一页的标题都是
 * 「PRISM 棱镜」——五个标签页长得一模一样，书签里存下来的也只有站名，
 * 看不出存的是哪一条。
 *
 * 格式是「这一页 · 站名」：具体的信息放在前面，因为标签页很窄，
 * 浏览器是从后面开始截的。
 */
export function usePageTitle(title?: string, siteName = 'PRISM 棱镜'): void {
  useEffect(() => {
    const t = (title ?? '').trim()
    document.title = t ? `${t} · ${siteName}` : siteName
    // 离开这一页就还原，免得从一条新闻退回首页之后标签页还挂着那条新闻的标题。
    return () => { document.title = siteName }
  }, [title, siteName])
}
