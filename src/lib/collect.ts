/**
 * 搜集引擎（原型实现）。
 *
 * 真实部署时，这一层会去调用检索模型、抓取链接、生成总结。原型里它从一个
 * 虚构素材池里取材，但整个流程——按地区优先级扫描、去重、生成短总结、附上
 * 媒体链接、按设置决定是否直接上线——与真实流程一致，因此界面行为是真的。
 *
 * 一条重要约束：本引擎不会凭空造链接。每条产出的链接都来自素材池，且都带
 * `.invalid` 占位域名，在界面上会被标为「示例链接」。
 */
import type { CollectConfig, MediaLink, NewsItem, RunStep, StudyItem } from './types'
import type { RegionKey } from './regions'
import { REGION_MAP, sortRegions } from './regions'
import { TOPIC_MAP } from './constants'
import { nowIso, slugify, uid } from './util'

/* ------------------------------------------------------------------ *
 * 素材池 — 按地区分组的候选线索
 * ------------------------------------------------------------------ */

interface Seed {
  regions: RegionKey[]
  topics: NewsItem['topics']
  headline: string
  summary: string
  bullets: string[]
  outlets: Outlet[]
  notice?: string
}

/**
 * `kind` 标出这条链接是什么性质的来源。
 * official = 原始文件本身（公报、判决书、部门文件）；state = 受国家控制的媒体；
 * 不标的按独立媒体处理。这个区分只在读者需要判断可信度时才有意义，所以它
 * 会显示在页面上，而不是只用来排序。
 */
type Outlet = { outlet: string; title: string; lang: string; primary?: boolean; kind?: 'official' | 'state' }

