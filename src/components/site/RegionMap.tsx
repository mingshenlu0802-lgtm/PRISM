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
 * **一个地区就是一块，不是几格。** 上一版把地图写成一张 5×6 的格子表，
 * 一个地区占好几格，而名字只写在第一格上——于是屏幕上有一半的格子是
 * 没有字的彩色方块，美国被画成「一块写着美国的」加「一块空的」。
 * 看起来不像地图，像没加载完。
 *
 * 现在每个地区用 grid-area 占一个**矩形**，整块一个名字。为此重排了版面，
 * 让每个地区的形状都是矩形——地图本来就不精确，牺牲的那点形状不值一提，
 * 换来的是一眼能读。
 *
 * 「跨区域·国际机构」没有地理位置，所以单独放在最下面一行，不塞进格子里
 * 假装它在某个地方。
 */

/**
 * 版面。`grid-area` 的写法是 行起 / 列起 / 行止 / 列止（止是开区间）。
 *
 *          c1      c2      c3      c4      c5      c6
 *   r1      ·       ·      欧洲    欧洲   俄罗斯  俄罗斯
 *   r2     美国    美国    欧洲    欧洲   俄罗斯  俄罗斯
 *   r3     美国    美国   中东北非 中东北非 中国    日韩
 *   r4    拉美    非洲    非洲     南亚   中国    台湾
 *   r5    拉美    非洲    非洲    东南亚  东南亚  香港
 *   r6      ·       ·       ·       ·     澳新    澳新
 */
const PLACES: { key: RegionKey; area: string }[] = [
  { key: 'eu', area: '1 / 3 / 3 / 5' },
  { key: 'ru', area: '1 / 5 / 3 / 7' },
  { key: 'us', area: '2 / 1 / 4 / 3' },
  { key: 'mena', area: '3 / 3 / 4 / 5' },
  { key: 'cn', area: '3 / 5 / 5 / 6' },
  { key: 'jpkr', area: '3 / 6 / 4 / 7' },
  { key: 'latam', area: '4 / 1 / 6 / 2' },
  { key: 'africa', area: '4 / 2 / 6 / 4' },
  { key: 'sasia', area: '4 / 4 / 5 / 5' },
  { key: 'tw', area: '4 / 6 / 5 / 7' },
  { key: 'sea', area: '5 / 4 / 6 / 6' },
  { key: 'hk', area: '5 / 6 / 6 / 7' },
  { key: 'anz', area: '6 / 5 / 7 / 7' },
]

export function RegionMap({ counts }: { counts?: Partial<Record<RegionKey, number>> }): JSX.Element {
  const byKey = new Map(REGIONS.map((r) => [r.key, r]))

  return (
    <nav className="rmap" aria-label="按地区浏览">
      <div className="rmap__grid">
        {PLACES.map(({ key, area }) => {
          const region = byKey.get(key)
          if (!region) return null
          const n = counts?.[key] ?? 0
          return (
            <Link
              key={key}
              className={n > 0 ? 'rmap__tile' : 'rmap__tile rmap__tile--bare'}
              to={`/region/${key}`}
              style={{ gridArea: area, '--tile': region.hue } as React.CSSProperties}
              aria-label={n > 0 ? `${region.zh}，${n} 条` : `${region.zh}，今天没有内容`}
            >
              <span className="rmap__name">{region.zh}</span>
              {/*
                * 有内容的地区才写数字，于是地图会「亮」在今天真的发生了事情的
                * 地方——这一眼本身就是信息。没有内容的仍然可以点，只是压淡：
                * 那一页会明白地说今天这里没有内容，比一个点不动的方块诚实。
                */}
              {n > 0 && <span className="rmap__n">{n}</span>}
            </Link>
          )
        })}
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
