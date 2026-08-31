import { useId } from 'react'

import type { TopicKey } from '../../lib/types'
import { TOPIC_MAP } from '../../lib/constants'

import { Icon } from '../common'
import { jumpToAnchor } from './ArticleBody'

import './ContentNotice.css'

/**
 * The content notice, shown above the fold.
 *
 * It is deliberately flat in tone: it names what the piece contains, says what
 * it does NOT contain, and hands the reader two ways past it. No warning
 * iconography that dramatises the subject, no euphemism, no "graphic content"
 * teasing. A reader who wants the verified claims rather than the narrative can
 * jump straight to the fact-checks; a reader who wants to judge the reporting
 * can jump straight to how it was sourced.
 *
 * The jumps are buttons, not `#hash` links: this app runs under a HashRouter,
 * where a bare hash href would be read as a route.
 */

/** Anchors the article page is expected to provide. */
export const FACTCHECK_ANCHOR = 'article-factchecks'
export const EVIDENCE_ANCHOR = 'article-references'

const TOPIC_NOTE: Partial<Record<TopicKey, string>> = {
  violence: '本文涉及性暴力或家庭暴力。按本站的创伤知情准则，全文不描写侵害过程，不描写当事人的着装、行踪或感情史，也不使用当事人的影像。',
  repro: '本文涉及生育与身体自主权相关的医疗程序与法律限制，可能包含关于强制医疗的描述。',
  trans: '本文涉及性别承认程序与跨性别医疗，包含对相关临床证据强弱的直接讨论。',
  hate: '本文涉及仇恨言论与协同骚扰的运作方式。本文描述其手法与规模，但不转载具体的骚扰内容。',
  displacement: '本文涉及冲突、流离失所与庇护程序，可能包含关于强制遣返与拘留的描述。',
}

export interface ContentNoticeProps {
  text: string
  topics: TopicKey[]
}

export function ContentNotice({ text, topics }: ContentNoticeProps): JSX.Element {
  const titleId = useId()
  const notes = topics
    .map((t) => TOPIC_NOTE[t])
    .filter((n): n is string => Boolean(n))

  const named = topics
    .map((t) => (TOPIC_MAP[t] ? TOPIC_MAP[t].zh : t))
    .join(' · ')

  return (
    <aside className="cnotice" aria-labelledby={titleId} role="note">
      <div className="cnotice__bar" aria-hidden="true" />

      <div className="cnotice__body">
        <p className="cnotice__kicker">
          <span className="cnotice__icon" aria-hidden="true"><Icon name="shield" size={14} /></span>
          <span className="cnotice__label" id={titleId}>内容提示</span>
          <span className="cnotice__en">Content notice</span>
        </p>

        <p className="cnotice__text">{text}</p>

        {notes.length > 0 ? (
          <ul className="cnotice__notes">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        ) : null}

        <p className="cnotice__meta">
          议题范围：{named || '未标注'}。本文把指控、证据、编辑判断与司法结论分开标注；
          任何未经审理认定的主张都写明由谁提出、向谁提出、何时提出。
        </p>

        <div className="cnotice__actions">
          <button
            type="button"
            className="cnotice__jump"
            onClick={() => jumpToAnchor(FACTCHECK_ANCHOR)}
          >
            <Icon name="check-double" size={14} />
            <span>直接跳到事实核查</span>
          </button>
          <button
            type="button"
            className="cnotice__jump"
            onClick={() => jumpToAnchor(EVIDENCE_ANCHOR)}
          >
            <Icon name="book" size={14} />
            <span>跳到我们如何取证</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
