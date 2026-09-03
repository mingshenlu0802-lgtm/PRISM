import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TopicKey } from '../../lib/types'
import type { RegionKey } from '../../lib/regions'
import { usePrism } from '../../lib/store'
import { usePageTitle } from '../../lib/title'
import { byNewest, fmtDate, unique, weightedShuffle } from '../../lib/util'
import { EmptyState, Icon } from '../../components/common'
import { NewsCard } from '../../components/site/NewsCard'
import { StudyCard } from '../../components/site/StudyCard'
import { FilterBar } from '../../components/site/FilterBar'
import { Toll } from '../../components/site/Toll'
import { RegionMap } from '../../components/site/RegionMap'
import './HomePage.css'

/**
 * 首页。一块数据，一张地图，一排标签，然后是一条一条的短总结。
 *
 * **没有头条。** 原来最上面有一条站长钉的头条，用 lead 版式占掉大半屏。
 * 站长说不需要。他是对的：这个站一天出十几条，每一条都是挑过写过的，
 * 把其中一条架大三倍，等于替读者决定今天什么最重要——而这个站的立场
 * 恰恰是「这些事都在发生」，不是「今天最该看这一件」。
 *
 * 顺序也是站长定的：数据 → 地图 → 标签 → 新闻。地图和标签都是入口，
 * 挨在一起；读者从「哪里」和「什么题目」进去，或者直接往下读。
 */
export default function HomePage(): JSX.Element {
  const { state, canEdit } = usePrism()
  usePageTitle(fmtDate(state.today))
  const [regions, setRegions] = useState<RegionKey[]>([])
  const [topics, setTopics] = useState<TopicKey[]>([])

  /*
   * 每次打开，顺序都不一样。
   *
   * 站长要的：「每次打开界面对新闻的推送都是随机的（当然，最新的新闻更有
   * 概率被推送）。」严格倒序的代价是第 20 条以后没人看得到，而它们和第 3 条
   * 一样是挑过写过的。
   *
   * 种子只在**这一次访问**里取一次——放在 useState 的初始化里，重渲染不会重算。
   * 否则筛一下地区、切一下主题，卡片就会在读者眼皮底下重新洗牌。
   */
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31))

  const live = useMemo(
    () => weightedShuffle(state.news.filter((n) => n.status === 'live'), (n) => n.publishedAt, seed),
    [state.news, seed],
  )
  const liveStudies = useMemo(() => byNewest(state.studies.filter((s) => s.status === 'live')), [state.studies])

  const counts = useMemo(() => {
    const r: Partial<Record<RegionKey, number>> = {}
    const t: Partial<Record<TopicKey, number>> = {}
    for (const n of live) {
      for (const k of n.regions) r[k] = (r[k] ?? 0) + 1
      for (const k of n.topics) t[k] = (t[k] ?? 0) + 1
    }
    return { regions: r, topics: t }
  }, [live])

  const filtering = regions.length + topics.length > 0

  const shown = useMemo(() => live.filter((n) => {
    const okR = regions.length === 0 || n.regions.some((k) => regions.includes(k))
    const okT = topics.length === 0 || n.topics.some((k) => topics.includes(k))
    return okR && okT
  }), [live, regions, topics])

  const coveredRegions = unique(live.flatMap((n) => n.regions))

  return (
    <div className="home u-shell">
      {/*
        * 报头，不是仪表盘。
        *
        * 站长两次说了：标语和那段介绍「在任何地方都不需要强调」。
        * 于是首页开门见山就是日期——这本来就是这一页的身份：今天这一期。
        *
        * 四个数字方框也一并收掉了。它们看起来像后台的统计卡片，而读者不是来
        * 看指标的；同样的信息压成一行小字，报头就干净了。
        *
        * h1 留着并且换成日期：一页不能没有标题，屏幕阅读器靠它定位。
        */}
      <section className="home__hero">
        <p className="home__kicker">今日</p>
        <h1 className="home__title">{fmtDate(state.today)}</h1>
        <p className="home__meta">
          {live.length} 条报道
          {coveredRegions.length > 0 && <> · 覆盖 {coveredRegions.length} 个地区</>}
          {liveStudies.length > 0 && <> · {liveStudies.length} 项研究与数据</>}
        </p>
      </section>

      {/*
        * 数据块和地图只在**没有筛选**的时候出现。
        * 读者点了「香港」，要的是香港的全部内容，不是先滚过一屏全球统计。
        */}
      {!filtering && <Toll />}

      {/*
        * 数据块下面紧接着地图，地图下面紧接着标签——站长定的顺序。
        *
        * 这三块是同一件事的三种入口：先让人看见规模，再让人看见分布，
        * 最后给他一排能按的题目。中间不插别的东西，否则「按地区看」和
        * 下面那排标签会被一条新闻隔开，读者不会把它们当成一组。
        */}
      {!filtering && (
        <section className="home__map" aria-labelledby="home-map">
          <h2 className="home__sectitle" id="home-map">按地区看</h2>
          <RegionMap counts={counts.regions} />
        </section>
      )}

      <FilterBar
        regions={regions}
        topics={topics}
        onRegions={setRegions}
        onTopics={setTopics}
        counts={counts}
      />

      <p className="home__count">
        {filtering
          ? `筛选后 ${shown.length} 条（共 ${live.length} 条）`
          : `共 ${live.length} 条`}
      </p>

      {shown.length === 0 && (
        /*
         * 分两种情况说。
         *
         * 刚接上共享数据库的站是空的，而这时候站长一条筛选都没设——
         * 跟他说「换一组地区试试」是句假话，还会让他以为内容在某个筛选后面藏着。
         */
        filtering ? (
          <EmptyState
            title="这个筛选下暂时没有内容"
            hint="换一组地区或议题试试，或者清除筛选看全部。"
            icon="search"
          />
        ) : (
          <EmptyState
            title="还没有内容"
            hint={canEdit
              ? '去「控制端 → 编辑 → 内容」，按「＋ 自己写一条」写第一条。写好按「重新上线」才会出现在这里。'
              : '站长还没有发布内容。过些时候再来看看。'}
            icon="layers"
          />
        )
      )}

      {shown.length > 0 && (
        <div className="home__feed">
          {shown.map((n) => <NewsCard key={n.id} item={n} />)}
        </div>
      )}

      {liveStudies.length > 0 && (
        <section className="home__studies" aria-labelledby="home-studies">
          <div className="home__sechead">
            <h2 className="home__sectitle" id="home-studies">研究与公开数据</h2>
            <Link className="home__seclink" to="/studies">全部 {liveStudies.length} 项<Icon name="arrow-right" size={13} /></Link>
          </div>
          <div className="home__studygrid">
            {liveStudies.slice(0, 2).map((s) => <StudyCard key={s.id} item={s} />)}
          </div>
        </section>
      )}
    </div>
  )
}
