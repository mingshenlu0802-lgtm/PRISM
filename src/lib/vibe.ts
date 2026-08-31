/**
 * Vibe Coding：用一句话改网站。
 *
 * 这里处理的是「页面长什么样」和「站上写着什么」，不是改代码——所以它安全：
 * 最坏的情况是你不喜欢结果，按一下撤销就回去了。
 *
 * 引擎是确定性的规则匹配，不是随机生成：同一句话永远得到同一个结果，
 * 这样你才能预期它会做什么。看不懂的指令它会直说看不懂，而不是乱改一通。
 */
import type { Appearance, PrismState, SiteCopy } from './types'

export interface VibeChange {
  /** 一句话说明它打算做什么 */
  what: string
  appearance?: Partial<Appearance>
  copy?: Partial<SiteCopy>
}

export interface VibeOutcome {
  understood: boolean
  changes: VibeChange[]
  /** 没看懂时给的建议 */
  suggestion?: string
}

const has = (s: string, ...words: string[]) => words.some((w) => s.includes(w))

export const VIBE_EXAMPLES: string[] = [
  '字大一点',
  '换成深色',
  '换成浅色，字体用宋体',
  '强调色改成靛蓝',
  '行距宽一点，看着累',
  '把网站标题改成「棱镜观察」',
  '把首页那段介绍改得更简单',
  '恢复默认外观',
]

export function runVibe(input: string, state: PrismState): VibeOutcome {
  const s = input.trim()
  if (!s) return { understood: false, changes: [], suggestion: '先写一句话，比如「字大一点」。' }

  const changes: VibeChange[] = []
  const a = state.appearance

  /* ------------------------------ 字号 ------------------------------ */
  const steps = [0.9, 1, 1.15, 1.3, 1.45]
  const idx = steps.indexOf(a.fontScale)
  if (has(s, '字大', '大一点', '大一些', '看不清', '字体大', '放大')) {
    const next = steps[Math.min(steps.length - 1, (idx < 0 ? 1 : idx) + 1)]
    changes.push({ what: `字号调大到 ${next === 1 ? '标准' : `${next}×`}`, appearance: { fontScale: next } })
  } else if (has(s, '字小', '小一点', '小一些', '缩小', '太大')) {
    const next = steps[Math.max(0, (idx < 0 ? 1 : idx) - 1)]
    changes.push({ what: `字号调小到 ${next === 1 ? '标准' : `${next}×`}`, appearance: { fontScale: next } })
  }

  /* ------------------------------ 主题 ------------------------------ */
  if (has(s, '深色', '暗色', '夜间', '黑底', '暗一点')) {
    changes.push({ what: '主题换成深色', appearance: { theme: 'ink' } })
  } else if (has(s, '浅色', '亮色', '白底', '纯白')) {
    changes.push({ what: '主题换成纯白', appearance: { theme: 'paper' } })
  } else if (has(s, '暖白', '米白', '默认主题')) {
    changes.push({ what: '主题换回暖白', appearance: { theme: 'warm' } })
  } else if (has(s, '高对比', '对比度', '看不清楚颜色')) {
    changes.push({ what: '主题换成高对比', appearance: { theme: 'contrast' } })
  }

  /* ----------------------------- 强调色 ----------------------------- */
  if (has(s, '靛蓝', '蓝色', '改成蓝')) changes.push({ what: '强调色换成靛蓝', appearance: { accent: 'indigo' } })
  else if (has(s, '青绿', '绿色', '改成绿')) changes.push({ what: '强调色换成青绿', appearance: { accent: 'teal' } })
  else if (has(s, '梅紫', '紫色', '改成紫')) changes.push({ what: '强调色换成梅紫', appearance: { accent: 'plum' } })
  else if (has(s, '琥珀', '黄色', '橙色')) changes.push({ what: '强调色换成琥珀', appearance: { accent: 'amber' } })
  else if (has(s, '珊瑚', '红色', '改成红')) changes.push({ what: '强调色换成珊瑚红', appearance: { accent: 'coral' } })

  /* ------------------------------ 字体 ------------------------------ */
  if (has(s, '宋体', '衬线', 'serif')) changes.push({ what: '正文换成宋体', appearance: { bodyFont: 'serif' } })
  else if (has(s, '黑体', '无衬线', 'sans')) changes.push({ what: '正文换成黑体', appearance: { bodyFont: 'sans' } })

  /* ------------------------------ 行距 ------------------------------ */
  if (has(s, '行距宽', '宽松', '松一点', '挤', '密')) changes.push({ what: '行距调宽', appearance: { roomy: true } })
  else if (has(s, '行距窄', '紧凑', '紧一点')) changes.push({ what: '行距调窄', appearance: { roomy: false } })

  /* ------------------------------ 恢复 ------------------------------ */
  if (has(s, '恢复默认', '还原默认', '改回默认', '重置外观')) {
    changes.length = 0
    changes.push({
      what: '外观恢复默认（暖白、珊瑚红、标准字号、黑体）',
      appearance: { theme: 'warm', accent: 'coral', fontScale: 1, bodyFont: 'sans', roomy: false },
    })
  }

  /* ------------------------------ 文案 ------------------------------ */
  const titleMatch = s.match(/(?:网站名|标题|站名)(?:改成|换成|设为)\s*[「"'']?([^」"''，。]{2,20})/)
  if (titleMatch) changes.push({ what: `网站标题改成「${titleMatch[1]}」`, copy: { title: titleMatch[1] } })

  const taglineMatch = s.match(/(?:副标题|标语|一句话)(?:改成|换成|设为)\s*[「"'']?([^」"''，。]{2,40})/)
  if (taglineMatch) changes.push({ what: `副标题改成「${taglineMatch[1]}」`, copy: { tagline: taglineMatch[1] } })

  if (has(s, '介绍', '简介', '首页那段') && has(s, '简单', '短', '精简')) {
    changes.push({
      what: '把首页介绍改短',
      copy: { intro: '每天搜集各地与女性主义、LGBTQIA+ 相关的新闻与研究，一条一段短总结，附上报道它的媒体链接。' },
    })
  }

  if (changes.length === 0) {
    return {
      understood: false,
      changes: [],
      suggestion: '这句我没看懂。可以试试：「字大一点」「换成深色」「强调色改成靛蓝」「把网站标题改成 XXX」。'
        + '如果你想改的是新闻内容本身，用上面的「内容」标签页直接编辑那一条会更快。',
    }
  }
  return { understood: true, changes }
}
