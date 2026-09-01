/**
 * 新闻来源清单。
 *
 * 站长把选源的判断交给了我：「所有 reasonable educated person 都会信任的媒体」。
 * 那是编辑判断，不该藏在某个人脑子里，所以标准写在这里，可以被质疑和修改：
 *
 * 1. **通讯社与原始文件优先。** 联合国机构、人权组织的报告是可以直接核对的一手
 *    材料，不是转述。
 * 2. **有编辑问责的独立媒体。** 有署名、有更正机制、出错会认。
 * 3. **国家资助的媒体收录，但标出来。** RFA、VOA、DW 这类由政府出资，报道未必
 *    不实，但读者有权知道钱从哪来——`kind: 'state'` 会显示在页面上。
 * 4. **专门做性别与 LGBTQIA+ 报道的媒体单列。** 综合大报一天可能一条都没有，
 *    这类媒体的整个版面都是这个网站的题目。
 * 5. **地域要铺开。** 只订英美媒体，站点就会变成「英美之外没有新闻」。
 *
 * 没有收录的：社交媒体、聚合站、没有署名的内容农场、以及任何我无法确认其
 * 更正机制的来源。
 *
 * `topical: true` 表示整个源都是本站题目，不再做关键词筛选；
 * 综合性来源要过关键词，否则会把体育和财经也收进来。
 *
 * **这些地址我没能在本地验证**——这个环境的出网被挡住了。收集脚本会逐个报告
 * 每个源的状态，第一次跑完就知道哪些要换掉。宁可清单里有几个死链接被明确
 * 报出来，也不要偷偷少收一半新闻。
 */

/** @typedef {{id:string,outlet:string,url:string,regions:string[],topical?:boolean,kind?:'official'|'state',lang:string,note:string}} Feed */

