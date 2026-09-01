/**
 * 分隔符格式的解析。
 *
 * 为什么不用 JSON 装长稿。第一次跑 1500–3000 字的总结时，十批里有四批
 * 报「模型返回的不是 JSON」——原因不是模型偷懒，是 JSON 本身不适合装长文：
 *
 *     {"summary":"第一段
 *
 *     第二段"}
 *
 * 字符串里出现一个真实换行，整个文档就废了（Bad control character）。
 * 而这个站要的恰恰是分段的长文，模型每写一段就有一次犯这个错的机会。
 * 让它写几千字**并且**每个换行都记得写成 \\n，是在为难它，
 * 而代价是整整一批新闻全丢。
 *
 * 所以长文用分隔符包起来，换行就是换行：
 *
 *     ===ITEM 0===
 *     KEEP: yes
 *     HEADLINE: 标题
 *     SUMMARY:
 *     第一段
 *
 *     第二段
 *     ===END 0===
 *
 * 短字段一行一个，长字段（SUMMARY）从冒号后一直取到块尾。
 * 解析器只认它认识的键，多出来的忽略——模型偶尔会自作主张加一行，
 * 那不该让这一条整个作废。
 */

/**
 * 把一整段回答切成块。
 *
 * 结束标记写成宽松的：`===END 0===`、`===END===`、甚至漏掉，
 * 都以下一个 `===ITEM` 或文本结尾为界。模型漏写收尾标记是常事，
 * 为此丢掉一条已经写好的稿子不值得。
 */
export function splitBlocks(text) {
  const out = []
  const re = /^===ITEM\s+(\d+)\s*===\s*$/gim
  const starts = []
  let m
  while ((m = re.exec(text)) !== null) starts.push({ i: Number(m[1]), at: m.index, end: re.lastIndex })
  for (let k = 0; k < starts.length; k += 1) {
    const body = text.slice(starts[k].end, k + 1 < starts.length ? starts[k + 1].at : undefined)
    out.push({ i: starts[k].i, body: body.replace(/^===END[^\n]*$/gim, '').trim() })
  }
  return out
}

/** 已知的键。其余的行当作上一个长字段的续行。 */
const LONG = new Set(['SUMMARY', 'LIMITATION'])

/**
 * 解析一个块里的字段。
 *
 * 规则简单到不需要记：`KEY: 值` 是一行的短字段；`KEY:` 后面换行开始的是长字段，
 * 一直读到下一个已知键为止。
 */
export function parseBlock(body, keys) {
  const known = new Set(keys)
  const out = {}
  let current = null
  const buf = []

  const flush = () => {
    if (!current) return
    out[current] = buf.join('\n').trim()
    buf.length = 0
  }

  for (const line of body.split('\n')) {
    const m = /^([A-Z_]{2,12})\s*:\s*(.*)$/.exec(line)
    if (m && known.has(m[1])) {
      flush()
      current = m[1]
      // 短字段的值就在冒号后面；长字段留空、内容在下面几行。
      if (m[2].trim() && !LONG.has(m[1])) { out[current] = m[2].trim(); current = null }
      else if (m[2].trim()) buf.push(m[2])
      continue
    }
    if (current) buf.push(line)
  }
  flush()
  return out
}

/** `- 一条` 形式的列表。 */
export function parseList(value) {
  return String(value ?? '')
    .split('\n')
    .map((l) => l.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)
}

/** `a, b, c` 形式的枚举。 */
export function parseEnum(value, allowed) {
  return String(value ?? '')
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter((s) => allowed.has(s))
}

/** yes / true / 是 都算真。 */
export function parseYes(value) {
  return /^(yes|true|y|1|是)\b/i.test(String(value ?? '').trim())
}
