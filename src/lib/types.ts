/**
 * PRISM 棱镜 — 领域模型。
 *
 * The site publishes SHORT summaries plus the links to the outlets that
 * reported the story. It does not publish long essays, and it does not
 * publish verification conclusions of its own — the summary tells you what
 * happened, the links let you go read it yourself. A summary can run to a few
 * paragraphs when the story needs it; blank lines separate paragraphs.
 *
 * Everything shipped in this repository is demo data. Demo sources sit on the
 * reserved `.invalid` domain and can never resolve; real links render as real
 * clickable links.
 */

import type { RegionKey } from './regions'

export type ID = string
export type ISODate = string      // 'YYYY-MM-DD'
export type ISODateTime = string  // 'YYYY-MM-DDTHH:mm:ssZ'

/* ------------------------------------------------------------------ *
 * Topics — a story can carry several
 * ------------------------------------------------------------------ */

export type TopicKey =
  | 'rights'        // 女性主义与 LGBTQIA+ 权利
  | 'violence'      // 性暴力、家庭暴力与性骚扰
  | 'repro'         // 生育权与身体自主权
  | 'trans'         // 跨性别权利与医疗
  | 'hate'          // 仇恨犯罪与网络暴力
  | 'equality'      // 法律、政治、教育、医疗与职场平等
  | 'displacement'  // 战争、移民及交叉边缘群体
  | 'movement'      // 运动内部的重要争议

export interface Topic {
  key: TopicKey
  zh: string
  short: string
  en: string
  blurb: string
  hue: string
}

/* ------------------------------------------------------------------ *
 * Links
 * ------------------------------------------------------------------ */

/** One outlet's report on a story, or one document behind a study. */
export interface MediaLink {
  id: ID
  /** Outlet or publisher name, as it should be shown. */
  outlet: string
  /** The headline as that outlet ran it. */
  title: string
  url: string
  /** BCP-47-ish, e.g. 'zh-Hans', 'en', 'ja'. */
  lang: string
  date?: ISODate
  /** Marks the document the story rests on (a ruling, a bill, a dataset). */
  primary?: boolean
  /**
   * What kind of outlet this is, so a reader can weigh it.
   *
   * `official` is the primary document itself — a gazette, a court, a
   * ministry. `state` is a media outlet under state control. Anything
   * unmarked is treated as independent. The distinction matters most for
   * coverage of places where the press is not free: a state outlet is a
   * legitimate source for *what a government said*, and not an independent
   * source for *whether it is true*. The site labels both rather than
   * hiding them, so the reader can tell which they are reading.
   */
  outletKind?: 'official' | 'state'
  /** Editor's one-line note about this link. */
  note?: string
}

/** 一张配图，连同它的出处。 */
export interface NewsImage {
  url: string
  /** 给看不见图的人描述图里有什么。空着等于把他们排除在外。 */
  alt: string
  /** 摄影师／机构，照原样显示。 */
  credit: string
  /** 图的原始页面，方便读者自己去核对。 */
  creditUrl?: string
}

/* ------------------------------------------------------------------ *
 * News
 * ------------------------------------------------------------------ */

export type ItemStatus = 'live' | 'hidden'

/** Who put it on the site. */
export type ItemOrigin = 'auto' | 'editor'

export interface NewsItem {
  id: ID
  slug: string
  headline: string
  /** Two to four sentences. This is the whole article. */
  summary: string
  /** Optional key points; keep to one line each. */
  bullets: string[]
  regions: RegionKey[]
  topics: TopicKey[]
  publishedAt: ISODateTime
  updatedAt: ISODateTime
  status: ItemStatus
  origin: ItemOrigin
  /** The outlets that reported it. At least one. */
  links: MediaLink[]
  /** Anything the editor wants to add above the links. */
  editorNote?: string
  /** Set when the editor has touched the summary, so the desk stops overwriting it. */
  editedByHuman?: boolean
  /**
   * 配图。
   *
   * 只放**真实存在**的图，而且必须署名和给出出处——图是别人拍的，网站只是引用。
   * 没有图的条目不伪造：页面会画一张由这条新闻的地区色和议题色生成的抽象封面，
   * 它明显不是照片，不会被误当成现场。
   *
   * 涉及性暴力等题材的条目，内容提示永远排在图之前——读者要先有机会决定看不看。
   */
  image?: NewsImage

  /** Shown above the summary for material that needs a heads-up. */
  contentNotice?: string
  featured?: boolean
  demo: boolean
}

/* ------------------------------------------------------------------ *
 * Studies & open data
 * ------------------------------------------------------------------ */

export type StudyKind =
  | 'peer-reviewed'
  | 'preprint'
  | 'official-statistics'
  | 'dataset'
  | 'ngo-report'
  | 'systematic-review'

export interface StudyFigure {
  label: string
  value: string
  /** What the number does not say. Always shown next to it. */
  note: string
}

export interface StudyItem {
  id: ID
  slug: string
  title: string
  publisher: string
  kind: StudyKind
  date: ISODate
  regions: RegionKey[]
  topics: TopicKey[]
  /** Two to four sentences, same length discipline as the news. */
  summary: string
  /** What the design can and cannot support. */
  limitation: string
  figures: StudyFigure[]
  links: MediaLink[]
  /** Direct link to the data, when the data is open. */
  datasetUrl?: string
  status: ItemStatus
  origin: ItemOrigin
  editedByHuman?: boolean
  demo: boolean
}

/* ------------------------------------------------------------------ *
 * The collector
 * ------------------------------------------------------------------ */

