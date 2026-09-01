#!/usr/bin/env node
/**
 * 探一探：哪个模型是**你现在真的能免费跑**的。
 *
 * 起因很实际。站长要「真正免费的 API」，我在的这个环境把所有供应商都挡了
 * ——Groq、Gemini、OpenRouter、DeepSeek 一个都连不上。我查不了，也不想靠
 * 记忆编一份可能已经过时的清单。但 GitHub Actions 的 runner 有完整网络，
 * 所以让它去问。
 *
 * 这个脚本值不值得存在，第一次跑就证明了。我凭记忆认定 GitHub Models 可用
 * ——仓库自带 token 就能调，不用绑卡，看起来正是答案。runner 一打，五个型号
 * 全部 HTTP 410：github_models_retirement_brownout，它在退役。
 * 文档会过期，记忆会过期，真发一次不会。
 *
 * 每个候选做两件事：
 *
 *   1 列出这把 key 实际能看到的模型（型号名会变，文档常落后）
 *   2 真的发一次最小请求，并且**要求它用中文回答**
 *
 * 第 2 步有两层。「有免费额度」和「你这个账号现在能不能免费跑」是两回事；
 * 而 PRISM 是中文站，一个能跑但不肯写中文的模型，通了也没用。
 *
 * 一次探测花掉的 token 是几十个量级。
 *
 *   LLM_BASE_URL=... LLM_API_KEY=... node scripts/llm-check.mjs [型号名...]
 */

/**
 * 各家先试哪几个型号。
 *
 * 排序不是按跑分，是按**中文写得怎么样**——这是给中文站选的。
 * 通义千问、Kimi、DeepSeek 是中文母语训练出来的，排在前面；
 * Llama 系中文能写但味道偏译文，垫底。
 */
const GUESS = [
  [/anthropic\.com/, [
    // 贵→便宜。中文都写得好，差别在钱：Opus 大约是 Sonnet 的五倍，
    // Haiku 大约是五分之一。日更三十条这种量，Sonnet 是站长那 20 美元
    // 能撑最久又不掉质量的一档。
    'claude-sonnet-5',
    'claude-haiku-4-5-20251001',
    'claude-opus-5',
  ]],
  [/groq\.com/, [
    'qwen/qwen3-32b',
    'moonshotai/kimi-k2-instruct',
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ]],
  [/chatanywhere/, ['gpt-4o-mini', 'gpt-4.1-mini', 'deepseek-v3']],
  [/openrouter\.ai/, [
    'deepseek/deepseek-chat-v3-0324:free',
    'qwen/qwen3-235b-a22b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
  ]],
  [/cerebras\.ai/, ['qwen-3-32b', 'llama-3.3-70b']],
  [/deepseek\.com/, ['deepseek-chat']],
]

/**
 * 没配任何东西时给的清单。
 *
 * 每一条都写清楚**代价是什么**——「免费」底下藏的通常是「要绑卡」或
 * 「要再注册一个账号」。站长有权先知道要付出什么，再决定去开哪个。
 */
const FREE_LIST = `
最省事的一条：**Claude**。加一个 Secret 就行，型号名都不用填。

  ANTHROPIC_API_KEY = 你在 platform.claude.com → API keys 建的那把
  （站长 2026-09-01 决定走这条：余额 20 美元，够跑几个月。）

不想付费的话，下面这几个不要钱也不要绑卡（按中文质量排）：

  1 Groq            LLM_BASE_URL = https://api.groq.com/openai/v1
                    注册 console.groq.com，不要信用卡。上面有通义千问和 Kimi，
                    中文是母语级的。速度也是这几家里最快的。
                    （站长说已经拿到 key 了——只是没进这个仓库的 Secrets。）

  2 chatanywhere    LLM_BASE_URL = https://api.chatanywhere.tech/v1
                    github.com/chatanywhere/gpt_api_free 领免费 key，给的是
                    gpt-4o-mini。它是别人转发的 OpenAI，稳定性看对方心情，
                    每天有次数上限——当备用可以，当主力要有心理准备。

  3 OpenRouter      LLM_BASE_URL = https://openrouter.ai/api/v1
                    型号名结尾带 :free 的那些不计费，例如
                    deepseek/deepseek-chat-v3-0324:free。免费档限速较狠。

  4 Cerebras        LLM_BASE_URL = https://api.cerebras.ai/v1
                    免费档，不要卡。中文可用，型号选择比 Groq 少。

已经排除的：

  × GitHub Models   仓库自带 token 就能调，本来是最省事的一条。
                    2026-09-01 实测五个型号全部 HTTP 410，官方说法是
                    "scheduled retirement brownout"——它在退役。别再试了。

拿到 key 之后：仓库 → Settings → Secrets and variables → Actions，
加 LLM_BASE_URL 和 LLM_API_KEY 两个，再跑一次这个探测（Run workflow 勾 probe），
它会告诉你 LLM_MODEL 该填哪个。
`

const extra = process.argv.slice(2).filter(Boolean)
const anthropicKey = (process.env.ANTHROPIC_API_KEY ?? '').trim()
const ANTHROPIC = anthropicKey
  ? { base: 'https://api.anthropic.com/v1', key: anthropicKey }
  : null
const base = ANTHROPIC ? ANTHROPIC.base : (process.env.LLM_BASE_URL ?? '').trim().replace(/\/$/, '')
const key = ANTHROPIC ? ANTHROPIC.key : (process.env.LLM_API_KEY ?? '').trim()