const SEEDS: Seed[] = [
  {
    regions: ['cn'], topics: ['equality', 'rights'],
    headline: '内地某市公布反家庭暴力告诫书年度统计，首次按区分列',
    summary: '统计显示全年发出的告诫书数量较上年增加，但各区之间差距明显，最高与最低相差数倍。公布方说明差距主要来自受理与登记口径不同，不代表发生率差异。数据以表格形式公开，可按区查询。',
    bullets: ['首次按区分列', '区际差距主要来自登记口径', '数据可按区查询'],
    outlets: [
      { outlet: '市公安局政务公开', title: '年度告诫书统计表', lang: 'zh-Hans', primary: true, kind: 'official' },
      { outlet: 'Asia Rights Desk', title: 'What the district gap does and does not show', lang: 'en' },
      { outlet: '端傳媒（示例）', title: '告诫书数字背后的登记口径', lang: 'zh-Hant' },
      { outlet: '某省级党报', title: '全年告诫书数量稳步增长', lang: 'zh-Hans', kind: 'state' },
    ],
  },
  {
    regions: ['cn', 'global'], topics: ['repro'],
    headline: '内地某省将辅助生殖部分项目纳入医保支付范围',
    summary: '政策自下季度起执行，覆盖若干项常规辅助生殖技术项目，设年度支付上限与适应症限制。文件同时说明不覆盖的项目清单。执行细则由各市医保部门另行公布。',
    bullets: ['下季度起执行', '设年度支付上限', '不覆盖清单一并公布'],
    outlets: [
      { outlet: '省医疗保障局', title: '政策文件全文', lang: 'zh-Hans', primary: true, kind: 'official' },
      { outlet: 'Reproductive Policy Monitor', title: 'Coverage caps and what falls outside', lang: 'en' },
      { outlet: '某中央级媒体', title: '多地将辅助生殖纳入医保', lang: 'zh-Hans', kind: 'state' },
    ],
  },
  {
    regions: ['hk'], topics: ['equality', 'violence'],
    headline: '香港平机会发布职场性骚扰调查，回应率与往年持平',
    summary: '调查显示曾经历职场性骚扰的受访者比例与三年前相若，但选择正式投诉的比例仍然偏低，主要顾虑是担心影响职业发展。报告建议雇主改善内部处理程序的透明度。',
    bullets: ['经历比例与三年前相若', '正式投诉比例仍偏低', '主要顾虑为职业发展'],
    outlets: [
      { outlet: '平等机会委员会', title: '调查报告全文', lang: 'zh-Hant', primary: true, kind: 'official' },
      { outlet: '香港经济日报', title: '投诉率为何上不去', lang: 'zh-Hant' },
      { outlet: 'HK Standard', title: 'Complaint rate stays low', lang: 'en' },
    ],
  },
  {
    regions: ['tw'], topics: ['trans'],
    headline: '台湾某地方法院准许免手术变更性别登记，理由书引用比例原则',
    summary: '判决认为要求手术作为变更登记的前提，对身体自主权的限制超过必要程度。主管机关表示尊重判决但未说明是否上诉，也未说明是否影响其他个案。此前已有数起类似判决。',
    bullets: ['以比例原则为理由', '主管机关未说明是否上诉', '此前已有类似判决'],
    outlets: [
      { outlet: '司法院裁判书系统', title: '判决书全文', lang: 'zh-Hant', primary: true, kind: 'official' },
      { outlet: '中央通讯社', title: '免术换证判决再添一例', lang: 'zh-Hant' },
    ],
  },
  {
    regions: ['jpkr'], topics: ['hate'],
    headline: '日本某平台公布骚扰举报处置报告，首次公开分类口径',
    summary: '报告公开了举报量、处置量与处置时长分布，并首次附上分类标准。研究者指出，由于分类由平台自行判断且无外部审核，报告只能说明平台做了什么，不能说明问题的规模。',
    bullets: ['首次公开分类标准', '无外部审核', '只能说明平台行为，不能说明问题规模'],
    outlets: [
      { outlet: 'Platform Transparency', title: '半期レポート', lang: 'ja', primary: true, kind: 'official' },
      { outlet: '技術と社会', title: '分類基準の限界', lang: 'ja' },
    ],
  },
  {
    regions: ['us'], topics: ['trans', 'rights'],
    headline: '美国某州法院暂缓执行一项涉及跨性别医疗的新规',
    summary: '法院签发临时禁制令，认为原告在程序问题上有胜诉可能，新规在正式审理前暂不执行。禁制令仅涉及程序，未对新规的实体合法性作判断。州方已表示将上诉。',
    bullets: ['临时禁制令，非实体判断', '正式审理前暂不执行', '州方将上诉'],
    outlets: [
      { outlet: 'District Court', title: 'Order granting preliminary injunction', lang: 'en', primary: true, kind: 'official' },
      { outlet: 'State Legal Wire', title: 'Procedural, not substantive', lang: 'en' },
      { outlet: '国际法律观察', title: '临时禁制令说明了什么', lang: 'zh-Hans' },
    ],
  },
  {
    regions: ['eu'], topics: ['violence'],
    headline: '欧洲某国将跟踪骚扰入刑，明确「持续性」的认定门槛',
    summary: '修法把跟踪骚扰单列为独立罪名，并以次数与时间跨度两个要件界定持续性。批评意见认为门槛偏高，会把断续但长期的骚扰排除在外。法律自明年起生效。',
    bullets: ['单列为独立罪名', '以次数＋时间跨度界定', '批评：断续骚扰可能被排除'],
    outlets: [
      { outlet: 'Official Journal', title: 'Text of the amendment', lang: 'en', primary: true, kind: 'official' },
      { outlet: 'European Law Brief', title: 'Where the threshold sits', lang: 'en' },
    ],
  },
  {
    regions: ['eu', 'global'], topics: ['displacement', 'violence'],
    headline: '欧洲某国收紧基于性别暴力的庇护申请审查标准',
    summary: '新指引要求申请人提供更具体的时间地点信息，主管机关称此举为提高审查一致性。援助组织指出，创伤会影响记忆的时序性，该要求可能系统性地不利于真实申请人。指引已生效。',
    bullets: ['要求更具体的时间地点', '官方理由：审查一致性', '援助组织：不利于创伤当事人'],
    outlets: [
      { outlet: 'Immigration Authority', title: 'Revised assessment guidance', lang: 'en', primary: true, kind: 'official' },
      { outlet: 'Refugee Legal Aid', title: 'Why memory does not work that way', lang: 'en' },
    ],
    notice: '本条涉及性别暴力相关的庇护审查程序。总结不描述任何具体案情。',
  },
  {
    regions: ['sea'], topics: ['equality'],
    headline: '东南亚某国公布性别薪酬差距首份官方统计',
    summary: '统计基于社保申报数据，覆盖正规部门雇员，得出未调整的中位数差距。统计处提醒该口径不包含非正规就业，而非正规就业占该国女性劳动力相当比例，因此实际差距可能被低估。',
    bullets: ['基于社保申报，覆盖正规部门', '未调整口径', '非正规就业不在内，差距可能被低估'],
    outlets: [
      { outlet: 'National Statistics Office', title: 'First gender pay gap release', lang: 'en', primary: true, kind: 'official' },
    ],
  },
  {
    regions: ['sasia'], topics: ['violence', 'equality'],
    headline: '南亚某国最高法院要求各邦上报家庭暴力保护令执行情况',
    summary: '法院在一起公益诉讼中要求各邦在三个月内提交保护令的签发与执行数据，包括未执行的原因分类。法院表示将据此评估是否需要统一执行标准。',
    bullets: ['三个月内提交数据', '含未执行原因分类', '可能据此统一执行标准'],
    outlets: [
      { outlet: 'Supreme Court Registry', title: 'Interim order', lang: 'en', primary: true, kind: 'official' },
      { outlet: 'Law and Policy Review', title: 'What the data could show', lang: 'en' },
    ],
  },
  {
    regions: ['africa'], topics: ['repro', 'rights'],
    headline: '非洲某国宪法法院就孕产照护可及性作出裁定',
    summary: '法院认定政府未能在偏远地区提供最低限度的孕产照护，构成对健康权的侵犯，要求在一年内提交改善方案。判决未指定具体措施，把方案设计留给行政机关。',
    bullets: ['认定构成健康权侵犯', '一年内须提交方案', '未指定具体措施'],
    outlets: [
      { outlet: 'Constitutional Court', title: 'Judgment', lang: 'en', primary: true, kind: 'official' },
      { outlet: 'Health Rights Africa', title: 'A remedy with a deadline', lang: 'en' },
    ],
  },
  {
    regions: ['ru'], topics: ['rights', 'hate'],
    headline: '俄语区某国民间组织登记规则修订，公益诉讼门槛提高',
    summary: '修订后的规则提高了民间组织提起公益诉讼的资格要求，包括最低成立年限与成员规模。多家组织表示新规将使既有诉讼资格失效，主管机关未回应相关询问。',
    bullets: ['提高成立年限与规模要求', '既有诉讼资格可能失效', '主管机关未回应'],
    outlets: [
      { outlet: 'Official Register', title: 'Amended registration rules', lang: 'ru', primary: true, kind: 'official' },
      { outlet: 'Civic Space Monitor', title: 'Groups say standing will lapse', lang: 'en' },
    ],
  },
]

