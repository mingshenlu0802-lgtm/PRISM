import { useEffect, useState } from 'react'
import { usePrism } from '../../lib/store'
import { loadConfig, saveLocal, type BackendConfig } from '../../lib/backend'
import { syncFile } from '../../lib/github'
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
  const [saving, setSaving] = useState(false)
  const [published, setPublished] = useState<string | null>(null)

  useEffect(() => {
    void loadConfig().then((c) => { if (c) setCfg(c) })
  }, [])

  const ready = cfg.url.trim().startsWith('https://') && cfg.anonKey.trim().length > 20

  async function connect() {
    if (!ready) { toast('两串都要填，网址要以 https:// 开头。', 'warn'); return }
    saveLocal({ url: cfg.url.trim(), anonKey: cfg.anonKey.trim() })
    toast('已连上。正在读取…', 'go')
    // 刷新一次，让整个网站按共享模式重新起来。
    window.location.reload()
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

      <details className="mng__setup" open={mode !== 'shared'}>
        <summary>三步接上（约十五分钟，只做一次）</summary>
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
            左边 <strong>SQL Editor</strong> → <strong>New query</strong>，
            把仓库里 <code>supabase/schema.sql</code> 整个文件粘进去，
            <strong>先把最后一行的邮箱改成你自己的</strong>，然后 <strong>Run</strong>。
            <span className="mng__stepwhy">
              这一步建好所有的表和权限规则。最后那行是把你自己设成站长——
              在有第一个成员之前，谁都读不到东西，所以这一行必须在这里写死一次。
            </span>
          </li>
          <li>
            左边 <strong>Project Settings → API</strong>，
            复制 <strong>Project URL</strong> 和 <strong>anon public</strong> 那一串，
            粘到下面。
            <span className="mng__stepwhy">
              这两串是公开的，可以放心提交进仓库——anon key 不授予任何权限，
              能不能读写完全取决于你登录后的身份和第 2 步建好的规则。
            </span>
          </li>
        </ol>

        <div className="bke__fields">
          <TextInput
            placeholder="Project URL（https://xxxx.supabase.co）"
            value={cfg.url}
            onChange={(e) => setCfg((c) => ({ ...c, url: e.currentTarget.value }))}
          />
          <TextInput
            placeholder="anon public key"
            value={cfg.anonKey}
            onChange={(e) => setCfg((c) => ({ ...c, anonKey: e.currentTarget.value }))}
          />
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
