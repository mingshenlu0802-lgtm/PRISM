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
    <section className="toll" aria-labelledby="toll-h">
      <h2 className="toll__h" id="toll-h">这是我们每天报道的事情的规模</h2>

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
