/**
 * 模型调用层。
 *
 * 支持两种协议，因为这两种覆盖了所有能用的地方：
 *
 *   1 **Anthropic 原生**（/v1/messages）——站长决定付费用 Claude 之后走的就是这条
 *   2 **OpenAI 兼容**（/chat/completions）——Groq、OpenRouter、本地 Ollama 都是
 *
 * 为什么不图省事，用 Anthropic 那个 OpenAI 兼容层把两条并成一条：
 * 原生这条能拿到 usage 里真实的 token 数。站长是拿自己的 20 美元在跑，
 * 「这次花了多少」不该靠猜。
 *
 * 配置：
 *
 *   ANTHROPIC_API_KEY   有它就走 Claude。型号看 LLM_MODEL，默认 claude-sonnet-5
 *   LLM_BASE_URL + LLM_MODEL + LLM_API_KEY   三个齐了走 OpenAI 兼容那条
 *
 * 都没有，收集就退回不带模型的模式——英文摘要、关键词筛选。
 * **不会静默失败**，会在日志里说清楚。
 *
 * 一次没成的尝试，留在这里当路标：
 *
 *   我本来把 **GitHub Models** 设成了免费默认——仓库自带 token 就能调，
 *   不用绑卡。2026-09-01 让 runner 真的打了一次，五个型号全部：
 *
 *     HTTP 410  github_models_retirement_brownout
 *
 *   它在退役。免费这条路走到这里就断了，站长于是决定付费。
 *   别再把它加回来：一个会静静 410 的默认值，只会让站长看到「今天没有新闻」。
 */

import Anthropic from '@anthropic-ai/sdk'

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1'
/*
 * 默认用 Opus 5。
 *
 * 站长：「你尝试用最厉害的模型进行搜索？」——而且他两次说过先把质量做上去
 * 再谈成本。之前默认 Sonnet 是我按一张**记错了的价目表**选的（我以为
 * Opus 是 Sonnet 的五倍，实际是两倍半）。
 *
 * 想换回去只要在仓库 Secrets 里加一个 LLM_MODEL=claude-sonnet-5。
 */
const ANTHROPIC_DEFAULT_MODEL = 'claude-opus-5'

/**
 * 粗略价目，单位是「美元 / 百万 token」。
 *
 * 写死在这里是故意的：它会变，而变了以后我要的是站长能自己改这一处，
 * 而不是去信一个藏在别处的数字。日志里会标明这是估算。
 */
const PRICES = [
  [/fable|mythos/i, { in: 10, out: 50 }],
  [/opus/i, { in: 5, out: 25 }],
  [/sonnet-5/i, { in: 2, out: 10 }],
  [/sonnet/i, { in: 3, out: 15 }],
  [/haiku/i, { in: 1, out: 5 }],
]

/** 一次联网搜索的价钱：每一千次 10 美元。 */
const SEARCH_PRICE_PER_CALL = 10 / 1000

/** 这一轮累计用掉多少。ask() 每次加上去，跑完由 collect 打印。 */
const spend = { calls: 0, inTokens: 0, outTokens: 0, cacheWrite: 0, cacheRead: 0, searches: 0, usd: 0 }

/** 按当次真正用的型号算钱——一轮里初筛和写稿用的不是同一个。 */
function charge(model, u) {
  const price = PRICES.find(([re]) => re.test(model))?.[1]
  if (!price) return
  spend.usd += ((u.input_tokens ?? 0) * price.in
    + (u.cache_creation_input_tokens ?? 0) * price.in * 1.25
    + (u.cache_read_input_tokens ?? 0) * price.in * 0.1
    + (u.output_tokens ?? 0) * price.out) / 1e6
}

export function resolveLlm() {
  const model = (process.env.LLM_MODEL ?? '').trim()

  // Claude 优先：站长明确说了「付费也没关系，我全部用 Claude API」。
  const anthropic = (process.env.ANTHROPIC_API_KEY ?? '').trim()
  if (anthropic) {
    return {
      kind: 'anthropic',
      base: ANTHROPIC_BASE,
      model: model || ANTHROPIC_DEFAULT_MODEL,
      key: anthropic,
    }
  }

  // 其余任何 OpenAI 兼容的服务。三个要齐——缺一个就整套退回，
  // 不拿这家的 key 去打那家的端点，那只会得到一串 401，
  // 而日志里看起来像是「模型坏了」，人会去改一个本来就对的东西。
  const base = (process.env.LLM_BASE_URL ?? '').trim().replace(/\/$/, '')
  const key = (process.env.LLM_API_KEY ?? '').trim()
  if (base && model && key) return { kind: 'openai', base, model, key }

  return null
}

