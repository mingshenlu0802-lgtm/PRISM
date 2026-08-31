import { useEffect, useRef, useState } from 'react'
import { usePrism } from '../../lib/store'
import { ask, looksLikeKey, type ChatMessage, type Proposal } from '../../lib/claude'
import { runVibe, VIBE_EXAMPLES } from '../../lib/vibe'
import { openIssue } from '../../lib/github'
import { cx } from '../../lib/util'
import { Icon, TextArea, TextInput, toast } from '../common'
import './ClaudePanel.css'

/**
 * 跟 Claude 说一句话，网站就改了。
 *
 * 填了 API key 就是真的 Claude：它读得到网站现在的样子，听得懂"首页太挤了，
 * 头条那条帮我扩写成三段"这种话，然后真的改。没填 key 也不是死的——退回到
 * 内置的关键词规则，能认「字大一点」「换成深色」这类常用说法。
 *
 * 它改不了代码。碰到要改代码的事，它写一份需求，一键开成 GitHub issue，
 * 站长在 Claude Code 里接着做。这条界限写在界面上，不藏。
 */
export function ClaudePanel(): JSX.Element {
  const { state, dispatch, who, canEdit } = usePrism()
  const [key, setKey] = useState(() => readKey())
  const [showKey, setShowKey] = useState(false)
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [before, setBefore] = useState<{ appearance: typeof state.appearance; copy: typeof state.copy } | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  const live = looksLikeKey(key)

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [chat, streaming])

  function saveKey(v: string) {
    setKey(v)
    try { window.localStorage.setItem(KEY_STORE, v) } catch { /* 存不下也不影响这次会话 */ }
  }

  /** 把 Claude 的一次工具调用真的写进网站。 */
  function apply(p: Proposal): string | null {
    switch (p.kind) {
      case 'appearance': dispatch({ type: 'appearance', patch: p.patch, who }); return p.say
      case 'copy': dispatch({ type: 'copy', patch: p.patch, who }); return p.say
      case 'news-edit': dispatch({ type: 'news-edit', id: p.id, patch: p.patch, who }); return p.say
      case 'news-feature': dispatch({ type: 'news-feature', id: p.id, on: true, who }); return p.say
      case 'news-hide': dispatch({ type: 'news-hide', id: p.id, who }); return p.say
      case 'news-restore': dispatch({ type: 'news-restore', id: p.id, who }); return p.say
      case 'handoff': return null
    }
  }

  async function send() {
    const q = input.trim()
    if (!q || busy) return
    setInput('')
    setBefore({ appearance: state.appearance, copy: state.copy })
    const asked: ChatMessage = { role: 'user', text: q }
    setChat((c) => [...c, asked])

    // 没有 key 就用内置规则，认得出就照做，认不出就直说。
    if (!live) {
      const r = runVibe(q, state)
      if (r.understood) {
        for (const c of r.changes) {
          if (c.appearance) dispatch({ type: 'appearance', patch: c.appearance, who })
          if (c.copy) dispatch({ type: 'copy', patch: c.copy, who })
        }
        setChat((c) => [...c, {
          role: 'assistant',
          text: '改好了。',
          done: r.changes.map((x) => x.what),
        }])
      } else {
        setChat((c) => [...c, {
          role: 'assistant',
          text: `${r.suggestion ?? '这句话我没看懂。'}\n\n填上 Anthropic API key 之后，这里就是真的 Claude，能听懂的话多得多。`,
        }])
      }
      return
    }

    setBusy(true)
    setStreaming('')
    let acc = ''
    const res = await ask(key, state, [...chat, asked].slice(-12), q, (chunk) => {
      acc += chunk
      setStreaming(acc)
    })
    setStreaming('')
    setBusy(false)

    if (res.error) {
      setChat((c) => [...c, { role: 'assistant', text: res.error! }])
      return
    }

    const done: string[] = []
    let handoff: string | undefined
    for (const p of res.proposals) {
      if (p.kind === 'handoff') handoff = p.text
      const said = apply(p)
      if (said) done.push(said)
    }
    setChat((c) => [...c, { role: 'assistant', text: res.text, done, handoff }])
  }

  function undo() {
    if (!before) return
    dispatch({ type: 'appearance', patch: before.appearance, who })
    dispatch({ type: 'copy', patch: before.copy, who })
    setBefore(null)
    toast('外观和文案已回到上一次提问之前。新闻内容的改动请在「内容」里逐条还原。', 'info')
  }

  return (
    <div className="mng__panel">
      <p className="mng__panelnote">
        用大白话说你想改什么。它能改外观、网站上写的字、新闻的标题总结要点标签，
        还能设头条、下架和重新上线——说完就改好了，随时可以撤销。
        <strong>它改不了代码</strong>：加新板块、改版面结构这类要改源码，它会写好需求让你转给 Claude Code。
      </p>

      <div className="cld">
        <div className="cld__log" role="log" aria-label="与 Claude 的对话">
          {chat.length === 0 && !streaming && (
            <div className="cld__empty">
              <p className="cld__emptytitle">
                {live ? '可以开始了。试试这些：' : '还没填 API key，现在用的是内置规则。试试这些：'}
              </p>
              <div className="cld__chips">
                {(live ? LIVE_EXAMPLES : VIBE_EXAMPLES).map((e) => (
                  <button key={e} type="button" className="cld__chip" onClick={() => setInput(e)}>{e}</button>
                ))}
              </div>
            </div>
          )}

          {chat.map((m, i) => (
            <div key={i} className={cx('cld__msg', `cld__msg--${m.role}`)}>
              {m.text && <div className="cld__text">{m.text}</div>}

              {m.done && m.done.length > 0 && (
                <ul className="cld__done">
                  {m.done.map((d) => (
                    <li key={d}><Icon name="check" size={13} />{d}</li>
                  ))}
                </ul>
              )}

              {m.handoff && <Handoff text={m.handoff} />}
            </div>
          ))}

          {streaming && (
            <div className="cld__msg cld__msg--assistant">
              <div className="cld__text">{streaming}</div>
            </div>
          )}
          {busy && !streaming && <p className="cld__thinking">Claude 在想…</p>}
          <div ref={endRef} />
        </div>

        <div className="cld__composer">
          <TextArea
            rows={2}
            value={input}
            placeholder={live ? '例：把头条那条扩写成三段，别加新事实' : '例：字大一点，换成深色'}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send() }
            }}
            disabled={!canEdit || busy}
          />
          <div className="cld__row">
            <button type="button" className="cld__send" onClick={() => void send()} disabled={!canEdit || busy || !input.trim()}>
              <Icon name="sparkle" size={15} />{busy ? '进行中…' : '发送'}
            </button>
            <span className="cld__kbd">⌘/Ctrl + Enter</span>
            {before && (
              <button type="button" className="cld__undo" onClick={undo}>
                <Icon name="refresh" size={14} />撤销外观与文案
              </button>
            )}
            {chat.length > 0 && (
              <button type="button" className="cld__undo" onClick={() => setChat([])}>清空对话</button>
            )}
          </div>
        </div>
      </div>

      <details className="mng__setup" open={!live}>
        <summary>{live ? 'API key 已填好（点开可以更换）' : '接上真正的 Claude（可选）'}</summary>
        <p className="mng__stepnote">
          不填也能用，只是只认得「字大一点」这类固定说法。
          填了之后它读得懂你网站的全部内容，也听得懂复杂得多的要求。
        </p>
        <ol className="mng__steps">
          <li>
            打开 <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a> →
            <strong>API keys</strong> → 新建一个，复制那串以 <code>sk-ant-</code> 开头的字符。
          </li>
          <li>
            粘到下面。它只存在这台电脑的浏览器里，跟 GitHub token 一样。
            <span className="mng__stepwhy">
              也就是说：能打开你这台电脑浏览器的人就能拿到它。别在公用电脑上填。
              万一泄露了，去同一个页面把这个 key 删掉就行，几秒钟的事。
            </span>
          </li>
          <li>
            按用量计费，跟你在 claude.ai 的订阅是两笔账。
            <span className="mng__stepwhy">
              改几句文案通常是几分钱的事；让它扩写一整条长新闻会贵一些。
              可以在 Anthropic 后台设每月上限。
            </span>
          </li>
        </ol>
        <div className="cld__keyrow">
          <TextInput
            type={showKey ? 'text' : 'password'}
            placeholder="sk-ant-…"
            value={key}
            onChange={(e) => saveKey(e.currentTarget.value)}
          />
          <button type="button" className="mng__ghost" onClick={() => setShowKey((v) => !v)}>
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>
        {key && !live && <p className="cld__warn">这串不像 API key——正确的以 sk-ant- 开头。</p>}
      </details>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * 代码改动的交接
 * ------------------------------------------------------------------ */

