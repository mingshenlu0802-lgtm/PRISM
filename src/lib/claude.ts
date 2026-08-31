/**
 * 控制端里的 Claude。
 *
 * 站长用一句话说要改什么，Claude 读得到网站当前的样子，然后通过下面这几个
 * 工具真的动手改——内容、外观、网站上写的字。
 *
 * 有一件事它做不到，而且没法绕过：**改代码**。
 * 这是一个纯静态网站，页面是提前构建好再传上去的。要加一个新板块、改版面结构、
 * 加一个新功能，都得改源码、重新构建、重新部署——浏览器里做不了这三件事的任何一件。
 * 所以遇到这类要求，Claude 会写一份说清楚的需求交给站长，由站长转给 Claude Code，
 * 推送之后 GitHub Actions 会自动重新发布。假装能改代码是最糟的选择。
 *
 * API key 存在这台电脑的浏览器里，跟 GitHub token 一样。这意味着能打开你浏览器
 * 的人就能拿到它——所以别在公用电脑上填，而且 key 随时可以在 Anthropic 后台吊销。
 */
import Anthropic from '@anthropic-ai/sdk'
import type { Appearance, NewsItem, PrismState, SiteCopy, StudyItem } from './types'
import { REGIONS } from './regions'
import { TOPICS } from './constants'

/** 只用最好的那个模型——站长问的东西不便宜，但答错的代价更贵。 */
const MODEL = 'claude-opus-5'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  /** 这一轮实际改了什么，一句一条。 */
  done?: string[]
  /** 需要站长转给 Claude Code 的代码改动需求。 */
  handoff?: string
}

/** Claude 提议的一次改动，由界面负责真的写进去。 */
export type Proposal =
  | { kind: 'appearance'; patch: Partial<Appearance>; say: string }
  | { kind: 'copy'; patch: Partial<SiteCopy>; say: string }
  | { kind: 'news-edit'; id: string; patch: Partial<NewsItem>; say: string }
  | { kind: 'news-feature'; id: string; say: string }
  | { kind: 'news-hide'; id: string; say: string }
  | { kind: 'news-restore'; id: string; say: string }
  | { kind: 'handoff'; text: string; say: string }

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */

const REGION_KEYS = REGIONS.map((r) => r.key)
const TOPIC_KEYS = TOPICS.map((t) => t.key)

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'set_appearance',
    description: '改网站外观。只填要改的那几项，其余留空表示不动。',
    input_schema: {
      type: 'object',
      properties: {
        theme: { type: 'string', enum: ['warm', 'paper', 'ink', 'contrast'], description: 'warm 暖纸、paper 白纸、ink 深色、contrast 高对比' },
        accent: { type: 'string', enum: ['coral', 'indigo', 'teal', 'plum', 'amber'] },
        fontScale: { type: 'number', enum: [0.9, 1, 1.15, 1.3, 1.45], description: '字号倍数' },
        bodyFont: { type: 'string', enum: ['sans', 'serif'], description: 'sans 黑体、serif 宋体' },
        roomy: { type: 'boolean', description: '是否用宽行距' },
        say: { type: 'string', description: '用一句中文告诉站长你改了什么' },
      },
      required: ['say'],
    },
  },
  {
    name: 'set_copy',
    description: '改网站上写的字：站名、副标题、首页介绍、关于页、页脚。只填要改的。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        tagline: { type: 'string' },
        intro: { type: 'string' },
        aboutLead: { type: 'string' },
        aboutBody: { type: 'string' },
        footerNote: { type: 'string' },
        say: { type: 'string', description: '用一句中文告诉站长你改了什么' },
      },
      required: ['say'],
    },
  },
  {
    name: 'edit_news',
    description:
      '改一条新闻。总结可以写长，几百上千字都行，空一行分段。只填要改的字段。'
      + '绝不要编造事实或链接——只能改写、扩写、精简站长已有的内容。',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '新闻 id，从上下文里的清单取' },
        headline: { type: 'string' },
        summary: { type: 'string', description: '空一行分段' },
        bullets: { type: 'array', items: { type: 'string' } },
        editorNote: { type: 'string', description: '会以「站长补充」显示' },
        regions: { type: 'array', items: { type: 'string', enum: REGION_KEYS } },
        topics: { type: 'array', items: { type: 'string', enum: TOPIC_KEYS } },
        say: { type: 'string', description: '用一句中文告诉站长你改了什么' },
      },
      required: ['id', 'say'],
    },
  },
  {
    name: 'set_headline',
    description: '把某一条设为首页头条。头条一次只有一条，旧的会自动让位。',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        say: { type: 'string' },
      },
      required: ['id', 'say'],
    },
  },
  {
    name: 'hide_news',
    description: '把一条新闻下架，公众站看不到，但内容还在，随时能恢复。永久删除请让站长自己在「内容」里做。',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        say: { type: 'string' },
      },
      required: ['id', 'say'],
    },
  },
  {
    name: 'restore_news',
    description: '把下架的新闻重新上线。',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        say: { type: 'string' },
      },
      required: ['id', 'say'],
    },
  },
  {
    name: 'needs_code_change',
    description:
      '当站长要的东西必须改源码才能做到时用这个：新板块、新页面、版面结构、新功能、'
      + '改配色方案本身、改数据结构等等。写一份能直接交给 Claude Code 的需求，'
      + '说清楚要什么、为什么、以及做完之后怎么算成功。不要假装你已经改了。',
    input_schema: {
      type: 'object',
      properties: {
        request: { type: 'string', description: '给 Claude Code 的完整需求，中文，可以分点' },
        say: { type: 'string', description: '用一句中文告诉站长为什么这件事要走这条路' },
      },
      required: ['request', 'say'],
    },
  },
]

