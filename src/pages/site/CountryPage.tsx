import { Link, useParams } from 'react-router-dom'
import { usePageTitle } from '../../lib/title'
import { EmptyState, Icon } from '../../components/common'
import { Provenance } from '../../components/site/Provenance'
import { COUNTRY } from '../../lib/atlas/geo'
import {
  CONTINENTS, FUNNEL_STAGES, GROUPS, GROUP_MAP, INDICATORS, JUSTICE_RECORD,
} from '../../lib/atlas/indicators'
import type { Group } from '../../lib/atlas/indicators'
import { funnelFor, humanCount, latest, lawFor, oneIn } from '../../lib/atlas/query'
import './CountryPage.css'

const LAW_ZH: Record<string, string> = {
  yes: '是', no: '否', partial: '部分', unknown: '暂无资料',
}

/**
 * 一个国家的全部数据。
 *
 * 结构照站长的规格：最重要的几个数字 → 分组指标 → 司法漏斗 → 法律状态。
 * 每一节没有数据就明说没有数据，**不留空、也不填零**。
 *
 * 这一页存在的理由是那个漏斗：它让人看见性暴力案件是怎么从社会统计
 * 一级一级消失在司法系统里的。只有一个国家把六级都报出来，那张图才成立，
 * 所以缺级的时候画的是断开的，不是补齐的。
 */
