import { Component, type ErrorInfo, type ReactNode } from 'react'
import './ErrorBoundary.css'

/**
 * 兜底：不管出什么错，都不给用户一个白屏。
 *
 * 白屏是最糟的失败方式——它什么都不说，站长既不知道发生了什么，
 * 也不知道下一步该做什么，只能猜。这里至少说清楚三件事：
 * 出错了、可以怎么自救、以及那段错误信息是什么（好让他贴给我）。
 *
 * 「断开后端」那个按钮很重要：绝大多数把整个页面弄崩的原因，
 * 都跟连数据库有关。留一个不需要任何知识就能按的退路，
 * 比任何解释都管用。
 */
interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 留在控制台里，方便真要查的时候有堆栈可看。
    console.error('PRISM 崩了：', error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="eb">
        <main className="eb__box">
          <h1 className="eb__title">页面出错了</h1>
          <p className="eb__lede">
            不是你的操作有问题，是这个网站崩了。你的内容没有丢。
          </p>

          <div className="eb__acts">
            <button type="button" className="eb__solid" onClick={() => window.location.reload()}>
              重新加载
            </button>
            <button
              type="button"
              className="eb__ghost"
              onClick={() => {
                try { window.localStorage.removeItem('prism.backend.v1') } catch { /* 忽略 */ }
                window.location.reload()
              }}
            >
              断开后端再试
            </button>
          </div>

          <p className="eb__note">
            大多数情况是连数据库出了问题。按「断开后端再试」会回到只用本机的状态，
            网站马上就能用；数据库里的东西一条都不会动，配置重新填一次就能连回去。
          </p>

          <details className="eb__detail">
            <summary>出错信息（可以贴给 Claude）</summary>
            <pre className="eb__pre">{error.message}{'\n\n'}{error.stack}</pre>
          </details>
        </main>
      </div>
    )
  }
}