/* ------------------------------------------------------------------ *
 * 上下文
 * ------------------------------------------------------------------ */

/** 给 Claude 看的网站快照。列表只给标题和 id，正文太长会把上下文塞满。 */
function snapshot(state: PrismState): string {
  const brief = (n: NewsItem) =>
    `- id=${n.id}｜${n.status === 'hidden' ? '[已下架] ' : ''}${n.featured ? '[头条] ' : ''}`
    + `${n.headline}｜地区 ${n.regions.join(',')}｜议题 ${n.topics.join(',')}`
    + `｜总结 ${[...n.summary].length} 字｜${n.links.length} 条链接`

  const study = (s: StudyItem) => `- id=${s.id}｜${s.status === 'hidden' ? '[已下架] ' : ''}${s.title}`

  const a = state.appearance
  return [
    `今天是 ${state.today}。`,
    '',
    '# 当前外观',
    `主题 ${a.theme}｜强调色 ${a.accent}｜字号 ${a.fontScale}｜正文 ${a.bodyFont}｜宽行距 ${a.roomy}`,
    '',
    '# 网站上写的字',
    `站名：${state.copy.title}`,
    `副标题：${state.copy.tagline}`,
    `首页介绍：${state.copy.intro}`,
    `页脚：${state.copy.footerNote}`,
    '',
    `# 新闻（${state.news.length} 条）`,
    ...state.news.map(brief),
    '',
    `# 研究与数据（${state.studies.length} 项）`,
    ...state.studies.map(study),
  ].join('\n')
}

const SYSTEM = `你是「PRISM 棱镜」这个网站的编辑助手，直接嵌在站长的控制端里。

站长没有技术背景。用大白话回答，不要用行话，不要长篇大论。

你能做的事，通过工具真的会写进网站：改外观、改网站上写的字、改新闻的标题总结要点标签、
设头条、下架或重新上线。做之前不用请示，做完用一句话说清楚改了什么——站长随时可以撤销。

三条硬规矩：

1. 绝不编造事实、数字、机构名或链接。改写、扩写、精简站长已有的内容可以；
   往里加你自己想出来的"事实"不行。需要新信息就说你没有，让站长自己补。
2. 永久删除不归你管。最多下架，那是可恢复的。站长要删就让他自己去「内容」里删。
3. 你改不了代码。这是一个纯静态网站，页面提前构建好再传上去；加新板块、改版面结构、
   加新功能都得改源码、重新构建、重新部署，浏览器里一件都做不了。
   碰到这类要求，用 needs_code_change 写一份清楚的需求交给站长转给 Claude Code。
   不要假装你改了。

新闻总结可以写长，几百上千字都行，空一行分段。`

/* ------------------------------------------------------------------ *
 * 调用
 * ------------------------------------------------------------------ */

export interface AskResult {
  text: string
  proposals: Proposal[]
  error?: string
}

function client(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    // 浏览器直连。key 存在站长自己的浏览器里，这一点在界面上写明了。
    dangerouslyAllowBrowser: true,
  })
}

