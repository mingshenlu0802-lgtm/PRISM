import type { AccentKey, Appearance, StudyKind, ThemeKey, Topic, TopicKey } from './types'

/* ------------------------------------------------------------------ *
 * 议题 — 一条新闻可以同时属于多个
 * ------------------------------------------------------------------ */

/*
 * 议题的措辞。
 *
 * 这几行字出现在筛选栏、标签和「关于」页上——读者是靠它们判断这个站
 * 关心什么的。原来的写法是分类学：「法律地位、承认、结社自由与公民空间」
 * 准确，但那是给编目员看的，不是给读者看的。
 *
 * 现在每一条说的是**这一栏里会有什么样的故事**，用和正文一样的语气：
 * 具体的名词、真实的处境，不用抽象概念堆砌。
 *
 * short 是筛选栏和卡片上那个短标签。它也重写过一次——「运动内部」
 * 「流离与移民」「仇恨与网暴」是把长名硬砍出来的，读着像归档代码。
 * 短名要能单独成立：一个人看到它，应该知道点进去会看到什么。
 */
export const TOPICS: Topic[] = [
  { key: 'violence', zh: '性暴力与性犯罪', short: '性暴力', en: 'Sexual violence', hue: 'var(--t-violence)', blurb: '性侵、家暴、性骚扰——以及案子从报案到判决，在哪一步被拦下来。' },
  { key: 'children', zh: '儿童与未成年人', short: '儿童', en: 'Children', hue: 'var(--t-children)', blurb: '针对儿童的侵害、童婚、女童失学，以及本该保护他们的人没有出手的时候。' },
  { key: 'rights', zh: '女性主义与 LGBTQIA+ 权利', short: '权利', en: 'Rights', hue: 'var(--t-rights)', blurb: '在法律上算不算数：身份承认、结社与表达的空间、以及它们正在收紧还是松动。' },
  { key: 'repro', zh: '生育权与身体自主', short: '生育权', en: 'Reproductive rights', hue: 'var(--t-repro)', blurb: '谁来决定生不生、什么时候生：避孕、终止妊娠、孕产照护，以及强制绝育。' },
  { key: 'trans', zh: '跨性别权利与医疗', short: '跨性别', en: 'Trans rights', hue: 'var(--t-trans)', blurb: '改一个性别标记要过几道关，医疗到不到得了本人手上，以及围绕这些的争论。' },
  { key: 'hate', zh: '仇恨犯罪与网络暴力', short: '仇恨犯罪', en: 'Hate & abuse', hue: 'var(--t-hate)', blurb: '街上的袭击，网上的围猎，以及平台在其中做了什么、放任了什么。' },
  { key: 'equality', zh: '教育、职场与制度平等', short: '平等', en: 'Equality', hue: 'var(--t-equality)', blurb: '同工不同酬、升不上去、照护劳动不算数——歧视写进规则里的那一面。' },
  { key: 'displacement', zh: '战争、移民与边缘处境', short: '战争与移民', en: 'Displacement', hue: 'var(--t-displacement)', blurb: '战时性暴力、庇护程序、无国籍身份：制度垮掉时最先掉下去的那些人。' },
  { key: 'movement', zh: '运动内部的争议', short: '运动争议', en: 'Movement debates', hue: 'var(--t-movement)', blurb: '策略、包容、资金与谁能代表谁——运动内部还没有谈拢的事。' },
]

export const TOPIC_MAP: Record<TopicKey, Topic> = Object.fromEntries(
  TOPICS.map((t) => [t.key, t]),
) as Record<TopicKey, Topic>

export function topicLabel(key: TopicKey): string {
  return TOPIC_MAP[key]?.short ?? key
}

/* ------------------------------------------------------------------ *
 * 研究与数据类型
 * ------------------------------------------------------------------ */

export const STUDY_KIND: Record<StudyKind, { zh: string; note: string; tone: 'go' | 'info' | 'warn' | 'neutral' }> = {
  'peer-reviewed': { zh: '同行评审', tone: 'go', note: '经过外部评审，方法与数据通常可复核。' },
  'systematic-review': { zh: '系统综述', tone: 'go', note: '按预设标准检索并汇总既有研究。' },
  'official-statistics': { zh: '官方统计', tone: 'info', note: '统计机构发布，口径随表公布。' },
  dataset: { zh: '公开数据集', tone: 'info', note: '可直接下载的原始数据。' },
  'ngo-report': { zh: '民间报告', tone: 'neutral', note: '由利益相关方发布，数字可核对但选题服务于其立场。' },
  preprint: { zh: '预印本 · 未经同行评审', tone: 'warn', note: '尚未经过外部评审，结论可能在评审中改变。' },
}

/* ------------------------------------------------------------------ *
 * 外观 — 公众站与控制端共用
 * ------------------------------------------------------------------ */

