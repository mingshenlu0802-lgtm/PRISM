/**
 * PRISM shared UI kit.
 *
 * Every component in this folder is surface-agnostic: it reads only the
 * semantic tokens (`--bg`, `--fg`, `--line`, `--accent`, the verdict and risk
 * scales) and therefore renders correctly under `[data-surface="public"]`,
 * its dark theme, and `[data-surface="command"]` without a single hard-coded
 * colour.
 *
 *   import { Badge, Icon, Modal } from '../../components/common'
 */

export { Icon } from './Icon'
export type { IconName, IconProps } from './Icon'

export { Badge } from './Badge'
export type { BadgeTone, BadgeProps } from './Badge'

export { StatusBadge } from './StatusBadge'
export type { StatusBadgeProps } from './StatusBadge'

export { RiskChip } from './RiskChip'
export type { RiskChipProps } from './RiskChip'

export { TopicChip } from './TopicChip'
export type { TopicChipProps } from './TopicChip'

export { DemoTag } from './DemoTag'
export type { DemoTagProps } from './DemoTag'

export { Meter } from './Meter'
export type { MeterProps } from './Meter'

export { Progress } from './Progress'
export type { ProgressProps } from './Progress'

export { Sparkline } from './Sparkline'
export type { SparklineProps } from './Sparkline'

export { Modal } from './Modal'
export type { ModalProps } from './Modal'

export { toast, ToastHost, dismissToast, clearToasts } from './Toast'
export type { ToastItem, ToastTone } from './Toast'

export { Segmented } from './Segmented'
export type { SegmentedProps, SegmentedOption } from './Segmented'

export { Field, TextInput, TextArea, Select, Checkbox } from './Field'
export type { FieldProps, CheckboxProps } from './Field'

export { Tooltip } from './Tooltip'
export type { TooltipProps } from './Tooltip'

export { EmptyState } from './EmptyState'
export type { EmptyStateProps } from './EmptyState'

export { PrismMark } from './PrismMark'
export type { PrismMarkProps } from './PrismMark'

export { SourceCard } from './SourceCard'
export type { SourceCardProps } from './SourceCard'

export { CitationRef } from './CitationRef'
export type { CitationRefProps } from './CitationRef'

export { RichText } from './RichText'
export type { RichTextProps } from './RichText'