/** 把一次工具调用翻译成界面能执行的改动。 */
function toProposal(name: string, input: Record<string, unknown>): Proposal | null {
  const say = typeof input.say === 'string' ? input.say : '（没说改了什么）'
  const id = typeof input.id === 'string' ? input.id : ''

  switch (name) {
    case 'set_appearance': {
      const patch: Partial<Appearance> = {}
      if (typeof input.theme === 'string') patch.theme = input.theme as Appearance['theme']
      if (typeof input.accent === 'string') patch.accent = input.accent as Appearance['accent']
      if (typeof input.fontScale === 'number') patch.fontScale = input.fontScale
      if (input.bodyFont === 'sans' || input.bodyFont === 'serif') patch.bodyFont = input.bodyFont
      if (typeof input.roomy === 'boolean') patch.roomy = input.roomy
      return Object.keys(patch).length ? { kind: 'appearance', patch, say } : null
    }
    case 'set_copy': {
      const patch: Partial<SiteCopy> = {}
      for (const k of ['title', 'tagline', 'intro', 'aboutLead', 'aboutBody', 'footerNote'] as const) {
        if (typeof input[k] === 'string') patch[k] = input[k] as string
      }
      return Object.keys(patch).length ? { kind: 'copy', patch, say } : null
    }
    case 'edit_news': {
      if (!id) return null
      const patch: Partial<NewsItem> = {}
      if (typeof input.headline === 'string') patch.headline = input.headline
      if (typeof input.summary === 'string') patch.summary = input.summary
      if (Array.isArray(input.bullets)) patch.bullets = input.bullets.filter((b): b is string => typeof b === 'string')
      if (typeof input.editorNote === 'string') patch.editorNote = input.editorNote
      if (Array.isArray(input.regions)) {
        const rs = input.regions.filter((r): r is string => typeof r === 'string' && REGION_KEYS.includes(r as never))
        if (rs.length) patch.regions = rs as NewsItem['regions']
      }
      if (Array.isArray(input.topics)) {
        const ts = input.topics.filter((t): t is string => typeof t === 'string' && TOPIC_KEYS.includes(t as never))
        if (ts.length) patch.topics = ts as NewsItem['topics']
      }
      return Object.keys(patch).length ? { kind: 'news-edit', id, patch, say } : null
    }
    case 'set_headline': return id ? { kind: 'news-feature', id, say } : null
    case 'hide_news': return id ? { kind: 'news-hide', id, say } : null
    case 'restore_news': return id ? { kind: 'news-restore', id, say } : null
    case 'needs_code_change': {
      const text = typeof input.request === 'string' ? input.request : ''
      return text ? { kind: 'handoff', text, say } : null
    }
    default: return null
  }
}

/**
 * 问一次。
 *
 * 只走一轮：Claude 说话、顺便调用工具，界面把工具调用应用到网站上。不做多轮
 * 循环——工具都是「改这个网站」，没有需要读回结果再继续推理的那种。
 */
export async function ask(
  apiKey: string,
  state: PrismState,
  history: ChatMessage[],
  question: string,
  onText: (chunk: string) => void,
): Promise<AskResult> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: 'user' as const, content: `${snapshot(state)}\n\n---\n\n${question}` },
  ]

  try {
    const stream = client(apiKey).messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    })

    stream.on('text', onText)
    const message = await stream.finalMessage()

    let text = ''
    const proposals: Proposal[] = []
    for (const block of message.content) {
      if (block.type === 'text') text += block.text
      if (block.type === 'tool_use') {
        const p = toProposal(block.name, block.input as Record<string, unknown>)
        if (p) proposals.push(p)
      }
    }
    return { text, proposals }
  } catch (e) {
    return { text: '', proposals: [], error: friendlyError(e) }
  }
}

/** 报错要说人话，而且要说下一步怎么办。 */
function friendlyError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'API key 不对或已失效，去 Anthropic 后台重新生成一个。'
  if (e instanceof Anthropic.PermissionDeniedError) return '这个 key 没有权限，检查一下它属于哪个组织。'
  if (e instanceof Anthropic.RateLimitError) return '请求太频繁了，等一分钟再试。'
  if (e instanceof Anthropic.BadRequestError) return `请求有问题：${e.message}`
  if (e instanceof Anthropic.APIConnectionError) return '连不上 Anthropic，检查一下网络。'
  if (e instanceof Anthropic.APIError) return `出错了（${e.status}）：${e.message}`
  return e instanceof Error ? `出错了：${e.message}` : '出错了。'
}

/** key 长得对不对——挡住把别的东西粘错进来的情况，不做真的校验。 */
export function looksLikeKey(key: string): boolean {
  return /^sk-ant-/.test(key.trim())
}