/**
 * 改代码这条路，尽量少让站长动手。
 *
 * 一键开成 issue（用已经填好的 GitHub token），再一键跳到 Claude Code 打开这个
 * 仓库。剩下要他做的只有一句话：「做 issue #N」。
 */
function Handoff({ text }: { text: string }): JSX.Element {
  const { state } = usePrism()
  const [sending, setSending] = useState(false)
  const [issue, setIssue] = useState<string | null>(null)
  const gh = state.github
  const codeUrl = `https://claude.ai/code?repo=${encodeURIComponent(`${gh.owner}/${gh.repo}`)}`

  return (
    <div className="cld__handoff">
      <p className="cld__handofftitle">
        <Icon name="branch" size={14} />这件事要改代码
      </p>
      <p className="cld__handoffwhy">
        网站的页面是提前构建好再传上去的，浏览器里改不了源码。下面这份需求可以直接交给 Claude Code，
        它改完推送，网站会自动重新发布。
      </p>
      <pre className="cld__handofftext">{text}</pre>
      <div className="cld__handoffacts">
        {issue ? (
          <a className="cld__solid" href={issue} target="_blank" rel="noreferrer">
            <Icon name="external" size={14} />看这个 issue
          </a>
        ) : (
          <button
            type="button"
            className="cld__solid"
            disabled={sending || !gh.token}
            title={gh.token ? undefined : '需要先在「账号与同步」里填 GitHub token'}
            onClick={async () => {
              setSending(true)
              const r = await openIssue(gh, text.split('\n')[0].slice(0, 70), text)
              setSending(false)
              if (r.ok && r.url) setIssue(r.url)
              toast(r.message, r.ok ? 'go' : 'warn')
            }}
          >
            <Icon name="plus" size={14} />{sending ? '开 issue 中…' : '开成 GitHub issue'}
          </button>
        )}
        <a className="cld__ghost" href={codeUrl} target="_blank" rel="noreferrer">
          <Icon name="external" size={14} />在 Claude Code 里打开仓库
        </a>
        <button
          type="button"
          className="cld__ghost"
          onClick={() => {
            void navigator.clipboard?.writeText(text)
              .then(() => toast('需求已复制，粘给 Claude Code 就行。', 'go'))
              .catch(() => toast('复制不了，手动选中上面那段文字吧。', 'info'))
          }}
        >
          <Icon name="file" size={14} />复制需求
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

const KEY_STORE = 'prism.anthropic.key'

function readKey(): string {
  try { return window.localStorage.getItem(KEY_STORE) ?? '' } catch { return '' }
}

const LIVE_EXAMPLES = [
  '首页太挤了，帮我看看能怎么办',
  '把头条那条扩写成三段，别加新事实',
  '香港那条的总结太啰嗦了，砍一半',
  '给我加一个"每周回顾"的板块',
  '换成深色，字体用宋体',
  '把首页那段介绍改得更像人话',
]
