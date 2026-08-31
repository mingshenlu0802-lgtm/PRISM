import type { ReactNode } from 'react'
import { cx } from '../../lib/util'
import { CitationRef } from './CitationRef'
import './RichText.css'

/**
 * The body-text renderer.
 *
 * Supports exactly three inline markers, and nothing else:
 *   `[[c:cit-004]]`  → a numbered citation reference
 *   `**强调**`        → <strong>
 *   `*轻强调*`        → <em>
 *
 * A citation id with no entry in `numbers` renders as a muted `[?]` — the
 * marker is never dropped and the raw syntax never leaks into the page, so a
 * broken reference stays visible to the reader and to the editor.
 */

const TOKEN = /\[\[c:([^\]\n]*)\]\]|\*\*([\s\S]+?)\*\*|\*([^*\n]+?)\*/

function plain(text: string, key: string): ReactNode[] {
  if (!text) return []
  const lines = text.split('\n')
  const out: ReactNode[] = []
  lines.forEach((line, i) => {
    if (i > 0) out.push(<br key={`${key}-br-${i}`} />)
    if (line) out.push(line)
  })
  return out
}

function parse(
  text: string,
  key: string,
  numbers: Map<string, number>,
  onCite?: (citationId: string) => void,
): ReactNode[] {
  const out: ReactNode[] = []
  const re = new RegExp(TOKEN.source, 'g')
  let last = 0
  let i = 0
  let match = re.exec(text)

  while (match !== null) {
    if (match.index > last) out.push(...plain(text.slice(last, match.index), `${key}-p${i}`))

    const citationId = match[1]
    const bold = match[2]
    const italic = match[3]

    if (citationId !== undefined) {
      const n = numbers.get(citationId)
      if (n === undefined) {
        out.push(
          <span
            key={`${key}-u${i}`}
            className="prt__missing"
            title="此处引用的记录不在本文的来源清单中。"
          >
            [?]
            <span className="u-sr">（引用缺失）</span>
          </span>,
        )
      } else {
        out.push(
          <CitationRef key={`${key}-c${i}`} n={n} citationId={citationId} onOpen={onCite} />,
        )
      }
    } else if (bold !== undefined) {
      out.push(<strong key={`${key}-b${i}`}>{parse(bold, `${key}-b${i}`, numbers, onCite)}</strong>)
    } else if (italic !== undefined) {
      out.push(<em key={`${key}-i${i}`}>{parse(italic, `${key}-i${i}`, numbers, onCite)}</em>)
    }

    last = match.index + match[0].length
    i += 1
    match = re.exec(text)
  }

  if (last < text.length) out.push(...plain(text.slice(last), `${key}-p${i}`))
  return out
}

export interface RichTextProps {
  text: string
  numbers: Map<string, number>
  onCite?: (citationId: string) => void
  className?: string
}

export function RichText({ text, numbers, onCite, className }: RichTextProps): JSX.Element {
  return <span className={cx('prt', className)}>{parse(text ?? '', 'rt', numbers, onCite)}</span>
}