/** @type {Feed[]} */
export const FEEDS = [
  /* ---- 国际机构与人权组织：一手文件 ---- */
  { id: 'unwomen', outlet: '联合国妇女署', url: 'https://www.unwomen.org/en/rss', regions: ['global'], topical: true, kind: 'official', lang: 'en',
    note: '联合国负责性别平等的机构，发布的是决议、报告与官方声明。' },
  { id: 'unnews-women', outlet: '联合国新闻 · 妇女', url: 'https://news.un.org/feed/subscribe/en/news/topic/women/feed/rss.xml', regions: ['global'], topical: true, kind: 'official', lang: 'en',
    note: '联合国新闻中心的妇女专题。' },
  { id: 'ohchr', outlet: '联合国人权高专办', url: 'https://www.ohchr.org/en/news-feed.xml', regions: ['global'], kind: 'official', lang: 'en',
    note: '人权理事会与特别报告员的文件。综合源，要过关键词。' },
  { id: 'hrw', outlet: '人权观察', url: 'https://www.hrw.org/rss/news', regions: ['global'], lang: 'en',
    note: '独立调查，方法与取证公开，出错会发更正。综合源。' },
  { id: 'amnesty', outlet: '国际特赦组织', url: 'https://www.amnesty.org/en/feed/', regions: ['global'], lang: 'en',
    note: '同上。立场明确但事实核查严格，页面会标成民间机构。' },

  /* ---- 专做性别与 LGBTQIA+ 的媒体：整版都是本站题目 ---- */
  { id: 'guardian-gender', outlet: 'The Guardian · Gender', url: 'https://www.theguardian.com/world/gender/rss', regions: ['global'], topical: true, lang: 'en',
    note: '有专职性别记者和公开的更正栏。' },
  { id: 'guardian-lgbt', outlet: 'The Guardian · LGBTQ+', url: 'https://www.theguardian.com/world/lgbt-rights/rss', regions: ['global'], topical: true, lang: 'en', note: '同上。' },
  { id: '19th', outlet: 'The 19th', url: 'https://19thnews.org/feed/', regions: ['us'], topical: true, lang: 'en',
    note: '美国非营利新闻室，专做性别与政治，资金来源公开。' },
  { id: 'ms', outlet: 'Ms. Magazine', url: 'https://msmagazine.com/feed/', regions: ['us'], topical: true, lang: 'en',
    note: '美国女性主义老牌刊物，有编辑部与署名。' },
  { id: 'them', outlet: 'Them', url: 'https://www.them.us/feed/rss', regions: ['us'], topical: true, lang: 'en',
    note: 'Condé Nast 旗下 LGBTQIA+ 报道。' },
  { id: 'xtra', outlet: 'Xtra Magazine', url: 'https://xtramagazine.com/feed', regions: ['global'], topical: true, lang: 'en',
    note: '加拿大 LGBTQIA+ 媒体，报道范围跨国。' },
  { id: 'context', outlet: 'Context（汤森路透基金会）', url: 'https://www.context.news/feed', regions: ['global'], topical: true, lang: 'en',
    note: '原 Openly / Thomson Reuters Foundation，专做人权与性别。' },

  /* ---- 中文世界 ---- */
  { id: 'twreporter', outlet: '报导者', url: 'https://www.twreporter.org/a/rss2.xml', regions: ['tw'], lang: 'zh-Hant',
    note: '台湾非营利调查报道，资金来源公开。综合源。' },
  { id: 'initium', outlet: '端传媒', url: 'https://theinitium.com/feed', regions: ['hk', 'tw', 'cn'], lang: 'zh-Hant',
    note: '华语深度报道，有编辑部。部分内容需订阅，链接仍可给读者。' },
  { id: 'bbc-zh', outlet: 'BBC 中文', url: 'https://feeds.bbci.co.uk/zhongwen/simp/rss.xml', regions: ['cn', 'hk', 'tw'], lang: 'zh-Hans',
    note: '公共广播，有独立编辑章程。综合源。' },
  { id: 'dw-zh', outlet: '德国之声中文', url: 'https://rss.dw.com/rdf/rss-chi-all', regions: ['cn', 'eu'], kind: 'state', lang: 'zh-Hans',
    note: '德国公共资金，编辑独立受法律保障——仍按国家资助标注。' },
  { id: 'rfa-zh', outlet: '自由亚洲电台', url: 'https://www.rfa.org/mandarin/rss2.xml', regions: ['cn', 'hk'], kind: 'state', lang: 'zh-Hans',
    note: '美国国会拨款。对中国内地的报道常是唯一来源，但资金来源必须让读者看到。' },

  /* ---- 地域铺开：只订英美会让世界其他地方消失 ---- */
  { id: 'thewire-in', outlet: 'The Wire（印度）', url: 'https://thewire.in/rss/', regions: ['sasia'], lang: 'en', note: '印度独立媒体。综合源。' },
  { id: 'scroll-in', outlet: 'Scroll.in（印度）', url: 'https://feeds.feedburner.com/ScrollinArticles.rss', regions: ['sasia'], lang: 'en', note: '同上。' },
  { id: 'rappler', outlet: 'Rappler（菲律宾）', url: 'https://www.rappler.com/feed/', regions: ['sea'], lang: 'en', note: '菲律宾独立媒体，长期报道性别暴力。' },
  { id: 'madamasr', outlet: 'Mada Masr（埃及）', url: 'https://www.madamasr.com/en/feed/', regions: ['mena'], lang: 'en', note: '埃及独立媒体，在高压下坚持署名报道。' },
  { id: 'dailymaverick', outlet: 'Daily Maverick（南非）', url: 'https://www.dailymaverick.co.za/dmrss/', regions: ['africa'], lang: 'en', note: '南非调查报道。' },
  { id: 'meduza', outlet: 'Meduza（俄语，流亡）', url: 'https://meduza.io/rss/en/all', regions: ['ru'], lang: 'en', note: '被俄罗斯定为「外国代理人」后在境外继续运作。' },
  { id: 'guardian-au', outlet: 'The Guardian Australia', url: 'https://www.theguardian.com/au/rss', regions: ['anz'], lang: 'en', note: '澳新覆盖。综合源。' },
  { id: 'japantimes', outlet: 'The Japan Times', url: 'https://www.japantimes.co.jp/feed/', regions: ['jpkr'], lang: 'en', note: '日本英文大报。综合源。' },
  { id: 'hankyoreh', outlet: 'Korea Herald（韩国）', url: 'https://www.koreaherald.com/rss/newsAll', regions: ['jpkr'], lang: 'en', note: '韩国独立报纸英文版。综合源。' },
  { id: 'batimes', outlet: 'Buenos Aires Times', url: 'https://www.batimes.com.ar/feed', regions: ['latam'], lang: 'en', note: '拉美覆盖。综合源。' },
]

