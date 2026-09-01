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
  { id: 'unwomen', outlet: '联合国妇女署', url: 'https://www.unwomen.org/en/rss-feeds/news', regions: ['global'], topical: true, kind: 'official', lang: 'en',
    note: '联合国负责性别平等的机构，发布的是决议、报告与官方声明。' },
  { id: 'unnews-women', outlet: '联合国新闻 · 妇女', url: 'https://news.un.org/feed/subscribe/en/news/topic/women/feed/rss.xml', regions: ['global'], topical: true, kind: 'official', lang: 'en',
    note: '联合国新闻中心的妇女专题。' },
  { id: 'ohchr', outlet: '联合国人权高专办', url: 'https://www.ohchr.org/en/rss/news', regions: ['global'], kind: 'official', lang: 'en',
    note: '人权理事会与特别报告员的文件。综合源，要过关键词。' },
  { id: 'hrw', outlet: '人权观察', url: 'https://www.hrw.org/rss/news', regions: ['global'], lang: 'en',
    note: '独立调查，方法与取证公开，出错会发更正。综合源。' },
  { id: 'amnesty', outlet: '国际特赦组织', url: 'https://www.amnesty.org/en/rss/news/', regions: ['global'], lang: 'en',
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
  { id: 'context', outlet: 'Context（汤森路透基金会）', url: 'https://www.context.news/rss', regions: ['global'], topical: true, lang: 'en',
    note: '原 Openly / Thomson Reuters Foundation，专做人权与性别。' },

  /* ---- 中文世界 ---- */
  { id: 'twreporter', outlet: '报导者', url: 'https://www.twreporter.org/a/rss2.xml', regions: ['tw'], lang: 'zh-Hant',
    note: '台湾非营利调查报道，资金来源公开。综合源。' },
  { id: 'initium', outlet: '端传媒', url: 'https://theinitium.com/newsfeed/', regions: ['hk', 'tw', 'cn'], lang: 'zh-Hant',
    note: '华语深度报道，有编辑部。部分内容需订阅，链接仍可给读者。' },
  { id: 'bbc-zh', outlet: 'BBC 中文', url: 'https://feeds.bbci.co.uk/zhongwen/simp/rss.xml', regions: ['cn', 'hk', 'tw'], lang: 'zh-Hans',
    note: '公共广播，有独立编辑章程。综合源。' },
  { id: 'dw-zh', outlet: '德国之声中文', url: 'https://rss.dw.com/rdf/rss-chi-all', regions: ['cn', 'eu'], kind: 'state', lang: 'zh-Hans',
    note: '德国公共资金，编辑独立受法律保障——仍按国家资助标注。' },
  { id: 'rfa-zh', outlet: '自由亚洲电台', url: 'https://www.rfa.org/mandarin/rss2.xml', regions: ['cn', 'hk'], kind: 'state', lang: 'zh-Hans',
    note: '美国国会拨款。对中国内地的报道常是唯一来源，但资金来源必须让读者看到。' },

  /* ---- 地域铺开：只订英美会让世界其他地方消失 ---- */
  { id: 'thewire-in', outlet: 'The Wire（印度）', url: 'https://thewire.in/rss', regions: ['sasia'], lang: 'en', note: '印度独立媒体。综合源。' },
  { id: 'scroll-in', outlet: 'Scroll.in（印度）', url: 'https://feeds.feedburner.com/ScrollinArticles.rss', regions: ['sasia'], lang: 'en', note: '同上。' },
  { id: 'rappler', outlet: 'Rappler（菲律宾）', url: 'https://www.rappler.com/feed/', regions: ['sea'], lang: 'en', note: '菲律宾独立媒体，长期报道性别暴力。' },
  { id: 'madamasr', outlet: 'Mada Masr（埃及）', url: 'https://www.madamasr.com/en/feed/', regions: ['mena'], lang: 'en', note: '埃及独立媒体，在高压下坚持署名报道。' },
  { id: 'dailymaverick', outlet: 'Daily Maverick（南非）', url: 'https://www.dailymaverick.co.za/dmrss/', regions: ['africa'], lang: 'en', note: '南非调查报道。' },
  { id: 'meduza', outlet: 'Meduza（俄语，流亡）', url: 'https://meduza.io/rss/en/all', regions: ['ru'], lang: 'en', note: '被俄罗斯定为「外国代理人」后在境外继续运作。' },
  { id: 'guardian-au', outlet: 'The Guardian Australia', url: 'https://www.theguardian.com/au/rss', regions: ['anz'], lang: 'en', note: '澳新覆盖。综合源。' },
  { id: 'japantimes', outlet: 'The Japan Times', url: 'https://www.japantimes.co.jp/feed/', regions: ['jpkr'], lang: 'en', note: '日本英文大报。综合源。' },
  { id: 'hankyoreh', outlet: '한겨레 Hankyoreh（韩国）', url: 'https://english.hani.co.kr/rss/', regions: ['jpkr'], lang: 'en', note: '韩国独立报纸英文版。综合源。' },
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
    '同性', '性少数', '婚姻平权', '性别平等', '女权', '女性主义'],
  violence: ['sexual violence', 'sexual assault', 'domestic violence', 'domestic abuse', 'rape',
    'femicide', 'harassment', 'honour killing', 'honor killing',
    '性暴力', '性侵', '家暴', '家庭暴力', '性骚扰', '强奸', '杀害女性'],
  repro: ['abortion', 'reproductive rights', 'contraception', 'maternal', 'sterilisation', 'sterilization',
    '堕胎', '生育权', '避孕', '绝育', '孕产'],
  trans: ['transgender', 'trans rights', 'gender-affirming', 'gender recognition', 'non-binary',
    '跨性别', '性别重置', '性别承认'],
  hate: ['hate crime', 'online abuse', 'doxxing', 'anti-lgbt', 'homophobic', 'transphobic',
    '仇恨犯罪', '网络暴力', '人肉', '恐同', '恐跨'],
  equality: ['gender pay gap', 'pay gap', 'workplace discrimination', 'women in politics', 'quota',
    'childcare', 'care work',
    '同工同酬', '职场歧视', '育儿', '照护', '女性参政'],
  displacement: ['refugee women', 'asylum', 'trafficking', 'conflict-related sexual violence', 'statelessness',
    '难民', '庇护', '人口贩运', '无国籍'],
  movement: ['feminist movement', 'womens movement', "women's march", 'metoo', '#metoo',
    '女权运动', '米兔'],
}

