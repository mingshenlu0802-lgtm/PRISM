import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

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
 * **三、盯 DOM，不盯渲染。** React 重渲染会把文本节点写回原文，换路由、
 * 懒加载的页面到货、稿子从数据库读回来，也都会凭空长出新的文字。这些事
 * 都不经过这个组件，所以只能用 MutationObserver 接。为了不变成性能问题，
 * 已经转过的节点记着自己转成了什么，再遇到就直接跳过；简体模式下根本不装。
 */

type Script = 'hans' | 'hant'

interface Zh { script: Script; setScript: (s: Script) => void; busy: boolean }

const Ctx = createContext<Zh>({ script: 'hans', setScript: () => {}, busy: false })

const KEY = 'prism.script'

/** 别碰这些：脚本、样式、输入框，以及自己标了不要转的（比如那个切换按钮）。 */
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE'])

type Marked = Text & { __zhFrom?: string; __zhTo?: string }

/**
 * 这几个属性也是给人看的，只是不在正文里。
 *
 * 漏掉它们的后果是「一半的界面没跟着转」，而且漏掉的正好是最看不见的那一半：
 * 读屏用户听到的全部是 aria-label，图片加载失败时留在页面上的是 alt，
 * 输入框里那行灰字是 placeholder。这些人不会来报这个 bug——他们只会觉得
 * 这个网站的繁体做得半吊子。
 *
 * 只转这四个。`value` 不在里面，那是用户打的字，碰不得。
 */
const ATTRS = ['aria-label', 'alt', 'placeholder', 'title'] as const

interface Orig { from: string; to: string }
/** 每个元素改过哪些属性、原文是什么。WeakMap：元素从 DOM 上掉了就一起回收。 */
const attrMemo = new WeakMap<Element, Map<string, Orig>>()
let titleMemo: Orig | null = null

function convertAttrs(convert: ((s: string) => string) | null): void {
  const sel = ATTRS.map((a) => `[${a}]`).join(',')
  for (const el of document.body.querySelectorAll(sel)) {
    if (el.closest('[data-nozh]')) continue
    const memo = attrMemo.get(el)
    for (const a of ATTRS) {
      const now = el.getAttribute(a)
      if (now === null) continue
      const was = memo?.get(a)

      if (!convert) {
        if (was && now === was.to) el.setAttribute(a, was.from)
        continue
      }
      if (was && now === was.to) continue
      if (!/[一-鿿]/.test(now)) continue
      const done = convert(now)
      if (done === now) continue
      el.setAttribute(a, done)
      const box = memo ?? new Map<string, Orig>()
      box.set(a, { from: now, to: done })
      if (!memo) attrMemo.set(el, box)
    }
  }
}

/**
 * 标签页上的标题。
 *
 * 它不在 body 里，遍历文本节点碰不到它——于是会出现「整页是繁体、
 * 标签页和书签是简体」。转发链接是这个站的主要传播方式，标题恰恰是
 * 对方在聊天窗口里唯一先看到的那一行。
 */
function convertTitle(convert: ((s: string) => string) | null): void {
  const now = document.title
  if (!convert) {
    if (titleMemo && now === titleMemo.to) document.title = titleMemo.from
    titleMemo = null
    return
  }
  if (titleMemo && now === titleMemo.to) return
  if (!/[一-鿿]/.test(now)) return
  const done = convert(now)
  if (done === now) return
  document.title = done
  titleMemo = { from: now, to: done }
}

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
  /** 转过一次之后才需要「还原」这一趟；没转过就别白走一遍 DOM。 */
  const touched = useRef(false)

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

  useEffect(() => {
    document.documentElement.lang = script === 'hant' ? 'zh-Hant' : 'zh-Hans'
  }, [script])

  /*
   * 盯着 DOM，而不是盯着 React 的渲染。
   *
   * 这里原来是一个不带依赖数组的 effect，想的是「每次渲染后都过一遍」。
   * 那是错的：不带依赖数组只保证 **ZhProvider 自己** 每次渲染后跑一遍，
   * 而 ZhProvider 挂在最外面、状态只有 script 和 convert——换路由、
   * 懒加载的控制端到货、稿子从数据库读回来，这些都不会让它重新渲染。
   * 结果就是：首页按下「繁」当场是好的，一进控制端就全变回简体，
   * 而且看起来像是「控制端不支持」。
   *
   * 改成 MutationObserver：页面上任何地方冒出新文字都会被接住。
   * 自己改的那一下会再触发一次 observer，所以走之前先 disconnect——
   * 不然就是自己追自己。攒一帧再跑，因为 React 一次更新会发几十条 mutation。
   *
   * 简体模式下不装 observer：绝大多数读者一辈子不碰这个开关，
   * 不该为一个他们没用的功能付一整棵 DOM 的监听成本。
   */
  useEffect(() => {
    const target = script === 'hant' ? convert : null

    if (!target) {
      if (touched.current) {
        walk(document.body, null)
        convertAttrs(null)
        convertTitle(null)
        touched.current = false
      }
      return
    }
    touched.current = true

    let alive = true
    let queued = false
    const obs = new MutationObserver(() => {
      if (queued || !alive) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        if (alive) pass()
      })
    })
    // 属性也要盯：React 重渲染会把 aria-label 写回简体。
    const watch = {
      childList: true, characterData: true, subtree: true,
      attributes: true, attributeFilter: [...ATTRS],
    }
    const pass = (): void => {
      obs.disconnect()
      walk(document.body, target)
      convertAttrs(target)
      convertTitle(target)
      if (alive) obs.observe(document.body, watch)
    }

    pass()
    return () => { alive = false; obs.disconnect() }
  }, [script, convert])

  const setScript = useCallback((s: Script) => {
    setScriptState(s)
    try { localStorage.setItem(KEY, s) } catch { /* 无痕模式：这一次有效，下次重来 */ }
  }, [])

  const value = useMemo(() => ({ script, setScript, busy }), [script, setScript, busy])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useZh = (): Zh => useContext(Ctx)
