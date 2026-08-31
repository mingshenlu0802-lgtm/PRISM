import { Link } from 'react-router-dom'

import { DEMO_NOTICE, DEMO_NOTICE_EN, TOPICS, VERDICTS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { Badge, DemoTag, Icon, PrismMark } from '../../components/common'
import './AboutPage.css'

/**
 * 关于 PRISM — what this is, what it refuses to do, and an unmissable
 * statement that none of it is real reporting.
 *
 * The demo disclosure is placed first and given the most visual weight on the
 * page, because a convincing-looking newsroom that quietly contains invented
 * citations would be the single most harmful thing this prototype could be.
 */

const PRINCIPLES: { k: string; t: string }[] = [
  { k: 'AI 负责搜集、整理、资源检索与生成草稿', t: '自动编辑台每天跨辖区、跨语种搜集材料，合并重复报道，检索每条引用指向的材料，并起草稿件。' },
  { k: '人拥有最终编辑权与发布权', t: '编辑台没有发布权限。未经主编明确批准，所有内容只能停留在草稿状态——这不是流程约定，是系统约束。' },
  { k: '所有重要陈述必须有真实 reference', t: '每一处承载事实的句子都带行内引用，回溯到具体的一手材料。取不到的材料写「无法取得」，不用相近材料替代。' },
  { k: '明确区分事实、推断、指控、观点与司法结论', t: '文章的九章结构本身就是这个区分的载体；时间线用三种形状标注每个节点的证据地位。' },
  { k: '不制造虚假平衡，也不因立场契合而降低标准', t: '证据一边倒时就说一边倒。符合本站价值立场的说法，若证据薄弱，同样标注为薄弱。' },
  { k: '尊重受害者、当地语境与边缘群体', t: '性暴力内容采用创伤知情、以幸存者为中心的写法；隐私优先于完整性；本地来源优先于远距离转述。' },
  { k: '承认不确定性，并公开保存更正记录', t: '「尚未确定的信息」是每篇文章的必需章节，不是免责声明。更正、澄清、更新与撤回永久公开。' },
  { k: '随时可以停止全部公开发布', t: 'Global Publishing Lock 让主编一处开关即可暂停全站发布，包括已排程内容。' },
]

const NOT_DOING: { k: string; t: string }[] = [
  { k: '不自动发布', t: '系统在任何情况下都不会自行公开内容，也没有「自动通过」的阈值。' },
  { k: '不生成新闻现场或当事人形象', t: 'AI 图像一律是抽象几何构图，标注为「概念插图 · AI 生成 · 非新闻现场」。' },
  { k: '不虚构数据', t: '数据图表必须绑定具体数据集，并同时说明该图无法说明什么。' },
  { k: '不做「客观中立」的表演', t: '编辑判断存在，而且会被标注出来——它出现在正文里时，句子会自我标注。' },
  { k: '不用传播量决定选题', t: '传播量高但没有可核查事实主张、也没有制度后果的争议，本站不报道。' },
]

export default function AboutPage() {
  const { state } = usePrism()
  const live = sel.publicArticles(state)
  const countries = new Set(state.sources.map((s) => s.country))
  const languages = new Set(state.sources.map((s) => s.language))
  const primary = state.sources.filter((s) => s.tier === 'primary').length

  return (
    <main className="aboutpg u-shell">
      <header className="aboutpg__head">
        <PrismMark size={56} className="aboutpg__mark" />
        <p className="u-eyebrow">关于 · About PRISM</p>
        <h1 className="aboutpg__title">PRISM 棱镜</h1>
        <p className="aboutpg__lede">
          一个每日更新的全球女性主义与 LGBTQIA+ 深度媒体、研究与事实核查平台。
          每一条目都是一篇独立的深度报道，而不是新闻摘要：事件与核心事实、法律与历史背景、
          权力结构与交叉性分析、相关研究、来源之间的分歧、逐条事实核查、尚未确定的信息，
          以及完整可点击的 references。
        </p>
        <hr className="prism-rule aboutpg__rule" />
      </header>

      {/* The disclosure comes first and loudest. */}
      <section className="aboutpg__demo" aria-labelledby="about-demo">
        <div className="aboutpg__demo-icon" aria-hidden="true"><Icon name="alert" size={22} /></div>
        <div className="aboutpg__demo-body">
          <h2 id="about-demo" className="aboutpg__demo-h">这是一个原型，不是一家真实的新闻机构</h2>
          <p className="aboutpg__demo-zh">{DEMO_NOTICE}</p>
          <p className="aboutpg__demo-en">{DEMO_NOTICE_EN}</p>
          <ul className="aboutpg__demo-list">
            <li>
              本站出现的<strong>全部司法辖区、法院、议会、统计机构、期刊、通讯社、民间组织与平台都不存在</strong>，
              它们是为演示而虚构的。任何与真实实体的相似都不是指涉。
            </li>
            <li>
              <strong>每一条来源链接都位于 <code className="u-mono">demo.prism.invalid</code></strong>——
              这是 RFC 2606 保留的域名，永远无法解析。界面上它以「示例链接（不可访问）」呈现，且不会跳转。
            </li>
            <li>
              本站不含任何 DOI、案号或真实文件编号，也不引用任何真实人物的言论。
            </li>
            <li>
              这里的目的不是模拟新闻，而是演示<strong>一套编辑标准如何被写进产品的行为里</strong>：
              发布闸门、二次确认、版本留痕、发布锁。
            </li>
          </ul>
        </div>
      </section>

      <section className="aboutpg__stats" aria-label="演示数据规模">
        {[
          { n: live.length, k: '公开条目' },
          { n: state.sources.length, k: '来源记录' },
          { n: primary, k: '一手材料' },
          { n: countries.size, k: '虚构辖区' },
          { n: languages.size, k: '语种' },
          { n: state.factChecks.length, k: '事实核查' },
        ].map((s) => (
          <div key={s.k} className="aboutpg__stat">
            <span className="aboutpg__stat-n u-num">{s.n}</span>
            <span className="aboutpg__stat-k">{s.k}</span>
          </div>
        ))}
      </section>

      <section className="aboutpg__section" aria-labelledby="about-topics">
        <h2 id="about-topics" className="aboutpg__h2">我们覆盖什么</h2>
        <ul className="aboutpg__topics">
          {TOPICS.map((t) => (
            <li key={t.key} className="aboutpg__topic">
              <span className="aboutpg__topic-bar" style={{ background: t.hue }} aria-hidden="true" />
              <Link className="aboutpg__topic-k" to={`/topic/${t.key}`}>{t.zh}</Link>
              <span className="aboutpg__topic-en u-mono">{t.en}</span>
              <span className="aboutpg__topic-t">{t.blurb}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="aboutpg__section" aria-labelledby="about-principles">
        <h2 id="about-principles" className="aboutpg__h2">核心原则</h2>
        <ol className="aboutpg__principles">
          {PRINCIPLES.map((p, i) => (
            <li key={p.k} className="aboutpg__principle">
              <span className="aboutpg__principle-n u-mono">{String(i + 1).padStart(2, '0')}</span>
              <div className="aboutpg__principle-body">
                <p className="aboutpg__principle-k">{p.k}</p>
                <p className="aboutpg__principle-t">{p.t}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="aboutpg__section" aria-labelledby="about-ladder">
        <h2 id="about-ladder" className="aboutpg__h2">事实核查的八级结论</h2>
        <p className="aboutpg__p">
          我们不用「真／假」两分法。每一级都对应一个明确的证据门槛，写在
          <Link to="/method">方法与标准</Link>里。其中最容易被误读的一级是
          「缺乏足够证据」——它不等于「基本不实」。
        </p>
        <ul className="aboutpg__ladder">
          {VERDICTS.map((v) => (
            <li key={v.key} className="aboutpg__rung">
              <span className="aboutpg__rung-k">{v.zh}</span>
              <span className="aboutpg__rung-en u-mono">{v.en}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="aboutpg__section" aria-labelledby="about-not">
        <h2 id="about-not" className="aboutpg__h2">这个原型不做什么</h2>
        <ul className="aboutpg__not">
          {NOT_DOING.map((n) => (
            <li key={n.k} className="aboutpg__not-item">
              <span className="aboutpg__not-k"><Icon name="x" size={14} /> {n.k}</span>
              <span className="aboutpg__not-t">{n.t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="aboutpg__section" aria-labelledby="about-console">
        <h2 id="about-console" className="aboutpg__h2">编辑控制端</h2>
        <p className="aboutpg__p">
          审批、修改与发布都在 PRISM Command 完成——一个只供主编使用的控制端。
          它显示今日发现的重要事件、待审文章、高风险内容、资源未找到的引用、
          全球议题与来源分布，以及自动编辑台每晚运行的七个阶段。
          在这个原型里它是开放的，方便你查看整个审批流程如何运作。
        </p>
        <div className="aboutpg__console">
          <Link className="aboutpg__console-link" to="/command">
            <Icon name="grid" size={15} /> 进入 PRISM Command
          </Link>
          <Link className="aboutpg__console-link aboutpg__console-link--quiet" to="/method">
            <Icon name="book" size={15} /> 方法与标准
          </Link>
          <Link className="aboutpg__console-link aboutpg__console-link--quiet" to="/corrections">
            <Icon name="history" size={15} /> 更正记录
          </Link>
        </div>
        <p className="aboutpg__foot">
          <Badge tone="warn" size="sm">发布锁</Badge>
          {state.lock.engaged
            ? '当前全局发布锁已开启：全站公开发布处于暂停状态。'
            : '当前全局发布锁未开启。主编可随时开启它，一处开关即可暂停全站公开发布，包括已排程内容。'}
        </p>
        <p className="aboutpg__foot"><DemoTag /> {DEMO_NOTICE}</p>
      </section>
    </main>
  )
}
