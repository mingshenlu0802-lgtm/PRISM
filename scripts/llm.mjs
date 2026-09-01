/**
 * 模型调用层。
 *
 * 故意不绑定任何一家。站长问「有没有免费开源性能好的 API」——答案是有几家，
 * 但免费额度会变、会取消、会限速，把哪一家写进代码里，换的时候就要改代码。
 *
 * 所以这里只说一种协议：**OpenAI 兼容的 /chat/completions**。
 * Groq、DeepSeek、Together、OpenRouter、Mistral、本地 Ollama 都提供它。
 * 换供应商 = 换三个环境变量，代码一行不动。
 *
 *   LLM_BASE_URL   例：https://api.groq.com/openai/v1
 *   LLM_MODEL      例：llama-3.3-70b-versatile
 *   LLM_API_KEY    对方给的 key
 *
 * 三个里少一个，收集就退回不带模型的模式——英文摘要、关键词筛选。
 * **不会静默失败**，会在日志里说清楚。
 */

export function llmConfigured() {
  return Boolean(process.env.LLM_BASE_URL && process.env.LLM_MODEL && process.env.LLM_API_KEY)
}

export function llmName() {
  return `${process.env.LLM_MODEL} @ ${(process.env.LLM_BASE_URL ?? '').replace(/^https?:\/\//, '').split('/')[0]}`
}

/**
 * 问一次模型，要求返回 JSON。
 *
 * 不用流式：这是批处理，没人在等着看字一个个蹦出来，而一次拿到完整结果
 * 才好校验。超时给得长，因为一批几十条的长总结确实要跑一会儿。
 */
export async function ask(system, user, { timeoutMs = 180000, maxTokens = 8000 } = {}) {
  const base = process.env.LLM_BASE_URL.replace(/\/$/, '')
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
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