console.log('PRISM 模型探测')
console.log('='.repeat(72))

if (!base || !key) {
  // 说清楚是哪一个缺——「配了但没生效」和「压根没配」要分开，
  // 不然站长会去改一个本来就对的东西。
  console.log(`\n还没得探：没有 ANTHROPIC_API_KEY，而且 ${!base && !key ? 'LLM_BASE_URL 和 LLM_API_KEY 都是空的'
    : !base ? 'LLM_API_KEY 有了，但 LLM_BASE_URL 是空的'
      : 'LLM_BASE_URL 有了，但 LLM_API_KEY 是空的'}。`)
  console.log('（在 Actions 里跑的话，这说明这个仓库的 Secrets 里没有它——')
  console.log('  加在别的仓库、或者只保存在浏览器里，这边都读不到。）')
  console.log(FREE_LIST)
  process.exit(2)
}

console.log(`端点：${base}${ANTHROPIC ? '（Claude，原生协议）' : ''}`)
// Claude 用 x-api-key 而不是 Bearer，而且列型号也要带版本号。
const headers = ANTHROPIC
  ? { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }
  : { authorization: `Bearer ${key}`, 'content-type': 'application/json' }

/* ---- 1 这把 key 能看到哪些模型 ---- */
let ids = []
try {
  const res = await fetch(`${base}/models`, { headers })
  if (!res.ok) {
    console.log(`列模型失败：HTTP ${res.status} ${(await res.text()).replace(/\s+/g, ' ').slice(0, 200)}`)
  } else {
    const data = await res.json()
    const list = Array.isArray(data) ? data : (data?.data ?? data?.models ?? [])
    ids = list.map((m) => m.id ?? m.name).filter(Boolean)
    console.log(`\n这把 key 能看到 ${ids.length} 个模型：`)
    for (const id of ids.slice(0, 40)) console.log(`  ${id}`)
    if (ids.length > 40) console.log(`  …还有 ${ids.length - 40} 个`)
  }
} catch (e) {
  console.log(`列模型出错：${String(e.message ?? e).slice(0, 200)}`)
}

/* ---- 2 真的发一次，并且要中文 ---- */
// 挑过的中文型号优先，其次目录里真实存在的，最后是命令行点名的。
//
// 猜的那几个**不拿目录过滤**：各家的别名（claude-sonnet-5 这种不带日期的）
// 通常不出现在列表里，但调得通。而试一个不存在的名字只换来一个 404，
// 不花钱——为省这个而漏掉一个能用的型号，不划算。
const guess = GUESS.find(([re]) => re.test(base))?.[1] ?? []
const seen = new Set()
const tryThese = [...extra, ...guess, ...ids]
  .filter((m) => (seen.has(m) ? false : (seen.add(m), true)))
  .slice(0, 8)

if (tryThese.length === 0) {
  console.log('\n没有可试的型号名。把型号名当参数传进来，或者先让上面那一步成功。')
  process.exit(1)
}

console.log(`\n实际调用测试（每个约几十 token，要求它用中文回答）：`)
const ok = []
for (const model of tryThese) {
  try {
    const ask = { role: 'user', content: '只用中文回答四个字：可以使用' }
    const res = await fetch(`${base}${ANTHROPIC ? '/messages' : '/chat/completions'}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages: [ask], max_tokens: 24 }),
    })
    const body = await res.text()
    if (!res.ok) {
      // 把供应商的原话留一小段——「为什么不行」全在里面。
      const why = /quota|credit|billing|payment|insufficient|purchase/i.test(body) ? '要额度或要付款'
        : /rate.?limit|429|too many/i.test(body) ? '被限流（等一会儿再试，不是要钱）'
          : /not.?found|does not exist|decommission|retirement|unknown model/i.test(body) ? '型号名不存在或已下线'
            : /permission|unauthorized|forbidden/i.test(body) || res.status === 401 || res.status === 403 ? '这把 key 没有权限'
              : `HTTP ${res.status}`
      console.log(`  ✗ ${model} —— ${why}`)
      console.log(`      ${body.replace(/\s+/g, ' ').slice(0, 150)}`)
      continue
    }
    const parsed = JSON.parse(body)
    const said = ANTHROPIC
      ? (parsed?.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('')
      : (parsed?.choices?.[0]?.message?.content ?? '')
    // 中文站，模型不肯写中文就没意义——顺手看一眼。
    const chinese = /[一-鿿]/.test(said)
    console.log(`  ${chinese ? '✓' : '～'} ${model} —— 回答「${said.replace(/\s+/g, ' ').slice(0, 30)}」${chinese ? '' : '（没写中文，存疑）'}`)
    if (chinese) ok.push(model)
  } catch (e) {
    console.log(`  ✗ ${model} —— ${String(e.message ?? e).slice(0, 120)}`)
  }
}

console.log(`\n${'='.repeat(72)}`)
if (ok.length) {
  console.log(`能用、而且愿意写中文的：${ok.join('  ')}`)
  console.log(`\n建议：LLM_MODEL = ${ok[0]}`)
  console.log('中文写得好不好，还要跑一轮真实收集才算数。')
} else {
  console.log('一个都没通过。上面每一行的原话就是原因。')
  console.log(FREE_LIST)
}
process.exit(ok.length ? 0 : 1)
