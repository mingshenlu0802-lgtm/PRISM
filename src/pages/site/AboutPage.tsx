import { Link } from 'react-router-dom'
import { REGIONS } from '../../lib/regions'
import { TOPICS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { usePageTitle } from '../../lib/title'
import { PrismMark } from '../../components/common'
import './AboutPage.css'

export default function AboutPage(): JSX.Element {
  const { state } = usePrism()
  usePageTitle('关于')
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
          <li><span className="about__stepn">1</span><div><strong>一篇中文报道</strong>一千五到三千字。先说发生了什么，再交代人物是谁、手里有什么权力，然后是经过、制度在哪一环失效，以及接下来会发生什么。</div></li>
          <li><span className="about__stepn">2</span><div><strong>几个要点</strong>把最容易被忽略的细节单独列出来。</div></li>
          <li><span className="about__stepn">3</span><div><strong>媒体链接</strong>我们读过的来源列在下面，原始文件排在最前。你可以自己去核对。</div></li>
        </ol>
      </section>

      <section className="about__how" aria-labelledby="about-source">
        <h2 className="about__h2" id="about-when">什么时候更新</h2>
        <p className="about__note">
          每天两次，北京时间早上 6:00 和下午 2:00。
          早上那一场同时收三项公开研究与数据。
        </p>
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


      <p className="about__foot">{state.copy.footerNote}</p>
    </div>
  )
}
