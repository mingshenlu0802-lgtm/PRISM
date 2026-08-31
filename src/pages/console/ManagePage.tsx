import { useEffect, useMemo, useRef, useState } from 'react'
import { OWNER_EMAIL } from '../../lib/types'
import { usePrism } from '../../lib/store'
import { downloadSnapshot, syncToGitHub } from '../../lib/github'
import { googleSignOut, renderGoogleButton } from '../../lib/google'
import { ACCENTS, FONT_STEPS, THEMES } from '../../lib/constants'
import { byNewest, cx, fmtDateTime, relTime } from '../../lib/util'
import {
  Checkbox, EmptyState, Icon, Modal, Segmented, TextArea, TextInput, toast,
} from '../../components/common'
import { NewsEditor } from '../../components/console/NewsEditor'
import { ClaudePanel } from '../../components/console/ClaudePanel'
import './ManagePage.css'

type Tab = 'content' | 'vibe' | 'look' | 'account'

/**
 * 「编辑」——控制端第二页。
 *
 * 四个标签，从最常用到最少用排：编辑内容 → 跟 Claude 说一句 → 手动调外观 →
 * 账号与同步。每个危险操作都有二次确认，每一次编辑都记在下面的「最近编辑」里。
 */
export default function ManagePage(): JSX.Element {
  const { state, dispatch, reset, who, canEdit, isOwner } = usePrism()
  const [tab, setTab] = useState<Tab>('content')

  return (
    <div className="mng">
      <header className="mng__head">
        <h1 className="mng__title">编辑</h1>
        <p className="mng__lede">
          这里编辑的都是你和读者能看到的东西。编辑错了不要紧——下面每一步都有撤销或恢复。
        </p>
      </header>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        ariaLabel="编辑的四个部分"
        options={[
          { value: 'content', label: '内容', count: state.news.length + state.studies.length },
          { value: 'vibe', label: 'Claude' },
          { value: 'look', label: '外观' },
          { value: 'account', label: '账号与同步' },
        ]}
      />

      {tab === 'content' && <ContentTab />}
      {tab === 'vibe' && <ClaudePanel />}
      {tab === 'look' && <LookTab />}
      {tab === 'account' && <AccountTab />}

      <section className="mng__log" aria-labelledby="mng-log">
        <h2 className="mng__logtitle" id="mng-log">最近编辑</h2>
        {state.changes.length === 0 ? (
          <p className="mng__logempty">还没有任何编辑。</p>
        ) : (
          <ul className="mng__loglist">
            {state.changes.slice(0, 12).map((c) => (
              <li key={c.id} className="mng__logrow">
                <span className="mng__logwhen">{relTime(c.at)}</span>
                <span className="mng__logtext">{c.text}</span>
                <span className="mng__logwho">{c.who}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOwner && (
        <section className="mng__danger">
          <h2 className="mng__dangertitle">危险操作</h2>
          <div className="mng__dangerrow">
            <div>
              <p className="mng__dangername">
                {state.publicOffline ? '公众站已暂停对外显示' : '暂停整个网站的对外显示'}
              </p>
              <p className="mng__dangernote">
                {state.publicOffline
                  ? '现在别人打开网站看不到内容，只有登录的你能看到。'
                  : '打开之后，别人访问网站会看到「暂停」提示。内容不会被删除，随时可以恢复。'}
              </p>
            </div>
            <button
              type="button"
              className={cx('mng__dangerbtn', state.publicOffline && 'mng__dangerbtn--on')}
              onClick={() => {
                dispatch({ type: 'public-offline', off: !state.publicOffline, who })
                toast(state.publicOffline ? '网站已恢复对外显示。' : '网站已暂停对外显示。', 'info')
              }}
            >
              {state.publicOffline ? '恢复显示' : '暂停显示'}
            </button>
          </div>
          <ResetRow onReset={reset} disabled={!canEdit} />
        </section>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * 内容
 * ------------------------------------------------------------------ */

function ContentTab(): JSX.Element {
  const { state, dispatch, who, canEdit } = usePrism()
  const [q, setQ] = useState('')
  const [only, setOnly] = useState<'all' | 'live' | 'hidden'>('all')
  const [kind, setKind] = useState<'news' | 'studies'>('news')

  const news = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return byNewest(state.news).filter((n) => {
      if (only !== 'all' && n.status !== only) return false
      if (needle && !`${n.headline}${n.summary}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [state.news, q, only])

  const studies = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return byNewest(state.studies).filter((s) => {
      if (only !== 'all' && s.status !== only) return false
      if (needle && !`${s.title}${s.summary}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [state.studies, q, only])

  return (
    <div className="mng__panel">
      <p className="mng__panelnote">
        点开任意一条就能编辑：标题、总结、要点、标签，每一个媒体链接都能单独删掉，也能自己加。
        编辑完按「保存」。不想让别人看到就「下架」，下架随时能恢复；确定不要了才「永久删除」。
      </p>

      <div className="mng__filters">
        <TextInput
          type="search" placeholder="搜标题或内容…" value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
        />
        <div className="mng__seg">
          {([['news', '新闻'], ['studies', '研究与数据']] as [typeof kind, string][]).map(([v, l]) => (
            <button key={v} type="button" className={cx('mng__segbtn', kind === v && 'mng__segbtn--on')}
              aria-pressed={kind === v} onClick={() => setKind(v)}>{l}</button>
          ))}
        </div>
        <div className="mng__seg">
          {([['all', '全部'], ['live', '已上线'], ['hidden', '已下架']] as [typeof only, string][]).map(([v, l]) => (
            <button key={v} type="button" className={cx('mng__segbtn', only === v && 'mng__segbtn--on')}
              aria-pressed={only === v} onClick={() => setOnly(v)}>{l}</button>
          ))}
        </div>
      </div>

      {kind === 'news' ? (
        news.length === 0
          ? <EmptyState title="没有符合条件的新闻" hint="换个筛选，或去「找新闻」搜一批。" icon="search" />
          : <div className="mng__items">{news.map((n) => <NewsEditor key={n.id} item={n} />)}</div>
      ) : (
        studies.length === 0
          ? <EmptyState title="没有符合条件的研究" hint="换个筛选，或去「找新闻」搜一批。" icon="book" />
          : (
            <div className="mng__items">
              {studies.map((s) => (
                <article key={s.id} className={cx('mng__study', s.status === 'hidden' && 'mng__study--off')}>
                  <div className="mng__studyhead">
                    <span className="mng__studytitle">{s.title}</span>
                    {s.status === 'hidden' && <span className="mng__studybadge">已下架</span>}
                  </div>
                  <p className="mng__studysum">{s.summary}</p>
                  <div className="mng__studyacts">
                    {s.status === 'live' ? (
                      <button type="button" disabled={!canEdit}
                        onClick={() => { dispatch({ type: 'study-hide', id: s.id, who }); toast('已下架。', 'info') }}>
                        <Icon name="eye-off" size={13} />下架
                      </button>
                    ) : (
                      <button type="button" disabled={!canEdit}
                        onClick={() => { dispatch({ type: 'study-restore', id: s.id, who }); toast('已重新上线。', 'go') }}>
                        <Icon name="eye" size={13} />重新上线
                      </button>
                    )}
                    <button type="button" className="mng__studydel" disabled={!canEdit}
                      onClick={() => { dispatch({ type: 'study-delete', id: s.id, who }); toast('已永久删除。', 'info') }}>
                      <Icon name="trash" size={13} />永久删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * 外观
 * ------------------------------------------------------------------ */

function LookTab(): JSX.Element {
  const { state, dispatch, who } = usePrism()
  const a = state.appearance
  const c = state.copy

  return (
    <div className="mng__panel">
      <p className="mng__panelnote">
        这些设置对公众站和控制端同时生效，读者也能自己在网站右上角调。
      </p>

      <div className="mng__look">
        <div className="mng__lookgroup">
          <p className="mng__looklabel">字号</p>
          <div className="mng__lookchips">
            {FONT_STEPS.map((f) => (
              <button key={f.value} type="button"
                className={cx('mng__lookchip', a.fontScale === f.value && 'mng__lookchip--on')}
                aria-pressed={a.fontScale === f.value}
                onClick={() => dispatch({ type: 'appearance', patch: { fontScale: f.value }, who })}>
                {f.zh}
              </button>
            ))}
          </div>
        </div>

        <div className="mng__lookgroup">
          <p className="mng__looklabel">主题</p>
          <div className="mng__lookchips">
            {THEMES.map((t) => (
              <button key={t.key} type="button" title={t.note}
                className={cx('mng__lookchip', a.theme === t.key && 'mng__lookchip--on')}
                aria-pressed={a.theme === t.key}
                onClick={() => dispatch({ type: 'appearance', patch: { theme: t.key }, who })}>
                {t.zh}
              </button>
            ))}
          </div>
        </div>

        <div className="mng__lookgroup">
          <p className="mng__looklabel">强调色</p>
          <div className="mng__lookchips">
            {ACCENTS.map((x) => (
              <button key={x.key} type="button" aria-label={x.zh} title={x.zh}
                className={cx('mng__swatch', a.accent === x.key && 'mng__swatch--on')}
                aria-pressed={a.accent === x.key}
                onClick={() => dispatch({ type: 'appearance', patch: { accent: x.key }, who })}>
                <span style={{ background: x.swatch }} />
              </button>
            ))}
          </div>
        </div>

        <div className="mng__lookgroup">
          <p className="mng__looklabel">正文字体与行距</p>
          <div className="mng__lookchips">
            <button type="button" className={cx('mng__lookchip', a.bodyFont === 'sans' && 'mng__lookchip--on')}
              onClick={() => dispatch({ type: 'appearance', patch: { bodyFont: 'sans' }, who })}>黑体</button>
            <button type="button" className={cx('mng__lookchip', a.bodyFont === 'serif' && 'mng__lookchip--on')}
              onClick={() => dispatch({ type: 'appearance', patch: { bodyFont: 'serif' }, who })}>宋体</button>
            <button type="button" className={cx('mng__lookchip', a.roomy && 'mng__lookchip--on')}
              onClick={() => dispatch({ type: 'appearance', patch: { roomy: !a.roomy }, who })}>宽行距</button>
          </div>
        </div>
      </div>

      <h3 className="mng__subtitle">网站上写的字</h3>
      <div className="mng__copy">
        <label className="mng__copylabel" htmlFor="cp-title">网站名称</label>
        <TextInput id="cp-title" value={c.title}
          onChange={(e) => dispatch({ type: 'copy', patch: { title: e.currentTarget.value }, who })} />

        <label className="mng__copylabel" htmlFor="cp-tag">一句话副标题</label>
        <TextInput id="cp-tag" value={c.tagline}
          onChange={(e) => dispatch({ type: 'copy', patch: { tagline: e.currentTarget.value }, who })} />

        <label className="mng__copylabel" htmlFor="cp-intro">首页介绍</label>
        <TextArea id="cp-intro" rows={3} value={c.intro}
          onChange={(e) => dispatch({ type: 'copy', patch: { intro: e.currentTarget.value }, who })} />

        <label className="mng__copylabel" htmlFor="cp-about">「关于」页正文</label>
        <TextArea id="cp-about" rows={4} value={c.aboutBody}
          onChange={(e) => dispatch({ type: 'copy', patch: { aboutBody: e.currentTarget.value }, who })} />

        <label className="mng__copylabel" htmlFor="cp-foot">页脚一行字</label>
        <TextInput id="cp-foot" value={c.footerNote}
          onChange={(e) => dispatch({ type: 'copy', patch: { footerNote: e.currentTarget.value }, who })} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * 账号与同步
 * ------------------------------------------------------------------ */

function AccountTab(): JSX.Element {
  const { state, dispatch, who, isOwner, canEdit } = usePrism()
  const [newAdmin, setNewAdmin] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const btnRef = useRef<HTMLDivElement | null>(null)
  const auth = state.auth
  const gh = state.github

  useEffect(() => {
    if (auth.email || !auth.clientId || !btnRef.current) return
    renderGoogleButton({
      clientId: auth.clientId,
      target: btnRef.current,
      onSignIn: (p) => {
        dispatch({ type: 'signin', email: p.email, name: p.name, picture: p.picture })
        toast(`已登录：${p.email}`, 'go')
      },
      onError: (m) => toast(m, 'warn'),
    })
  }, [auth.clientId, auth.email, dispatch])

  async function doSync() {
    setSyncing(true)
    const res = await syncToGitHub(state, `站长更新内容 · ${new Date().toISOString().slice(0, 16)}`)
    setSyncing(false)
    dispatch({ type: 'github', patch: { lastSyncedAt: new Date().toISOString(), lastResult: res.message } })
    toast(res.message, res.ok ? 'go' : 'warn')
  }

  return (
    <div className="mng__panel">
      <h3 className="mng__subtitle">登录</h3>
      {auth.email ? (
        <div className="mng__signed">
          <div>
            <p className="mng__signedname">{auth.name ?? auth.email}</p>
            <p className="mng__signedmail">{auth.email}</p>
          </div>
          <button type="button" className="mng__ghost" onClick={() => { googleSignOut(); dispatch({ type: 'signout' }); toast('已退出登录。', 'info') }}>
            退出登录
          </button>
        </div>
      ) : (
        <div className="mng__signin">
          {auth.clientId ? (
            <div ref={btnRef} />
          ) : (
            <p className="mng__note">先在下面填 Google 客户端 ID，登录按钮才会出现。</p>
          )}
        </div>
      )}

      <details className="mng__setup">
        <summary>怎么拿到 Google 客户端 ID（第一次要做一遍，约十分钟）</summary>
        <p className="mng__stepnote">
          做之前先确定你网站的正式网址（比如 GitHub Pages 给你的那个），
          下面第 5 步要用到它，而且必须一字不差。
        </p>
        <ol className="mng__steps">
          <li>
            打开 <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">Google Cloud Console</a>，
            顶部点项目下拉框 → <strong>新建项目</strong>，名字随便取，创建。
          </li>
          <li>
            左边菜单找「<strong>Google 身份验证平台</strong>」（英文 Google Auth Platform，
            有些账号里还叫「API 和服务 → OAuth 同意屏幕」）。
            <span className="mng__stepwhy">
              下面三步是这个平台里的三个页面：品牌塑造 → 受众群体 → 客户端。
              顺序不能反——没填完前两页就去建客户端，Google 会拦住你，
              提示「OAuth 配置不完整，请前往品牌塑造页」。
            </span>
          </li>
          <li>
            进「<strong>品牌塑造</strong>」（Branding）页，填三样必填的：
            <strong>应用名称</strong>、<strong>用户支持电子邮件</strong>（下拉里选你自己）、
            <strong>开发者联系信息</strong>（你的邮箱）。保存。
            <span className="mng__stepwhy">
              应用徽标、应用主页、隐私权政策、服务条款这几栏<strong>留空</strong>就好。
              一旦填了网址，Google 就会要求你再去填「已获授权的网域」并验证域名所有权，
              平白多出两道手续——登录本身用不到它们。
              另外应用名称里不能出现「Google」字样，会被拒。
            </span>
          </li>
          <li>
            进「<strong>受众群体</strong>」（Audience）页：用户类型选<strong>外部</strong>，
            然后把发布状态改成 <strong>发布应用</strong>（Publish app）。
            <span className="mng__stepwhy">
              不做这一步，就只有你手动加进「测试用户」名单的账号能登录，别人一律登不进来。
              这里只用到姓名、邮箱、头像这类基本信息，属于非敏感权限，发布是立刻生效的，
              不需要 Google 审核。
            </span>
          </li>
          <li>
            进「<strong>客户端</strong>」（Clients）页 → <strong>创建客户端</strong>，
            应用类型选 <strong>Web 应用</strong>。
            在「已获授权的 JavaScript 来源」里填你网站的网址，
            <strong>只填到域名为止</strong>：像 <code>https://你的用户名.github.io</code>，
            不要带后面的路径，也不要结尾的斜杠。「已获授权的重定向 URI」可以留空。
            <span className="mng__stepwhy">
              填错了登录会报 <code>origin_mismatch</code>。
              想在自己电脑上试，可以再加一条 <code>http://localhost:5173</code>。
            </span>
          </li>
          <li>
            建好后弹出两串东西：<strong>客户端 ID</strong>（以
            <code>.apps.googleusercontent.com</code> 结尾）复制到下面。
            旁边的<strong>客户端密钥</strong>用不上，也不要填到网站里任何地方。
          </li>
        </ol>
        <p className="mng__stepnote">
          填好之后，公众站右上角就会出现 Google 登录按钮，控制端也会从「对所有人开着」
          变成只有你和管理员进得来。
        </p>
        <TextInput
          placeholder="粘贴 Google 客户端 ID"
          value={auth.clientId}
          onChange={(e) => dispatch({ type: 'client-id', clientId: e.currentTarget.value })}
        />
      </details>

      <div className="mng__caution">
        <Icon name="alert" size={15} />
        <p>
          <strong>一句实话：</strong>这是一个纯静态网站，登录只能挡住界面，挡不住真正懂技术的人。
          要做到别人完全打不开控制端，需要一台服务器在后台校验身份。
          在那之前，请把这里当成「防止误操作」，而不是「防止入侵」。
        </p>
      </div>

      <h3 className="mng__subtitle">谁能编辑这个网站</h3>
      <ul className="mng__admins">
        {auth.admins.map((a) => (
          <li key={a.email} className="mng__admin">
            <span className={cx('mng__adminrole', a.role === 'owner' && 'mng__adminrole--owner')}>
              {a.role === 'owner' ? '站长' : '管理员'}
            </span>
            <span className="mng__adminmail">{a.email}</span>
            {a.role !== 'owner' && isOwner && (
              <button type="button" className="mng__adminx" aria-label={`移除 ${a.email}`}
                onClick={() => { dispatch({ type: 'admin-remove', email: a.email, who }); toast('已移除。', 'info') }}>
                <Icon name="x" size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {isOwner ? (
        <div className="mng__addadmin">
          <TextInput placeholder="要加的 Gmail 地址" value={newAdmin}
            onChange={(e) => setNewAdmin(e.currentTarget.value)} />
          <button type="button" className="mng__solid"
            onClick={() => {
              if (!newAdmin.includes('@')) { toast('填一个完整的邮箱地址。', 'warn'); return }
              dispatch({ type: 'admin-add', email: newAdmin, who })
              setNewAdmin(''); toast('已加为管理员。', 'go')
            }}>
            <Icon name="plus" size={14} />加为管理员
          </button>
        </div>
      ) : (
        <p className="mng__note">只有站长（{OWNER_EMAIL}）可以增删管理员。</p>
      )}

      <h3 className="mng__subtitle">同步到 GitHub</h3>
      <p className="mng__note">
        把当前所有内容存回你的仓库。存的是一个内容文件，不是代码，所以同步不会弄坏网站。
        没填 token 也没关系——可以直接下载文件自己上传。
      </p>

      <div className="mng__gh">
        <label className="mng__copylabel" htmlFor="gh-token">
          GitHub token
          <span className="mng__labelhint">只需勾 Contents 的写权限。只存在这台电脑上。</span>
        </label>
        <div className="mng__tokenrow">
          <TextInput
            id="gh-token"
            type={showToken ? 'text' : 'password'}
            placeholder="ghp_… 或 github_pat_…"
            value={gh.token}
            onChange={(e) => dispatch({ type: 'github', patch: { token: e.currentTarget.value } })}
          />
          <button type="button" className="mng__ghost" onClick={() => setShowToken((v) => !v)}>
            {showToken ? '隐藏' : '显示'}
          </button>
        </div>

        <div className="mng__ghgrid">
          <div>
            <label className="mng__copylabel" htmlFor="gh-owner">用户名</label>
            <TextInput id="gh-owner" value={gh.owner}
              onChange={(e) => dispatch({ type: 'github', patch: { owner: e.currentTarget.value } })} />
          </div>
          <div>
            <label className="mng__copylabel" htmlFor="gh-repo">仓库</label>
            <TextInput id="gh-repo" value={gh.repo}
              onChange={(e) => dispatch({ type: 'github', patch: { repo: e.currentTarget.value } })} />
          </div>
          <div>
            <label className="mng__copylabel" htmlFor="gh-branch">分支</label>
            <TextInput id="gh-branch" value={gh.branch}
              onChange={(e) => dispatch({ type: 'github', patch: { branch: e.currentTarget.value } })} />
          </div>
        </div>

        <div className="mng__ghrow">
          <button type="button" className="mng__solid" onClick={doSync} disabled={syncing || !canEdit}>
            <Icon name="send" size={14} />{syncing ? '同步中…' : '同步到 GitHub'}
          </button>
          <button type="button" className="mng__ghost" onClick={() => { void downloadSnapshot(state).then((r) => toast(r.message, r.ok ? 'go' : 'info')) }}>
            <Icon name="download" size={14} />下载文件
          </button>
        </div>
        {gh.lastSyncedAt && (
          <p className="mng__note">上次同步：{fmtDateTime(gh.lastSyncedAt)} · {gh.lastResult}</p>
        )}
      </div>
    </div>
  )
}

function ResetRow({ onReset, disabled }: { onReset: () => void; disabled: boolean }): JSX.Element {
  const [open, setOpen] = useState(false)
  const [sure, setSure] = useState(false)
  return (
    <div className="mng__dangerrow">
      <div>
        <p className="mng__dangername">全部恢复成初始演示内容</p>
        <p className="mng__dangernote">你搜集的、编辑过的、删掉的，全都会没有。这个操作撤不回来。</p>
      </div>
      <button type="button" className="mng__dangerbtn" onClick={() => { setSure(false); setOpen(true) }} disabled={disabled}>
        恢复初始
      </button>
      <Modal
        open={open} onClose={() => setOpen(false)}
        title="全部恢复成初始内容？" subtitle="撤不回来" tone="danger"
        footer={
          <>
            <button type="button" className="mng__ghost" onClick={() => setOpen(false)}>算了</button>
            <button type="button" className="mng__solid" disabled={!sure}
              onClick={() => { onReset(); setOpen(false); toast('已恢复成初始内容。', 'info') }}>
              确认恢复
            </button>
          </>
        }
      >
        <p className="mng__note">建议先用上面的「下载文件」备份一份，再做这个操作。</p>
        <Checkbox checked={sure} onChange={setSure} label="我明白这会清空我做过的所有编辑" />
      </Modal>
    </div>
  )
}
