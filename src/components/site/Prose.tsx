import type { MediaLink } from '../../lib/types'
import { paragraphs } from '../../lib/util'
import './Prose.css'

/**
 * 一篇稿子的正文。
 *
 * 总结不再是「一段话」了——站长要求按新闻的写法写到一两千字，用小标题分节，
 * 并且在句子后面标出处。所以正文里会出现两样纯文本装不下的东西：
 *
 *   ## 最早的投诉        ← 小标题，独占一行
 *   ……检方指称行为发生于 2019 年至 2022 年之间。[1]   ← 来源角标
 *
 * 这里把它们变成真正的结构：小标题是 h3（读者可以用目录跳，屏幕阅读器可以
 * 按标题导航），角标是指向下方来源列表的锚点链接。
 *
 * 刻意**不引入 Markdown 库**：要认的只有这两种记号，一个几十行的解析器
 * 比一个几十 KB 的依赖更容易看懂，也不会把模型偶尔写出的星号当成加粗。
 */

/**
 * 行内记号：`[1]` 角标和 `**加粗**`。
 *
 * 加粗要认，是因为**提示词自己就用 `**` 写强调**——模型会照着学，
 * 于是正文里冒出一串星号。与其在输出上做清洗（那会连同它真正想强调的意思
 * 一起删掉），不如把这个记号认下来：新闻里偶尔加粗一个关键数字或结论，
 * 本来就是合理的排版。
 *
 * 只认这两种。不做完整 Markdown：没认的记号原样显示，比猜错了好。
 */
const INLINE = /\*\*([^*]+)\*\*|\[(\d{1,2})\]/g

function inline(text: string, links: MediaLink[], keyBase: string): (string | JSX.Element)[] {
  const out: (string | JSX.Element)[] = []
  let last = 0
  let m: RegExpExecArray | null
  INLINE.lastIndex = 0
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const key = `${keyBase}-${m.index}`

    if (m[1] !== undefined) {
      out.push(<strong key={key}>{m[1]}</strong>)
    } else {
      const n = Number(m[2])
      const link = links[n - 1]
      // 没有对应来源的角标不做成链接——那会给出一个点了没反应的东西。
      // 但也不删掉：模型标了它，说明那句话有出处，只是编号对不上，
      // 读者有权知道这里本该有一个来源。
      /*
       * 角标是**按钮**，不是 <a href="#src-1">。
       *
       * 这个站用的是 HashRouter：地址栏里的 `#/news/xxx` 就是路由。
       * 一个 href="#src-1" 会把 hash 整个换掉，路由匹配不到 `src-1`，
       * 兜底规则把人送回首页——读者点一下出处，文章就没了。
       * 实测过：hash 从 `#/news/…` 变成 `#/`。
       *
       * 所以自己滚过去，不碰地址栏。
       */
      out.push(link
        ? (
          <button
            key={key}
            type="button"
            className="prose__cite"
            aria-label={`跳到来源 ${n}：${link.outlet}`}
            onClick={() => {
              const el = document.getElementById(`src-${n}`)
              if (!el) return
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              // 滚过去还不够——要让读者一眼看到是哪一条。
              el.classList.add('lnk__item--flash')
              window.setTimeout(() => el.classList.remove('lnk__item--flash'), 1600)
            }}
          >
            {n}
          </button>
        )
        : <sup key={key} className="prose__cite prose__cite--dead">{n}</sup>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Prose({ text, links = [] }: { text: string; links?: MediaLink[] }): JSX.Element {
  return (
    <>
      {paragraphs(text).map((p, i) => {
        // 「## 小标题」独占一行。模型偶尔会写成「**小标题**」独占一行，
        // 那也是同一个意思——一行文字、没有句号、明显是个节标题。
        const heading = /^#{2,3}\s+(.+?)\s*$/.exec(p.trim())
          ?? /^\*\*([^*]{2,24})\*\*$/.exec(p.trim())
        if (heading) return <h3 key={i} className="prose__h">{heading[1]}</h3>
        return <p key={i}>{inline(p, links, String(i))}</p>
      })}
    </>
  )
}
