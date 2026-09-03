import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import type { RegionKey } from '../../lib/regions'
import { REGIONS } from '../../lib/regions'
import { MAP_HK, MAP_PATHS, MAP_REST, MAP_SIZE } from '../../lib/worldmap'
import './RegionMap.css'

/**
 * 世界地图，可以点。
 *
 * 站长看过上一版之后说：「我对地图也不满意，那不是世界地图。」他是对的。
 * 上一版是一张 6×6 的格子表，摆得像地图而已——读者要找巴西，看到的是一个
 * 写着「拉丁美洲」的方块。
 *
 * 这一版是真的地理数据：Natural Earth 的国界，geoNaturalEarth1 投影，
 * 同一个地区的国家在构建时就合并成一块（见 scripts/build-map.mjs）。
 * 运行时没有任何地图库——只有十几条 SVG 路径。
 *
 * **无障碍：图形归图形，语义归底下那一行。**
 * SVG 整块 aria-hidden，它是给鼠标和手指用的；每个地区真正的入口是地图
 * 下面那一排链接——它们是真的 <a>，键盘走得到、读屏念得出、手指按得准。
 * 香港在这个比例尺上只有几个像素，指望人用手指点中是不诚实的。
 */
export function RegionMap({ counts }: { counts?: Partial<Record<RegionKey, number>> }): JSX.Element {
  const navigate = useNavigate()
  const byKey = new Map(REGIONS.map((r) => [r.key, r]))
  const n = (k: RegionKey) => counts?.[k] ?? 0

  /** 有内容的地区上色重一些——地图会「亮」在今天真的发生了事情的地方。 */
  const shapeProps = (k: RegionKey) => ({
    className: n(k) > 0 ? 'rmap__area' : 'rmap__area rmap__area--bare',
    style: { '--tile': byKey.get(k)?.hue } as React.CSSProperties,
    onClick: () => navigate(`/region/${k}`),
  })

  return (
    <nav className="rmap" aria-label="按地区浏览">
      <svg
        className="rmap__svg"
        viewBox={`0 0 ${MAP_SIZE.w} ${MAP_SIZE.h}`}
        role="presentation"
        aria-hidden="true"
        focusable="false"
      >
        {/* 没有对应地区的陆地。画出来是为了让地图还像地图，但点不动——
            这个站现在确实不覆盖那里，灰着比假装能点进去诚实。
            现在每一块陆地都归到了某个地区，MAP_REST 是空的；
            留着这一笔，是因为将来拆分或新增地区时它随时会再有内容。 */}
        {MAP_REST && <path className="rmap__rest" d={MAP_REST} />}

        {(Object.keys(MAP_PATHS) as RegionKey[]).map((k) => (
          byKey.has(k) ? <path key={k} d={MAP_PATHS[k]} {...shapeProps(k)}>
            <title>{byKey.get(k)?.zh}{n(k) ? `：${n(k)} 条` : ''}</title>
          </path> : null
        ))}

        {/* 香港在这个比例尺上画不出来（它是一座城市），用一个点标住。 */}
        <circle cx={MAP_HK.x} cy={MAP_HK.y} r={5} {...shapeProps('hk')}>
          <title>香港{n('hk') ? `：${n('hk')} 条` : ''}</title>
        </circle>
      </svg>

      {/*
        * 地图底下这一排才是正经的导航。
        * 每个地区都在，包括地图上小得点不中的那几个，以及根本没有地理位置的
        * 「跨区域·国际机构」。
        */}
      <ul className="rmap__list">
        {REGIONS.map((r) => (
          <li key={r.key}>
            <Link
              className={n(r.key) > 0 ? 'rmap__chip' : 'rmap__chip rmap__chip--bare'}
              to={`/region/${r.key}`}
            >
              <span className="rmap__dot" style={{ background: r.hue }} aria-hidden="true" />
              {r.zh}
              {n(r.key) > 0 && <span className="rmap__n">{n(r.key)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
