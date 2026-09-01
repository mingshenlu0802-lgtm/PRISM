import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * 一键繁简转换。
 *
 * 站长要的。这个站的读者在大陆、香港、台湾都有，而稿子是模型用简体写的——
 * 香港和台湾的读者读简体是能读，但那是「将就」，不是「给他们看的」。
 *
 * 做法上有三个决定，都不是随手定的：
 *
 * **一、字典按需下载。** 简→繁那本词典压缩后有 442KB——因为简繁不是
 * 一对一：「发」到底是「發」还是「髮」，要靠词组才分得清，而那张词组表
 * 就是这 442KB 的来源。用字对字的小表（30KB）会把「头发」变成「頭發」。
 * 所以：默认一个字节都不下载，读者按下「繁」的那一刻才去取，取一次浏览器
 * 就缓存住了。只有想看繁体的人付这个代价，而他们付得值。
 *
 * **二、只转显示，不改数据。** 转换发生在 DOM 的文本节点上，每个节点把
 * 原文记在自己身上（`__zhFrom`）。切回简体就是把原文放回去——不是再做一次
 * 繁→简（那会把原文里本来就是繁体的部分，比如法庭線的标题，也一起改掉）。
 * 数据库里存的永远是模型写的那一份。
 *
 * **三、每次渲染之后都跑一遍。** React 重渲染会把文本节点写回原文，
 * 所以这个 effect 不带依赖数组——每次渲染后都过一遍。为了不变成性能问题，
 * 已经转过的节点记着自己转成了什么，再遇到就直接跳过。
 */

type Script = 'hans' | 'hant'

interface Zh { script: Script; setScript: (s: Script) => void; busy: boolean }

const Ctx = createContext<Zh>({ script: 'hans', setScript: () => {}, busy: false })

const KEY = 'prism.script'

/** 别碰这些：脚本、样式、输入框，以及自己标了不要转的（比如那个切换按钮）。 */
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE'])

type Marked = Text & { __zhFrom?: string; __zhTo?: string }

function walk(root: Node, convert: ((s: string) => string) | null): void {
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent || SKIP.has(parent.tagName)) return NodeFilter.FILTER_REJECT
      if (parent.closest('[data-nozh]')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  for (let n = it.nextNode() as Marked | null; n; n = it.nextNode() as Marked | null) {
    const text = n.nodeValue ?? ''
    if (!text.trim()) continue

    if (!convert) {
      // 切回原文。只有我们改过的才需要动。
      if (n.__zhTo !== undefined && text === n.__zhTo && n.__zhFrom !== undefined) {
        n.nodeValue = n.__zhFrom
        n.__zhFrom = undefined
        n.__zhTo = undefined
      }
      continue
    }

    // 已经转过、而且内容没被 React 改掉，就不用再转一次。
    if (n.__zhTo !== undefined && text === n.__zhTo) continue
    // 没有中文就别费事。
    if (!/[一-鿿]/.test(text)) continue

    const done = convert(text)
    if (done === text) continue
    n.__zhFrom = text
    n.__zhTo = done
    n.nodeValue = done
  }
}

export function ZhProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [script, setScriptState] = useState<Script>(() => {
    try { return localStorage.getItem(KEY) === 'hant' ? 'hant' : 'hans' } catch { return 'hans' }
  })
  const [convert, setConvert] = useState<((s: string) => string) | null>(null)
  const [busy, setBusy] = useState(false)

  // 要繁体、而字典还没到，就去取一次。取回来放进 state，下面的 effect 会用上。
  useEffect(() => {
    if (script !== 'hant' || convert) return
    let alive = true
    setBusy(true)
    /*
     * 只取 cn2t 那一半。
     *
     * 默认入口 `opencc-js` 是 full，简→繁和繁→简两本词典都在里面（490KB）。
     * 这里只往一个方向转——切回简体是把原文放回去，不需要反向词典。
     * 单要 cn2t 省掉将近十分之一，而且它本来就是按需下载的那一份。
     */
    import('opencc-js/cn2t')
      .then((OpenCC) => {
        if (!alive) return
        const fn = OpenCC.Converter({ from: 'cn', to: 'tw' })
        setConvert(() => fn)
      })
      .catch(() => { /* 取不到就维持简体：读者看到的仍然是完整的内容 */ })
      .finally(() => { if (alive) setBusy(false) })
    return () => { alive = false }
  }, [script, convert])

  /*
   * 没有依赖数组：每次渲染之后都过一遍。
   * React 重渲染会把文本节点写回原文，只在切换时转一次是不够的。
   */
  useEffect(() => {
    walk(document.body, script === 'hant' ? convert : null)
  })

  const setScript = useCallback((s: Script) => {
    setScriptState(s)
    try { localStorage.setItem(KEY, s) } catch { /* 无痕模式：这一次有效，下次重来 */ }
    document.documentElement.lang = s === 'hant' ? 'zh-Hant' : 'zh-Hans'
  }, [])

  const value = useMemo(() => ({ script, setScript, busy }), [script, setScript, busy])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useZh = (): Zh => useContext(Ctx)