/**
 * 这一轮花了多少。
 *
 * 站长是拿自己的余额在跑，所以每次收集结束都要报一次账：token 数是
 * 服务端返回的真数，钱是按上面那张表估的。估算就说是估算。
 */
export function spendReport() {
  if (spend.calls === 0) return null
  const model = resolveLlm()?.model ?? ''
  const price = PRICES.find(([re]) => re.test(model))?.[1]
  const cache = spend.cacheWrite + spend.cacheRead
    ? `，缓存写入 ${spend.cacheWrite.toLocaleString()} / 命中 ${spend.cacheRead.toLocaleString()}`
    : ''
  const searched = spend.searches ? `，联网搜索 ${spend.searches} 次` : ''
  const line = `${spend.calls} 次调用，输入 ${spend.inTokens.toLocaleString()} token，输出 ${spend.outTokens.toLocaleString()} token${cache}${searched}`
  // 一轮里初筛和写稿用的型号不一样，所以钱是每次调用当场按当时的型号算的，
  // 不能事后拿一个型号的价钱去乘总量。
  const usd = spend.usd
    + spend.searches * SEARCH_PRICE_PER_CALL
    || (price ? 0 : NaN)
  if (!Number.isFinite(usd)) return line
  const daily = usd * 2 // 站长设的是一天两场
  return `${line}\n估算花费 约 US$${usd.toFixed(4)}（一天两场约 US$${daily.toFixed(2)}，一个月约 US$${(daily * 30).toFixed(2)}；价目写在 scripts/llm.mjs，会变）`
}

export function llmConfigured() {
  return resolveLlm() !== null
}

