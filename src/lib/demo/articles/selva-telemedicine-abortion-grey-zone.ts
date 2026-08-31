/**
 * PRISM 棱镜 — 演示条目：塞尔瓦远程医疗堕胎的法律灰区。
 *
 * 全部为虚构演示内容。塞尔瓦联邦、其卫生统计司、药品监管机构、港区法院、
 * 泛洲人权理事会、韦拉最高法院、阿米拉特王国与本文引用的一切机构、条文与数字
 * 都不存在，也不对应任何真实辖区、真实法律、真实判决或真实医疗服务。
 */
import type { Article, ImageAsset } from '../../types'

export const article: Article = {
  id: 'art-selva',
  slug: 'selva-telemedicine-abortion-grey-zone',
  title: '塞尔瓦远程医疗堕胎的法律灰区：三部法律，三种解释',
  titleEn: 'Telemedicine abortion in Selva’s legal grey zone: three statutes, three readings',
  standfirst:
    '在塞尔瓦联邦，通过远程问诊取得终止妊娠药物既没有被明确允许，也没有被明确禁止。三部法律各自给出一种读法，三个主管机关各自采用其中一种，而承担这种不确定性的既不是部委也不是法院。本文发布六天后，港区法院就一起相关案件作出裁决——本站尚未取得裁决全文，因此整篇已标记为需更新。',
  countries: ['塞尔瓦联邦'],
  region: '南方大陆',
  topics: ['repro', 'rights'],
  status: 'update-needed',
  createdAt: '2026-08-18T04:40:00Z',
  updatedAt: '2026-08-27T08:30:00Z',
  publishedAt: '2026-08-20T09:00:00Z',
  readingTime: 11,
  confidence: 79,
  confidenceBasis:
    '可及性数据与孕产结局研究都可复算、方法公开；但本站始终未能取得三部法律的官方合订文本，对条文关系的全部描述都转自泛洲人权理事会意见中对缔约国自身报告的转述——这一条是本文置信度的主要上限，也是本文迄今最大的证据缺口。',
  contentNotice:
    '本文涉及刑事追诉风险下的生育照护、授权延迟造成的孕产并发症，以及一起正在进行的司法程序。文中不含任何当事人的姓名、影像、就诊机构或可拼合识别的个人信息，也不描写任何个案的具体经历。',
  sections: [
    /* ---------------------------------------------------------------- *
     * 1 · 事件与核心事实
     * ---------------------------------------------------------------- */
    {
      id: 'sec-selva-facts',
      kind: 'facts',
      title: '事件与核心事实',
      blocks: [
        {
          id: 'blk-selva-01',
          type: 'paragraph',
          text:
            '塞尔瓦联邦的三个主管机关对同一件事给出三种读法：远程问诊后开具并寄送终止妊娠药物，究竟受哪一部法律管辖。卫生主管部门主张这属于《远程医疗服务条例》意义上的合法诊疗行为，处方效力等同当面处方；药品监管机构主张该类药物属于「须在登记机构内交付」的类目，因而配送环节不受远程条例覆盖；检察机关则主张健康法典中的授权程序要求由实施机构完成面诊记录，远程问诊无法满足。这三种主张记载在泛洲人权理事会 2026 年 2 月的意见中，该意见逐段转述了缔约国自己提交的报告并标注了页码与实地访问记录编号[[c:cit-selva-01]][[c:cit-selva-02]]。',
        },
        {
          id: 'blk-selva-02',
          type: 'paragraph',
          text:
            '这里必须先说清楚本文的证据边界：本站没有取得这三部法律的官方合订文本，也没有取得任何一个主管机关公开发布的适用解释。上面那一段里的每一种读法，都是国际机构对缔约国报告的转述，而不是条文原文[[c:cit-selva-02]]。这不是一个可以用「据信」「据了解」带过的细节——它决定了本文能说什么：本站可以陈述「三个机关对外表述了三种立场」，不能陈述「法律规定是什么」。同一份意见还记载，在被审查期间没有出现以远程处方为由提起的刑事追诉[[c:cit-selva-03]]；也就是说，检察机关的读法至今没有被任何一次起诉检验过。',
        },
        {
          id: 'blk-selva-03',
          type: 'paragraph',
          text:
            '不确定性的实际后果是可以测量的。塞尔瓦联邦卫生统计司公布的服务可及性统计给出了从登记住址到最近一处在册服务机构的行程距离：首都圈中位数为 6 公里，南部平原为 95 公里[[c:cit-selva-06]]。这份统计同时公布了在册机构名录与距离计算脚本，外部研究者可以用同一套脚本复算[[c:cit-selva-05]][[c:cit-selva-21]]。泛洲人权理事会的意见则认定，法律状态本身的不明确构成对生育健康服务可及性的障碍，并记录了因授权不确定而产生的延迟个案[[c:cit-selva-04]]。距离与不确定性在这里是叠加的：越是需要依赖远程问诊的地方，越没有可以求助的实体机构。',
        },
        {
          id: 'blk-selva-04',
          type: 'paragraph',
          text:
            '与本文直接相关的一起案件在港区法院审理。海岸线报 2026 年 8 月 14 日的报道称该案庭审已多次延期，记者在庭上取得了排期表复印件[[c:cit-selva-16]]；该报道只取到一方的回应，并且没有说明另一方是否被联系过[[c:cit-selva-17]]。本文发布后，本站的自动编辑台在每日监测中捕捉到同一份公开排期表的状态由「待审」变为「已裁判」。状态变更本身没有可引用的文件记录，裁决全文也未上网，因此本文不陈述该裁决的任何内容——不写它判了什么，也不写它可能意味着什么，只记录「已有一份裁决存在」这一点，并把整篇标记为需更新。需要核对的具体条目列在最后一节。',
        },
        {
          id: 'blk-selva-05',
          type: 'timeline',
          entries: [
            {
              date: '2023-05-16',
              title: '区域内另一辖区把终止妊娠写入刑事条款',
              text: '阿米拉特王国官方公报刊出刑法典中涉及终止妊娠的条款与修订沿革；公报不含检察与量刑实践，条文与实际执行之间的差距无从由此判断[[c:cit-selva-12]]。',
              citationIds: ['cit-selva-12'],
              standing: 'documented',
            },
            {
              date: '2024-09-05',
              title: '韦拉最高法院以知情同意与身体自主为标准作出判决',
              text: '第 402/2024 号判决把知情同意与身体自主确立为审查标准，判决全文附下级法院查明的事实清单[[c:cit-selva-10]][[c:cit-selva-11]]。该判决对塞尔瓦没有拘束力，只是区域内可比的司法参照。',
              citationIds: ['cit-selva-10', 'cit-selva-11'],
              standing: 'documented',
            },
            {
              date: '2026-02-19',
              title: '泛洲人权理事会发布生育健康服务可及性意见',
              text: '意见转述缔约国报告中三部法律的不同适用主张，认定法律状态不明确本身构成可及性障碍，并记载被审查期间没有以远程处方为由的刑事追诉[[c:cit-selva-01]][[c:cit-selva-04]][[c:cit-selva-03]]。',
              citationIds: ['cit-selva-01', 'cit-selva-03', 'cit-selva-04'],
              standing: 'documented',
            },
            {
              date: '2026-03-11',
              title: '卫生统计司公布服务可及性统计',
              text: '按行政区公布到最近一处在册服务机构的行程距离，附机构名录与距离计算脚本[[c:cit-selva-05]][[c:cit-selva-06]]。',
              citationIds: ['cit-selva-05', 'cit-selva-06'],
              standing: 'documented',
            },
            {
              date: '2026-07-30',
              title: '一份未经评审的预印本发布紧急避孕可及性初步分析',
              text: '作者公开了数据与代码，但该文尚未经过任何同行评审，样本量与分组方式在评审中很可能被要求修改[[c:cit-selva-14]][[c:cit-selva-15]]。本站只把它作为「有研究正在进行」的线索。',
              citationIds: ['cit-selva-14', 'cit-selva-15'],
              standing: 'reported',
            },
            {
              date: '2026-08-14',
              title: '港区法院一起相关案件庭审再度延期',
              text: '海岸线报记者取得排期表复印件；该报道只取到一方回应，且此前报道给出的延期次数与本次不一致，本站未能核实差异原因[[c:cit-selva-16]][[c:cit-selva-17]]。',
              citationIds: ['cit-selva-16', 'cit-selva-17'],
              standing: 'contested',
            },
            {
              date: '2026-08-26',
              title: '同一案件的公开排期表状态变更为「已裁判」',
              text: '本站只观察到公开排期表的状态变更，未取得裁决全文，也没有任何一手记录可引用。本文因此不陈述裁决内容，整篇标记为需更新[[c:cit-selva-16]]。',
              citationIds: ['cit-selva-16'],
              standing: 'reported',
            },
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 2 · 法律、历史与社会背景
     * ---------------------------------------------------------------- */
    {
      id: 'sec-selva-context',
      kind: 'context',
      title: '法律、历史与社会背景',
      blocks: [
        {
          id: 'blk-selva-06',
          type: 'paragraph',
          text:
            '三部法律的时间顺序解释了它们为什么互不衔接。健康法典中的授权程序设计于远程诊疗尚不存在的年代，它把「实施机构」与「授权机构」写成同一个主体；药品分销法的「限定场所配发」类目原本针对的是需要冷链与现场监护的注射制剂；而《远程医疗服务条例》是最晚出台的一部，它处理的是诊疗行为的效力，没有处理药品的物流环节[[c:cit-selva-01]]。三部法律各自内部自洽，冲突发生在它们的接缝处——而接缝处没有任何一个机关负有解释义务。',
        },
        {
          id: 'blk-selva-07',
          type: 'paragraph',
          text:
            '区域内有两个方向相反的参照。一个方向是阿米拉特王国：官方公报刊出的刑法典条款把终止妊娠置于刑事框架内，但公报不包含检察与量刑实践，因此条文与实际执行之间的差距无法由这份文件判断[[c:cit-selva-12]]——这提醒读者，「法律写了什么」与「人们实际面临什么」是两个需要分别取证的问题。另一个方向是韦拉共和国：最高法院第 402/2024 号判决把知情同意与身体自主确立为审查标准，并在判决全文中附上下级法院查明的事实清单，使读者可以区分法院认定的事实与当事人的主张[[c:cit-selva-10]][[c:cit-selva-11]]。该判决对塞尔瓦没有拘束力，本站引用它只是为了说明：当一个辖区的最高审级作出解释时，灰区会以什么形式被关闭。',
        },
        {
          id: 'blk-selva-08',
          type: 'paragraph',
          text:
            '第三条背景线索来自另一个辖区的临床治理实践。北屿的国家临床指南公开了转诊路径的证据评级表与委员的利益申报[[c:cit-selva-23]]，但指南规定的是应然流程，不能用来说明各地实际执行到什么程度[[c:cit-selva-13]]。塞尔瓦缺少的正是这一层：既没有一份公开的转诊路径文件，也就没有一个可以被拿来比对实际执行的基准。在没有基准的情况下，临床人员对法律风险的判断只能各自为政，而这种判断的差异会直接转化为不同地区的服务是否存在。',
        },
        {
          id: 'blk-selva-09',
          type: 'callout',
          tone: 'caution',
          title: '本文对「三部法律」的描述来自何处',
          text:
            '本站未取得三部法律的官方合订文本，也未取得任何主管机关公开发布的适用解释。全部条文关系描述转自泛洲人权理事会意见中对缔约国自身报告的转述，该意见逐段标注了所依据的报告页码与实地访问记录编号[[c:cit-selva-02]]。因此本文可以说「三个机关对外表述了三种立场」，不能说「法律规定是什么」。取得条文原文之前，本节的所有内容都应按这一限制阅读。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 3 · 权力结构与交叉性分析
     * ---------------------------------------------------------------- */
    {
      id: 'sec-selva-power',
      kind: 'power',
      title: '权力结构与交叉性分析',
      blocks: [
        {
          id: 'blk-selva-10',
          type: 'paragraph',
          text:
            '法律灰区不是所有人共同承担的模糊状态，它是一种被向下转移的风险。三个主管机关都不必先作出决定：部委可以维持自己的读法，监管机构可以维持自己的类目，检察机关可以既不起诉也不宣布不起诉[[c:cit-selva-03]]。必须在不确定中做选择的是两类人——需要服务的人，以及签署处方的临床人员。前者承担的是延迟，后者承担的是可能被追诉的职业风险。泛洲人权理事会正是在这个意义上认定不明确本身构成障碍，并记录了因授权不确定而产生的延迟个案[[c:cit-selva-04]]。',
        },
        {
          id: 'blk-selva-11',
          type: 'paragraph',
          text:
            '风险的分布进一步沿着地理与经济分层。中位行程距离在首都圈是 6 公里，在南部平原是 95 公里[[c:cit-selva-06]]；而这项统计只计算道路距离，不包含班次频率、往返费用、法定等待期、机构是否实际提供服务，也不包含从业人员援引良心条款而拒绝的情况[[c:cit-selva-07]]。这意味着真实的可及性差距只会比图上更大，不会更小。对没有稳定住址登记的人、对需要请假两天才能完成一次往返的人、对语言不通而无法在电话里完成远程问诊的人，远程医疗恰恰是唯一可能的路径——而灰区最先关闭的就是这条路径。',
        },
        {
          id: 'blk-selva-12',
          type: 'paragraph',
          text:
            '谁被算进统计，本身也是一种权力。塞尔瓦国家卫生研究所的急诊科筛查研究是同类研究中方法最透明的一份：预先登记分析方案，公布筛查问卷、抽样框与置信区间计算方法，并明确报告 14% 的拒答率[[c:cit-selva-18]]。但它的样本只覆盖到达急诊科并接受主动筛查的就诊者[[c:cit-selva-19]]。本站的判断是：在一个连服务是否合法都不确定的领域，「到达了正规医疗机构」这一条件本身就筛掉了风险最高的一部分人，因此所有基于机构内数据的估计都会系统性偏乐观。这是编辑判断，不是该研究的结论——该研究自己也没有作这一推论。',
        },
        {
          id: 'blk-selva-13',
          type: 'figure',
          assetId: 'img-selva-map',
          caption: '概念插图 · AI 生成 · 非新闻现场：示意投影，辖区为虚构，不对应任何真实地理。同心带表示行程距离的分层，不表示实际路网或机构位置。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 4 · 相关研究与数据
     * ---------------------------------------------------------------- */
    {
      id: 'sec-selva-research',
      kind: 'research',
      title: '相关研究与数据',
      blocks: [
        {
          id: 'blk-selva-14',
          type: 'paragraph',
          text:
            '本文使用的可及性数据来自卫生统计司按行政区公布的行程距离统计。它的方法值得写清楚：以登记住址到在册服务机构的道路距离计算，机构名录与距离脚本一并公开，任何人都可以复算[[c:cit-selva-05]][[c:cit-selva-21]]。下图中的区间是区内住址分布的第 25 至 75 百分位，不是统计误差——把它读成置信区间会同时高估和低估不同区域的情况[[c:cit-selva-07]]。',
        },
        {
          id: 'blk-selva-15',
          type: 'chart',
          chartId: 'chart-selva-abortion-distance',
        },
        {
          id: 'blk-selva-16',
          type: 'paragraph',
          text:
            '在结局层面，可用的最强证据是一项多点队列研究：它报告了授权延迟与孕产并发症之间的关联，经同行评审、预先登记，公开了统计代码与去标识化数据集，并随文刊出评审意见与作者的逐条回应[[c:cit-selva-08]][[c:cit-selva-22]]。必须同时说明它测量的不是本文的主题：该研究的暴露变量是「授权延迟」，不是「远程问诊」[[c:cit-selva-09]]。把它当作远程处方安全性的证据，是本文核查的两条流传说法中的一条所犯的错误。本站在这里也不做反向推论：这项研究同样不能用来证明远程处方不安全。',
        },
        {
          id: 'blk-selva-17',
          type: 'paragraph',
          text:
            '另有一份 2026 年 7 月的预印本对紧急避孕的可及性作了初步分析，作者公开了数据与代码，方法描述完整[[c:cit-selva-14]]。但它尚未经过任何同行评审，样本量与分组方式在评审中很可能被要求修改[[c:cit-selva-15]]，因此本站只把它作为「有研究正在进行」的线索，不引用其任何数值。需要额外说明的是：本站引用的是该预印本的第一版，平台在本文发布后上线了第二版且相关表格已改动，本站尚未完成两版比对——这一点也已计入本文的更新清单。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 5 · 不同来源之间的分歧
     * ---------------------------------------------------------------- */
    {
      id: 'sec-selva-divergence',
      kind: 'divergence',
      title: '不同来源之间的分歧',
      blocks: [
        {
          id: 'blk-selva-18',
          type: 'divergence',
          positions: [
            {
              label: '法律状态不明确本身就是需要被纠正的障碍',
              holder: '泛洲人权理事会',
              position:
                '在三个机关各执一词、又没有任何司法解释的情况下，个人无法预先知道自己的行为是否合法，这种不确定性已经造成可记录的照护延迟，缔约国有义务消除它[[c:cit-selva-04]]。',
              evidence:
                '意见本身是公开文件，逐段标注所依据的缔约国报告页码与实地访问记录编号，读者可以核对每项结论背后有几份材料[[c:cit-selva-02]]；其主张范围也很窄——它断言的是「不确定性造成延迟」，而不是「哪一种读法正确」[[c:cit-selva-04]]。',
              citationIds: ['cit-selva-02', 'cit-selva-04'],
              weight: 'strong',
            },
            {
              label: '远程问诊是合法诊疗行为，处方效力等同当面处方',
              holder: '塞尔瓦联邦卫生主管部门（经缔约国报告转述）',
              position:
                '《远程医疗服务条例》已经确立远程诊疗的效力，终止妊娠照护没有被列为例外，因此处方本身合法[[c:cit-selva-01]]。',
              evidence:
                '这一读法只见于缔约国提交给国际机构的报告，本站未取得该部门任何公开发布的适用解释，也未取得条例原文[[c:cit-selva-02]]。它与既有的转诊治理实践方向一致——北屿等辖区的临床指南同样以诊疗行为效力为轴组织路径[[c:cit-selva-13]]——但方向一致不是证据。',
              citationIds: ['cit-selva-01', 'cit-selva-02', 'cit-selva-13'],
              weight: 'moderate',
            },
            {
              label: '药品必须在登记机构内交付，配送环节不受远程条例覆盖',
              holder: '塞尔瓦药品监管机构（经缔约国报告转述）',
              position:
                '该类药物属于「须在登记机构内交付」的类目，远程条例只处理诊疗行为，没有处理药品的物流环节[[c:cit-selva-01]]。',
              evidence:
                '这一读法有一项间接的旁证：卫生统计司确实维护着一份公开的在册服务机构名录，「登记机构」在制度上是一个真实存在、可核对的类目[[c:cit-selva-05]]。但「须在机构内交付」是否等同于「禁止邮寄」，取决于该机构自己的解释，而这份解释未见公开文本[[c:cit-selva-02]]。',
              citationIds: ['cit-selva-01', 'cit-selva-02', 'cit-selva-05'],
              weight: 'moderate',
            },
            {
              label: '授权程序要求面诊记录，远程问诊无法满足',
              holder: '塞尔瓦检察机关（经缔约国报告转述）',
              position:
                '健康法典的授权程序要求由实施机构完成面诊记录，远程问诊不产生这一记录，因此不符合法定授权条件[[c:cit-selva-01]]。',
              evidence:
                '这是四种立场中证据最薄弱的一种：它同样只见于缔约国报告的转述，而且同一份意见记载，在被审查期间没有出现任何以远程处方为由提起的刑事追诉[[c:cit-selva-03]]。也就是说，这一读法从未被起诉、辩护与裁判的过程检验过，它的全部效力目前来自它被宣示这一事实本身。',
              citationIds: ['cit-selva-01', 'cit-selva-02', 'cit-selva-03'],
              weight: 'weak',
            },
          ],
        },
        {
          id: 'blk-selva-19',
          type: 'paragraph',
          text:
            '本站在这里评的不是哪一种法律解释更正确——那是法院的工作，而本站连条文原文都没有取得。本站评的是每种立场目前有多少可核对的材料支撑：国际机构的立场最强，因为它的文件公开、逐段可追溯，而且它只主张一件很窄的事；两个行政机关的读法居中，因为它们有制度上的合理依托，却都没有公开的解释文本；检察机关的读法最弱，因为它既没有公开文本，也从未经过任何一次司法检验[[c:cit-selva-03]]。需要强调的是，最弱不等于不会发生作用——恰恰相反，一个从未被检验的追诉可能性，正因为无法预先判断，才最有效地压制了服务的提供。',
        },
      ],
    },


    /* ---------------------------------------------------------------- *
     * 7 · 尚未确定的信息
     * ---------------------------------------------------------------- */
    {
      id: 'sec-selva-unknowns',
      kind: 'unknowns',
      title: '尚未确定的信息',
      blocks: [
        {
          id: 'blk-selva-22',
          type: 'callout',
          tone: 'unknown',
          title: '本文最大的空白：条文原文与那份裁决',
          text:
            '本站没有三部法律的官方合订文本，没有任何主管机关的公开适用解释，也没有港区法院裁决的全文。前两项决定了本文只能描述立场而不能描述规范[[c:cit-selva-02]]；第三项决定了本文已经过时的可能性——一份可能改变全部四种立场评级前提的文件已经存在，而本站还没有读到它[[c:cit-selva-16]]。在取得它之前，本站选择不写、不猜、也不用二手转述替代。',
        },
        {
          id: 'blk-selva-23',
          type: 'list',
          items: [
            '港区法院这份裁决说了什么？需要裁决全文。该法院不像联邦庇护法庭那样公开去标识化裁决全文与分类编码手册[[c:cit-selva-20]]，因此本站只能等待上网或依申请调阅。',
            '三部法律的接缝处到底怎么写？需要官方合订文本或任一机关的公开适用解释。目前只有国际机构对缔约国报告的转述[[c:cit-selva-02]]。',
            '有多少人实际通过远程问诊取得了药物？需要一份把远程服务纳入口径的使用量统计。现行可及性统计只测量到实体机构的距离，不测量远程使用[[c:cit-selva-07]]。',
            '临床人员因法律风险而拒绝提供服务的比例是多少？需要一次面向从业者的匿名调查。可及性统计不包含援引良心条款拒绝的情况[[c:cit-selva-07]]；本站也不会在没有安全承诺的情况下向个别临床人员取证。',
            '那份预印本的第二版改了什么？需要逐版比对。本站引用的是第一版，第二版在本文发布后上线且相关表格已改动[[c:cit-selva-15]]。',
            '海岸线报所报道的延期次数为何前后不一致？需要排期表原件的可读副本。该报道所附复印件本站未取得可读版本，也未取得该报社的说明[[c:cit-selva-16]][[c:cit-selva-17]]。',
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 8 · 事件为何重要
     * ---------------------------------------------------------------- */
    {
      id: 'sec-selva-why',
      kind: 'why',
      title: '事件为何重要',
      blocks: [
        {
          id: 'blk-selva-24',
          type: 'paragraph',
          text:
            '以下是本站的编辑分析，与上面的报道部分分开阅读。灰区常被描述成一种立法疏漏，但它在治理上是有功能的：只要三个机关的读法互不衔接而没有人负有解释义务，限制就可以在不经过任何一次公开辩论、不承担任何一次立法表决的情况下生效。没有人需要为「禁止」负责，因为形式上没有人禁止过[[c:cit-selva-03]]。这是本站认为这个题目值得反复追踪的第一个理由：它展示了一种不需要通过法律就能达成的收缩。',
        },
        {
          id: 'blk-selva-25',
          type: 'paragraph',
          text:
            '第二个理由与新闻业本身有关。这篇报道现在处于「需更新」状态，是因为一份可能改变全部判断前提的文件已经存在而本站尚未读到。本站可以选择先用二手转述把稿子补齐，那样读者会得到一篇看起来完整的报道；本站选择的是把缺口写在标题旁边。生育权报道里最常见的伤害之一，就是用听起来确定的语气描述一个实际上不确定的法律状态——读者据此作出的判断会落在自己身上，而不是落在写稿的人身上。在没有拿到裁决全文之前，本文关于「至今没有任何司法解释」的所有表述都应被视为可能已经过时。',
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     * 9 · 后续值得关注的进展
     * ---------------------------------------------------------------- */
    {
      id: 'sec-selva-watch',
      kind: 'watch',
      title: '后续值得关注的进展',
      blocks: [
        {
          id: 'blk-selva-26',
          type: 'callout',
          tone: 'caution',
          title: '本文发布后发生的变化：具体是什么改变了',
          text:
            '改变的是一件事：2026 年 8 月 26 日，港区法院同一案件的公开排期表状态由「待审」变为「已裁判」[[c:cit-selva-16]]。受这一变化影响的具体表述有三处——第一节中「检察机关的读法至今没有被任何一次起诉检验过」、第二节末段关于「没有一个可以被拿来比对实际执行的基准」的判断，以及第五节四种立场评级所依赖的前提「至今没有任何一份可引用的司法解释」。本站尚未取得裁决全文，因此这三处表述保持原样、未作修改，只在此处标注它们可能已经过时。下面第一条列出取得全文后需要逐项核对的内容。',
        },
        {
          id: 'blk-selva-27',
          type: 'list',
          items: [
            '取得港区法院裁决全文后逐项核对五点：(1) 法院以哪一部法律作为处方合法性的判准；(2) 是否对「远程问诊是否构成实施机构的面诊记录」作出解释；(3) 是否处理药品分销法与健康法典的适用顺序；(4) 判决是否具有超出个案的效力；(5) 是否有异议意见。核对完成前本文维持需更新状态[[c:cit-selva-01]][[c:cit-selva-16]]。',
            '2026 年 9 月：该法院是否公开裁决全文。可比的做法是联邦庇护法庭——它公开去标识化裁决全文与分类编码手册[[c:cit-selva-20]]；港区法院是否采用同一标准，本身就是一个值得报道的治理问题。',
            '2026 年 10 月：三个主管机关中是否有任何一个发布公开的适用解释。这是把本文从「描述立场」升级到「描述规范」的唯一路径[[c:cit-selva-02]]。',
            '2027 年 2 月：泛洲人权理事会的下一轮跟进意见是否记录塞尔瓦在消除法律不确定性方面的措施[[c:cit-selva-04]]。',
            '2027 年 3 月：下一版服务可及性统计是否新增远程服务使用量的口径。若仍只统计到实体机构的距离，关于「远程处方是否改善了可及性」的问题将继续无法回答[[c:cit-selva-07]]。',
            '待定：预印本第二版与第一版的逐版比对，以及该文是否进入同行评审。在完成评审之前，本站不会引用其中任何数值[[c:cit-selva-15]]。',
          ],
        },
      ],
    },
  ],

  /* ------------------------------------------------------------------ *
   * 引用
   * ------------------------------------------------------------------ */
  citations: [
    { id: 'cit-selva-01', sourceId: 'src-pancont-repro-observations-2026', locator: '§ 44–47', claim: '意见转述缔约国报告：卫生主管部门、药品监管机构与检察机关分别主张远程医疗条例、药品分销法与健康法典授权程序适用于远程处方，三种读法互斥。' },
    { id: 'cit-selva-02', sourceId: 'src-pancont-repro-observations-2026', locator: '材料索引说明', claim: '意见逐段标注所依据的缔约国报告页码与实地访问记录编号；本文对条文关系的描述均为该意见的转述，而非条文原文。' },
    { id: 'cit-selva-03', sourceId: 'src-pancont-repro-observations-2026', locator: '§ 51', claim: '意见记载在被审查期间没有出现以远程处方为由提起的刑事追诉。' },
    { id: 'cit-selva-04', sourceId: 'src-pancont-repro-observations-2026', locator: '§ 53–55', claim: '意见认定法律状态不明确本身构成对生育健康服务可及性的障碍，并记录了因授权不确定而产生的照护延迟个案。' },
    { id: 'cit-selva-05', sourceId: 'src-selva-abortion-access-stats-2026', locator: '机构名录附件', claim: '卫生统计司公布在册服务机构名录，「登记机构」在制度上是可核对的类目。' },
    { id: 'cit-selva-06', sourceId: 'src-selva-abortion-access-stats-2026', locator: '按行政区分表', claim: '到最近一处在册服务机构的中位行程距离：首都圈 6 公里，南部平原 95 公里。' },
    { id: 'cit-selva-07', sourceId: 'src-selva-abortion-access-stats-2026', locator: '口径说明 §2', claim: '距离以登记住址到在册机构的道路距离计算，不含班次频率、往返费用、法定等待期、机构是否实际提供服务，以及援引良心条款拒绝的情况；区间为住址分布的四分位范围而非统计误差。' },
    { id: 'cit-selva-08', sourceId: 'src-transregional-maternal-study-2025', locator: '结果 §3', claim: '多点队列研究报告授权延迟与孕产并发症之间存在关联。' },
    { id: 'cit-selva-09', sourceId: 'src-transregional-maternal-study-2025', locator: '方法 · 暴露定义', claim: '该研究的暴露变量为授权延迟，不涉及远程问诊，不能用于推断远程处方的安全性。' },
    { id: 'cit-selva-10', sourceId: 'src-veyra-supreme-repro-2024', locator: '判决理由 §3', claim: '韦拉最高法院第 402/2024 号判决把知情同意与身体自主确立为审查标准。' },
    { id: 'cit-selva-11', sourceId: 'src-veyra-supreme-repro-2024', locator: '附件 · 事实清单', claim: '判决全文附下级法院查明的事实清单，可区分法院认定的事实与当事人的主张。' },
    { id: 'cit-selva-12', sourceId: 'src-amirat-penal-code-art-2023', locator: '相关条款与修订沿革', claim: '阿米拉特刑法典设有涉及终止妊娠的刑事条款；官方公报不含检察与量刑实践，无法据此判断条文与执行之间的差距。' },
    { id: 'cit-selva-13', sourceId: 'src-norhold-repro-guidance-2025', locator: '适用说明', claim: '临床指南规定的是应然的转诊流程，不能用来说明各地实际执行到什么程度。' },
    { id: 'cit-selva-14', sourceId: 'src-selva-preprint-contraception-2026', locator: '第一版 · 方法', claim: '一份 2026 年 7 月的预印本对紧急避孕可及性作了初步分析，作者公开了数据与代码。' },
    { id: 'cit-selva-15', sourceId: 'src-selva-preprint-contraception-2026', locator: '版本与评审状态', claim: '该预印本尚未经过任何同行评审，样本量与分组方式可能在评审中被要求修改；本站引用的第一版与随后上线的第二版存在未比对的表格改动。' },
    { id: 'cit-selva-16', sourceId: 'src-coastline-court-report-2026', locator: '正文与所附排期表', claim: '海岸线报报道港区法院一起相关案件庭审延期，记者在庭上取得排期表复印件；该排期表为本站后续观察案件状态变更的同一份公开文件。' },
    { id: 'cit-selva-17', sourceId: 'src-coastline-court-report-2026', locator: '回应部分', claim: '该报道只取到一方的回应，未说明另一方是否被联系过。' },
    { id: 'cit-selva-18', sourceId: 'src-selva-health-er-study-2025', locator: '方法 · 预先登记与拒答率', claim: '急诊科筛查研究预先登记分析方案，公布问卷、抽样框与置信区间计算方法，并报告 14% 的筛查拒答率。' },
    { id: 'cit-selva-19', sourceId: 'src-selva-health-er-study-2025', locator: '样本说明', claim: '该研究样本仅覆盖到达急诊科并接受主动筛查的就诊者。' },
    { id: 'cit-selva-20', sourceId: 'src-selva-asylum-tribunal-2026', locator: '公开政策说明', claim: '塞尔瓦联邦庇护法庭公开去标识化裁决全文与分类编码手册，是同一联邦体系内可比的公开标准。' },
    { id: 'cit-selva-21', sourceId: 'src-selva-abortion-access-stats-2026', locator: '距离计算脚本', claim: '距离计算脚本与机构名录一并公开，外部研究者可以用同一套脚本复算。' },
    { id: 'cit-selva-22', sourceId: 'src-transregional-maternal-study-2025', locator: '同行评审与数据可用性声明', claim: '该研究经同行评审、预先登记，公开统计代码与去标识化数据集，并随文刊出评审意见与作者的逐条回应。' },
    { id: 'cit-selva-23', sourceId: 'src-norhold-repro-guidance-2025', locator: '证据评级表与利益申报', claim: '该临床指南公开了证据评级表与委员名单的利益申报。' },
  ],

  sourceIds: [
    'src-pancont-repro-observations-2026',
    'src-selva-abortion-access-stats-2026',
    'src-transregional-maternal-study-2025',
    'src-veyra-supreme-repro-2024',
    'src-amirat-penal-code-art-2023',
    'src-norhold-repro-guidance-2025',
    'src-selva-preprint-contraception-2026',
    'src-coastline-court-report-2026',
    'src-selva-health-er-study-2025',
    'src-selva-asylum-tribunal-2026',
  ],


  riskFlags: [
    {
      id: 'risk-selva-01',
      kind: 'active-litigation',
      severity: 'high',
      note: '港区法院一起相关案件已由「待审」变为「已裁判」，本站尚未取得裁决全文。发布与任何后续更新都必须区分「指控」「主管机关的读法」与「司法结论」，不得以二手转述描述裁决内容，也不得暗示裁决走向。',
      requiresSecondConfirm: true,
      raisedBy: 'legal-check',
      resolved: false,
      resolutionNote: '未解除：正文已删去全部关于裁决内容的表述，整篇标记为需更新，并在「后续值得关注的进展」中列出取得全文后逐项核对的五点。取得全文并完成核对前，本条保持开启。',
    },
    {
      id: 'risk-selva-02',
      kind: 'identity-exposure',
      severity: 'medium',
      note: '行程距离数据按行政区分列，若与任何个案叙述、就诊机构或时间点结合，在人口稀少的区可能拼合识别到具体个人。',
      requiresSecondConfirm: true,
      raisedBy: 'ai-review',
      resolved: true,
      resolutionNote: '已解除：本文不含任何个案叙述、姓名、年龄、职业、亲属关系或就诊机构名称，也不给出低于行政区一级的地理颗粒度；配图为示意投影，不标注真实路网或机构位置。',
    },
    {
      id: 'risk-selva-03',
      kind: 'source-safety',
      severity: 'medium',
      note: '在法律状态不明确的领域，向临床人员取证可能使其面临执业处分或刑事风险；来自服务提供方的任何一手陈述都需要重新评估同意与匿名方式。',
      requiresSecondConfirm: false,
      raisedBy: 'editor',
      resolved: true,
      resolutionNote: '已解除：本文未向任何临床人员取证，全部内容基于公开文件；「尚未确定的信息」一节明确写出本站不会在没有安全承诺的情况下向个别临床人员取证。',
    },
    {
      id: 'risk-selva-04',
      kind: 'bias',
      severity: 'low',
      note: '本文核查的第二条说法在方向上与本站的价值立场一致，须检查是否因此放宽证据要求。',
      requiresSecondConfirm: false,
      raisedBy: 'ai-review',
      resolved: true,
      resolutionNote: '已解除：该说法与方向相反的第一条适用同一标准，结论为「缺乏足够证据」，并在核查卡片中写明这一判定不等于该说法为假。',
    },
  ],

  citationChecks: [
    { citationId: 'cit-selva-01', status: 'partial', reason: '核查在意见 § 44–47 中定位到三种读法的完整转述，内容与正文一致；但核查未能取得被转述的缔约国报告本身，也未能取得任何一部法律的原文，因此只能验证「意见如此记载」，不能验证「条文如此规定」。', checkedAt: '2026-08-19T20:12:00Z' },
    { citationId: 'cit-selva-02', status: 'found', reason: '核查抽查了意见中 12 处标注，全部可回溯到编号索引，确认逐段标注属实。', checkedAt: '2026-08-19T20:15:00Z' },
    { citationId: 'cit-selva-03', status: 'found', reason: '§ 51 原文载明被审查期间无以远程处方为由的刑事追诉；核查另确认意见附件中的案件清单亦无相关条目。', checkedAt: '2026-08-19T20:18:00Z' },
    { citationId: 'cit-selva-04', status: 'found', reason: '§ 53–55 载有该项认定与延迟个案的记录编号，核查确认编号在材料索引中存在。', checkedAt: '2026-08-19T20:21:00Z' },
    { citationId: 'cit-selva-05', status: 'found', reason: '机构名录附件可直接下载，核查确认其为逐机构列表而非汇总表。', checkedAt: '2026-08-19T20:26:00Z' },
    { citationId: 'cit-selva-06', status: 'found', reason: '核查用公开的距离脚本对两个行政区重算中位值，结果与发布值一致（差异小于 0.3 公里）。', checkedAt: '2026-08-19T20:31:00Z' },
    { citationId: 'cit-selva-07', status: 'found', reason: '口径说明第 2 节逐项列出未纳入的因素，与正文与图注的表述一一对应。', checkedAt: '2026-08-19T20:33:00Z' },
    { citationId: 'cit-selva-08', status: 'found', reason: '结果第 3 节载有该关联的估计值与区间；核查确认正文未引用效应量，只陈述关联存在。', checkedAt: '2026-08-19T20:38:00Z' },
    { citationId: 'cit-selva-09', status: 'found', reason: '方法章节的暴露定义明确为授权延迟，核查确认全文未出现远程问诊相关变量。', checkedAt: '2026-08-19T20:40:00Z' },
    { citationId: 'cit-selva-10', status: 'found', reason: '判决理由第 3 节可逐句定位，译文与原文两版比对一致。', checkedAt: '2026-08-19T20:45:00Z' },
    { citationId: 'cit-selva-11', status: 'found', reason: '判决附件确为下级法院查明事实清单，核查确认其与判决主文分列。', checkedAt: '2026-08-19T20:46:00Z' },
    { citationId: 'cit-selva-12', status: 'partial', reason: '刑事条款与修订沿革均可定位；但「无法判断条文与执行之间的差距」是核查依据公报体例作出的推断，公报本身没有这句自述。', checkedAt: '2026-08-19T20:51:00Z' },
    { citationId: 'cit-selva-13', status: 'found', reason: '适用说明中明确指南规定的是应然流程，表述与正文一致。', checkedAt: '2026-08-19T20:54:00Z' },
    { citationId: 'cit-selva-14', status: 'partial', reason: '第一版的方法与数据链接均可定位；但该来源带有 caution 标记（未经评审的预印本），核查提示正文必须写明这一点——已确认正文写明。', checkedAt: '2026-08-19T20:58:00Z' },
    { citationId: 'cit-selva-15', status: 'missing', reason: '核查发现该预印本平台在 2026-08-24 上线了第二版，本站引用的第一版页面已被替换，正文所依据的表格在第二版中已改动；核查无法完成两版比对，也无法确认第一版的存档副本。正文与更新清单已据此标注。', checkedAt: '2026-08-26T07:40:00Z' },
    { citationId: 'cit-selva-16', status: 'missing', reason: '核查未能取得该报道所附排期表复印件的可读副本（仅有低分辨率图片）；且该报社此前一篇报道给出的延期次数与本篇不一致，核查无法判定哪一处有误。正文已改为「多次延期」，并只把该来源用于「同一份公开排期表存在」这一点。', checkedAt: '2026-08-26T07:44:00Z' },
    { citationId: 'cit-selva-17', status: 'found', reason: '核查确认该报道中只出现一方的回应，且未出现联系另一方的说明。', checkedAt: '2026-08-19T21:02:00Z' },
    { citationId: 'cit-selva-18', status: 'found', reason: '预先登记编号、问卷附件与 14% 拒答率均可在论文中定位。', checkedAt: '2026-08-19T21:06:00Z' },
    { citationId: 'cit-selva-19', status: 'found', reason: '样本说明原文限定为到达急诊科并接受主动筛查的就诊者，与正文表述一致。', checkedAt: '2026-08-19T21:07:00Z' },
    { citationId: 'cit-selva-20', status: 'partial', reason: '庇护法庭公开裁决全文与编码手册一点可以核实；但「同一联邦体系内可比的公开标准」是本站的编辑类比，两个法庭是否受同一公开规则约束，核查无法确认。', checkedAt: '2026-08-19T21:12:00Z' },
    { citationId: 'cit-selva-21', status: 'found', reason: '核查下载并运行了公开的距离脚本，确认可复算。', checkedAt: '2026-08-19T21:16:00Z' },
    { citationId: 'cit-selva-22', status: 'found', reason: '数据可用性声明、评审意见与作者回应均随文公开，核查逐项确认。', checkedAt: '2026-08-19T21:18:00Z' },
    { citationId: 'cit-selva-23', status: 'found', reason: '证据评级表与委员利益申报均在指南附件中，核查确认其为具名申报而非汇总声明。', checkedAt: '2026-08-19T21:21:00Z' },
  ],

  assetIds: ['img-selva-cover', 'img-selva-chart', 'img-selva-map'],
  chartIds: ['chart-selva-abortion-distance'],

  translations: [
    { lang: 'en', label: 'English', status: 'human-reviewed', title: 'Telemedicine abortion in Selva’s legal grey zone: three statutes, three readings', standfirst: 'Three agencies, three incompatible readings, no published interpretation — and a ruling that arrived six days after we published, which we have not yet read.' },
    { lang: 'pt', label: 'Português', status: 'human-reviewed', title: 'A zona cinzenta do aborto por telemedicina em Selva: três leis, três leituras' },
    { lang: 'fr', label: 'Français', status: 'machine-draft', title: 'La zone grise de l’avortement par télémédecine en Selva : trois lois, trois lectures' },
    { lang: 'ar', label: 'العربية', status: 'not-started' },
  ],


  currentVersionId: 'ver-selva-1',
  byline: 'PRISM 自动编辑台起草 · 生育权议题编辑组复核',
  featured: false,
  demo: true,
}

/* ==================================================================== *
 * 事实核查记录
 * ==================================================================== */


/* ==================================================================== *
 * 视觉素材
 * ==================================================================== */

export const assets: ImageAsset[] = [
  {
    id: 'img-selva-cover',
    articleId: 'art-selva',
    kind: 'cover',
    label: '封面 · 三重折射',
    caption: '概念插图 · AI 生成 · 非新闻现场：一束光穿过三片错位的棱镜面后分成三条不重合的路径，指代三部法律的三种读法。',
    conceptual: true,
    prompt: '抽象几何构图：一条细光带依次穿过三片角度不同的透明薄片，出射后分为三条互不重合的路径；冷色低饱和；无人物、无医疗器械、无机构标识、无文字。',
    palette: ['--prism-4', '--prism-6', '--ink-700', '--paper-050'],
    motif: 'aperture',
    status: 'approved',
    guardrail: '不呈现任何当事人形象、就诊场景、药品实物或医疗器械；不使用会把生育照护图像化为医疗风险的隐喻，改以光路分叉表示法律解释的分歧本身。',
    createdAt: '2026-08-19T16:05:00Z',
  },
  {
    id: 'img-selva-chart',
    articleId: 'art-selva',
    kind: 'chart',
    label: '图表 · 到最近服务机构的行程距离',
    caption: '数据来源：塞尔瓦联邦卫生统计司《终止妊娠服务可及性统计 2026》。本图无法说明班次频率、往返费用、法定等待期与良心条款拒绝；区间是区内住址分布的四分位范围，不是统计误差。',
    conceptual: false,
    palette: ['--prism-4', '--ink-600', '--paper-100'],
    motif: 'strata',
    status: 'approved',
    guardrail: '四分位区间必须画出，不得只画中位点；图注首行同时给出数据来源与本图无法说明的内容，避免读者把距离等同于可及性。',
    createdAt: '2026-08-19T16:12:00Z',
    chartId: 'chart-selva-abortion-distance',
  },
  {
    id: 'img-selva-map',
    articleId: 'art-selva',
    kind: 'map',
    label: '示意图 · 距离分层',
    caption: '概念插图 · AI 生成 · 非新闻现场：示意投影，辖区为虚构，不对应任何真实地理；同心带表示行程距离的分层，不表示实际路网或机构位置。',
    conceptual: true,
    prompt: '抽象示意：一组不规则同心带由密到疏向外扩散，带宽随距离增加；无地名、无边界线、无图标、无真实地理轮廓。',
    palette: ['--prism-2', '--prism-4', '--ink-500'],
    motif: 'graticule',
    status: 'approved',
    guardrail: '不绘制任何可识别的真实地理轮廓、行政边界或机构位置；不标注任何低于行政区一级的地理颗粒度，避免与个案信息拼合识别。',
    createdAt: '2026-08-19T16:18:00Z',
  },
]
