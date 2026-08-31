import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import type { Article, Translation } from '../../lib/types'
import { citationNumbers, cx, fmtDateTime, relTime } from '../../lib/util'
import { usePrism, useArticle } from '../../lib/store'
import * as sel from '../../lib/selectors'

import {
  Badge, DemoTag, EmptyState, Icon, Meter, Segmented, StatusBadge, TopicChip,
} from '../../components/common'
import { ConceptImage } from '../../components/visual/ConceptImage'

import { ArticleBody, jumpToAnchor, sectionAnchor } from '../../components/public/ArticleBody'
import { ArticleCard } from '../../components/public/ArticleCard'
import { ContentNotice, EVIDENCE_ANCHOR } from '../../components/public/ContentNotice'
import { ReferenceList } from '../../components/public/ReferenceList'
import { SourceDrawer } from '../../components/public/SourceDrawer'

import './ArticlePage.css'

/**
 * The article page — the most important reading surface in the product.
 *
 * Its job is not only to be readable but to be *checkable*: the evidence strip
 * sits above the body rather than buried under it, every inline marker opens
 * the record behind it, the reference list is grouped by evidence tier, and the
 * correction log, the provenance disclosure and the translation states are
 * page furniture rather than a footer nobody reaches.
 */



const TRANSLATION_STATUS: Record<Translation['status'], { zh: string; tone: 'go' | 'warn' | 'neutral'; note: string }> = {
  'human-reviewed': {
    zh: '人工校订',
    tone: 'go',
    note: '该语言版本由人复核过术语与语境，可作为正式版本引用。',
  },
  'machine-draft': {
    zh: '机器翻译草稿',
    tone: 'warn',
    note: '该版本由机器翻译生成，尚未经人复核。法律术语、机构名称与引文措辞都可能失真，请以原文版本为准。',
  },
  'not-started': {
    zh: '尚未翻译',
    tone: 'neutral',
    note: '该语言版本尚未开始翻译。本站不发布未经检查的自动译文来充数。',
  },
}


/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

export default function ArticlePage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>()
  const article = useArticle(slug)

  if (!article) {
    return (
      <div className="apage apage--missing">
        <div className="u-shell">
          <EmptyState
            icon="file"
            title="找不到这篇条目"
            hint="链接可能已经失效，或该条目尚未进入公开状态。所有条目均为演示内容。"
            action={<Link className="apage__backhome" to="/">返回今日首页</Link>}
          />
        </div>
      </div>
    )
  }

  return <ArticleView article={article} />
}

/* ------------------------------------------------------------------ *
 * View
 * ------------------------------------------------------------------ */

