import { useState } from 'react'
import type { NewsImage } from '../../lib/types'
import type { RegionKey } from '../../lib/regions'
import type { TopicKey } from '../../lib/types'
import { REGION_MAP } from '../../lib/regions'
import { TOPIC_MAP } from '../../lib/constants'
import { cx, displayHost } from '../../lib/util'
import { Icon } from '../common'
import './Cover.css'

/**
 * 每条新闻的图。
 *
 * 有真图就放真图，连同摄影师和出处——图是别人拍的，这里只是引用，署名不是可选项。
 * 没有真图就画一张：把这条新闻的地区色和议题色折射成一道光谱。它明显是图形，
 * 不是照片，所以永远不会被误当成现场——对一个经常报道性暴力的站点，这条底线
 * 比「每条都有配图好看」重要得多。
 *
 * 生成的封面是**确定的**：同一条新闻每次画出来都一样，不会今天一个样明天一个样。
 */

export interface CoverProps {
  image?: NewsImage
  /** 没有真图时，用它们来生成 */
  seed: string
  regions: RegionKey[]
  topics: TopicKey[]
  variant?: 'feed' | 'full'
}

export function Cover({ image, seed, regions, topics, variant = 'feed' }: CoverProps): JSX.Element {
  const [failed, setFailed] = useState(false)

  if (image && !failed) {
    return (
      <figure className={cx('cover', `cover--${variant}`)}>
        <img
          className="cover__img"
          src={image.url}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
        <figcaption className="cover__credit">
          <Icon name="image" size={12} />
          {image.creditUrl ? (
            <a href={image.creditUrl} target="_blank" rel="noreferrer noopener">
              {image.credit}
            </a>
          ) : (
            <span>{image.credit}</span>
          )}
          {image.creditUrl && <span className="cover__host">{displayHost(image.creditUrl)}</span>}
        </figcaption>
      </figure>
    )
  }

  return (
    <div className={cx('cover', `cover--${variant}`, 'cover--drawn')} aria-hidden="true">
      <Refraction seed={seed} regions={regions} topics={topics} />
      {image && failed && <p className="cover__failed">原图打不开了</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * 画出来的封面
 * ------------------------------------------------------------------ */

/** 一个稳定的小整数，同一条新闻永远得到同一张图。 */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function Refraction({ seed, regions, topics }: { seed: string; regions: RegionKey[]; topics: TopicKey[] }): JSX.Element {
  const h = hash(seed)
  const at = (n: number) => (h >> (n * 3)) % 97

  // 颜色取自这条新闻自己的标签，所以内地的一批和欧洲的一批一眼就不一样，
  // 而不是十二张一模一样的插图。
  const hues = [
    ...regions.map((r) => REGION_MAP[r]?.hue).filter(Boolean),
    ...topics.map((t) => TOPIC_MAP[t]?.hue).filter(Boolean),
  ] as string[]
  const palette = hues.length > 0 ? hues : ['var(--prism-1)', 'var(--prism-2)', 'var(--prism-5)']

  // 一片斜向的折射带。角度、条数、宽窄、疏密全部由 seed 决定，
  // 但都锁在好看的范围里——随机的是构图，不是品味。
  const angle = -34 + (at(0) % 68)
  const count = 7 + (at(1) % 6)
  const shift = at(2) % 40

  const W = 320
  const H = 180
  const bands = Array.from({ length: count }, (_, i) => {
    const t = i / count
    const width = 8 + ((h >> (i + 2)) % 22)
    const y = -60 + shift + t * (H + 120)
    return {
      y,
      width,
      hue: palette[i % palette.length],
      opacity: 0.1 + ((h >> (i + 5)) % 15) / 100,
    }
  })

  return (
    <svg className="cover__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="presentation">
      <rect width={W} height={H} className="cover__bg" />

      {/* 底色轻轻带一点这条新闻主地区的颜色 */}
      <rect width={W} height={H} fill={palette[0]} opacity="0.05" />

      <g transform={`rotate(${angle} ${W / 2} ${H / 2})`}>
        {bands.map((b, i) => (
          <rect
            key={i}
            x={-140}
            y={b.y}
            width={W + 280}
            height={b.width}
            fill={b.hue}
            opacity={b.opacity}
          />
        ))}
        {/* 一条亮的，给整张图一个落点 */}
        <rect
          x={-140}
          y={bands[Math.floor(count / 2)].y}
          width={W + 280}
          height={bands[Math.floor(count / 2)].width}
          fill={palette[0]}
          opacity="0.44"
        />
      </g>
    </svg>
  )
}
