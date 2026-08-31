import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { MouseEvent } from 'react'

import type { SectionKind, VerdictKey } from '../../lib/types'
import { SECTION_LABEL, SECTION_ORDER, VERDICTS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import * as sel from '../../lib/selectors'
import { cx, fmtDate, fmtDateTime, isPrimarySource } from '../../lib/util'
import { Badge, DemoTag, Icon, SourceCard, VerdictBadge } from '../../components/common'
import { ChartRenderer } from '../../components/charts'
import { ConceptImage } from '../../components/visual/ConceptImage'

import './MethodPage.css'

/**
 * 方法与标准 — the public statement of how this newsroom decides things.
 *
 * This is the page the rest of the product is accountable to, so it is written
 * as a document rather than a bullet list: numbered sections, a sticky table of
 * contents, and — wherever a rule can be shown instead of asserted — a live
 * example pulled straight from the store (a real source record, a real chart
 * with its confidence intervals drawn, the current state of the publishing
 * lock). If the rule and the product ever disagree, this page will show it.
 */

interface TocEntry { id: string; n: string; label: string }

const TOC: TocEntry[] = [
  { id: 'm-roles', n: '01', label: '权限分配' },
  { id: 'm-sources', n: '02', label: '来源政策' },
  { id: 'm-ladder', n: '03', label: '结论阶梯' },
  { id: 'm-distinctions', n: '04', label: '事实、指控、判断与判决' },
  { id: 'm-trauma', n: '05', label: '创伤知情与幸存者中心' },
  { id: 'm-balance', n: '06', label: '分歧与虚假平衡' },
  { id: 'm-visuals', n: '07', label: '图像与数据可视化' },
  { id: 'm-corrections', n: '08', label: '更正、更新与撤回' },
  { id: 'm-vibe', n: '09', label: '自然语言编辑的边界' },
  { id: 'm-lock', n: '10', label: '全局发布锁' },
  { id: 'm-uncertainty', n: '11', label: '不确定性' },
]

type RoleWho = 'desk' | 'desk-then-human' | 'human-only'

const ROLE_WHO_LABEL: Record<RoleWho, { zh: string; tone: 'neutral' | 'info' | 'go' }> = {
  desk: { zh: '自动编辑台', tone: 'neutral' },
  'desk-then-human': { zh: '自动起草 · 人复核', tone: 'info' },
  'human-only': { zh: '只有人', tone: 'go' },
}

const ROLE_ROWS: { step: string; who: RoleWho; note: string }[] = [
  { step: '多国家、多语言搜集', who: 'desk', note: '每日按议题、语言与辖区抓取公开材料并建立线索簇。' },
  { step: '重复报道合并与选题价值评估', who: 'desk', note: '合并同源报道，给出选题价值分与依据；人可随时推翻。' },
  { step: '多来源交叉核实', who: 'desk-then-human', note: '编辑台给出对照表，人判断哪些来源真正独立。' },
  { step: '深度文章草稿', who: 'desk', note: '按九个固定章节起草，草稿本身不构成发表。' },
  { step: '封面图、图表、社交素材', who: 'desk-then-human', note: '生成后逐张审批；未审批的封面图会直接阻断发布。' },
  { step: '事实、引用、偏见、隐私与法律风险检查', who: 'desk-then-human', note: '编辑台出清单，人作判断；清单不是结论。' },
  { step: '批准与公开发布', who: 'human-only', note: '编辑台没有发布权限，它能做的最后一步是移交等待审批。' },
]

const SOURCE_LADDER: { n: number; label: string; note: string }[] = [
  { n: 1, label: '原始研究', note: '同行评审、方法与数据公开，可被第三方复算。' },
  { n: 2, label: '法律文本与法院判决原文', note: '带条款编号与审级，可逐段回到原文核对。' },
  { n: 3, label: '政府与统计机构的原始数据发布', note: '须同时取得口径说明；口径变更单独标注。' },
  { n: 4, label: '国际机构的条约机构意见与调查报告', note: '注明是意见、观察还是转述缔约国报告。' },
  { n: 5, label: '可靠的当地媒体与当地民间组织报告', note: '常是唯一在场的记录者，但仍须回溯其依据的材料。' },
  { n: 6, label: '通讯社报道', note: '快，但多家转发同一条通稿只算一个来源。' },
  { n: 7, label: '公开声明', note: '证明「某方这样说」，不证明「事情如此」。' },
  { n: 8, label: '社交平台内容', note: '只作为「说法存在」的证据，绝不作为「说法成立」的证据。' },
]

const STANDING_LEGEND: {
  key: 'documented' | 'reported' | 'contested'
  zh: string
  en: string
  note: string
}[] = [
  { key: 'documented', zh: '已有一手记录', en: 'documented', note: '有可查的原始文件、判决、数据或研究支持。节点为实心。' },
  { key: 'reported', zh: '单一来源报道', en: 'reported', note: '目前只有一份报道记录，尚未取得一手材料。节点为空心。' },
  { key: 'contested', zh: '存在争议', en: 'contested', note: '质量相当的来源对同一节点给出不同说法。节点为对分。' },
]

const CORRECTION_KINDS: { key: string; zh: string; note: string }[] = [
  { key: 'correction', zh: '更正', note: '已发表内容中存在事实错误，逐处写明错在哪里、为什么错、由谁造成。' },
  { key: 'clarification', zh: '澄清', note: '事实无误但表述可能被误读，说明原表述与改后表述的区别。' },
  { key: 'update', zh: '更新', note: '出现新证据或新进展，正文更新并记录更新时间与内容。' },
  { key: 'retraction', zh: '撤回', note: '核心结论无法维持，保留原文可访问性说明与撤回理由，不删除历史。' },
]

/** In-page navigation without touching the HashRouter's own hash. */
function jump(id: string): void {
  if (typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (!el) return
  const reduce = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 96
  window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' })
  el.focus({ preventScroll: true })
}

function StandingGlyph({ kind }: { kind: 'documented' | 'reported' | 'contested' }): JSX.Element {
  return (
    <svg className="methodpg__glyph" width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {kind === 'documented' ? <circle cx="8" cy="8" r="5.6" fill="currentColor" /> : null}
      {kind === 'contested' ? <path d="M8 2.4A5.6 5.6 0 0 1 8 13.6Z" fill="currentColor" /> : null}
    </svg>
  )
}

export default function MethodPage(): JSX.Element {
  const { state } = usePrism()
  const [active, setActive] = useState<string>(TOC[0].id)

  /* Scroll-spy: the topmost section currently in the reading band wins. */
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') return undefined
    const ids = TOC.map((t) => t.id)
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el))
    if (els.length === 0) return undefined

    const visible = new Set<string>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const first = ids.find((id) => visible.has(id))
        if (first) setActive(first)
      },
      { rootMargin: '-100px 0px -62% 0px', threshold: 0 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const onTocClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    setActive(id)
    jump(id)
  }

  /* -------------------------------------------------------- live figures -- */
  const checks = useMemo(() => sel.publicFactChecks(state), [state])
  const verdictCounts = useMemo(() => {
    const counts = new Map<VerdictKey, number>()
    for (const check of checks) counts.set(check.verdict, (counts.get(check.verdict) ?? 0) + 1)
    return counts
  }, [checks])

  const sourceStats = useMemo(() => {
    const primary = state.sources.filter(isPrimarySource).length
    return {
      total: state.sources.length,
      primary,
      languages: new Set(state.sources.map((s) => s.language)).size,
      countries: new Set(state.sources.map((s) => s.country)).size,
      cautioned: state.sources.filter((s) => Boolean(s.caution)).length,
    }
  }, [state.sources])

  const correctionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const article of sel.publicArticles(state)) {
      for (const correction of article.corrections) {
        counts.set(correction.kind, (counts.get(correction.kind) ?? 0) + 1)
      }
    }
    return counts
  }, [state])

  const goodSource = state.sources.find((s) => s.id === 'src-veyra-court-ruling-2026') ?? state.sources[0]
  const weakSource = state.sources.find((s) => Boolean(s.caution))
  const ciChart = state.charts.find((c) => c.kind === 'range') ?? state.charts[0]
  const coverAsset = state.assets.find((a) => a.id === 'img-kalisan-cover')
    ?? state.assets.find((a) => a.kind === 'cover' && a.conceptual)

  const totalUpdateNeeded = sel.needsUpdate(state).length
  const lock = state.lock

  return (
    <div className="methodpg">
      {/* ------------------------------------------------------------ head -- */}
      <header className="methodpg__head u-shell">
        <p className="u-eyebrow">方法与标准 · Method &amp; standards</p>
        <h1 className="methodpg__title">我们怎么决定什么可以发表</h1>
        <p className="methodpg__lede">
          这份文件不是价值宣言，是一套可被检验的作业规则：谁做什么、证据要到什么程度才能写成陈述句、
          哪些做法在本站是被禁止的，以及当我们出错时会发生什么。它与仓库中的
          <span className="u-mono"> docs/EDITORIAL_POLICY.md </span>
          同源，每一条都对应产品里一个真实存在的关卡。
        </p>
        <div className="methodpg__head-meta">
          <span className="methodpg__head-item">
            <Icon name="calendar" size={14} />
            对应日期 <span className="u-num">{fmtDate(state.today)}</span>
          </span>
          <span className="methodpg__head-item">
            <Icon name="file" size={14} />
            共 {TOC.length} 节
          </span>
          <DemoTag />
        </div>
        <hr className="prism-rule methodpg__rule" />
      </header>

      <div className="methodpg__body u-shell">
        {/* ------------------------------------------------------------ toc -- */}
        <nav className="methodpg__toc" aria-label="本页目录">
          <p className="u-eyebrow methodpg__toc-title">目录</p>
          <ol className="methodpg__toc-list">
            {TOC.map((entry) => (
              <li key={entry.id}>
                <a
                  className={cx('methodpg__toc-link', active === entry.id && 'methodpg__toc-link--on')}
                  href={`#${entry.id}`}
                  aria-current={active === entry.id ? 'true' : undefined}
                  onClick={(event) => onTocClick(event, entry.id)}
                >
                  <span className="methodpg__toc-n u-mono">{entry.n}</span>
                  <span className="methodpg__toc-label">{entry.label}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="methodpg__toc-foot">
            <Link className="methodpg__toc-out" to="/fact-checks">
              事实核查索引
              <Icon name="arrow-right" size={13} />
            </Link>
            <Link className="methodpg__toc-out" to="/corrections">
              更正记录
              <Icon name="arrow-right" size={13} />
            </Link>
          </div>
        </nav>

        <article className="methodpg__doc">
          {/* ---------------------------------------------------- 01 roles -- */}
          <section className="methodpg__section" id="m-roles" tabIndex={-1} aria-labelledby="m-roles-h">
            <p className="methodpg__section-n u-mono">01</p>
            <h2 className="methodpg__h2" id="m-roles-h">权限分配</h2>
            <p className="methodpg__p">
              本站由一套自动编辑台与一位人类主编共同运作。这两者的边界不是效率问题，而是责任问题：
              一篇报道最终由谁负责，就必须由谁按下发布。下表是完整的分工，没有第三种情况。
            </p>

            <div className="methodpg__scroll">
              <table className="methodpg__table">
                <caption className="u-sr">编辑流程各环节的责任分配</caption>
                <thead>
                  <tr>
                    <th scope="col">环节</th>
                    <th scope="col">由谁完成</th>
                    <th scope="col">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {ROLE_ROWS.map((row) => (
                    <tr key={row.step} className={cx(row.who === 'human-only' && 'methodpg__tr--emph')}>
                      <th scope="row">{row.step}</th>
                      <td>
                        <Badge tone={ROLE_WHO_LABEL[row.who].tone}>
                          {ROLE_WHO_LABEL[row.who].zh}
                        </Badge>
                      </td>
                      <td className="methodpg__td-note">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="methodpg__statement">
              <p className="methodpg__statement-lead">自动编辑台没有发布权限。</p>
              <p className="methodpg__statement-body">
                它唯一能做的最后一步是「移交控制端等待审批」。未经主编明确批准，所有内容只能停留在草稿状态 ——
                这不是一条建议，而是产品里的一道硬关卡：发布动作只存在于人使用的控制台界面中，
                并且在按下之前必须逐项通过发布前校验。
              </p>
            </aside>
          </section>

          {/* -------------------------------------------------- 02 sources -- */}
          <section className="methodpg__section" id="m-sources" tabIndex={-1} aria-labelledby="m-sources-h">
            <p className="methodpg__section-n u-mono">02</p>
            <h2 className="methodpg__h2" id="m-sources-h">来源政策</h2>

            <h3 className="methodpg__h3">2.1　优先级</h3>
            <p className="methodpg__p">
              同一件事有多份材料时，本站按下面的顺序取用。位次靠后不等于不可用，
              但用低位次材料支撑一个高强度的陈述句，必须在正文里说明这一点。
            </p>
            <ol className="methodpg__ladder">
              {SOURCE_LADDER.map((item) => (
                <li className="methodpg__ladder-item" key={item.n}>
                  <span className="methodpg__ladder-n u-mono">{String(item.n).padStart(2, '0')}</span>
                  <span className="methodpg__ladder-body">
                    <span className="methodpg__ladder-label">{item.label}</span>
                    <span className="methodpg__ladder-note">{item.note}</span>
                  </span>
                </li>
              ))}
            </ol>

            <h3 className="methodpg__h3">2.2　硬性下限</h3>
            <div className="methodpg__floors">
              <div className="methodpg__floor">
                <span className="methodpg__floor-n u-num">2</span>
                <p className="methodpg__floor-t">份一手材料 / 每篇</p>
                <p className="methodpg__floor-n2">低于此数不进入发布流程，控制台会在发布前校验中直接给出警告。</p>
              </div>
              <div className="methodpg__floor">
                <span className="methodpg__floor-n u-num">2</span>
                <p className="methodpg__floor-t">个独立来源 / 每个关键事实</p>
                <p className="methodpg__floor-n2">
                  独立指的是<strong>不共享同一原始信源</strong>，而不只是不同署名。五家媒体转发同一份通稿只算一个来源。
                </p>
              </div>
              <div className="methodpg__floor">
                <span className="methodpg__floor-n" aria-hidden="true">→</span>
                <p className="methodpg__floor-t">一律回溯到原始文件</p>
                <p className="methodpg__floor-n2">
                  转载、聚合与二次引用都必须找到原件；找不到的，在正文中标注「未取得一手记录」，而不是悄悄使用转述。
                </p>
              </div>
            </div>

            <h3 className="methodpg__h3">2.3　可信度评分怎么来的</h3>
            <p className="methodpg__p">
              每份来源有一个 0–100 的可信度分数，它<strong>永远附带一句可读的依据</strong>，
              说明方法透明度、原始记录可及性、独立性、更正记录与接触一手材料的能力。
              分数不是黑箱，不用于自动过滤，也不用于给机构排名 —— 它只用来提示编辑与读者该在哪里多花一点注意力。
              本站来源库当前收录 <strong className="u-num">{sourceStats.total}</strong> 份材料，
              其中一手材料 <strong className="u-num">{sourceStats.primary}</strong> 份，
              覆盖 <strong className="u-num">{sourceStats.countries}</strong> 个（虚构）辖区、
              <strong className="u-num"> {sourceStats.languages}</strong> 种语言，
              另有 <strong className="u-num">{sourceStats.cautioned}</strong> 份被标注了使用限制。
            </p>

            <div className="methodpg__examples">
              <p className="methodpg__example-k">同一套标准下的两端 —— 下面两张卡片是来源库中的真实记录：</p>
              {goodSource ? <SourceCard source={goodSource} /> : null}
              {weakSource ? <SourceCard source={weakSource} /> : null}
              <p className="methodpg__caption">
                低分不代表禁止引用，而是限定用途：一则无法回溯的匿名帖文可以用来说明「某个说法正在流传」，
                永远不能用来支撑「事情确实如此」。这条限制写在来源记录本身上，编辑在引用时会看到它。
              </p>
            </div>

            <h3 className="methodpg__h3">2.4　不得虚构</h3>
            <p className="methodpg__p">
              不得编造来源、数据、引文、编号或任何人的言论。无法取得的材料写「无法取得」，
              不用相近材料替代，也不用一段听起来合理的概括填补空白。
              这条规则对自动编辑台与人同样适用，且没有例外情形。
            </p>
          </section>

          {/* --------------------------------------------------- 03 ladder -- */}
          <section className="methodpg__section" id="m-ladder" tabIndex={-1} aria-labelledby="m-ladder-h">
            <p className="methodpg__section-n u-mono">03</p>
            <h2 className="methodpg__h2" id="m-ladder-h">事实核查结论阶梯</h2>
            <p className="methodpg__p">
              本站不使用「真 / 假」两分法。八级结论各自对应一个明确的证据门槛 ——
              下表第二列写的就是编辑在选择该结论前必须先能出示的东西。
              每一级都有自己的形状标记，因此在灰度打印、屏幕阅读与色觉差异下都能被区分。
            </p>

            <div className="methodpg__scroll">
              <table className="methodpg__table methodpg__table--ladder">
                <caption className="u-sr">八级事实核查结论及其证据门槛</caption>
                <thead>
                  <tr>
                    <th scope="col">结论</th>
                    <th scope="col">需要满足</th>
                    <th scope="col">本站现有</th>
                  </tr>
                </thead>
                <tbody>
                  {VERDICTS.map((def) => (
                    <tr key={def.key}>
                      <th scope="row">
                        <Link className="methodpg__verdict-link" to={`/fact-checks?verdict=${def.key}`}>
                          <VerdictBadge verdict={def.key} size="sm" showEn />
                        </Link>
                      </th>
                      <td className="methodpg__td-note">{def.standard}</td>
                      <td className="methodpg__td-num u-num">{verdictCounts.get(def.key) ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="methodpg__callout methodpg__callout--accent">
              <p className="methodpg__callout-t">
                <Icon name="alert" size={15} />
                「缺乏足够证据」不等于「基本不实」
              </p>
              <p className="methodpg__callout-b">
                前者说的是「我们现在还不知道」，后者说的是「我们知道它与一手证据相悖」。
                把两者混为一谈，在报道边缘群体时代价尤其高：证据的缺席往往不是因为事情没有发生，
                而是因为记录它的机构从未记录、或不愿公开。同理，「无法核实」记录的是取证受阻，
                我们会写明是在哪一步、以什么方式被阻断。
              </p>
            </aside>

            <p className="methodpg__p">
              每条核查都必须回答同一个问题：<strong>什么样的新证据会改变这个结论？</strong>
              结论被修订时，旧结论与修订理由公开保留，不静默替换。完整的核查列表见
              <Link to="/fact-checks">事实核查索引</Link>。
            </p>
          </section>

          {/* --------------------------------------------- 04 distinctions -- */}
          <section className="methodpg__section" id="m-distinctions" tabIndex={-1} aria-labelledby="m-dist-h">
            <p className="methodpg__section-n u-mono">04</p>
            <h2 className="methodpg__h2" id="m-dist-h">区分事实、指控、编辑判断与司法结论</h2>
            <p className="methodpg__p">
              这四者混在一起，是这个领域里最常见也最有害的错误。本站用三重手段把它们分开：
              固定的章节结构、时间线上的证据地位标记，以及一套强制的用词规则。
            </p>

            <h3 className="methodpg__h3">4.1　九个固定章节</h3>
            <p className="methodpg__p">
              每篇条目都按同一顺序写。章节本身就是分类装置：读者只要知道自己在读第几节，
              就知道这段文字的证据地位是什么。
            </p>
            <div className="methodpg__scroll">
              <table className="methodpg__table">
                <caption className="u-sr">条目的九个固定章节及其写作限制</caption>
                <thead>
                  <tr>
                    <th scope="col">章节</th>
                    <th scope="col">English</th>
                    <th scope="col">这一节只放什么</th>
                  </tr>
                </thead>
                <tbody>
                  {SECTION_ORDER.map((kind: SectionKind, i) => (
                    <tr key={kind}>
                      <th scope="row">
                        <span className="methodpg__td-ord u-mono">{i + 1}</span>
                        {SECTION_LABEL[kind].zh}
                      </th>
                      <td className="methodpg__td-en">{SECTION_LABEL[kind].en}</td>
                      <td className="methodpg__td-note">{SECTION_LABEL[kind].note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="methodpg__h3">4.2　时间线上的三种证据地位</h3>
            <p className="methodpg__p">
              条目中的时间线不是叙事装饰。每个节点都标注它的证据地位，且用形状而非只用颜色区分：
            </p>
            <ul className="methodpg__standing">
              {STANDING_LEGEND.map((item) => (
                <li className={cx('methodpg__standing-item', `methodpg__standing-item--${item.key}`)} key={item.key}>
                  <StandingGlyph kind={item.key} />
                  <div>
                    <p className="methodpg__standing-t">
                      {item.zh}
                      <span className="methodpg__standing-en u-mono">{item.en}</span>
                    </p>
                    <p className="methodpg__standing-n">{item.note}</p>
                  </div>
                </li>
              ))}
            </ul>

            <h3 className="methodpg__h3">4.3　用词规则</h3>
            <div className="methodpg__words">
              <div className="methodpg__word">
                <p className="methodpg__word-k">指控</p>
                <p className="methodpg__word-b">
                  用于尚未经审理认定的主张，并注明<strong>由谁提出、向谁提出、何时提出</strong>。
                  「指控」不是对当事人可信度的评价，也不是暗示其不成立。
                </p>
              </div>
              <div className="methodpg__word">
                <p className="methodpg__word-k">认定 / 判决</p>
                <p className="methodpg__word-b">
                  只用于司法或行政机关<strong>已经作出的结论</strong>，并注明文号与审级。
                  一审结论不写成「法院认定」而写成「一审法院认定」。
                </p>
              </div>
              <div className="methodpg__word">
                <p className="methodpg__word-k">编辑判断</p>
                <p className="methodpg__word-b">
                  出现在正文时必须自我标注（「本站的判断是……」），不得混入事实陈述。
                  「事件为何重要」整节都是编辑分析，并在节首写明这一点。
                </p>
              </div>
              <div className="methodpg__word">
                <p className="methodpg__word-k">尚未确定</p>
                <p className="methodpg__word-b">
                  写明是哪一项不确定、为什么不确定、需要什么才能确定。
                  「目前尚不清楚」若不接着说明取证受阻在哪一步，等于没写。
                </p>
              </div>
            </div>
          </section>

          {/* --------------------------------------------------- 05 trauma -- */}
          <section className="methodpg__section" id="m-trauma" tabIndex={-1} aria-labelledby="m-trauma-h">
            <p className="methodpg__section-n u-mono">05</p>
            <h2 className="methodpg__h2" id="m-trauma-h">创伤知情与幸存者中心</h2>
            <p className="methodpg__p">
              涉及性暴力、家庭暴力与性骚扰的报道适用下列规则。它们不是文风偏好：
              细节的猎奇化会造成二次伤害，可拼合的信息会造成现实中的危险。
            </p>
            <ul className="methodpg__rules">
              <li><strong>不描写侵害过程</strong>，不使用可满足猎奇心的细节。</li>
              <li><strong>不描写着装、饮酒、行踪、感情史</strong>，除非该细节本身是司法争点且必须说明。</li>
              <li><strong>不使用无施害者的被动句。</strong>暴力必须有主语。</li>
              <li>不把暴力称为「纠纷」「情感纠葛」「家庭矛盾」。</li>
              <li>「声称／据称」不得只挂在当事人一侧，两侧陈述适用同一归因标准。</li>
              <li>幸存者的选择（是否报案、是否公开、是否和解）<strong>不作为可信度的依据</strong>。</li>
              <li><strong>隐私优先于完整性</strong>：地点、职业、亲属关系、就诊机构等可拼合识别的信息逐项检查。</li>
              <li>所有此类条目必须设置<strong>内容提示</strong>，写明具体涉及的内容类型，并置于正文之前。</li>
            </ul>

            <div className="methodpg__rewrite">
              <p className="methodpg__example-k">被动句改写示例</p>
              <div className="methodpg__rewrite-grid">
                <div className="methodpg__rewrite-cell methodpg__rewrite-cell--bad">
                  <p className="methodpg__rewrite-k">
                    <Icon name="x" size={13} />
                    不使用
                  </p>
                  <p className="methodpg__rewrite-t">「一名女性被侵害。」</p>
                  <p className="methodpg__rewrite-n">没有主语的句子把行为写成了天气，读者读完不知道是谁做的。</p>
                </div>
                <div className="methodpg__rewrite-cell methodpg__rewrite-cell--good">
                  <p className="methodpg__rewrite-k">
                    <Icon name="check" size={13} />
                    使用
                  </p>
                  <p className="methodpg__rewrite-t">「一名男子被指控侵害一名女性。」</p>
                  <p className="methodpg__rewrite-n">行为有主语，同时用「被指控」标明这尚未经审理认定。</p>
                </div>
              </div>
            </div>

            <aside className="methodpg__callout">
              <p className="methodpg__callout-t">
                <Icon name="lock" size={15} />
                发布前的二次确认
              </p>
              <p className="methodpg__callout-b">
                涉及未成年人、进行中的司法程序、性暴力内容或可能暴露身份的内容，发布前必须逐项勾选，
                并键入确认短语。这一步无法被跳过，也无法被自动完成 —— 它的存在就是为了强制一次人的停顿。
              </p>
            </aside>
          </section>

          {/* -------------------------------------------------- 06 balance -- */}
          <section className="methodpg__section" id="m-balance" tabIndex={-1} aria-labelledby="m-balance-h">
            <p className="methodpg__section-n u-mono">06</p>
            <h2 className="methodpg__h2" id="m-balance-h">分歧与虚假平衡</h2>
            <p className="methodpg__p">
              呈现分歧时，本站为每种立场标注证据强度并说明理由。分歧一节的作用不是并排放两段话，
              而是让读者看清两边各自拿得出什么。
            </p>
            <div className="methodpg__weights">
              <div className="methodpg__weight">
                <span className="methodpg__weight-bar methodpg__weight-bar--strong" aria-hidden="true" />
                <p className="methodpg__weight-t">强</p>
                <p className="methodpg__weight-n">有一手材料直接支持，且方法可核。</p>
              </div>
              <div className="methodpg__weight">
                <span className="methodpg__weight-bar methodpg__weight-bar--moderate" aria-hidden="true" />
                <p className="methodpg__weight-t">中</p>
                <p className="methodpg__weight-n">有材料支持但存在缺口，或只取到一侧记录。</p>
              </div>
              <div className="methodpg__weight">
                <span className="methodpg__weight-bar methodpg__weight-bar--weak" aria-hidden="true" />
                <p className="methodpg__weight-t">弱</p>
                <p className="methodpg__weight-n">只有转述、声明或无法回溯的材料。</p>
              </div>
            </div>

            <div className="methodpg__twoway">
              <div className="methodpg__twoway-cell">
                <p className="methodpg__twoway-k">不制造虚假平衡</p>
                <p className="methodpg__twoway-b">
                  证据一边倒时就说一边倒，并说明证据基础。为了显得中立而把一份扎实的一手研究
                  与一条无法回溯的说法并排放置，本身就是一种失实。
                </p>
              </div>
              <div className="methodpg__twoway-cell">
                <p className="methodpg__twoway-k">也不因立场契合而降低标准</p>
                <p className="methodpg__twoway-b">
                  符合本站价值立场的说法，若证据薄弱，同样标注为薄弱。
                  少数立场若有扎实一手证据支持，不因其少数而降级。这条规则往内约束，比往外更重要。
                </p>
              </div>
            </div>
          </section>

          {/* -------------------------------------------------- 07 visuals -- */}
          <section className="methodpg__section" id="m-visuals" tabIndex={-1} aria-labelledby="m-visuals-h">
            <p className="methodpg__section-n u-mono">07</p>
            <h2 className="methodpg__h2" id="m-visuals-h">图像与数据可视化</h2>

            <h3 className="methodpg__h3">7.1　绝不虚构新闻现场</h3>
            <p className="methodpg__p">
              本站<strong>绝不生成真实当事人或受害者的形象，也绝不虚构新闻现场</strong>。
              所有 AI 生成图一律标注为「概念插图 · AI 生成 · 非新闻现场」，且只使用抽象几何构图。
              每张图都带有一条留在记录上的护栏说明，写明它为什么不能画什么。
            </p>
            {coverAsset ? (
              <figure className="methodpg__figure">
                <ConceptImage asset={coverAsset} ratio="3-2" />
                <figcaption className="methodpg__figcaption">
                  <p className="methodpg__fig-label">{coverAsset.label}</p>
                  <p className="methodpg__fig-caption">{coverAsset.caption}</p>
                  <p className="methodpg__fig-guardrail">
                    <span className="methodpg__fig-k">护栏说明</span>
                    {coverAsset.guardrail}
                  </p>
                </figcaption>
              </figure>
            ) : null}

            <h3 className="methodpg__h3">7.2　图表规则</h3>
            <ul className="methodpg__rules">
              <li>每张图表必须来自具体数据集，图注同时给出<strong>数据来源</strong>与<strong>本图无法说明什么</strong>。</li>
              <li><strong>置信区间必须画出来</strong>；隐藏不确定性视为图表错误，而不是版面选择。</li>
              <li>统计口径变更处必须断线并标注，<strong>不得跨口径连成一条趋势线</strong>。</li>
              <li>地图为示意投影；本原型中的司法辖区均为虚构，不对应任何真实地理。</li>
            </ul>
            {ciChart ? (
              <div className="methodpg__chart">
                <ChartRenderer chart={ciChart} />
                <p className="methodpg__caption">
                  上图是本站条目中实际使用的一张图：中心点是估计值，横向区间是 95% 置信区间。
                  区间画出来之后，读者能看到几个区域之间的差异有相当一部分落在误差范围内 ——
                  这正是只画中心点会掩盖的东西。
                </p>
              </div>
            ) : null}
          </section>

          {/* ---------------------------------------------- 08 corrections -- */}
          <section className="methodpg__section" id="m-corrections" tabIndex={-1} aria-labelledby="m-corr-h">
            <p className="methodpg__section-n u-mono">08</p>
            <h2 className="methodpg__h2" id="m-corr-h">更正、更新与撤回</h2>
            <p className="methodpg__p">
              四类记录<strong>永久公开保存</strong>，附时间与执行人，并同时出现在条目页与
              <Link to="/corrections">更正记录</Link>页。已发布内容出现新证据时进入「需更新」队列，
              不静默修改；撤回时保留原文可访问性说明与撤回理由，不删除历史。
            </p>
            <div className="methodpg__kinds">
              {CORRECTION_KINDS.map((kind) => (
                <div className={cx('methodpg__kind', `methodpg__kind--${kind.key}`)} key={kind.key}>
                  <p className="methodpg__kind-t">
                    {kind.zh}
                    <span className="methodpg__kind-n u-num">{correctionCounts.get(kind.key) ?? 0}</span>
                  </p>
                  <p className="methodpg__kind-b">{kind.note}</p>
                </div>
              ))}
            </div>
            <p className="methodpg__p">
              当前有 <strong className="u-num">{totalUpdateNeeded}</strong> 个条目处于「需更新」状态，
              它们仍然可读，但页面顶部会写明正在等待什么材料。
            </p>
          </section>

          {/* ----------------------------------------------------- 09 vibe -- */}
          <section className="methodpg__section" id="m-vibe" tabIndex={-1} aria-labelledby="m-vibe-h">
            <p className="methodpg__section-n u-mono">09</p>
            <h2 className="methodpg__h2" id="m-vibe-h">自然语言编辑的边界</h2>
            <p className="methodpg__p">
              主编可以用自然语言指令要求补充背景、增加当地视角、检查受害者有罪论框架、
              重新核查引用、加深分析或更换封面图。这套能力有明确的边界：
            </p>
            <ul className="methodpg__rules">
              <li><strong>每次修改生成新版本，不覆盖原稿</strong>；差异、新增与删除的引用一并显示。</li>
              <li>指令<strong>不能凭空创造来源</strong>；引擎只能从已入库的来源中选取，找不到就明说找不到。</li>
              <li>采用与否始终需要人再次确认，未确认的版本停留在「提案」状态。</li>
              <li>指令若无法被安全地自动执行，引擎必须明说「未识别为可自动执行的编辑」，并给出需要人来决定的问题，<strong>不得静默不做事</strong>。</li>
            </ul>
          </section>

          {/* ----------------------------------------------------- 10 lock -- */}
          <section className="methodpg__section" id="m-lock" tabIndex={-1} aria-labelledby="m-lock-h">
            <p className="methodpg__section-n u-mono">10</p>
            <h2 className="methodpg__h2" id="m-lock-h">Global Publishing Lock（全局发布锁）</h2>
            <p className="methodpg__p">
              主编可随时开启全局发布锁。开启期间，所有公开发布被暂停，包括已排程内容；
              「批准并立即发布」只记录批准，不公开；锁的开启与解除、原因与执行人写入操作记录。
              它存在的意义很简单：当我们对某件事的判断出现动摇时，默认动作应该是停下，而不是继续发。
            </p>
            <div className={cx('methodpg__lock', lock.engaged && 'methodpg__lock--on')}>
              <p className="methodpg__lock-t">
                <Icon name={lock.engaged ? 'lock' : 'unlock'} size={16} />
                当前状态：{lock.engaged ? '已开启 · 公开发布暂停中' : '未开启 · 发布流程正常'}
              </p>
              {lock.engaged ? (
                <p className="methodpg__lock-b">
                  {lock.reason ? `原因：${lock.reason}` : '未填写原因。'}
                  {lock.since ? `　开启时间：${fmtDateTime(lock.since)}` : ''}
                  {lock.by ? `　执行人：${lock.by}` : ''}
                </p>
              ) : (
                <p className="methodpg__lock-b">
                  锁未开启时，发布仍然必须逐篇通过发布前校验与（涉敏感内容时的）二次确认。
                  这个开关只是最后一层，不是唯一一层。
                </p>
              )}
            </div>
          </section>

          {/* ---------------------------------------------- 11 uncertainty -- */}
          <section className="methodpg__section" id="m-uncertainty" tabIndex={-1} aria-labelledby="m-unc-h">
            <p className="methodpg__section-n u-mono">11</p>
            <h2 className="methodpg__h2" id="m-unc-h">不确定性</h2>
            <p className="methodpg__p">
              我们公开承认：搜集不可能穷尽、翻译会丢失语境、缺失数据本身也是一种权力结构的产物。
              一个群体在统计中不可见，通常不是因为它不存在，而是因为没有人被要求去数它。
            </p>
            <p className="methodpg__p">
              因此「尚未确定的信息」是每篇条目的必需章节，不是免责声明。
              它必须写明：哪一项不确定、我们尝试过什么、被什么挡住了、需要什么才能确定。
              一篇没有这一节的稿子，在本站不构成完成品。
            </p>
            <div className="methodpg__end">
              <p className="methodpg__end-t">这份文件本身也会被修订</p>
              <p className="methodpg__end-b">
                规则改动同样按更正政策公开记录。若你认为某条规则在具体条目上没有被遵守，
                请指出是哪一条与哪一段 —— 这是本站接受的最有用的一种批评。
              </p>
              <div className="methodpg__end-links">
                <Link className="methodpg__end-link" to="/fact-checks">
                  <Icon name="check-double" size={14} />
                  事实核查索引
                </Link>
                <Link className="methodpg__end-link" to="/corrections">
                  <Icon name="history" size={14} />
                  更正记录
                </Link>
                <Link className="methodpg__end-link" to="/about">
                  <Icon name="info" size={14} />
                  关于 PRISM
                </Link>
              </div>
            </div>
          </section>
        </article>
      </div>
    </div>
  )
}