function ArticleView({ article }: { article: Article }): JSX.Element {
  const { state } = usePrism()
  const [citationId, setCitationId] = useState<string | null>(null)
  const [tocOpen, setTocOpen] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [lang, setLang] = useState<string>(article.translations[0]?.lang ?? 'zh-Hans')

  const numbers = useMemo(() => citationNumbers(article), [article])
  const profile = useMemo(() => sel.sourceProfile(article, state), [article, state])
  const cover = sel.coverOf(state, article)

  const health = sel.citationHealth(article)
  const fails = sel.failedChecks(article)
  const blocking = sel.blockingChecks(article)
  const acknowledged = sel.acknowledgedFailures(article)
  const warns = sel.warnChecks(article)
  const passes = article.citationChecks.length - fails.length - warns.length

  const related = useMemo(
    () => sel.publicArticles(state)
      .filter((a) => a.id !== article.id && a.topics.some((t) => article.topics.includes(t)))
      .slice(0, 4),
    [state, article.id, article.topics],
  )

  const brief = sel.latestBrief(state)
  const updateReason = brief?.updateNeeded.find((u) => u.articleId === article.id)?.why

  const navItems = useMemo(() => {
    const items = article.sections.map((s) => ({
      id: sectionAnchor(s.kind),
      zh: s.title,
      kind: s.kind as string,
    }))
    items.push({ id: EVIDENCE_ANCHOR, zh: '参考文献', kind: 'refs' })
    return items
  }, [article.sections])

  /* Scroll-spy + reading progress, rAF-throttled onto one listener. */
  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      let current: string | null = navItems[0]?.id ?? null
      for (const item of navItems) {
        const el = document.getElementById(item.id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= 160) current = item.id
      }
      setActive(current)
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      /* Rounded to whole percent so React can bail out of most scroll frames. */
      setProgress(max > 8 ? Math.round(Math.min(100, Math.max(0, (window.scrollY / max) * 100))) : 0)
    }
    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [navItems])

  const goto = (id: string) => {
    setTocOpen(false)
    jumpToAnchor(id)
  }

  const isPublic = article.status === 'published'
    || article.status === 'update-needed'
    || article.status === 'retracted'

  const translation = article.translations.find((t) => t.lang === lang)

  return (
    <div className="apage">
      {/* ------------------------------- banners ------------------------------ */}

      {!isPublic ? (
        <div className="apage__banner apage__banner--hold" role="status">
          <div className="u-shell apage__bannerinner">
            <span className="apage__bannericon" aria-hidden="true"><Icon name="lock" size={16} /></span>
            <div className="apage__bannerbody">
              <p className="apage__bannertitle">
                这篇条目尚未公开发布。
                <StatusBadge status={article.status} size="sm" />
              </p>
              <p className="apage__bannertext">
                自动编辑台没有发布权限；在主编批准之前，本页只是控制端的预览，不代表本站已经发表这些内容。
              </p>
            </div>
            <Link className="apage__bannerlink" to={`/command/article/${article.id}`}>
              在 PRISM Command 中查看
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      ) : null}

      {article.status === 'update-needed' ? (
        <div className="apage__banner apage__banner--warn" role="status">
          <div className="u-shell apage__bannerinner">
            <span className="apage__bannericon" aria-hidden="true"><Icon name="alert" size={16} /></span>
            <div className="apage__bannerbody">
              <p className="apage__bannertitle">本文已进入「需更新」队列。</p>
              <p className="apage__bannertext">
                {updateReason
                  ?? '出现了可能影响本文内容的新材料，本文保持可访问，更新完成后会替换正文。'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {article.status === 'retracted' ? (
        <div className="apage__banner apage__banner--stop" role="alert">
          <div className="u-shell apage__bannerinner">
            <span className="apage__bannericon" aria-hidden="true"><Icon name="x" size={16} /></span>
            <div className="apage__bannerbody">
              <p className="apage__bannertitle">本文已被撤回。</p>
              <p className="apage__bannertext">
                本文已被撤回。原文保留可访问性，本站不删除历史。
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* --------------------------------- hero -------------------------------- */}

      <header className="apage__hero">
        <div className="u-shell">
          <div className="apage__topics">
            {article.topics.map((t) => <TopicChip key={t} topic={t} link size="md" />)}
            {!isPublic ? <StatusBadge status={article.status} size="sm" /> : null}
            <DemoTag />
          </div>

          <h1 className="apage__title">{article.title}</h1>
          <p className="apage__titleen">{article.titleEn}</p>
          <p className="apage__standfirst">{article.standfirst}</p>

          <div className="apage__bylinerow">
            <div className="apage__byline">
              <span className="apage__bylineicon" aria-hidden="true"><Icon name="users" size={14} /></span>
              <span>{article.byline}</span>
            </div>

            <dl className="apage__stamps">
              {article.publishedAt ? (
                <div className="apage__stamp">
                  <dt>发布</dt>
                  <dd><time dateTime={article.publishedAt}>{fmtDateTime(article.publishedAt)}</time></dd>
                </div>
              ) : null}
              {article.status === 'scheduled' && article.scheduledFor ? (
                <div className="apage__stamp">
                  <dt>排程发布</dt>
                  <dd><time dateTime={article.scheduledFor}>{fmtDateTime(article.scheduledFor)}</time></dd>
                </div>
              ) : null}
              <div className="apage__stamp">
                <dt>最后更新</dt>
                <dd>
                  <time dateTime={article.updatedAt} title={fmtDateTime(article.updatedAt)}>
                    {relTime(article.updatedAt, state.today)}
                  </time>
                </dd>
              </div>
              <div className="apage__stamp">
                <dt>阅读时长</dt>
                <dd className="u-num">约 {article.readingTime} 分钟</dd>
              </div>
              <div className="apage__stamp">
                <dt>地区</dt>
                <dd>{article.region} · {article.countries.join('、')}</dd>
              </div>
            </dl>

            <div className="apage__heroactions">
              <button
                type="button"
                className="apage__heroaction"
                onClick={() => window.print()}
              >
                <Icon name="download" size={13} />
                打印本页
              </button>
              <Link className="apage__heroaction" to={`/command/article/${article.id}`}>
                <Icon name="grid" size={13} />
                在控制端打开
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* The notice comes BEFORE the cover. A reader who needs it should meet
          it first, not after scrolling past a full-width image. */}
      {article.contentNotice ? (
        <div className="apage__notice">
          <div className="u-shell">
            <ContentNotice text={article.contentNotice} topics={article.topics} />
          </div>
        </div>
      ) : null}

      {cover ? (
        <div className="apage__coverwrap">
          <div className="u-shell">
            {/* ConceptImage carries its own caption; only the guardrail note
                is added here, so the caption is never printed twice. */}
            <div className="apage__cover">
              <ConceptImage asset={cover} ratio="21-9" />
              {cover.guardrail ? (
                <p className="apage__coverrule">
                  <Icon name="shield" size={12} />
                  <span>图像准则：{cover.guardrail}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ----------------------------- evidence strip --------------------------- */}

      <section className="apage__evidence" aria-labelledby="apage-evidence-title">
        <div className="u-shell">
          <div className="apage__evidencecard">
            <div className="apage__evidencehead">
              <h2 className="apage__evidencetitle" id="apage-evidence-title">证据概况</h2>
              <p className="apage__evidenceen">Evidence at a glance</p>
              <p className="apage__evidencelede">
                这一栏是本文的取证状况，不是评分游戏。可信度只用来提示读者把注意力放在哪里，
                任何一个数字都附有依据。
              </p>
            </div>

            <div className="apage__evidencegrid">
              <div className="apage__confidence">
                <Meter
                  value={article.confidence}
                  label="整体可信度"
                  hint={article.confidenceBasis}
                />
              </div>

              <dl className="apage__stats">
                <div className="apage__statcell">
                  <dt>来源数</dt>
                  <dd>
                    <span className="apage__statvalue u-num">{profile.total}</span>
                    <span className="apage__statnote">其中一手材料 {profile.primary} 份。</span>
                  </dd>
                </div>
                <div className={cx('apage__statcell', profile.primary < 2 && 'apage__statcell--short')}>
                  <dt>一手来源</dt>
                  <dd>
                    <span className="apage__statvalue u-num">{profile.primary}</span>
                    <span className="apage__statnote">
                      {profile.primary >= 2 ? '达到本站每篇两份的内部下限。' : '低于本站两份的内部下限。'}
                    </span>
                  </dd>
                </div>
                <div className={cx('apage__statcell', profile.independent < 3 && 'apage__statcell--short')}>
                  <dt>独立来源</dt>
                  <dd>
                    <span className="apage__statvalue u-num">{profile.independent}</span>
                    <span className="apage__statnote">按不同发布方计数，非按署名计数。</span>
                  </dd>
                </div>
                <div className="apage__statcell">
                  <dt>覆盖辖区</dt>
                  <dd>
                    <span className="apage__statvalue u-num">{profile.countries.length}</span>
                    <span className="apage__statnote">{profile.countries.join(' · ') || '—'}</span>
                  </dd>
                </div>
                <div className="apage__statcell">
                  <dt>语言</dt>
                  <dd>
                    <span className="apage__statvalue u-num">{profile.languages.length}</span>
                    <span className="apage__statnote">{profile.languages.join(' · ') || '—'}</span>
                  </dd>
                </div>
                <div className="apage__statcell">
                  <dt>平均可信度</dt>
                  <dd>
                    <span className="apage__statvalue u-num">{profile.avgCredibility}</span>
                    <span className="apage__statnote">
                      最弱一份：{profile.weakest ? `${profile.weakest.publisher}（${profile.weakest.credibility}）` : '—'}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className={cx('apage__health', blocking.length > 0 && 'apage__health--fail')}>
              <p className="apage__healthline">
                <span className="apage__healthicon" aria-hidden="true">
                  <Icon name={blocking.length > 0 ? 'alert' : 'check-double'} size={14} />
                </span>
                <span className="apage__healthtext">
                  资源可得率：<strong className="u-num">{health}%</strong> ——
                  {passes} 项通过 · {warns.length} 项有保留 · {acknowledged.length} 项未通过但已记录处理 ·
                  {blocking.length} 项未通过且待处理。
                </span>
              </p>

              {fails.length > 0 ? (
                <ul className="apage__failures">
                  {fails.map((f) => {
                    const n = numbers.get(f.citationId)
                    return (
                      <li key={f.citationId}>
                        <button
                          type="button"
                          className={cx('apage__failbtn', f.acknowledged && 'apage__failbtn--acked')}
                          onClick={() => setCitationId(f.citationId)}
                        >
                          <span className="apage__failn u-num">[{n ?? '?'}]</span>
                          <span className="apage__failbody">
                            <span className="apage__failstate">
                              {f.acknowledged ? '未通过 · 已处理' : '未通过 · 待处理'}
                            </span>
                            <span>{f.reason}</span>
                            {f.acknowledged && f.acknowledgedNote ? (
                              <span className="apage__failnote">
                                编辑处理：{f.acknowledgedNote}
                                {f.acknowledgedBy ? `（${f.acknowledgedBy}）` : ''}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}

              <p className="apage__healthnote">
                「通过」只表示引文与所引材料相符，不表示该材料的结论正确。未通过的引用不会被删掉：
                它留在记录里，而依赖它的句子会被削弱或改为归因表述。每条引用的核查范围写在来源面板里。
              </p>
            </div>

            {article.riskFlags.filter((r) => !r.resolved).length > 0 ? (
              <p className="apage__openrisk">
                <Icon name="flag" size={13} />
                本文仍有 {article.riskFlags.filter((r) => !r.resolved).length} 项编辑风险项未结案，处理记录见控制端。
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* --------------------------------- body --------------------------------- */}

      <div className="apage__main">
        <div className="u-shell apage__layout">
          {/* --- mobile jump menu --- */}
          <div className="apage__jump">
            <button
              type="button"
              className="apage__jumpbtn"
              aria-expanded={tocOpen}
              aria-controls="apage-jump-list"
              onClick={() => setTocOpen((v) => !v)}
            >
              <Icon name="list" size={15} />
              <span>本文目录</span>
              <span className="apage__jumpcount u-num">{navItems.length}</span>
              <span className={cx('apage__jumpchev', tocOpen && 'apage__jumpchev--open')} aria-hidden="true">
                <Icon name="chevron-down" size={14} />
              </span>
            </button>
            <ul className="apage__jumplist" id="apage-jump-list" hidden={!tocOpen}>
              {navItems.map((item, i) => (
                <li key={item.id}>
                  <button type="button" className="apage__jumpitem" onClick={() => goto(item.id)}>
                    <span className="apage__jumpn u-num">{String(i + 1).padStart(2, '0')}</span>
                    {item.zh}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* --- sticky TOC rail --- */}
          <nav className="apage__toc" aria-label="本文目录">
            <div className="apage__tocinner">
              <p className="apage__toctitle">本文目录</p>
              <div
                className="apage__progress"
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="阅读进度"
              >
                <span className="apage__progressfill" style={{ width: `${progress}%` }} />
              </div>
              <ol className="apage__toclist">
                {navItems.map((item, i) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={cx('apage__tocitem', active === item.id && 'apage__tocitem--on')}
                      onClick={() => goto(item.id)}
                      aria-current={active === item.id ? 'true' : undefined}
                    >
                      <span className="apage__tocn u-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="apage__toclabel">{item.zh}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <p className="apage__tocfoot">
                共 {article.citations.length} 条引用 · {profile.total} 份来源
              </p>
            </div>
          </nav>

          {/* --- article body --- */}
          <div className="apage__column">
            <ArticleBody
              article={article}
              numbers={numbers}
              onCite={setCitationId}
              anchors
            />

            {/* ----------------------------- references ---------------------------- */}

            <section
              className="apage__section"
              id={EVIDENCE_ANCHOR}
              tabIndex={-1}
              aria-labelledby="apage-ref-title"
            >
              <header className="apage__sectionhead">
                <p className="apage__sectioneyebrow">
                  <span className="apage__sectionn u-num">REF</span>
                  <span>References</span>
                </p>
                <h2 className="apage__sectiontitle" id="apage-ref-title">我们如何取证</h2>
                <p className="apage__sectionnote">
                  转载、聚合与二次引用一律回溯到原始文件；找不到原始文件的，写明「未取得一手记录」，
                  不用相近材料替代。
                </p>
                <hr className="apage__sectionrule" />
              </header>

              <ReferenceList article={article} numbers={numbers} onOpen={setCitationId} />
            </section>

            {/* --------------------------- translations --------------------------- */}
            {article.translations.length > 0 ? (
              <section className="apage__records" aria-labelledby="apage-tr-title">
                <div className="apage__recordshead">
                  <h2 className="apage__sectiontitle" id="apage-tr-title">语言版本</h2>
                </div>
                  <div className="apage__translations">
                    <Segmented<string>
                      value={lang}
                      onChange={setLang}
                      ariaLabel="选择语言版本"
                      size="sm"
                      options={article.translations.map((t) => ({
                        value: t.lang,
                        label: t.label,
                      }))}
                    />

                    {translation ? (
                      <div
                        className={cx('apage__transpanel', `apage__transpanel--${translation.status}`)}
                      >
                        <p className="apage__transhead">
                          <Badge
                            tone={TRANSLATION_STATUS[translation.status].tone}
                            size="sm"
                            icon={(
                              <Icon
                                name={translation.status === 'human-reviewed'
                                  ? 'check'
                                  : translation.status === 'machine-draft' ? 'alert' : 'minus'}
                                size={11}
                              />
                            )}
                          >
                            {TRANSLATION_STATUS[translation.status].zh}
                          </Badge>
                          <span className="apage__translang">{translation.label}</span>
                          <span className="apage__transtag u-mono">{translation.lang}</span>
                        </p>

                        {translation.title ? (
                          <p className="apage__transtitleline">{translation.title}</p>
                        ) : null}
                        {translation.standfirst ? (
                          <p className="apage__transstand">{translation.standfirst}</p>
                        ) : null}

                        <p className="apage__transnote">{TRANSLATION_STATUS[translation.status].note}</p>
                      </div>
                    ) : null}
                  </div>
              </section>
            ) : null}

            {/* ------------------------------- related ----------------------------- */}

            {related.length > 0 ? (
              <section className="apage__section" aria-labelledby="apage-rel-title">
                <header className="apage__sectionhead">
                  <p className="apage__sectioneyebrow">
                    <span className="apage__sectionn u-num">REL</span>
                    <span>Related reporting</span>
                  </p>
                  <h2 className="apage__sectiontitle" id="apage-rel-title">相关报道</h2>
                  <p className="apage__sectionnote">同一议题下的其他条目，按发布时间排序。</p>
                  <hr className="apage__sectionrule" />
                </header>

                <div className="apage__related">
                  {related.map((a) => (
                    <ArticleCard key={a.id} article={a} size="row" showCover />
                  ))}
                </div>
              </section>
            ) : null}

            <p className="apage__tail">
              <DemoTag />
              <span>
                本页的全部内容 —— 辖区、机构、判决、数据、来源与人物 —— 均为原型演示而虚构，
                不构成真实报道，也不可作为真实引用使用。
              </span>
            </p>
          </div>
        </div>
      </div>

      <SourceDrawer
        article={article}
        citationId={citationId}
        onClose={() => setCitationId(null)}
        onSelect={setCitationId}
      />
    </div>
  )
}
