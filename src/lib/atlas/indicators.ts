/**
 * 「各国数据」的指标目录。
 *
 * 站长要的是一张可交互的全球地图：受害人数、个人风险、男性施害、社会态度、
 * 法律保护、司法失灵。这个文件是那张地图的骨架——**先把要问的问题定下来**，
 * 数据能填多少是另一回事。
 *
 * 分四组，因为它们的证据性质完全不同，混在一起看就会得出错的结论：
 *
 *   victim      有多少女性经历过——全国代表性调查，跨国可比性最好
 *   perp        有多少男性自陈实施过——匿名调查，样本通常小得多
 *   attitude    幻想、迷思与假设性倾向——多为大学或便利样本，**不能推成全国人数**
 *   gap         女性相对男性的风险倍数
 *
 * 每个指标都写了 `definition`（这条数据到底在数什么）和 `comparable`
 * （跨国能不能直接比）。`comparable: false` 的指标，界面上不给排名、
 * 不给国家之间的高低比较——因为各国的问法和年龄范围不一样，
 * 比出来的差别可能全部来自问卷，而不是来自现实。
 */

export type ContinentKey =
  | 'asia' | 'europe' | 'africa' | 'namerica' | 'samerica' | 'oceania' | 'antarctica'

export interface Continent {
  key: ContinentKey
  zh: string
  /** 南极洲没有主权国家，也没有可比的人口数据——界面上照说不误。 */
  note?: string
}

export const CONTINENTS: Continent[] = [
  { key: 'asia', zh: '亚洲' },
  { key: 'europe', zh: '欧洲' },
  { key: 'africa', zh: '非洲' },
  { key: 'namerica', zh: '北美洲' },
  { key: 'samerica', zh: '南美洲' },
  { key: 'oceania', zh: '大洋洲' },
  { key: 'antarctica', zh: '南极洲', note: '无主权国家及可比人口数据。' },
]

export type Group = 'victim' | 'perp' | 'attitude' | 'gap'

export interface GroupMeta {
  key: Group
  zh: string
  /** 这一组数据是什么性质的证据。固定显示，不折叠。 */
  caveat: string
}

export const GROUPS: GroupMeta[] = [
  {
    key: 'victim',
    zh: '女性受害',
    caveat:
      '多来自全国代表性的人口与健康调查或专项暴力调查。各国的行为定义、'
      + '年龄范围与调查年份不同，数字之间不一定可以直接相减或排名。',
  },
  {
    key: 'perp',
    zh: '男性施害',
    caveat:
      '自陈施害与警方记录是两回事，界面上分开显示，不合并计算。'
      + '警方记录的嫌疑人数、起诉数、定罪数**不是**真实施害人数——'
      + '它们只统计了进入司法系统的那一小部分。',
  },
  {
    key: 'attitude',
    zh: '幻想、态度与实施倾向',
    caveat:
      '这一类研究多为大学样本、社区便利样本或网络招募样本，'
      + '**不能推算成全国人数**，只能按样本报告。'
      + '性幻想不等于犯罪意图或实际施害；双方同意的强迫情境幻想，'
      + '不等于希望现实中的强奸发生。假设性实施倾向是一种风险态度指标，'
      + '不等于犯罪发生率。',
  },
  {
    key: 'gap',
    zh: '性别差异',
    caveat:
      '同一份调查里女性与男性的结果才可以相比。跨调查的比较会把问卷差异'
      + '算成性别差异，这里不做。',
  },
]

export interface Indicator {
  key: string
  group: Group
  zh: string
  /** 这条数据到底在数什么。跟数字一起显示，不折叠。 */
  definition: string
  /** 跨国能不能直接比。false 的不给排名，也不给国家之间的高低比较。 */
  comparable: boolean
  /** 分母是谁——算「每 X 人中有 1 人」要用它。 */
  denominatorOf?: 'women' | 'men' | 'girls' | 'people' | 'ever-partnered-women'
}