export const THEMES: { key: ThemeKey; zh: string; note: string }[] = [
  { key: 'warm', zh: '暖白', note: '默认。米白底、深靛蓝字，长时间阅读不刺眼。' },
  { key: 'paper', zh: '纯白', note: '更亮更干净，适合白天与投影。' },
  { key: 'ink', zh: '深色', note: '夜间阅读，低光环境下更舒服。' },
  { key: 'contrast', zh: '高对比', note: '最强对比度，为视力不便或强光环境准备。' },
]

export const ACCENTS: { key: AccentKey; zh: string; swatch: string }[] = [
  { key: 'coral', zh: '珊瑚红', swatch: '#D64F37' },
  { key: 'indigo', zh: '靛蓝', swatch: '#4A55A3' },
  { key: 'teal', zh: '青绿', swatch: '#2E7D6B' },
  { key: 'plum', zh: '梅紫', swatch: '#8C4F79' },
  { key: 'amber', zh: '琥珀', swatch: '#9A6B14' },
]

export const FONT_STEPS: { value: number; zh: string }[] = [
  { value: 0.9, zh: '小' },
  { value: 1, zh: '标准' },
  { value: 1.15, zh: '大' },
  { value: 1.3, zh: '更大' },
  { value: 1.45, zh: '特大' },
]

export const DEFAULT_APPEARANCE: Appearance = {
  theme: 'warm',
  accent: 'coral',
  fontScale: 1,
  bodyFont: 'sans',
  roomy: false,
}

/* ------------------------------------------------------------------ *
 * 检索引擎
 *
 * 搜集是重复性工作，可以用免费或自托管的开源模型。
 * 这里选的模型只管找链接和写总结——网站本身不再内置任何改写功能，
 * 站长要改网站是直接跟 Claude Code 说，那不经过这个选项，也不花这里的钱。
 * ------------------------------------------------------------------ */

export interface EngineOption {
  id: string
  name: string
  cost: string
  note: string
  kind: 'open-source' | 'hosted'
}

export const ENGINES: EngineOption[] = [
  { id: 'qwen-open', name: 'Qwen 系列（开源，可自托管）', kind: 'open-source', cost: '免费 · 自建算力', note: '多语种覆盖好，中文长总结写得最稳，适合中港台日韩。默认用它。' },
  { id: 'llama-open', name: 'Llama 系列（开源，可自托管）', kind: 'open-source', cost: '免费 · 自建算力', note: '权重公开，英文长总结好，适合欧美来源。' },
  { id: 'mistral-open', name: 'Mistral 系列（开源，可自托管）', kind: 'open-source', cost: '免费 · 自建算力', note: '体量小、吞吐高，量大时最省，总结偏简洁。' },
  { id: 'self-hosted', name: '自定义端点（本地或私有部署）', kind: 'open-source', cost: '免费 · 自建算力', note: '指向你自己的推理服务，请求不离开你控制的网络。' },
  { id: 'claude', name: 'Claude', kind: 'hosted', cost: '按调用计费', note: '质量最好，但每次搜集都按调用计费。找链接和写总结是重复劳动，开源模型就够，不必花这笔钱。' },
]

export const ENGINE_MAP: Record<string, EngineOption> = Object.fromEntries(
  ENGINES.map((e) => [e.id, e]),
)

/* ------------------------------------------------------------------ *
 * 演示提示
 * ------------------------------------------------------------------ */

export const DEMO_NOTICE =
  '本站目前载入的是演示数据：条目、媒体名称与链接均为虚构，用于展示界面。接入真实检索后会替换为真实来源。'

/*
 * 这几段文案描述的是**这个站现在在做什么**，所以它会随着站变。
 * 已经过时过两次了：一次是「一段简短总结」——那是每条两三句话的时候写的，
 * 现在每条是 1500–3000 字的报道；一次是「我们不写长评论」——
 * 现在每条都要写制度分析。改产品不改这里，读者看到的就是一份旧说明书。
 */
export const DEFAULT_COPY = {
  title: 'PRISM 棱镜',
  tagline: '全球女性主义与 LGBTQIA+ 新闻',
  intro: '每天两次，把各地、各语种与女性主义和 LGBTQIA+ 相关的新闻找出来，写成中文报道，并附上原始来源。',
  aboutLead: 'PRISM 棱镜每天两次，把散落在各语种里的性别相关新闻，写成中文报道。',
  aboutBody: '我们优先关注真实伤害、权力失衡、制度责任和司法过程——性犯罪案件，以及针对儿童与未成年人的侵害，排在最前面。每条都是完整的报道：交代人物和背景，讲清事情的经过和制度在哪一环失效，最后附上我们读过的媒体链接，你可以自己去核对。',
  footerNote: '内容由自动搜集与撰写，由站长复核与管理。',
}