/** 从标题和摘要里认出地区。综合源的 regions 只是默认值，命中这些词就更准。 */
export const REGION_WORDS = {
  cn: ['china', 'chinese', 'beijing', 'shanghai', '中国', '内地', '北京', '上海'],
  hk: ['hong kong', '香港'],
  tw: ['taiwan', 'taipei', '台湾', '臺灣', '台北'],
  jpkr: ['japan', 'japanese', 'tokyo', 'korea', 'korean', 'seoul', '日本', '韩国', '首尔', '东京'],
  us: ['united states', 'u.s.', 'america', 'washington', 'supreme court', '美国'],
  eu: ['europe', 'european union', 'britain', 'uk', 'france', 'germany', 'poland', '欧洲', '欧盟', '英国', '法国', '德国'],
  anz: ['australia', 'new zealand', '澳大利亚', '新西兰'],
  sea: ['philippines', 'indonesia', 'thailand', 'vietnam', 'malaysia', 'singapore', '菲律宾', '印尼', '泰国', '越南'],
  sasia: ['india', 'pakistan', 'bangladesh', 'nepal', 'sri lanka', 'afghanistan', '印度', '巴基斯坦', '阿富汗'],
  mena: ['egypt', 'iran', 'saudi', 'israel', 'palestin', 'morocco', 'lebanon', '伊朗', '埃及', '沙特', '巴勒斯坦'],
  ru: ['russia', 'russian', 'moscow', 'kazakh', 'uzbek', '俄罗斯', '莫斯科'],
  africa: ['nigeria', 'kenya', 'south africa', 'uganda', 'ghana', 'ethiopia', '尼日利亚', '肯尼亚', '南非'],
  latam: ['brazil', 'mexico', 'argentina', 'chile', 'colombia', 'peru', '巴西', '墨西哥', '阿根廷'],
}
