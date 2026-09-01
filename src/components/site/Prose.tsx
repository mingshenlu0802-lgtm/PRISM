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
 * 行内记号：只认 `**加粗**`。
 *
 * 加粗要认，是因为**提示词自己就用 `**` 写强调**——模型会照着学，
 * 于是正文里冒出一串星号。与其在输出上做清洗（那会连同它真正想强调的意思
 * 一起删掉），不如把这个记号认下来：新闻里偶尔加粗一个关键数字或结论，
 * 本来就是合理的排版。
 *
 * **角标已经取消。** 这里一度把 [1] [2] 渲染成可以跳到来源的小按钮，
 * 站长看过之后说不要 reference number——读完几篇来源，融成一篇稿子就好，
 * 出处写进句子里（「据《卫报》报道」），来源清单仍然列在文末。
 * 学术论文的引注放在新闻里，读起来是隔的。
 *
 * 万一模型还是写了 [1]，就让它原样显示——那是它写的正文的一部分，
 * 悄悄删掉一段文字比留着一个方括号更糟。
 */
const INLINE = /\*\*([^*]+)\*\*/g

function inline(text: string, keyBase: string): (string | JSX.Element)[] {
  const out: (string | JSX.Element)[] = []
  let last = 0
  let m: RegExpExecArray | null
  INLINE.lastIndex = 0
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(<strong key={`${keyBase}-${m.index}`}>{m[1]}</strong>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Prose({ text }: { text: string }): JSX.Element {
  return (
    <>
      {paragraphs(text).map((p, i) => {
        // 「## 小标题」独占一行。模型偶尔会写成「**小标题**」独占一行，
        // 那也是同一个意思——一行文字、没有句号、明显是个节标题。
        const heading = /^#{2,3}\s+(.+?)\s*$/.exec(p.trim())
          ?? /^\*\*([^*]{2,24})\*\*$/.exec(p.trim())
        if (heading) return <h3 key={i} className="prose__h">{heading[1]}</h3>
        return <p key={i}>{inline(p, String(i))}</p>
      })}
    </>
  )
}
