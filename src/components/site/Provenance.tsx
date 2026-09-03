import { CONFIDENCE_ZH, SCOPE_ZH, isStale } from '../../lib/atlas/query'
import type { DataPoint } from '../../lib/atlas/types'
import { Icon } from '../common'
import './Provenance.css'

/**
 * 一个数字的全部边界。
 *
 * 这个站的规矩：一个数字如果没有它的边界一起给出，就只是一个说法。
 * 地图是最容易让人只记住颜色的形式，所以这一块**不折叠**——
 * 点开某个国家，边界就跟着出来，不需要再点一次「查看方法」。
 */
export function Provenance({ p }: { p: DataPoint }): JSX.Element {
  const stale = isStale(p)
  return (
    <div className="prov">
      <ul className="prov__facts">
        <li><span>可信度</span><b>{CONFIDENCE_ZH[p.confidence]}</b></li>
        <li><span>样本范围</span><b>{SCOPE_ZH[p.scope]}</b></li>
        {p.ageRange && <li><span>年龄范围</span><b>{p.ageRange}</b></li>}
        {p.sampleSize !== undefined && <li><span>样本量</span><b>{p.sampleSize.toLocaleString('zh-CN')} 人</b></li>}
        {p.surveyYear !== undefined && (
          <li>
            <span>调查年份</span>
            <b>
              {p.surveyYear}
              {stale && <> <Icon name="clock" size={12} /> 数据较旧</>}
            </b>
          </li>
        )}
        <li><span>发布日期</span><b>{p.published}</b></li>
        {p.ci && <li><span>不确定区间</span><b>{p.ci[0]}–{p.ci[1]}%</b></li>}
      </ul>

      {p.definition && <p className="prov__def"><b>这条数据在数什么：</b>{p.definition}</p>}
      <p className="prov__def"><b>调查方法：</b>{p.method}</p>

      {p.derived && p.denominator && (
        /*
         * 换算出来的人数必须把公式摊开。
         *
         * 一个「比例 × 人口」算出来的人数，和一个从登记里数出来的人数，
         * 在页面上长得一模一样——而它们的可靠程度差着一个数量级。
         */
        <p className="prov__derived">
          <Icon name="alert" size={13} />
          根据调查比例与对应人口估算，并非实际登记人数。
          公式：{p.percent}% × {p.denominator.value.toLocaleString('zh-CN')}（{p.denominator.who}，
          {p.denominator.source}，{p.denominator.year}）
        </p>
      )}

      <p className="prov__limits"><b>这份数据说不了什么：</b>{p.limits}</p>

      <p className="prov__src">
        来源：<a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{p.sourceName}</a>
      </p>
    </div>
  )
}
