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

/**
 * @typedef {{
 *   id:string, outlet:string, url:string, regions:string[],
 *   topical?:boolean, kind?:'official'|'state', major?:boolean,
 *   lang:string, note:string
 * }} Feed
 *
 * `major` 标的是主流大报和通讯社。站长：「新闻搜寻的时候，可以以主流媒体为主。」
 * 它有两个作用：排序时优先，以及**制造重复**——同一件事被 BBC 和卫报都报了，
 * 合并之后这一条就有两个来源，正好对上「每个新闻最好有两个或以上的引用」。
 */

/** @type {Feed[]} */
export const FEEDS = [
  /* ---- 国际机构与人权组织：一手文件 ---- */
  { id: 'unwomen', outlet: '联合国妇女署', url: 'https://www.unwomen.org/en/rss', regions: ['global'], topical: true, kind: 'official', lang: 'en',
    note: '联合国负责性别平等的机构，发布的是决议、报告与官方声明。' },
  { id: 'unnews-women', outlet: '联合国新闻 · 妇女', url: 'https://news.un.org/feed/subscribe/en/news/topic/women/feed/rss.xml', regions: ['global'], topical: true, kind: 'official', lang: 'en',
    note: '联合国新闻中心的妇女专题。' },
  { id: 'ohchr', outlet: '联合国人权高专办', url: ['https://news.un.org/feed/subscribe/en/news/topic/human-rights/feed/rss.xml', 'https://www.ohchr.org/en/news-feed.xml'], regions: ['global'], kind: 'official', lang: 'en',
    note: '人权理事会与特别报告员的文件。综合源，要过关键词。' },
  { id: 'hrw', outlet: '人权观察', url: 'https://www.hrw.org/rss/news', regions: ['global'], lang: 'en',
    note: '独立调查，方法与取证公开，出错会发更正。综合源。' },
  { id: 'amnesty', outlet: '国际特赦组织', url: 'https://www.amnesty.org/en/feed/', regions: ['global'], lang: 'en',
    note: '同上。立场明确但事实核查严格，页面会标成民间机构。' },

  /* ---- 专做性别与 LGBTQIA+ 的媒体：整版都是本站题目 ---- */
  /* ---- 主流大报与国际台：站长要求「以主流媒体为主」 ---- */
  { id: 'bbc-world', outlet: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', regions: ['global'], major: true, lang: 'en',
    note: '综合源，要过关键词。它和下面几家常常报同一件事——合并之后一条新闻就有了多个来源。' },
  { id: 'guardian-world', outlet: 'The Guardian', url: 'https://www.theguardian.com/world/rss', regions: ['global'], major: true, lang: 'en',
    note: '综合国际版。它的 Gender 专版另外单列，这一条收的是没进专版的那些。' },
  { id: 'aljazeera', outlet: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', regions: ['mena', 'global'], major: true, lang: 'en',
    note: '中东与全球南方的覆盖比欧美大报厚。综合源。' },
  { id: 'npr', outlet: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml', regions: ['us'], major: true, lang: 'en',
    note: '美国公共广播，法庭与政策报道扎实。综合源。' },
  { id: 'nyt-world', outlet: 'The New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', regions: ['global', 'us'], major: true, lang: 'en',
    note: '综合国际版。' },
  { id: 'wapo-world', outlet: 'The Washington Post', url: 'https://feeds.washingtonpost.com/rss/world', regions: ['global', 'us'], major: true, lang: 'en',
    note: '综合国际版。' },
  { id: 'france24', outlet: 'France 24', url: 'https://www.france24.com/en/rss', regions: ['eu', 'africa', 'global'], major: true, lang: 'en',
    note: '法语圈与非洲的覆盖较好。综合源。' },
  { id: 'apnews-world', outlet: 'AP', url: 'https://feedx.net/rss/ap.xml', regions: ['global'], major: true, lang: 'en',
    note: '美联社。官方已不提供公开 RSS，这是第三方镜像——跑一次就知道能不能用。' },

  /*
   * 女性主义与 LGBTQIA+ 媒体，铺开一点。
   *
   * 站长：「主流媒体 + 大量女性主义 lgbtqia 团体的媒体。」两边都要，
   * 而且理由不一样：主流媒体给的是量和重复（同一件事两家报，就有两个来源），
   * 这些媒体给的是**主流不会报的那部分**——一天里综合大报一条都没有的题目，
   * 它们整版都是。
   *
   * 全部标 topical：整站都是本站题目，不再过关键词。
   * 地域上刻意不只收英美：只订英美媒体，站点就会变成「英美之外没有新闻」。
   */
  { id: 'rewire', outlet: 'Rewire News Group', url: 'https://rewirenewsgroup.com/feed/', regions: ['us'], topical: true, lang: 'en',
    note: '生育权与司法报道，长期跟踪美国各州法案与法院。' },
  { id: 'advocate', outlet: 'The Advocate', url: 'https://www.advocate.com/feeds/feed.rss', regions: ['us'], topical: true, lang: 'en',
    note: '美国历史最久的 LGBTQIA+ 刊物。' },
  { id: 'pinknews', outlet: 'PinkNews', url: 'https://www.thepinknews.com/feed/', regions: ['eu'], topical: true, lang: 'en',
    note: '英国为主的 LGBTQIA+ 新闻。' },
  { id: 'erin-in-the-morning', outlet: 'Erin in the Morning', url: 'https://www.erininthemorning.com/feed', regions: ['us'], topical: true, lang: 'en',
    note: '美国跨性别立法的逐州追踪，更新比大报快。' },
  { id: 'fuller-project', outlet: 'The Fuller Project', url: 'https://fullerproject.org/feed/', regions: ['global'], topical: true, lang: 'en',
    note: '专做女性议题的国际调查报道机构，常与主流大报合作发表。' },
  { id: 'womens-media-center', outlet: "Women's Media Center", url: ['https://womensmediacenter.com/news-features/feed', 'https://womensmediacenter.com/rss', 'https://www.womensmediacenter.com/feed'], regions: ['us', 'global'], topical: true, lang: 'en',
    note: '媒体中的性别再现与暴力报道。' },
  { id: 'feminist-majority', outlet: 'Feminist Majority Foundation', url: 'https://feminist.org/news/feed/', regions: ['us', 'global'], topical: true, lang: 'en',
    note: '倡议机构的每日简报，立场公开。' },
  { id: 'genderit', outlet: 'GenderIT', url: 'https://genderit.org/rss.xml', regions: ['global', 'sasia'], topical: true, lang: 'en',
    note: '数字权利与性别，网络暴力与平台治理的一手研究。' },
  { id: 'feminism-in-india', outlet: 'Feminism in India', url: 'https://feminisminindia.com/feed/', regions: ['sasia'], topical: true, lang: 'en',
    note: '南亚视角，印度本地的性别报道与评论。' },
  { id: 'kohl-journal', outlet: 'Kohl（西亚北非）', url: ['https://kohljournal.press/feed', 'https://kohljournal.press/rss.xml', 'https://kohljournal.press/feed/rss'], regions: ['mena'], topical: true, lang: 'en',
    note: '西亚北非的女性主义研究与报道。' },
  { id: 'african-feminism', outlet: 'African Feminism', url: 'https://africanfeminism.com/feed/', regions: ['africa'], topical: true, lang: 'en',
    note: '非洲各国的女性主义写作与个案记录。' },
  { id: 'latfem', outlet: 'LATFEM（拉美）', url: 'https://latfem.org/feed/', regions: ['latam'], topical: true, lang: 'es',
    note: '拉美女性主义媒体，西语。翻译交给模型。' },
  { id: 'gaytimes', outlet: 'GAY TIMES', url: ['https://www.gaytimes.com/feed/', 'https://www.gaytimes.co.uk/feed/'], regions: ['eu'], topical: true, lang: 'en',
    note: '英国 LGBTQIA+ 刊物。' },
  /*
   * 补上来的一批。
   *
   * Openly 和 The Lily 停刊、Women's Media Center 和 Context 的地址怎么试都
   * 是 404，而站长要的是「主流媒体 + **大量**女性主义 lgbtqia团体的媒体」。
   * 少了四家就得补回来，而且要补在原来薄的地方：非洲、拉美、南亚的
   * LGBTQIA+ 报道，以及劳工与移民口的性别报道。
   *
   * 这几家我在这个沙箱里验证不了（没有出网），所以每一家都写了备用地址，
   * 下一次演练的报告会说哪一个通。
   */
  { id: 'lgbtq-nation', outlet: 'LGBTQ Nation', url: ['https://www.lgbtqnation.com/feed/', 'https://www.lgbtqnation.com/rss'], regions: ['us'], topical: true, lang: 'en',
    note: '美国 LGBTQIA+ 日报，立法与仇恨犯罪跟得紧。' },
  { id: 'washington-blade', outlet: 'Washington Blade', url: ['https://www.washingtonblade.com/feed/', 'https://www.washingtonblade.com/rss'], regions: ['us', 'global'], topical: true, lang: 'en',
    note: '美国最老的 LGBTQIA+ 报纸，有华盛顿的政治线，也做国际报道。' },
  { id: '76crimes', outlet: 'Erasing 76 Crimes', url: ['https://76crimes.com/feed/', 'https://76crimes.com/rss'], regions: ['africa', 'global'], topical: true, lang: 'en',
    note: '专门跟踪把同性关系入罪的国家，非洲与加勒比的覆盖别处很难找到。' },
  { id: 'womens-agenda', outlet: "Women's Agenda（澳）", url: ['https://womensagenda.com.au/feed/', 'https://womensagenda.com.au/rss'], regions: ['anz'], topical: true, lang: 'en',
    note: '澳大利亚的女性议题媒体。原来这个地区只有卫报澳洲版一家。' },
  { id: 'globalvoices-gender', outlet: 'Global Voices · 性别', url: ['https://globalvoices.org/-/topics/women-gender/feed/', 'https://globalvoices.org/feed/'], regions: ['global'], topical: true, lang: 'en',
    note: '全球公民记者网络的性别专题，覆盖大报不去的地方，稿件都注明译者与来源。' },
  { id: 'ips-gender', outlet: 'IPS 国际新闻社 · 性别', url: ['https://www.ipsnews.net/news/gender/feed/', 'https://www.ipsnews.net/feed/'], regions: ['global', 'latam'], topical: true, lang: 'en',
    note: '全球南方视角的通讯社，性别与发展是它的常设线。' },
  { id: 'opendemocracy-5050', outlet: 'openDemocracy 5050', url: ['https://www.opendemocracy.net/en/5050/feed/', 'https://www.opendemocracy.net/en/feed/'], regions: ['global', 'eu'], topical: true, lang: 'en',
    note: '5050 是它的性别与性权利专栏，做过多次跨国调查报道。' },

  { id: 'autostraddle', outlet: 'Autostraddle', url: 'https://www.autostraddle.com/feed/', regions: ['us'], topical: true, lang: 'en',
    note: '女同志与酷儿女性的独立媒体。' },

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
  { id: 'context', outlet: 'Context（汤森路透基金会）', url: ['https://www.context.news/rss', 'https://www.context.news/feed', 'https://www.context.news/rss.xml'], regions: ['global'], topical: true, lang: 'en',
    note: '原 Openly / Thomson Reuters Foundation，专做人权与性别。' },

  /* ---- 中文世界 ---- */
  /*
   * 中文的专题来源。
   *
   * 前几轮真实抓取暴露了这个站最大的窟窿：42 个源里只有 5 个中文，
   * 而且全是综合媒体——BBC 中文 0/42、德国之声 0/64、报导者 0/10。
   * 一个写给中文读者、重点关注中港台的站，中文条目几乎为零。
   *
   * 综合媒体一天可能一条性别新闻都没有。下面这些不一样：**整站都是这个题目**，
   * 所以标 topical，不再过关键词。台港的倡议团体多用 WordPress，
   * `/feed/` 基本都在。
   *
   * 「法庭线」单列出来说一句：它做的是香港法庭的逐日旁听报道，
   * 正好对上这个站最看重的「司法过程」。
   */
  { id: 'hotline-tw', outlet: '台灣同志諮詢熱線', url: ['https://hotline.org.tw/feed', 'https://hotline.org.tw/rss', 'https://hotline.org.tw/news/feed', 'https://hotline.org.tw/blog/feed'], regions: ['tw'], topical: true, lang: 'zh-Hant',
    note: '台湾历史最久的同志权益组织，法案与个案协助的一手记录。' },
  { id: 'awakening-tw', outlet: '婦女新知基金會', url: ['https://www.awakening.org.tw/feed', 'https://www.awakening.org.tw/rss', 'https://www.awakening.org.tw/?feed=rss2', 'https://www.awakening.org.tw/rss.xml', 'https://www.awakening.org.tw/index.php/feed'], regions: ['tw'], topical: true, lang: 'zh-Hant',
    note: '台湾妇运的老牌团体，长期做修法倡议，法条讨论写得细。' },
  { id: 'twrf', outlet: '婦女救援基金會', url: ['https://www.twrf.org.tw/feed', 'https://www.twrf.org.tw/rss', 'https://www.twrf.org.tw/?feed=rss2', 'https://www.twrf.org.tw/rss.xml', 'https://www.twrf.org.tw/index.php/feed'], regions: ['tw'], topical: true, lang: 'zh-Hant',
    note: '性暴力与人口贩运的服务机构，个案与统计都出自实务。' },
  { id: 'mwf-tw', outlet: '現代婦女基金會', url: ['https://www.38.org.tw/feed', 'https://www.38.org.tw/rss', 'https://www.38.org.tw/?feed=rss2', 'https://www.38.org.tw/rss.xml', 'https://www.38.org.tw/index.php/feed'], regions: ['tw'], topical: true, lang: 'zh-Hant',
    note: '家暴与性侵害防治，台湾相关立法的主要推动者之一。' },
  { id: 'tgeea', outlet: '台灣性別平等教育協會', url: 'https://www.tgeea.org.tw/feed', regions: ['tw'], topical: true, lang: 'zh-Hant',
    note: '性别平等教育，校园性侵与性骚扰的处理机制。对应「儿童」议题。' },
  { id: 'witness-hk', outlet: '法庭線', url: 'https://thewitnesshk.com/feed', regions: ['hk'], lang: 'zh-Hant',
    note: '香港法庭的逐日旁听报道。综合源要过关键词，但它写的正是司法过程。' },
  { id: 'inmedia-hk', outlet: '獨立媒體', url: 'https://www.inmediahk.net/rss.xml', regions: ['hk'], lang: 'zh-Hant',
    note: '香港独立媒体，公民社会与性别议题的长期报道。综合源。' },

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
  { id: 'thewire-in', outlet: 'The Wire（印度）', url: ['https://thewire.in/rss/all', 'https://m.thewire.in/rss/all', 'https://thewire.in/feed'], regions: ['sasia'], lang: 'en', note: '印度独立媒体。综合源。' },
  { id: 'scroll-in', outlet: 'Scroll.in（印度）', url: 'https://feeds.feedburner.com/ScrollinArticles.rss', regions: ['sasia'], lang: 'en', note: '同上。' },
  { id: 'rappler', outlet: 'Rappler（菲律宾）', url: 'https://www.rappler.com/feed/', regions: ['sea'], lang: 'en', note: '菲律宾独立媒体，长期报道性别暴力。' },
  { id: 'madamasr', outlet: 'Mada Masr（埃及）', url: ['https://www.madamasr.com/en/feed/', 'https://www.madamasr.com/feed/'], regions: ['mena'], lang: 'en', note: '埃及独立媒体，在高压下坚持署名报道。' },
  { id: 'dailymaverick', outlet: 'Daily Maverick（南非）', url: 'https://www.dailymaverick.co.za/dmrss/', regions: ['africa'], lang: 'en', note: '南非调查报道。' },
  { id: 'meduza', outlet: 'Meduza（俄语，流亡）', url: 'https://meduza.io/rss/en/all', regions: ['ru'], lang: 'en', note: '被俄罗斯定为「外国代理人」后在境外继续运作。' },
  { id: 'guardian-au', outlet: 'The Guardian Australia', url: 'https://www.theguardian.com/au/rss', regions: ['anz'], lang: 'en', note: '澳新覆盖。综合源。' },
  { id: 'japantimes', outlet: 'The Japan Times', url: 'https://www.japantimes.co.jp/feed/', regions: ['jpkr'], lang: 'en', note: '日本英文大报。综合源。' },
  { id: 'hankyoreh', outlet: 'Korea Herald（韩国）', url: 'https://www.koreaherald.com/rss/newsAll', regions: ['jpkr'], lang: 'en', note: '韩国独立报纸英文版。综合源。' },
  { id: 'batimes', outlet: 'Buenos Aires Times', url: 'https://www.batimes.com.ar/feed', regions: ['latam'], lang: 'en', note: '拉美覆盖。综合源。' },
]

