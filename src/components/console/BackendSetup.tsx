import { useEffect, useState } from 'react'
import { usePrism } from '../../lib/store'
import {
  inSandboxFrame, keyDanger, keyProblem, keyTyping, loadConfig, parsePasted, saveLocal,
  urlProblem, urlTyping, type BackendConfig,
} from '../../lib/backend'
import { syncFile } from '../../lib/github'
import { schemaSqlFor } from '../../lib/schemaSql'
import { Icon, TextInput, toast } from '../common'
import './BackendSetup.css'

/**
 * 「让朋友也能看」——把网站从本地模式切到共享模式。
 *
 * 站长要做的只有三件事：注册 Supabase、跑一次 SQL、把两串字符粘进来。
 * 粘进来之后，这个组件会把它们写成一个跟网站一起发布的配置文件——
 * 因为**朋友第一次打开网站时浏览器里什么都没有**，必须能从网站本身
 * 拿到连接信息，否则连登录页都到不了。
 *
 * 这两串值是公开的。Supabase 的 anon key 本身不授予任何权限，
 * 权限全部来自登录之后的身份和数据库规则。这一点在界面上写明，
 * 免得站长以为自己在公开什么秘密。
 */
export function BackendSetup(): JSX.Element {
  const { state, mode, isOwner } = usePrism()
  const [cfg, setCfg] = useState<BackendConfig>({ url: '', anonKey: '' })
  const [ownerEmail, setOwnerEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [published, setPublished] = useState<string | null>(null)

  /*
   * 已经配置过的话，把现有的值填回来，方便核对和修改。
   *
   * 但**绝不能覆盖站长正在打的字**：这个 fetch 是异步的，它可能在他已经
   * 开始输入之后才回来。所以只在两个框都还是空的时候才填。
   */
  useEffect(() => {
    void loadConfig().then((c) => {
      if (c) setCfg((cur) => (cur.url || cur.anonKey ? cur : c))
    })
  }, [])

  /**
   * 粘贴：两行一起粘也认。
   *
   * 站长的原话：「我不能同时输入两行进输入框。」——单行输入框会把换行吃掉，
   * 于是两串黏成一串，怎么填都不对。这里接管粘贴：不管粘在哪个框、粘的是
   * 一行还是两行，认出来的各自归位。认不出来的就走浏览器的默认行为。
   */
  function onPaste(field: 'url' | 'anonKey') {
    return (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData?.getData('text') ?? ''
      if (!/[\s\n\r]/.test(text.trim())) return // 单独一串，交给浏览器
      const found = parsePasted(text)
      if (!found.url && !found.anonKey) return
      e.preventDefault()
      setCfg((c) => ({ url: found.url ?? c.url, anonKey: found.anonKey ?? c.anonKey }))
      setTouched({ url: false, key: false })
      if (found.url && found.anonKey) toast('两串都认出来了，各自填好了。', 'go')
      else if (found[field]) toast('填好了。另一串还要单独粘一次。', 'info')
      else toast('从你粘的内容里只认出了另一串，已经填到对应的框里。', 'info')
    }
  }

  /*
   * 什么时候说「这里不对」。
   *
   * 站长反馈：「我尝试给 publishable key enter anything 的时候就出现错误」——
   * 因为原来每敲一个字符就完整校验一遍，才打了两个字母就被判「太短」。
   * 打字中途本来就还没填对，那不是错误，那是打字。
   *
   * 所以分两档：
   * - **危险的**（Secret key、service_role）一个字符都不等，立刻拦。
   *   等按按钮才说就晚了——那时他可能已经点了「发布出去」。
   * - **形状不对**（太短、开头不对）等他离开输入框再说。
   */
  const [touched, setTouched] = useState({ url: false, key: false })

  const urlFull = urlProblem(cfg.url)
  const keyFull = keyProblem(cfg.anonKey)
  const urlErr = touched.url && !urlTyping(cfg.url) ? urlFull : null
  const keyErr = keyDanger(cfg.anonKey)
    ?? (touched.key && !keyTyping(cfg.anonKey) ? keyFull : null)
  const ready = Boolean(cfg.url.trim() && cfg.anonKey.trim()) && !urlFull && !keyFull

  function connect() {
    if (!ready) { toast(urlErr ?? keyErr ?? '两串都要填。', 'warn'); return }
    if (inSandboxFrame()) {
      toast('这里是预览环境，连不上任何数据库。请到你自己的网址上做这一步。', 'warn')
      return
    }
    saveLocal({ url: cfg.url.trim(), anonKey: cfg.anonKey.trim() })
    // 整个网站要按共享模式重新起来，最干净的做法是重新载入。
    // 用 assign 而不是 reload：在 iframe 预览里 reload 有时会留下一个空白框。
    window.location.assign(window.location.href)
  }

  async function publishConfig() {
    setSaving(true)
    const body = JSON.stringify({
      _readme: '这两串值是公开的，权限来自登录身份和数据库规则，不来自它们。',
      url: cfg.url.trim(),
      anonKey: cfg.anonKey.trim(),
    }, null, 2)
    const res = await syncFile(
      state.github,
      'public/prism-config.json',
      body,
      '连上共享数据库，让朋友也能看',
    )
    setSaving(false)
    if (res.ok) setPublished(res.url ?? '')
    toast(res.message, res.ok ? 'go' : 'warn')
  }

  return (
    <>
      <h3 className="mng__subtitle">让朋友也能看</h3>

      {mode === 'shared' ? (
        <p className="bke__on">
          <Icon name="check" size={15} />
          <span>
            已经连上了。内容存在共用的数据库里，你和成员看到的是同一份；
            谁能进、谁能改，由数据库说了算——改浏览器里的代码没用。
          </span>
        </p>
      ) : (
        <p className="mng__note">
          现在是<strong>本地模式</strong>：内容只存在你这台电脑的浏览器里。
          把网址发给朋友，他们看到的会是演示数据，不是你的内容。
          按下面三步接上一个免费的共享数据库，就能真的分享出去。
        </p>
      )}

      {inSandboxFrame() && mode !== 'shared' && (
        <p className="bke__sandbox">
          <Icon name="alert" size={15} />
          <span>
            <strong>你现在看的是预览版。</strong>
            这个预览跑在一个沙箱里，禁止一切对外请求，所以在这里连不上数据库——
            连对了也会失败。请打开<strong>你自己的网址</strong>（GitHub Pages 给你的那个，
            或者你的域名），在那边做下面这几步。
          </span>
        </p>
      )}

      <details className="mng__setup" open={mode !== 'shared'}>
        <summary>四步接上（约十五分钟，只做一次）</summary>
        <ol className="mng__steps">
          <li>
            打开 <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a> 注册，
            <strong>New project</strong>。名字随便取，地区选离你近的，
            数据库密码它会自动生成，<strong>存好但用不到</strong>。
            <span className="mng__stepwhy">
              免费额度对这个规模绰绰有余。项目建好要等一两分钟。
            </span>
          </li>
          <li>
            <strong>先在这里填你的邮箱</strong>（就是你以后登录网站用的那个），
            按「复制建库 SQL」。
            <div className="bke__sql">
              <TextInput
                type="email"
                placeholder="你的邮箱（会被设成站长）"
                value={ownerEmail}
                onChange={(e) => { setOwnerEmail(e.currentTarget.value); setCopied(false) }}
              />
              <button
                type="button"
                className="mng__solid"
                disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())}
                onClick={() => {
                  const sql = schemaSqlFor(ownerEmail)
                  void navigator.clipboard?.writeText(sql)
                    .then(() => { setCopied(true); toast('SQL 已复制，去 Supabase 粘贴。', 'go') })
                    .catch(() => toast('复制不了。展开下面那一大段，手动全选复制。', 'warn'))
                }}
              >
                <Icon name="file" size={14} />{copied ? '已复制 ✓' : '复制建库 SQL'}
              </button>
            </div>
            <span className="mng__stepwhy">
              不用去仓库里找文件——SQL 就在这个按钮里，而且你的邮箱已经替你填好了。
            </span>
          </li>
          <li>
            回到 Supabase，左边点 <strong>SQL Editor</strong> → <strong>New query</strong>，
            <strong>粘贴</strong>，然后点右下角 <strong>Run</strong>。
            看到绿色的 <code>Success</code> 就成了。
            <span className="mng__stepwhy">
              这一步建好所有的表和权限规则，并且把你设成站长。
              在有第一个成员之前谁都读不到东西，所以站长必须在这里先写进去一次。
              这段 SQL 重复跑多少遍都没问题，不会弄坏已有的东西。
            </span>
            {ownerEmail.trim() && (
              <details className="bke__peek">
                <summary>复制不了？点开手动选中这一段</summary>
                <pre className="bke__pre">{schemaSqlFor(ownerEmail)}</pre>
              </details>
            )}
          </li>
          <li>
            回 Supabase 拿两串字符，粘到下面两个框。它们在<strong>两个不同的页面</strong>上：
            <ul className="bke__where">
              <li>
                <strong>Project URL</strong> —— 左下角齿轮 <strong>Settings</strong> →
                <strong> General</strong>，找 <strong>Project ID</strong>。
                网址就是 <code>https://那串ID.supabase.co</code>。
                <span className="mng__stepwhy">
                  也可以直接看浏览器地址栏：<code>/project/</code> 后面那一串就是。
                </span>
              </li>
              <li>
                <strong>Publishable key</strong> —— Settings → <strong>API Keys</strong>，
                在 <strong>Publishable key</strong> 那一栏，点复制图标。
                <span className="mng__stepwhy">
                  就是以前叫 anon public 的那个，Supabase 改了名字。
                  <strong>下面那个 Secret key 千万别用</strong>——它能绕过所有权限规则。
                  填错了下面会红字提醒你。
                </span>
              </li>
            </ul>
            <span className="mng__stepwhy">
              这两串是公开的，可以放心提交进仓库——它们不授予任何权限，
              能不能读写完全取决于你登录后的身份和第 2 步建好的规则。
            </span>
          </li>
        </ol>

        <p className="bke__pastehint">
          <Icon name="info" size={13} />
          <span>
            <strong>两行可以一起粘。</strong>
            把网址和 key 一起复制下来（中间隔一个换行或空格），
            粘进<strong>任意一个</strong>框，它会自动认出哪个是哪个，各自填好。
          </span>
        </p>

        <div className="bke__fields">
          <TextInput
            placeholder="Project URL（https://你的项目ID.supabase.co）"
            value={cfg.url}
            aria-label="Supabase Project URL"
            aria-invalid={urlErr ? true : undefined}
            onChange={(e) => {
              // 先把值取出来。React 会在 render 期间重跑这个 updater，
              // 那时事件已经结束、currentTarget 被置空——在里面读就是 null.value。
              const v = e.currentTarget.value
              setTouched((t) => ({ ...t, url: false }))
              setCfg((c) => ({ ...c, url: v }))
            }}
            onBlur={() => setTouched((t) => ({ ...t, url: true }))}
            onPaste={onPaste('url')}
          />
          {urlErr && <p className="bke__err">{urlErr}</p>}

          <TextInput
            placeholder="Publishable key（sb_publishable_… 开头）"
            value={cfg.anonKey}
            aria-label="Supabase Publishable key"
            aria-invalid={keyErr ? true : undefined}
            onChange={(e) => {
              // 先把值取出来。React 会在 render 期间重跑这个 updater，
              // 那时事件已经结束、currentTarget 被置空——在里面读就是 null.value。
              const v = e.currentTarget.value
              setTouched((t) => ({ ...t, key: false }))
              setCfg((c) => ({ ...c, anonKey: v }))
            }}
            onBlur={() => setTouched((t) => ({ ...t, key: true }))}
            onPaste={onPaste('anonKey')}
          />
          {keyErr && <p className="bke__err">{keyErr}</p>}
          {!keyErr && cfg.anonKey.trim() && !keyFull && (
            <p className="bke__ok"><Icon name="check" size={13} />这一串看起来没问题。</p>
          )}
        </div>

        <div className="bke__acts">
          <button type="button" className="mng__solid" onClick={() => void connect()} disabled={!ready}>
            <Icon name="check" size={14} />在这台电脑上连起来
          </button>
          {isOwner && (
            <button
              type="button"
              className="mng__ghost"
              onClick={() => void publishConfig()}
              disabled={!ready || saving || !state.github.token}
              title={state.github.token ? undefined : '需要先在下面填 GitHub token'}
            >
              <Icon name="send" size={14} />{saving ? '发布中…' : '发布出去，让朋友也能连'}
            </button>
          )}
          {published !== null && (
            <a className="mng__ghost" href={published} target="_blank" rel="noreferrer">
              <Icon name="external" size={14} />看这次提交
            </a>
          )}
        </div>

        <p className="mng__note">
          <strong>两个按钮的区别：</strong>左边只让<strong>你这台电脑</strong>连上，
          适合先自己试。右边把配置写进仓库，网站重新发布之后
          <strong>朋友打开你的网址才连得上</strong>——不做这一步，他们看到的还是演示数据。
        </p>
      </details>
    </>
  )
}
