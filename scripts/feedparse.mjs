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

const attr = (block, re) => { const m = re.exec(block); return m ? strip(m[1]) : '' }

/**
 * 媒体自己配的图。
 *
 * feed 里本来就带图——`media:content`、`media:thumbnail`、`enclosure`——之前
 * 只取了标题摘要链接，把图整个丢掉了，所以站上全是系统画的抽象封面。
 *
 * 只用媒体自己发出来的图，并且署上它的名字。**不去猜图里有什么**：
 * feed 给了说明就用它当替代文字，没给就只说明出处。给一张没看过的照片编一段
 * 描述，是在骗用读屏软件的人。
 */
export function imageOf(block, outlet) {
  const url = attr(block, /<media:content[^>]*\burl=["']([^"']+)["']/i)
    || attr(block, /<media:thumbnail[^>]*\burl=["']([^"']+)["']/i)
    || attr(block, /<enclosure[^>]*\btype=["']image\/[^"']*["'][^>]*\burl=["']([^"']+)["']/i)
    || attr(block, /<enclosure[^>]*\burl=["']([^"']+\.(?:jpe?g|png|webp))["']/i)
  if (!url || !/^https?:\/\//.test(url)) return null

  const caption = tag(block, 'media:description') || tag(block, 'media:title')
  const credit = tag(block, 'media:credit') || outlet
  return {
    url,
    alt: caption || `${outlet} 为这条报道配发的图片`,
    credit,
  }
}

/**
 * 从报道页面自己的 HTML 里取社交预览图。
 *
 * 为什么要多这一步：feed 里的 `media:thumbnail` 常常是 150px 见方的列表缩略图，
 * 放到首页大卡片上就是一团糊。站长的原话是「你没有给我高质量的标图」。
 *
 * 而 `og:image` 是媒体自己为社交平台准备的那一张——按 1200×630 做的，
 * 是同一家媒体、同一篇报道、同一个编辑挑的图，只是尺寸对得上。
 * 所以有 og:image 就优先用它，没有才退回 feed 里那张。
 *
 * 仍然**不描述图片内容**：alt 只说这是谁为哪篇报道配的图。
 * 我没看过这张图，写「一群女性举着标语」就是编造。
 */
export function ogImage(html, outlet) {
  const meta = (prop) => {
    // property 和 content 的先后顺序在各家模板里都不一样，两种都认。
    const a = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i')
    const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i')
    return (html.match(a)?.[1] ?? html.match(b)?.[1] ?? '').trim()
  }
  const url = meta('og:image:secure_url') || meta('og:image') || meta('twitter:image') || meta('twitter:image:src')
  if (!url || !/^https?:\/\//.test(url)) return null

  // 1×1 计数像素、占位图、社交按钮图标——这些都不是配图。
  if (/\b(1x1|pixel|spacer|blank|placeholder|logo|favicon|avatar|sprite)\b/i.test(url)) return null

  const alt = meta('og:image:alt')
  return {
    url,
    alt: alt || `${outlet} 为这条报道配发的图片`,
    credit: outlet,
  }
}

export function parseFeed(xml, outlet = '来源媒体') {
  const blocks = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) ?? []
  return blocks.map((b) => ({
    title: tag(b, 'title'),
    link: linkOf(b),
    summary: tag(b, 'description') || tag(b, 'summary') || tag(b, 'content'),
    date: tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'),
    image: imageOf(b, outlet),
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


/* ------------------------------------------------------------------ *
 * 去重
 *
 * 站长的要求是「不要有任何重复」。按链接去重远远不够——同一件事被路透、
 * 卫报、19th 各报一次，就会变成三条几乎一样的新闻堆在首页上。
 *
 * 但这个网站的数据模型本来就允许一条新闻挂**多个媒体链接**，而且页面上会
 * 把来源列出来。所以正确的做法不是丢掉后来的两条，而是**把它们合并成一条、
 * 三个来源**——读者反而看到了更多可核对的出处。
 * ------------------------------------------------------------------ */

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'as', 'by', 'from', 'that', 'this', 'it', 'its',
  'after', 'over', 'into', 'says', 'said', 'new', 'more', 'how', 'why', 'what'])

/**
 * 简繁归一。
 *
 * 台港台媒体写「台灣」「跨性別」「權利」，内地和多数中文源写「台湾」「跨性别」
 * 「权利」。不归一的话，同一件事的两个标题**一个字都对不上**——这个站同时收
 * 中港台三地的来源，不处理等于中文去重根本不工作。
 *
 * 只收本站题材里高频的那些字，不做完整转换表。
 */
const T2S = { '灣': '湾', '臺': '台', '別': '别', '權': '权', '國': '国', '網': '网', '變': '变',
  '認': '认', '議': '议', '訴': '诉', '訟': '讼', '審': '审', '報': '报', '華': '华', '後': '后',
  '歲': '岁', '眾': '众', '關': '关', '擊': '击', '譴': '谴', '責': '责', '長': '长', '學': '学',
  '醫': '医', '療': '疗', '傳': '传', '統': '统', '應': '应', '記': '记', '證': '证', '檢': '检',
  '無': '无', '韓': '韩', '員': '员', '們': '们', '個': '个', '對': '对', '產': '产', '婦': '妇',
  '導': '导', '這': '这', '會': '会', '為': '为', '與': '与', '從': '从', '將': '将', '爭': '争' }

const simp = (t) => t.replace(/[\u4e00-\u9fff]/g, (c) => T2S[c] ?? c)

/** 很轻的英文词形归一：shows→show、banning→ban、struck 和 strikes 都收敛到 strik。 */
function stem(w) {
  return w
    .replace(/(ings?|ed|es|s)$/, '')
    .replace(/(.)\1$/, '$1')
}

/**
 * 把标题拆成比较用的词集。
 *
 * 英文按词并做轻度归一；中文没有空格，按**相邻两字**切——「性侵案」给出
 * 「性侵」「侵案」，这样换个说法但讲同一件事的两个标题仍然重叠得上。
 */
export function tokens(title) {
  const t = simp(String(title ?? '').toLowerCase())
  const out = new Set()
  for (const w of t.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)) {
    if (w.length >= 3 && !STOP.has(w) && !CJK.test(w)) out.add(stem(w))
  }
  const cjk = t.replace(/[^\u4e00-\u9fff]/g, '')
  for (let i = 0; i + 1 < cjk.length; i += 1) out.add(cjk.slice(i, i + 2))
  return out
}

/**
 * 两个标题讲的是同一件事吗。
 *
 * 用重叠系数而不是 Jaccard：一个长标题和一个短标题讲同一件事时，
 * Jaccard 会被长的那个稀释掉，重叠系数不会。
 */
export function sameStory(a, b, threshold = 0.42) {
  const A = a instanceof Set ? a : tokens(a)
  const B = b instanceof Set ? b : tokens(b)
  if (A.size === 0 || B.size === 0) return false
  let hit = 0
  for (const w of A) if (B.has(w)) hit += 1
  return hit / Math.min(A.size, B.size) >= threshold
}

/** 同一篇文章的网址会带各种跟踪参数，比较之前先洗掉。 */
export function normUrl(u) {
  try {
    const x = new URL(u)
    x.hash = ''
    for (const k of [...x.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref|source|CMP|cmp)/i.test(k)) x.searchParams.delete(k)
    }
    return `${x.origin}${x.pathname.replace(/\/$/, '')}${x.search}`
  } catch {
    return String(u ?? '')
  }
}

/* ------------------------------------------------------------------ *
 * 内容提示
 *
 * 站长要求把「等他审核」这一层去掉，全部自动上线——包括针对公众人物的性犯罪
 * 指控，那正是他指定的报道重心。这是他的网站，这个决定是他的。
 *
 * 剩下的这一件不挡发布，只是给读者一句话：这个站本来就给这类条目写内容提示
 * （演示数据里的原话是「本条涉及性骚扰案件的审理程序。总结不描述任何具体案情。」），
 * 而一个持续报道性暴力的站点，让读者在点开之前知道自己要读什么，是它本来的做法。
 */
const ACCUSATION = [
  'accused of', 'accuses', 'allegation', 'alleged', 'alleges', 'denies',
  'charged with', 'indicted', 'on trial', 'convicted', 'sentenced', 'acquitted',
  'lawsuit against', 'sues', 'guilty of', 'arrested',
  '被控', '被指控', '指控', '否认', '否認', '起诉', '起訴', '被捕', '判刑', '定罪', '无罪', '無罪',
]

/** 这条讲的是一桩具体案件吗。排序时用得上：司法进展优先。 */
export function isCase(entry) {
  const h = hay(entry)
  return ACCUSATION.some((w) => matches(h, w))
}

/*
 * 这里原本还有 noticeFor()：给性暴力类条目自动挂一句内容提示
 * （「本条涉及具体案件，摘要直接来自原报道……」）。
 *
 * 站长要求去掉，理由成立：这个站**每一条**都是性别暴力相关的报道，
 * 一个几乎条条都挂的提示等于没有提示——它只是在每张卡片顶上压了一条红带，
 * 把注意力从新闻本身挪开，还让站点看起来像在替自己免责。
 * 读者知道自己点开的是什么，标题就写着。
 */
