/**
 * PRISM 共用界面组件。
 *
 * 只读语义令牌（--bg / --fg / --line / --accent…），因此四种主题、五种强调色
 * 与五档字号都能自动跟随，组件本身不需要知道当前是哪一套。
 */

export { Icon } from './Icon'
export type { IconName, IconProps } from './Icon'

export { Badge } from './Badge'
export type { BadgeTone, BadgeProps } from './Badge'

export { DemoTag } from './DemoTag'
export type { DemoTagProps } from './DemoTag'

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

export { ErrorBoundary } from './ErrorBoundary'
