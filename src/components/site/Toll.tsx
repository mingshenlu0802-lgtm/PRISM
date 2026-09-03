import { FIGURES, FIGURES_NOTE } from '../../lib/figures'
import './Toll.css'

/**
 * 首页顶上的那块数据。
 *
 * 站长要「一个醒目的图片，上面写醒目的女性受侵害数据」。这里做成排版，
 * 不做成图片——理由写在 lib/figures.ts 的开头：图上的字读屏读不出来、
 * 手机上会糊、不能复制；而且在一个报道性暴力的站上，拿真人照片当装饰
 * 正是它反对的做法。
 *
 * 每个数字都带机构和年份。这一页下面每一条研究都在讲「没有局限的数字
 * 只是一个说法」，顶上这块要是自己不守这条规矩，整页都站不住。
 */
export function Toll(): JSX.Element {
  return (
    /*
     * 没有可见的标题。
     *
     * 原来这里挂着一句「这是我们每天报道的事情的规模」。站长要求去掉——
     * 一来这个站不是媒体，不该用「我们」自述；二来这几个数字自己就说清了
     * 是什么，上面再压一句解说词，反而把它们变成了配图。
     *
     * 但一个区域不能没有名字：读屏软件靠它知道自己进了哪一块。所以名字
     * 移到 aria-label 上——听得到，看不见，也不再有那个「我们」。
     */
    <section className="toll" aria-label="全球数据">
      <ul className="toll__list">
        {FIGURES.map((f) => (
          <li key={f.label} className="toll__item">
            <p className="toll__value">{f.value}</p>
            <p className="toll__label">{f.label}</p>
            <p className="toll__src">{f.source}</p>
          </li>
        ))}
      </ul>

      <p className="toll__note">{FIGURES_NOTE}</p>
    </section>
  )
}
