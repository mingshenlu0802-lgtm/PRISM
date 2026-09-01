/**
 * 演示「研究与数据」条目。
 *
 * 与新闻同样的结构纪律：一段短总结、若干链接。区别在于每条都必须写明
 * 这项研究「不能说明什么」，以及数据是否可以直接下载。
 *
 * 全部为虚构演示内容，链接位于保留域名 `.invalid`。
 */
import type { StudyItem } from '../types'

const L = (id: string, outlet: string, title: string, slug: string, lang: string, date: string, primary = false) =>
  ({ id, outlet, title, url: `https://demo.prism.invalid/${slug}`, lang, date, primary })

export const STUDIES: StudyItem[] = [
  {
    id: 's-001',
    slug: 'cn-time-use-care-labour',
    title: '城镇家庭无偿照护时间的性别分配：基于时间利用调查的再分析',
    publisher: '某社会科学研究所',
    kind: 'peer-reviewed',
    date: '2026-08-20',
    regions: ['cn'],
    topics: ['rights', 'rights'],
    summary:
      '研究使用两轮时间利用调查的微观数据，估计城镇家庭中无偿照护时间的性别差距，并按有无学龄前子女、是否与父母同住分层。结果显示差距在有学龄前子女的家庭中最大，且与女性劳动参与率呈负相关。',
    limitation:
      '横断面数据无法确立因果方向：可能是照护负担压低了就业，也可能是退出劳动市场后承担了更多照护。样本只覆盖城镇户籍家庭，不含流动人口。',
    figures: [
      { label: '日均差距（有学龄前子女）', value: '2.4 小时', note: '为家庭内自报时间之差，不含情绪劳动与安排协调。' },
      { label: '样本量', value: '11,800 户', note: '仅城镇户籍，流动人口不在抽样框内。' },
    ],
    links: [
      L('sl-001a', '研究所出版物页面', '论文全文与附录', 'cn-care-paper', 'zh-Hans', '2026-08-20', true),
      L('sl-001b', '数据平台', '去标识化微观数据（需注册）', 'cn-care-data', 'zh-Hans', '2026-08-20'),
    ],
    datasetUrl: 'https://demo.prism.invalid/cn-care-data',
    status: 'live', origin: 'auto', demo: true,
  },
  {
    id: 's-002',
    slug: 'hk-tw-recognition-steps-index',
    title: '法律性别变更所需步骤数：东亚八个法域的比较编码',
    publisher: '某大学法律与社会研究中心',
    kind: 'official-statistics',
    date: '2026-08-14',
    regions: ['hk', 'tw', 'jpkr', 'cn'],
    topics: ['lgbtq', 'rights'],
    summary:
      '研究按统一编码规则，统计八个东亚法域完成法律性别变更所需的法定步骤数，并与实际完成率对照。编码规则与逐法域的条文引用一并公开，任何人都可以重新编码一遍。',
    limitation:
      '统计的是法定步骤，不是实际耗时。行政机关的裁量与地方实践差异不在指数内，因此「条文简单」与「实际好办」不是一回事。',
    figures: [
      { label: '步骤数区间', value: '3 – 11 步', note: '仅计法定必要步骤，不含预约与等待。' },
      { label: '编码可复现', value: '是', note: '规则与条文引用全部公开。' },
    ],
    links: [
      L('sl-002a', '研究中心', '比较编码表与方法说明', 'ea-index', 'en', '2026-08-14', true),
      L('sl-002b', '中文摘要', '八个法域的对照简表', 'ea-index-zh', 'zh-Hant', '2026-08-15'),
    ],
    datasetUrl: 'https://demo.prism.invalid/ea-index-csv',
    status: 'live', origin: 'auto', demo: true,
  },
  {
    id: 's-003',
    slug: 'us-ipv-emergency-screening',
    title: '急诊科普遍筛查所得的亲密关系暴力就诊率：多州横断面研究',
    publisher: '公共卫生学会期刊',
    kind: 'peer-reviewed',
    date: '2026-07-30',
    regions: ['us'],
    topics: ['sexual'],
    summary:
      '在多州急诊科实施统一筛查问卷，得到按区域分列的就诊率与 95% 置信区间。区域间差距大于此前行政数据所显示的差距，作者认为差异部分来自筛查覆盖率而非发生率本身。',
    limitation:
      '样本只覆盖已到达急诊科的人，未就医者与就医后未披露者都不在其中，偏差方向已知且向下。不能据此推算总体发生率。',
    figures: [
      { label: '就诊率区间', value: '每十万人 118 – 342', note: '含 95% 置信区间，区域间口径一致。' },
      { label: '拒答率', value: '9.4%', note: '拒答者特征与应答者存在系统差异。' },
    ],
    links: [
      L('sl-003a', '期刊', '论文与补充材料', 'us-ipv-study', 'en', '2026-07-30', true),
      L('sl-003b', 'Public Health Desk', 'What the confidence intervals mean here', 'us-ipv-explainer', 'en', '2026-08-02'),
    ],
    status: 'live', origin: 'auto', demo: true,
  },
  {
    id: 's-004',
    slug: 'eu-shelter-capacity-dataset',
    title: '欧洲各国登记庇护床位容量与人口比（2026 年盘点）',
    publisher: '某区域性人权机构',
    kind: 'dataset',
    date: '2026-07-02',
    regions: ['eu'],
    topics: ['sexual', 'rights'],
    summary:
      '各国登记在册的庇护床位数与成年女性人口之比，附各国的登记标准说明。数据以 CSV 与 API 两种形式开放，登记标准差异被单独列出而不是被平均掉。',
    limitation:
      '只统计登记在册的床位，不含非正式安置。「有床位」不等于「可进入」：语言、证件与地理可及性都不在数据内。',
    figures: [
      { label: '覆盖国家', value: '29', note: '登记标准不完全一致，已随表列出。' },
      { label: '开放形式', value: 'CSV + API', note: '可直接下载，无需申请。' },
    ],
    links: [
      L('sl-004a', '机构数据门户', '数据集与标准说明', 'eu-shelter-data', 'en', '2026-07-02', true),
    ],
    datasetUrl: 'https://demo.prism.invalid/eu-shelter-data.csv',
    status: 'live', origin: 'auto', demo: true,
  },
  {
    id: 's-005',
    slug: 'jp-online-harassment-method',
    title: '协同网络骚扰的识别方法与误判率',
    publisher: '某大学网络研究组',
    kind: 'peer-reviewed',
    date: '2026-06-18',
    regions: ['jpkr'],
    topics: ['hate', 'rights'],
    summary:
      '比较五种识别协同行为的方法，在有标注真值的数据集上报告各自的误判率，并说明在缺乏平台内部数据时哪些结论在方法上无法成立。',
    limitation:
      '外部研究者拿不到账号注册与设备信息，因此「同一批人在协调」这类结论不可达。本研究能支持的最强表述是「行为模式高度相似」。',
    figures: [
      { label: '最佳方法误判率', value: '11.2%', note: '实测值，非估计值；换数据集会变。' },
    ],
    links: [
      L('sl-005a', '研究组', '论文与代码', 'jp-coord-method', 'en', '2026-06-18', true),
      L('sl-005b', '代码仓库', '复现脚本', 'jp-coord-code', 'en', '2026-06-18'),
    ],
    status: 'live', origin: 'auto', demo: true,
  },
  {
    id: 's-006',
    slug: 'global-maternal-distance-cohort',
    title: '孕产照护可及性与行程距离：跨区域队列研究',
    publisher: '跨区域社会医学评论',
    kind: 'systematic-review',
    date: '2026-05-28',
    regions: ['global', 'sasia', 'africa'],
    topics: ['rights', 'rights'],
    summary:
      '汇总多个队列研究，估计行程距离与首次产检时间之间的关联，并按收入与户籍状态分层。分层分析让「距离」与「贫困」的效应可以部分分离。',
    limitation:
      '各研究的行政边界与统计口径不同，跨研究的绝对数值不可直接比较；无证件居民在多数抽样框中系统性缺失。',
    figures: [
      { label: '纳入研究', value: '24 项', note: '检索策略与排除理由全部公开。' },
      { label: '异质性', value: '较高', note: '作者建议按分层结果解读，不要看合并估计。' },
    ],
    links: [
      L('sl-006a', '期刊', '综述全文与检索策略', 'global-maternal-review', 'en', '2026-05-28', true),
    ],
    status: 'live', origin: 'auto', demo: true,
  },
  {
    id: 's-007',
    slug: 'tw-enrolment-open-data',
    title: '中等教育阶段各县市入学与辍学统计（开放资料）',
    publisher: '教育主管机关统计处',
    kind: 'official-statistics',
    date: '2026-05-10',
    regions: ['tw'],
    topics: ['rights'],
    summary:
      '按县市与性别分列的中等教育入学、在学与辍学统计，附学籍登记规则与转学处理方式。以开放资料格式发布，可直接下载。',
    limitation:
      '以学籍为准：长期缺课但未注销学籍者仍计为在学，因此会系统性高估实际就学情况。',
    figures: [
      { label: '资料格式', value: 'CSV / JSON', note: '含历年档，口径变更已在附注标明。' },
    ],
    links: [
      L('sl-007a', '开放资料平台', '资料集页面', 'tw-edu-open-data', 'zh-Hant', '2026-05-10', true),
    ],
    datasetUrl: 'https://demo.prism.invalid/tw-edu-open-data.csv',
    status: 'live', origin: 'auto', demo: true,
  },
  {
    id: 's-008',
    slug: 'sea-domestic-worker-preprint',
    title: '家务移工工时与休假合规状况：抽样调查（预印本）',
    publisher: '某劳动研究网络',
    kind: 'preprint',
    date: '2026-08-05',
    regions: ['sea'],
    topics: ['displacement', 'rights'],
    summary:
      '对家务移工的抽样访谈调查，报告工时、休假与扣薪情况的自报数据，并与雇主端记录做部分对照。作者提出合规率的区间估计。',
    limitation:
      '**未经同行评审。** 抽样通过民间组织接触，倾向于已寻求协助者，合规率可能被系统性低估；作者在文中亦提醒此点。',
    figures: [
      { label: '样本量', value: '640 人', note: '通过民间组织接触，非随机抽样。' },
    ],
    links: [
      L('sl-008a', '预印本平台', '论文（第 1 版）', 'sea-preprint-v1', 'en', '2026-08-05', true),
    ],
    status: 'live', origin: 'auto', demo: true,
  },
]
