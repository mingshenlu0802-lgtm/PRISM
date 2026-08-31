import type { ReactNode } from 'react'
import type { Source, SourceType } from '../../lib/types'
import { SOURCE_TYPE_LABEL } from '../../lib/constants'
import { cx, fmtDate, isPrimarySource } from '../../lib/util'
import { isPlaceholderUrl } from '../../lib/sourceLink'
import { Badge } from './Badge'
import { DemoTag } from './DemoTag'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { Meter } from './Meter'
import { Tooltip } from './Tooltip'
import './SourceCard.css'

/**
 * A source record.
 *
 * SAFETY: the URL is rendered as a non-navigating pill. Every address in this
 * prototype lives on the reserved `.invalid` TLD (RFC 2606) and can never
 * resolve; the pill is a button that goes nowhere, labelled 「示例链接（不可访问）」
 * and paired with a DemoTag, so nobody can mistake a demonstration record for a
 * real citation — or follow it anywhere.
 */

const TYPE_ICON: Record<SourceType, IconName> = {
  'primary-research': 'chart',
  'legal-document': 'file',
  'court-ruling': 'scale',
  'government-data': 'database',
  'international-body': 'globe',
  'ngo-report': 'shield',
  'local-media': 'pin',
  'news-agency': 'send',
  'academic-review': 'book',
  statement: 'quote',
  'social-post': 'users',
  other: 'layers',
}

const TIER_LABEL: Record<Source['tier'], { zh: string; tone: 'go' | 'info' | 'neutral'; hint: string }> = {
  primary: { zh: '一手', tone: 'go', hint: '一手材料：法律文本、判决、原始数据或研究本身。' },
  secondary: { zh: '二手', tone: 'info', hint: '二手材料：对一手材料的报道、整理或综述。' },
  tertiary: { zh: '三手', tone: 'neutral', hint: '三手材料：转述、汇编或对二手报道的再报道。' },
}

const LANG_LABEL: Record<string, string> = {
  'zh-Hans': '简体中文', 'zh-Hant': '繁体中文', zh: '中文',
  en: '英语', es: '西班牙语', fr: '法语', pt: '葡萄牙语', ar: '阿拉伯语',
  ru: '俄语', de: '德语', it: '意大利语', nl: '荷兰语', sv: '瑞典语',
  ja: '日语', ko: '韩语', hi: '印地语', bn: '孟加拉语', ur: '乌尔都语',
  fa: '波斯语', tr: '土耳其语', he: '希伯来语', sw: '斯瓦希里语',
  id: '印尼语', vi: '越南语', th: '泰语', uk: '乌克兰语', pl: '波兰语',
}

function langLabel(tag: string): string {
  return LANG_LABEL[tag] ?? tag.toUpperCase()
}

export interface SourceCardProps {
  source: Source
  /** Citation number, when the card is shown beside the body text. */
  n?: number
  compact?: boolean
  onAttach?: () => void
  attached?: boolean
  highlight?: boolean
  footer?: ReactNode
}

export function SourceCard({
  source,
  n,
  compact = false,
  onAttach,
  attached = false,
  highlight = false,
  footer,
}: SourceCardProps): JSX.Element {
  const typeMeta = SOURCE_TYPE_LABEL[source.sourceType]
  const tier = TIER_LABEL[source.tier]
  const primary = isPrimarySource(source)

  return (
    <article
      className={cx(
        'psource',
        compact && 'psource--compact',
        highlight && 'psource--highlight',
        source.caution && 'psource--caution',
      )}
    >
      <header className="psource__head">
        {typeof n === 'number' ? (
          <span className="psource__n u-num" aria-hidden="true">{n}</span>
        ) : null}

        <div className="psource__heading">
          <h4 className="psource__title">
            {typeof n === 'number' ? <span className="u-sr">第 {n} 条来源：</span> : null}
            {source.title}
          </h4>
          <p className="psource__byline">
            <span className="psource__publisher">{source.publisher}</span>
            <span className="psource__sep" aria-hidden="true">·</span>
            <span>{source.country}</span>
            <span className="psource__sep" aria-hidden="true">·</span>
            <span>{langLabel(source.language)}</span>
            <span className="psource__sep" aria-hidden="true">·</span>
            <time dateTime={source.date}>{fmtDate(source.date)}</time>
          </p>
        </div>

        {onAttach ? (
          <button
            type="button"
            className={cx('psource__attach', attached && 'psource__attach--on')}
            onClick={onAttach}
            aria-pressed={attached}
          >
            <Icon name={attached ? 'check' : 'plus'} size={13} />
            {attached ? '已引用' : '引用'}
          </button>
        ) : null}
      </header>

      <div className="psource__tags">
        <Badge tone="neutral" size="sm" icon={<Icon name={TYPE_ICON[source.sourceType]} size={12} />}>
          {typeMeta ? typeMeta.zh : source.sourceType}
        </Badge>
        <Badge tone={tier.tone} size="sm" title={tier.hint}>{tier.zh}来源</Badge>
        {primary ? (
          <Badge tone="go" size="sm" icon={<Icon name="shield" size={12} />} title="计入一手来源门槛。">
            一手材料
          </Badge>
        ) : null}
      </div>

      <Meter
        value={source.credibility}
        label="可信度评分"
        hint={compact ? undefined : source.credibilityBasis}
        size={compact ? 'sm' : 'md'}
      />

      {source.caution ? (
        <p className="psource__caution">
          <span className="psource__caution-icon" aria-hidden="true">
            <Icon name="alert" size={14} />
          </span>
          <span>
            <span className="psource__caution-word">使用注意</span>
            {source.caution}
          </span>
        </p>
      ) : null}

      {!compact && source.notes ? <p className="psource__notes">{source.notes}</p> : null}

      <div className="psource__link">
        {isPlaceholderUrl(source.url) ? (
          <>
            <Tooltip
              side="bottom"
              label="示例链接（不可访问）：本原型的演示来源位于保留域名 .invalid，永远不会解析。真实来源会渲染为可点击链接。"
            >
              <button
                type="button"
                className="psource__url"
                aria-disabled="true"
                onClick={(event) => { event.preventDefault() }}
              >
                <Icon name="link" size={12} />
                <span className="psource__url-text">{source.url}</span>
                <span className="u-sr">（示例链接，不可访问）</span>
              </button>
            </Tooltip>
            <DemoTag compact />
          </>
        ) : (
          <a
            className="psource__url psource__url--live"
            href={source.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            <Icon name="external" size={12} />
            <span className="psource__url-text">{source.url}</span>
            <span className="u-sr">（在新标签页打开）</span>
          </a>
        )}
      </div>

      {!compact ? (
        <p className="psource__accessed">
          存取日期 <time dateTime={source.accessedAt}>{fmtDate(source.accessedAt)}</time>
        </p>
      ) : null}

      {footer ? <div className="psource__footer">{footer}</div> : null}
    </article>
  )
}
