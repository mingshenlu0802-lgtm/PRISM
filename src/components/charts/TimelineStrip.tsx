import type { TimelineEntry } from '../../lib/types'
import { cx, fmtDate, sortBy } from '../../lib/util'
import './TimelineStrip.css'

/**
 * A chronology whose nodes carry their own evidentiary standing.
 *
 * Standing is encoded as SHAPE first — filled diamond for a primary record,
 * hollow circle for a single report, split circle for a contested account — and
 * repeated in words on every node. Colour only reinforces what the shape and
 * the label already say, so the strip survives greyscale printing and colour
 * vision deficiency alike.
 */

const STANDING: Record<
  TimelineEntry['standing'],
  { zh: string; hint: string; tone: string }
> = {
  documented: { zh: '有一手记录', hint: '有可查证的一手文件或数据支持', tone: 'var(--v-supported)' },
  reported: { zh: '单一报道', hint: '目前仅有单一来源报道，尚未获得独立佐证', tone: 'var(--fg-subtle)' },
  contested: { zh: '存在争议', hint: '不同来源对此给出互相矛盾的说法', tone: 'var(--v-contested)' },
}

const STANDING_ORDER: TimelineEntry['standing'][] = ['documented', 'reported', 'contested']

function StandingGlyph({
  standing,
  size = 16,
}: {
  standing: TimelineEntry['standing']
  size?: number
}): JSX.Element {
  const c = size / 2
  const r = size * 0.34
  return (
    <svg
      className="ptimeline__glyph"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      {standing === 'documented' ? (
        <rect
          x={c - r * 0.86}
          y={c - r * 0.86}
          width={r * 1.72}
          height={r * 1.72}
          transform={`rotate(45 ${c} ${c})`}
          fill="currentColor"
        />
      ) : null}
      {standing === 'reported' ? (
        <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth="1.7" />
      ) : null}
      {standing === 'contested' ? (
        <>
          <path d={`M${c} ${c - r} A${r} ${r} 0 0 1 ${c} ${c + r} Z`} fill="currentColor" />
          <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth="1.7" />
        </>
      ) : null}
    </svg>
  )
}

export interface TimelineStripProps {
  entries: TimelineEntry[]
  numbers?: Map<string, number>
  onCite?: (id: string) => void
  dense?: boolean
}

export function TimelineStrip({
  entries,
  numbers,
  onCite,
  dense,
}: TimelineStripProps): JSX.Element {
  const ordered = sortBy(entries, (e) => e.date, 'asc')

  if (ordered.length === 0) {
    return (
      <div className="ptimeline ptimeline--empty">
        <p className="ptimeline__empty">尚未建立时间线。</p>
      </div>
    )
  }

  return (
    <div className={cx('ptimeline', dense && 'ptimeline--dense')}>
      <ul className="ptimeline__legend">
        {STANDING_ORDER.map((key) => (
          <li className="ptimeline__legend-item" key={key} style={{ color: STANDING[key].tone }}>
            <StandingGlyph standing={key} size={14} />
            <span className="ptimeline__legend-name">{STANDING[key].zh}</span>
          </li>
        ))}
      </ul>

      <ol className="ptimeline__track">
        {ordered.map((entry, i) => {
          const meta = STANDING[entry.standing]
          const cites = (entry.citationIds ?? [])
            .map((id) => ({ id, n: numbers?.get(id) }))
            .filter((c): c is { id: string; n: number } => typeof c.n === 'number')

          return (
            <li className="ptimeline__item" key={`${entry.date}-${i}`}>
              <span className="ptimeline__node" style={{ color: meta.tone }}>
                <StandingGlyph standing={entry.standing} />
              </span>

              <div className="ptimeline__card">
                <p className="ptimeline__date u-num">{fmtDate(entry.date)}</p>
                <h4 className="ptimeline__title">{entry.title}</h4>
                <p className="ptimeline__text">
                  {entry.text}
                  {cites.length > 0 ? (
                    <span className="ptimeline__cites">
                      {cites.map((c) =>
                        onCite ? (
                          <sup className="ptimeline__cite" key={c.id}>
                            <button
                              type="button"
                              className="ptimeline__citebtn"
                              onClick={() => onCite(c.id)}
                              aria-label={`查看第 ${c.n} 号来源`}
                            >
                              [{c.n}]
                            </button>
                          </sup>
                        ) : (
                          <sup className="ptimeline__cite" key={c.id}>
                            [{c.n}]
                          </sup>
                        ),
                      )}
                    </span>
                  ) : null}
                </p>
                <p className="ptimeline__standing" style={{ color: meta.tone }} title={meta.hint}>
                  <StandingGlyph standing={entry.standing} size={13} />
                  <span className="ptimeline__standing-name">{meta.zh}</span>
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
