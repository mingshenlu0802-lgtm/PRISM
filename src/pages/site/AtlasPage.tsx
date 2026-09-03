import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePageTitle } from '../../lib/title'
import { AtlasMap } from '../../components/site/AtlasMap'
import { Provenance } from '../../components/site/Provenance'
import { Icon } from '../../components/common'
import { COUNTRY } from '../../lib/atlas/geo'
import { CONTINENTS, GROUPS, GROUP_MAP, INDICATORS, INDICATOR_MAP } from '../../lib/atlas/indicators'
import type { ContinentKey, Group } from '../../lib/atlas/indicators'
import {
  countriesWith, countryCoverage, globalPoints, humanCount, isComparable, oneIn, valueOf,
} from '../../lib/atlas/query'
import type { Mode } from '../../lib/atlas/query'
import { cx } from '../../lib/util'
import './AtlasPage.css'

const MODES: { key: Mode; zh: string; note: string }[] = [
  { key: 'percent', zh: '按比例', note: '同样人口规模下的个人风险，国家之间最有可比性。' },
  { key: 'count', zh: '按人数', note: '受影响的人有多少。人口多的国家绝对人数自然高。' },
  { key: 'per100k', zh: '每 10 万人', note: '登记类数据（凶杀、报案）常用的口径。' },
]

/**
 * 各国数据。
 *
 * 站长要的是一张可交互的全球地图：受害人数、个人风险、男性施害、社会态度、
 * 法律保护、司法失灵，三级下钻（全球 → 洲 → 国家）。
 *
 * 这一页最要紧的不是好看，是**不骗人**。所以有几条写死的规矩：
 *   - 没有数据画灰斜纹，绝不显示为零。缺数据和「零个受害者」是相反的两件事。
 *   - 不用红绿。深色在这张图上往往只说明那个国家做过一次认真的全国调查。
 *   - 不做「最危险国家排行榜」。各国的行为定义、年龄范围、调查年份都不同，
 *     排出来的名次有一半是问卷的差别。
 *   - 按人数看的时候，页面上一直挂着那句提醒：人口多的国家绝对人数高，
 *     不代表当地女性的个人风险更高。
 */
