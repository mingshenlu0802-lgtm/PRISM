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

/** 把一段文字里的 [1] [2] 变成上标链接。 */
function withCites(text: string, links: MediaLink[], keyBase: string): (string | JSX.Element)[] {
  const out: (string | JSX.Element)[] = []
  let last = 0
  const re = /\[(\d{1,2})\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1])
    // 没有对应来源的角标不做成链接——那会给出一个点了没反应的东西。
    // 但也不删掉：模型写了它，说明那句话有出处，只是编号对不上，读者有权看到。
    const link = links[n - 1]
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(link
      ? (
        <a key={`${keyBase}-${m.index}`} className="prose__cite" href={`#src-${n}`} aria-label={`来源 ${n}：${link.outlet}`}>
          {n}
        </a>
      )
      : <sup key={`${keyBase}-${m.index}`} className="prose__cite prose__cite--dead">{n}</sup>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Prose({ text, links = [] }: { text: string; links?: MediaLink[] }): JSX.Element {
  return (
    <>
      {paragraphs(text).map((p, i) => {
        const heading = /^#{2,3}\s+(.+)$/.exec(p.trim())
        if (heading) return <h3 key={i} className="prose__h">{heading[1]}</h3>
        return <p key={i}>{withCites(p, links, String(i))}</p>
      })}
    </>
  )
}
