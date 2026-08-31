/**
 * 自己写一条。
 *
 * 「找新闻」搜回来的条目占多数，但站长总有想自己写的时候——一条搜不到的、
 * 一条需要他自己组织语言的。以前控制端只能编辑搜来的东西，写不了新的，
 * 这是个真正的缺口。
 *
 * 两条准则决定了下面的默认值：
 *
 * 1. **新写的一条先不给读者看。** `status: 'hidden'`。一个只有「（未命名）」
 *    的空壳出现在首页上，比没有这条更糟。写好了按「重新上线」，是他的决定。
 * 2. **不冒充搜集结果。** `origin: 'editor'`、`demo: false`，界面上标「你写的」。
 *    也不塞任何占位链接——`isPlaceholderUrl` 会挡住假网址，这里索性一条都不给，
 *    让他自己填真的。
 */
import type { NewsItem, StudyItem } from './types'
import { uid } from './util'

/** slug 要能进网址，又要在没有标题时也唯一。 */
function draftSlug(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`
}

export function blankNews(): NewsItem {
  const now = new Date().toISOString()
  return {
    id: uid('news'),
    slug: draftSlug('draft'),
    headline: '（未命名的新闻，点开写标题）',
    summary: '',
    bullets: [],
    regions: [],
    topics: [],
    publishedAt: now,
    updatedAt: now,
    status: 'hidden',
    origin: 'editor',
    links: [],
    demo: false,
  }
}

export function blankStudy(): StudyItem {
  const now = new Date().toISOString()
  return {
    id: uid('study'),
    slug: draftSlug('draft-study'),
    title: '（未命名的研究，点开写标题）',
    publisher: '',
    kind: 'ngo-report',
    date: now.slice(0, 10),
    regions: [],
    topics: [],
    summary: '',
    limitation: '',
    figures: [],
    links: [],
    status: 'hidden',
    origin: 'editor',
    demo: false,
  }
}