export default function AtlasPage(): JSX.Element {
  const { continent } = useParams()
  const navigate = useNavigate()
  const here = CONTINENTS.find((c) => c.key === continent)?.key as ContinentKey | undefined

  const [group, setGroup] = useState<Group>('victim')
  const [indicator, setIndicator] = useState('ipv-lifetime')
  const [mode, setMode] = useState<Mode>('percent')
  const [q, setQ] = useState('')
  /*
   * 全球视图有 175 个国家。一次全排出来，这一页有两万像素高——
   * 滚到底要划四十屏，而读者要找的那个国家八成不在他划到的地方。
   * 先给一屏，要看全部再点。搜索框任何时候都直接过滤全部。
   */
  const [all, setAll] = useState(false)

  usePageTitle(here ? `各国数据 · ${CONTINENTS.find((c) => c.key === here)?.zh}` : '各国数据')

  const meta = INDICATOR_MAP[indicator]
  const inGroup = INDICATORS.filter((i) => i.group === group)
  const data = useMemo(() => countriesWith(indicator), [indicator])
  const coverage = useMemo(() => countryCoverage(), [])
  const world = useMemo(() => globalPoints(), [])

  /** 这个洲（或全球）有数据的国家，按当前口径排。不可比的指标不排序。 */
  const rows = useMemo(() => {
    const all = Object.keys(COUNTRY)
      .filter((iso) => !here || COUNTRY[iso].continent === here)
      .map((iso) => ({ iso, zh: COUNTRY[iso].zh, p: data.get(iso) }))
    const hit = q.trim()
      ? all.filter((r) => r.zh.includes(q.trim()) || r.iso.includes(q.trim().toUpperCase())
        || COUNTRY[r.iso].en.toLowerCase().includes(q.trim().toLowerCase()))
      : all
    if (!isComparable(indicator)) return hit.sort((a, b) => a.zh.localeCompare(b.zh, 'zh'))
    return hit.sort((a, b) => {
      const av = valueOf(a.p, mode)
      const bv = valueOf(b.p, mode)
      if (av === undefined && bv === undefined) return a.zh.localeCompare(b.zh, 'zh')
      if (av === undefined) return 1
      if (bv === undefined) return -1
      return bv - av
    })
  }, [data, here, q, indicator, mode])

  const withData = rows.filter((r) => r.p).length
  const LIMIT = 40
  const searching = q.trim().length > 0
  const visible = all || searching ? rows : rows.slice(0, LIMIT)

  return (
    <div className="atlas u-shell">
      <section className="atlas__head">
        <p className="atlas__kicker">各国数据</p>
        <h1 className="atlas__title">
          {here ? CONTINENTS.find((c) => c.key === here)?.zh : '全球'}
        </h1>
        <p className="atlas__lede">
          按国家看女性遭受性暴力的规模与风险、男性自陈施害、社会态度、法律保护与司法流失。
          点开一个国家看它的全部数据和出处。
        </p>
      </section>

      {/*
        * 这一条不能藏起来。地图看上去像结论，其实是一层薄薄的、
        * 高度不均匀的证据——说清楚它是什么，读者才用得对。
        */}
      <p className="atlas__warn">
        <Icon name="alert" size={14} />
        <span>
          这张图仍在建设中：底层用的是世界卫生组织的国家模型估计，其余指标多数国家还没有数据。
          <b>灰色斜纹代表「没有数据」，不代表零。</b>
          每个数字都附来源与边界，引用前请打开原始来源核对。
        </span>
      </p>

      {/*
        * 南极洲到此为止。
        *
        * 那里没有主权国家，也没有可比的人口数据——给它一个指标下拉、
        * 一个「按人数/按比例」的切换、一张空地图和一份空国家列表，
        * 是把一整套界面摆出来假装还有东西可看。说清楚就结束。
        */}
      {here === 'antarctica' ? (
        <p className="atlas__empty">
          南极洲无主权国家及可比人口数据，因此这一层没有内容。
        </p>
      ) : (
        <>

      {/*
        * 全球那几个数字只在全球视图上出现。
        *
        * 它原来每一层都跟着，于是七个洲的页面顶上印着同样五张卡片——
        * 读者点进「亚洲」，先看到的还是全球的数字，要划过一屏才到亚洲。
        * 点进一个洲就是想看那个洲。
        */}
      {!here && world.length > 0 && (
        <section className="atlas__global" aria-label="全球数字">
          <h2 className="atlas__h2">全球</h2>
          <ul className="atlas__globallist">
            {world.map((p) => {
              const one = oneIn(p.percent)
              return (
                <li key={`${p.indicator}-${p.published}`} className="atlas__gitem">
                  <p className="atlas__gval">
                    {p.percent !== undefined ? `${p.percent}%` : humanCount(p.count)}
                  </p>
                  <p className="atlas__glabel">{INDICATOR_MAP[p.indicator]?.zh ?? p.indicator}</p>
                  {one && <p className="atlas__gone">{one}</p>}
                  <details className="atlas__gmore">
                    <summary>来源与边界</summary>
                    <Provenance p={p} />
                  </details>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="atlas__controls" aria-label="选择指标">
        <div className="atlas__tabs" role="tablist" aria-label="数据分组">
          {GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              role="tab"
              aria-selected={group === g.key}
              className={cx('atlas__tab', group === g.key && 'atlas__tab--on')}
              onClick={() => {
                setGroup(g.key)
                const first = INDICATORS.find((i) => i.group === g.key)
                if (first) setIndicator(first.key)
              }}
            >{g.zh}</button>
          ))}
        </div>

        <p className="atlas__caveat">{GROUP_MAP[group].caveat}</p>

        <label className="atlas__field">
          <span>指标</span>
          <select value={indicator} onChange={(e) => setIndicator(e.target.value)}>
            {inGroup.map((i) => <option key={i.key} value={i.key}>{i.zh}</option>)}
          </select>
        </label>

        <div className="atlas__modes" role="group" aria-label="怎么看这个数字">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={mode === m.key}
              className={cx('atlas__mode', mode === m.key && 'atlas__mode--on')}
              onClick={() => setMode(m.key)}
            >{m.zh}</button>
          ))}
        </div>
        <p className="atlas__modenote">{MODES.find((m) => m.key === mode)?.note}</p>
      </section>

      {meta && (
        <p className="atlas__def"><b>{meta.zh}：</b>{meta.definition}</p>
      )}

      <AtlasMap
        continent={here}
        indicator={indicator}
        mode={mode}
        onPick={(iso) => navigate(`/country/${iso}`)}
      />

      <div className="atlas__legend">
        <span className="atlas__legenditem"><i className="atlas__swatch atlas__swatch--lo" />低</span>
        <span className="atlas__legenditem"><i className="atlas__swatch atlas__swatch--mid" /></span>
        <span className="atlas__legenditem"><i className="atlas__swatch atlas__swatch--hi" />高</span>
        <span className="atlas__legenditem"><i className="atlas__swatch atlas__swatch--none" />暂无数据</span>
        {mode === 'count' && <span className="atlas__legenditem"><i className="atlas__bubble" />圆点大小 = 受影响人数</span>}
      </div>

      </>
      )}

      <nav className="atlas__conts" aria-label="按洲看">
        <Link className={cx('atlas__cont', !here && 'atlas__cont--on')} to="/data">全球</Link>
        {CONTINENTS.map((c) => (
          <Link key={c.key} className={cx('atlas__cont', here === c.key && 'atlas__cont--on')} to={`/data/${c.key}`}>
            {c.zh}
          </Link>
        ))}
      </nav>

      {here !== 'antarctica' && (
      <section className="atlas__list" aria-labelledby="atlas-list">
        <div className="atlas__listhead">
          <h2 className="atlas__h2" id="atlas-list">
            国家与地区
            <span className="atlas__listcount">{withData} / {rows.length} 有数据</span>
          </h2>
          <label className="atlas__search">
            <Icon name="search" size={14} />
            <input
              type="search"
              value={q}
              placeholder="搜索国家"
              aria-label="搜索国家"
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>

        {!isComparable(indicator) && (
          <p className="atlas__norank">
            这个指标不排名：各国的行为定义、年龄范围与调查年份不同，排出来的名次有一半是问卷的差别。
            下面按国名排列。
          </p>
        )}

        <ul className="atlas__rows">
          {visible.map((r) => {
            const v = valueOf(r.p, mode)
            return (
              <li key={r.iso}>
                <Link className="atlas__row" to={`/country/${r.iso}`}>
                  <span className="atlas__rowname">{r.zh}</span>
                  <span className={cx('atlas__rowval', v === undefined && 'atlas__rowval--none')}>
                    {v === undefined
                      ? '暂无数据'
                      : mode === 'percent' ? `${v}%` : mode === 'count' ? humanCount(v) : `${v} / 10 万`}
                  </span>
                  <span className="atlas__rowcover">{coverage.get(r.iso) ?? 0} 项</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {!all && !searching && rows.length > LIMIT && (
          <button type="button" className="atlas__all" onClick={() => setAll(true)}>
            显示全部 {rows.length} 个国家与地区
          </button>
        )}

        {searching && visible.length === 0 && (
          <p className="atlas__noresult">没有匹配「{q.trim()}」的国家。</p>
        )}
      </section>
      )}
    </div>
  )
}
