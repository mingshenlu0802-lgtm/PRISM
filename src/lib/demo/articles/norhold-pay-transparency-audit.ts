/**
 * PRISM 棱镜 — 演示条目：北屿薪酬透明法三年评估。
 *
 * 全部为虚构演示内容。北屿联合王国、平等事务监察署、西埃斯特里亚审计署、
 * 塞尔瓦劳动法院、「务实前进」竞选团队与本文引用的一切机构、人物与数字都不存在，
 * 也不对应任何真实辖区、真实法律、真实审计或真实案件。
 */
import type { Article, FactCheck, ImageAsset } from '../../types'

export const article: Article = {
  id: 'art-norhold',
  slug: 'norhold-pay-transparency-audit',
  title: '北屿薪酬透明法三年评估：证据支持什么，又被过度解读成了什么',
  titleEn: 'Three years of Norhold’s pay transparency law: what the audit supports, and what it has been stretched to say',
  standfirst:
    '北屿平等事务监察署的第三份法定申报汇总在三月公布。运动方说它证明这部法律有效，反对方说它证明这部法律无用。但这份文件测量的东西，比双方引用它时所说的都要窄——窄到本站自己在初版里也算错了一步减法。',
  countries: ['北屿联合王国'],
  region: '北方群岛',
  topics: ['equality', 'movement'],
  status: 'published',
  createdAt: '2026-08-26T05:12:00Z',
  updatedAt: '2026-08-30T11:05:00Z',
  publishedAt: '2026-08-28T10:00:00Z',
  readingTime: 12,
  confidence: 84,
  confidenceBasis:
    '申报汇总逐家公开原始值、可被外部复算，因此核心数字可靠；限制在于它只覆盖门槛以上的正式雇佣，非正规就业与家务照护劳动完全不在其中，本文关于「这部法律有没有用」的任何判断都只在这个覆盖面之内成立。',
  sections: [
    /* ---------------------------------------------------------------- *
     * 1 · 事件与核心事实
     * ---------------------------------------------------------------- */
    {
      id: 'sec-norhold-facts',
      kind: 'facts',
      title: '事件与核心事实',
      blocks: [
        {
          id: 'blk-norhold-01',
          type: 'paragraph',
          text:
            '北屿平等事务监察署于 2026 年 3 月 25 日公布《法定薪酬差距申报汇总 2026》，这是《薪酬透明法》生效以来的第三份年度汇总。汇总覆盖 4,812 家达到法定申报门槛的雇主，其中 4,357 家按期提交、379 家迟报、76 家至今未报，监察署按惯例同时公布了迟报与未报雇主的名单[[c:cit-norhold-01]]。这份文件在证据链上之所以站得住，是因为它逐家公开了原始申报值：任何人都可以用公开数据把汇总数字重新算一遍，也可以指出哪一家的数字有问题[[c:cit-norhold-03]]。本文以下所有引用的数字都来自这份汇总本身，而不是任何一方对它的转述。',
        },
        {
          id: 'blk-norhold-02',
          type: 'paragraph',
          text:
            '按期申报雇主合计的中位小时工资差距为 11.4%，即女性雇员的中位小时工资比男性低 11.4%[[c:cit-norhold-02]]。必须立刻说清楚这个数字测量的是什么：它是雇主内部全体雇员未经调整的中位数之差，不做同岗位、同职级、同工龄的匹配[[c:cit-norhold-08]]。它能说明一家机构里高薪岗位与低薪岗位如何按性别分布，不能说明任何一位具体雇员是否因性别而被少付工资，也不足以单独支撑一项歧视认定。把「中位数差距」读成「同工不同酬的幅度」，是这份文件被误用得最普遍的一种方式。',
        },
        {
          id: 'blk-norhold-03',
          type: 'paragraph',
          text:
            '第二件必须先说的事，是两个年份的数字不能直接相减。监察署在 2024 年 1 月修订了申报表，把奖金与绩效工资纳入申报口径[[c:cit-norhold-05]]。汇总附录同时给出了两套口径下的回算值：旧口径下 2023 年为 14.1%、2026 年回算为 12.6%；新口径下 2023 年回算为 13.2%、2026 年为 11.4%[[c:cit-norhold-06]]。也就是说三年间的变化在旧口径下是 1.5 个百分点，在新口径下是 1.8 个百分点，而不是把 14.1 减去 11.4 得到的 2.7 个百分点。本站初版做过这个减法，已发出更正，更正记录保留在文末，不做静默替换。',
        },
        {
          id: 'blk-norhold-04',
          type: 'paragraph',
          text:
            '第三件事是覆盖面。申报义务只适用于常年雇员超过法定门槛的雇主，非正规就业完全不在申报范围之内[[c:cit-norhold-04]]。以监察署公布的覆盖雇员数除以其受雇人口口径，这部法律直接触及的大约是全体受雇者的 38%[[c:cit-norhold-10]]；这一比例是本站的计算，不是监察署给出的现成数字，读者可以用同样的两个公开数值复核。家庭雇佣、平台派单、承包与自雇一律不在其中。汇总还披露了一个较少被引用的字段：申报表要求雇主填写缩小差距的行动计划，但只有 62% 的申报附有任何可测量的目标，而法律没有要求任何机构评估这些计划是否被执行[[c:cit-norhold-07]]。',
        },
        {
          id: 'blk-norhold-05',
          type: 'paragraph',
          text:
            '关于首轮申报的规模，本站只能在 2026 年汇总的沿革说明中读到一句转述：2023 年 4 月 6 日截止的首轮共有 4,102 家雇主申报[[c:cit-norhold-09]]。现行公开文件不含 2023 年原始汇总的表格，本站未能回到一手记录核对这个数字，因此它在下面的时间线上被标为「单一来源报道」，而不是「已有一手记录」。',
        },
        {
          id: 'blk-norhold-06',
          type: 'timeline',
          entries: [
            {
              date: '2023-04-06',
              title: '首轮法定申报截止',
              text: '监察署称首轮共 4,102 家雇主申报。本站只在 2026 年汇总的沿革说明中见到这一数字，未取得 2023 年原始汇总[[c:cit-norhold-09]]。',
              citationIds: ['cit-norhold-09'],
              standing: 'reported',
            },
            {
              date: '2024-01-18',
              title: '申报表修订，奖金与绩效工资纳入口径',
              text: '监察署修订申报表，此后的申报值与 2023 年不可直接比较；汇总附录同时提供两套口径的回算值[[c:cit-norhold-05]][[c:cit-norhold-06]]。',
              citationIds: ['cit-norhold-05', 'cit-norhold-06'],
              standing: 'documented',
            },
            {
              date: '2026-02-05',
              title: '西埃斯特里亚审计署发布同工同酬报告',
              text: '在结构类似的披露制度下，审计署发现申报合规率很高、薪酬结构调整却有限，并附上被审计单位反驳意见全文[[c:cit-norhold-14]][[c:cit-norhold-15]]。',
              citationIds: ['cit-norhold-14', 'cit-norhold-15'],
              standing: 'documented',
            },
            {
              date: '2026-02-27',
              title: '春季运动大会通过下调门槛的决议',
              text: '北屿平等组织常设大会以记名表决通过决议，要求把申报门槛下调至更小规模的雇主；会议记录附有票数[[c:cit-norhold-26]]，但发言经秘书处摘要处理，原话无法还原[[c:cit-norhold-28]]。',
              citationIds: ['cit-norhold-26', 'cit-norhold-28'],
              standing: 'documented',
            },
            {
              date: '2026-03-25',
              title: '第三份法定申报汇总公布',
              text: '4,812 家达标雇主、4,357 家按期申报，合计中位小时工资差距 11.4%，逐家原始申报值同步公开[[c:cit-norhold-01]][[c:cit-norhold-02]][[c:cit-norhold-03]]。',
              citationIds: ['cit-norhold-01', 'cit-norhold-02', 'cit-norhold-03'],
              standing: 'documented',
            },
            {
              date: '2026-05-07',
              title: '泛洲面板数据把北屿列为区域内差距最小的辖区',
              text: '面板统一了各辖区口径并公布换算规则，但基础仍是各辖区自报的行政数据，且只覆盖有正式合同的全职岗位[[c:cit-norhold-11]][[c:cit-norhold-12]][[c:cit-norhold-13]]。',
              citationIds: ['cit-norhold-11', 'cit-norhold-12', 'cit-norhold-13'],
              standing: 'documented',
            },
            {
              date: '2026-07-28',
              title: '某竞选团队发布声明称审计证明该法无效',
              text: '声明以监察署数据为基础，但经未公开方法再加权，其中两个百分比无法用公开的原始申报值复现[[c:cit-norhold-20]][[c:cit-norhold-21]]。',
              citationIds: ['cit-norhold-20', 'cit-norhold-21'],
              standing: 'contested',
            },
          ],
        },
        {
          id: 'blk-norhold-07',
          type: 'figure',
          assetId: 'img-norhold-timeline',
          caption: '概念插图 · AI 生成 · 非新闻现场：以折叠刻度表示三年间两次口径变更造成的断点，不代表任何真实机构的视觉标识。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 2 · 法律、历史与社会背景
     * ---------------------------------------------------------------- */
    {
      id: 'sec-norhold-context',
      kind: 'context',
      title: '法律、历史与社会背景',
      blocks: [
        {
          id: 'blk-norhold-08',
          type: 'paragraph',
          text:
            '《薪酬透明法》选择「未经调整的中位数差距」作为法定指标，是一个可复算优先于精确的取舍。要计算同岗位比较，监察署必须要求每一家雇主提交职级映射表，而职级本身由雇主定义，一旦被要求申报就会被重新设计。未调整中位数的好处是雇主无法通过重新命名岗位来改写它，坏处是它把职业隔离、工时结构与晋升史全部压缩进一个数字[[c:cit-norhold-08]]。2024 年把奖金与绩效工资纳入，正是为了堵上另一个可预期的规避路径：在此之前，基本工资之外的部分不必申报[[c:cit-norhold-05]]。',
        },
        {
          id: 'blk-norhold-09',
          type: 'paragraph',
          text:
            '同类制度在其他辖区已有可比的评估。西埃斯特里亚审计署 2026 年 2 月的报告发现，在结构相近的强制披露制度下，申报合规率很高，但被审计单位的薪酬结构调整有限[[c:cit-norhold-14]]；该报告的可读性在于它把被审计单位的反驳意见全文附在后面，读者能直接看到双方分歧落在哪里[[c:cit-norhold-15]]。另一个方向的参照来自司法：塞尔瓦联邦劳动法院 2025 年 6 月的一起晋升歧视判决采信了薪酬回归分析并公开了法院据以推论的依据[[c:cit-norhold-18]]，但同一份判决要求原告提供同职级、同资历的比较对象——机构整体的中位数差距本身不足以支撑歧视认定[[c:cit-norhold-19]]。这两份文件合起来说明了一件事：披露制度产生的数字，在政治场域里被当作结论，在法庭里只被当作线索。',
        },
        {
          id: 'blk-norhold-10',
          type: 'paragraph',
          text:
            '社会史的部分比法条更难量化。跨区域的照护劳动综述指出，无酬照护时间的分配与劳动力市场参与程度之间存在稳定关联，并把兼职化、职业中断与晋升延迟作为主要中介机制[[c:cit-norhold-16]]；该综述同时明确写出自己的限制——纳入的研究多来自高收入辖区，对其他地区的外推能力有限[[c:cit-norhold-17]]。这一点值得读者留意：北屿本身属于该综述覆盖较好的一类辖区，所以在本文中引用它是合适的，但同一段论证不能被搬到覆盖薄弱的辖区去。',
        },
        {
          id: 'blk-norhold-11',
          type: 'callout',
          tone: 'evidence',
          title: '这份申报汇总能回答与不能回答的问题',
          text:
            '能回答：门槛以上的雇主里，男女雇员的中位小时工资相差多少；有多少雇主按时履行了申报义务；有多少申报附了可测量的目标[[c:cit-norhold-01]][[c:cit-norhold-07]]。不能回答：任何一位雇员是否因性别被少付工资；差距的变化中有多少可归因于这部法律而不是同期的产业结构变动；门槛以下与非正规就业中的差距是多少[[c:cit-norhold-04]][[c:cit-norhold-08]]。汇总本身没有设置对照组，也不包含任何反事实估计。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 3 · 权力结构与交叉性分析
     * ---------------------------------------------------------------- */
    {
      id: 'sec-norhold-power',
      kind: 'power',
      title: '权力结构与交叉性分析',
      blocks: [
        {
          id: 'blk-norhold-12',
          type: 'paragraph',
          text:
            '一部只测量门槛之内的法律，会把门槛之外的不平等记成零。北屿华语移民妇女法律互助会的年度个案观察显示，其受理的家务、清洁与住家照护岗位求助个案中，雇主规模普遍在申报门槛以下，因而这些岗位的薪酬从未进入任何一份法定汇总[[c:cit-norhold-24]]；该报告同时写明样本仅限主动求助者，不能推及全体移民妇女[[c:cit-norhold-25]]，所以它能证明「这些岗位在门槛之外」，不能证明「这些岗位的差距有多大」。这是本文所依赖的证据能走到的边界，本站不越过它。',
        },
        {
          id: 'blk-norhold-13',
          type: 'paragraph',
          text:
            '第二重结构性问题在于类目本身。申报只按性别二分，不按族裔、移民身份、残障状况、工时类型或雇佣形式分列[[c:cit-norhold-08]]。这意味着一家机构可以在把女性集中在兼职与固定期限合同的同时，让中位数差距下降——只要低薪男性岗位同步外包出去。本站的判断是：在没有分列数据的情况下，「差距缩小」这一表述无法区分「低薪女性的处境改善」与「低薪岗位被移出了申报范围」，而现有公开数据不足以判定两者各占多少。这是编辑判断，不是监察署的认定。',
        },
        {
          id: 'blk-norhold-14',
          type: 'paragraph',
          text:
            '第三重问题是谁有资格在这套制度里说话。监察署的认可团体登记名册决定哪些组织进入法定咨询程序[[c:cit-norhold-22]]；名册按季度更新、并公布被拒登记的理由，因此增减是可核对的[[c:cit-norhold-23]]。可核对不等于可进入：一个只服务住家照护工的小型互助组织，即使掌握着门槛之外最完整的一手材料，也需要先具备登记所要求的组织形式，才能把这些材料递进咨询程序。制度的入口条件本身就在筛选证据。',
        },
        {
          id: 'blk-norhold-15',
          type: 'pullquote',
          text: '一部只能看见门槛之内的法律，会把门槛之外的不平等记成零——而记成零的东西，在下一轮评估里就不再需要解释。',
          attribution: 'PRISM 编辑判断',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 4 · 相关研究与数据
     * ---------------------------------------------------------------- */
    {
      id: 'sec-norhold-research',
      kind: 'research',
      title: '相关研究与数据',
      blocks: [
        {
          id: 'blk-norhold-16',
          type: 'paragraph',
          text:
            '泛洲人权理事会经济与社会权利处的区域面板数据把北屿列为区域内中位小时工资差距最小的辖区之一，2025 年数值为 11.4%[[c:cit-norhold-11]]。这条排名被引用得很频繁，因此它的口径需要写在图旁边而不是脚注里：面板统一了各辖区口径并公布了换算规则，但基础仍是各辖区自报的行政数据[[c:cit-norhold-12]]，且只覆盖有正式雇佣合同的全职岗位[[c:cit-norhold-13]]。',
        },
        {
          id: 'blk-norhold-17',
          type: 'chart',
          chartId: 'chart-paygap-compare',
        },
        {
          id: 'blk-norhold-18',
          type: 'paragraph',
          text:
            '这张图最容易被误读的地方是它的排序。非正规就业比重越高的辖区，被排除在分母之外的低薪劳动就越多，数值因此会系统性偏低——排名靠前既可能意味着差距真的小，也可能意味着差距最大的那部分劳动根本没有被计入[[c:cit-norhold-13]]。各辖区的行业结构与工时定义也未做调整[[c:cit-norhold-12]]。因此这张图可以用来说明「各辖区在同一口径下的相对位置」，不能用来说明「哪个辖区的性别歧视更严重」，本站在图注中把这两句话都写了出来。',
        },
        {
          id: 'blk-norhold-19',
          type: 'paragraph',
          text:
            '在因果方向上，可用的研究只到关联为止。照护劳动综述报告的是无酬照护时间与劳动力市场参与之间的关联，并把兼职化与职业中断标为主要中介机制[[c:cit-norhold-16]]，但综述本身没有、也不声称有识别因果的设计，且纳入研究集中在高收入辖区[[c:cit-norhold-17]]。另一条与本文直接相关的研究线索来自一项多点民族志：在资源紧缩的条件下，组织倾向于把可量化、可申报的指标当作运动目标，因为这些指标更容易向资助方与媒体交代[[c:cit-norhold-27]]。该研究覆盖四个辖区的六家组织，作者明确表示不追求代表性，因此它只能作为解释框架的候选，不能作为北屿情况的证据。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 5 · 不同来源之间的分歧
     * ---------------------------------------------------------------- */
    {
      id: 'sec-norhold-divergence',
      kind: 'divergence',
      title: '不同来源之间的分歧',
      blocks: [
        {
          id: 'blk-norhold-20',
          type: 'divergence',
          positions: [
            {
              label: '透明法在它触及的范围内起了作用，但那个范围本身才是主要问题',
              holder: '北屿平等事务监察署（汇总的方法说明部分）与西埃斯特里亚审计署',
              position:
                '强制申报确实提高了合规与可核查程度，差距在两套口径下都有小幅收窄；但披露不等于调整，且制度设计把最不稳定的那部分劳动排除在外[[c:cit-norhold-04]][[c:cit-norhold-07]]。',
              evidence:
                '监察署逐家公开原始申报值、可被外部复算[[c:cit-norhold-03]]；两套口径的回算值都由监察署自己给出[[c:cit-norhold-06]]；西埃斯特里亚审计署在结构相近的制度下得到方向一致的结论，且附反驳意见全文[[c:cit-norhold-14]][[c:cit-norhold-15]]。',
              citationIds: ['cit-norhold-03', 'cit-norhold-04', 'cit-norhold-06', 'cit-norhold-07', 'cit-norhold-14', 'cit-norhold-15'],
              weight: 'strong',
            },
            {
              label: '透明法有效，应当扩大适用范围',
              holder: '北屿平等组织常设大会多数派',
              position:
                '三年间差距持续收窄，说明强制披露本身产生了压力；下一步应把申报门槛下调到更小规模的雇主，让更多劳动进入可核查的范围[[c:cit-norhold-26]]。',
              evidence:
                '春季大会以记名表决通过下调门槛的决议，票数记录在案[[c:cit-norhold-26]]；差距在两套口径下均有收窄，这一点由汇总附录支持[[c:cit-norhold-06]]。但「收窄由这部法律造成」缺少任何对照或反事实估计，汇总本身也未作此主张[[c:cit-norhold-02]]；会议记录经秘书处摘要处理，无法核对各方的完整论证[[c:cit-norhold-28]]。',
              citationIds: ['cit-norhold-02', 'cit-norhold-06', 'cit-norhold-26', 'cit-norhold-28'],
              weight: 'moderate',
            },
            {
              label: '透明法没有效果，应当废止申报义务',
              holder: '北屿「务实前进」竞选团队',
              position:
                '审计数字说明申报企业与其他企业的差距没有实质区别，制度只制造了行政成本[[c:cit-norhold-20]]。',
              evidence:
                '该声明以监察署数据为基础，但对其做了未公开方法的再加权，其中两个百分比无法用监察署公开的原始申报值复现[[c:cit-norhold-21]]。更关键的是，未申报雇主没有任何薪酬申报记录存在[[c:cit-norhold-01]][[c:cit-norhold-04]]，因此声明所主张的那种比较在现有数据中无法成立——不是结论错误，而是所需的对照数据并不存在。',
              citationIds: ['cit-norhold-01', 'cit-norhold-04', 'cit-norhold-20', 'cit-norhold-21'],
              weight: 'weak',
            },
          ],
        },
        {
          id: 'blk-norhold-21',
          type: 'paragraph',
          text:
            '本站不把这三种立场并列为「三种看法」。第一种最强，因为它的每一句话都能回到监察署自己公布的方法说明与逐家原始值，且有另一个辖区结构相近的独立审计给出方向一致的结论[[c:cit-norhold-03]][[c:cit-norhold-14]]。第二种居中：它对「谁没被计入」的描述准确，但把「差距收窄」归因于这部法律的那一步没有对照组支撑，而这一步恰恰是它主张扩大适用范围的理由——立场与本站的价值取向接近，并不构成降低证据要求的理由。第三种最弱，不是因为它政治上不受欢迎，而是因为它引用的两个百分比无法复现，且它声称做出的比较所需要的对照数据在制度上不可能存在[[c:cit-norhold-21]]。如果该团队公布其加权方法，本站会重新评估这一评级。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 6 · 事实核查
     * ---------------------------------------------------------------- */
    {
      id: 'sec-norhold-factcheck',
      kind: 'factcheck',
      title: '事实核查',
      blocks: [
        {
          id: 'blk-norhold-22',
          type: 'paragraph',
          text:
            '本文核查了两条正在流传的具体说法。两条都不是凭空捏造：它们都以监察署公布的真实数字为起点，问题出在把数字接到结论上的那一步。第一条的初次结论后来被本站修订，修订理由与旧结论一并公开保留；第二条无法核实的原因写在核查记录里，无法核实不等于该说法为假，也不等于相反的说法成立。',
        },
        {
          id: 'blk-norhold-23',
          type: 'list',
          items: [
            '「薪酬透明法实施三年，北屿的性别薪酬差距下降了 2.7 个百分点」——具有误导性。两个端点分属不同申报口径，监察署自己在附录中给出的同口径变化是 1.5 与 1.8 个百分点[[c:cit-norhold-06]]。',
            '「审计数据显示申报企业与未申报企业的薪酬差距没有区别」——无法核实。未申报雇主不存在薪酬申报记录，该比较所需的数据在制度上不存在；声明所用的加权方法也未公布[[c:cit-norhold-04]][[c:cit-norhold-21]]。',
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 7 · 尚未确定的信息
     * ---------------------------------------------------------------- */
    {
      id: 'sec-norhold-unknowns',
      kind: 'unknowns',
      title: '尚未确定的信息',
      blocks: [
        {
          id: 'blk-norhold-24',
          type: 'callout',
          tone: 'unknown',
          title: '本文没有回答，也无法用现有材料回答的问题',
          text:
            '这份汇总没有对照组，没有反事实估计，没有按族裔、移民身份、残障状况或雇佣形式分列的数据，也不覆盖门槛以下的雇主[[c:cit-norhold-04]][[c:cit-norhold-08]]。因此「这部法律是否有效」这个问题，在现有公开材料下只能被回答到「在它覆盖的 38% 受雇者中，申报值出现了 1.5 至 1.8 个百分点的收窄」为止[[c:cit-norhold-06]][[c:cit-norhold-10]]。',
        },
        {
          id: 'blk-norhold-25',
          type: 'list',
          items: [
            '收窄中有多少可归因于这部法律？需要一份带对照设计的评估（例如按门槛两侧比较相近规模雇主的断点分析）。监察署未发布任何此类分析，汇总本身也不提供雇主层级的历史面板[[c:cit-norhold-03]]。',
            '门槛以下与非正规就业中的差距是多少？需要一次覆盖家务、照护与平台派单的抽样调查。目前只有移民妇女法律互助会的求助个案记录，样本仅限主动求助者[[c:cit-norhold-24]][[c:cit-norhold-25]]。',
            '62% 之外那些没有可测量目标的申报，行动计划里写了什么？申报表的行动计划字段为自由文本，监察署公布了填报率但未公布文本内容[[c:cit-norhold-07]]。',
            '差距的变化中有多少来自低薪岗位被外包出申报范围？需要雇主层级的岗位构成变动数据，现行申报表不采集这一项[[c:cit-norhold-08]]。',
            '「务实前进」竞选团队的两个百分比是怎么算出来的？该团队未公布加权方法；本站已就此提出书面查询，截至发稿未获答复[[c:cit-norhold-21]]。',
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 8 · 事件为何重要
     * ---------------------------------------------------------------- */
    {
      id: 'sec-norhold-why',
      kind: 'why',
      title: '事件为何重要',
      blocks: [
        {
          id: 'blk-norhold-26',
          type: 'paragraph',
          text:
            '以下是本站的编辑分析，与上面的报道部分分开阅读。薪酬透明法之所以值得反复检查，不是因为 11.4% 这个数字本身，而是因为它是少数几个每年都会被重新生产、并且各方都同意其存在的公共数字之一。一个可复算的数字会迅速变成政治资源：主张扩大制度的人需要它下降，主张废止制度的人需要它停滞，而两边都会倾向于跳过口径变更这类降低故事强度的细节[[c:cit-norhold-05]][[c:cit-norhold-06]]。这一次本站自己也跳过了，所以这篇报道的第一句更正是关于本站的。',
        },
        {
          id: 'blk-norhold-27',
          type: 'paragraph',
          text:
            '本站的第二个判断是：这类制度真正的分配效果，可能主要发生在它的边界上而不是它的内部。当申报义务只落在门槛以上的雇主身上时，把低薪岗位移到门槛之外既能降低申报值又不必改变任何人的处境；而门槛之外的劳动——住家照护、清洁、平台派单——恰好集中着移民女性与工时最不稳定的人[[c:cit-norhold-24]]。这是一个可以被检验的假设，不是一个已经成立的结论：要检验它，需要雇主层级的岗位构成变动数据，而现行申报表不采集这一项[[c:cit-norhold-08]]。在拿到那份数据之前，本站会继续把「差距收窄」写成一个只在覆盖面之内成立的陈述。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 9 · 后续值得关注的进展
     * ---------------------------------------------------------------- */
    {
      id: 'sec-norhold-watch',
      kind: 'watch',
      title: '后续值得关注的进展',
      blocks: [
        {
          id: 'blk-norhold-28',
          type: 'list',
          items: [
            '2026 年 10 月：监察署预告将公布 76 家未申报雇主的执法处理结果。要看的是有多少家被实际科处罚则，以及处理结果是否按雇主规模分列[[c:cit-norhold-01]]。',
            '2026 年 12 月：常设大会下调门槛的决议是否被提交为正式立法动议。要看的是动议文本中的门槛数值，以及是否附带把家务与照护雇佣纳入的条款[[c:cit-norhold-26]]。',
            '2027 年 1 月：监察署是否在申报表中新增按雇佣形式或工时类型分列的字段。这是判断「低薪岗位是否被移出申报范围」的唯一可行路径[[c:cit-norhold-08]]。',
            '2027 年 2 月：西埃斯特里亚审计署的后续跟踪报告。要看的是被审计单位在反驳意见中提出的口径异议是否被采纳[[c:cit-norhold-15]]。',
            '2027 年 3 月：第四份法定申报汇总。要看的是新口径下 2027 年的数值，以及监察署是否继续提供旧口径回算值——一旦停止提供，跨年比较将再次失去可核对的基础[[c:cit-norhold-06]]。',
            '待定：「务实前进」竞选团队是否公布其加权方法。若公布，本站将重新核查该声明并公开修订结论[[c:cit-norhold-21]]。',
          ],
        },
      ],
    },
  ],

  /* ------------------------------------------------------------------ *
   * 引用
   * ------------------------------------------------------------------ */
  citations: [
    { id: 'cit-norhold-01', sourceId: 'src-norhold-pay-audit-2026', locator: '汇总表 1 · 申报状态', claim: '2026 年申报汇总覆盖 4,812 家达到法定门槛的雇主，其中 4,357 家按期申报、379 家迟报、76 家未申报，迟报与未报名单一并公布。' },
    { id: 'cit-norhold-02', sourceId: 'src-norhold-pay-audit-2026', locator: '汇总表 3 · 合计值', claim: '按期申报雇主合计的中位小时工资差距为 11.4%。' },
    { id: 'cit-norhold-03', sourceId: 'src-norhold-pay-audit-2026', locator: '数据说明 §1', claim: '监察署逐家公开原始申报值，任何汇总数字都可以由外部重新计算。' },
    { id: 'cit-norhold-04', sourceId: 'src-norhold-pay-audit-2026', locator: '适用范围说明', claim: '申报义务只适用于常年雇员超过法定门槛的雇主，非正规就业完全不在申报范围之内。' },
    { id: 'cit-norhold-05', sourceId: 'src-norhold-pay-audit-2026', locator: '沿革说明 §2', claim: '监察署于 2024 年 1 月修订申报表，把奖金与绩效工资纳入申报口径。' },
    { id: 'cit-norhold-06', sourceId: 'src-norhold-pay-audit-2026', locator: '附录 B · 双口径回算', claim: '旧口径下 2023 年为 14.1%、2026 年回算为 12.6%；新口径下 2023 年回算为 13.2%、2026 年为 11.4%。' },
    { id: 'cit-norhold-07', sourceId: 'src-norhold-pay-audit-2026', locator: '汇总表 6 · 行动计划字段', claim: '只有 62% 的申报附有可测量的目标，法律未要求任何机构评估行动计划是否被执行。' },
    { id: 'cit-norhold-08', sourceId: 'src-norhold-pay-audit-2026', locator: '指标定义 §3', claim: '申报值为全体雇员未经调整的中位数之差，不做同岗位、同职级匹配，也不按族裔、移民身份、残障状况或雇佣形式分列。' },
    { id: 'cit-norhold-09', sourceId: 'src-norhold-pay-audit-2026', locator: '沿革说明 §1', claim: '2023 年 4 月 6 日截止的首轮申报共有 4,102 家雇主提交；该数字仅以转述形式出现，文件不含 2023 年原始汇总表。' },
    { id: 'cit-norhold-10', sourceId: 'src-norhold-pay-audit-2026', locator: '覆盖雇员数 + 受雇人口口径说明', claim: '以公开的覆盖雇员数除以监察署的受雇人口口径，申报制度直接触及约 38% 的受雇者（本站计算）。' },
    { id: 'cit-norhold-11', sourceId: 'src-pancont-equality-panel-2026', locator: '面板表 2 · 辖区排序', claim: '2025 年面板数据中北屿联合王国的中位小时工资差距为 11.4%，为区域内最小的一组。' },
    { id: 'cit-norhold-12', sourceId: 'src-pancont-equality-panel-2026', locator: '方法说明 §2', claim: '面板统一了各辖区口径并公布换算规则，但基础仍是各辖区自报的行政数据，行业结构与工时定义未作调整。' },
    { id: 'cit-norhold-13', sourceId: 'src-pancont-equality-panel-2026', locator: '方法说明 §4 · 覆盖范围', claim: '面板只覆盖有正式雇佣合同的全职岗位，非正规就业、兼职与无酬照护劳动被排除在外。' },
    { id: 'cit-norhold-14', sourceId: 'src-estria-west-audit-office-2026', locator: '结论 §5', claim: '在结构相近的强制披露制度下，申报合规率很高但被审计单位的薪酬结构调整有限。' },
    { id: 'cit-norhold-15', sourceId: 'src-estria-west-audit-office-2026', locator: '附件 · 被审计单位反驳意见', claim: '报告全文附被审计单位的反驳意见，双方分歧点可直接对照。' },
    { id: 'cit-norhold-16', sourceId: 'src-transregional-care-labour-2026', locator: '综述结果 §3', claim: '无酬照护时间的分配与劳动力市场参与之间存在稳定关联，兼职化与职业中断是主要中介机制。' },
    { id: 'cit-norhold-17', sourceId: 'src-transregional-care-labour-2026', locator: '局限说明', claim: '综述纳入的研究多来自高收入辖区，作者明确指出对其他地区的外推能力有限。' },
    { id: 'cit-norhold-18', sourceId: 'src-selva-labour-court-2025', locator: '判决理由 §4', claim: '塞尔瓦联邦劳动法院在一起晋升歧视案中采信薪酬回归分析，并公开了据以推论的依据。' },
    { id: 'cit-norhold-19', sourceId: 'src-selva-labour-court-2025', locator: '判决理由 §6', claim: '同一判决要求原告提供同职级、同资历的比较对象，机构整体的中位数差距本身不足以支撑歧视认定。' },
    { id: 'cit-norhold-20', sourceId: 'src-norhold-campaign-statement-2026', locator: '声明第 2 段', claim: '该竞选团队称审计数据显示申报企业与其他企业的薪酬差距没有实质区别，制度只制造行政成本。' },
    { id: 'cit-norhold-21', sourceId: 'src-norhold-campaign-statement-2026', locator: '声明附表', claim: '声明中的两个百分比经未公开方法再加权，无法用监察署公开的原始申报值复现。' },
    { id: 'cit-norhold-22', sourceId: 'src-norhold-equality-register-2026', locator: '名册说明 §1', claim: '认可团体登记名册决定哪些组织进入监察署的法定咨询程序。' },
    { id: 'cit-norhold-23', sourceId: 'src-norhold-equality-register-2026', locator: '名册说明 §3 · 拒绝登记理由', claim: '名册按季度更新并公布被拒登记的理由，增减情况可以核对。' },
    { id: 'cit-norhold-24', sourceId: 'src-norhold-diaspora-legal-aid-2026', locator: '个案分类 §2', claim: '受理的家务、清洁与住家照护岗位求助个案中，雇主规模普遍在法定申报门槛以下。' },
    { id: 'cit-norhold-25', sourceId: 'src-norhold-diaspora-legal-aid-2026', locator: '方法与限制', claim: '报告样本仅限主动向该机构求助者，不能推及全体移民妇女。' },
    { id: 'cit-norhold-26', sourceId: 'src-norhold-assembly-minutes-2026', locator: '议程 4 · 表决记录', claim: '2026 年春季运动大会以记名表决通过决议，要求把法定申报门槛下调至更小规模的雇主。' },
    { id: 'cit-norhold-27', sourceId: 'src-transregional-movement-fieldwork-2025', locator: '讨论 §5', claim: '在资源紧缩条件下，组织倾向于把可量化、可申报的指标当作运动目标；研究覆盖四个辖区的六家组织，不追求代表性。' },
    { id: 'cit-norhold-28', sourceId: 'src-norhold-assembly-minutes-2026', locator: '秘书处说明', claim: '会议记录经秘书处摘要处理，发言原话与被删节部分无法还原。' },
  ],

  sourceIds: [
    'src-norhold-pay-audit-2026',
    'src-pancont-equality-panel-2026',
    'src-estria-west-audit-office-2026',
    'src-transregional-care-labour-2026',
    'src-selva-labour-court-2025',
    'src-norhold-campaign-statement-2026',
    'src-norhold-equality-register-2026',
    'src-norhold-diaspora-legal-aid-2026',
    'src-norhold-assembly-minutes-2026',
    'src-transregional-movement-fieldwork-2025',
  ],

  factCheckIds: ['fc-norhold-01', 'fc-norhold-02'],

  riskFlags: [
    {
      id: 'risk-norhold-01',
      kind: 'bias',
      severity: 'medium',
      note: '本文的核心结论对本站在选题上更接近的一方不利：它指出运动方引用的降幅被高估。自动审查提示检查两个方向——是否因立场契合而放宽了对运动方数字的要求，以及是否为了显示中立而对竞选团队的说法过度让步。',
      requiresSecondConfirm: false,
      raisedBy: 'ai-review',
      resolved: true,
      resolutionNote: '编辑复核后对两方采用同一条标准：数字必须能用监察署公开的原始申报值复现。运动方的 2.7 个百分点与竞选团队的两个百分比都未通过这一条，两者在正文与核查中分别写明，未做对称化处理。',
    },
    {
      id: 'risk-norhold-02',
      kind: 'defamation',
      severity: 'low',
      note: '文中对某竞选团队数据处理方式的批评具有可诉风险，须逐句归因到可核对的公开文件，不得由此推断该团队的动机。',
      requiresSecondConfirm: false,
      raisedBy: 'legal-check',
      resolved: true,
      resolutionNote: '所有相关表述均改为对文件本身的描述（「无法用公开原始值复现」「加权方法未公布」），删去了初稿中一处关于该团队意图的推断。已向该团队发出书面查询并在正文注明截至发稿未获答复。',
    },
    {
      id: 'risk-norhold-03',
      kind: 'image-ethics',
      severity: 'low',
      note: '封面与时间线配图为 AI 生成，须标注为概念插图，且不得出现可被误认为真实机构标识或真实职场场景的元素。',
      requiresSecondConfirm: false,
      raisedBy: 'ai-review',
      resolved: true,
      resolutionNote: '两张配图均改为抽象几何构图并加注「概念插图 · AI 生成 · 非新闻现场」，图注中同时写明数据来源与该图无法说明的内容。',
    },
  ],

  citationChecks: [
    { citationId: 'cit-norhold-01', status: 'pass', reason: '自动核查在申报汇总表 1 中定位到四个数值（4,812 / 4,357 / 379 / 76）与迟报名单链接，四项全部一致。', checkedAt: '2026-08-27T22:14:00Z' },
    { citationId: 'cit-norhold-02', status: 'pass', reason: '合计中位差距 11.4% 在汇总表 3 中可直接读到，并与逐家原始值重新加权计算的结果一致（差异小于 0.05 个百分点）。', checkedAt: '2026-08-27T22:15:00Z' },
    { citationId: 'cit-norhold-03', status: 'pass', reason: '核查抽取了 40 家雇主的逐家申报值并重算合计，确认「可被外部复算」这一表述成立。', checkedAt: '2026-08-27T22:18:00Z' },
    { citationId: 'cit-norhold-04', status: 'pass', reason: '适用范围说明中「非正规就业不在申报范围」为文件原文表述，核查已定位到具体段落。', checkedAt: '2026-08-27T22:20:00Z' },
    { citationId: 'cit-norhold-05', status: 'pass', reason: '沿革说明第 2 段载明 2024 年 1 月的申报表修订与纳入项目，日期与内容均一致。', checkedAt: '2026-08-27T22:21:00Z' },
    { citationId: 'cit-norhold-06', status: 'pass', reason: '附录 B 的双口径回算表中四个数值全部定位到，且 14.1→12.6 与 13.2→11.4 两条序列的差值与正文表述一致。', checkedAt: '2026-08-29T14:40:00Z' },
    { citationId: 'cit-norhold-07', status: 'pass', reason: '汇总表 6 载明行动计划字段填报率 62%；核查另确认文件中没有任何关于计划执行评估的规定。', checkedAt: '2026-08-27T22:25:00Z' },
    { citationId: 'cit-norhold-08', status: 'warn', reason: '「不做同岗位匹配」与「不按族裔、移民身份、残障状况分列」两点均可在指标定义中核实；但「不按雇佣形式分列」一项是核查从申报表字段清单中反推的结论，文件未作明文说明。', checkedAt: '2026-08-27T22:28:00Z' },
    { citationId: 'cit-norhold-09', status: 'fail', reason: '核查在 2026 年汇总的沿革说明中定位到 4,102 这一转述，但该文件不含 2023 年原始汇总的表格或链接，无法回到一手记录核对。正文与时间线已据此标注为单一来源报道。', checkedAt: '2026-08-27T22:31:00Z' },
    { citationId: 'cit-norhold-10', status: 'warn', reason: '38% 由本站以覆盖雇员数除以受雇人口口径得出，两个分项数值均可在文件中定位，但比值本身未出现在任何来源中；自动核查只能验证分子分母，不能验证该比值的口径一致性。', checkedAt: '2026-08-27T22:34:00Z' },
    { citationId: 'cit-norhold-11', status: 'pass', reason: '面板表 2 中北屿的 11.4% 与排序位置均可定位，且与监察署申报汇总的合计值一致。', checkedAt: '2026-08-27T22:37:00Z' },
    { citationId: 'cit-norhold-12', status: 'pass', reason: '方法说明第 2 段原文载明换算规则公开与自报行政数据两点。', checkedAt: '2026-08-27T22:38:00Z' },
    { citationId: 'cit-norhold-13', status: 'pass', reason: '方法说明第 4 段明确覆盖范围为「有正式雇佣合同的全职岗位」，与图表的 limitation 字段表述一致。', checkedAt: '2026-08-27T22:39:00Z' },
    { citationId: 'cit-norhold-14', status: 'pass', reason: '审计署结论第 5 节载明合规率与结构调整之间的落差，核查已比对原文与译文两个版本。', checkedAt: '2026-08-27T22:44:00Z' },
    { citationId: 'cit-norhold-15', status: 'pass', reason: '报告附件包含被审计单位反驳意见全文，核查确认其为完整文本而非摘要。', checkedAt: '2026-08-27T22:45:00Z' },
    { citationId: 'cit-norhold-16', status: 'warn', reason: '综述确实报告了照护时间与劳动力市场参与的关联，但正文使用的「稳定关联」一语在原文中对应的是「多数纳入研究中方向一致」；核查提示不要把它读作效应量的陈述。', checkedAt: '2026-08-27T22:49:00Z' },
    { citationId: 'cit-norhold-17', status: 'pass', reason: '局限说明段落中明确写有纳入研究的辖区偏向与外推限制。', checkedAt: '2026-08-27T22:50:00Z' },
    { citationId: 'cit-norhold-18', status: 'pass', reason: '判决理由第 4 节载明法院采信薪酬回归分析并公开推论依据。', checkedAt: '2026-08-27T22:54:00Z' },
    { citationId: 'cit-norhold-19', status: 'warn', reason: '判决要求提供同职级同资历比较对象一点可以定位；但「机构整体差距不足以支撑歧视认定」是核查对判决理由第 6 节的概括，判决原文使用的是较窄的表述，只针对本案证据结构。', checkedAt: '2026-08-27T22:56:00Z' },
    { citationId: 'cit-norhold-20', status: 'pass', reason: '声明第 2 段的表述可逐字定位；核查同时记录该来源为党派材料，正文已并列监察署原始值。', checkedAt: '2026-08-29T09:02:00Z' },
    { citationId: 'cit-norhold-21', status: 'fail', reason: '自动核查尝试用监察署公开的逐家原始申报值复现该声明附表中的两个百分比，四种常见加权方式均无法得到相近结果；声明本身不含计算过程，核查判定为无法验证。正文与核查记录已据此改写。', checkedAt: '2026-08-29T09:07:00Z' },
    { citationId: 'cit-norhold-22', status: 'pass', reason: '名册说明第 1 节载明登记与法定咨询程序之间的连接关系。', checkedAt: '2026-08-27T23:02:00Z' },
    { citationId: 'cit-norhold-23', status: 'pass', reason: '核查比对了名册的两个季度版本，确认拒绝登记理由随版本公布且增减可追溯。', checkedAt: '2026-08-27T23:04:00Z' },
    { citationId: 'cit-norhold-24', status: 'warn', reason: '「雇主规模普遍在门槛以下」可在个案分类第 2 节中读到，但该报告未公布各类个案的具体家数，核查无法核实「普遍」对应的比例。', checkedAt: '2026-08-27T23:09:00Z' },
    { citationId: 'cit-norhold-25', status: 'pass', reason: '方法与限制章节原文载明样本仅限主动求助者，表述与正文一致。', checkedAt: '2026-08-27T23:10:00Z' },
    { citationId: 'cit-norhold-26', status: 'pass', reason: '会议记录议程 4 载有记名表决结果与票数，核查确认决议文本包含下调门槛的要求。', checkedAt: '2026-08-27T23:14:00Z' },
    { citationId: 'cit-norhold-27', status: 'warn', reason: '相关论述分布在讨论章节的三处，核查无法定位到单一段落；且该研究覆盖四个辖区六家组织、作者声明不追求代表性，正文已按「解释框架候选」而非证据使用。', checkedAt: '2026-08-27T23:18:00Z' },
    { citationId: 'cit-norhold-28', status: 'pass', reason: '秘书处说明中载明记录经摘要处理，核查确认原始发言稿未随记录公布。', checkedAt: '2026-08-27T23:19:00Z' },
  ],

  assetIds: ['img-norhold-cover', 'img-norhold-chart', 'img-norhold-timeline'],
  chartIds: ['chart-paygap-compare'],

  translations: [
    { lang: 'en', label: 'English', status: 'human-reviewed', title: 'Three years of Norhold’s pay transparency law: what the audit supports, and what it has been stretched to say', standfirst: 'The Inspectorate’s third statutory return is narrower than either side quoting it admits — narrow enough that PRISM got a subtraction wrong in its first version.' },
    { lang: 'es', label: 'Español', status: 'machine-draft', title: 'Tres años de la ley de transparencia salarial de Norhold: qué sostiene la auditoría y qué se le ha hecho decir' },
    { lang: 'fr', label: 'Français', status: 'machine-draft', title: 'Trois ans de la loi sur la transparence salariale de Norhold : ce que l’audit établit et ce qu’on lui fait dire' },
    { lang: 'ar', label: 'العربية', status: 'not-started' },
  ],

  corrections: [
    {
      id: 'cor-norhold-01',
      at: '2026-08-29T15:20:00Z',
      kind: 'correction',
      text: '本文初版写道「监察署的申报汇总显示差距三年间收窄了 2.7 个百分点」，这是把 2023 年旧口径下的 14.1% 与 2026 年新口径下的 11.4% 直接相减得到的。监察署在 2024 年 1 月把奖金与绩效工资纳入申报口径，两个端点不可直接相减；文件附录本身提供了同口径回算值，同口径下的变化为 1.5（旧口径）与 1.8（新口径）个百分点。已删去「收窄 2.7 个百分点」这一表述，改为分别列出两套口径的数值，并在正文中说明口径变更。错误发生在本站的初稿撰写与复核两个环节，不由来源承担。',
      by: '值班主编（平等议题）',
    },
    {
      id: 'cor-norhold-02',
      at: '2026-08-30T11:05:00Z',
      kind: 'clarification',
      text: '本文初版称某竞选团队「引用了监察署的数据」。该团队确实以监察署数据为起点，但对其做了未公开方法的再加权，声明中的两个百分比无法用监察署公开的逐家原始申报值复现。原表述可能被读成该团队直接转载了官方数字，因此已改写为「以监察署数据为基础、经未公开方法再加权后得出的两个百分比」，并在正文与核查记录中说明该来源属于党派材料。这是澄清而非更正：初版没有陈述错误的事实，但表述不够精确。',
      by: '事实核查编辑',
    },
  ],

  currentVersionId: 'ver-norhold-1',
  byline: 'PRISM 自动编辑台起草 · 平等议题编辑组复核',
  provenance:
    '自动编辑台完成多语搜集、申报汇总的逐家原始值复算、跨辖区面板比对与引用初检；人类编辑重写了口径变更部分、发出并签署了两条更正记录、把民族志证据从论据降级为解释框架候选，并作出最终发布决定。',
  featured: false,
  demo: true,
}

/* ==================================================================== *
 * 事实核查记录
 * ==================================================================== */

export const factChecks: FactCheck[] = [
  {
    id: 'fc-norhold-01',
    articleId: 'art-norhold',
    claim: '薪酬透明法实施三年，北屿的性别薪酬差距下降了 2.7 个百分点。',
    claimOrigin: '最早出现在 2026 年 3 月 25 日汇总发布当日的多家运动组织通讯与本站初版报道中，均以「14.1% 减 11.4%」的形式呈现。',
    spreadNote: '该说法在发布后一周内被至少四家组织的公开材料与两份议会提问引用，通常不附口径说明；本站初版也复制了这个减法，是这条说法得以扩散的一环。',
    verdict: 'misleading',
    summary:
      '两个端点都是监察署公布的真实数值，但分属 2024 年修订前后的两套申报口径，相减没有意义。监察署自己在附录中给出的同口径变化是 1.5 与 1.8 个百分点。',
    reasoning: [
      '核实两个端点是否真实：14.1%（2023，旧口径）与 11.4%（2026，新口径）都能在监察署公开文件中定位，数值本身无误[[c:cit-norhold-02]][[c:cit-norhold-06]]。',
      '核实两者是否可比：监察署于 2024 年 1 月把奖金与绩效工资纳入申报口径，此后的申报值与之前不构成同一序列[[c:cit-norhold-05]]。',
      '寻找同口径的替代计算：汇总附录 B 提供两套口径的回算值，旧口径 14.1%→12.6%（1.5 个百分点），新口径 13.2%→11.4%（1.8 个百分点）[[c:cit-norhold-06]]。',
      '核实归因是否成立：即使采用同口径数值，汇总本身没有对照组、没有反事实估计，也未主张变化由这部法律造成[[c:cit-norhold-03]]。因此「下降了多少」与「因这部法律下降了多少」是两个不同的问题，而这条说法把它们并成了一句。',
    ],
    citationIds: ['cit-norhold-02', 'cit-norhold-03', 'cit-norhold-05', 'cit-norhold-06'],
    whatWouldChangeIt:
      '若监察署发布一份把 2023 至 2026 年全部数值统一到单一口径的官方序列，且该序列显示的差距变化确实接近 2.7 个百分点，本结论将改判；若另有一份带对照设计的评估支持因果归因，关于归因的部分也会相应修订。',
    checkedAt: '2026-08-29',
    reviewedBy: '事实核查编辑 · 平等议题编辑组复核',
    history: [
      {
        at: '2026-08-26',
        verdict: 'true-missing-context',
        note: '首次核查时只看到汇总正文，判定两个数值真实、缺少口径说明，因此定为「基本属实但缺乏语境」。',
      },
      {
        at: '2026-08-29',
        verdict: 'misleading',
        note: '复核时在附录 B 中找到监察署自己提供的双口径回算表，确认两个端点不属于同一序列，相减得到的 2.7 个百分点不对应任何真实变化。结论上调为「具有误导性」，旧结论与本条修订理由一并保留公开。',
      },
    ],
  },
  {
    id: 'fc-norhold-02',
    articleId: 'art-norhold',
    claim: '审计数据显示，申报企业与未申报企业的薪酬差距没有区别，说明这部法律没有用。',
    claimOrigin: '2026 年 7 月 28 日北屿「务实前进」竞选团队发布的声明，附有一张未说明计算方法的两栏对比表。',
    spreadNote: '声明发布后被转述为「官方审计承认透明法无效」，转述过程中「该团队的再加权结果」被压缩成了「官方审计」。这一压缩是本次核查中扩散风险最高的环节。',
    verdict: 'unverifiable',
    summary:
      '无法核实，原因有两层：该团队未公布加权方法，其两个百分比无法用公开的原始申报值复现；而更根本的是，未申报雇主没有任何薪酬申报记录，这项比较所需的对照数据在制度上并不存在。',
    reasoning: [
      '尝试复现：以监察署公开的逐家原始申报值，用四种常见加权方式重算，均无法得到该声明附表中的两个百分比；声明本身不含计算过程[[c:cit-norhold-21]]。',
      '检查对照数据是否存在：申报义务只落在门槛以上的雇主，未申报雇主不产生薪酬申报记录[[c:cit-norhold-01]][[c:cit-norhold-04]]。因此「申报企业与未申报企业的比较」在现有制度下没有数据基础，任何一方都无法做出这项比较。',
      '区分两种不成立：这条说法不是被证据推翻，而是无法被现有证据检验。本站因此不采用「基本不实」，也不因该说法在政治上受到质疑就调高结论强度。',
      '同时明确相反方向：无法核实这条说法，并不等于「这部法律有效」已被证明。本文正文中对运动方「三年下降 2.7 个百分点」的说法采用了同一条标准，并同样未予放行[[c:cit-norhold-06]]。',
    ],
    citationIds: ['cit-norhold-01', 'cit-norhold-04', 'cit-norhold-06', 'cit-norhold-20', 'cit-norhold-21'],
    whatWouldChangeIt:
      '若该团队公布完整加权方法且其结果可用监察署公开的原始申报值复现，本结论将改为对该方法本身的实质评价；若监察署将申报义务扩展到门槛以下雇主并公布数据，使得两组之间的比较第一次成为可能，这条说法也将获得可被检验的形式。',
    checkedAt: '2026-08-29',
    reviewedBy: '事实核查编辑 · 法律复核',
  },
]

/* ==================================================================== *
 * 视觉素材
 * ==================================================================== */

export const assets: ImageAsset[] = [
  {
    id: 'img-norhold-cover',
    articleId: 'art-norhold',
    kind: 'cover',
    label: '封面 · 双口径断点',
    caption: '概念插图 · AI 生成 · 非新闻现场：两组错位的账册栏线在中段断开又各自延伸，指代 2024 年申报口径变更造成的不可比断点。',
    conceptual: true,
    prompt: '抽象几何构图：两组平行的细栏线在画面中段错位断开，断口处以棱镜折射的冷色渐层连接；无人物、无场景、无文字、无机构标识。',
    palette: ['--prism-1', '--prism-3', '--ink-700', '--paper-050'],
    motif: 'ledger',
    status: 'approved',
    guardrail: '不呈现任何职场场景、雇员形象或可被误认为真实机构标识的元素；不使用可暗示「女性等于低薪」的图像隐喻，改以账册栏线的断点表示口径变更本身。',
    createdAt: '2026-08-27T18:20:00Z',
  },
  {
    id: 'img-norhold-chart',
    articleId: 'art-norhold',
    kind: 'chart',
    label: '图表 · 跨辖区中位小时工资差距',
    caption: '数据来源：泛洲人权理事会经济与社会权利处《区域薪酬差距面板数据 2025》。本图无法说明各辖区的歧视程度，只能说明同一口径下的相对位置；非正规就业不在分母之内。',
    conceptual: false,
    palette: ['--prism-3', '--ink-600', '--paper-100'],
    motif: 'strata',
    status: 'approved',
    guardrail: '数值直接取自面板数据集，不做任何平滑或补插；图注同时给出数据来源与本图无法说明的内容，覆盖范围限制不放在脚注而放在图注首行。',
    createdAt: '2026-08-27T18:26:00Z',
    chartId: 'chart-paygap-compare',
  },
  {
    id: 'img-norhold-timeline',
    articleId: 'art-norhold',
    kind: 'timeline',
    label: '时间线示意 · 三年两次口径',
    caption: '概念插图 · AI 生成 · 非新闻现场：以折叠刻度表示三年间两次口径变更造成的断点，刻度间距不按真实时间比例绘制。',
    conceptual: true,
    prompt: '抽象几何构图：一条水平刻度带在两处折叠错位，折叠处以半透明棱镜面表示；无人物、无地图、无文字标签。',
    palette: ['--prism-2', '--prism-5', '--ink-500'],
    motif: 'graticule',
    status: 'approved',
    guardrail: '不绘制任何真实地理或机构建筑；刻度不按真实时间比例，图注已声明这一点，避免读者把示意图当作可测量的数据图。',
    createdAt: '2026-08-27T18:31:00Z',
  },
]
