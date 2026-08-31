/**
 * 演示数据装配。
 *
 * 全部为虚构内容：机构、媒体与链接都不存在，链接位于 RFC 2606 保留的
 * `.invalid` 域名。接入真实检索后会被真实条目替换。
 */
import type { PrismState } from '../types'
import { DEFAULT_APPEARANCE, DEFAULT_COPY } from '../constants'
import { OWNER_EMAIL } from '../types'
import { PRIORITY_REGIONS } from '../regions'
import { NEWS } from './news'
import { STUDIES } from './studies'

export const TODAY = '2026-08-31'

export function buildInitialState(): PrismState {
  return {
    news: NEWS.map((n) => ({ ...n })),
    studies: STUDIES.map((s) => ({ ...s })),
    runs: [],
    collect: {
      regions: [...PRIORITY_REGIONS],
      topics: ['rights', 'violence', 'repro', 'trans', 'hate', 'equality', 'displacement', 'movement'],
      mode: 'both',
      autoPublish: true,
      engine: 'qwen-open',
      perRun: 6,
      dedupe: true,
    },
    appearance: { ...DEFAULT_APPEARANCE },
    auth: {
      clientId: '',
      admins: [{ email: OWNER_EMAIL, role: 'owner', addedAt: '2026-08-01T00:00:00Z', name: '站长' }],
    },
    github: {
      owner: 'mingshenlu0802-lgtm',
      repo: 'PRISM',
      branch: 'claude/prism-feminist-media-platform-2er8su',
      token: '',
      path: 'site-content.json',
    },
    copy: { ...DEFAULT_COPY },
    changes: [],
    publicOffline: false,
    today: TODAY,
  }
}