/**
 * 综合性来源用这些词筛。
 *
 * 宁可漏，不可滥：这是一个报道性别暴力的站点，把不相干的条目混进来，
 * 站长要一条条删，而删漏了就会出现在读者面前。
 */
export const TOPIC_WORDS = {
  rights: ['lgbt', 'lgbtq', 'queer', 'gay rights', 'same-sex', 'marriage equality', 'gender equality',
    '同性', '同志', '性少数', '婚姻平权', '同婚', '性别平等', '女权', '女性主义', '性别认同',
    '彩虹', '出柜', '性倾向', '妇女权益', '性别歧视'],
  /*
   * 性犯罪是这个站的报道重心（站长指定），所以词表比别的议题厚：
   * 除了行为本身，还要覆盖**司法程序**——起诉、开庭、判决、和解、上诉。
   * 一件性侵案在新闻里出现，往往不是以「性侵」为标题，而是以
   * 「某某被判刑」「检方起诉某某」的形式出现。只认行为词会漏掉一大半。
   */
  violence: ['sexual violence', 'sexual assault', 'sexual abuse', 'sexual misconduct',
    'domestic violence', 'domestic abuse', 'rape', 'raped', 'femicide', 'harassment',
    'honour killing', 'honor killing', 'groping', 'stalking', 'revenge porn', 'image-based abuse',
    'grooming', 'child abuse', 'trafficking',
    // 司法程序：案子进到哪一步，往往就是标题本身
    'charged with', 'indicted', 'convicted', 'sentenced', 'acquitted', 'on trial', 'verdict',
    'guilty', 'prosecutors', 'lawsuit', 'sues', 'settlement', 'appeal', 'arrested',
    'accused of', 'allegation', 'accuser', 'testified', 'court heard',
    '性暴力', '性侵', '性侵犯', '性虐待', '家暴', '家庭暴力', '性骚扰', '强奸', '猥亵',
    '杀害女性', '拐卖妇女', '荣誉处决', '迷奸', '偷拍', '性剥削', '诱奸', '未成年',
    // 司法
    '起诉', '起訴', '被控', '被指控', '判刑', '定罪', '无罪', '無罪', '开庭', '開庭',
    '检方', '檢方', '一审', '二审', '上诉', '和解', '逮捕', '刑事', '民事诉讼', '出庭作证'],
  /*
   * 儿童（站长后加的议题）。
   *
   * 词表刻意**不收裸的 child / 儿童**。综合源要命中关键词才会被收进来，
   * 而「child」什么新闻里都有——学校预算、儿科医院、育儿建议。放它进来，
   * 站长刚抱怨过的「题材不全是女性主义」会立刻更严重。
   * 所以每一条都绑着侵害、婚配、失学或监护，也就是这个站真正要盯的部分。
   */
  children: ['child abuse', 'child sexual', 'sexual abuse of children', 'child marriage',
    'child bride', 'child trafficking', 'child protection', 'child labour', 'child labor',
    "children's rights", 'underage', 'schoolgirl', 'grooming', 'paedophile', 'pedophile',
    'csam', 'female genital mutilation', 'fgm', 'girls education', 'teen pregnancy',
    'foster care', 'juvenile detention',
    // 中文这边**不放裸的「儿童」**，理由和英文那边一样：「儿童医院」「儿童节」
    // 「儿童剧」全会中招。CJK 是按子串匹配的（中文没有词边界可依），
    // 所以词越短，误伤越大。每一条都带上侵害、婚配、失学或监护。
    '未成年', '幼女', '女童', '童婚', '童工', '少女怀孕', '少女懷孕',
    '儿童性侵', '兒童性侵', '性侵儿童', '性侵兒童', '侵害儿童', '侵害兒童',
    '虐待儿童', '虐待兒童', '猥亵儿童', '猥褻兒童', '拐卖儿童', '拐賣兒童',
    '儿童保护', '兒童保護', '儿童权利', '兒童權利', '校园性侵', '校園性侵',
    '师生恋', '師生戀', '监护权', '監護權', '寄养', '寄養', '割礼', '割禮'],
  repro: ['abortion', 'reproductive rights', 'contraception', 'maternal', 'sterilisation', 'sterilization',
    '堕胎', '人工流产', '生育权', '避孕', '绝育', '孕产', '代孕', '产假', '生育自主'],
  trans: ['transgender', 'trans rights', 'gender-affirming', 'gender recognition', 'non-binary',
    '跨性别', '变性', '性别重置', '性别承认', '跨性別', '非二元', '性別友善'],
  hate: ['hate crime', 'online abuse', 'doxxing', 'anti-lgbt', 'homophobic', 'transphobic',
    '仇恨犯罪', '网络暴力', '网暴', '人肉搜索', '恐同', '恐跨', '厌女', '性别对立'],
  equality: ['gender pay gap', 'pay gap', 'workplace discrimination', 'women in politics', 'quota',
    'childcare', 'care work',
    '同工同酬', '职场歧视', '就业歧视', '育儿', '照护', '女性参政', '玻璃天花板',
    '女性就业', '婚育歧视'],
  displacement: ['refugee women', 'asylum', 'trafficking', 'conflict-related sexual violence', 'statelessness',
    '难民', '庇护', '人口贩运', '无国籍', '移工', '战时性暴力'],
  movement: ['feminist movement', 'womens movement', "women's march", 'metoo', '#metoo',
    '女权运动', '米兔', 'MeToo', '妇女运动', '女性主义者'],
}