/**
 * 简体 → 繁体的字表。
 *
 * **为什么需要它。** 这个站订的十二个中文源里，九个是繁体（台湾、香港）。
 * 词表原本两种写法都靠手写：'性骚扰', '性騷擾' 并排放着。手写就会漏，
 * 而漏了没有任何征兆——繁体源那一侧安安静静地少收一批稿子。
 * 上一轮真实抓取里，'猥亵' 有简体没繁体，'拐卖妇女' 有简体没繁体，
 * 'displacement' 里的 '人口贩运' 也只有简体，而繁体源正是它的主要来源。
 *
 * 现在词表只写**简体**一种，繁体由这张表推出来。写一次，两边都认。
 *
 * 表里只收本文件真正用到的字。汉字里有几个简体对应多个繁体的
 * （发→發/髮，干→乾/幹，里→裡/里，复→復/複），这里只收在**这个题材下
 * 没有歧义**的：'复' 在这些词里一律是「再一次／报复」的意思（报复、复仇），
 * 不会是「複杂」。加新词时如果碰上有歧义的字，把两种写法都写进词表，
 * 不要往这张表里加。
 */
const S2T = {
  亲: '親', 侣: '侶', 护: '護', 内: '內', 强: '強', 奸: '姦', 荣: '榮', 誉: '譽',
  处: '處', 决: '決', 妆: '妝', 骚: '騷', 扰: '擾', 亵: '褻', 杀: '殺', 卖: '賣',
  妇: '婦', 剥: '剝', 诱: '誘', 权: '權', 势: '勢', 怀: '懷', 儿: '兒', 园: '園',
  师: '師', 恋: '戀', 监: '監', 养: '養', 礼: '禮', 义: '義', 别: '別', 视: '視',
  堕: '墮', 产: '產', 绝: '絕', 经: '經', 职: '職', 场: '場', 业: '業', 参: '參',
  离: '離', 静: '靜', 财: '財', 继: '繼', 数: '數', 认: '認', 柜: '櫃', 倾: '傾',
  变: '變', 转: '轉', 疗: '療', 双: '雙', 网: '網', 络: '絡', 胁: '脅', 难: '難',
  贩: '販', 运: '運', 无: '無', 国: '國', 战: '戰', 时: '時', 动: '動', 线: '線',
  争: '爭', 厌: '厭', 对: '對', 气: '氣', 红: '紅', 药: '藥', 会: '會', 话: '話',
  术: '術', 关: '關', 边: '邊', 论: '論', 伪: '偽', 复: '復', 踪: '蹤', 猪: '豬',
  咸: '鹹', 轮: '輪', 号: '號', 吓: '嚇', 尔: '爾', 营: '營', 寻: '尋', 体: '體',
  婴: '嬰', 贫: '貧', 穷: '窮', 岁: '歲', 报: '報', 导: '導', 独: '獨', 众: '眾',
  应: '應', 击: '擊', 弃: '棄', 队: '隊', 罚: '罰', 严: '嚴', 断: '斷', 举: '舉',
}

