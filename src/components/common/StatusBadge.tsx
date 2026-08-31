import type { ArticleStatus } from '../../lib/types'
import { STATUS_LABEL } from '../../lib/constants'
import { Badge } from './Badge'
import type { BadgeTone } from './Badge'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import './StatusBadge.css'

/**
 * Workflow state of an article. Colour is a hint; the Chinese label and the
 * glyph are what actually carry the state.
 */

const TONE_MAP: Record<'draft' | 'review' | 'go' | 'live' | 'stop', BadgeTone> = {
  draft: 'neutral',
  review: 'hold',
  go: 'go',
  live: 'live',
  stop: 'stop',
}

const STATUS_ICON: Record<ArticleStatus, IconName> = {
  drafting: 'edit',
  'in-review': 'eye',
  'needs-sources': 'book',
  'changes-requested': 'refresh',
  approved: 'check',
  scheduled: 'clock',
  published: 'check-double',
  'update-needed': 'alert',
  retracted: 'x',
  archived: 'archive',
  rejected: 'minus',
}

/** Editor-facing gloss, shown on hover so the ladder stays teachable. */
const STATUS_HINT: Record<ArticleStatus, string> = {
  drafting: '编辑台仍在撰写，尚未进入审核流程。',
  'in-review': '等待人工审核；自动流程不会自行发布。',
  'needs-sources': '已退回，需补充一手材料后重新提交。',
  'changes-requested': '审核者已提出具体修改意见。',
  approved: '已获批准，等待发布或排程。',
  scheduled: '已排程；发布前会再次校验风险与引用。',
  published: '已对外发布，更正记录公开可查。',
  'update-needed': '已发布但出现新事实，需要更新。',
  retracted: '已撤回；页面保留并标注撤回理由。',
  archived: '已移出工作队列，仍可检索。',
  rejected: '不予发表，理由保留在审计记录中。',
}

export interface StatusBadgeProps {
  status: ArticleStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps): JSX.Element {
  const meta = STATUS_LABEL[status] as { zh: string; tone: keyof typeof TONE_MAP } | undefined
  const label = meta ? meta.zh : status
  const tone = meta ? TONE_MAP[meta.tone] : 'neutral'
  return (
    <Badge
      tone={tone}
      size={size}
      className="pstatus"
      title={STATUS_HINT[status] ?? label}
      icon={<Icon name={STATUS_ICON[status] ?? 'file'} size={size === 'md' ? 14 : 12} />}
    >
      {label}
    </Badge>
  )
}