export function llmName() {
  const c = resolveLlm()
  if (!c) return '（无）'
  const host = c.base.replace(/^https?:\/\//, '').split('/')[0]
  return `${c.model} @ ${host}`
}

/**
 * 要一段纯文本回来。
 *
 * 长稿不走 JSON。理由在 scripts/blocks.mjs 的开头写着：一个真实换行就能
 * 让整批作废，而这个站要的正是分段的长文。所以让模型写带分隔符的纯文本，
 * 解析交给 blocks.mjs。
 *
 * 返回 `{ text, found }`：found 是模型联网搜到的网址，写稿那一步会把它们
 * 挂成这条新闻的来源——站长要「3-5 个 sources」，而这就是它们的来路。
 */
export async function askText(system, user, opts = {}) {
  return raw(system, user, opts)
}

/** 要一段 JSON 回来。短结构（初筛）仍然用它——那种输出不会有换行问题。 */
export async function ask(system, user, opts = {}) {
  const { text } = await raw(system, user, opts)
  return parseJson(text)
}

/**
 * 超时要跟着 maxTokens 走，不能是一个定数。
 *
 * 这里原本写死 180 秒。那是 maxTokens 还是 8000 的时候定的，够用。
 * 后来站长要求正文写到三千字，于是写稿这一路把 maxTokens 提到 24000——
 * 一批两条、每条三千汉字，光输出就六千到九千个 token。生成这么多字
 * **本来就要好几分钟**，可上限还停在三分钟。
 *
 * 这种失败最难查，因为它长得像成功：fetch 被 abort，rewrite.mjs 捕获
 * 异常、打一行「第 N 批失败」、继续下一批。没有报错、没有退出码，
 * 只是当天少了两条新闻——而且是**写得最长最好**的那两条最容易中招。
 *
 * 所以按要多少字给多少时间：每个 token 30 毫秒（约合每秒 33 个 token，
 * 比实际慢，留足余量），并且不低于原来的三分钟。24000 token 就是 12 分钟。
 * 这是上限不是等待时间——正常几十秒就回来了。
 */
/*
 * **开着联网搜索的时候，时间不由字数决定。**
 *
 * 上面那个公式只看要写多少字。对写稿那一路是对的：两条三千字的稿子，
 * 输出量本来就是主要成本。但「按题目找选题」那一路输出很短
 * （二十条，每条五行，maxTokens 4000 → 按公式只有三分钟），
 * 而它要在**一次 API 调用里面**搜八轮——服务端工具的每一轮都是一个完整
 * 的模型回合，八轮下来五到十分钟是正常的。
 *
 * 结果就是：搜索真的跑完了、钱真的花了（0.42 美元），
 * 然后在第 180 秒被自己的超时掐掉。日志里只有一行「失败」。
 *
 * 所以搜索开着的时候给一个十分钟的地板。这是上限，不是等待时间。
 */
const timeoutFor = (maxTokens, search = false) =>
  Math.max(search ? 600000 : 180000, maxTokens * 30)

async function raw(system, user, opts = {}) {
  const { maxTokens = 8000, search = false, timeoutMs = timeoutFor(maxTokens, search), model, effort, maxSearches } = opts
  const cfg = resolveLlm()
  if (!cfg) throw new Error('没有可用的模型配置')

  // Claude 那条路走官方 SDK；联网搜索是它的服务端工具，只有这条路有。
  if (cfg.kind === 'anthropic') {
    return anthropicCall(cfg, system, user, { maxTokens, timeoutMs, search, model, effort, maxSearches })
  }

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const req = openaiRequest(cfg, system, user, maxTokens)
    const res = await fetch(req.url, { method: 'POST', signal: ctl.signal, headers: req.headers, body: req.body })
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300)
      throw new Error(`模型返回 HTTP ${res.status}：${body}`)
    }
    const data = await res.json()

    const u = data?.usage ?? {}
    spend.calls += 1
    spend.inTokens += u.prompt_tokens ?? 0
    spend.outTokens += u.completion_tokens ?? 0

    const text = data?.choices?.[0]?.message?.content ?? ''
    if (!text) {
      // 空回复最常见的原因是被 max_tokens 截断——尤其是会先想一段再写的型号。
      // 说清楚是哪一种，比一句「没有返回内容」有用得多。
      const why = data?.choices?.[0]?.finish_reason === 'max_tokens'
        ? `写到 max_tokens（${maxTokens}）就被截断了，一个字都没落地。把批次调小或者把 max_tokens 调大。`
        : '模型没有返回内容'
      throw new Error(why)
    }
    // 被截断的长稿要说出来：半篇稿子看起来像成功，其实结尾是断的。
    if (data?.choices?.[0]?.finish_reason === 'max_tokens') {
      throw new Error(`写到 max_tokens（${maxTokens}）被截断，这一批不完整。把批次调小或把 max_tokens 调大。`)
    }
    return { text, found: [] }
  } catch (e) {
    /*
     * abort 抛出来的是「The operation was aborted」——在批次日志里
     * 只会显示成这一句，看不出是超时，更看不出该调哪个数。
     * 换成一句说得清的。
     */
    if (e?.name === 'AbortError') {
      throw new Error(`等模型超过 ${Math.round(timeoutMs / 1000)} 秒还没写完（max_tokens ${maxTokens}），这一批放弃。`)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

/* ------------------------------------------------------------------ *
 * Claude：官方 SDK + 服务端联网搜索
 * ------------------------------------------------------------------ */

/*
 * 每次调用新建一个客户端。
 *
 * 一轮收集只有十几次调用，省下的那点连接开销毫无意义，而缓存一个客户端
 * 会把 key 和拦截到的 fetch 一起钉死——测试里换一个假 key 或换一个假的
 * fetch，第二个用例就还在用第一个的。状态少一处，能测的地方就多一处。
 *
 * baseURL 去掉尾巴上的 /v1：SDK 自己会接。
 */
const anthropic = (cfg) => new Anthropic({
  apiKey: cfg.key,
  baseURL: cfg.base.replace(/\/v1\/?$/, ''),
  maxRetries: 2,
})

/**
 * 联网搜索与抓取，都是 Anthropic 服务端跑的工具。
 *
 * 站长：「你怎么只搜索一个 source？我希望你找到新闻后，抽取新闻标题进行
 * 二次搜索，然后加上 3-5 个 sources，看完 sources，进行总结。」
 *
 * 这正是这两个工具做的事，而且不需要再去申请一把搜索引擎的 key：
 *   web_search 按标题去找同一件事的其他报道
 *   web_fetch  把找到的那几篇抓回来读（它只抓对话里已经出现过的网址，
 *              所以必须和 web_search 一起用）
 *
 * 域名黑名单挡掉聚合站和内容农场——它们会把同一条通讯社稿子复制十遍，
 * 让「五个来源」变成一个来源的五个影子。
 */
/**
 * `maxSearches` 让调用方就这一次多搜几轮。
 *
 * 日常写稿只要三次：那时候故事已经找到了，搜索是去补来源。
 * 而**按题目找选题**是另一回事——一个题目往往要换三四种说法才问得出东西，
 * 中文一遍、英文一遍，三次根本不够。所以那一路自己开大一点，
 * 不影响每天那两场的开销。
 */
const searchTools = (maxSearches) => [
  {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: Number(maxSearches ?? process.env.LLM_MAX_SEARCHES ?? 3),
    blocked_domains: [
      'news.google.com', 'msn.com', 'yahoo.com', 'flipboard.com',
      'newsbreak.com', 'headtopics.com', 'newsnow.co.uk', 'pressreader.com',
    ],
  },
  {
    type: 'web_fetch_20260209',
    name: 'web_fetch',
    max_uses: Number(process.env.LLM_MAX_FETCHES ?? 3),
    /*
     * **每篇只取两千五百 token，不是六千。**
     *
     * 这是整条路上最贵的一个数字，而它贵得不显眼。服务端工具的循环发生在
     * 一次 API 调用**里面**：每抓回一篇，后面每一轮都要把已经抓到的东西
     * 重新读一遍。所以抓回来的内容不是只付一次钱，是付「轮数」次。
     *
     * 两条实测（各两条新闻）：六千 token 一篇时，一轮里缓存写入 66k、
     * 命中 817k，光这两项就占了账单的一半，折合每条新闻 0.81 美元——
     * 推到一天三十条就是一个月七百多美元。
     *
     * 两千五百 token 是一篇报道的前半段，人物、时间、地点、指控都在里面；
     * 后半段多半是背景和评论，而背景本来就该由我们自己取回来的那篇全文
     * （articleText，最多 6000 字，不花模型的钱）来供。
     */
    max_content_tokens: Number(process.env.LLM_FETCH_TOKENS ?? 2500),
  },
]

/**
 * 一次 Claude 调用。
 *
 * 用流式：写稿那一路 max_tokens 是 24000，非流式请求会撞上 SDK 的 HTTP 超时。
 * 带上搜索工具时还要处理 `pause_turn`——服务端工具跑久了会先把回合还给你，
 * 把它原样接回去再发一次就能续上。不接的话稿子就断在半截。
 */
async function anthropicCall(cfg, system, user, { maxTokens, timeoutMs, search, model, effort, maxSearches }) {
  const messages = [{ role: 'user', content: user }]
  const found = []
  let text = ''

  for (let round = 0; round < 4; round += 1) {
    const req = {
      /*
       * 每次调用可以自己指定型号。
       *
       * 初筛的输出是一个布尔值加几个字的理由——**用 Opus 做这件事是在
       * 烧钱也在烧时间**，而它的判断力在这一步派不上用场。写稿那一路
       * 才需要最好的模型。站长指定了 LLM_MODEL 的话，一切照他的。
       */
      model: model ?? cfg.model,
      max_tokens: maxTokens,
      /*
       * 系统提示词开缓存。
       *
       * 这一段是整份编辑方针，四五千 token，而它**每一批都一模一样**。
       * 一轮收集要发十几批，等于把同一份方针重新买十几遍。
       * 标上 cache_control 之后，第一次写入贵 25%，之后每次读只要十分之一。
       */
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages,
      /*
       * 自适应思考。新一代的 Claude 不再接受 budget_tokens（发了直接 400），
       * 深浅由 effort 控制。挑选和写稿都值得让它想清楚一点。
       *
       * **不发 temperature。** 第一次真实收集全军覆没就是它：五批全部
       * HTTP 400，`temperature` is deprecated for this model。少发一个参数，
       * 就少一处会随供应商变化而失效的地方。
       */
      thinking: { type: 'adaptive' },
      output_config: { effort: effort ?? process.env.LLM_EFFORT ?? 'high' },
    }
    if (search) req.tools = searchTools(maxSearches)

    const res = await withTimeout(
      anthropic(cfg).messages.stream(req).finalMessage(),
      timeoutMs,
      maxTokens,
    )

    const u = res.usage ?? {}
    charge(req.model, u)
    spend.calls += 1
    spend.inTokens += u.input_tokens ?? 0
    spend.outTokens += u.output_tokens ?? 0
    spend.cacheWrite += u.cache_creation_input_tokens ?? 0
    spend.cacheRead += u.cache_read_input_tokens ?? 0

    for (const b of res.content ?? []) {
      if (b.type === 'text') text += b.text
      else if (b.type === 'server_tool_use' && b.name === 'web_search') spend.searches += 1
      else if (b.type === 'web_search_tool_result') collectSearchResults(b, found)
    }

    /*
     * 服务端工具跑得久时，回合会以 pause_turn 结束。把这一轮的内容原样接回去
     * 再发一次，它会接着做完。不处理的话，稿子会停在「刚搜完还没开始写」。
     */
    if (res.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: res.content })
      continue
    }
    if (res.stop_reason === 'refusal') {
      throw new Error(`模型拒绝了这一批：${res.stop_details?.category ?? '未说明原因'}`)
    }
    if (res.stop_reason === 'max_tokens') {
      // 半篇稿子看起来像成功，其实结尾是断的。宁可整批重来。
      throw new Error(`写到 max_tokens（${maxTokens}）被截断，这一批不完整。把批次调小或把 max_tokens 调大。`)
    }
    if (!text) throw new Error('模型没有返回内容')
    return { text, found }
  }
  throw new Error('模型连续四轮都没写完（一直在 pause_turn），这一批放弃。')
}

