import { Link } from 'react-router-dom'
import type { NewsItem } from '../../lib/types'
import { cx, relTime, textLength } from '../../lib/util'
import { Icon } from '../common'
import { TagRow } from './Tags'
import { LinkList } from './LinkList'
import { Cover } from './Cover'
import { Prose } from './Prose'
import './NewsCard.css'

/**
 * 一条新闻的完整呈现：标题、总结、要点、标签、以及报道它的媒体链接。
 *
 * 总结可以写到几百上千字，空一行分段。长的总结在信息流里收起一半——
 * 一屏放不下三条新闻的首页，读者是不会往下翻的——点进去看全文。
 */

/** 信息流里收起的门槛：头条给得多些，因为它本来就该占位置。 */
const CLAMP_AT = { feed: 240 }

export interface NewsCardProps {
  item: NewsItem
  /** 'feed' 折叠链接，'full' 直接展开。首页原来还有一个 'lead'，
   *  站长说不需要头条，那一版式连同这个取值一起去掉了。 */
  variant?: 'feed' | 'full'
  today?: string
}

export function NewsCard({ item, variant = 'feed', today }: NewsCardProps): JSX.Element {
  const full = variant === 'full'
  const length = textLength(item.summary)
  const clamped = !full && length > CLAMP_AT.feed

  /*
   * 要点。
   *
   * 位置分两种，因为它在两个地方做的是两件事。
   *
   * 在**文章页**上，正文可以有三千字。把要点放在正文底下，等于让读者读完
   * 全文才看到「这条讲了什么」——那时他已经知道了。所以文章页把它提到
   * 正文前面，做成一个方框：先给结论，再展开。BBC 中文网的长稿也是这么排的。
   *
   * 在**信息流**里正文是折起来的，要点跟在折起的那几行后面，正好补上被
   * 折掉的信息，是「要不要点进去」的依据。所以那里保持原位。
   */
  const bullets = item.bullets.length > 0 ? (
    <ul className={cx('ncard__bullets', full && 'ncard__bullets--box')} aria-label={full ? '本条要点' : undefined}>
      {item.bullets.map((b) => <li key={b}>{b}</li>)}
    </ul>
  ) : null

  return (
    <article className={cx('ncard', full && 'ncard--full')}>
      <header className="ncard__head">
        <TagRow regions={item.regions} topics={item.topics} size="sm" />
        {full ? (
          <h1 className="ncard__title">{item.headline}</h1>
        ) : (
          <h2 className="ncard__title">
            <Link to={`/news/${item.slug}`}>{item.headline}</Link>
          </h2>
        )}
        {item.subhead && <p className="ncard__subhead">{item.subhead}</p>}
        <p className="ncard__when">
          <time dateTime={item.publishedAt}>{relTime(item.publishedAt, today)}</time>
          {item.editedByHuman && <span className="ncard__edited">· 站长已校订</span>}
        </p>
      </header>

      {/*
        * 内容提示（那条红色的警告带）去掉了。
        *
        * 站长的判断是对的：这个站**每一条**都是性别暴力相关的报道，
        * 一个条条都挂的提示等于没有提示，只是在每张卡片顶上压了一条红带，
        * 把注意力从新闻本身挪开。读者知道自己点开的是什么——标题就写着。
        */}

      {/*
        * 信息流里**没有真图就不画图**。
        *
        * 生成的那张「地区色 × 议题色」的光谱是一个好设计，理由也站得住：
        * 一个报道性暴力的站不该拿真人照片当装饰。但它在首页上的代价是
        * 每张卡片顶着 450 像素的渐变，十二条排下来，读者要划过五千多像素
        * 的色块才看完今天的新闻——而那些色块一个字的信息都没有。
        *
        * 「不用照片」的正确结论是**不放图**，不是「放一张抽象的图」。
        * 所以：有真图（来源页的 og:image）就放，那是这条新闻自己的图；
        * 没有就直接进正文。单篇页面上仍然画那张光谱——一篇稿子有一个题图
        * 是版式，十二个并排就是噪音。
        */}
      {(item.image || full) && (
        <Cover
          image={item.image}
          seed={item.slug}
          regions={item.regions}
          topics={item.topics}
          variant={full ? 'full' : 'feed'}
        />
      )}

      {/*
        * 要点排在图**后面**。
        *
        * 原来的顺序是 标题 → 要点 → 图 → 正文：读者先读完三条要点，
        * 撞上一张大图，再开始读正文——图正好插在「概览」和「细节」中间，
        * 把一篇文章切成了两半。图要么在最上面当题图，要么不要，
        * 没有「读到一半插一张」这种位置。
        */}
      {full && bullets}

      <div className={cx('ncard__summary', clamped && 'ncard__summary--clamp')}>
        <Prose text={item.summary} />
      </div>

      {clamped && (
        <Link className="ncard__more" to={`/news/${item.slug}`}>
          读全文（{length} 字）
          <Icon name="arrow-right" size={13} />
        </Link>
      )}

      {!full && bullets}

      {item.editorNote && (
        <p className="ncard__editornote">
          <span className="ncard__editornote-k">站长补充</span>
          {item.editorNote}
        </p>
      )}

      <div className="ncard__links">
        <p className="ncard__linkhead">
          <Icon name="link" size={13} />
          {item.links.length} 家媒体报道了这条
        </p>
        <LinkList links={item.links} compact={!full} />
      </div>

      {!full && (
        <Link className="ncard__perma" to={`/news/${item.slug}`}>
          单独查看这条
          <Icon name="arrow-right" size={13} />
        </Link>
      )}
    </article>
  )
}
