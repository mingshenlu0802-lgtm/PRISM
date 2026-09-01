#!/usr/bin/env node
/**
 * 探一探：哪个模型是**你现在真的能免费跑**的。
 *
 * 起因很实际。站长要「真正免费的 API」，我在的这个环境把所有供应商都挡了
 * ——Groq、Gemini、OpenRouter、DeepSeek 一个都连不上。我查不了，也不想靠
 * 记忆编一份可能已经过时的清单。但 GitHub Actions 的 runner 有完整网络，
 * 所以让它去问。
 *
 * 每个候选都做两件事：
 *
 *   1 列出这把 key 实际能看到的模型（型号名会变，文档常落后）
 *   2 真的发一次最小请求，并且**要求它用中文回答**
 *
 * 第 2 步是关键，有两层。「有免费额度」和「你这个账号现在能不能免费跑」
 * 是两回事，只有真的发一次才知道；而 PRISM 是中文站，一个连中文都不肯写
 * 的模型，能跑通也没用。所以顺手看一眼回来的字里有没有汉字。
 *
 * 一次探测花掉的 token 是几十个量级。
 *
 *   node scripts/llm-check.mjs [想额外试的型号名...]
 */

/* GitHub Models 的型号目录不在 /models，在另一个域名下。 */
const GH_BASE = 'https://models.github.ai/inference'
const GH_CATALOG = 'https://models.github.ai/catalog/models'

/* 目录拿不到时的兜底候选：都是公认中文写得过得去的。 */
const GH_GUESS = [
  'openai/gpt-4.1-mini',
  'openai/gpt-4o-mini',
  'deepseek/DeepSeek-V3-0324',
  'meta/Llama-3.3-70B-Instruct',
  'mistral-ai/Mistral-Nemo',
]

const extra = process.argv.slice(2).filter(Boolean)

/* ---- 候选名单 ---- */
const candidates = []

// 1 仓库自带的那把 token。不用绑卡、不用注册、不用再存一把密钥——
//   workflow 里加一行 `models: read` 就有了。这是「真正免费」最实在的一条。
const ghToken = (process.env.GITHUB_TOKEN ?? '').trim()
if (ghToken) {
  candidates.push({
    label: 'GitHub Models（仓库自带 token，不需要注册任何东西）',
    base: GH_BASE,
    key: ghToken,
    catalog: GH_CATALOG,
    guess: GH_GUESS,
  })
} else {
  console.log('没有 GITHUB_TOKEN——这一项跳过。在 workflow 里加 permissions: models: read。')
}

// 2 站长自己配的（现在是 Groq）。放在后面，因为它需要一个外部账号。
const myBase = (process.env.LLM_BASE_URL ?? '').trim().replace(/\/$/, '')
const myKey = (process.env.LLM_API_KEY ?? '').trim()
if (myBase && myKey) {
  candidates.push({
    label: `自配端点 ${myBase}`,
    base: myBase,
    key: myKey,
    catalog: `${myBase}/models`,
    guess: [],
  })
}

if (candidates.length === 0) {
  console.error('没有任何可探测的候选：既没有 GITHUB_TOKEN，也没有 LLM_BASE_URL + LLM_API_KEY。')
  process.exit(2)
}

console.log('PRISM 模型探测')
console.log('='.repeat(72))

const winners = []

for (const c of candidates) {
  console.log(`\n${c.label}`)
  console.log('-'.repeat(72))
  const headers = { authorization: `Bearer ${c.key}`, 'content-type': 'application/json' }

  /* ---- 1 这把 key 能看到哪些模型 ---- */
  let ids = []
  try {
    const res = await fetch(c.catalog, { headers })
    if (!res.ok) {
      console.log(`  列模型失败：HTTP ${res.status} ${(await res.text()).replace(/\s+/g, ' ').slice(0, 160)}`)
    } else {
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data?.data ?? data?.models ?? [])
      ids = list.map((m) => m.id ?? m.name).filter(Boolean)
      console.log(`  能看到 ${ids.length} 个模型`)
    }
  } catch (e) {
    console.log(`  列模型出错：${String(e.message ?? e).slice(0, 160)}`)
  }

  /* ---- 2 真的发一次，并且要中文 ---- */
  // 先试猜的那几个（挑过的，中文能写），再补上目录里的，最后是命令行给的。
  const seen = new Set()
  const tryThese = [...c.guess, ...ids, ...extra]
    .filter((m) => (seen.has(m) ? false : (seen.add(m), true)))
    .filter((m) => c.guess.length === 0 || c.guess.includes(m) || extra.includes(m) || ids.length <= 8)
    .slice(0, 8)

  if (tryThese.length === 0) {
    console.log('  没有可试的型号名。把型号名当参数传进来。')
    continue
  }

  for (const model of tryThese) {
    try {
      const res = await fetch(`${c.base}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: '只用中文回答四个字：可以使用' }],
          max_tokens: 24,
        }),
      })
      const body = await res.text()
      if (!res.ok) {
        // 把供应商的原话留一小段——「为什么不行」全在里面。
        const why = /quota|credit|billing|payment|insufficient|purchase/i.test(body) ? '要额度或要付款'
          : /rate.?limit|429|too many/i.test(body) ? '被限流（等一会儿再试就行，不是要钱）'
            : /not.?found|does not exist|decommission|unknown model/i.test(body) ? '型号名不存在或已下线'
              : /permission|unauthorized|forbidden|401|403/i.test(body) ? '这把 key 没有权限'
                : `HTTP ${res.status}`
        console.log(`  ✗ ${model} —— ${why}`)
        console.log(`      ${body.replace(/\s+/g, ' ').slice(0, 150)}`)
        continue
      }
      const said = JSON.parse(body)?.choices?.[0]?.message?.content ?? ''
      // 中文站，模型不肯写中文就没意义——顺手看一眼。
      const chinese = /[一-鿿]/.test(said)
      console.log(`  ${chinese ? '✓' : '～'} ${model} —— 回答「${said.replace(/\s+/g, ' ').slice(0, 30)}」${chinese ? '' : '（没写中文，存疑）'}`)
      if (chinese) winners.push({ model, base: c.base, label: c.label })
    } catch (e) {
      console.log(`  ✗ ${model} —— ${String(e.message ?? e).slice(0, 120)}`)
    }
  }
}

console.log(`\n${'='.repeat(72)}`)
if (winners.length) {
  console.log('能用、而且愿意写中文的：')
  for (const w of winners) console.log(`  ${w.model}\n      端点 ${w.base}`)
  const best = winners[0]
  console.log(`\n建议：LLM_MODEL = ${best.model}`)
  if (best.base === GH_BASE) {
    console.log('这一条不需要 LLM_BASE_URL，也不需要 LLM_API_KEY——收集脚本会自己走 GitHub Models。')
  }
  console.log('中文写得好不好，还要跑一轮真实收集才算数。')
} else {
  console.log('一个都没通过。上面每一行的原话就是原因。')
}
process.exit(winners.length ? 0 : 1)