/**
 * 一个词的两种写法。英文原样返回；中文没有可换的字时也只返回一个。
 */
export function zhVariants(word) {
  if (!/[一-鿿]/.test(word)) return [word]
  const t = [...word].map((c) => S2T[c] ?? c).join('')
  return t === word ? [word] : [word, t]
}

const both = (words) => [...new Set(words.flatMap(zhVariants))]

/*
 * 综合性来源用这些词筛。
 *
 * 宁可漏，不可滥：这是一个报道性别暴力的站点，把不相干的条目混进来，
 * 站长要一条条删，而删漏了就会出现在读者面前。
 *
 * 中文只写简体，繁体自动生成（见上面的 S2T）。**用词**不同的地方要
 * 两条都写——「网络霸凌」和「网路霸凌」是两个说法，不是两种字体，
 * 换字换不出来。
 */
const RAW = {
  /* 家庭暴力单独一栏（站长后来把它从性犯罪里拆了出来）。 */
  domestic: ['domestic violence', 'domestic abuse', 'intimate partner violence',
    'coercive control', 'restraining order', 'protection order', 'family violence',
    'honour killing', 'honor killing', 'dowry death', 'marital rape',
    '家暴', '家庭暴力', '亲密伴侣暴力', '亲密关系暴力', '人身保护令', '保护令',
    '婚内强奸', '荣誉处决', '嫁妆致死', '控制型暴力',
    // 上一轮漏掉的：分手与跟踪这一类，台湾的《跟蹤騷擾防制法》就是这个词。
    '跟踪骚扰', '跟踪狂', '恐怖情人', '分手暴力', '杀妻', '目睹儿少'],

  sexual: ['sexual violence', 'sexual assault', 'sexual abuse', 'sexual misconduct',
    'rape', 'raped', 'gang rape', 'femicide', 'sexual harassment',
    'honour killing', 'honor killing', 'groping', 'revenge porn', 'image-based abuse',
    'deepfake porn', 'sexual exploitation',
    /*
     * **裸的 trafficking 和 stalking 收不得。**
     *
     * 一次真实抓取里，'trafficking' 一个词就把 drug trafficking、
     * arms trafficking、wildlife trafficking 全收成了性犯罪；
     * 'stalking' 撞上 stalking horse（政治里的「探路人选」）。
     * 跟当初 'settlement' 撞上以色列定居点是同一类错：
     * 一个词在这个题材里有专门含义，在新闻里却是日常词。
     * 所以都绑上宾语。
     */
    'human trafficking', 'sex trafficking', 'sexual trafficking',
    'trafficking of women', 'trafficking in women', 'trafficking in persons',
    'trafficked women', 'trafficking victims',
    'stalker', 'cyberstalking', 'stalking and harassment',
    'convicted of stalking', 'accused of stalking', 'stalking offence', 'stalking offense',
    /*
     * 这里原本还有一整段司法词：charged with / convicted / sentenced /
     * guilty / arrested / settlement / on trial……
     *
     * 加它们的理由是对的：一件性侵案上新闻，标题往往是「某某被判刑」
     * 而不是「性侵」。但**司法词不能单独成立**——加进 8 家综合大报之后，
     * 一次演练里它们捞回来的是：
     *
     *   Tupac murder trial: Ex-gang leader found guilty        （guilty）
     *   Football hooligan gang chief arrested over ecstasy ring （arrested）
     *   Irish minister calls for EU action ... settlement trade （settlement！）
     *
     * 最后那条最能说明问题：法律意义的「和解」撞上了以色列的「定居点」。
     * 一个议题词表，捞回来的全是跟性别无关的刑案和国际政治。
     *
     * 所以司法词整段搬去 feedparse 的 ACCUSATION，只用来判断
     * 「这条讲的是一桩案子吗」——那是排序用的信号（司法进展优先），
     * 不再是「这条属于哪个议题」的依据。
     * 判定议题要靠行为本身：强奸、性侵、家暴、性骚扰。
     */
    '性暴力', '性侵', '性侵害', '性侵犯', '性虐待', '性骚扰', '性犯罪', '性别暴力',
    '强奸', '轮奸', '猥亵', '强制猥亵', '妨害性自主', '强制性交',
    '杀害女性', '拐卖妇女', '迷奸', '偷拍', '性剥削', '诱奸', '权势性侵', '职权骚扰',
    // 数位性暴力：N 号房、深伪、私密影像外流。这几年最主要的一类，之前一个词都没有。
    '数字性犯罪', '数位性犯罪', '数位性暴力', 'N号房',
    // 「深伪」「未经同意」单独放会捞回电影特效和肖像权官司，
    // 「号房」会撞上「酒店五号房失火」。一次真实的误收测试逼出来的，
    // 全部改成绑住行为的完整说法。
    '深伪色情', '深度伪造色情', '深伪影像',
    '私密影像', '性影像', '未经同意散布', '未经同意拍摄', '咸猪手', '灌醉',
    // 中文的司法词同理搬走了。「和解」「上诉」「逮捕」放在这里，
    // 会把所有刑案都收成性犯罪。
    '性侵案', '性骚扰案', '强奸案', '猥亵案'],

  /*
   * 儿童。词表刻意**不收裸的 child / 儿童**——综合源要命中关键词才会被收进来，
   * 而「child」什么新闻里都有：学校预算、儿科医院、育儿建议。
   * 每一条都绑着侵害、婚配、失学或监护，也就是这个站真正要盯的部分。
   */
  children: ['child abuse', 'child sexual', 'sexual abuse of children', 'child marriage',
    'child bride', 'child trafficking', 'child protection', 'child labour', 'child labor',
    "children's rights", 'underage', 'schoolgirl', 'paedophile', 'pedophile',
    // 裸的 grooming 会收「宠物美容店开业」。同 trafficking，绑上宾语。
    'grooming gang', 'online grooming', 'sexual grooming', 'child grooming',
    'grooming of children', 'groomed a child', 'grooming offence',
    'csam', 'female genital mutilation', 'fgm', 'girls education', 'teen pregnancy',
    'foster care', 'juvenile detention',
    // 中文这边同理不放裸的「儿童」：儿童医院、儿童节、儿童剧全会中招。
    // CJK 是按子串匹配的（中文没有词边界），词越短误伤越大。
    '未成年', '幼女', '女童', '童婚', '童工', '少女怀孕', '虐童',
    '儿童性侵', '性侵儿童', '侵害儿童', '虐待儿童', '猥亵儿童', '拐卖儿童',
    '儿童保护', '儿童权利', '校园性侵', '师生恋', '监护权', '寄养', '割礼',
    '儿少性剥削', '校园霸凌'],

  /* 女性权利。生育权、身体自主、职场与校园的制度性歧视都并进来了。 */
  rights: ['women\'s rights', 'gender equality', 'womens rights', 'feminist', 'feminism',
    'abortion', 'reproductive rights', 'contraception', 'maternal', 'sterilisation', 'sterilization',
    'surrogacy', 'menstrual', 'gender pay gap', 'pay gap', 'workplace discrimination',
    'women in politics', 'gender quota', 'childcare', 'care work', 'maternity leave',
    'guardianship', 'divorce law', 'dowry', 'inheritance law',
    '女权', '女性主义', '妇女权益', '妇女权利', '女性权益', '性别平等', '性别歧视',
    '堕胎', '堕胎权', '人工流产', '生育权', '身体自主', '避孕', '绝育', '孕产', '代孕',
    '产假', '育婴假', '生育自主', '月经', '月经贫穷', '同工同酬', '职场歧视', '就业歧视',
    '育儿', '照护', '托育', '女性参政', '玻璃天花板',
    '女性就业', '婚育歧视', '监护权', '离婚冷静期', '彩礼', '财产继承',
    '性骚扰防治', '职场性骚扰'],

  /* LGBTQIA+ 权益。跨性别权利与医疗并进来了。 */
  lgbtq: ['lgbt', 'lgbtq', 'lgbtqia', 'queer', 'gay rights', 'same-sex', 'marriage equality',
    'transgender', 'trans rights', 'gender-affirming', 'gender recognition', 'non-binary',
    'intersex', 'conversion therapy', 'pride parade',
    // 裸的 'coming out' 收了美联社的「秋季新片上映指南」（films coming out this fall）。
    'coming out as', 'came out as', 'comes out as', 'coming-out story', 'came out publicly',
    '同性', '同志', '性少数', '婚姻平权', '同婚', '同性婚姻', '同性伴侣', '性别认同',
    '彩虹', '出柜', '性倾向', '跨性别', '变性', '性别重置', '性别不安',
    '性别承认', '非二元', '性别友善', '扭转治疗', '双性人', '荷尔蒙治疗'],

  hate: ['hate crime', 'online abuse', 'doxxing', 'anti-lgbt', 'homophobic', 'transphobic',
    'harassment campaign', 'death threats', 'platform moderation',
    '仇恨犯罪', '仇恨言论', '网络暴力', '网暴', '人肉搜索', '起底', '恐同', '恐跨',
    '死亡威胁', '网络霸凌', '网路霸凌', '厌女言论'],

  displacement: ['refugee women', 'asylum', 'conflict-related sexual violence', 'statelessness',
    'displaced women', 'migrant women', 'war crimes',
    '难民', '难民营', '庇护', '寻求庇护', '人口贩运', '人口贩卖', '无国籍', '移工',
    '战时性暴力', '战争性暴力', '流离失所', '慰安妇'],

  movement: ['feminist movement', "women's movement", 'metoo', '#metoo', 'womens march',
    'trans-exclusionary', 'terf', 'intersectionality debate', 'funding cuts to women',
    '女权运动', '米兔', 'MeToo', '妇女运动', '女性主义者',
    '运动内部', '排跨', '路线之争'],

  /*
   * Incel 与厌女文化（站长后加）。
   *
   * 这一栏不是「针对某个人的仇恨」——那是 hate。这里要的是**有组织的厌女**：
   * 论坛话术、男性导师产业、以及它怎么从线上走到线下。
   * 所以收的是这套亚文化自己的黑话，那是它最好认的特征。
   */
  incel: ['incel', 'manosphere', 'red pill', 'blackpill', 'black pill', 'mgtow',
    'andrew tate', 'pickup artist', 'alpha male', 'toxic masculinity',
    'misogyny', 'misogynist', 'male supremacist', 'looksmaxxing', 'femoid',
    'men going their own way', 'anti-feminist', 'gender war',
    '厌女', '仇女', '男权', '性别对立',
    '男性气概', '男德', '普信男', '女拳', '取关女权', '红药丸',
    '兄弟会话术', '田园女权'],
}

