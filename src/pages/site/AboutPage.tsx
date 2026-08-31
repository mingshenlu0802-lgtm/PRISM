import { Link } from 'react-router-dom'
import { REGIONS } from '../../lib/regions'
import { TOPICS, DEMO_NOTICE } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { Icon, PrismMark } from '../../components/common'
import './AboutPage.css'

export default function AboutPage(): JSX.Element {
  const { state } = usePrism()
  return (
    <div className="about u-shell">
      <header className="about__head">
        <PrismMark size={48} />
        <h1 className="about__title">{state.copy.title}</h1>
        <p className="about__lead">{state.copy.aboutLead}</p>
      </header>

      <p className="about__body">{state.copy.aboutBody}</p>

      <section className="about__how" aria-labelledby="about-how">
        <h2 className="about__h2" id="about-how">每条内容长什么样</h2>
        <ol className="about__steps">
          <li><span className="about__stepn">1</span><div><strong>一段总结</strong>两到四句，说明发生了什么。不写长评论。</div></li>
          <li><span className="about__stepn">2</span><div><strong>几个要点</strong>把最容易被忽略的细节单独列出来。</div></li>
          <li><span className="about__stepn">3</span><div><strong>媒体链接</strong>报道这件事的媒体列在下面，原始文件排在最前。你可以自己去读。</div></li>
        </ol>
      </section>

      <section className="about__how" aria-labelledby="about-source">
        <h2 className="about__h2" id="about-source">来源怎么选</h2>
        <p className="about__note">
          报道部分优先采用独立与境外媒体。判决书、法案、统计表这类原始文件照常收录，
          排在最前面，并标为「官方文件」。
        </p>
        <p className="about__note">
          在新闻不自由的地方，官方媒体是政府自己的说法，不是独立的第三方记述。
          这类来源不会被删掉——它说了什么本身就是信息——但会标成「官方媒体」，
          由你自己判断怎么读。
        </p>
      </section>

      <section className="about__grid" aria-labelledby="about-cover">
        <h2 className="about__h2" id="about-cover">覆盖范围</h2>
        <div className="about__tags">
          {REGIONS.map((r) => (
            <Link key={r.key} className="about__tag" to={`/region/${r.key}`}>
              <span className="about__dot" style={{ background: r.hue }} aria-hidden="true" />
              {r.zh}
            </Link>
          ))}
        </div>
        <div className="about__tags about__tags--topic">
          {TOPICS.map((t) => (
            <Link key={t.key} className="about__tag" to={`/topic/${t.key}`} title={t.blurb}>
              <span className="about__gem" style={{ background: t.hue }} aria-hidden="true" />
              {t.zh}
            </Link>
          ))}
        </div>
      </section>

      <section className="about__demo" aria-labelledby="about-demo">
        <h2 className="about__h2" id="about-demo"><Icon name="alert" size={16} /> 关于当前的演示数据</h2>
        <p className="about__body">{DEMO_NOTICE}</p>
        <p className="about__body">
          演示链接位于 <code>demo.prism.invalid</code>——这是一个保留域名，永远不会解析，
          所以它们在页面上显示为「示例」且不可点击。接入真实检索之后，链接会变成真实可点的外链。
        </p>
      </section>

      <p className="about__foot">{state.copy.footerNote}</p>
    </div>
  )
}