export const INDICATORS: Indicator[] = [
  /* ---------------------------- 女性受害 ---------------------------- */
  { key: 'ipv-lifetime', group: 'victim', zh: '一生中遭受亲密伴侣身体或性暴力', comparable: true,
    denominatorOf: 'ever-partnered-women',
    definition: '曾有过伴侣的女性中，一生中至少经历过一次伴侣施加的身体暴力或性暴力的比例。' },
  { key: 'ipv-12m', group: 'victim', zh: '过去 12 个月遭受亲密伴侣身体或性暴力', comparable: true,
    denominatorOf: 'ever-partnered-women',
    definition: '曾有过伴侣的女性中，最近一年内经历过伴侣身体或性暴力的比例。' },
  { key: 'npsv-lifetime', group: 'victim', zh: '一生中遭受非伴侣性暴力', comparable: true,
    denominatorOf: 'women',
    definition: '15 岁以后经历过非伴侣施加的性暴力的女性比例。各国对「性暴力」的行为定义差异较大。' },
  { key: 'rape-lifetime', group: 'victim', zh: '遭受强奸或强奸未遂', comparable: false,
    denominatorOf: 'women',
    definition: '经历过强奸或强奸未遂的女性。**各国刑法对强奸的定义相差极大**——'
      + '是否以缺乏同意为核心、是否包含婚内、是否只限于插入行为——所以不做跨国排名。' },
  { key: 'csa-before-18', group: 'victim', zh: '18 岁前遭受强奸或接触性性侵', comparable: true,
    denominatorOf: 'girls',
    definition: '在 18 岁之前经历过强奸或身体接触型性侵害的女性与女童。' },
  { key: 'first-sex-forced', group: 'victim', zh: '首次性行为并非自愿', comparable: true,
    denominatorOf: 'women',
    definition: '自述第一次性行为是被强迫或非自愿的女性比例。' },
  { key: 'femicide-year', group: 'victim', zh: '每年被亲密伴侣或家庭成员杀害', comparable: true,
    denominatorOf: 'women',
    definition: '一年内被亲密伴侣或其他家庭成员杀害的女性人数。这一项通常来自凶杀案登记，'
      + '而不是抽样调查，所以口径与其他项不同。' },
  { key: 'harassment-stalking', group: 'victim', zh: '遭受性骚扰、跟踪或性胁迫', comparable: false,
    denominatorOf: 'women',
    definition: '经历过性骚扰、跟踪或性胁迫的女性。这三类行为的问法在各国差别很大。' },
  { key: 'online-sv', group: 'victim', zh: '遭受网络性骚扰、性勒索或私密影像侵害', comparable: false,
    denominatorOf: 'women',
    definition: '经历过网络性骚扰、以私密影像相要挟或未经同意传播私密影像的女性。' },
  { key: 'trafficking', group: 'victim', zh: '被人口贩运、强迫卖淫或商业性剥削', comparable: false,
    denominatorOf: 'women',
    definition: '被识别或被估计遭受人口贩运与商业性剥削的女性。**已识别案例远少于估计发生数**，'
      + '两者不可混用。' },
  { key: 'conflict-sv', group: 'victim', zh: '冲突相关性暴力', comparable: false,
    denominatorOf: 'women',
    definition: '武装冲突背景下遭受性暴力的女性。冲突地区的统计能力最弱，缺口最大。' },
  { key: 'repro-coercion', group: 'victim', zh: '遭受生殖胁迫、强迫怀孕或避孕破坏', comparable: false,
    denominatorOf: 'women',
    definition: '经历过伴侣阻挠避孕、破坏避孕措施或强迫怀孕、强迫终止妊娠的女性。' },

  /* ---------------------------- 男性施害 ---------------------------- */
  { key: 'perp-any-sv', group: 'perp', zh: '自报曾实施任何形式性暴力', comparable: false,
    denominatorOf: 'men',
    definition: '在匿名调查中自陈曾实施任何形式性暴力的男性。自陈通常低报。' },
  { key: 'perp-rape', group: 'perp', zh: '自报曾实施强奸或强奸未遂', comparable: false,
    denominatorOf: 'men',
    definition: '自陈曾实施强奸或强奸未遂的男性。**问法是否使用「强奸」一词会显著改变结果**——'
      + '只描述具体强迫行为时，承认的比例更高。' },
  { key: 'perp-12m', group: 'perp', zh: '过去 12 个月实施性暴力', comparable: false,
    denominatorOf: 'men',
    definition: '最近一年内自陈实施过性暴力的男性。' },
  { key: 'perp-coercion', group: 'perp', zh: '实施性胁迫', comparable: false,
    denominatorOf: 'men',
    definition: '用持续纠缠、施压、威胁分手或职权关系迫使他人发生性行为的男性。' },
  { key: 'perp-incapacitated', group: 'perp', zh: '对醉酒、熟睡或无法同意者实施性行为', comparable: false,
    denominatorOf: 'men',
    definition: '自陈曾对醉酒、熟睡、失去意识或因其他原因无法表示同意的人实施性行为的男性。' },
  { key: 'perp-unwanted-contact', group: 'perp', zh: '实施非自愿亲吻、触摸或性交', comparable: false,
    denominatorOf: 'men',
    definition: '自陈曾实施非自愿的亲吻、触摸或性交的男性。' },
  { key: 'perp-alcohol-facilitated', group: 'perp', zh: '利用酒精或药物促成性行为', comparable: false,
    denominatorOf: 'men',
    definition: '自陈曾以酒精或药物降低对方拒绝能力以促成性行为的男性。' },
  { key: 'perp-stealthing', group: 'perp', zh: '未经同意移除避孕套', comparable: false,
    denominatorOf: 'men',
    definition: '自陈曾在对方不知情或不同意的情况下移除避孕套的男性。' },
  { key: 'perp-online', group: 'perp', zh: '实施网络性骚扰、性勒索或影像性暴力', comparable: false,
    denominatorOf: 'men',
    definition: '自陈曾实施网络性骚扰、以私密影像要挟或未经同意传播私密影像的男性。' },
  { key: 'perp-minor', group: 'perp', zh: '成年后对未成年人实施线上或线下性行为', comparable: false,
    denominatorOf: 'men',
    definition: '成年后自陈曾对未成年人实施线上或线下性行为的男性。' },
  { key: 'perp-repeat', group: 'perp', zh: '重复实施性暴力', comparable: false,
    denominatorOf: 'men',
    definition: '自陈实施次数在一次以上的男性。多数研究发现施害集中在少数重复施害者身上。' },

  /* --- 以下四项是**司法记录**，不是施害人数。界面上单独成组显示。 --- */
  { key: 'police-suspects', group: 'perp', zh: '警方记录的男性性犯罪嫌疑人', comparable: false,
    definition: '警方登记的嫌疑人数。**这不是施害人数**——绝大多数性暴力从未报案，'
      + '报案的也未必立案。它衡量的是司法系统处理了多少，不是发生了多少。' },
  { key: 'police-arrests', group: 'perp', zh: '被捕人数', comparable: false,
    definition: '因性犯罪被逮捕的人数。同上：这是司法系统的产出，不是发生量。' },
  { key: 'prosecutions', group: 'perp', zh: '被起诉人数', comparable: false,
    definition: '被检方正式起诉的人数。' },
  { key: 'convictions', group: 'perp', zh: '被定罪人数', comparable: false,
    definition: '经法院判决有罪的人数。' },

  /* ---------------------- 幻想、态度与实施倾向 ---------------------- */
  { key: 'fantasy-force', group: 'attitude', zh: '幻想对他人实施非自愿性行为', comparable: false,
    definition: '在研究样本中自陈有过此类幻想的男性比例。性幻想不等于犯罪意图或实际施害。' },
  { key: 'fantasy-incapacitated', group: 'attitude', zh: '幻想与醉酒、熟睡或失去意识者发生性行为', comparable: false,
    definition: '在研究样本中自陈有过此类幻想的男性比例。' },
  { key: 'fantasy-being-forced', group: 'attitude', zh: '幻想自己被强迫发生性行为', comparable: false,
    definition: '在研究样本中自陈有过此类幻想的男性比例。这一项与施害倾向不是同一件事，'
      + '列在这里是为了避免把「强迫情境幻想」整体误读成施害意图。' },
  { key: 'proclivity-if-unpunished', group: 'attitude', zh: '保证不会被发现或惩罚时，自称可能实施强奸', comparable: false,
    definition: '在假设「确信不会被抓」的情境下，自陈有一定可能实施强奸的男性比例。' },
  { key: 'proclivity-behaviour-worded', group: 'attitude', zh: '只描述具体强迫行为、不使用「强奸」一词时承认可能实施', comparable: false,
    definition: '同样的行为，问卷不使用「强奸」这个词时自陈可能实施的男性比例。'
      + '这两种问法的结果差距，本身就是一项发现。' },
  { key: 'rape-myth', group: 'attitude', zh: '接受强奸迷思', comparable: false,
    definition: '在强奸迷思量表上达到接受阈值的男性比例。量表版本不同，分数不可直接相比。' },
  { key: 'consent-misbelief', group: 'attitude', zh: '认为沉默、醉酒、约会或进入住所等于同意', comparable: false,
    definition: '认同上述任一情形构成性同意的男性比例。' },
  { key: 'marital-obligation', group: 'attitude', zh: '认为婚姻或恋爱关系产生性义务', comparable: false,
    definition: '认同配偶或伴侣有义务发生性行为的男性比例。' },
  { key: 'victim-blame', group: 'attitude', zh: '认为受害者应因衣着、饮酒或性经历承担责任', comparable: false,
    definition: '认同受害者对遭遇负有部分责任的男性比例。' },

  /* ---------------------------- 性别差异 ---------------------------- */
  { key: 'gap-rape', group: 'gap', zh: '强奸', comparable: false,
    definition: '同一份调查中，女性与男性遭受强奸的人数与比例。' },
  { key: 'gap-any-sv', group: 'gap', zh: '任何性暴力', comparable: false,
    definition: '同一份调查中，女性与男性遭受任何性暴力的人数与比例。' },
  { key: 'gap-ipsv', group: 'gap', zh: '亲密伴侣性暴力', comparable: false,
    definition: '同一份调查中，女性与男性遭受亲密伴侣性暴力的人数与比例。' },
  { key: 'gap-repeat', group: 'gap', zh: '重复受害', comparable: false,
    definition: '同一份调查中，女性与男性重复遭受性侵的人数与比例。' },
  { key: 'gap-injury', group: 'gap', zh: '严重身体伤害', comparable: false,
    definition: '同一份调查中，女性与男性因暴力受到严重身体伤害的人数与比例。' },
  { key: 'gap-intimate-homicide', group: 'gap', zh: '被伴侣或家庭成员杀害', comparable: true,
    definition: '一年内被亲密伴侣或家庭成员杀害的女性与男性人数。来自凶杀案登记。' },
  { key: 'gap-csa', group: 'gap', zh: '儿童期性侵', comparable: false,
    definition: '同一份调查中，女性与男性在 18 岁前遭受性侵的人数与比例。' },
  { key: 'gap-perp-gender', group: 'gap', zh: '施害者性别', comparable: false,
    definition: '男女受害者所报告的施害者性别构成。' },
  { key: 'gap-reporting', group: 'gap', zh: '报案与求助', comparable: false,
    definition: '男女受害者报案、获得医疗支持及进入司法程序的比例。' },
  { key: 'gap-mental-health', group: 'gap', zh: '创伤后果', comparable: false,
    definition: '男女受害者出现创伤后应激障碍、抑郁、自杀倾向及物质依赖的比例。' },
  { key: 'gap-reproductive', group: 'gap', zh: '生殖后果', comparable: false,
    definition: '女性特有或不成比例承受的怀孕、生殖损伤及生殖胁迫。' },
  { key: 'gap-perpetration', group: 'gap', zh: '自报实施性暴力', comparable: false,
    definition: '同一份调查中，女性与男性自陈实施性暴力的人数与比例。' },
]

