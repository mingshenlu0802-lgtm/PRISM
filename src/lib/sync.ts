/**
 * 把本地的每一次改动同步到数据库。
 *
 * 结构上刻意做成「镜像」而不是「改写」：reducer 保持原样，本地模式一行代码都不受
 * 影响；共享模式只是在 reducer 算完之后，把结果里相关的那几条推到数据库。
 * 这样两种模式共用同一套逻辑，不会出现「本地是这样、线上是那样」的分叉。
 *
 * 写失败不回滚本地状态。原因是：这类失败几乎都是权限或断网，而把用户刚打的字
 * 撤销掉是最让人恼火的处理方式。正确的做法是**告诉他没存上**，让他决定。
 * 所以 mirror 会把错误抛出来，由调用方提示。
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Action } from './store'
import type { PrismState } from './types'
import {
  addMember, logChange, removeMember, removeNews, removeStudy,
  saveNews, saveSite, saveStudies, setMemberRole,
} from './remote'
/*
 * 直接从 Toast 那个文件拿，不走 components/common 的桶。
 *
 * 桶会把二十几个组件和它们的样式一起拖进来，而这里只要一个函数。
 * 更要紧的是**方向**：lib 依赖 components 是反的，今天还没成环只是因为
 * common 里恰好没有一个组件 import 过 lib/store——哪天有人加了一个，
 * 这条 import 就会变成一个只在打包后才炸的循环依赖。指到具体文件，
 * 那条路就短到不可能绕回来。
 */
import { toast } from '../components/common/Toast'

/*
 * 降级只说一次。
 *
 * 「数据库还没有 subhead 这一列」这句话，站长每保存一次就弹一次的话，
 * 会变成噪音——它讲的是同一件要去做的事，不是这一次保存出了问题。
 * 说一次，他去跑那句 SQL；不跑，下次开页面还会再说一次。
 */
let warned = false
const warnOnce = (why: string): void => {
  if (warned) return
  warned = true
  toast(why, 'warn')
}

/** 这次改动要不要写库、写什么。next 是 reducer 算完之后的状态。 */
export async function mirror(
  db: SupabaseClient,
  action: Action,
  prev: PrismState,
  next: PrismState,
): Promise<void> {
  const news = (id: string) => next.news.find((n) => n.id === id)
  const study = (id: string) => next.studies.find((s) => s.id === id)

  switch (action.type) {
    /* 内容 */
    case 'news-add':
      await saveNews(db, next.news.filter((n) => action.items.some((i) => i.id === n.id)), warnOnce)
      break
    case 'news-edit':
    case 'news-hide':
    case 'news-restore':
    case 'news-link-add':
    case 'news-link-edit':
    case 'news-link-remove': {
      const item = news(action.id)
      if (item) await saveNews(db, [item], warnOnce)
      break
    }
    case 'news-feature': {
      // 设头条会同时改动旧头条，两条都要推上去。
      const changed = next.news.filter((n) => {
        const before = prev.news.find((p) => p.id === n.id)
        return before && Boolean(before.featured) !== Boolean(n.featured)
      })
      if (changed.length > 0) await saveNews(db, changed, warnOnce)
      break
    }
    case 'news-delete':
      await removeNews(db, action.id)
      break

    case 'study-add':
      await saveStudies(db, next.studies.filter((s) => action.items.some((i) => i.id === s.id)))
      break
    case 'study-edit':
    case 'study-hide':
    case 'study-restore': {
      const item = study(action.id)
      if (item) await saveStudies(db, [item])
      break
    }
    case 'study-delete':
      await removeStudy(db, action.id)
      break

    /* 站点设置 */
    case 'appearance':
      await saveSite(db, { appearance: next.appearance })
      break
    case 'copy':
      await saveSite(db, { copy: next.copy })
      break
    case 'public-offline':
      await saveSite(db, { offline: next.publicOffline })
      break

    /* 成员 */
    case 'admin-add':
      await addMember(db, action.email, 'editor', action.who)
      break
    case 'admin-remove':
      await removeMember(db, action.email)
      break
    case 'member-role':
      await setMemberRole(db, action.email, action.role)
      break

    /* 这些只影响本机，不进数据库 */
    case 'reset':
    case 'hydrate':
    case 'signin':
    case 'signout':
    case 'github':
    case 'collect-config':
      return
  }

  // 改动记录跟着一起写，失败不影响上面已经存好的内容。
  const entry = next.changes[0]
  if (entry && entry !== prev.changes[0]) {
    try { await logChange(db, entry) } catch { /* 日志少一条，比操作失败强 */ }
  }
}