export const TOPIC_WORDS = Object.fromEntries(
  Object.entries(RAW).map(([k, v]) => [k, both(v)]),
)


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
  { id: 'unwomen-pub', topical: true, publisher: '联合国妇女署', url: 'https://www.unwomen.org/en/rss', kind: 'official-statistics', regions: ['global'], lang: 'en',
    note: '性别统计与各国进展报告，口径随表公布。用的是它主 feed——publications 那个路径 403。' },
  { id: 'unfpa', topical: true, publisher: '联合国人口基金', url: 'https://www.unfpa.org/rss.xml', kind: 'official-statistics', regions: ['global'], lang: 'en',
    note: '生育健康与人口数据，《世界人口状况》年报出自这里。' },
  { id: 'unicef', publisher: '联合国儿童基金会', url: ['https://www.unicef.org/press-releases/rss.xml', 'https://www.unicef.org/rss/rss.xml', 'https://data.unicef.org/feed/'], kind: 'official-statistics', regions: ['global'], lang: 'en',
    note: '童婚、女童失学、儿童保护的跨国统计。前两个路径分别是 403 和 404，这是第三个。' },
  { id: 'who', publisher: '世界卫生组织', url: 'https://www.who.int/rss-feeds/news-english.xml', kind: 'official-statistics', regions: ['global'], lang: 'en',
    note: '亲密伴侣暴力患病率、孕产死亡率这类全球估算的原始发布方。' },
  { id: 'guttmacher', topical: true, publisher: '古特马赫研究所', url: 'https://www.guttmacher.org/rss.xml', kind: 'peer-reviewed', regions: ['global', 'us'], lang: 'en',
    note: '生育健康领域的方法学标杆，估算过程公开可复核。' },
  { id: 'williams', topical: true, publisher: '威廉姆斯研究所', url: 'https://williamsinstitute.law.ucla.edu/press/feed/', kind: 'peer-reviewed', regions: ['us'], lang: 'en',
    note: 'UCLA 法学院，性倾向与性别认同的人口学研究，长期做 LGBTQIA+ 抽样。' },
  { id: 'pew', publisher: '皮尤研究中心', url: 'https://www.pewresearch.org/feed/', kind: 'official-statistics', regions: ['us', 'global'], lang: 'en',
    note: '抽样与问卷全文公开，态度调查的常用参照。综合源，要过关键词。' },
  { id: 'eige', topical: true, publisher: '欧洲性别平等研究所', url: 'https://eige.europa.eu/rss.xml', kind: 'official-statistics', regions: ['eu'], lang: 'en',
    note: '欧盟的性别平等指数，成员国可比口径。' },
  { id: 'hrw-reports', publisher: '人权观察', url: 'https://www.hrw.org/rss/news', kind: 'ngo-report', regions: ['global'], lang: 'en',
    note: '实地取证报告，方法写在报告里。reports 和 pubs 两个路径都 404，退回主 feed。' },

  /*
   * 下面这几家是后加的。
   *
   * 第一轮真实抓取里，十一个研究源有六个打不开或者一条都没命中，
   * 结果每天只凑得出三条候选，模型再筛一遍就只剩一条。
   * 这几家都是 WordPress 站（`/feed/` 几乎一定在），而且**整站都是本站题目**
   * ——童婚、女性割礼、儿童性剥削——正好补上站长新加的「儿童」这一栏。
   */
  { id: 'girlsnotbrides', topical: true, publisher: 'Girls Not Brides', url: ['https://www.girlsnotbrides.org/feed/', 'https://www.girlsnotbrides.org/articles/feed/', 'https://www.girlsnotbrides.org/learning-resources/feed/'], kind: 'ngo-report', regions: ['global'], lang: 'en',
    note: '全球童婚联盟，逐国的法律与流行率数据。' },
  { id: 'ecpat', topical: true, publisher: 'ECPAT International', url: 'https://ecpat.org/feed/', kind: 'ngo-report', regions: ['global'], lang: 'en',
    note: '儿童性剥削与性侵的跨国研究网络。' },
  { id: 'equalitynow', topical: true, publisher: 'Equality Now', url: 'https://equalitynow.org/feed/', kind: 'ngo-report', regions: ['global'], lang: 'en',
    note: '性别歧视法律的逐条盘点，法律文本可核对。' },
  { id: 'plan-intl', topical: true, publisher: 'Plan International', url: ['https://plan-international.org/feed/', 'https://plan-international.org/rss/', 'https://plan-international.org/news/feed/'], kind: 'ngo-report', regions: ['global'], lang: 'en',
    note: '女童权利的实地调查，样本与方法通常写在报告里。' },
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