export default function CountryPage(): JSX.Element {
  const { iso } = useParams()
  const key = (iso ?? '').toUpperCase()
  const meta = COUNTRY[key]
  usePageTitle(meta ? `${meta.zh} · 各国数据` : '各国数据')

  if (!meta) {
    return (
      <div className="cpage u-shell">
        <EmptyState
          title="没有这个国家或地区"
          hint="从「各国数据」的地图或列表里选一个。"
          icon="globe"
          action={<Link className="cpage__back" to="/data">回到各国数据</Link>}
        />
      </div>
    )
  }

  const continentZh = CONTINENTS.find((c) => c.key === meta.continent)?.zh ?? ''
  const funnel = funnelFor(key)
  const law = lawFor(key)

  /** 最重要的三个：一生中伴侣暴力、儿童期性侵、被伴侣或家人杀害。 */
  const headline = ['ipv-lifetime', 'csa-before-18', 'femicide-year']
    .map((k) => ({ k, p: latest(key, k) }))
    .filter((x) => x.p)

  const byGroup = (g: Group) => INDICATORS
    .filter((i) => i.group === g && !JUSTICE_RECORD.has(i.key))
    .map((i) => ({ i, p: latest(key, i.key) }))
    .filter((x) => x.p)

  const justice = INDICATORS
    .filter((i) => JUSTICE_RECORD.has(i.key))
    .map((i) => ({ i, p: latest(key, i.key) }))
    .filter((x) => x.p)

  const anything = headline.length + GROUPS.reduce((n, g) => n + byGroup(g.key).length, 0)
    + funnel.length + justice.length + (law ? 1 : 0)

  /*
   * 缺口也要摆出来。
   *
   * 一个国家现在通常只有一两条数据，页面短得像没做完。但真正的情况不是
   * 「没做完」，是**这个国家没有人测过这些东西**——而那正是这张地图
   * 最想说的一件事。把还没有数据的指标一条条列出来，读者看到的就不再是
   * 一页空白，是一张缺口清单：哪些问题在这个国家从来没有被问过。
   *
   * 这也守住了那条规矩：没有数据永远不显示成零，而是显示成「没有数据」。
   */
  const missing = GROUPS.map((g) => ({
    g,
    items: INDICATORS.filter((i) => i.group === g.key && !latest(key, i.key)),
  })).filter((x) => x.items.length > 0)

  return (
    <div className="cpage u-shell">
      <Link className="cpage__back" to={`/data/${meta.continent}`}>
        <Icon name="chevron-left" size={14} />{continentZh}
      </Link>

      <header className="cpage__head">
        <h1 className="cpage__title">{meta.zh}</h1>
        <p className="cpage__sub">{meta.en} · {continentZh}</p>
      </header>

      {anything === 0 && (
        <div className="cpage__none">
          <p className="cpage__nonetitle">这个国家还没有数据</p>
          <p className="cpage__nonenote">
            没有数据不代表这里没有发生性暴力——它代表没有人做过（或没有公开）
            一次可比的全国调查。缺口本身是这张地图要说的事情之一。
          </p>
        </div>
      )}

      {headline.length > 0 && (
        <section className="cpage__key" aria-label="最重要的数字">
          {headline.map(({ k, p }) => {
            const one = oneIn(p!.percent)
            return (
              <div key={k} className="cpage__keyitem">
                <p className="cpage__keyval">
                  {p!.percent !== undefined ? `${p!.percent}%` : humanCount(p!.count)}
                </p>
                <p className="cpage__keylabel">
                  {INDICATORS.find((i) => i.key === k)?.zh}
                </p>
                {one && <p className="cpage__keyone">{one}</p>}
              </div>
            )
          })}
        </section>
      )}

      {GROUPS.map((g) => {
        const rows = byGroup(g.key)
        if (rows.length === 0) return null
        return (
          <section key={g.key} className="cpage__sec" aria-labelledby={`c-${g.key}`}>
            <h2 className="cpage__h2" id={`c-${g.key}`}>{g.zh}</h2>
            <p className="cpage__caveat">{GROUP_MAP[g.key].caveat}</p>
            <ul className="cpage__rows">
              {rows.map(({ i, p }) => (
                <li key={i.key} className="cpage__row">
                  <div className="cpage__rowtop">
                    <span className="cpage__rowname">{i.zh}</span>
                    <span className="cpage__rowval">
                      {p!.percent !== undefined ? `${p!.percent}%`
                        : p!.count !== undefined ? humanCount(p!.count)
                          : `${p!.per100k} / 10 万`}
                    </span>
                  </div>
                  <details className="cpage__more">
                    <summary>来源与边界</summary>
                    <Provenance p={p!} />
                  </details>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {justice.length > 0 && (
        <section className="cpage__sec" aria-labelledby="c-justice">
          <h2 className="cpage__h2" id="c-justice">司法记录</h2>
          <p className="cpage__caveat">
            以下是司法系统的产出，<b>不是施害人数</b>。绝大多数性暴力从未报案，
            报案的也未必立案——这几个数字衡量的是系统处理了多少，不是发生了多少。
          </p>
          <ul className="cpage__rows">
            {justice.map(({ i, p }) => (
              <li key={i.key} className="cpage__row">
                <div className="cpage__rowtop">
                  <span className="cpage__rowname">{i.zh}</span>
                  <span className="cpage__rowval">{humanCount(p!.count) ?? `${p!.per100k} / 10 万`}</span>
                </div>
                <details className="cpage__more">
                  <summary>来源与边界</summary>
                  <Provenance p={p!} />
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}

      {funnel.length > 0 && (
        <section className="cpage__sec" aria-labelledby="c-funnel">
          <h2 className="cpage__h2" id="c-funnel">司法漏斗</h2>
          <p className="cpage__caveat">
            从估计发生数到定罪，每一级还剩多少。这张图要说的是案件如何一级一级
            从统计和司法系统里消失。缺哪一级就断在哪里，不做插值。
          </p>
          <ol className="cpage__funnel">
            {FUNNEL_STAGES.map((s, idx) => {
              const f = funnel.find((x) => x.stage === s.key)
              const prev = idx > 0
                ? funnel.find((x) => x.stage === FUNNEL_STAGES[idx - 1].key)
                : undefined
              const top = funnel.find((x) => x.stage === FUNNEL_STAGES[0].key)
              const width = f && top ? Math.max(1.5, (f.count / top.count) * 100) : 0
              const kept = f && prev ? (f.count / prev.count) * 100 : undefined
              return (
                <li key={s.key} className={`cpage__stage${f ? '' : ' cpage__stage--gap'}`}>
                  <div className="cpage__stagehead">
                    <span className="cpage__stagename">{s.zh}</span>
                    <span className="cpage__stageval">
                      {f ? f.count.toLocaleString('zh-CN') : '暂无数据'}
                    </span>
                  </div>
                  {f && <div className="cpage__bar" style={{ width: `${width}%` }} />}
                  {kept !== undefined && (
                    <p className="cpage__drop">
                      只剩上一级的 {kept.toFixed(kept < 10 ? 1 : 0)}%
                    </p>
                  )}
                  {s.note && <p className="cpage__stagenote">{s.note}</p>}
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {missing.length > 0 && (
        <section className="cpage__sec" aria-labelledby="c-missing">
          <h2 className="cpage__h2" id="c-missing">还没有数据的指标</h2>
          <p className="cpage__caveat">
            以下这些，{meta.zh}目前没有可用的公开数据。
            <b>这不代表没有发生</b>——它代表没有人做过、或者没有公开过一次可比的调查。
            统计能力最弱的地方往往正是问题最严重的地方，所以这份缺口清单本身就是内容。
          </p>
          {missing.map(({ g, items }) => (
            <div key={g.key} className="cpage__missgroup">
              <p className="cpage__misshead">{g.zh}</p>
              <ul className="cpage__miss">
                {items.map((i) => <li key={i.key} title={i.definition}>{i.zh}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {law && (
        <section className="cpage__sec" aria-labelledby="c-law">
          <h2 className="cpage__h2" id="c-law">法律状态</h2>
          <ul className="cpage__laws">
            <li><span>婚内强奸是否入罪</span><b>{LAW_ZH[law.maritalRape]}</b></li>
            <li><span>强奸罪是否以缺乏同意为核心</span><b>{LAW_ZH[law.consentBased]}</b></li>
            <li><span>是否要求暴力或反抗的证据</span><b>{LAW_ZH[law.requiresForceEvidence]}</b></li>
          </ul>
          {law.note && <p className="cpage__caveat">{law.note}</p>}
          <p className="cpage__lawsrc">
            {law.year} · <a href={law.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{law.sourceName}</a>
          </p>
        </section>
      )}
    </div>
  )
}