/* ------------------------------------------------------------------ *
 * 研究与数据的来源
 *
 * 站长要每天 30 条新闻加 **3 项研究**。研究不能从新闻源里挑——新闻写的是
 * 「一份报告说」，研究页要的是那份报告本身：谁做的、方法是什么、这个数字
 * 撑得起什么结论、撑不起什么。
 *
 * 所以单独一份清单，全部是**发布方自己**的出版渠道：统计机构、政府间组织、
 * 有方法学附录的研究所、有公开取证方法的人权组织。
 *
 * `kind` 是这个源的默认类型（研究页会按它显示可信度提示）。模型看过标题和
 * 摘要后可以改——同一个机构既发统计年报也发倡导报告，一刀切会误导读者。
 *
 * 这些地址同样没能在本地验证（出网被挡）。跑一次就知道哪些活着。
 * ------------------------------------------------------------------ */

/** @typedef {{id:string,publisher:string,url:string,kind:string,regions:string[],lang:string,note:string}} StudyFeed */

/** @type {StudyFeed[]} */
export const STUDY_FEEDS = [
  { id: 'unwomen-pub', topical: true, publisher: '联合国妇女署', url: 'https://www.unwomen.org/en/digital-library/publications/rss', kind: 'official-statistics', regions: ['global'], lang: 'en',
    note: '性别统计与各国进展报告，口径随表公布。' },
  { id: 'unfpa', topical: true, publisher: '联合国人口基金', url: 'https://www.unfpa.org/rss.xml', kind: 'official-statistics', regions: ['global'], lang: 'en',
    note: '生育健康与人口数据，《世界人口状况》年报出自这里。' },
  { id: 'unicef', publisher: '联合国儿童基金会', url: 'https://www.unicef.org/rss.xml', kind: 'official-statistics', regions: ['global'], lang: 'en',
    note: '童婚、女童失学、儿童保护的跨国统计——站长新加的「儿童」议题主要靠它。' },
  { id: 'who', publisher: '世界卫生组织', url: 'https://www.who.int/rss-feeds/news-english.xml', kind: 'official-statistics', regions: ['global'], lang: 'en',
    note: '亲密伴侣暴力患病率、孕产死亡率这类全球估算的原始发布方。' },
  { id: 'guttmacher', topical: true, publisher: '古特马赫研究所', url: 'https://www.guttmacher.org/rss.xml', kind: 'peer-reviewed', regions: ['global', 'us'], lang: 'en',
    note: '生育健康领域的方法学标杆，估算过程公开可复核。' },
  { id: 'williams', topical: true, publisher: '威廉姆斯研究所', url: 'https://williamsinstitute.law.ucla.edu/feed/', kind: 'peer-reviewed', regions: ['us'], lang: 'en',
    note: 'UCLA 法学院，性倾向与性别认同的人口学研究，长期做 LGBTQIA+ 抽样。' },
  { id: 'pew', publisher: '皮尤研究中心', url: 'https://www.pewresearch.org/feed/', kind: 'official-statistics', regions: ['us', 'global'], lang: 'en',
    note: '抽样与问卷全文公开，态度调查的常用参照。综合源，要过关键词。' },
  { id: 'eige', topical: true, publisher: '欧洲性别平等研究所', url: 'https://eige.europa.eu/rss.xml', kind: 'official-statistics', regions: ['eu'], lang: 'en',
    note: '欧盟的性别平等指数，成员国可比口径。' },
  { id: 'hrw-reports', publisher: '人权观察', url: 'https://www.hrw.org/rss/reports', kind: 'ngo-report', regions: ['global'], lang: 'en',
    note: '实地取证报告，方法写在报告里。倡导机构，立场公开。' },
  { id: 'amnesty-research', publisher: '国际特赦组织', url: 'https://www.amnesty.org/en/latest/research/feed/', kind: 'ngo-report', regions: ['global'], lang: 'en',
    note: '同上：可核对，但选题服务于其倡导目标。' },
  { id: 'ilga', topical: true, publisher: '国际同志联合会', url: 'https://ilga.org/feed', kind: 'ngo-report', regions: ['global'], lang: 'en',
    note: '《国家支持的恐同》年度法律普查，逐国列出法条。' },
]

