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

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1'
const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-5'

/**
 * 粗略价目，单位是「美元 / 百万 token」。
 *
 * 写死在这里是故意的：它会变，而变了以后我要的是站长能自己改这一处，
 * 而不是去信一个藏在别处的数字。日志里会标明这是估算。
 */
const PRICES = [
  [/opus/i, { in: 15, out: 75 }],
  [/sonnet/i, { in: 3, out: 15 }],
  [/haiku/i, { in: 1, out: 5 }],
]

/** 这一轮累计用掉多少。ask() 每次加上去，跑完由 collect 打印。 */
const spend = { calls: 0, inTokens: 0, outTokens: 0, cacheWrite: 0, cacheRead: 0 }

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
  const line = `${spend.calls} 次调用，输入 ${spend.inTokens.toLocaleString()} token，输出 ${spend.outTokens.toLocaleString()} token${cache}`
  if (!price) return line
  // 缓存写入约为普通输入的 1.25 倍，命中约为十分之一。
  const usd = (spend.inTokens * price.in
    + spend.cacheWrite * price.in * 1.25
    + spend.cacheRead * price.in * 0.1
    + spend.outTokens * price.out) / 1e6
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
 * 问一次模型，要求返回 JSON。
 *
 * 不用流式：这是批处理，没人在等着看字一个个蹦出来，而一次拿到完整结果
 * 才好校验。超时给得长，因为一批几十条的长总结确实要跑一会儿。
 */
export async function ask(system, user, { timeoutMs = 180000, maxTokens = 8000 } = {}) {
  const cfg = resolveLlm()
  if (!cfg) throw new Error('没有可用的模型配置')
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const req = cfg.kind === 'anthropic' ? anthropicRequest(cfg, system, user, maxTokens)
      : openaiRequest(cfg, system, user, maxTokens)
    const res = await fetch(req.url, { method: 'POST', signal: ctl.signal, headers: req.headers, body: req.body })
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300)
      throw new Error(`模型返回 HTTP ${res.status}：${body}`)
    }
    const data = await res.json()

    // 记账。两家的字段名不一样，但意思一样：这次实际吃掉了多少 token。
    const u = data?.usage ?? {}
    spend.calls += 1
    spend.inTokens += u.input_tokens ?? u.prompt_tokens ?? 0
    spend.outTokens += u.output_tokens ?? u.completion_tokens ?? 0
    // 缓存的读写单独记：它们的价钱和普通输入不一样，混在一起报账就不准了。
    spend.cacheWrite += u.cache_creation_input_tokens ?? 0
    spend.cacheRead += u.cache_read_input_tokens ?? 0

    const text = cfg.kind === 'anthropic'
      ? (data?.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('')
      : (data?.choices?.[0]?.message?.content ?? '')
    if (!text) {
      // 空回复最常见的原因是被 max_tokens 截断——尤其是会先想一段再写的型号。
      // 说清楚是哪一种，比一句「没有返回内容」有用得多。
      const why = (data?.stop_reason ?? data?.choices?.[0]?.finish_reason) === 'max_tokens'
        ? `写到 max_tokens（${maxTokens}）就被截断了，一个字都没落地。把批次调小或者把 max_tokens 调大。`
        : '模型没有返回内容'
      throw new Error(why)
    }
    return parseJson(text)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Anthropic 原生。
 *
 * 三处和 OpenAI 那套不一样，每一处都咬过人：
 *   - 认证是 x-api-key，不是 Authorization: Bearer
 *   - system 是顶层字段，不是 messages 里的一条
 *   - 必须带 anthropic-version，少了直接 400
 */
function anthropicRequest(cfg, system, user, maxTokens) {
  return {
    url: `${cfg.base}/messages`,
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.key,
      'anthropic-version': '2023-06-01',
    },
    /*
     * **不发 temperature。**
     *
     * 第一次真实收集全军覆没就是它：五批全部 HTTP 400，
     *   `temperature` is deprecated for this model.
     * 新一代的 Claude 不再接受这个参数，而我照着 OpenAI 那套习惯性地加上了。
     *
     * 不改成「按型号判断要不要发」，是因为那需要维护一张会过期的型号表。
     * 这里本来也不需要它：默认采样对「按方针筛选 + 翻译 + 写总结」完全够用，
     * 少发一个参数就少一处会随供应商变化而失效的地方。
     */
    body: JSON.stringify({
      model: cfg.model,
      /*
       * 系统提示词开缓存。
       *
       * 这一段是整份编辑方针，六千多 token，而它**每一批都一模一样**。
       * 一轮收集要发十几批，等于把同一份方针重新买十几遍——第一次真实收集的
       * 账单里，38k 输入 token 有九成是这个。
       *
       * 标上 cache_control 之后，第一次写入贵 25%，之后每次读只要十分之一。
       * 批次越多越划算，而「批次多」正是长总结逼出来的结果。
       */
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
      max_tokens: maxTokens,
    }),
  }
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