interface StudySeed {
  regions: RegionKey[]
  topics: StudyItem['topics']
  title: string
  publisher: string
  kind: StudyItem['kind']
  summary: string
  limitation: string
  figures: StudyItem['figures']
  outlets: Outlet[]
  hasData?: boolean
}

const STUDY_SEEDS: StudySeed[] = [
  {
    regions: ['cn'], topics: ['violence'], kind: 'official-statistics',
    title: '基层法院人身安全保护令签发与执行统计（年度）',
    publisher: '某高级人民法院研究室',
    summary: '按年度统计人身安全保护令的申请、签发与执行情况，并按申请事由分类。数据附有各基层法院的口径说明。',
    limitation: '只统计进入司法程序的案件，未申请者完全不在其中；「执行完毕」的判断标准各院不完全一致。',
    figures: [{ label: '签发率', value: '按年公布', note: '分母为申请数，不是发生数。' }],
    outlets: [{ outlet: '法院研究室', title: '统计年报', lang: 'zh-Hans', primary: true, kind: 'official' }],
    hasData: true,
  },
  {
    regions: ['us', 'eu'], topics: ['equality'], kind: 'peer-reviewed',
    title: '育儿假政策与父亲实际使用率：跨国面板分析',
    publisher: '劳动经济学期刊',
    summary: '利用多国面板数据，估计「父亲专属配额」与实际使用率之间的关联，并区分政策设计与文化因素的作用。',
    limitation: '面板数据存在国家层面的遗漏变量；作者使用固定效应缓解，但不足以支持因果结论。',
    figures: [{ label: '覆盖国家', value: '18', note: '各国假期定义已做调和，调和方案本身是一项假设。' }],
    outlets: [{ outlet: '期刊', title: '论文与复现资料', lang: 'en', primary: true, kind: 'official' }],
    hasData: true,
  },
  {
    regions: ['hk', 'tw', 'jpkr'], topics: ['hate'], kind: 'ngo-report',
    title: '东亚三地网络性别暴力受害经验调查',
    publisher: '某跨地区民间研究网络',
    summary: '在三地各抽取受访者，比较网络性别暴力的经历类型、求助渠道与求助结果。三地问卷一致，可作横向比较。',
    limitation: '通过民间组织与线上渠道招募，倾向于已有求助意识者；不能推及一般人口。',
    figures: [{ label: '样本量', value: '三地共 2,100 人', note: '非随机抽样，不可推及总体。' }],
    outlets: [{ outlet: '研究网络', title: '报告与问卷全文', lang: 'zh-Hant', primary: true, kind: 'official' }],
  },
  {
    regions: ['global'], topics: ['trans'], kind: 'systematic-review',
    title: '性别肯定医疗的长期随访研究：系统综述',
    publisher: '跨区域医学评论',
    summary: '系统检索并按统一标准评级现有长期随访研究，说明各研究的随访时长、失访率与结局指标差异。',
    limitation: '综述评的是证据强度，不是干预效果；随访时长普遍偏短，失访率报告方式不一致。',
    figures: [{ label: '纳入研究', value: '37 项', note: '检索策略与排除理由全部公开。' }],
    outlets: [{ outlet: '期刊', title: '综述与检索策略', lang: 'en', primary: true, kind: 'official' }],
  },
]