/** 从标题和摘要里认出地区。综合源的 regions 只是默认值，命中这些词就更准。 */
export const REGION_WORDS = {
  cn: ['china', 'chinese', 'beijing', 'shanghai', '中国', '中國', '内地', '大陆', '北京', '上海', '广东'],
  hk: ['hong kong', '香港', '港府'],
  tw: ['taiwan', 'taiwanese', 'taipei', '台湾', '臺灣', '台北', '臺北'],
  jpkr: ['japan', 'japanese', 'tokyo', 'korea', 'korean', 'seoul', '日本', '韩国', '首尔', '东京'],
  // 不用裸的 'america'——它会把「Latin America」整片吃成美国。
  us: ['united states', 'u.s.', 'american', 'washington', 'supreme court', 'white house',
    'texas', 'florida', 'california', 'colorado', 'new york', 'massachusetts', 'ohio', 'georgia',
    'congress', 'scotus', '美国', '美國'],
  // 'uk' 太短，词边界也挡不住缩写噪音，用 'united kingdom' 和具体国名。
  eu: ['europe', 'european union', 'united kingdom', 'britain', 'british', 'england', 'scotland',
    'ireland', 'france', 'french', 'germany', 'german', 'poland', 'spain', 'italy', 'hungary',
    '欧洲', '歐洲', '欧盟', '英国', '英國', '法国', '德国'],
  anz: ['australia', 'new zealand', '澳大利亚', '新西兰'],
  sea: ['philippines', 'indonesia', 'thailand', 'vietnam', 'malaysia', 'singapore', '菲律宾', '印尼', '泰国', '越南'],
  sasia: ['india', 'pakistan', 'bangladesh', 'nepal', 'sri lanka', 'afghanistan', '印度', '巴基斯坦', '阿富汗'],
  mena: ['egypt', 'iran', 'saudi', 'israel', 'palestin', 'morocco', 'lebanon', '伊朗', '埃及', '沙特', '巴勒斯坦'],
  ru: ['russia', 'russian', 'moscow', 'kazakh', 'uzbek', '俄罗斯', '莫斯科'],
  africa: ['nigeria', 'kenya', 'south africa', 'uganda', 'ghana', 'ethiopia', '尼日利亚', '肯尼亚', '南非'],
  latam: ['latin america', 'brazil', 'mexico', 'argentina', 'chile', 'colombia', 'peru',
    'ecuador', 'bolivia', 'venezuela', 'guatemala', 'honduras', '巴西', '墨西哥', '阿根廷', '拉美'],
}
