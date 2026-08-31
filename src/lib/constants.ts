import type { AccentKey, Appearance, StudyKind, ThemeKey, Topic, TopicKey } from './types'

/* ------------------------------------------------------------------ *
 * 议题 — 一条新闻可以同时属于多个
 * ------------------------------------------------------------------ */

export const TOPICS: Topic[] = [
  { key: 'rights', zh: '女性主义与 LGBTQIA+ 权利', short: '权利', en: 'Rights', hue: 'var(--t-rights)', blurb: '法律地位、承认、结社自由与公民空间。' },
  { key: 'violence', zh: '性暴力、家暴与性骚扰', short: '暴力', en: 'Violence', hue: 'var(--t-violence)', blurb: '以创伤知情、受害者为中心的方式呈现。' },
  { key: 'repro', zh: '生育权与身体自主权', short: '生育权', en: 'Reproductive rights', hue: 'var(--t-repro)', blurb: '避孕、终止妊娠、孕产照护与强制绝育。' },
  { key: 'trans', zh: '跨性别权利与医疗', short: '跨性别', en: 'Trans rights', hue: 'var(--t-trans)', blurb: '法律性别承认、医疗可及性与相关争论。' },
  { key: 'hate', zh: '仇恨犯罪与网络暴力', short: '仇恨与网暴', en: 'Hate & abuse', hue: 'var(--t-hate)', blurb: '线下袭击、协同骚扰与平台治理。' },
  { key: 'equality', zh: '法律、政治、教育、医疗与职场平等', short: '平等', en: 'Equality', hue: 'var(--t-equality)', blurb: '薪酬、代表性、照护劳动与制度歧视。' },
  { key: 'displacement', zh: '战争、移民与交叉边缘群体', short: '流离与移民', en: 'Displacement', hue: 'var(--t-displacement)', blurb: '冲突性暴力、庇护程序与无国籍状态。' },
  { key: 'movement', zh: '运动内部的重要争议', short: '运动内部', en: 'Movement debates', hue: 'var(--t-movement)', blurb: '策略、包容、资金与代表性的公开分歧。' },
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

export const DEFAULT_COPY = {
  title: 'PRISM 棱镜',
  tagline: '全球女性主义与 LGBTQIA+ 新闻与研究',
  intro: '每天搜集各地与女性主义、LGBTQIA+ 权利相关的新闻与公开研究，写成一段简短总结，并附上报道这条新闻的媒体链接。你可以顺着链接自己读原文。',
  aboutLead: 'PRISM 棱镜是一个资料搜集平台，不是评论媒体。',
  aboutBody: '我们做三件事：把散落在各地、各语种的相关新闻找出来；用一小段话说明发生了什么；把报道它的媒体链接列在下面。我们不写长评论，也不替你下判断——链接就在那里，你可以自己去读。',
  footerNote: '内容由自动搜集生成，由站长复核与管理。',
}
