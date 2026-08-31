import { useState } from 'react'
import { Icon, toast } from '../common'
import { inSandboxFrame } from '../../lib/backend'
import { readAddress } from '../../lib/address'
import './SiteAddress.css'

/**
 * 「你的网址」。
 *
 * 站长问过一句很要紧的话：「这个网址怎么有我的名字？」
 *
 * 那个名字不在代码里——代码里一个人的信息都没有，发布前还有一道检查在挡着。
 * 它来自 GitHub Pages 的网址规则：`账号名.github.io/仓库名/`。
 * 也就是说**改代码去不掉它**，只能换一个「这个仓库挂在谁名下」。
 *
 * 这件事必须摆在控制端里，不能只写在仓库的文档里——站长找不到仓库里的文件，
 * 他能找到的只有这个界面。所以这里直接读当前网址、把账号名挑出来给他看，
 * 并且把四步写清楚。做完之后可以收起来，不再占地方。
 *
 * 判断逻辑在 `lib/address.ts`，那里能脱离浏览器直接测。
 */

/** 「先不改，别再提醒我」记在这个网址上——换了网址就该重新问一次。 */
const DONE_KEY = 'prism.addr.ok.v1'

export function SiteAddress(): JSX.Element {
  const facts = readAddress(window.location.href, inSandboxFrame())
  const [done, setDone] = useState(() => {
    try { return window.localStorage.getItem(DONE_KEY) === facts.host } catch { return false }
  })
  const [open, setOpen] = useState(false)

  const copy = () => {
    void navigator.clipboard?.writeText(facts.full)
      .then(() => toast('网址已复制，可以直接发给朋友。', 'go'))
      .catch(() => toast('浏览器不让复制，请手动选中上面那一行。', 'warn'))
  }

  const settle = () => {
    try { window.localStorage.setItem(DONE_KEY, facts.host) } catch { /* 存不下也无所谓 */ }
    setDone(true)
  }

  return (
    <>
      <h3 className="mng__subtitle">你的网址</h3>

      <div className="addr__row">
        <code className="addr__url">
          {facts.kind === 'pages' && facts.personal ? (
            <>
              {'https://'}
              <mark className="addr__name">{facts.account}</mark>
              {`.github.io${facts.path}`}
            </>
          ) : facts.full}
        </code>
        <button type="button" className="mng__ghost addr__copy" onClick={copy}>
          <Icon name="link" size={14} />复制
        </button>
      </div>

      {facts.kind === 'sandbox' && (
        <p className="mng__note">
          <strong>这是预览窗口里的地址，不是你的正式网址。</strong>
          要看真实网址、也要真正连数据库，请在你自己的网站上打开控制端。
        </p>
      )}

      {facts.kind === 'local' && (
        <p className="mng__note">
          这是你自己电脑上的测试地址，别人打不开。发布之后才会有对外的网址。
        </p>
      )}

      {facts.kind === 'custom' && (
        <p className="mng__note addr__note--good">
          <Icon name="check" size={14} />
          这是你自己的域名，网址里没有任何账号名，也看不出是谁做的。已经是最干净的状态。
        </p>
      )}

      {facts.kind === 'pages' && !facts.personal && (
        <p className="mng__note addr__note--good">
          <Icon name="check" size={14} />
          网址前半截是 <code>{facts.account}</code>，看起来跟站点有关、跟个人无关。可以放心发出去。
        </p>
      )}

      {facts.kind === 'pages' && facts.personal && done && (
        <p className="mng__note">
          网址里还带着 <code>{facts.account}</code>。你说过这个不用管了。
          <button type="button" className="addr__link" onClick={() => { setDone(false); setOpen(true) }}>
            改主意了，再看一次做法
          </button>
        </p>
      )}

      {facts.kind === 'pages' && facts.personal && !done && (
        <div className="addr__warn">
          <p className="addr__lede">
            <Icon name="alert" size={15} />
            网址前半截的 <strong>{facts.account}</strong> 是你的 GitHub 账号名。
          </p>
          <p className="mng__note">
            GitHub 的网址格式写死了就是 <code>账号名.github.io/仓库名/</code>。
            <strong>这个名字不在代码里</strong>——代码里一个人的信息都没有，
            每次发布前都有检查在挡着。它来自「这个仓库挂在谁名下」，
            所以改代码去不掉，只能换一个「谁」。
          </p>
          <p className="mng__note">
            <strong>换掉它要十分钟，全程点鼠标，免费。</strong>
            换完网址会变成 <code>你起的名字.github.io/prism/</code>。
            <strong>越早做越好</strong>——换网址会让旧链接失效，
            等发给一圈朋友之后再换，就得挨个重发。
          </p>

          <button
            type="button"
            className="mng__ghost addr__toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} />
            {open ? '收起' : '四步换掉它'}
          </button>

          {open && (
            <ol className="addr__steps">
              <li>
                <strong>建一个免费组织。</strong>
                去 GitHub，点右上角<b>你的头像</b> → <b>Your organizations</b> →{' '}
                <b>New organization</b> → 选 <b>Free</b>。
                <br />
                <b>Organization name</b> 填一个跟你无关的名字（<code>prism-lens</code>、
                <code>prismdesk</code>、<code>prism-daily</code> 都行，被占了就换一个）；
                <b>Contact email</b> 填你的邮箱，<b>这一栏不公开</b>。
                最后那一步邀请成员，点 <b>Skip this step</b>。
              </li>
              <li>
                <strong>把仓库转过去。</strong>
                打开你的仓库 → 上方 <b>Settings</b> → 页面拉到<b>最底下</b>的红框{' '}
                <b>Danger Zone</b> → <b>Transfer ownership</b> 右边的 <b>Transfer</b>。
                <br />
                <b>New owner</b> 填刚建的组织名（<b>要点下拉提示选中它</b>，
                别只是打字），再按提示打一遍仓库名确认。
              </li>
              <li>
                <strong>重新打开自动发布</strong>（别漏这一步）。
                新仓库 → <b>Settings</b> → <b>Pages</b> → <b>Source</b> 选{' '}
                <b>GitHub Actions</b>。再去 <b>Actions</b> → <b>General</b>，
                确认选的是 <b>Allow all actions and reusable workflows</b>，
                <b>Save</b>。最后回仓库上方的 <b>Actions</b> 标签，
                点最近一次运行，右上角 <b>Re-run all jobs</b>。等一两分钟变绿。
              </li>
              <li>
                <strong>收尾两件小事。</strong>
                旧网址会失效（GitHub 只跳转仓库地址，不跳转网站地址），
                把新网址重新发一遍给朋友。
                如果你已经连了数据库，去 Supabase 的{' '}
                <b>Authentication</b> → <b>URL Configuration</b> →{' '}
                <b>Redirect URLs</b> 里把新网址加进去，否则邮箱登录会跳错地方。
              </li>
            </ol>
          )}

          {open && (
            <p className="mng__note addr__tail">
              <strong>网站本身一个字都不用改。</strong>
              它用的是相对路径，换到哪个网址都能跑；发布流程也没用到任何密钥。
              <br />
              想连 <code>github.io</code> 都去掉，就再买一个自己的域名（约 $10–15/年），
              做法写在仓库的 <code>docs/RENAME.md</code> 后半篇——
              也可以直接在旁边的 <b>Claude</b> 标签里问我。
            </p>
          )}

          <button type="button" className="addr__link addr__dismiss" onClick={settle}>
            我知道了，先不改，别再提醒我
          </button>
        </div>
      )}
    </>
  )
}