/* ------------------------------------------------------------------ *
 * Run planning
 * ------------------------------------------------------------------ */

export function planSteps(config: CollectConfig): RunStep[] {
  const regions = sortRegions(config.regions).map((r) => REGION_MAP[r]?.zh ?? r)
  const topics = config.topics.map((t) => TOPIC_MAP[t]?.short ?? t)
  return [
    {
      stage: 'search', label: '按地区搜索',
      detail: `优先顺序：${regions.slice(0, 6).join(' → ') || '未选择地区'}${regions.length > 6 ? ` 等 ${regions.length} 个地区` : ''}`,
      done: false,
    },
    { stage: 'search', label: '按议题筛选', detail: topics.join('、') || '未选择议题', done: false },
    { stage: 'dedupe', label: '合并重复报道', detail: config.dedupe ? '标题高度相似的条目只保留一条' : '已关闭去重', done: false },
    {
      stage: 'summarise', label: '写总结',
      detail: '用你选的免费模型写，长短由内容定；复杂的政策或判决可以写到上千字，空行分段',
      done: false,
    },
    {
      stage: 'links', label: '取配图',
      detail: '从报道页面自带的社交预览图取一张，连同署名一起收；取不到就用系统画的封面，不伪造现场照片',
      done: false,
    },
    {
      stage: 'links', label: '整理媒体链接',
      detail: config.preferIndependent
        ? '原始文件排最前；报道部分独立与境外媒体优先，官方媒体往后排并标出来'
        : '把报道同一件事的媒体列在一起，不区分来源性质',
      done: false,
    },
    {
      stage: 'publish', label: config.autoPublish ? '直接上线' : '存为待审',
      detail: config.autoPublish ? '上线后你随时可以修改或删除' : '不会出现在公众站，等你确认',
      done: false,
    },
  ]
}

/* ------------------------------------------------------------------ *
 * Producing items
 * ------------------------------------------------------------------ */

/**
 * 取材顺序。
 *
 * 打开「优先独立与境外媒体」时，报道类链接里独立媒体排在受国家控制的媒体前面。
 * 官方文件不参与这个排序——它是原始材料，本来就该排在最前，而且它的价值在于
 * 「文件原文是什么」，不在于「谁报道了它」。受国家控制的媒体不会被丢掉，只是
 * 往后排并且标出来，因为在新闻管制下它是政府自己的说法，不是独立的第三方记述。
 */
function orderOutlets(outlets: Outlet[], preferIndependent: boolean): Outlet[] {
  if (!preferIndependent) return outlets
  const rank = (o: Outlet) => (o.primary || o.kind === 'official' ? 0 : o.kind === 'state' ? 2 : 1)
  return [...outlets].sort((a, b) => rank(a) - rank(b))
}

function makeLinks(outlets: Outlet[], slug: string, date: string, preferIndependent: boolean): MediaLink[] {
  return orderOutlets(outlets, preferIndependent).map((o, i) => ({
    id: uid('l'),
    outlet: o.outlet,
    title: o.title,
    url: `https://demo.prism.invalid/${slug}-${i + 1}`,
    lang: o.lang,
    date,
    primary: Boolean(o.primary),
    ...(o.kind ? { outletKind: o.kind } : {}),
  }))
}

function matches(seedRegions: RegionKey[], seedTopics: string[], config: CollectConfig): boolean {
  const wantRegion = config.regions.length === 0 || seedRegions.some((r) => config.regions.includes(r))
  const wantTopic = config.topics.length === 0 || seedTopics.some((t) => (config.topics as string[]).includes(t))
  return wantRegion && wantTopic
}

