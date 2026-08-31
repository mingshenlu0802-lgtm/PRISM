/**
 * PRISM 棱镜 — 演示条目：泛洲基金分配争议。
 *
 * 全部为虚构演示内容。泛洲公民社会资金观察、北屿平等组织常设大会、韦拉女性主义
 * 组织联盟、图兰独立新闻社、岛链通讯、马兰岛海上救援与庇护网络、米拉妇女法律中心、
 * 「群岛之家」竞选阵营与本文引用的一切机构、文件与数字都不存在，也不对应任何
 * 真实组织、真实资助方或真实争议。
 */
import type { Article, FactCheck, ImageAsset } from '../../types'

export const article: Article = {
  id: 'art-funding',
  slug: 'movement-funding-allocation-dispute',
  title: '泛洲基金分配争议：运动内部三种立场与各自的证据',
  titleEn: 'The pan-continental funding dispute: three positions inside the movement, and the evidence behind each',
  standfirst:
    '一封由 47 家组织署名的公开信，把区域资助方的「包容性标准」推成了运动内部今年最公开的一场争论。三种立场各自有支持者、各自有理由，但它们背后的证据不是同一个量级——而最扎实的那一种，恰好也是后果最不中立的那一种。',
  countries: ['多辖区（跨国比较）', '北屿联合王国', '马兰岛自治区', '图兰共和国', '韦拉共和国'],
  region: '跨辖区',
  topics: ['movement', 'rights'],
  status: 'published',
  createdAt: '2026-08-24T06:20:00Z',
  updatedAt: '2026-08-27T13:00:00Z',
  publishedAt: '2026-08-27T13:00:00Z',
  readingTime: 12,
  confidence: 76,
  confidenceBasis:
    '唯一一份系统性的资金构成数据来自 214 家自愿填报的机构，受限环境中的组织普遍缺席；更关键的是，本站始终未取得任何一家资助方的评审规则或评分表原文，因此关于「分配是如何做出的」这一核心问题，本文只能记录各方的主张与它们各自的材料，不能给出结论。',
  sections: [
    /* ---------------------------------------------------------------- *
     * 1 · 事件与核心事实
     * ---------------------------------------------------------------- */
    {
      id: 'sec-funding-facts',
      kind: 'facts',
      title: '事件与核心事实',
      blocks: [
        {
          id: 'blk-funding-01',
          type: 'paragraph',
          text:
            '2026 年 6 月 9 日，韦拉女性主义组织联盟发表一封公开信，主张区域资助方附加于拨款的「包容性标准」正在被用来排除一部分组织。这封信附有 47 家署名组织的完整名单与各自的联系方式，立场表述清楚[[c:cit-funding-12]]；但信中关于资金分配的三处具体指控没有附任何凭据[[c:cit-funding-13]]。本文以下把这封信当作立场文本使用，其中的事实性指控另行核查——这是本站对公开信一类材料的一般处理方式，与是否认同其立场无关。',
        },
        {
          id: 'blk-funding-02',
          type: 'paragraph',
          text:
            '公开信之所以能迅速扩散，是因为它落在一个已经存在的分歧上。2026 年 2 月 27 日，北屿平等组织常设大会就资助分配立场进行了记名表决并通过决议，票数记录在案[[c:cit-funding-08]]；会议记录经秘书处摘要处理，发言原话与被删节的部分无法还原[[c:cit-funding-09]]。8 月 6 日，图兰独立新闻社报道当地妇女组织之间出现策略分歧，并公布了两份内部会议纪要的影印件，同时给了被批评一方完整的回应空间[[c:cit-funding-14]]；这两份纪要的真实性未经第三方鉴定[[c:cit-funding-15]]。7 月 11 日，马兰岛的社区媒体岛链通讯刊出了争议双方的来函全文[[c:cit-funding-16]]，但该编辑部只有两名兼职人员，未对会议记录等书面材料做独立核对[[c:cit-funding-17]]。',
        },
        {
          id: 'blk-funding-03',
          type: 'paragraph',
          text:
            '关于资金本身，目前唯一一份系统性的构成数据来自泛洲公民社会资金观察 2026 年 3 月发布的资金流向审视：在 214 家填报机构的收入加总中，国际基金会占 38%，政府与公共资金占 24%，个人小额捐赠占 16%[[c:cit-funding-01]]。这份报告公布了问卷全文、填报机构的分布与自身的资助方名单[[c:cit-funding-04]]，但填报出于自愿，受限环境中的组织普遍缺席[[c:cit-funding-02]]；而且它按金额加总计算，一笔大额资助足以盖过数十家小组织的全部收入[[c:cit-funding-03]]。',
        },
        {
          id: 'blk-funding-04',
          type: 'paragraph',
          text:
            '必须写明本文最大的一处空白：本站没有取得任何一家资助方的评审规则、评分表或拒绝理由文本。本站向该资金观察比对了它公布的问卷全文，确认其中不含申请成功率与评审评分的题项[[c:cit-funding-28]]——也就是说，即使把 214 份填报全部读完，也无法回答「谁的申请被拒绝了、为什么」。这一点决定了本文的结构：下面呈现的是三种立场各自掌握的材料，不是对分配行为本身的判定。',
        },
        {
          id: 'blk-funding-05',
          type: 'timeline',
          entries: [
            {
              date: '2025-05-13',
              title: '多点民族志刊出，记录资助方类目如何改写组织的工作描述',
              text: '经同行评审的研究覆盖四个辖区的六家组织，公开田野时长、编码簿与研究者立场声明；作者明确表示不追求代表性[[c:cit-funding-05]][[c:cit-funding-06]][[c:cit-funding-07]]。',
              citationIds: ['cit-funding-05', 'cit-funding-06', 'cit-funding-07'],
              standing: 'documented',
            },
            {
              date: '2026-02-27',
              title: '北屿常设大会就资助分配立场记名表决',
              text: '决议通过，票数记录在案[[c:cit-funding-08]]；但会议记录经秘书处摘要，发言原话无法还原，也无法核对各方完整论证[[c:cit-funding-09]]。',
              citationIds: ['cit-funding-08', 'cit-funding-09'],
              standing: 'documented',
            },
            {
              date: '2026-03-04',
              title: '泛洲公民社会资金观察发布资金流向审视',
              text: '214 家填报机构的收入加总中，国际基金会占 38%、政府与公共资金占 24%、个人小额捐赠占 16%；填报自愿，受限环境中的组织普遍缺席[[c:cit-funding-01]][[c:cit-funding-02]]。',
              citationIds: ['cit-funding-01', 'cit-funding-02'],
              standing: 'documented',
            },
            {
              date: '2026-06-09',
              title: '47 家组织的公开信指「包容性标准」被用于排除',
              text: '公开信附完整署名名单，立场表述清楚[[c:cit-funding-12]]；其中三处关于资金分配的具体指控未附任何凭据[[c:cit-funding-13]]。',
              citationIds: ['cit-funding-12', 'cit-funding-13'],
              standing: 'contested',
            },
            {
              date: '2026-07-11',
              title: '岛链通讯刊出马兰岛争议双方来函全文',
              text: '社区媒体直接采访了双方并全文刊出来函[[c:cit-funding-16]]，但编辑部仅两名兼职人员，未对书面材料做独立核对[[c:cit-funding-17]]。',
              citationIds: ['cit-funding-16', 'cit-funding-17'],
              standing: 'reported',
            },
            {
              date: '2026-08-02',
              title: '一份竞选宣传通讯把资金问题重述为「外国议程」',
              text: '该阵营称资金来自境外议程[[c:cit-funding-24]]；通讯中引用的三项统计均未注明出处，其中一项与自治区统计口径明显不符[[c:cit-funding-25]]。',
              citationIds: ['cit-funding-24', 'cit-funding-25'],
              standing: 'contested',
            },
            {
              date: '2026-08-06',
              title: '图兰独立新闻社公布两份内部纪要影印件',
              text: '报道给了被批评一方完整回应空间[[c:cit-funding-14]]；纪要真实性未经第三方鉴定，本站也未取得可读副本[[c:cit-funding-15]]。',
              citationIds: ['cit-funding-14', 'cit-funding-15'],
              standing: 'contested',
            },
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 2 · 法律、历史与社会背景
     * ---------------------------------------------------------------- */
    {
      id: 'sec-funding-context',
      kind: 'context',
      title: '法律、历史与社会背景',
      blocks: [
        {
          id: 'blk-funding-06',
          type: 'paragraph',
          text:
            '「包容性标准」不是这一轮才出现的东西。它最初是运动内部的要求：让资助方在拨款条件中写入对跨性别者、性工作者、残障者与非公民的明确纳入，以免资金落在把这些群体排除在外的机构手里。争议在于它同时带来了一整套可核查的形式要件——书面政策、董事会构成、年度审计账目、工作语言。经同行评审的多点民族志记录了这套要件的实际效果：组织为了适配资助方的主题类目而改写自身的工作描述，把原本连续的服务拆成可申报的项目[[c:cit-funding-05]]。该研究覆盖四个辖区的六家组织，作者明确表示不追求代表性[[c:cit-funding-06]]，因此它能证明这种改写确实发生过，不能证明它有多普遍。',
        },
        {
          id: 'blk-funding-07',
          type: 'paragraph',
          text:
            '第二层背景是运动自身的治理结构。北屿的常设大会是一个有记名表决与公开会议记录的机制[[c:cit-funding-08]]，但谁能派代表进入大会，取决于平等事务监察署的认可团体登记名册[[c:cit-funding-10]]。这份名册按季度更新、并公布被拒登记的理由，因此增减是可核对的[[c:cit-funding-11]]。可核对不等于开放：一个组织必须先具备登记所要求的组织形式，才能进入投票的房间。于是，一场关于「资助方的形式要件是否在排除人」的争论，本身是在一个由形式要件界定的场所里表决的。',
        },
        {
          id: 'blk-funding-08',
          type: 'paragraph',
          text:
            '第三层背景是运动内部的信息不对称。规模最小的组织往往对自己的数据最坦白：马兰岛的海上救援与庇护网络在年度报告中附上逐次出航的航次记录与经费审计意见[[c:cit-funding-18]]，同时写明数据只覆盖该网络自身参与的救援[[c:cit-funding-19]]；米拉妇女法律中心公布案件计数规则、资金来源与利益冲突声明[[c:cit-funding-20]]，并写明数字只代表求助人群而非全体人群[[c:cit-funding-21]]；北屿的移民妇女法律互助会公布自身经费来源与翻译流程[[c:cit-funding-22]]，同样写明样本仅限主动求助者[[c:cit-funding-23]]。这些都是审计级别的透明度。问题在于，透明度本身并不能换来进入评审的资格，而做这套披露的成本，恰恰由最没有专职财务人员的机构承担。',
        },
        {
          id: 'blk-funding-09',
          type: 'callout',
          tone: 'note',
          title: '本文如何处理运动内部的争议',
          text:
            '本站的做法有三条：第一，每种立场都以其持有者能够认可的表述呈现，不使用对方阵营的概括；第二，每种立场的证据基础单独评级，评的是「支撑这一立场的可核对材料有多少」，不是「这个立场在政治上是否正确」；第三，不因为某个立场与本站的价值取向接近而放宽标准，也不因为某个立场来自更弱势的一方而降低要求——把弱势方的主张当作不需要证据的主张，本身就是一种不尊重[[c:cit-funding-06]]。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 3 · 权力结构与交叉性分析
     * ---------------------------------------------------------------- */
    {
      id: 'sec-funding-power',
      kind: 'power',
      title: '权力结构与交叉性分析',
      blocks: [
        {
          id: 'blk-funding-10',
          type: 'paragraph',
          text:
            '资金分配的第一道筛子不在评审会上，而在填报表格上。资金流向审视自己写明：填报出于自愿，受限环境中的组织普遍缺席[[c:cit-funding-02]]。这意味着任何以这份数据为基础的分配公式，都会从一个已经系统性缺席了一部分组织的样本出发。第二道筛子是加总方式：按金额计算，一笔大额资助足以盖过数十家小组织的全部收入[[c:cit-funding-03]]，因此「资金构成」这张图描述的其实是大额资助的构成，而不是组织数量的构成。第三道筛子是语言与形式：审计账目、书面政策与工作语言的要求，落在没有专职财务人员的机构身上时，是一笔实实在在的成本[[c:cit-funding-05]]。',
        },
        {
          id: 'blk-funding-11',
          type: 'paragraph',
          text:
            '这三道筛子叠加起来，会产生一个可以被检验的推论：越是服务于最边缘人群的组织——海上救援、非主导语言社区、移民妇女法律求助——越可能同时满足「工作最难被类目化」与「最缺乏行政产能」两个条件。本站要强调这是编辑推论，不是已被证实的结论。可以证实的只有它的几个组成部分：这些组织确实在做审计级别的披露[[c:cit-funding-18]][[c:cit-funding-20]][[c:cit-funding-22]]，它们的数据确实只覆盖自身接触到的人群[[c:cit-funding-19]][[c:cit-funding-21]][[c:cit-funding-23]]，而资金构成数据确实排除了一部分组织[[c:cit-funding-02]]。把这几点连成一条因果链的那根线，目前没有证据。',
        },
        {
          id: 'blk-funding-12',
          type: 'paragraph',
          text:
            '最后是谁在这场争论里有投票权。常设大会的记名表决记录在案[[c:cit-funding-08]]，但入场资格由认可团体登记名册决定[[c:cit-funding-10]]。这不是一个隐蔽的安排——名册公开，拒绝登记的理由也公开[[c:cit-funding-11]]——但它意味着「大会通过了决议」这句话所指的多数，是一个被登记制度界定过的多数。本文的第四条核查正是关于这一点。',
        },
        {
          id: 'blk-funding-13',
          type: 'pullquote',
          text: '一场关于「形式要件是否在排除人」的争论，是在一个由形式要件界定入场资格的房间里表决的。',
          attribution: 'PRISM 编辑判断',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 4 · 相关研究与数据
     * ---------------------------------------------------------------- */
    {
      id: 'sec-funding-research',
      kind: 'research',
      title: '相关研究与数据',
      blocks: [
        {
          id: 'blk-funding-14',
          type: 'paragraph',
          text:
            '下图是本文唯一一份系统性的量化材料，也是三种立场都在引用的那一份。它的方法必须和数字一起读：向区域内组织发出自愿填报的财务问卷，214 家交回并授权公开汇总[[c:cit-funding-01]]；报告公布了问卷全文、填报机构分布与自身的资助方名单[[c:cit-funding-04]]；但自愿填报意味着受限环境中的组织普遍缺席[[c:cit-funding-02]]，按金额加总意味着少数大额资助主导了整张图的形状[[c:cit-funding-03]]。',
        },
        {
          id: 'blk-funding-15',
          type: 'chart',
          chartId: 'chart-movement-funding-mix',
        },
        {
          id: 'blk-funding-16',
          type: 'paragraph',
          text:
            '质性证据方面，最强的一份是那项多点民族志：经同行评审，公开了田野时长、编码簿与研究者立场声明[[c:cit-funding-07]]，直接记录了组织为适配资助方类目而改写工作描述的过程[[c:cit-funding-05]]。它的限制同样明确：四个辖区、六家组织，作者声明不追求代表性[[c:cit-funding-06]]。本站的用法是——用它来确认某种机制存在，不用它来估计这种机制有多普遍。这个区分在本文的分歧一节中是决定性的：第三种立场关于「机制存在」的部分有强证据，关于「本次分配中发生了这件事」的部分没有。',
        },
        {
          id: 'blk-funding-17',
          type: 'paragraph',
          text:
            '值得一并说明的是运动组织自己产出的数据能承担什么。图兰的跨性别者医疗可及性调查公布了问卷全文与招募渠道，但样本以滚雪球方式取得、集中在两座城市，机构本身在报告首页就写明不可推及全国[[c:cit-funding-26]]；北屿跨性别健康联盟的服务等待时长审计公布了问卷原文、回收率与未回复名单，并指出未回复者可能等待更久[[c:cit-funding-27]]。这两份材料的方法披露水准都高于本文引用的多份机构声明。本站的判断是：运动内部关于「谁的数据可信」的争论，往往并不发生在数据质量上，而发生在谁有产能把方法写清楚上。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 5 · 不同来源之间的分歧
     * ---------------------------------------------------------------- */
    {
      id: 'sec-funding-divergence',
      kind: 'divergence',
      title: '不同来源之间的分歧',
      blocks: [
        {
          id: 'blk-funding-18',
          type: 'divergence',
          positions: [
            {
              label: '先把口径补齐，再谈任何分配公式',
              holder: '泛洲公民社会资金观察，以及常设大会表决中的少数派',
              position:
                '现有的资金流向数据不足以支撑任何再分配公式：样本是自愿填报的，缺席的恰恰是最需要被算进去的组织。应当先扩大填报覆盖面、建立统一的支出分类，再讨论怎么分[[c:cit-funding-02]][[c:cit-funding-28]]。',
              evidence:
                '这一立场的核心主张由来源自身的方法说明直接支持：资金观察在报告中写明填报自愿、受限环境组织缺席[[c:cit-funding-02]]，写明按金额加总会让大额资助主导[[c:cit-funding-03]]，并公布了完整问卷供外部核对[[c:cit-funding-04]]；本站比对问卷全文后确认其中不含申请成功率与评审评分题项[[c:cit-funding-28]]。民族志作者同样明确声明不追求代表性[[c:cit-funding-06]]。也就是说，「数据还不够」这句话是数据生产者自己说的。',
              citationIds: ['cit-funding-02', 'cit-funding-03', 'cit-funding-04', 'cit-funding-06', 'cit-funding-28'],
              weight: 'strong',
            },
            {
              label: '按可测量的服务缺口重新分配，现在就改',
              holder: '北屿平等组织常设大会表决中的多数派',
              position:
                '现行分配把资金集中在能写申请书、有专职财务的中型机构；等待完美数据本身就是一种分配决定。应当以现有可测量的服务缺口为依据立即调整拨款方向[[c:cit-funding-08]]。',
              evidence:
                '这一立场对「谁没有出现在数据里」的描述准确，且与资金观察自己的限制说明一致[[c:cit-funding-02]]；决议经记名表决通过、票数记录在案[[c:cit-funding-08]]。但它主张的那个公式要用的，正是它的盟友认为不足以支撑公式的同一份数据[[c:cit-funding-28]]；而「重新分配会带来更好结果」这一步没有任何前后比较或对照研究支撑。会议记录经秘书处摘要，本站也无法核对各方的完整论证[[c:cit-funding-09]]。',
              citationIds: ['cit-funding-02', 'cit-funding-08', 'cit-funding-09', 'cit-funding-28'],
              weight: 'moderate',
            },
            {
              label: '优先级应由运动内部协商决定，而不是由资助方的主题类目决定',
              holder: '图兰的一部分妇女组织与韦拉女性主义组织联盟的 47 家署名机构',
              position:
                '资助方设定的主题类目迫使组织改写自己的工作以适配类目；本次「包容性标准」的评审已经在系统性地压低一部分申请的评分，应当把优先级的决定权交回运动内部的协商机制[[c:cit-funding-12]][[c:cit-funding-14]]。',
              evidence:
                '这一立场分成两半，证据强度差别很大。前半——类目会改写组织的工作描述——由经同行评审的多点民族志直接记录[[c:cit-funding-05]]。后半——本次评审系统性压低了某类申请——目前只有两份未经第三方鉴定的内部纪要影印件[[c:cit-funding-15]]与一封三处指控未附凭据的公开信[[c:cit-funding-13]]；本站也未取得任何资助方的评分表[[c:cit-funding-28]]。本站按「针对本次争议的具体主张」评级，因此评为弱。',
              citationIds: ['cit-funding-05', 'cit-funding-12', 'cit-funding-13', 'cit-funding-14', 'cit-funding-15', 'cit-funding-28'],
              weight: 'weak',
            },
          ],
        },
        {
          id: 'blk-funding-19',
          type: 'paragraph',
          text:
            '本站不把这三种立场当作等价的看法，理由如下。第一种最强，因为它的核心主张是由数据的生产者本人写在方法说明里的，任何人都可以在公开问卷中复核[[c:cit-funding-04]][[c:cit-funding-28]]。第二种居中：它对现状的描述与第一种一致，弱的是它的推论环节——它要用的公式建立在它自己也承认不完整的数据上，而「改了会更好」这一步没有任何对照证据[[c:cit-funding-28]]。第三种最弱，弱在具体指控而不在它的一般判断：类目塑造工作内容这件事有扎实的同行评审证据[[c:cit-funding-05]]，但「本次评审压低了某类申请」目前只有真实性未经鉴定的纪要与无凭据的指控[[c:cit-funding-13]][[c:cit-funding-15]]。',
        },
        {
          id: 'blk-funding-20',
          type: 'paragraph',
          text:
            '还有两件事必须一起说，否则这套评级会被误读。其一：证据最强的立场不等于后果最中立的立场。「先补数据再谈分配」在证据上无可挑剔，但推迟再分配本身就是一项分配决定，它的成本落在现在就缺钱的组织身上——而这一点没有被这一立场纳入自己的论证，本站认为这是它最实质的弱点，尽管它在证据评级上仍然最强。其二：第三种立场被评为弱，不意味着它的指控为假。它意味着现有材料无法判定，而使它无法判定的直接原因是资助方没有公开评分表[[c:cit-funding-28]]。一旦评分表公开，这一评级可能立刻改变——评级衡量的是证据，不是可信度，更不是这些组织的诚信。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 6 · 事实核查
     * ---------------------------------------------------------------- */
    {
      id: 'sec-funding-factcheck',
      kind: 'factcheck',
      title: '事实核查',
      blocks: [
        {
          id: 'blk-funding-21',
          type: 'paragraph',
          text:
            '本文核查了四条正在流传的说法。三条来自运动内部，一条来自运动之外但直接作用于这场争论——把后者一并核查，是因为它已经在把一场关于分配的内部争论重述成一场关于「外国势力」的争论，而这种重述对争论中的所有各方都有实际后果。四条核查采用同一套标准：说法能不能回到一份可核对的材料，材料能不能支撑这句话的全部范围。',
        },
        {
          id: 'blk-funding-22',
          type: 'list',
          items: [
            '「本次评审系统性压低了小型与非主导语言组织的评分」——缺乏足够证据。评分表未公开，现有材料为两份真实性未经鉴定的纪要与一封未附凭据的公开信；缺乏证据不等于该说法为假[[c:cit-funding-13]][[c:cit-funding-15]][[c:cit-funding-28]]。',
            '「国际基金会占资金构成近四成，是最大单一来源」——基本属实但缺乏语境。38% 是 214 家自愿填报机构按金额加总的结果，缺席者与加总方式都会系统性地改变这个数字[[c:cit-funding-01]][[c:cit-funding-02]][[c:cit-funding-03]]。',
            '「这些组织 80% 的资金来自境外」——基本不实。该数字无任何出处，与现有唯一一份系统性构成数据相差甚远，且同一份材料中另有一项统计与自治区口径不符[[c:cit-funding-01]][[c:cit-funding-24]][[c:cit-funding-25]]。',
            '「常设大会的决议代表了运动的多数意见」——部分属实。表决与票数属实，但入场资格由认可团体登记名册界定，名册之外的组织没有投票权[[c:cit-funding-08]][[c:cit-funding-10]][[c:cit-funding-11]]。',
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 7 · 尚未确定的信息
     * ---------------------------------------------------------------- */
    {
      id: 'sec-funding-unknowns',
      kind: 'unknowns',
      title: '尚未确定的信息',
      blocks: [
        {
          id: 'blk-funding-23',
          type: 'callout',
          tone: 'unknown',
          title: '一份没有人公开的文件，决定了本文能走多远',
          text:
            '本文所有无法判定的问题都收敛到同一处：没有任何一家资助方公开过评审规则、评分表或拒绝理由。本站比对了资金观察公布的问卷全文，确认其中不含申请成功率与评审评分题项[[c:cit-funding-28]]；也就是说，即使把现有的全部公开材料读完，也无法回答「分配是怎么做出的」。在这份文件公开之前，任何一方——包括本站——关于分配行为的判断都只能停留在推论层面。',
        },
        {
          id: 'blk-funding-24',
          type: 'list',
          items: [
            '各资助方的评审评分与拒绝理由是什么？需要资助方公开评分表或匿名化的评审记录。本站已向三家资助方提出书面查询，截至发稿未获答复[[c:cit-funding-28]]。',
            '按组织规模与工作语言分列的申请成功率是多少？需要在资金问卷中新增相应题项。现行问卷全文中不含这些题项[[c:cit-funding-04]][[c:cit-funding-28]]。',
            '缺席填报的组织有多少、集中在哪里？需要一次对未填报机构的抽样追访。资金观察写明缺席者集中在受限环境，但未给出估计数[[c:cit-funding-02]]。',
            '图兰那两份内部纪要是真的吗？需要第三方文件鉴定或纪要签署方的确认。通讯社已公布影印件但未做鉴定，本站也未取得可读副本[[c:cit-funding-14]][[c:cit-funding-15]]。',
            '公开信中三处指控各自的依据是什么？需要署名机构提供支撑材料。本站已向联盟秘书处查询，截至发稿未收到任何凭据[[c:cit-funding-13]]。',
            '「类目改写工作描述」这一机制有多普遍？需要一项以代表性抽样为设计的后续研究。现有的多点民族志覆盖六家组织，作者明确不追求代表性[[c:cit-funding-06]]。',
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 8 · 事件为何重要
     * ---------------------------------------------------------------- */
    {
      id: 'sec-funding-why',
      kind: 'why',
      title: '事件为何重要',
      blocks: [
        {
          id: 'blk-funding-25',
          type: 'paragraph',
          text:
            '以下是本站的编辑分析，与上面的报道部分分开阅读。运动内部的争议常被两种方式处理掉：一种是不报道，理由是「会被对手利用」；另一种是报道成一场人格冲突，理由是那样更好读。两种处理方式都有同一个后果——把一个关于资源如何分配的结构性问题，变成一个关于谁比较不讲理的问题。本站认为这场争论值得完整报道，恰恰因为三方各自都掌握了一部分真实的东西：数据确实不足以支撑公式，等待确实有分配后果，类目确实会改写工作[[c:cit-funding-02]][[c:cit-funding-05]]。',
        },
        {
          id: 'blk-funding-26',
          type: 'paragraph',
          text:
            '本站的第二个判断是：这场争论的形状主要由一个缺口决定，而这个缺口不在运动内部。三种立场之所以无法在证据上收敛，是因为决定分配的那份文件从未公开[[c:cit-funding-28]]。在这种情况下，各方只能用自己能拿到的材料——会议记录、内部纪要、公开信、自愿填报的问卷——去论证一个只有资助方能回答的问题，而这些材料的证据强度差异，最终被读成了各方诚信的差异。本站把评级明确限定在证据上，正是为了避免这种滑移。同时也要说清楚：本文对第三种立场的弱评级，与本站对「资助方应当公开评分表」这一主张的支持并不矛盾——前者是关于现有证据的判断，后者是关于制度应当如何的判断，本站不用后者去补前者的不足。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 9 · 后续值得关注的进展
     * ---------------------------------------------------------------- */
    {
      id: 'sec-funding-watch',
      kind: 'watch',
      title: '后续值得关注的进展',
      blocks: [
        {
          id: 'blk-funding-27',
          type: 'list',
          items: [
            '2026 年 9 月：三家资助方是否答复本站关于评分表的书面查询。若有任何一家公开匿名化评审记录，本文对第三种立场的证据评级将立即重新评估[[c:cit-funding-28]]。',
            '2026 年 10 月：韦拉女性主义组织联盟是否为公开信中的三处指控补充凭据。若补充，本站将对第一条核查重新走一遍完整流程并公开修订理由[[c:cit-funding-13]]。',
            '2026 年 11 月：图兰独立新闻社所公布的两份内部纪要是否获得签署方确认或第三方鉴定[[c:cit-funding-14]][[c:cit-funding-15]]。',
            '2027 年 1 月：北屿常设大会是否修改代表资格规则，或平等事务监察署是否调整认可团体登记的准入条件——这决定了下一次表决的「多数」由谁构成[[c:cit-funding-10]][[c:cit-funding-11]]。',
            '2027 年 3 月：下一版资金流向审视是否新增按组织规模与工作语言分列的申请成功率题项。这是唯一能把本文多数未决问题变成可回答问题的改动[[c:cit-funding-04]][[c:cit-funding-28]]。',
            '待定：是否出现一项以代表性抽样为设计的后续研究，用以估计「类目改写工作描述」的普遍程度。现有证据只能确认机制存在[[c:cit-funding-05]][[c:cit-funding-06]]。',
          ],
        },
      ],
    },
  ],

  /* ------------------------------------------------------------------ *
   * 引用
   * ------------------------------------------------------------------ */
  citations: [
    { id: 'cit-funding-01', sourceId: 'src-pancont-funding-review-2026', locator: '汇总表 2 · 收入构成', claim: '214 家填报机构的收入加总中，国际基金会占 38%、政府与公共资金占 24%、个人小额捐赠占 16%。' },
    { id: 'cit-funding-02', sourceId: 'src-pancont-funding-review-2026', locator: '方法与限制 §1', claim: '问卷填报出于自愿，受限环境中运作的组织普遍缺席，报告本身写明这一点。' },
    { id: 'cit-funding-03', sourceId: 'src-pancont-funding-review-2026', locator: '方法与限制 §3', claim: '构成比按金额加总计算，一笔大额资助足以盖过数十家小组织的全部收入。' },
    { id: 'cit-funding-04', sourceId: 'src-pancont-funding-review-2026', locator: '附件 · 问卷全文与资助方名单', claim: '报告公布了问卷全文、214 家填报机构的分布与自身的资助方名单。' },
    { id: 'cit-funding-05', sourceId: 'src-transregional-movement-fieldwork-2025', locator: '发现 §2 · 类目适配', claim: '多点民族志记录了组织为适配资助方的主题类目而改写自身工作描述、把连续服务拆成可申报项目的过程。' },
    { id: 'cit-funding-06', sourceId: 'src-transregional-movement-fieldwork-2025', locator: '样本与限制', claim: '该研究覆盖四个辖区的六家组织，作者明确表示不追求代表性。' },
    { id: 'cit-funding-07', sourceId: 'src-transregional-movement-fieldwork-2025', locator: '方法 · 田野时长与编码簿', claim: '该研究经同行评审，公开了田野时长、编码簿与研究者立场声明。' },
    { id: 'cit-funding-08', sourceId: 'src-norhold-assembly-minutes-2026', locator: '议程 3 · 表决记录', claim: '2026 年春季常设大会就资助分配立场进行记名表决并通过决议，票数记录在案。' },
    { id: 'cit-funding-09', sourceId: 'src-norhold-assembly-minutes-2026', locator: '秘书处说明', claim: '会议记录经秘书处摘要处理，发言原话与被删节的部分无法还原。' },
    { id: 'cit-funding-10', sourceId: 'src-norhold-equality-register-2026', locator: '名册说明 §1', claim: '认可团体登记名册决定哪些组织可派代表进入常设大会与法定咨询程序。' },
    { id: 'cit-funding-11', sourceId: 'src-norhold-equality-register-2026', locator: '名册说明 §3', claim: '名册按季度更新并公布被拒登记的理由，增减情况可以核对。' },
    { id: 'cit-funding-12', sourceId: 'src-veyra-coalition-letter-2026', locator: '正文与署名名单', claim: '公开信主张资助方的「包容性标准」正在被用于排除，附有 47 家署名组织的完整名单与联系方式。' },
    { id: 'cit-funding-13', sourceId: 'src-veyra-coalition-letter-2026', locator: '第 4–6 段', claim: '公开信中关于资金分配的三处具体指控未附任何凭据。' },
    { id: 'cit-funding-14', sourceId: 'src-turan-agency-movement-split-2026', locator: '报道正文与影印件附图', claim: '图兰独立新闻社公布两份内部会议纪要的影印件，并给了被批评一方完整的回应空间。' },
    { id: 'cit-funding-15', sourceId: 'src-turan-agency-movement-split-2026', locator: '编辑说明', claim: '两份纪要的真实性未经第三方鉴定。' },
    { id: 'cit-funding-16', sourceId: 'src-maran-coastal-collective-2026', locator: '来函全文栏', claim: '岛链通讯直接采访了争议双方并刊出双方来函全文。' },
    { id: 'cit-funding-17', sourceId: 'src-maran-coastal-collective-2026', locator: '编辑部说明', claim: '该编辑部只有两名兼职人员，未对会议记录等书面材料做独立核对。' },
    { id: 'cit-funding-18', sourceId: 'src-maran-sea-rescue-network-2025', locator: '附件 · 航次记录与审计意见', claim: '年度报告附有逐次出航的航次记录与经费审计意见。' },
    { id: 'cit-funding-19', sourceId: 'src-maran-sea-rescue-network-2025', locator: '数据范围说明', claim: '报告数据只覆盖该网络自身参与的救援，其他行动者的案例不在其中。' },
    { id: 'cit-funding-20', sourceId: 'src-mira-legal-caseload-2026', locator: '计数规则与利益冲突声明', claim: '米拉妇女法律中心公布案件计数规则、资金来源与利益冲突声明。' },
    { id: 'cit-funding-21', sourceId: 'src-mira-legal-caseload-2026', locator: '限制说明', claim: '该机构数字来自自身受理记录，只代表求助人群而非全体人群。' },
    { id: 'cit-funding-22', sourceId: 'src-norhold-diaspora-legal-aid-2026', locator: '经费与流程说明', claim: '移民妇女法律互助会公布自身经费来源、个案计数规则与翻译流程。' },
    { id: 'cit-funding-23', sourceId: 'src-norhold-diaspora-legal-aid-2026', locator: '方法与限制', claim: '该报告样本仅限主动求助者，不能推及全体移民妇女。' },
    { id: 'cit-funding-24', sourceId: 'src-maran-partisan-bulletin-2026', locator: '通讯第 1 页', claim: '某竞选阵营在宣传通讯中称相关组织的资金来自境外议程。' },
    { id: 'cit-funding-25', sourceId: 'src-maran-partisan-bulletin-2026', locator: '通讯所引三项统计', claim: '通讯中引用的三项统计均未注明出处，其中一项与自治区统计口径明显不符。' },
    { id: 'cit-funding-26', sourceId: 'src-turan-trans-survey-2026', locator: '样本说明（报告首页）', claim: '该调查公布问卷全文与招募渠道，但样本以滚雪球方式取得、集中在两座城市，机构自陈不可推及全国。' },
    { id: 'cit-funding-27', sourceId: 'src-norhold-trans-health-alliance-2026', locator: '方法 · 回收率与未回复名单', claim: '该服务审计公布了问卷原文、回收率与未回复名单，并指出未回复者可能等待更久。' },
    { id: 'cit-funding-28', sourceId: 'src-pancont-funding-review-2026', locator: '附件 · 问卷全文（题项清单）', claim: '本站比对问卷全文，确认其中不含申请成功率与评审评分的题项；本站也未取得任何资助方的评审规则或评分表。' },
  ],

  sourceIds: [
    'src-pancont-funding-review-2026',
    'src-transregional-movement-fieldwork-2025',
    'src-norhold-assembly-minutes-2026',
    'src-norhold-equality-register-2026',
    'src-veyra-coalition-letter-2026',
    'src-turan-agency-movement-split-2026',
    'src-maran-coastal-collective-2026',
    'src-maran-sea-rescue-network-2025',
    'src-mira-legal-caseload-2026',
    'src-norhold-diaspora-legal-aid-2026',
    'src-maran-partisan-bulletin-2026',
    'src-turan-trans-survey-2026',
    'src-norhold-trans-health-alliance-2026',
  ],

  factCheckIds: ['fc-funding-01', 'fc-funding-02', 'fc-funding-03', 'fc-funding-04'],

  riskFlags: [
    {
      id: 'risk-funding-01',
      kind: 'bias',
      severity: 'high',
      note: '本文所涉多家组织与本站在选题立场上接近，且本站自身也依赖公民社会资金生态。自动审查提示两个方向的风险：因立场契合而放宽对运动方主张的证据要求，或为显示公正而对证据最薄弱的一方过度让步。',
      requiresSecondConfirm: false,
      raisedBy: 'ai-review',
      resolved: true,
      resolutionNote: '已解除：三种立场适用同一评级标准（支撑该立场的可核对材料有多少），并在正文中明确写出「证据最强不等于后果最中立」与「评为弱不等于指控为假」两条，避免评级被读成对各方诚信的排序。编辑另在文中披露了本站无法取得资助方文件这一共同限制。',
    },
    {
      id: 'risk-funding-02',
      kind: 'defamation',
      severity: 'medium',
      note: '关于「本次评审系统性压低某类申请」的指控涉及具体机构的行为，若未严格归因可能构成名誉风险；对竞选阵营统计数据的批评同样需要逐句可核对。',
      requiresSecondConfirm: false,
      raisedBy: 'legal-check',
      resolved: true,
      resolutionNote: '已解除：所有指控均归因到具体文件（公开信段落、通讯社影印件、竞选通讯页码），正文写明各自的证据状态；本站已向三家资助方与联盟秘书处发出书面查询并在文中注明截至发稿未获答复。删去初稿中一处对资助方动机的推断。',
    },
    {
      id: 'risk-funding-03',
      kind: 'source-safety',
      severity: 'medium',
      note: '引用两份内部会议纪要可能使提供者面临组织内部的报复；在受限环境中，指认某组织接受特定境外资助也可能带来行政或安全后果。',
      requiresSecondConfirm: false,
      raisedBy: 'editor',
      resolved: true,
      resolutionNote: '已解除：本站不转载纪要影印件，只引用通讯社已公开发表的部分与其编辑说明；不指名任何具体组织的资助方对应关系，资金构成一律以汇总比例呈现。',
    },
    {
      id: 'risk-funding-04',
      kind: 'image-ethics',
      severity: 'low',
      note: '配图不得暗示某一方为「分裂者」，也不得使用会把运动内部争议图像化为对抗场面的构图。',
      requiresSecondConfirm: false,
      raisedBy: 'ai-review',
      resolved: true,
      resolutionNote: '已解除：封面与社交素材均改为抽象分流构图，不含人物、旗帜、对峙姿态或任何组织标识，并加注「概念插图 · AI 生成 · 非新闻现场」。',
    },
  ],

  citationChecks: [
    { citationId: 'cit-funding-01', status: 'found', reason: '汇总表 2 中三项构成比均可定位，核查另用报告附表的绝对金额重算，比例一致。', checkedAt: '2026-08-25T21:10:00Z' },
    { citationId: 'cit-funding-02', status: 'found', reason: '方法与限制第 1 节为报告原文自述，核查逐句比对，正文表述未作强化。', checkedAt: '2026-08-25T21:12:00Z' },
    { citationId: 'cit-funding-03', status: 'found', reason: '方法与限制第 3 节明确说明按金额加总的效果；核查用附表验证最大三笔资助占加总额的比重，与该说明一致。', checkedAt: '2026-08-25T21:15:00Z' },
    { citationId: 'cit-funding-04', status: 'found', reason: '问卷全文、机构分布表与资助方名单三份附件均可下载并完整，核查确认非摘要版本。', checkedAt: '2026-08-25T21:18:00Z' },
    { citationId: 'cit-funding-05', status: 'found', reason: '发现第 2 节载有类目适配的编码与三段田野记录摘录，核查确认正文表述未超出该节结论范围。', checkedAt: '2026-08-25T21:23:00Z' },
    { citationId: 'cit-funding-06', status: 'found', reason: '样本与限制章节原文载明四个辖区六家组织与不追求代表性的声明。', checkedAt: '2026-08-25T21:24:00Z' },
    { citationId: 'cit-funding-07', status: 'found', reason: '方法章节公开田野时长、编码簿与研究者立场声明；核查确认编码簿为可下载附件。', checkedAt: '2026-08-25T21:26:00Z' },
    { citationId: 'cit-funding-08', status: 'partial', reason: '议程 3 的表决结果与「记名表决」字样可定位；但会议记录只给出通过与否及总票数，未逐项列出赞成与反对的分项票数，因此正文只写「票数记录在案」，未给出具体比数。', checkedAt: '2026-08-25T21:31:00Z' },
    { citationId: 'cit-funding-09', status: 'found', reason: '秘书处说明原文载明记录经摘要处理，核查确认原始发言稿未随记录公布。', checkedAt: '2026-08-25T21:33:00Z' },
    { citationId: 'cit-funding-10', status: 'found', reason: '名册说明第 1 节载明登记与代表资格、法定咨询程序的连接关系。', checkedAt: '2026-08-25T21:36:00Z' },
    { citationId: 'cit-funding-11', status: 'found', reason: '核查比对名册两个季度版本，确认拒绝登记理由随版本公布且增减可追溯。', checkedAt: '2026-08-25T21:38:00Z' },
    { citationId: 'cit-funding-12', status: 'found', reason: '公开信正文与 47 家署名机构名单均可定位，核查逐条确认署名机构的联系方式字段完整。', checkedAt: '2026-08-25T21:42:00Z' },
    { citationId: 'cit-funding-13', status: 'found', reason: '核查逐段检视公开信第 4 至 6 段，确认三处涉及资金分配的指控均无脚注、附件或引用来源。', checkedAt: '2026-08-25T21:45:00Z' },
    { citationId: 'cit-funding-14', status: 'partial', reason: '报道正文与被批评方的回应段落均可定位；但影印件仅以低分辨率图片发布，核查的文本提取失败，无法比对报道所引段落与影印件内容是否一致。', checkedAt: '2026-08-25T21:50:00Z' },
    { citationId: 'cit-funding-15', status: 'missing', reason: '核查无法验证两份纪要影印件的真实性：通讯社未做鉴定、未公布获取途径，图片无可提取文本，签署方也未公开确认。正文因此只把该来源用于「存在此类指控」，不用于指控内容本身。', checkedAt: '2026-08-25T21:53:00Z', acknowledged: true, acknowledgedNote: '相关陈述已改为归因表述：影印件只用于说明「存在此类指控」，「不存在」形式的主张改为说明核查方式与其限度。', acknowledgedBy: '主编（你）' },
    { citationId: 'cit-funding-16', status: 'found', reason: '来函全文栏中双方文本均完整刊出，核查确认非节选。', checkedAt: '2026-08-25T21:57:00Z' },
    { citationId: 'cit-funding-17', status: 'found', reason: '编辑部说明中载明人员规模与未作独立核对，为该媒体自述。', checkedAt: '2026-08-25T21:58:00Z' },
    { citationId: 'cit-funding-18', status: 'found', reason: '航次记录与经费审计意见两份附件均可下载，核查确认审计意见由外部事务所出具。', checkedAt: '2026-08-25T22:02:00Z' },
    { citationId: 'cit-funding-19', status: 'found', reason: '数据范围说明原文限定为该网络自身参与的救援。', checkedAt: '2026-08-25T22:03:00Z' },
    { citationId: 'cit-funding-20', status: 'found', reason: '计数规则、资金来源与利益冲突声明三项均在报告前言中，核查逐项确认。', checkedAt: '2026-08-25T22:06:00Z' },
    { citationId: 'cit-funding-21', status: 'found', reason: '限制说明原文载明数字仅代表求助人群，与正文表述一致。', checkedAt: '2026-08-25T22:07:00Z' },
    { citationId: 'cit-funding-22', status: 'found', reason: '经费来源、个案计数规则与翻译流程三项均可在报告说明部分定位。', checkedAt: '2026-08-25T22:10:00Z' },
    { citationId: 'cit-funding-23', status: 'found', reason: '方法与限制章节原文载明样本仅限主动求助者。', checkedAt: '2026-08-25T22:11:00Z' },
    { citationId: 'cit-funding-24', status: 'found', reason: '通讯第 1 页可逐字定位该表述；核查记录该来源带 caution 标记，正文已写明其为竞选材料。', checkedAt: '2026-08-26T09:20:00Z' },
    { citationId: 'cit-funding-25', status: 'found', reason: '核查尝试为通讯所引三项统计定位出处，三项均无注明；其中一项与自治区公布的统计定义不一致，差异可在自治区公开定义文件中直接比对。', checkedAt: '2026-08-26T09:26:00Z' },
    { citationId: 'cit-funding-26', status: 'found', reason: '样本说明位于报告首页，滚雪球招募、两座城市与不可推及全国三点均为机构自述。', checkedAt: '2026-08-26T09:31:00Z' },
    { citationId: 'cit-funding-27', status: 'partial', reason: '问卷原文、回收率与未回复名单均可定位；但「未回复者可能等待更久」在原报告中是作者提出的推测而非发现，正文已按推测处理，核查仍标记以防后续引用时被升格。', checkedAt: '2026-08-26T09:35:00Z' },
    { citationId: 'cit-funding-28', status: 'missing', reason: '这是一项「不存在」形式的主张，自动核查无法正向验证：核查确认问卷全文题项清单中没有申请成功率与评分相关题项，但无法排除该观察站以问卷之外的方式采集过这些数据，也无法证明资助方从未在别处公布评分表。正文已据此改写为「问卷全文中不含相关题项」与「本站未取得」，不写「该数据不存在」。', checkedAt: '2026-08-26T09:41:00Z', acknowledged: true, acknowledgedNote: '相关陈述已改为归因表述：影印件只用于说明「存在此类指控」，「不存在」形式的主张改为说明核查方式与其限度。', acknowledgedBy: '主编（你）' },
  ],

  assetIds: ['img-funding-cover', 'img-funding-chart', 'img-funding-social'],
  chartIds: ['chart-movement-funding-mix'],

  translations: [
    { lang: 'en', label: 'English', status: 'human-reviewed', title: 'The pan-continental funding dispute: three positions inside the movement, and the evidence behind each', standfirst: 'Three positions, three different evidence bases — and the best-evidenced one is also the one whose consequences are least neutral.' },
    { lang: 'fr', label: 'Français', status: 'human-reviewed', title: 'Le différend sur l’allocation des fonds : trois positions dans le mouvement et les preuves de chacune' },
    { lang: 'es', label: 'Español', status: 'machine-draft', title: 'La disputa por la asignación de fondos: tres posiciones dentro del movimiento y la evidencia de cada una' },
    { lang: 'sw', label: 'Kiswahili', status: 'not-started' },
  ],

  corrections: [],

  currentVersionId: 'ver-funding-1',
  byline: 'PRISM 自动编辑台起草 · 运动议题编辑组复核',
  provenance:
    '自动编辑台完成五种语言的搜集、资金问卷题项清单的逐项比对、三份机构报告的方法披露评分与引用初检；人类编辑重写了分歧一节的评级理由、加入「证据最强不等于后果最中立」一段、删去初稿中对资助方动机的推断，并作出在未取得评分表的情况下仍然发布、但把该缺口写进标题旁的决定。',
  featured: false,
  demo: true,
}

/* ==================================================================== *
 * 事实核查记录
 * ==================================================================== */

export const factChecks: FactCheck[] = [
  {
    id: 'fc-funding-01',
    articleId: 'art-funding',
    claim: '本次「包容性标准」评审系统性压低了小型与非主导语言组织的评分。',
    claimOrigin: '2026 年 6 月 9 日韦拉女性主义组织联盟公开信第 4 至 6 段，以及图兰独立新闻社 8 月 6 日报道所公布的两份内部会议纪要影印件。',
    spreadNote: '这条说法在两周内被区域内多家组织的通讯转述，转述中普遍省略了「据公开信称」的归属，变成对分配结果的直接陈述。本站在核查中把「有人提出这项指控」与「这项指控成立」分开处理。',
    verdict: 'insufficient-evidence',
    summary:
      '没有任何资助方公开过评审规则或评分表，现有材料是两份真实性未经鉴定的内部纪要与一封三处指控未附凭据的公开信。现有证据既不足以支持也不足以否定这条说法。',
    reasoning: [
      '检查是否存在可核对的一手材料：本站比对了资金观察公布的问卷全文，确认其中不含申请成功率与评审评分题项，也未取得任何资助方的评审规则或评分表[[c:cit-funding-28]]。',
      '检查公开信本身能支撑什么：该信附有 47 家署名机构的完整名单，作为立场文本可靠[[c:cit-funding-12]]；但涉及资金分配的三处指控没有附任何凭据[[c:cit-funding-13]]。',
      '检查通讯社材料能支撑什么：报道公布了两份内部纪要影印件并给了被批评方回应空间[[c:cit-funding-14]]，但纪要真实性未经第三方鉴定，本站也未取得可读副本[[c:cit-funding-15]]。',
      '明确本结论不是什么：缺乏足够证据不等于该说法为假。使它无法判定的直接原因是资助方未公开评分表，而不是提出指控的一方失信[[c:cit-funding-28]]。本站已向三家资助方与联盟秘书处发出书面查询，截至发稿未获答复。',
      '同时避免反向偏差：本站也不因为运动内部的多数意见倾向于相信这条指控而调高结论，正如本站不因为它对资助方不利而调低结论。',
    ],
    citationIds: ['cit-funding-12', 'cit-funding-13', 'cit-funding-14', 'cit-funding-15', 'cit-funding-28'],
    whatWouldChangeIt:
      '任一资助方公开评审规则、评分表或匿名化的评审记录；或纪要签署方公开确认纪要内容、第三方完成文件鉴定；或资金问卷新增按组织规模与工作语言分列的申请成功率题项。三者中任何一项出现，本结论都会重新走一遍完整核查流程。',
    checkedAt: '2026-08-26',
    reviewedBy: '事实核查编辑 · 运动议题编辑组复核',
  },
  {
    id: 'fc-funding-02',
    articleId: 'art-funding',
    claim: '国际基金会占女性主义与 LGBTQIA+ 组织资金构成的近四成，是最大的单一来源。',
    claimOrigin: '出自泛洲公民社会资金观察 2026 年 3 月《资金流向审视 2025》的汇总表，随后被争论各方广泛引用。',
    spreadNote: '这个数字被三种立场同时引用，但引用时几乎都省略了两项限定：样本是自愿填报的，比例是按金额加总的。省略之后，同一个数字既能用来证明「运动被外部资助主导」，也能用来证明「小额捐赠不重要」。',
    verdict: 'true-missing-context',
    summary:
      '38% 这个数字本身准确，但它描述的是 214 家自愿填报机构按金额加总的构成。缺席的组织与加总方式都会系统性地改变它，而这两点在绝大多数转述中被略去。',
    reasoning: [
      '核实数值：汇总表 2 中三项构成比可直接定位，核查另用附表绝对金额重算，比例一致[[c:cit-funding-01]]。',
      '核实样本：填报出于自愿，受限环境中运作的组织普遍缺席，这一点由报告自身写明[[c:cit-funding-02]]。',
      '核实加总方式：比例按金额加总，一笔大额资助足以盖过数十家小组织的全部收入[[c:cit-funding-03]]；因此这张图描述的是大额资助的构成，不是组织数量的构成。',
      '判定为「基本属实但缺乏语境」而非「具有误导性」：数值与「最大单一来源」的排序在该样本内都成立，问题出在省略限定条件，而不是呈现方式本身导致相反结论。',
    ],
    citationIds: ['cit-funding-01', 'cit-funding-02', 'cit-funding-03', 'cit-funding-04'],
    whatWouldChangeIt:
      '若下一版审视扩大到覆盖受限环境中的组织，或同时给出按组织数量加权的第二套构成比，这条说法的语境问题即被消除，结论将改为「有充分证据支持」；若扩大样本后构成比显著变化，则改为「部分属实」并逐条说明。',
    checkedAt: '2026-08-26',
    reviewedBy: '事实核查编辑',
  },
  {
    id: 'fc-funding-03',
    articleId: 'art-funding',
    claim: '这些组织 80% 的资金来自境外。',
    claimOrigin: '2026 年 8 月 2 日马兰岛「群岛之家」竞选阵营的宣传通讯第 1 页。',
    spreadNote: '该数字在两周内进入两场地方竞选辩论，并被用来支持一项要求境外资助登记的提案。本站核查它，是因为它已经在把一场关于分配的内部争论重述为一场关于「外国势力」的争论，而这种重述对争论中的所有各方都有实际后果。',
    verdict: 'mostly-false',
    summary:
      '该数字没有任何出处，与现有唯一一份系统性资金构成数据相差甚远——后者显示国际基金会 38%、政府与公共资金 24%。仅「境外资助确实是最大的单一来源」这一点是其中残留的真实成分。',
    reasoning: [
      '寻找出处：通讯所引三项统计均未注明来源，核查逐项尝试定位均无结果[[c:cit-funding-25]]。',
      '与最佳可用数据比对：现有唯一系统性构成数据显示国际基金会占 38%，政府与公共资金占 24%，个人小额捐赠占 16%[[c:cit-funding-01]]。即便把国际基金会与部分跨境公共资金全部计为「境外」，也与 80% 相去甚远。',
      '检查同一材料的其他统计：该通讯所引另一项统计与自治区公布的统计定义不一致，差异可在自治区公开定义文件中直接比对[[c:cit-funding-25]]。同一份材料中出现口径错误，降低了其余数字的可信度。',
      '保留残余真实成分：在现有样本中，国际来源确实是最大的单一资金来源[[c:cit-funding-01]]。因此本站采用「基本不实」而非「无法核实」——核心主张与一手证据相悖，但存在边缘性的真实成分。',
      '标注对照数据自身的限制：作为对照的资金构成数据本身来自自愿填报样本[[c:cit-funding-02]]，这一限制不改变本结论——因为该说法连一份任何质量的来源都没有提供。',
    ],
    citationIds: ['cit-funding-01', 'cit-funding-02', 'cit-funding-24', 'cit-funding-25'],
    whatWouldChangeIt:
      '该阵营公布这一数字的计算方法与数据来源，且其结果可被独立复算；或出现一份覆盖面更广、含境内外资金分列的审计数据显示境外比重接近 80%。',
    checkedAt: '2026-08-26',
    reviewedBy: '事实核查编辑 · 法律复核',
  },
  {
    id: 'fc-funding-04',
    articleId: 'art-funding',
    claim: '常设大会的决议代表了运动的多数意见。',
    claimOrigin: '2026 年 2 月 27 日表决后，由多方在各自通讯与社群帖文中作出的概括；表决本身记录在常设大会的公开会议记录中。',
    spreadNote: '这句话在转述中逐步从「大会多数通过」变成「运动的多数支持」，两者之间隔着一个入场资格问题。本站核查的正是这个中间环节。',
    verdict: 'partly-true',
    summary:
      '可拆分：表决属实、票数记录在案，这部分成立；但「运动的多数」不成立，因为谁能派代表进入大会由认可团体登记名册决定，名册之外的组织没有投票权。',
    reasoning: [
      '核实表决部分：议程 3 载有记名表决与通过结果，票数记录在案[[c:cit-funding-08]]。这部分成立。',
      '核实代表性部分：进入大会的资格由平等事务监察署的认可团体登记名册界定[[c:cit-funding-10]]；名册公开且拒绝登记理由公开，因此这一限制本身可以核对[[c:cit-funding-11]]。名册之外的组织无投票权，「多数」因此是一个被界定过的选民范围内的多数。',
      '核实记录本身的限度：会议记录经秘书处摘要处理，各方完整论证与被删节部分无法还原，因此也无法从记录中判断少数派的构成[[c:cit-funding-09]]。',
      '说明拆分理由：本站采用「部分属实」而非「具有误导性」，因为说这句话的人多数并未隐瞒登记制度的存在——该制度公开可查；问题在于概括时跨越了一个真实存在的资格边界。',
    ],
    citationIds: ['cit-funding-08', 'cit-funding-09', 'cit-funding-10', 'cit-funding-11'],
    whatWouldChangeIt:
      '若常设大会公布未登记组织的旁听或咨询性投票结果，或监察署放宽认可登记的准入条件使名册覆盖面显著扩大，「多数」所指的范围将改变，本结论会相应重估；若会议记录改为公布完整发言与分项票数，少数派构成也将首次可核。',
    checkedAt: '2026-08-26',
    reviewedBy: '事实核查编辑 · 运动议题编辑组复核',
    history: [
      {
        at: '2026-08-25',
        verdict: 'true-missing-context',
        note: '首次核查只核对了表决记录，认定「表决属实、缺少登记制度这一背景」，定为基本属实但缺乏语境。',
      },
      {
        at: '2026-08-26',
        verdict: 'partly-true',
        note: '复核时确认这句话可以拆成两个可分别判定的部分：表决成立、「运动的多数」不成立。按编辑方法，可拆分且一真一假的说法应判为部分属实，因此修订结论。旧结论与本条修订理由一并保留公开。',
      },
    ],
  },
]

/* ==================================================================== *
 * 视觉素材
 * ==================================================================== */

export const assets: ImageAsset[] = [
  {
    id: 'img-funding-cover',
    articleId: 'art-funding',
    kind: 'cover',
    label: '封面 · 三条不等宽的分流',
    caption: '概念插图 · AI 生成 · 非新闻现场：一束光被分成三条宽度不等的支流，宽度对应本文对三种立场的证据评级，不对应任何组织的规模或影响力。',
    conceptual: true,
    prompt: '抽象几何构图：一条光带经棱镜分为三条宽度明显不等的支流，三条支流平行延伸不交叉；低饱和冷色；无人物、无旗帜、无对峙姿态、无文字、无组织标识。',
    palette: ['--prism-5', '--prism-2', '--ink-700', '--paper-050'],
    motif: 'prism-fold',
    status: 'approved',
    guardrail: '不把运动内部争议图像化为对抗或分裂场面，不出现人物、旗帜与组织标识；支流宽度在图注中明确说明只对应证据评级，避免被读作对各方规模或正当性的排序。',
    createdAt: '2026-08-26T15:40:00Z',
  },
  {
    id: 'img-funding-chart',
    articleId: 'art-funding',
    kind: 'chart',
    label: '图表 · 资金来源构成',
    caption: '数据来源：泛洲公民社会资金观察《公民社会资金流向审视 2025》，214 家自愿填报机构。本图按金额加总，无法说明组织数量的构成，也无法反映受限环境中缺席组织的收入结构。',
    conceptual: false,
    palette: ['--prism-5', '--prism-1', '--ink-600', '--paper-100'],
    motif: 'ledger',
    status: 'approved',
    guardrail: '图注首行同时给出数据来源与本图无法说明的内容；自愿填报与按金额加总两项限制写在图注而非脚注，防止该图被单独截取传播时脱离限制条件。',
    createdAt: '2026-08-26T15:47:00Z',
    chartId: 'chart-movement-funding-mix',
  },
  {
    id: 'img-funding-social',
    articleId: 'art-funding',
    kind: 'social',
    label: '社交素材 · 三种立场与各自的证据',
    caption: '概念插图 · AI 生成 · 非新闻现场：分享卡片，正面只呈现三条立场标签与各自的证据评级，不呈现任何组织名称或人物。',
    conceptual: true,
    prompt: '抽象分享卡：三条不等宽的水平色带自左向右延伸，每条附一个纯文字标签位；无人物、无标识、无引号截图样式。',
    palette: ['--prism-5', '--prism-3', '--ink-500', '--paper-050'],
    motif: 'signal',
    status: 'approved',
    guardrail: '卡片不摘录任何一方的原话，避免脱离语境的引语在平台上被当作对方立场的定性；三条色带宽度与正文评级一致，卡片背面附本文对评级含义的说明链接。',
    createdAt: '2026-08-26T15:53:00Z',
  },
]
