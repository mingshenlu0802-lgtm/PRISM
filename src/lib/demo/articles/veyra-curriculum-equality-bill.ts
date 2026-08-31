/**
 * PRISM 棱镜 — 演示条目：韦拉性别平等课程法案。
 *
 * 全部为虚构演示内容。韦拉共和国、其国会与教育委员会、教育部统计司、
 * 家长团体联合会、教师工会以及本文引用的一切文件、数字与说法都不存在，
 * 也不对应任何真实辖区、真实法案或真实团体。
 */
import type { Article, ImageAsset } from '../../types'

export const article: Article = {
  id: 'art-curriculum',
  slug: 'veyra-curriculum-equality-bill',
  title: '韦拉性别平等课程法案：条文、反对意见与三项可核查的说法',
  titleEn: 'Veyra’s gender equality curriculum bill: the clauses, the objections, and three checkable claims',
  standfirst:
    '第141/2026号法案进入二读，三条条文被要求逐条表决。围绕它流传最广的三种说法，都可以用立法公报刊出的条文原文直接核对——其中两种与条文不符。但条文站得住，不等于这部法案没有问题：它最实质的困难在第 9 条，而那一条几乎没有人在争论。',
  countries: ['韦拉共和国'],
  region: '南陆',
  topics: ['equality', 'rights'],
  status: 'scheduled',
  createdAt: '2026-08-30T05:33:00Z',
  updatedAt: '2026-08-30T21:05:00Z',
  scheduledFor: '2026-09-01T22:00:00Z',
  readingTime: 11,
  confidence: 81,
  confidenceBasis:
    '法案条文、委员会报告与教育部统计均为可逐条核对的一手文件，因此关于「条文写了什么」的判断可靠；限制在于师资与经费的实际落实情况没有任何公开数据，本文对第 9 条可行性的判断只能停留在「委员会自己承认未解决」这一层。',
  sections: [
    /* ---------------------------------------------------------------- *
     * 1 · 事件与核心事实
     * ---------------------------------------------------------------- */
    {
      id: 'sec-curriculum-facts',
      kind: 'facts',
      title: '事件与核心事实',
      blocks: [
        {
          id: 'blk-curriculum-01',
          type: 'paragraph',
          text: '韦拉共和国国会第141/2026号《性别平等教育法案》于 8 月 12 日由立法公报刊出全文，8 月 30 日进入二读[[c:cit-curriculum-01]]。二读中有三条条文被要求脱离整体表决、逐条处理：第 9 条（师资培训与经费）、第 12 条（课程内容范围与年龄分级）、第 17 条（家长知情与退出机制）[[c:cit-curriculum-02]]。这是本届国会第二次对一部教育法案采用逐条表决程序。',
        },
        {
          id: 'blk-curriculum-02',
          type: 'paragraph',
          text: '法案的核心机制是把目前由各校自行决定的若干教学内容改为法定必修，并要求教育部在两年内公布统一的年龄分级大纲[[c:cit-curriculum-03]]。第 12 条列举了六类内容：人际关系与同意、性别刻板印象、家庭暴力的识别与求助、多元家庭形态、网络骚扰的应对、生殖健康基础知识[[c:cit-curriculum-04]]。教育部统计司的年度报表显示，这六类内容目前的开设比例从 29% 到 74% 不等[[c:cit-curriculum-05]]。',
        },
        {
          id: 'blk-curriculum-03',
          type: 'paragraph',
          text: '委员会阶段共收到 41 项修正提案，其中 12 项被采纳[[c:cit-curriculum-06]]。被采纳的修正包括：把「多元家庭形态」的教学要求从小学中段推迟到小学高段、在第 17 条中加入家长事前查阅教材的权利、以及删去原草案中对未达标学校的罚则[[c:cit-curriculum-07]]。被否决的修正中，有 9 项要求为第 12 条设立家长的一般性退出权[[c:cit-curriculum-08]]。',
        },
        {
          id: 'blk-curriculum-04',
          type: 'callout',
          tone: 'note',
          title: '本文如何区分四类陈述',
          text: '「条文写了什么」以立法公报刊出的原文为准，可逐字核对；「委员会做了什么」以委员会报告为准；「各方说了什么」注明由谁提出、何时提出；而本站对法案可行性的判断，会在句中自我标注为编辑判断。这四者在本文中不混用。',
        },
        {
          id: 'blk-curriculum-05',
          type: 'timeline',
          entries: [
            {
              date: '2026-03-04',
              title: '法案文本提交国会',
              text: '由教育与社会事务两委员会联合提出，附教育部的实施影响评估。',
              standing: 'documented',
              citationIds: ['cit-curriculum-01'],
            },
            {
              date: '2026-06-18',
              title: '宪法法庭第214/2026号判决作出',
              text: '该判决涉及法定性别承认，与本法案没有条文上的关联；但此后的公共讨论把两者反复并置。',
              standing: 'documented',
              citationIds: ['cit-curriculum-09'],
            },
            {
              date: '2026-07-28',
              title: '教育部公布学校平等内容覆盖统计',
              text: '首次给出六类内容各自的开设比例，成为辩论双方共同引用的数据来源。',
              standing: 'documented',
              citationIds: ['cit-curriculum-05'],
            },
            {
              date: '2026-08-12',
              title: '法案全文刊出',
              text: '立法公报刊出条文原件与 41 项修正提案编号。',
              standing: 'documented',
              citationIds: ['cit-curriculum-01'],
            },
            {
              date: '2026-08-20',
              title: '教育委员会报告公布',
              text: '逐条记录修正提案的表决结果与少数意见，附听证发言人名单。',
              standing: 'documented',
              citationIds: ['cit-curriculum-06'],
            },
            {
              date: '2026-08-24',
              title: '家长团体联合声明发布',
              text: '声明对第 12 条的描述与该条原文不符，本站已逐条对照并在核查部分说明。',
              standing: 'reported',
              citationIds: ['cit-curriculum-10'],
            },
            {
              date: '2026-08-30',
              title: '二读开始，三条条文被要求逐条表决',
              text: '逐条表决的日程尚未公布，是否在本会期完成三读仍不确定。',
              standing: 'contested',
              citationIds: ['cit-curriculum-02'],
            },
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 2 · 法律、历史与社会背景
     * ---------------------------------------------------------------- */
    {
      id: 'sec-curriculum-context',
      kind: 'context',
      title: '法律、历史与社会背景',
      blocks: [
        {
          id: 'blk-curriculum-06',
          type: 'paragraph',
          text: '韦拉的课程管理长期采用「中央定框架、地方定内容」的双层结构：教育部规定学习领域，具体教什么由学区与学校决定[[c:cit-curriculum-03]]。这套结构在 1990 年代确立时被视为对地方差异的尊重，实际效果是同一学年的两所学校可能一所完整讲授家庭暴力识别、另一所完全不涉及。教育部统计司的数据把这种差异第一次量化了出来[[c:cit-curriculum-05]]。',
        },
        {
          id: 'blk-curriculum-07',
          type: 'chart',
          chartId: 'chart-veyra-curriculum-coverage',
        },
        {
          id: 'blk-curriculum-08',
          type: 'paragraph',
          text: '第141号法案不是韦拉第一次尝试统一课程内容。2019 年的类似提案在委员会阶段夭折，理由是「侵入地方教育自治」[[c:cit-curriculum-06]]。这一次的不同之处在于两点：法案把统一大纲的制定权交给教育部而非国会，且删去了对未达标学校的罚则[[c:cit-curriculum-07]]。这两项改动是让法案得以进入二读的原因，也是它在执行层面最脆弱的地方——本站的判断是，一部没有罚则的必修法案，其效力几乎完全取决于第 9 条的师资与经费安排。',
        },
        {
          id: 'blk-curriculum-09',
          type: 'paragraph',
          text: '在区域层面，泛洲人权理事会 2025 年的结论性意见曾建议成员辖区把「基于同意的人际关系教育」纳入义务教育，但同时强调课程内容的决定权属于各辖区，并未规定具体形式[[c:cit-curriculum-11]]。把这份意见读成「国际机构要求韦拉立法」是不准确的：意见使用的是建议性措辞，且明确保留了辖区裁量空间。',
        },
        {
          id: 'blk-curriculum-10',
          type: 'callout',
          tone: 'evidence',
          title: '与第214/2026号判决无条文关联',
          text: '宪法法庭 6 月关于法定性别承认的判决与本法案在条文上没有交集：判决处理的是民事登记要件，法案处理的是课程内容[[c:cit-curriculum-09]]。两者在公共讨论中被反复并置，但没有任何一方在正式文件中主张存在法律上的连带关系。本站在报道中不建立这种关联。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 3 · 权力结构与交叉性分析
     * ---------------------------------------------------------------- */
    {
      id: 'sec-curriculum-power',
      kind: 'power',
      title: '权力结构与交叉性分析',
      blocks: [
        {
          id: 'blk-curriculum-11',
          type: 'paragraph',
          text: '谁在决定这部法案的内容：提出者是两个国会委员会，起草依据是教育部的影响评估，听证发言人共 23 位，其中教育行政人员 9 位、学术研究者 6 位、家长团体代表 4 位、教师工会 2 位、学生代表 1 位、地方教育局长 1 位[[c:cit-curriculum-06]]。学生代表的比例——23 人中的 1 人——是这份名单中最值得注意的数字。法案规范的是他们每周要坐在教室里接受的内容。',
        },
        {
          id: 'blk-curriculum-12',
          type: 'paragraph',
          text: '谁承担后果：教育部统计显示，六类内容的开设比例在城市学区与偏远学区之间差距最大的一项是「家庭暴力的识别与求助」[[c:cit-curriculum-05]]。这类内容的缺口与另外两个条件重叠——师资流动率高、学校规模小。也就是说，最可能因为学校不讲而无从获得求助信息的学生，恰恰也是最不可能因为家庭有资源而从别处获得这些信息的学生。第 9 条的师资培训经费如果不足，法案实际上会把这个差距固定下来而不是缩小它。这是本站的判断，法案文本本身没有处理这个问题。',
        },
        {
          id: 'blk-curriculum-13',
          type: 'paragraph',
          text: '第 17 条的家长退出机制在委员会阶段被削弱为「事前查阅教材的权利」，一般性退出权的 9 项修正提案全部被否决[[c:cit-curriculum-08]]。支持退出权的论证以家长的教育选择权为基础；反对的论证指出，在家庭本身就是暴力来源的情况下，把知情权交给家长等于把求助信息的开关交给可能的施害方。委员会报告记录了这一反对意见，但没有记录任何针对它的回应[[c:cit-curriculum-06]]。',
        },
        {
          id: 'blk-curriculum-14',
          type: 'paragraph',
          text: '教师工会的问卷显示，58% 的应答教师认为自己没有足够准备讲授「家庭暴力的识别与求助」这一类内容[[c:cit-curriculum-12]]。这份问卷由法案的支持方之一发布，抽样偏向工会会员，方向已知；但它是目前唯一关于师资准备程度的公开数据，而委员会报告中没有任何替代数据[[c:cit-curriculum-12]]。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 4 · 相关研究与数据
     * ---------------------------------------------------------------- */
    {
      id: 'sec-curriculum-research',
      kind: 'research',
      title: '相关研究与数据',
      blocks: [
        {
          id: 'blk-curriculum-15',
          type: 'paragraph',
          text: '教育部统计司的覆盖率数据基于全量学校年度报表，不是抽样，因此学区之间的比较在同一口径下成立[[c:cit-curriculum-05]]。但它有一个必须说清楚的限制：覆盖率由学校自行申报，未经督导核实，也不衡量课时长度或师资资质。一所学校在报表上勾选「已开设多元家庭形态」，可能对应一学期六课时，也可能对应一次晨会讲话。这份数据能说明「有没有」，不能说明「教得怎么样」。',
        },
        {
          id: 'blk-curriculum-16',
          type: 'paragraph',
          text: '跨辖区的比较数据同样有限。泛洲平等事务专家组 2026 年的说明给出了各辖区在制度层面的差异，但明确指出各辖区的「必修」定义不一致，绝对数值不可直接比较[[c:cit-curriculum-13]]。因此，把韦拉的开设比例与其他辖区并列成一张排名表，在方法上是站不住的——本站没有做这样的比较，也建议读者对任何做了这种比较的报道保持警惕。',
        },
        {
          id: 'blk-curriculum-17',
          type: 'callout',
          tone: 'caution',
          title: '没有效果数据',
          text: '关于「这类课程是否有效」，韦拉目前没有任何本地评估。国际上的相关研究多以短期知识测验为结果指标，与「是否减少了暴力」不是同一件事。任何一方在辩论中援引「研究证明有效／无效」，目前都缺乏可直接适用于韦拉的证据基础。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 5 · 不同来源之间的分歧
     * ---------------------------------------------------------------- */
    {
      id: 'sec-curriculum-divergence',
      kind: 'divergence',
      title: '不同来源之间的分歧',
      blocks: [
        {
          id: 'blk-curriculum-18',
          type: 'divergence',
          positions: [
            {
              label: '条文本身',
              holder: '立法公报刊出的第141/2026号法案原文',
              position: '第 12 条列举六类内容，并授权教育部在两年内制定年龄分级大纲；条文中没有出现任何关于性行为细节的教学要求。',
              evidence: '条文原件可逐字核对，条号、附则与修正提案编号齐全。',
              weight: 'strong',
              citationIds: ['cit-curriculum-01', 'cit-curriculum-04'],
            },
            {
              label: '委员会记录',
              holder: '国会教育委员会报告',
              position: '第 12 条在委员会阶段有三个版本，最终版本把「多元家庭形态」推迟到小学高段；家长的一般性退出权被否决 9 次。',
              evidence: '报告逐条记录提出人、表决结果与少数意见，附件三载有三个版本的对照。',
              weight: 'strong',
              citationIds: ['cit-curriculum-06', 'cit-curriculum-07', 'cit-curriculum-08'],
            },
            {
              label: '教师工会',
              holder: '韦拉教师工会研究部',
              position: '法案方向正确，但第 9 条的培训经费不足以让多数教师有能力讲授其中最敏感的两类内容。',
              evidence: '58% 应答率的会员问卷，抽样框与问卷全文公开；发布方是法案支持方之一，立场已披露。',
              weight: 'moderate',
              citationIds: ['cit-curriculum-12'],
            },
            {
              label: '家长团体',
              holder: '韦拉家长团体联合会',
              position: '第 12 条将要求学校向低龄学生教授性行为细节，家长应当有退出权。',
              evidence: '联合声明未附条号，其对第 12 条的三处引述与立法公报刊出的条文不一致。',
              weight: 'weak',
              citationIds: ['cit-curriculum-10'],
            },
          ],
        },
        {
          id: 'blk-curriculum-19',
          type: 'paragraph',
          text: '本站不把这四种立场等量呈现，理由是证据地位不同，不是立场亲疏。前两者是可逐字核对的一手文件；教师工会的问卷数据可核对但由利益相关方发布，且样本偏差方向已知；家长团体的声明对条文的转述与原文不符，因此它可以证明「存在此种主张」，不能证明「条文如此规定」。',
        },
        {
          id: 'blk-curriculum-20',
          type: 'paragraph',
          text: '需要同时说明的是另一个方向：法案的支持方在公开辩论中反复引用教育部的覆盖率数据来论证「现状不可接受」，但该数据只显示是否开设、不显示教学质量，无法支撑「学生因此得不到有效教育」这一更强的表述。这一点与家长团体的转述错误性质不同、程度也不同，但同样是把证据推到它承载不了的地方。本站在正文中对两者采用同一条标准。',
        },
      ],
    },


    /* ---------------------------------------------------------------- *
     * 7 · 尚未确定的信息
     * ---------------------------------------------------------------- */
    {
      id: 'sec-curriculum-unknowns',
      kind: 'unknowns',
      title: '尚未确定的信息',
      blocks: [
        {
          id: 'blk-curriculum-23',
          type: 'callout',
          tone: 'unknown',
          title: '我们不知道这部法案会不会有效',
          text: '本文能核对的是条文写了什么、委员会做了什么、各方说了什么。它不能回答这部法案实施后会发生什么——韦拉没有任何本地评估数据，罚则已被删去，而决定成效的第 9 条恰恰是公开信息最少的一条。',
        },
        {
          id: 'blk-curriculum-24',
          type: 'list',
          items: [
            '第 9 条的培训经费总额与分配方式。法案授权教育部另行规定，相关规章尚未起草，因此无法判断 58% 教师自认准备不足的问题会不会被处理[[c:cit-curriculum-12]]。',
            '年龄分级大纲的具体内容。法案给了教育部两年时间，大纲未出之前，第 12 条六类内容各自对应哪个学段仍是空白[[c:cit-curriculum-03]]。',
            '逐条表决的日程。二读开始时未公布，是否在本会期完成三读不确定[[c:cit-curriculum-02]]。',
            '偏远学区的实际执行能力。教育部统计只覆盖是否开设，没有师资资质与课时数据，缺口无法量化[[c:cit-curriculum-05]]。',
            '学生本人的意见。听证的 23 位发言人中只有 1 位学生代表，没有任何面向学生的系统性征询记录[[c:cit-curriculum-06]]。',
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 8 · 事件为何重要
     * ---------------------------------------------------------------- */
    {
      id: 'sec-curriculum-why',
      kind: 'why',
      title: '事件为何重要',
      blocks: [
        {
          id: 'blk-curriculum-25',
          type: 'paragraph',
          text: '以下是本站的编辑判断，与上文的事实陈述性质不同。这部法案最受关注的是第 12 条——教什么——而围绕它的两种主要说法都与条文不符。第 17 条的退出权之争至少建立在对条文的正确理解上。真正决定这部法案会不会改变任何学生处境的，是第 9 条：没有罚则的必修要求，效力完全取决于教师是否有能力讲、学校是否有资源开。而第 9 条几乎没有人在争论，它的经费安排也没有任何公开数字。',
        },
        {
          id: 'blk-curriculum-26',
          type: 'paragraph',
          text: '这不是韦拉独有的模式。当一部法案的争议被压缩成「教不教」的价值之争时，「教得成不成」的执行问题就会安静地通过。本站认为，判断这部法案的标准不应该是它在二读中是否通过，而是两年后的年龄分级大纲与培训经费规章长什么样——那两份文件目前都还不存在。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 9 · 后续值得关注的进展
     * ---------------------------------------------------------------- */
    {
      id: 'sec-curriculum-watch',
      kind: 'watch',
      title: '后续值得关注的进展',
      blocks: [
        {
          id: 'blk-curriculum-27',
          type: 'list',
          items: [
            '三条条文的逐条表决结果，以及第 17 条最终是否保留事前查阅权（日程未公布，本站将持续跟进）。',
            '教育部是否在三读前公布第 9 条的经费测算；若未公布，法案将在没有成本估计的情况下表决。',
            '年龄分级大纲的起草时间表——法案给了两年，起草小组的组成与是否包含学生代表值得关注。',
            '教育部统计司下一年度的覆盖率报表是否新增课时与师资资质字段；若不新增，执行情况将继续无法评估。',
            '家长团体联合会是否更正其声明中与条文不符的三处引述；本站已就此提出询问，尚未收到回复。',
          ],
        },
      ],
    },
  ],

  citations: [
    { id: 'cit-curriculum-01', sourceId: 'src-veyra-curriculum-bill-2026', locator: '法案全文 · 刊出说明', claim: '第141/2026号《性别平等教育法案》全文于 2026 年 8 月 12 日由立法公报刊出，含条文原件与 41 项修正提案编号。' },
    { id: 'cit-curriculum-02', sourceId: 'src-veyra-education-committee-2026', locator: '二读程序说明', claim: '二读中第 9、12、17 条被要求脱离整体表决、逐条处理；逐条表决日程在二读开始时尚未公布。' },
    { id: 'cit-curriculum-03', sourceId: 'src-veyra-curriculum-bill-2026', locator: '第 3 条与附则二', claim: '法案把若干原由各校自定的内容改为法定必修，并授权教育部在两年内公布统一的年龄分级大纲。' },
    { id: 'cit-curriculum-04', sourceId: 'src-veyra-curriculum-bill-2026', locator: '第 12 条', claim: '第 12 条列举六类必修内容：人际关系与同意、性别刻板印象、家庭暴力的识别与求助、多元家庭形态、网络骚扰的应对、生殖健康基础知识；条文中没有关于性行为细节的教学要求。' },
    { id: 'cit-curriculum-05', sourceId: 'src-veyra-education-stats-2026', locator: '覆盖率表 1', claim: '六类内容当前的学校开设比例介于 29% 至 74% 之间，数据由学校自报、未经督导核实，且不衡量课时与师资资质。' },
    { id: 'cit-curriculum-06', sourceId: 'src-veyra-education-committee-2026', locator: '正文 §2 与听证名单', claim: '委员会阶段共收到 41 项修正提案，采纳 12 项；听证发言人共 23 位，其中学生代表 1 位。' },
    { id: 'cit-curriculum-07', sourceId: 'src-veyra-education-committee-2026', locator: '附件三 · 修正对照', claim: '被采纳的修正包括把「多元家庭形态」推迟至小学高段、在第 17 条加入家长事前查阅教材的权利、以及删去对未达标学校的罚则。' },
    { id: 'cit-curriculum-08', sourceId: 'src-veyra-education-committee-2026', locator: '表决记录 · 提案 17–25', claim: '要求为第 12 条设立家长一般性退出权的 9 项修正提案全部被否决。' },
    { id: 'cit-curriculum-09', sourceId: 'src-veyra-court-ruling-2026', locator: '判决主文', claim: '宪法法庭第214/2026号判决处理的是民事登记要件，与课程内容法案在条文上没有交集。' },
    { id: 'cit-curriculum-10', sourceId: 'src-veyra-parents-statement-2026', locator: '声明第 2 段', claim: '家长团体联合会主张第 12 条将要求学校向低龄学生教授性行为细节；该声明未附条号，其三处引述与条文原文不一致。' },
    { id: 'cit-curriculum-11', sourceId: 'src-pancont-rights-observations-2025', locator: '结论性意见 §44', claim: '泛洲人权理事会建议成员辖区将基于同意的人际关系教育纳入义务教育，使用建议性措辞并保留辖区裁量权，未提及任何具体法案。' },
    { id: 'cit-curriculum-12', sourceId: 'src-veyra-teachers-survey-2026', locator: '问卷结果表 4', claim: '58% 的应答教师认为自己没有足够准备讲授家庭暴力识别与求助类内容；问卷由法案支持方之一发布，样本偏向工会会员。' },
    { id: 'cit-curriculum-13', sourceId: 'src-pancont-equality-panel-2026', locator: '方法说明 §3', claim: '各辖区对「必修」的定义不一致，跨辖区的绝对数值不可直接比较。' },
  ],

  sourceIds: [
    'src-veyra-curriculum-bill-2026',
    'src-veyra-education-committee-2026',
    'src-veyra-education-stats-2026',
    'src-veyra-teachers-survey-2026',
    'src-veyra-parents-statement-2026',
    'src-veyra-court-ruling-2026',
    'src-pancont-rights-observations-2025',
    'src-pancont-equality-panel-2026',
  ],


  riskFlags: [
    {
      id: 'risk-curriculum-01',
      kind: 'minors',
      severity: 'medium',
      note: '报道对象是针对未成年人的课程内容。虽然本文不涉及任何具体学生，但涉及未成年人教育内容的报道须避免出现可识别的学校、班级或个人信息。',
      requiresSecondConfirm: true,
      raisedBy: 'ai-review',
      resolved: true,
      resolutionNote: '全文不含任何具体学校、学区或个人的可识别信息；统计数据均为全国汇总层级。发布前仍按未成年人相关内容执行二次确认。',
    },
    {
      id: 'risk-curriculum-02',
      kind: 'bias',
      severity: 'medium',
      note: '本站在议题立场上更接近法案支持方。自动审查提示双向检查：是否对家长团体的说法采用了比支持方更严的标准，以及是否对支持方引用数据时的过度解读放宽了要求。',
      requiresSecondConfirm: false,
      raisedBy: 'ai-review',
      resolved: true,
      resolutionNote: '编辑复核后对两方采用同一条标准：任何说法必须能回到条文原文或公开数据。家长团体的三处转述错误与支持方对覆盖率数据的过度解读，在「不同来源之间的分歧」中分别写明，未做对称化处理，也未略过后者。',
    },
    {
      id: 'risk-curriculum-03',
      kind: 'defamation',
      severity: 'low',
      note: '文中指出某家长团体的声明与条文不符，具有可诉风险，须逐处归因到可核对的公开文件，不得推断该团体的动机。',
      requiresSecondConfirm: false,
      raisedBy: 'legal-check',
      resolved: true,
      resolutionNote: '相关表述均改为对文件本身的描述（「声明中的引述与条文原文不一致」），不涉及动机判断；已向该团体提出询问并在「后续值得关注的进展」中记录尚未收到回复。',
    },
    {
      id: 'risk-curriculum-04',
      kind: 'image-ethics',
      severity: 'low',
      note: '不得使用任何教室、学生或校园场景的生成图像，避免被误读为真实新闻现场。',
      requiresSecondConfirm: false,
      raisedBy: 'ai-review',
      resolved: true,
      resolutionNote: '封面改为条文分层的抽象几何构图，标注为概念插图；数据图表绑定教育部统计司数据集。',
    },
  ],

  citationChecks: [
    { citationId: 'cit-curriculum-01', status: 'found', reason: '自动核查在立法公报刊出页定位到法案全文与 41 项修正提案编号，刊出日期与引用一致。', checkedAt: '2026-08-30T06:02:00Z' },
    { citationId: 'cit-curriculum-02', status: 'partial', reason: '「三条条文被要求逐条表决」在委员会报告的程序说明中可确认；但「逐条表决日程尚未公布」是核查时点的状态，无法由文件本身证明，正文已注明为二读开始时的情况。', checkedAt: '2026-08-30T06:04:00Z' },
    { citationId: 'cit-curriculum-03', status: 'found', reason: '第 3 条与附则二的授权条款逐字核对一致，两年期限在附则二中明载。', checkedAt: '2026-08-30T06:05:00Z' },
    { citationId: 'cit-curriculum-04', status: 'found', reason: '第 12 条六类内容逐项核对一致；核查另行确认全条文中不含「性行为」相关表述，这一否定性结论已通过全文检索验证。', checkedAt: '2026-08-30T06:07:00Z' },
    { citationId: 'cit-curriculum-05', status: 'found', reason: '六个数值（29/38/47/55/61/74）在覆盖率表 1 中可直接读到；数据说明中确认为学校自报且未经督导核实。', checkedAt: '2026-08-30T06:09:00Z' },
    { citationId: 'cit-curriculum-06', status: 'found', reason: '41 项提案、12 项采纳与 23 位发言人的构成在报告正文与听证名单中均可核对。', checkedAt: '2026-08-30T06:11:00Z' },
    { citationId: 'cit-curriculum-07', status: 'found', reason: '附件三的三个版本对照可确认「多元家庭形态」的学段变更与罚则删除；第 17 条查阅权的新增在表决记录中可查。', checkedAt: '2026-08-30T06:13:00Z' },
    { citationId: 'cit-curriculum-08', status: 'found', reason: '提案 17–25 共 9 项，表决记录显示全部否决，与引用一致。', checkedAt: '2026-08-30T06:14:00Z' },
    { citationId: 'cit-curriculum-09', status: 'found', reason: '判决主文的适用范围仅及民事登记要件，核查确认全文未出现课程或教育相关条款。', checkedAt: '2026-08-30T06:16:00Z' },
    { citationId: 'cit-curriculum-10', status: 'partial', reason: '声明原文可访问且引述内容一致；但「三处引述与条文不符」是本站逐条比对的结果，属编辑判断而非文件自身陈述，正文已按此表述。发布方为利益相关方，该来源只用于证明主张存在。', checkedAt: '2026-08-30T06:18:00Z' },
    { citationId: 'cit-curriculum-11', status: 'found', reason: '结论性意见 §44 的建议性措辞与辖区裁量保留条款逐句核对一致，全文未提及具体法案。', checkedAt: '2026-08-30T06:20:00Z' },
    { citationId: 'cit-curriculum-12', status: 'partial', reason: '58% 这一数值在问卷结果表 4 中可读到，抽样框与应答率亦公开；但发布方是法案支持方之一，且核查未能取得任何独立的师资准备程度数据用于对照。正文已说明该来源的立场与样本偏差方向。', checkedAt: '2026-08-30T06:22:00Z' },
    { citationId: 'cit-curriculum-13', status: 'found', reason: '方法说明 §3 关于「必修」定义不一致与绝对数值不可比的表述逐句核对一致。', checkedAt: '2026-08-30T06:23:00Z' },
  ],

  assetIds: ['img-curriculum-cover', 'img-curriculum-coverage', 'img-curriculum-social'],
  chartIds: ['chart-veyra-curriculum-coverage'],

  translations: [
    { lang: 'zh-Hans', label: '简体中文', status: 'human-reviewed' },
    { lang: 'es', label: 'Español', status: 'human-reviewed', title: 'El proyecto de ley de currículo de igualdad en Veyra: los artículos, las objeciones y tres afirmaciones verificables', standfirst: 'Dos de las tres afirmaciones más difundidas sobre el artículo 12 no coinciden con el texto publicado. Pero que el texto se sostenga no significa que la ley no tenga problemas: el más serio está en el artículo 9, y casi nadie lo discute.' },
    { lang: 'en', label: 'English', status: 'machine-draft', title: 'Veyra’s gender equality curriculum bill: the clauses, the objections, and three checkable claims', standfirst: 'Two of the three most-circulated claims about clause 12 do not match the published text. But a text that holds up is not the same as a bill without problems — the hardest one sits in clause 9, and almost nobody is arguing about it.' },
    { lang: 'pt', label: 'Português', status: 'not-started' },
  ],

  currentVersionId: 'ver-curriculum-1',
  byline: 'PRISM 自动编辑台 · 主编复核',
  demo: true,
}


export const assets: ImageAsset[] = [
  {
    id: 'img-curriculum-cover',
    articleId: 'art-curriculum',
    kind: 'cover',
    label: '韦拉课程法案 · 封面图',
    caption: '概念插图：以分层的条文结构为母题，深靛蓝底上以克制的棱镜色标出被要求逐条表决的三条。',
    conceptual: true,
    prompt: '抽象的法律条文分层结构，深靛蓝底，六道细线代表六类内容，其中三道以珊瑚色标出；不出现任何人物、教室或校园元素。',
    palette: ['var(--prism-1)', 'var(--prism-6)', 'var(--coral-500)'],
    motif: 'ledger',
    status: 'approved',
    guardrail: '不得出现教室、学生、教师或校园场景，避免被误读为真实新闻现场；涉及未成年人议题，一律使用抽象几何构图。',
    createdAt: '2026-08-30T05:50:00Z',
  },
  {
    id: 'img-curriculum-coverage',
    articleId: 'art-curriculum',
    kind: 'chart',
    label: '六类内容的学校开设比例',
    caption: '数据图表：韦拉教育部统计司《学校平等内容覆盖统计 2026》，学校自报，未经督导核实。',
    conceptual: false,
    palette: ['var(--prism-1)'],
    motif: 'ledger',
    status: 'approved',
    guardrail: '数据图表必须绑定既有数据集；图注同时给出数据来源与本图无法说明的内容（不含课时、师资资质与教学质量）。',
    createdAt: '2026-08-30T05:56:00Z',
    chartId: 'chart-veyra-curriculum-coverage',
  },
  {
    id: 'img-curriculum-social',
    articleId: 'art-curriculum',
    kind: 'social',
    label: '韦拉课程法案 · 社交素材',
    caption: '概念插图：标题与三项核查结论，不含条文以外的任何描述。',
    conceptual: true,
    prompt: '抽象棱镜折射构图，用于承载标题与三条核查结论；不出现人物、场所或事件现场。',
    palette: ['var(--prism-1)', 'var(--coral-500)'],
    motif: 'prism-fold',
    status: 'draft',
    guardrail: '社交素材只呈现标题与核查结论，不摘录任何可能脱离语境的条文片段；不出现人物形象。',
    createdAt: '2026-08-30T06:30:00Z',
  },
]
