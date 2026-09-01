/**
 * 模型调用层。
 *
 * 故意不绑定任何一家。站长问「有没有真正免费的 API」——有，但免费额度会变、
 * 会取消、会限速，把哪一家写进代码里，换的时候就要改代码。
 *
 * 所以这里只说一种协议：**OpenAI 兼容的 /chat/completions**。
 * GitHub Models、Groq、DeepSeek、OpenRouter、chatanywhere、本地 Ollama
 * 都提供它。换供应商 = 换环境变量，代码一行不动。
 *
 * 顺序上有个默认值，是这次要点：
 *
 *   1 你自己配的（LLM_BASE_URL + LLM_MODEL + LLM_API_KEY 三个都在）
 *   2 都没配 → **GitHub Models**，用这个仓库跑 Actions 时自带的那把 token
 *
 * 第 2 条是「真正免费」能落地的地方：不用绑卡、不用注册第三方、不用再存一把
 * 密钥——workflow 里加一行 `models: read` 就有了。额度是按天限的，不是收费的。
 * 它跑不动了，第 1 条随时接管。
 */

/** GitHub Models：仓库自带 token 就能调，不需要另外的 key。 */
const GH_BASE = 'https://models.github.ai/inference'
const GH_FALLBACK_MODEL = 'openai/gpt-4.1-mini'

/**
 * 这一轮到底用谁。
 *
 * 返回 null 表示没得用——调用方要据此退回不带模型的模式，而不是崩掉。
 */
export function resolveLlm() {
  const base = (process.env.LLM_BASE_URL ?? '').trim().replace(/\/$/, '')
  const model = (process.env.LLM_MODEL ?? '').trim()
  const key = (process.env.LLM_API_KEY ?? '').trim()
  if (base && model && key) return { base, model, key, source: '自配' }

  // 只在 Actions 里有；本地跑不会误用别人的 token。
  const gh = (process.env.GITHUB_TOKEN ?? '').trim()
  if (gh) return { base: GH_BASE, model: model || GH_FALLBACK_MODEL, key: gh, source: 'GitHub Models' }

  return null
}

export function llmConfigured() {
  return resolveLlm() !== null
}

export function llmName() {
  const c = resolveLlm()
  if (!c) return '（无）'
  const host = c.base.replace(/^https?:\/\//, '').split('/')[0]
  return `${c.model} @ ${host}（${c.source}）`
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
    const res = await fetch(`${cfg.base}/chat/completions`, {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${cfg.key}`,
      },
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
    })
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300)
      throw new Error(`模型返回 HTTP ${res.status}：${body}`)
    }
    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content ?? ''
    if (!text) throw new Error('模型没有返回内容')
    return parseJson(text)
  } finally {
    clearTimeout(timer)
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