export type CollectMode = 'news' | 'studies' | 'both'

export interface CollectConfig {
  regions: RegionKey[]
  topics: TopicKey[]
  mode: CollectMode
  /** Publish straight to the site, or hold for the editor. */
  autoPublish: boolean
  /** Retrieval engine id, from ENGINES. */
  engine: string
  /** How many items a single run may add. */
  perRun: number
  /** Skip anything whose headline closely matches something already live. */
  dedupe: boolean
  /**
   * Sourcing policy: prefer independent and overseas outlets for reporting.
   *
   * Where the press is state-controlled, an official outlet is not an
   * independent account of a story — it is the government's own account.
   * With this on, retrieval reaches for independent and overseas reporting
   * first; official documents are still collected, but as primary material
   * and labelled as such, never as the outlet that "reported" it.
   */
  preferIndependent: boolean
}

export type RunStage = 'search' | 'dedupe' | 'summarise' | 'links' | 'publish'

export interface RunStep {
  stage: RunStage
  label: string
  detail: string
  done: boolean
}

export interface CollectRun {
  id: ID
  startedAt: ISODateTime
  finishedAt?: ISODateTime
  config: CollectConfig
  steps: RunStep[]
  /** Ids added by this run, so a run can be undone in one action. */
  addedNewsIds: ID[]
  addedStudyIds: ID[]
  /** Headlines the run skipped, with the reason. Nothing vanishes silently. */
  skipped: { headline: string; reason: string }[]
  state: 'running' | 'done' | 'stopped'
}

/* ------------------------------------------------------------------ *
 * Appearance — both surfaces
 * ------------------------------------------------------------------ */

export type ThemeKey = 'warm' | 'ink' | 'paper' | 'contrast'
export type AccentKey = 'coral' | 'indigo' | 'teal' | 'plum' | 'amber'

export interface Appearance {
  theme: ThemeKey
  accent: AccentKey
  /** 0.9 – 1.4, multiplies every type size on the site. */
  fontScale: number
  /** Body face for the summaries. */
  bodyFont: 'sans' | 'serif'
  /** Wider line spacing for easier reading. */
  roomy: boolean
}

/* ------------------------------------------------------------------ *
 * Accounts
 * ------------------------------------------------------------------ */

/**
 * 三种身份，从大到小：
 * - `owner` 站长：唯一能增删成员、改别人身份的人。删不掉。
 * - `editor` 编辑：能改内容、发内容、启动搜集。不能动成员名单。
 * - `member` 成员：只能看。登录是为了让站长知道是谁，以及能给他发邮件。
 */
export type Role = 'owner' | 'editor' | 'member'

export interface Account {
  email: string
  name?: string
  picture?: string
  role: Role
  addedAt: ISODateTime
  /** 接不接收网站的邮件通知。共享模式下有效。 */
  notify?: boolean
}

/**
 * 谁在用这个网站。
 *
 * 本地模式下这里是空的——内容只存在这台浏览器里，没有第二个人，
 * 也就没有「登录」这回事。共享模式下由数据库填：登录的邮箱、名单、
 * 谁是站长，全部来自 members 表，代码里一个地址都没有。
 */
export interface AuthState {
  /** 当前登录的邮箱（共享模式）。 */
  email?: string
  name?: string
  picture?: string
  /** 成员名单。共享模式下来自数据库；本地模式下是空的。 */
  admins: Account[]
  /** 站长的地址，来自数据库。代码里不写死任何人。 */
  ownerEmail?: string
}

/* ------------------------------------------------------------------ *
 * GitHub sync
 * ------------------------------------------------------------------ */

export interface GitHubConfig {
  owner: string
  repo: string
  branch: string
  /** Personal access token, kept in this browser only. */
  token: string
  /** Where the site content is written. */
  path: string
  lastSyncedAt?: ISODateTime
  lastResult?: string
}

/* ------------------------------------------------------------------ *
 * Site copy the editor can change without touching code
 * ------------------------------------------------------------------ */

export interface SiteCopy {
  title: string
  tagline: string
  intro: string
  aboutLead: string
  aboutBody: string
  footerNote: string
  /**
   * 站长给收集程序的常驻指示。
   *
   * 每天的抓取会读这一段，交给模型当作**优先于一般规则**的当次指令
   * （见 scripts/editorial.mjs 的 systemPrompt）。放在这里而不是浏览器里，
   * 是因为抓取跑在 GitHub Actions 上——写在这儿它才到得了那边，
   * 而且关掉页面也不会丢。
   */
  collectNote?: string
}

/* ------------------------------------------------------------------ *
 * Change log — every edit, in plain language
 * ------------------------------------------------------------------ */

export type ChangeKind =
  | 'collected' | 'published' | 'hidden' | 'restored' | 'deleted'
  | 'edited' | 'link-added' | 'link-removed' | 'appearance' | 'copy'
  | 'admin' | 'sync' | 'lock'

export interface ChangeEntry {
  id: ID
  at: ISODateTime
  who: string
  kind: ChangeKind
  /** One sentence, written for a person, not a log parser. */
  text: string
  /** Present when the change can be put back. */
  undo?: { type: 'restore-news' | 'restore-study'; id: ID }
}

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

export interface PrismState {
  news: NewsItem[]
  studies: StudyItem[]
  runs: CollectRun[]
  collect: CollectConfig
  appearance: Appearance
  auth: AuthState
  github: GitHubConfig
  copy: SiteCopy
  changes: ChangeEntry[]
  /** Stops everything from being publicly visible, in one switch. */
  publicOffline: boolean
  today: ISODate
}
