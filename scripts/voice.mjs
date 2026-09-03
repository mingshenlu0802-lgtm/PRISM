/**
 * 把「本站自述」的句子从稿子里拿掉。
 *
 * 站长：「我不喜欢新闻里面的语言是『PRISM 将持续关注该案后续是否进入司法程序……』
 * 我们不是媒体，不要再以 PRISM 自述，不要再做第一人称叙述，请把所有相关句子删掉。」
 *
 * 他说的「我们不是媒体」是这件事的关键。这个站不派记者、不打电话核实、
 * 不去法院旁听——它读别人的报道，然后写一段中文总结。所以：
 *
 *   「PRISM 将持续关注该案后续」——不会。没有人在追踪，下一条同题材的新闻
 *     进不进得来，取决于第二天的抓取里有没有。这是一句**做不到的承诺**。
 *   「市教育局回复本站查询时说」——没有查询过。这是**虚构的采访**，
 *     而且是最难被发现的那一种假：读者没有办法验证一通没打过的电话。
 *
 * 所以这里做两件事：写进提示词里不让模型这么写（editorial.mjs），
 * 以及在这里兜住——模型是概率的，写死的规则才是确定的。
 *
 * **只删句子，不改写句子。** 改写要理解上下文，那又得叫一次模型，
 * 而且会引入新的错。删掉一句自述，剩下的仍然是完整的报道；
 * 试图把它改成第三人称，反而可能把一句假话变成一句像真的假话。
 */

/** 这个站自称的各种写法。 */
const OUTLET = /PRISM|棱镜|稜鏡|本站|本刊|本網|本网|本報|本报|编辑部|編輯部/

/**
 * 第一人称的**叙述者**，不是引语里的「我们」。
 *
 * 不能见到「我们」就删：受访者说「我们等了三年」是这条新闻的内容。
 * 所以只认叙述者会做的那些动作——承诺追踪、表达看法、向读者说话。
 */
const NARRATOR = new RegExp([
  '(我们|我們)\\s*(将|將|会|會)?\\s*(持续|持續|继续|繼續|长期|長期)',
  '(我们|我們)\\s*(将|將|会|會)\\s*',
  '(我们|我們)\\s*(认为|認為|了解到|注意到|获悉|獲悉|查询|查詢|核实|核實|联系|聯繫|采访|採訪)',
  '(提醒|告诉|告訴|警示)\\s*(我们|我們)',
  '(值得|需要|提醒)\\s*(我们|我們)',
].join('|'))

/** 引号里的内容不算自述——那是别人说的话。 */
const QUOTED = /[「『“"'][^「『”"'』」]*[」』”"']/g

/** 这一句是不是「站方在说话」。 */
export function isSelfVoice(sentence) {
  const bare = sentence.replace(QUOTED, '')
  return OUTLET.test(bare) || NARRATOR.test(bare)
}

/**
 * 按句号切开，但**保留结尾的标点**。
 *
 * 不能用 split('。')——那会把标点丢掉，重新拼回去时每一句都少一个句号。
 * 也不能按换行切：一个段落里有好几句，要删的往往只是最后一句。
 */
function sentences(paragraph) {
  const out = []
  let buf = ''
  for (const ch of paragraph) {
    buf += ch
    if ('。！？!?'.includes(ch)) { out.push(buf); buf = '' }
  }
  if (buf.trim()) out.push(buf)
  return out
}

/**
 * 删掉所有自述句。段落被删空就整段去掉，不留下一串空行。
 *
 * 小标题（`## `开头）原样保留：它不是句子，而且删掉它会让下面那一段
 * 突然没了归属。
 */
export function stripSelfVoice(text) {
  if (!text) return text
  const paras = String(text).split(/\n\s*\n/)
  const kept = []
  for (const para of paras) {
    if (/^\s*##\s/.test(para)) { kept.push(para.trim()); continue }
    const left = sentences(para).filter((s) => !isSelfVoice(s)).join('').trim()
    if (left) kept.push(left)
  }
  /*
   * 一个小标题后面如果一句都没剩下，它就成了一个悬空的标题。
   * 从后往前扫一遍，把这样的标题也去掉。
   */
  for (let i = kept.length - 1; i >= 0; i--) {
    if (/^##\s/.test(kept[i]) && (i === kept.length - 1 || /^##\s/.test(kept[i + 1]))) kept.splice(i, 1)
  }
  return kept.join('\n\n')
}

/** 一行里有没有自述——标题、副标题、要点用这个，它们本来就只有一句。 */
export const cleanLine = (line) => (line && isSelfVoice(line) ? '' : line)
