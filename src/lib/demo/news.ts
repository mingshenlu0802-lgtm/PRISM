/**
 * 演示新闻条目。
 *
 * 全部为虚构演示内容：机构、媒体名称与链接都不存在，链接位于 RFC 2606 保留的
 * `.invalid` 域名，永远不会解析。接入真实检索后，这些会被真实条目替换。
 *
 * 每条的结构就是网站的全部内容：一段短总结 + 报道它的媒体链接。
 */
import type { NewsItem } from '../types'

const L = (
  id: string, outlet: string, title: string, slug: string,
  lang: string, date: string, primary = false,
  outletKind?: 'official' | 'state', note?: string,
) => ({
  id, outlet, title, url: `https://demo.prism.invalid/${slug}`,
  lang, date, primary, outletKind, note,
})

export const NEWS: NewsItem[] = [
  {
    id: 'n-001',
    slug: 'cn-workplace-harassment-guideline',
    headline: '内地某省高院发布性骚扰案件审理指引，首次写入「职场从属关系」认定标准',
    summary:
      '该指引于本周公开，用四条列举了在存在上下级从属关系时，如何认定「违背意愿」这一要件，'
      + '并要求法院对当事人的陈述一致性作整体判断，而非因个别细节出入直接否定。'
      + '指引同时明确用人单位在收到投诉后的举证责任。它是省级层面的审判指导文件，'
      + '不具有全国效力，也不改变现行法律条文。\n\n'
      + '四条标准里，第三款被多位受访律师认为是最实质的改动。它写明：当双方存在管理、'
      + '考核或晋升上的从属关系时，法院在判断当事人是否表达了拒绝时，应当把这层关系'
      + '本身纳入考量，而不能仅以当事人未当场明确拒绝、或事后仍与对方保持工作往来，'
      + '推定其同意。指引举了三种常见情形作说明，包括当事人以沉默或回避方式回应、'
      + '当事人在事后仍需依赖对方完成工作、以及当事人延迟报案。三种情形都被写明'
      + '「不得单独作为否定要件的依据」。\n\n'
      + '第四款处理的是陈述一致性。过去的裁判中，当事人前后陈述在时间、地点或次数上'
      + '出现出入，常被作为整体不可信的理由。指引要求法院区分「核心事实」与「细节」，'
      + '并对细节出入作出说明后再决定是否影响可信度。这一条呼应了近年多份学术研究的'
      + '结论，但指引本身没有引用任何研究。\n\n'
      + '关于用人单位的举证责任，指引写明：单位在收到投诉后，需要自证已采取合理措施，'
      + '包括是否有可用的投诉渠道、是否在合理时限内启动处理、以及处理过程中是否'
      + '采取了避免报复的安排。举证不能的，法院可在民事责任分配上作不利认定。'
      + '指引没有规定具体时限，把「合理时限」留给个案判断。\n\n'
      + '需要说明这份文件的效力边界。它是省高院面向本省各级法院的审判指导文件，'
      + '不是司法解释，不具有全国效力，也不创设新的法律义务——它统一的是本省法院在'
      + '适用现行条文时的裁判尺度。多位律师提到，指引能起多大作用，取决于基层法院'
      + '在具体案件中如何援引；文件本身没有规定考核或监督机制。',
    bullets: [
      '适用范围：该省各级法院受理的性骚扰民事案件',
      '不改变法律条文，只统一裁判尺度',
      '用人单位收到投诉后需自证已采取合理措施',
    ],
    regions: ['cn'],
    topics: ['sexual', 'rights'],
    publishedAt: '2026-08-31T02:10:00Z',
    updatedAt: '2026-08-31T02:10:00Z',
    status: 'live',
    origin: 'auto',
    contentNotice: '本条涉及性骚扰案件的审理程序。总结不描述任何具体案情。',
    links: [
      L('l-001a', '省高级人民法院公报', '关于审理性骚扰案件若干问题的指引（全文）', 'cn-guideline-full', 'zh-Hans', '2026-08-29', true, 'official'),
      L('l-001b', 'Asia Legal Review', 'A provincial court redraws the burden of proof', 'cn-guideline-alr', 'en', '2026-08-30'),
      L('l-001c', '法治观察（境外）', '四条新标准如何改变举证结构', 'cn-guideline-analysis', 'zh-Hant', '2026-08-30'),
      L('l-001d', '某省级党报', '省高院出台指引统一裁判尺度', 'cn-guideline-state', 'zh-Hans', '2026-08-30', false, 'state'),
    ],
    demo: true,
    featured: true,
  },
  {
    id: 'n-002',
    slug: 'hk-gender-recognition-review',
    headline: '香港就性别承认程序展开公众咨询，文件列出三种可选方案',
    summary:
      '咨询文件提出三种方案：维持现行手术要求、以医疗评估取代手术、以及自我声明加冷静期。文件同时列出各方案在婚姻、监狱安置与体育参与三个领域的连带影响，并未表明倾向。咨询期为三个月，结束后会公布意见摘要，但不承诺按多数意见决定。',
    bullets: [
      '三种方案并列，官方未表态',
      '咨询期三个月，意见摘要将公开',
      '文件专门处理婚姻、监狱与体育三处连带影响',
    ],
    regions: ['hk'],
    topics: ['lgbtq', 'rights'],
    publishedAt: '2026-08-30T23:40:00Z',
    updatedAt: '2026-08-30T23:40:00Z',
    status: 'live',
    origin: 'auto',
    links: [
      L('l-002a', '政制事务局', '性别承认公众咨询文件（中英对照）', 'hk-consultation-doc', 'zh-Hant', '2026-08-28', true),
      L('l-002b', '香港电台', '咨询文件重点整理', 'hk-rthk-summary', 'zh-Hant', '2026-08-29'),
      L('l-002c', 'Hong Kong Post', 'Three options, no preferred model', 'hk-post-en', 'en', '2026-08-29'),
      L('l-002d', '跨性别资源中心', '民间团体对三方案的初步回应', 'hk-ngo-response', 'zh-Hant', '2026-08-30'),
    ],
    demo: true,
  },
  {
    id: 'n-003',
    slug: 'tw-workplace-equality-amendment',
    headline: '台湾职场平等法修正案三读通过，扩大适用至四人以下事业单位',
    summary:
      '修正案将性骚扰防治义务扩大适用到雇用四人以下的事业单位，并把申诉期限由一年延长至两年；涉及权势性骚扰的，延长至三年。主管机关须在六个月内订定配套办法。修法同时提高未设申诉管道的罚锾上限。',
    bullets: [
      '四人以下事业单位纳入适用',
      '申诉期限延长至两年，权势性骚扰三年',
      '配套办法须于六个月内订定',
    ],
    regions: ['jpkr'],
    topics: ['rights', 'sexual'],
    publishedAt: '2026-08-30T14:20:00Z',
    updatedAt: '2026-08-30T14:20:00Z',
    status: 'live',
    origin: 'auto',
    links: [
      L('l-003a', '立法院公报', '修正案三读条文', 'tw-bill-text', 'zh-Hant', '2026-08-29', true),
      L('l-003b', '中央通讯社', '修法重点与生效时程', 'tw-cna', 'zh-Hant', '2026-08-29'),
      L('l-003c', '劳动权益促进会', '小型事业单位落实上的三个难题', 'tw-labour-ngo', 'zh-Hant', '2026-08-30'),
    ],
    demo: true,
  },
  {
    id: 'n-004',
    slug: 'jp-court-selective-surname',
    headline: '日本一地方法院就夫妻别姓提出违宪意见，案件预料上诉至最高法院',
    summary:
      '该地方法院在判决理由中表示，现行强制同姓规定对婚姻自由构成不必要限制，但因涉及立法裁量而未直接宣告违宪，仅在附带意见中提出。原告与被告双方均已表示将上诉。日本最高法院曾两度就同一问题作出合宪判断，最近一次在数年前。',
    bullets: [
      '违宪意见写在附带意见，不是判决主文',
      '双方均上诉，预料进入最高法院',
      '最高法院此前两度判合宪',
    ],
    regions: ['jpkr'],
    topics: ['rights'],
    publishedAt: '2026-08-30T09:05:00Z',
    updatedAt: '2026-08-30T09:05:00Z',
    status: 'live',
    origin: 'auto',
    links: [
      L('l-004a', '地方裁判所', '判决书（PDF）', 'jp-judgment', 'ja', '2026-08-28', true),
      L('l-004b', '朝日新報', '傍論での違憲言及、その意味', 'jp-asahi-style', 'ja', '2026-08-29'),
      L('l-004c', 'Japan Legal Review', 'Why an obiter matters here', 'jp-legal-en', 'en', '2026-08-30'),
    ],
    demo: true,
  },
  {
    id: 'n-005',
    slug: 'kr-online-abuse-platform-duty',
    headline: '韩国拟修法要求平台在收到举报后 24 小时内处置性别暴力内容',
    summary:
      '修正草案要求达到一定规模的平台在收到举报后 24 小时内完成初步处置，并按季度公开处置数据。业界表示技术上可行但担心误删，民间团体则认为 24 小时对正在扩散的内容仍然太慢。草案尚未排入表决。',
    bullets: ['24 小时初步处置义务', '按季度公开处置数据', '尚未排入表决'],
    regions: ['jpkr'],
    topics: ['hate', 'sexual'],
    publishedAt: '2026-08-30T06:30:00Z',
    updatedAt: '2026-08-30T06:30:00Z',
    status: 'live',
    origin: 'auto',
    links: [
      L('l-005a', '国会议案信息系统', '修正草案原文', 'kr-bill', 'ko', '2026-08-27', true),
      L('l-005b', '首尔日报', '业界与民间团体的分歧点', 'kr-seoul', 'ko', '2026-08-29'),
      L('l-005c', 'Korea Tech Brief', 'Platforms say 24h is feasible', 'kr-tech-en', 'en', '2026-08-30'),
    ],
    demo: true,
  },
  {
    id: 'n-006',
    slug: 'us-state-clinic-data',
    headline: '美国某州公布生育健康服务可及性年度数据，显示跨县行程距离中位数上升',
    summary:
      '州卫生部门发布的年度统计显示，居民到最近一处提供完整生育健康服务机构的行程距离中位数由上一年度上升，农村县上升幅度明显高于城市县。统计不含私人诊所自愿申报以外的数据，也未纳入邻州就医情况，因此实际可及性可能被高估或低估。',
    bullets: [
      '行程距离中位数上升，农村县幅度更大',
      '不含跨州就医，可及性可能被高估',
      '数据可下载，含分县明细',
    ],
    regions: ['us'],
    topics: ['rights'],
    publishedAt: '2026-08-29T20:15:00Z',
    updatedAt: '2026-08-29T20:15:00Z',
    status: 'live',
    origin: 'auto',
    links: [
      L('l-006a', 'State Department of Health', 'Annual access report + county dataset', 'us-state-report', 'en', '2026-08-27', true, 'official', '含可下载的分县数据表'),
      L('l-006b', 'Capitol Health Desk', 'Rural counties drive the increase', 'us-health-desk', 'en', '2026-08-28'),
      L('l-006c', 'County Ledger', 'What the report leaves out', 'us-county-ledger', 'en', '2026-08-29'),
    ],
    demo: true,
  },
  {
    id: 'n-007',
    slug: 'eu-pay-transparency-first-returns',
    headline: '欧洲多国薪酬透明申报首年数据陆续公布，口径差异使跨国比较困难',
    summary:
      '首批公布的国家采用了不同的申报门槛与计算口径，有的按全体雇员中位数，有的按同职级匹配后差距，导致公开数字不可直接横向比较。欧盟层面尚未发布统一汇总。多家研究机构提醒，在统一口径出台前，任何跨国排名都不成立。',
    bullets: [
      '各国门槛与口径不一致',
      '欧盟尚未发布统一汇总',
      '研究机构：跨国排名目前不成立',
    ],
    regions: ['eu'],
    topics: ['rights'],
    publishedAt: '2026-08-29T11:00:00Z',
    updatedAt: '2026-08-29T11:00:00Z',
    status: 'live',
    origin: 'auto',
    links: [
      L('l-007a', 'European Statistics Portal', 'First-year national returns (index)', 'eu-returns-index', 'en', '2026-08-26', true),
      L('l-007b', 'Brussels Policy Wire', 'Why the numbers do not line up', 'eu-brussels-wire', 'en', '2026-08-28'),
      L('l-007c', 'Le Journal Social', 'Des chiffres non comparables', 'eu-fr', 'fr', '2026-08-28'),
      L('l-007d', 'Nordisk Arbeid', 'Ulike terskler gir ulike tall', 'eu-no', 'no', '2026-08-29'),
    ],
    demo: true,
  },
  {
    id: 'n-008',
    slug: 'sea-migrant-domestic-worker-ruling',
    headline: '东南亚一国最高法院裁定家务移工适用一般劳动法保护',
    summary:
      '最高法院推翻下级法院见解，认定家务移工不属于劳动法的除外类别，因而适用工时、休假与解雇保护的一般规定。判决对既有个案不溯及，但主管机关须在一年内修订相关行政规则。雇主团体已表示将寻求立法调整。',
    bullets: ['家务移工适用一般劳动法', '不溯及既有个案', '行政规则须一年内修订'],
    regions: ['sea'],
    topics: ['displacement', 'rights'],
    publishedAt: '2026-08-29T04:45:00Z',
    updatedAt: '2026-08-29T04:45:00Z',
    status: 'live',
    origin: 'auto',
    links: [
      L('l-008a', 'Supreme Court Registry', 'Full judgment', 'sea-judgment', 'en', '2026-08-26', true),
      L('l-008b', 'Migrant Rights Network', 'What changes for 300,000 workers', 'sea-mrn', 'en', '2026-08-28'),
    ],
    demo: true,
  },
  {
    id: 'n-009',
    slug: 'global-un-committee-observations',
    headline: '联合国某委员会发布结论性意见，点名六个国家的孕产照护缺口',
    summary:
      '结论性意见依据各国自行提交的报告与民间团体的平行报告作出，列出六个国家在孕产照护可及性上的具体缺口，并给出时限建议。意见不具法律约束力，各国须在两年内提交后续报告。文件与各国的书面回应一并公开。',
    bullets: ['不具法律约束力', '两年内须提交后续报告', '各国书面回应同时公开'],
    regions: ['global'],
    topics: ['rights'],
    publishedAt: '2026-08-28T16:20:00Z',
    updatedAt: '2026-08-28T16:20:00Z',
    status: 'live',
    origin: 'auto',
    links: [
      L('l-009a', 'UN Treaty Body Database', 'Concluding observations (full text)', 'un-observations', 'en', '2026-08-25', true),
      L('l-009b', 'Geneva Rights Monitor', 'Six countries named, and why', 'un-geneva-monitor', 'en', '2026-08-27'),
      L('l-009c', '国际观察', '结论性意见的效力边界', 'un-zh', 'zh-Hans', '2026-08-28'),
    ],
    demo: true,
  },
  {
    id: 'n-010',
    slug: 'anz-conversion-practices-review',
    headline: '澳新一州公布转化行为禁令实施两年检讨报告',
    summary:
      '检讨报告指出，两年内正式立案的投诉数量低于立法时的预估，主要原因是投诉门槛与举证方式对当事人不友好，而非行为本身减少。报告建议简化投诉程序并加强对宗教场所内部行为的适用说明。州政府表示会在下个会期回应。',
    bullets: ['立案数低于预估，原因在程序而非行为减少', '建议简化投诉程序', '州政府下个会期回应'],
    regions: ['anz'],
    topics: ['rights', 'lgbtq'],
    publishedAt: '2026-08-28T08:00:00Z',
    updatedAt: '2026-08-28T08:00:00Z',
    status: 'live',
    origin: 'auto',
    links: [
      L('l-010a', 'State Review Office', 'Two-year review report', 'anz-review', 'en', '2026-08-26', true),
      L('l-010b', 'Southern Herald', 'Complaint numbers lower than expected', 'anz-herald', 'en', '2026-08-27'),
    ],
    demo: true,
  },
  {
    id: 'n-011',
    slug: 'mena-personal-status-amendment',
    headline: '中东某国就人身法修正案展开辩论，争点集中在监护权年龄',
    summary:
      '修正案将母亲监护权的年龄上限提高，并允许在特定情形下延长。支持方认为这与现行判例一致，反对方主张应交由法官个案裁量。草案尚在委员会阶段，全文已公开可查。',
    bullets: ['争点在监护权年龄上限', '尚在委员会阶段', '草案全文已公开'],
    regions: ['mena'],
    topics: ['rights'],
    publishedAt: '2026-08-27T18:30:00Z',
    updatedAt: '2026-08-27T18:30:00Z',
    status: 'live',
    origin: 'auto',
    links: [
      L('l-011a', 'Official Gazette', 'Draft amendment (Arabic)', 'mena-draft', 'ar', '2026-08-24', true),
      L('l-011b', 'Regional Law Digest', 'What the amendment would change', 'mena-digest', 'en', '2026-08-26'),
    ],
    demo: true,
  },
  {
    id: 'n-012',
    slug: 'cn-campus-reporting-channel',
    headline: '内地多所高校陆续公开性骚扰投诉渠道与处理时限',
    summary:
      '多所高校在本学期开学前更新了校内规定，公开了投诉受理部门、处理时限与回避规则。各校的时限规定不一致，从十五个工作日到三十个工作日不等，且多数未说明当事人对处理结果不服时的救济途径。',
    bullets: [
      '投诉渠道与时限首次公开',
      '各校时限不一致（15–30 个工作日）',
      '多数未写明不服时的救济途径',
    ],
    regions: ['cn'],
    topics: ['sexual', 'rights'],
    publishedAt: '2026-08-27T10:10:00Z',
    updatedAt: '2026-08-27T10:10:00Z',
    status: 'live',
    origin: 'auto',
    links: [
      L('l-012a', '高校信息公开平台', '各校规定汇总页', 'cn-campus-index', 'zh-Hans', '2026-08-25', true, 'official'),
      L('l-012b', 'Campus Rights Watch', 'Deadlines published, remedies still missing', 'cn-campus-crw', 'en', '2026-08-26'),
      L('l-012c', '教育观察（境外）', '时限之外，救济途径仍是空白', 'cn-edu-observer', 'zh-Hant', '2026-08-26'),
    ],
    demo: true,
  },
]