export const INDICATOR_MAP: Record<string, Indicator> =
  Object.fromEntries(INDICATORS.map((i) => [i.key, i]))

export const GROUP_MAP: Record<Group, GroupMeta> =
  Object.fromEntries(GROUPS.map((g) => [g.key, g])) as Record<Group, GroupMeta>

/** 司法记录那几项——它们和自陈施害不能放在同一张图上比。 */
export const JUSTICE_RECORD = new Set([
  'police-suspects', 'police-arrests', 'prosecutions', 'convictions',
])

/**
 * 司法漏斗的六级。
 *
 * 这是整个页面里最重要的一张图：它让读者看见性暴力案件是怎么从社会统计
 * 和司法系统里一级一级消失的。每一级同时显示人数和相对上一级的流失比例。
 */
export const FUNNEL_STAGES = [
  { key: 'estimated', zh: '估计发生', note: '来自人口调查的估算，不是登记数。' },
  { key: 'disclosed', zh: '向他人披露', note: '告诉过任何人——朋友、家人、医生。' },
  { key: 'reported', zh: '向警方报案', note: '' },
  { key: 'investigated', zh: '正式立案调查', note: '' },
  { key: 'prosecuted', zh: '起诉', note: '' },
  { key: 'convicted', zh: '定罪', note: '' },
] as const

export type FunnelStage = typeof FUNNEL_STAGES[number]['key']
