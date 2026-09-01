import { Link } from 'react-router-dom'
import type { RegionKey } from '../../lib/regions'
import { REGIONS } from '../../lib/regions'
import './RegionMap.css'

/**
 * 地区导航，按地理位置摆。
 *
 * 站长要「一个地图，可以点击地图的相应位置进入到地区标签」。
 *
 * 做成**格子地图**（tile grid map）而不是画海岸线，是想清楚之后的选择：
 *
 *   - 这个站的「地区」不是国家，是十四个人为划的区块——「东南亚」「中东与北非」
 *     「跨区域·国际机构」。真画一张世界地图，读者会去找越南、找埃及，
 *     而点下去得到的是整个区块；地图越精确，这个落差越刺眼。
 *   - 格子地图不假装自己是精确的，但仍然保住了「上面是北、左边是西」这层
 *     空间直觉，一眼能找到自己要的那块。
 *   - 每一格都是一个真的链接：键盘能走，读屏能念，手机上不用捏放大。
 *     一张 SVG 世界地图这三样都要额外做，而且做不好。
 *
 * 「跨区域·国际机构」没有地理位置，所以单独放在最下面一行，不塞进格子里
 * 假装它在某个地方。
 */

/** 行、列：大致按经纬度摆。空字符串是留白，用来让形状接近世界地图。 */
const GRID: (RegionKey | '')[][] = [
  ['', '', 'eu', 'ru', 'ru', ''],
  ['us', '', 'eu', 'mena', 'cn', 'jpkr'],
  ['us', '', 'mena', 'sasia', 'cn', 'tw'],
  ['latam', 'africa', 'africa', 'sasia', 'sea', 'hk'],
  ['latam', 'africa', '', '', 'sea', 'anz'],
]

export function RegionMap({ counts }: { counts?: Partial<Record<RegionKey, number>> }): JSX.Element {
  const byKey = new Map(REGIONS.map((r) => [r.key, r]))

  // 一个地区可能占好几格。只在它的**第一格**写名字，其余格子只上色，
  // 否则「中国内地」会在地图上重复出现两次。
  const named = new Set<RegionKey>()

  return (
    <nav className="rmap" aria-label="按地区浏览">
      <div className="rmap__grid">
        {GRID.flatMap((row, y) => row.map((key, x) => {
          if (!key) return <span key={`${y}-${x}`} className="rmap__gap" aria-hidden="true" />
          const region = byKey.get(key)
          if (!region) return <span key={`${y}-${x}`} className="rmap__gap" aria-hidden="true" />
          const first = !named.has(key)
          named.add(key)
          const n = counts?.[key] ?? 0
          return (
            <Link
              key={`${y}-${x}`}
              className="rmap__tile"
              to={`/region/${key}`}
              style={{ '--tile': region.hue } as React.CSSProperties}
              // 同一个地区的第二、第三格对读屏是重复的，藏起来。
              aria-hidden={first ? undefined : true}
              tabIndex={first ? undefined : -1}
              aria-label={`${region.zh}${n ? `，${n} 条` : ''}`}
            >
              {first && (
                <>
                  <span className="rmap__name">{region.zh}</span>
                  {n > 0 && <span className="rmap__n">{n}</span>}
                </>
              )}
            </Link>
          )
        }))}
      </div>

      {/* 没有地理位置的那一项，不塞进格子里假装它在某处。 */}
      <Link className="rmap__global" to="/region/global">
        <span className="rmap__dot" style={{ background: 'var(--r-global)' }} aria-hidden="true" />
        跨区域 · 国际机构
        {counts?.global ? <span className="rmap__n">{counts.global}</span> : null}
      </Link>
    </nav>
  )
}
