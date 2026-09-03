import { useMemo } from 'react'
import { ATLAS_SIZE, CONTINENT_SHAPES, COUNTRY, WORLD } from '../../lib/atlas/geo'
import type { ContinentKey } from '../../lib/atlas/indicators'
import { breaksOf, countriesWith, ramp, valueOf } from '../../lib/atlas/query'
import type { Mode } from '../../lib/atlas/query'
import './AtlasMap.css'

/**
 * 地图本身。
 *
 * 两层：国家的形状按比例上色，上面叠气泡表示人数。规格里的几条硬规矩
 * 都落在这个组件里：
 *
 *   - 没有数据的国家画**灰斜纹**，不是浅色、更不是零。一块浅色会被读成
 *     「这里很少发生」，而实际含义是「这里没人数过」——两者相反。
 *   - 不用红绿。深色在这张图上往往只说明那个国家做过一次认真的全国调查。
 *   - SVG 整块 aria-hidden，语义交给下面那张国家表格：那里是真的按钮，
 *     键盘走得到、读屏念得出。一个国家在这个比例尺上可能只有几个像素，
 *     指望人用手指点中是不诚实的。
 */
export function AtlasMap({
  continent, indicator, mode, onPick, selected,
}: {
  continent?: ContinentKey
  indicator: string
  mode: Mode
  onPick: (iso: string) => void
  selected?: string
}): JSX.Element {
  const shapes = continent ? (CONTINENT_SHAPES[continent] ?? {}) : WORLD
  const data = useMemo(() => countriesWith(indicator), [indicator])

  /* 着色永远按比例或每十万——人数用气泡，不用颜色。见下面那句提醒。 */
  const colourMode: Mode = mode === 'count' ? 'percent' : mode
  const breaks = useMemo(() => breaksOf(
    [...data.values()].map((p) => valueOf(p, colourMode)).filter((v): v is number => v !== undefined),
  ), [data, colourMode])

  const counts = useMemo(() => [...data.values()]
    .map((p) => p.count).filter((v): v is number => v !== undefined), [data])
  const maxCount = counts.length ? Math.max(...counts) : 0

  const isoList = Object.keys(shapes)

  return (
    <div className="amap">
      <svg
        className="amap__svg"
        viewBox={`0 0 ${ATLAS_SIZE.w} ${ATLAS_SIZE.h}`}
        role="presentation"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {/* 没有数据 = 灰斜纹。规格里写死的：绝不能显示为零。 */}
          <pattern id="amap-nodata" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--amap-blank)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--amap-hatch)" strokeWidth="1.6" />
          </pattern>
        </defs>

        {isoList.map((iso) => {
          const p = data.get(iso)
          const v = valueOf(p, colourMode)
          const fill = v !== undefined && breaks ? ramp(v, breaks) : 'url(#amap-nodata)'
          return (
            <path
              key={iso}
              d={shapes[iso].d}
              className={`amap__land${selected === iso ? ' amap__land--on' : ''}`}
              fill={fill}
              onClick={() => onPick(iso)}
            >
              <title>{COUNTRY[iso]?.zh ?? iso}{v === undefined ? '：暂无数据' : ''}</title>
            </path>
          )
        })}

        {/* 气泡：人数。半径按面积开方，不然大国会把整张图盖住。 */}
        {mode === 'count' && maxCount > 0 && isoList.map((iso) => {
          const n = data.get(iso)?.count
          if (n === undefined || n <= 0) return null
          const r = Math.max(2.5, Math.sqrt(n / maxCount) * 26)
          const [cx, cy] = shapes[iso].c
          return <circle key={`b-${iso}`} className="amap__bubble" cx={cx} cy={cy} r={r} />
        })}
      </svg>
    </div>
  )
}
