/**
 * PRISM 棱镜 — 图表规格（演示数据）
 *
 * EVERYTHING IN THIS FILE IS FICTIONAL DEMONSTRATION DATA.
 * 下列每一组数字都是为原型演示而编造的：辖区、统计机构、法院、期刊与调查项目
 * 全部不存在，任何数值都不得被当作真实统计使用。
 *
 * 每张图必须满足三条本站规则：
 *  1. `sourceId` 指向 `./sources` 中真实存在的一条登记来源；
 *  2. `sourceNote` 写明数据集名称与采集方式（谁、按什么口径、从哪里收集）；
 *  3. `limitation` 写明这张图「无法说明什么」——不是免责套话，而是具体的口径边界。
 *
 * 颜色一律取自 tokens.css 的 `--prism-*` 变量，避免图表自带调色板。
 */
import type { ChartSpec } from '../types'

export const CHARTS: ChartSpec[] = [
  /* ---------------------------------------------------------------- *
   * violence — 家庭暴力立案量：口径变更造成的断裂
   * ---------------------------------------------------------------- */
  {
    id: 'chart-kalisan-dv-reports',
    kind: 'line',
    title: '卡利桑邦家庭暴力立案通报量（2019–2025）',
    subtitle: '2024 年起改用新的登记口径，折线在此处断开；2023 年为两套口径同时可得的重叠年份',
    unit: '案件数',
    sourceId: 'src-kalisan-stats-dv-2025',
    sourceNote:
      '卡利桑统计局《家庭暴力行政通报 2025》公开表 3.1，由邦内 214 个警务登记点按月上报、统计局按年汇总；不含未进入登记系统的案件。',
    series: [
      {
        name: '旧口径（同一当事人多次报案合并计为一案）',
        color: 'var(--prism-6)',
        points: [
          { label: '2019', value: 18420 },
          { label: '2020', value: 21050 },
          { label: '2021', value: 22380 },
          { label: '2022', value: 23110 },
          { label: '2023', value: 23940 },
        ],
      },
      {
        name: '新口径（每次报案分别立案，2023 年为回溯重算）',
        color: 'var(--prism-5)',
        points: [
          { label: '2023', value: 29870 },
          { label: '2024', value: 31260 },
          { label: '2025', value: 33480 },
        ],
      },
    ],
    limitation:
      '行政通报数据只覆盖已进入警务登记系统的案件，不含未报案情况；2024 年起将「同一当事人多次报案」由合并计为一案改为分别立案，两段不可直接比较。2023 年同时给出新旧两个数值，正是为了显示口径本身就能造成约 25% 的落差——这张图无法回答实际发生率是否上升。',
  },

  {
    id: 'chart-kalisan-dv-outcomes',
    kind: 'stacked',
    title: '保护令申请的处理结果构成（卡利桑邦，2023–2025）',
    subtitle: '每年各类结果占当年终局处理申请的百分比，合计 100%',
    unit: '%',
    sourceId: 'src-kalisan-court-protection-2026',
    sourceNote:
      '卡利桑高等法院《保护令参考判决》附表 B，按法院内部分类编码手册对当年全部终局处理的申请逐案编码后汇总。',
    series: [
      {
        name: '核发保护令',
        color: 'var(--prism-2)',
        points: [
          { label: '2023', value: 41 },
          { label: '2024', value: 46 },
          { label: '2025', value: 52 },
        ],
      },
      {
        name: '部分核发',
        color: 'var(--prism-1)',
        points: [
          { label: '2023', value: 17 },
          { label: '2024', value: 18 },
          { label: '2025', value: 16 },
        ],
      },
      {
        name: '驳回',
        color: 'var(--prism-3)',
        points: [
          { label: '2023', value: 26 },
          { label: '2024', value: 22 },
          { label: '2025', value: 20 },
        ],
      },
      {
        name: '申请人撤回或未到庭',
        color: 'var(--prism-4)',
        points: [
          { label: '2023', value: 16 },
          { label: '2024', value: 14 },
          { label: '2025', value: 12 },
        ],
      },
    ],
    limitation:
      '只统计已正式立案并作出终局处理的申请，在窗口阶段被劝退、材料不全未受理的申请完全不在其中；「撤回或未到庭」在司法记录里是一个程序类目，可能由安全顾虑、经济压力或交通距离造成，不能被读作申请不实。',
  },

  {
    id: 'chart-selva-er-prevalence',
    kind: 'range',
    title: '急诊科筛查所得的亲密关系暴力就诊率（塞尔瓦联邦，按区域）',
    subtitle: '中心点为估计值，区间为 95% 置信区间',
    unit: '每十万人',
    sourceId: 'src-selva-health-er-study-2025',
    sourceNote:
      '塞尔瓦国家卫生研究所《急诊科亲密关系暴力筛查研究》，2024 年 3 月至 2025 年 5 月在 9 家公立医院急诊科对连续就诊者进行主动筛查，筛查拒答率 14%。',
    series: [
      {
        name: '年就诊率（95% 置信区间）',
        color: 'var(--prism-5)',
        points: [
          { label: '首都圈', value: 241, lowValue: 219, highValue: 264 },
          { label: '港区', value: 259, lowValue: 228, highValue: 291 },
          { label: '北岸区', value: 214, lowValue: 186, highValue: 243 },
          { label: '中部高地', value: 168, lowValue: 141, highValue: 197 },
          { label: '南部平原', value: 132, lowValue: 104, highValue: 163 },
        ],
      },
    ],
    limitation:
      '只统计到达急诊科并接受主动筛查的就诊者，未就医、就诊于私立机构或拒绝筛查者都不在其中；区间只表示抽样误差，不包含因不安全而选择不透露所造成的系统性低估，因此区域间的高低更可能反映筛查覆盖率而非发生率差异。',
  },

  {
    id: 'chart-pancont-shelter-capacity',
    kind: 'bar',
    title: '每十万名成年女性的登记庇护床位数（跨辖区比较，2026）',
    subtitle: '按各辖区自行申报的登记床位数换算',
    unit: '每十万人',
    sourceId: 'src-pancont-shelter-capacity-2026',
    sourceNote:
      '泛洲人权理事会服务能力工作组《庇护床位容量区域调查 2026》，向各辖区主管部门发出统一填报表，由各辖区按统一的床位定义自行申报后交回。',
    series: [
      {
        name: '登记床位数',
        color: 'var(--prism-1)',
        points: [
          { label: '北屿联合王国', value: 9.4 },
          { label: '韦拉共和国', value: 6.1 },
          { label: '塞尔瓦联邦', value: 5.3 },
          { label: '西埃斯特里亚', value: 4.7 },
          { label: '图兰共和国', value: 3.4 },
          { label: '卡利桑邦', value: 2.2 },
          { label: '马兰岛自治区', value: 1.6 },
          { label: '阿米拉特王国', value: 1.1 },
        ],
      },
    ],
    limitation:
      '统计的是登记在册的床位数，不是可实际入住的床位：不反映地理分布、无障碍条件、停业整修，也不反映对跨性别申请者、无证移民或带男童入住者的实际接纳规则。东埃斯特里亚拒绝提供数据，因此缺席，不能读作该辖区床位为零。',
  },

  /* ---------------------------------------------------------------- *
   * repro — 服务可及性
   * ---------------------------------------------------------------- */
  {
    id: 'chart-selva-abortion-distance',
    kind: 'range',
    title: '到最近一处提供终止妊娠服务机构的行程距离（塞尔瓦联邦）',
    subtitle: '中心点为区内中位数，区间为第 25–75 百分位',
    unit: '公里',
    sourceId: 'src-selva-abortion-access-stats-2026',
    sourceNote:
      '塞尔瓦联邦卫生统计司《终止妊娠服务可及性统计 2026》，以登记住址到在册服务机构的道路距离计算，距离脚本与机构名录一并公开。',
    series: [
      {
        name: '中位行程距离（四分位区间）',
        color: 'var(--prism-4)',
        points: [
          { label: '首都圈', value: 6, lowValue: 3, highValue: 11 },
          { label: '港区', value: 17, lowValue: 9, highValue: 28 },
          { label: '北岸区', value: 24, lowValue: 14, highValue: 39 },
          { label: '中部高地', value: 68, lowValue: 41, highValue: 112 },
          { label: '南部平原', value: 95, lowValue: 58, highValue: 147 },
        ],
      },
    ],
    limitation:
      '距离只是可及性的一个维度：这张图不包含班次频率、往返费用、法定等待期、机构是否实际提供服务，也不包含从业人员援引良心条款而拒绝的情况。区间是区内住址分布的四分位范围，不是统计误差。',
  },

  {
    id: 'chart-pancont-evidence-mix',
    kind: 'donut',
    title: '泛洲人权理事会结论性意见所引材料的类型构成',
    subtitle: '按引用条目计数，合计 100%',
    unit: '%',
    sourceId: 'src-pancont-rights-observations-2025',
    sourceNote:
      '对《泛洲人权理事会对韦拉共和国的结论性意见》正文与脚注中全部 168 条引用逐条编码，编码依据文件自带的材料编号索引。',
    series: [
      {
        name: '引用材料类型',
        points: [
          { label: '政府提交材料', value: 31 },
          { label: '法院与立法文本', value: 22 },
          { label: '民间组织报告', value: 19 },
          { label: '国家统计数据', value: 14 },
          { label: '学术研究', value: 9 },
          { label: '其他', value: 5 },
        ],
      },
    ],
    limitation:
      '按引用条目计数，不按篇幅或论证权重加权；同一份材料被多次引用只计一次。因此这张图能说明理事会引用了哪些类型的材料，不能说明它更相信哪一类——一句由一份统计数据支撑的关键结论，与十次礼节性引述在这里权重相同。',
  },

  /* ---------------------------------------------------------------- *
   * trans — 程序门槛与等待时长
   * ---------------------------------------------------------------- */
  {
    id: 'chart-recognition-steps-compare',
    kind: 'bar',
    title: '完成法律性别变更所需的法定步骤数（跨辖区比较，2026）',
    subtitle: '仅统计成文法规定的必经步骤',
    unit: '项',
    sourceId: 'src-pancont-recognition-index-2026',
    sourceNote:
      '泛洲人权理事会法律比较处《法律性别承认程序索引 2026》，由该处法律研究员依据各辖区现行成文法条文逐条编码，编码规则与条款编号一并公布。',
    series: [
      {
        name: '法定必经步骤',
        color: 'var(--prism-2)',
        points: [
          { label: '北屿联合王国', value: 3 },
          { label: '韦拉共和国', value: 4 },
          { label: '塞尔瓦联邦', value: 5 },
          { label: '马兰岛自治区', value: 6 },
          { label: '图兰共和国', value: 7 },
          { label: '卡利桑邦', value: 8 },
          { label: '东埃斯特里亚', value: 11 },
        ],
      },
    ],
    limitation:
      '只计入成文法写明的必经步骤，不反映每个步骤的等待时间、费用、是否需要第三方鉴定，也不反映实际拒绝率——步骤少不等于容易。阿米拉特王国没有可用的法定程序，无法用「步骤数」这把尺子表示，因此不在图中，其缺席不代表步骤为零。',
  },

  {
    id: 'chart-norhold-trans-care-wait',
    kind: 'line',
    title: '跨性别医疗首次评估的中位等待时长（北屿联合王国，2021–2025）',
    subtitle: '按服务点自愿上报的排队记录汇总',
    unit: '周',
    sourceId: 'src-norhold-trans-health-alliance-2026',
    sourceNote:
      '北屿跨性别健康联盟《2026 年服务等待时长审计》，向 11 家服务点发出统一问卷、回收 8 份，取各服务点排队记录的中位数后再取跨服务点中位数。',
    series: [
      {
        name: '成人服务',
        color: 'var(--prism-1)',
        points: [
          { label: '2021', value: 62 },
          { label: '2022', value: 78 },
          { label: '2023', value: 96 },
          { label: '2024', value: 118 },
          { label: '2025', value: 131 },
        ],
      },
      {
        name: '青少年服务',
        color: 'var(--prism-4)',
        points: [
          { label: '2021', value: 71 },
          { label: '2022', value: 89 },
          { label: '2023', value: 112 },
          { label: '2024', value: 140 },
          { label: '2025', value: 158 },
        ],
      },
    ],
    limitation:
      '数据来自 11 家服务点中自愿上报的 8 家，未上报的 3 家很可能等得更久，因此这是等待时长的下限而非平均水平；只计到「首次评估」，评估之后到实际开始治疗之间的时间不在其中，中途放弃排队者也不计入。',
  },

  /* ---------------------------------------------------------------- *
   * hate — 报案量与其驱动因素
   * ---------------------------------------------------------------- */
  {
    id: 'chart-norhold-online-abuse',
    kind: 'line',
    title: '北屿联合王国记录在案的网络骚扰报案量（2021–2025）',
    subtitle: '按报案时登记的动机类别分列',
    unit: '件',
    sourceId: 'src-norhold-hate-crime-stats-2026',
    sourceNote:
      '北屿内政统计办公室《仇恨犯罪与网络骚扰记录统计 2026》，由各警区按统一动机分类上报，统计办公室随数据发布方法说明与已知偏差清单。',
    series: [
      {
        name: '性别相关',
        color: 'var(--prism-5)',
        points: [
          { label: '2021', value: 4120 },
          { label: '2022', value: 4980 },
          { label: '2023', value: 6240 },
          { label: '2024', value: 7310 },
          { label: '2025', value: 7890 },
        ],
      },
      {
        name: '性取向或性别认同相关',
        color: 'var(--prism-6)',
        points: [
          { label: '2021', value: 2860 },
          { label: '2022', value: 3410 },
          { label: '2023', value: 4630 },
          { label: '2024', value: 5720 },
          { label: '2025', value: 6410 },
        ],
      },
    ],
    limitation:
      '报案量同时受实际发生率与报案意愿影响，2023 年上线的在线报案入口把报案门槛显著降低，当年的跳升不能直接读作发生率上升；动机类别由接案警员在受理时判定，跨警区的判定标准并不统一。',
  },

  {
    id: 'chart-tideline-enforcement-mix',
    kind: 'donut',
    title: '平台对被举报骚扰内容的处置构成（2026 上半年）',
    subtitle: '平台自述数据，按处置结果占全部已审结举报的百分比',
    unit: '%',
    sourceId: 'src-tideline-platform-transparency-2026',
    sourceNote:
      '潮线网络《2026 上半年透明度报告》，由平台自行统计并自行发布，分类定义由平台内部制定，未经外部审计。',
    series: [
      {
        name: '处置结果',
        points: [
          { label: '不予处理', value: 44 },
          { label: '降低可见度', value: 21 },
          { label: '删除内容', value: 18 },
          { label: '限制账号功能', value: 11 },
          { label: '永久停用账号', value: 6 },
        ],
      },
    ],
    limitation:
      '这是平台的自我报告，分类定义每年变动且不接受外部审计，因此不能与其他年度或其他平台横向比较；分母只含「已审结」举报，未被系统受理或超时未审的举报不在其中，也无从看出被处置内容与举报内容是否对得上。',
  },

  /* ---------------------------------------------------------------- *
   * equality — 跨辖区薪酬差距
   * ---------------------------------------------------------------- */
  {
    id: 'chart-paygap-compare',
    kind: 'bar',
    title: '全职雇员小时工资中位数性别差距（跨辖区比较，2025）',
    subtitle: '数值为女性中位小时工资低于男性的百分比',
    unit: '%',
    sourceId: 'src-pancont-equality-panel-2026',
    sourceNote:
      '泛洲人权理事会经济与社会权利处《区域薪酬差距面板数据 2025》，以各辖区自报的雇主薪酬行政数据为基础，按该处公布的换算规则统一口径。',
    series: [
      {
        name: '中位小时工资差距',
        color: 'var(--prism-3)',
        points: [
          { label: '北屿联合王国', value: 11.4 },
          { label: '西埃斯特里亚', value: 13.1 },
          { label: '塞尔瓦联邦', value: 14.9 },
          { label: '韦拉共和国', value: 16.2 },
          { label: '马兰岛自治区', value: 17.8 },
          { label: '图兰共和国', value: 19.7 },
          { label: '卡利桑邦', value: 22.5 },
        ],
      },
    ],
    limitation:
      '只覆盖有正式雇佣合同的全职岗位，把非正规就业、兼职与全部无酬照护劳动排除在外——在非正规就业比重高的辖区，这个数字会系统性偏低。各辖区的行业结构与工时定义未做调整，数值只能横向排序，不能解读为歧视程度的大小。',
  },

  /* ---------------------------------------------------------------- *
   * displacement — 庇护申请结果
   * ---------------------------------------------------------------- */
  {
    id: 'chart-selva-asylum-outcomes',
    kind: 'stacked',
    title: '以性别或性取向为由的庇护申请一审结果构成（塞尔瓦联邦）',
    subtitle: '每年各类结果占当年一审终结申请的百分比，合计 100%',
    unit: '%',
    sourceId: 'src-selva-asylum-tribunal-2026',
    sourceNote:
      '塞尔瓦联邦庇护法庭《性别与性取向理由裁决汇编》年度结果统计表，由法庭按其公开的分类编码手册对去标识化裁决逐案编码。',
    series: [
      {
        name: '认可难民身份',
        color: 'var(--prism-2)',
        points: [
          { label: '2023', value: 28 },
          { label: '2024', value: 31 },
          { label: '2025', value: 36 },
        ],
      },
      {
        name: '给予补充保护',
        color: 'var(--prism-1)',
        points: [
          { label: '2023', value: 12 },
          { label: '2024', value: 14 },
          { label: '2025', value: 15 },
        ],
      },
      {
        name: '驳回',
        color: 'var(--prism-3)',
        points: [
          { label: '2023', value: 47 },
          { label: '2024', value: 43 },
          { label: '2025', value: 39 },
        ],
      },
      {
        name: '程序终止',
        color: 'var(--prism-4)',
        points: [
          { label: '2023', value: 13 },
          { label: '2024', value: 12 },
          { label: '2025', value: 10 },
        ],
      },
    ],
    limitation:
      '只统计一审结果，不含上诉改判——同一批申请在上诉后的最终结果可能明显不同；「程序终止」多为申请人失联、转往其他辖区或被羁押，不能被解读为申请撤回或申请不实。',
  },

  /* ---------------------------------------------------------------- *
   * movement — 资金构成
   * ---------------------------------------------------------------- */
  {
    id: 'chart-movement-funding-mix',
    kind: 'donut',
    title: '女性主义与 LGBTQIA+ 组织的资金来源构成（2025）',
    subtitle: '214 家填报机构的收入加总占比，合计 100%',
    unit: '%',
    sourceId: 'src-pancont-funding-review-2026',
    sourceNote:
      '泛洲公民社会资金观察《公民社会资金流向审视 2025》，向区域内组织发出自愿填报的财务问卷，214 家交回并授权公开汇总。',
    series: [
      {
        name: '资金来源',
        points: [
          { label: '国际基金会', value: 38 },
          { label: '政府与公共资金', value: 24 },
          { label: '个人小额捐赠', value: 16 },
          { label: '服务与培训收入', value: 11 },
          { label: '企业资助', value: 7 },
          { label: '其他', value: 4 },
        ],
      },
    ],
    limitation:
      '样本为自愿填报财务问卷的 214 家组织，规模较小、无专职财务人员或在受限环境中运作的组织普遍缺席，因此这张图会低估个人小额捐赠与非正式互助的真实比重；按金额加总计算，一家大型机构的一笔资助足以盖过数十家小组织的全部收入。',
  },

  {
    id: 'chart-kalisan-enrolment-compare',
    kind: 'bar',
    title: '中学阶段女生净入学率（卡利桑邦，按县分组，2025）',
    subtitle: '按县分列的学年初净入学率；邦内平均水平为 78.4%',
    unit: '%',
    sourceId: 'src-kalisan-enrolment-stats-2025',
    sourceNote:
      '卡利桑统计局《中学阶段入学统计 2025》，由各县学校在学年初的固定时点上报在册学生名册，统计局按县与性别分列汇总。',
    series: [
      {
        name: '女生净入学率',
        color: 'var(--prism-6)',
        points: [
          { label: '首府县', value: 91.2 },
          { label: '河谷县', value: 84.6 },
          { label: '北岭县', value: 79.3 },
          { label: '西平原县', value: 76.1 },
          { label: '盐湖县', value: 71.8 },
          { label: '东丘陵县', value: 68.4 },
          { label: '边境县', value: 61.7 },
        ],
      },
    ],
    limitation:
      '净入学率按学年初的在册名册计算，只能说明有多少人注册，不能说明有多少人实际到校、读满整个学年或完成学业；辍学定义在两年前调整过，与 2023 年以前的数据不能直接比较，长期缺课但未办理退学者仍计入在册。',
  },
  {
    id: 'chart-veyra-curriculum-coverage',
    kind: 'bar',
    title: '各类平等教育内容已开设的学校比例（韦拉，2026）',
    subtitle: '按教育部统计司口径，学校自报',
    unit: '%',
    sourceId: 'src-veyra-education-stats-2026',
    sourceNote: '韦拉教育部统计司《学校平等内容覆盖统计 2026》，基于全量学校年度报表，学校自报，未经督导核实。',
    limitation: '本图只显示学校是否声称开设了某类内容，不显示课时、师资资质或教学质量；自报数据倾向高估。也不能据此推断法案第 12 条会新增多少内容——现行开设情况与法案要求的范围并不重合。',
    series: [
      {
        name: '已开设的学校比例',
        points: [
          { label: '人际关系与同意', value: 61 },
          { label: '性别刻板印象', value: 74 },
          { label: '家庭暴力识别', value: 38 },
          { label: '多元家庭形态', value: 29 },
          { label: '网络骚扰应对', value: 47 },
          { label: '生殖健康基础', value: 55 },
        ],
      },
    ],
  },
]
