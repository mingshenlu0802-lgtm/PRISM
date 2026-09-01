/**
 * feed 解析与归类——纯函数，不碰网络也不碰数据库，所以能被测。
 *
 * 单独放一个文件是有原因的：collect-feeds.mjs 一被 import 就会开始抓取和写库，
 * 没法拿来做单元测试。而这里正是最容易静默出错的地方——解析错了不会报错，
 * 只会安静地产出一堆空标题和坏链接。
 */
import { TOPIC_WORDS, REGION_WORDS } from './feeds.mjs'

/* ------------------------------------------------------------------ *
 * 解析
 *
 * RSS 和 Atom 都够简单，不值得为它引一个依赖进来——这个站点的供应链越小越好。
 * ------------------------------------------------------------------ */

export const strip = (s) => String(s ?? '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/\s+/g, ' ')
  .trim()

const tag = (block, name) => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(block)
  return m ? strip(m[1]) : ''
}

/** Atom 的链接在属性里，RSS 的在标签内容里。 */
function linkOf(block) {
  const rss = tag(block, 'link')
  if (rss && /^https?:\/\//.test(rss)) return rss
  const alt = /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i.exec(block)
    ?? /<link[^>]*href=["']([^"']+)["']/i.exec(block)
  return alt ? strip(alt[1]) : ''
}

export function parseFeed(xml) {
  const blocks = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) ?? []
  return blocks.map((b) => ({
    title: tag(b, 'title'),
    link: linkOf(b),
    summary: tag(b, 'description') || tag(b, 'summary') || tag(b, 'content'),
    date: tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'),
  })).filter((e) => e.title && e.link)
}

/* ------------------------------------------------------------------ *
 * 判断
 * ------------------------------------------------------------------ */

/**
 * 匹配一个词。
 *
 * 中文和英文必须分开处理：中文没有词边界，「跨性别」就是要按子串找；
 * 英文按子串找会闯祸——第一次真实抓取里，`mexico` 撞进了「New Mexico」，
 * 把美国新墨西哥州一所中学的性侵案归到了拉丁美洲。
 */
const CJK = /[\u4e00-\u9fff]/
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function matches(h, word) {
  const w = word.toLowerCase()
  if (CJK.test(w)) return h.includes(w)
  return new RegExp(`(^|[^a-z0-9])${esc(w)}([^a-z0-9]|$)`).test(h)
}

export const hay = (e) => `${e.title} ${e.summary}`
  .toLowerCase()
  // 「New Mexico」是美国的州，不是墨西哥。词边界挡不住它——空格两边都成立。
  .replace(/new mexico/g, 'united states')

export function topicsOf(entry) {
  const h = hay(entry)
  return Object.entries(TOPIC_WORDS)
    .filter(([, words]) => words.some((w) => matches(h, w)))
    .map(([k]) => k)
}

export function regionsOf(entry, feed) {
  const h = hay(entry)
  const hit = Object.entries(REGION_WORDS)
    .filter(([, words]) => words.some((w) => matches(h, w)))
    .map(([k]) => k)
  // 认出来的优先；认不出来就用这个源本来覆盖的地区。
  return hit.length ? hit.slice(0, 3) : feed.regions
}

export const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-')
  .replace(/^-+|-+$/g, '').slice(0, 60)

/** 摘要留给站长改，但先给一段能读的——原样来自媒体，不加工。 */
export function summaryOf(entry) {
  const s = entry.summary || ''
  if (s.length <= 400) return s
  const cut = s.slice(0, 400)
  const stop = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('. '), cut.lastIndexOf('！'))
  return (stop > 200 ? cut.slice(0, stop + 1) : cut) + '…'
}

