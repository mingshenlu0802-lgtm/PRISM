import { useMemo, useState } from 'react'
import { usePrism } from '../../lib/store'
import { downloadSnapshot, syncToGitHub } from '../../lib/github'
import { signOut } from '../../lib/session'
import { ACCENTS, FONT_STEPS, THEMES } from '../../lib/constants'
import { byNewest, cx, fmtDateTime, relTime } from '../../lib/util'
import type { Role } from '../../lib/types'
import {
  Checkbox, EmptyState, Icon, Modal, Segmented, Select, TextArea, TextInput, toast,
} from '../../components/common'
import { NewsEditor } from '../../components/console/NewsEditor'
import { BackendSetup } from '../../components/console/BackendSetup'
import { SiteAddress } from '../../components/console/SiteAddress'
import { blankNews, blankStudy } from '../../lib/blank'
import './ManagePage.css'

type Tab = 'content' | 'look' | 'account'

const ROLE_LABEL: Record<Role, string> = { owner: '站长', editor: '编辑', member: '只能看' }

/**
 * 「编辑」——控制端第二页。
 *
 * 三个标签，从最常用到最少用排：内容 → 外观 → 账号与同步。
 * 每个危险操作都有二次确认，每一次编辑都记在下面的「最近编辑」里。
 *
 * 这里曾经有第四个标签，能用一句话让 Claude 改网站。站长把它去掉了——
 * 他改网站是直接跟 Claude 说，不需要网站里再有一个功能弱一截的复制品。
 * 少一个标签，也少一份把 API key 放进浏览器的理由。
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
        ariaLabel="编辑的三个部分"
        options={[
          { value: 'content', label: '内容', count: state.news.length + state.studies.length },
          { value: 'look', label: '外观' },
          { value: 'account', label: '账号与同步' },
        ]}
      />

      {tab === 'content' && <ContentTab />}
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
  /** 刚新建的那一条：卡片自己展开，站长不用再找它在哪。 */
  const [justMade, setJustMade] = useState<string | null>(null)

  /*
   * 自己写一条。
   *
   * 新建的条目一律先**下架**——一个只有「（未命名）」的空壳出现在首页上，
   * 比没有这条更糟。写好了按「重新上线」，那是站长的决定，不是默认行为。
   * 同时把筛选切到能看见它的那一档，否则按了按钮却什么都没出现。
   */
  function addBlank() {
    if (kind === 'news') {
      const item = blankNews()
      dispatch({ type: 'news-add', items: [item], who, manual: true })
      setJustMade(item.id)
      toast('新建了一条，已经打开等你写。写好之后按「重新上线」才会给读者看。', 'go')
    } else {
      const item = blankStudy()
      dispatch({ type: 'study-add', items: [item], who, manual: true })
      setJustMade(item.id)
      toast('新建了一项研究，先是下架状态。写好之后按「重新上线」。', 'go')
    }
    // 新条目是下架的，如果正停在「已上线」那一档就会看不见它。
    if (only === 'live') setOnly('all')
    setQ('')
  }

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

      <div className="mng__newrow">
        <button type="button" className="mng__solid mng__newbtn" onClick={addBlank} disabled={!canEdit}>
          <Icon name="plus" size={15} />自己写一{kind === 'news' ? '条新闻' : '项研究'}
        </button>
        <span className="mng__newnote">
          不用等搜集——自己想写的直接加。新建的先是<strong>下架</strong>状态，
          写好按「重新上线」才会出现在网站上。
        </span>
      </div>

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
          : <div className="mng__items">{news.map((n) => <NewsEditor key={n.id} item={n} openAtFirst={n.id === justMade} />)}</div>
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
  const { state, dispatch, who, isOwner, canEdit, mode } = usePrism()
  const [newAdmin, setNewAdmin] = useState('')

  const addPerson = (role: Role) => {
    const email = newAdmin.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast('填一个完整的邮箱地址。', 'warn'); return
    }
    dispatch({ type: 'admin-add', email, who })
    if (role !== 'editor') dispatch({ type: 'member-role', email, role, who })
    setNewAdmin('')
    toast(`已加 ${email}（${ROLE_LABEL[role]}）。把网站地址发给他就行。`, 'go')
  }
  const [syncing, setSyncing] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const auth = state.auth
  const gh = state.github

  async function doSync() {
    setSyncing(true)
    const res = await syncToGitHub(state, `站长更新内容 · ${new Date().toISOString().slice(0, 16)}`)
    setSyncing(false)
    dispatch({ type: 'github', patch: { lastSyncedAt: new Date().toISOString(), lastResult: res.message } })
    toast(res.message, res.ok ? 'go' : 'warn')
  }

  return (
    <div className="mng__panel">
      <SiteAddress />

      <h3 className="mng__subtitle">你现在的身份</h3>
      {mode === 'shared' && auth.email ? (
        <div className="mng__signed">
          <div>
            <p className="mng__signedname">{auth.name ?? auth.email}</p>
            <p className="mng__signedmail">
              {auth.email} · {isOwner ? '站长' : '编辑'}
            </p>
          </div>
          <button
            type="button"
            className="mng__ghost"
            onClick={() => {
              void signOut().then(() => {
                dispatch({ type: 'signout' })
                window.location.reload()
              })
            }}
          >
            退出登录
          </button>
        </div>
      ) : (
        <p className="mng__note">
          <strong>本地模式，不需要登录。</strong>
          内容只存在这台浏览器里，没有第二个人，所以也没有账号这回事。
          等你接上共享数据库（下面「让朋友也能看」），才会出现邮箱登录和成员名单。
        </p>
      )}

      <h3 className="mng__subtitle">谁能进这个网站</h3>
      <p className="mng__note">
        {mode === 'shared'
          ? '朋友输入邮箱、点一下收到的链接就能进来——不用设密码。默认只能看；你可以把某个人设成编辑，他就能改内容。'
          : '现在是本地模式，这份名单只在你这台电脑上有效。想让朋友真的能进来，先连上后端（下面「让朋友也能看」）。'}
      </p>

      <ul className="mng__admins">
        {auth.admins.length === 0 && (
          <li className="mng__adminempty">还没有人。用下面的输入框把朋友的邮箱加进来。</li>
        )}
        {auth.admins.map((a) => (
          <li key={a.email} className="mng__admin">
            <span className={cx('mng__adminrole', `mng__adminrole--${a.role}`)}>
              {ROLE_LABEL[a.role]}
            </span>
            <span className="mng__adminmail">{a.email}</span>

            {a.role !== 'owner' && isOwner && (
              <>
                <Select
                  aria-label={`${a.email} 的身份`}
                  value={a.role}
                  onChange={(e) => {
                    const role = e.currentTarget.value as Role
                    dispatch({ type: 'member-role', email: a.email, role, who })
                    toast(`已把 ${a.email} 设成${ROLE_LABEL[role]}。`, 'go')
                  }}
                >
                  <option value="member">只能看</option>
                  <option value="editor">编辑</option>
                </Select>
                <button type="button" className="mng__adminx" aria-label={`移除 ${a.email}`}
                  onClick={() => { dispatch({ type: 'admin-remove', email: a.email, who }); toast('已移除，他下次打开就进不来了。', 'info') }}>
                  <Icon name="x" size={14} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {isOwner ? (
        <>
          <div className="mng__addadmin">
            <TextInput placeholder="朋友的邮箱地址" value={newAdmin}
              onChange={(e) => setNewAdmin(e.currentTarget.value)} />
            <button type="button" className="mng__ghost"
              onClick={() => addPerson('member')}>
              <Icon name="plus" size={14} />加为「只能看」
            </button>
            <button type="button" className="mng__solid"
              onClick={() => addPerson('editor')}>
              <Icon name="plus" size={14} />加为编辑
            </button>
          </div>
          <p className="mng__note">
            加进来之后，把网站地址发给他就行。他第一次打开会看到一个输入邮箱的页面，
            输入这个地址、点收到的链接，就进来了。
          </p>
        </>
      ) : (
        <p className="mng__note">只有站长可以增删成员。</p>
      )}

      <BackendSetup />

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
