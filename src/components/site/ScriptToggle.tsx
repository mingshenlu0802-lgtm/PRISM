import { useZh } from '../../lib/zh'
import './ScriptToggle.css'

/**
 * 简 / 繁。
 *
 * 站长要「一键繁简转换」，所以是一个开关，不是一个藏在菜单里的设置项。
 *
 * `data-nozh` 是必须的：转换器会走过页面上每一个文字节点，不排除自己的话，
 * 按下「繁」之后这个按钮上的「简」会变成「簡」——一个按钮在自己按下之后
 * 改掉自己的名字，读者会以为点错了。
 */
export function ScriptToggle(): JSX.Element {
  const { script, setScript, busy } = useZh()
  return (
    <div className="sct" role="group" aria-label="字体：简体或繁体" data-nozh>
      <button
        type="button"
        className={script === 'hans' ? 'sct__btn sct__btn--on' : 'sct__btn'}
        aria-pressed={script === 'hans'}
        aria-label="改用简体"
        onClick={() => setScript('hans')}
      >简</button>
      <button
        type="button"
        className={script === 'hant' ? 'sct__btn sct__btn--on' : 'sct__btn'}
        aria-pressed={script === 'hant'}
        aria-label="改用繁體"
        onClick={() => setScript('hant')}
      >{busy ? '…' : '繁'}</button>
    </div>
  )
}
