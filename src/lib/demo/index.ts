/**
 * 演示数据装配。
 *
 * 全部为虚构内容：机构、媒体与链接都不存在，链接位于 RFC 2606 保留的
 * `.invalid` 域名。接入真实检索后会被真实条目替换。
 */
import type { PrismState } from '../types'
import { DEFAULT_APPEARANCE, DEFAULT_COPY } from '../constants'
import { PRIORITY_REGIONS } from '../regions'
import { todayISO } from '../util'
import { NEWS } from './news'
import { STUDIES } from './studies'

/** 演示条目自己的日期基准。真实的「今天」不能用它——见 today 那一行。 */
export const TODAY = '2026-08-31'

export function buildInitialState(): PrismState {
  return {
    news: NEWS.map((n) => ({ ...n })),
    studies: STUDIES.map((s) => ({ ...s })),
    runs: [],
    collect: {
      regions: [...PRIORITY_REGIONS],
      topics: ['violence', 'children', 'rights', 'repro', 'trans', 'hate', 'equality', 'displacement', 'movement'],
      mode: 'both',
      autoPublish: true,
      engine: 'qwen-open',
      perRun: 6,
      dedupe: true,
      preferIndependent: true,
    },
    appearance: { ...DEFAULT_APPEARANCE },
    auth: {
      // 名单一开始是空的：站长第一次登录、哈希对上之后才补进来。
      // 发布出去的文件里因此没有任何人的邮箱地址。
      admins: [],
    },
    github: {
      owner: '',
      repo: 'PRISM',
      branch: 'main',
      token: '',
      path: 'site-content.json',
    },
    copy: { ...DEFAULT_COPY },
    changes: [],
    publicOffline: false,
    // 真实日期，不是 TODAY。演示条目可以停在 8-31，首页顶上的日期不行。
    today: todayISO(),
  }
}