/**
 * 把搜索结果里的网址和标题收下来。
 *
 * **成功时 content 是一个数组，出错时是一个对象**（比如
 * `{error_code: 'max_uses_exceeded'}`），而且出错不抛异常、HTTP 还是 200。
 * 不先分支就直接遍历，会静静地什么都收不到。
 */
function collectSearchResults(block, out) {
  const c = block.content
  if (!Array.isArray(c)) return
  for (const r of c) {
    if (r?.type === 'web_search_result' && r.url) {
      out.push({ url: r.url, title: r.title ?? '', age: r.page_age ?? null })
    }
  }
}

/** SDK 自己没有整体超时，包一层。 */
async function withTimeout(promise, ms, maxTokens) {
  let timer
  const guard = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`等模型超过 ${Math.round(ms / 1000)} 秒还没写完（max_tokens ${maxTokens}），这一批放弃。`)),
      ms,
    )
  })
  try { return await Promise.race([promise, guard]) } finally { clearTimeout(timer) }
}

function openaiRequest(cfg, system, user, maxTokens) {
  return {
    url: `${cfg.base}/chat/completions`,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
      // 有的供应商支持，有的忽略——两种情况下面的解析都能应付。
      response_format: { type: 'json_object' },
    }),
  }
}

/**
 * 从模型的回答里挖出 JSON。
 *
 * 不是每家都支持 response_format，有的会在 JSON 外面包一层 ```json，
 * 有的会先寒暄一句。所以先直接试，不行就从第一个大括号截到最后一个。
 * 这一层看着笨，但它挡掉的是「模型这次多说了一句话，于是整批新闻都没了」。
 */
export function parseJson(text) {
  const t = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(t) } catch { /* 继续往下试 */ }
  const a = t.indexOf('{')
  const b = t.lastIndexOf('}')
  if (a >= 0 && b > a) {
    try { return JSON.parse(t.slice(a, b + 1)) } catch { /* 落到下面报错 */ }
  }
  throw new Error(`模型返回的不是 JSON：${t.slice(0, 200)}`)
}