/** Two headlines count as the same story when they share enough characters. */
function tooSimilar(a: string, b: string): boolean {
  const setA = new Set(a.replace(/[\s，。、：；「」（）]/g, ''))
  const setB = new Set(b.replace(/[\s，。、：；「」（）]/g, ''))
  if (setA.size === 0 || setB.size === 0) return false
  let shared = 0
  for (const ch of setA) if (setB.has(ch)) shared += 1
  return shared / Math.min(setA.size, setB.size) > 0.72
}

export interface CollectResult {
  news: NewsItem[]
  studies: StudyItem[]
  skipped: { headline: string; reason: string }[]
}

/**
 * Produce the items a run would add. Deterministic given (config, existing,
 * runIndex) so a run is reproducible and testable.
 */
export function collect(
  config: CollectConfig,
  existingNews: NewsItem[],
  existingStudies: StudyItem[],
  runIndex: number,
): CollectResult {
  const at = nowIso()
  const skipped: CollectResult['skipped'] = []
  const news: NewsItem[] = []
  const studies: StudyItem[] = []

  const wantNews = config.mode === 'news' || config.mode === 'both'
  const wantStudies = config.mode === 'studies' || config.mode === 'both'
  const newsBudget = wantStudies && wantNews ? Math.max(1, Math.ceil(config.perRun * 0.7)) : config.perRun

  if (wantNews) {
    // Walk the pool from a rotating offset so repeat runs surface new material.
    const pool = SEEDS.filter((s) => matches(s.regions, s.topics, config))
    for (let i = 0; i < pool.length && news.length < newsBudget; i += 1) {
      const seed = pool[(i + runIndex * 3) % pool.length]
      if (news.some((n) => n.headline === seed.headline)) continue
      const clash = config.dedupe
        && [...existingNews, ...news].find((n) => tooSimilar(n.headline, seed.headline))
      if (clash) {
        skipped.push({ headline: seed.headline, reason: `与已有条目「${clash.headline.slice(0, 18)}…」重复` })
        continue
      }
      const slug = slugify(seed.headline)
      news.push({
        id: uid('n'),
        slug: `${slug}-${runIndex}${news.length}`,
        headline: seed.headline,
        summary: seed.summary,
        bullets: [...seed.bullets],
        regions: [...seed.regions],
        topics: [...seed.topics],
        publishedAt: at,
        updatedAt: at,
        status: config.autoPublish ? 'live' : 'hidden',
        origin: 'auto',
        contentNotice: seed.notice,
        links: makeLinks(seed.outlets, slug, at.slice(0, 10), config.preferIndependent),
        demo: true,
      })
    }
  }

  if (wantStudies) {
    const pool = STUDY_SEEDS.filter((s) => matches(s.regions, s.topics, config))
    const budget = Math.max(1, config.perRun - news.length)
    for (let i = 0; i < pool.length && studies.length < budget; i += 1) {
      const seed = pool[(i + runIndex * 2) % pool.length]
      if (studies.some((s) => s.title === seed.title)) continue
      const clash = config.dedupe
        && [...existingStudies, ...studies].find((s) => tooSimilar(s.title, seed.title))
      if (clash) {
        skipped.push({ headline: seed.title, reason: '与已有研究条目重复' })
        continue
      }
      const slug = slugify(seed.title)
      studies.push({
        id: uid('s'),
        slug: `${slug}-${runIndex}${studies.length}`,
        title: seed.title,
        publisher: seed.publisher,
        kind: seed.kind,
        date: at.slice(0, 10),
        regions: [...seed.regions],
        topics: [...seed.topics],
        summary: seed.summary,
        limitation: seed.limitation,
        figures: seed.figures.map((f) => ({ ...f })),
        links: makeLinks(seed.outlets, slug, at.slice(0, 10), config.preferIndependent),
        datasetUrl: seed.hasData ? `https://demo.prism.invalid/${slug}-data.csv` : undefined,
        status: config.autoPublish ? 'live' : 'hidden',
        origin: 'auto',
        demo: true,
      })
    }
  }

  if (news.length === 0 && studies.length === 0) {
    skipped.push({
      headline: '（本次没有新增）',
      reason: '当前地区与议题组合下，素材池里的线索都已经在站上了。换一组条件，或关掉去重再试。',
    })
  }
  return { news, studies, skipped }
}
