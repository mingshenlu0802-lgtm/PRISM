import { useState } from 'react'
import type { CollectMode, TopicKey } from '../../lib/types'
import type { RegionKey } from '../../lib/regions'
import { PRIORITY_REGIONS, REGIONS, sortRegions } from '../../lib/regions'
import { TOPICS } from '../../lib/constants'
import { usePrism } from '../../lib/store'
import { usePageTitle } from '../../lib/title'
import { cx } from '../../lib/util'
import { Checkbox, Icon, TextArea, toast } from '../../components/common'
import { Coverage } from '../../components/console/Coverage'
import './SearchPage.css'

/**
 * 「找新闻」——控制端第一页。
 *
 * 设计上只有一个主按钮。所有设置都有默认值，看不懂的可以完全不碰，直接按
 * 那个按钮。每个选项旁边都用一句大白话说明它会造成什么后果。
 */
export default function SearchPage(): JSX.Element {
  const { state, dispatch, who, canEdit } = usePrism()
  usePageTitle('找新闻')
  // 给搜集程序的常驻指示。存进 site.copy.collectNote，跑在 Actions 上的抓取会读它。
  const [note, setNote] = useState(state.copy.collectNote ?? '')
  const cfg = state.collect
  /*
   * 演示按钮删掉之后，这一页不再「跑」任何东西——它只保存设置。
   * running / stepIndex / runId / 计时器那一套都跟着走了。
   */
  const setCfg = (patch: Parameters<typeof dispatch>[0] extends never ? never : Partial<typeof cfg>) =>
    dispatch({ type: 'collect-config', patch })

  const toggleRegion = (k: RegionKey) =>
    setCfg({ regions: cfg.regions.includes(k) ? cfg.regions.filter((r) => r !== k) : sortRegions([...cfg.regions, k]) })

  const toggleTopic = (k: TopicKey) =>
    setCfg({ topics: cfg.topics.includes(k) ? cfg.topics.filter((t) => t !== k) : [...cfg.topics, k] })

  return (
    <div className="srch">
      <header className="srch__head">
        <h1 className="srch__title">找新闻</h1>
        {/*
          * 自动收集现在是**关着的**，这一页必须先说这件事。
          *
          * 站长要求关掉，而这里原来写着「每天跑两次」。对站长来说，这句话
          * 比在公众站上更要命：他会以为新闻在自己进来，于是不去手动跑，
          * 然后奇怪为什么站上一直没有新东西。
          *
          * scripts/smoke.mjs 里那条测试同时盯着这一页和「关于」页——
          * 重新打开收集的时候，两处都会被提醒改回来。
          */}
        <p className="srch__lede">
          自动搜集<strong>暂时停着</strong>（站长要求，网站还在开发）。
          要跑一轮就去 GitHub 仓库的 <strong>Actions → 找新闻 → Run workflow</strong>。
          这一页是给它下指示的地方，不是一个要你按的按钮。
        </p>
      </header>

      {/*
        * 这里原本有一个「开始搜集」的大按钮，一条走格子的进度条，和一份
        * 「上次搜集」报告。
        *
        * 全是演示。它取的是代码里内置的虚构素材，链接落在保留域名 .invalid 上。
        * 站长按过，然后问「为什么我搜寻的新闻质量这么差，只有示例？」——
        * 答案就是这个按钮。真正的搜集跑在 GitHub Actions 上，抓的是真媒体的 RSS。
        *
        * 一个会往站上灌假数据的按钮，留着只会再骗人一次，所以删掉。
        * 下面这些设置留着，因为它们是真的：每天那一次会读它们。
        */}
      <section className="srch__block">
        <h2 className="srch__blocktitle">恢复之后它怎么跑</h2>
        <ul className="srch__facts">
          <li><strong>早上 6:00</strong> — 15 条新闻 + 3 项研究</li>
          <li><strong>下午 2:00</strong> — 15 条新闻（研究一天收一次就够）</li>
          <li>每条按编辑方针筛过、写成中文报道，<strong>一千五到三千字</strong></li>
          <li>和站上已有内容讲同一件事的会<strong>合并</strong>，不重复占位</li>
          <li>抓到<strong>直接上线</strong>，不满意随时在「编辑 → 内容」里下架或删除</li>
        </ul>
        <p className="srch__blocknote">
          想现在就跑一次、或者看上一次跑得怎么样：去 GitHub 仓库的
          <strong> Actions → 找新闻</strong>。那里有每一次的完整日志，
          包括每个来源抓到几条、哪些被合并了、这一轮花了多少 token。
        </p>
      </section>

      {/* ------------------------------- settings ------------------------------- */}
      <Coverage />

      {/*
        * 给收集程序的常驻指示。
        *
        * 站长要的是「一个 chatbot 让我指导去搜寻多少新闻」。做成对话框会有两个
        * 问题：静态站要在浏览器里放模型的 key，而且真正干活的是每天在 GitHub
        * Actions 上跑的那个程序，不是这个页面。所以做成一段**存下来的指示**——
        * 写在这里，下一次抓取时模型会读到，并且优先于一般规则。
        * 关掉页面不会丢，也不需要你守在电脑前。
        */}
      <section className="srch__block">
        <div className="srch__blockhead">
          <h2 className="srch__blocktitle">给搜集程序的指示</h2>
        </div>
        <p className="srch__blocknote">
          用中文写就行，像跟编辑交代一样。<strong>每天早上那次自动搜集会读这一段</strong>，
          并且把它排在一般规则前面。写完按「保存指示」。
        </p>
        <TextArea
          rows={4}
          value={note}
          placeholder={'例：\n今天重点找台湾和香港的性侵案司法进展，20 条左右。\n少要美国的评论文章，多要有法院文件或独立调查的。'}
          onChange={(e) => { const v = e.currentTarget.value; setNote(v) }}
          disabled={!canEdit}
        />
        <div className="srch__noterow">
          <button
            type="button"
            className="srch__notesave"
            disabled={!canEdit || note === (state.copy.collectNote ?? '')}
            onClick={() => {
              dispatch({ type: 'copy', patch: { collectNote: note.trim() }, who })
              toast('指示已保存。下一次搜集会照着做。', 'go')
            }}
          >
            <Icon name="check" size={14} />保存指示
          </button>
          {note !== (state.copy.collectNote ?? '') && (
            <button type="button" className="srch__notereset" onClick={() => setNote(state.copy.collectNote ?? '')}>
              还原
            </button>
          )}
          <span className="srch__notehint">
            指示只影响每天自动搜集的那一次，不影响这一页上面那个演示用的按钮。
          </span>
        </div>
      </section>

      <section className="srch__block">
        <div className="srch__blockhead">
          <h2 className="srch__blocktitle">搜哪些地区</h2>
          <div className="srch__quick">
            <button type="button" onClick={() => setCfg({ regions: [...PRIORITY_REGIONS] })}>只搜优先六个</button>
            <button type="button" onClick={() => setCfg({ regions: REGIONS.map((r) => r.key) })}>全选</button>
          </div>
        </div>
        <p className="srch__blocknote">前六个是你指定的优先地区，搜集时会先扫它们。</p>
        <div className="srch__chips">
          {REGIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              className={cx('srch__chip', cfg.regions.includes(r.key) && 'srch__chip--on')}
              aria-pressed={cfg.regions.includes(r.key)}
              onClick={() => toggleRegion(r.key)}
            >
              <span className="srch__dot" style={{ background: r.hue }} aria-hidden="true" />
              {r.zh}
              {r.priority === 1 && <span className="srch__pri">优先</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="srch__block">
        <div className="srch__blockhead">
          <h2 className="srch__blocktitle">搜哪些议题</h2>
          <div className="srch__quick">
            <button type="button" onClick={() => setCfg({ topics: TOPICS.map((t) => t.key) })}>全选</button>
          </div>
        </div>
        <div className="srch__chips">
          {TOPICS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={cx('srch__chip', cfg.topics.includes(t.key) && 'srch__chip--on')}
              aria-pressed={cfg.topics.includes(t.key)}
              title={t.blurb}
              onClick={() => toggleTopic(t.key)}
            >
              <span className="srch__gem" style={{ background: t.hue }} aria-hidden="true" />
              {t.short}
            </button>
          ))}
        </div>
      </section>

      <section className="srch__block">
        <h2 className="srch__blocktitle">找什么、找多少</h2>
        <div className="srch__opts">
          <div className="srch__opt">
            <p className="srch__optlabel">内容类型</p>
            <div className="srch__seg">
              {([['both', '新闻＋研究'], ['news', '只要新闻'], ['studies', '只要研究与数据']] as [CollectMode, string][]).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={cx('srch__segbtn', cfg.mode === v && 'srch__segbtn--on')}
                  aria-pressed={cfg.mode === v}
                  onClick={() => setCfg({ mode: v })}
                >{label}</button>
              ))}
            </div>
          </div>

          <div className="srch__opt">
            <p className="srch__optlabel">这次最多加几条</p>
            <div className="srch__seg">
              {[3, 6, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cx('srch__segbtn', cfg.perRun === n && 'srch__segbtn--on')}
                  aria-pressed={cfg.perRun === n}
                  onClick={() => setCfg({ perRun: n })}
                >{n} 条</button>
              ))}
            </div>
          </div>
        </div>

        <div className="srch__checks">
          <Checkbox
            checked={cfg.autoPublish}
            onChange={(v) => setCfg({ autoPublish: v })}
            label="找到就直接上线"
            hint="打开：新内容马上出现在公众站，你随时可以删。关掉：先存草稿，等你放行。"
          />
          <Checkbox
            checked={cfg.dedupe}
            onChange={(v) => setCfg({ dedupe: v })}
            label="自动跳过重复的"
            hint="标题和已有内容很像的就不再加一遍。被跳过的会列出原因，不会悄悄消失。"
          />
          <Checkbox
            checked={cfg.preferIndependent}
            onChange={(v) => setCfg({ preferIndependent: v })}
            label="优先独立与境外媒体"
            hint={'报道部分优先取独立与境外媒体；官方媒体不丢掉，往后排并在页面上标成「官方媒体」。'
              + '判决书、法案、部门文件这类原始文件不受影响，始终排在最前。'}
          />
        </div>
      </section>

      {/*
        * 这里原本是一个模型选择器：Qwen / Llama / Mistral / 自定义端点 / Claude。
        *
        * 它现在是假的。真正抓新闻、写中文总结的是 GitHub Actions 里的收集脚本，
        * 用的模型由仓库的 ANTHROPIC_API_KEY 决定，跟这个页面上选了什么毫无关系。
        * 一个点了没有任何作用的选择器，比没有这个选择器更糟——站长会以为自己
        * 换了模型，然后困惑为什么输出没变。站长也已经定了：只用 Claude API。
        *
        * 所以选择器删掉，换成一句说明真实情况的话。
        */}
      <section className="srch__block">
        <h2 className="srch__blocktitle">用哪个模型</h2>
        <p className="srch__blocknote">
          筛选、翻译和写总结都交给 <strong>Claude</strong>，模型在仓库的
          Secrets 里设定（<code>ANTHROPIC_API_KEY</code>），不在这个页面上选。
          每次收集跑完，Actions 的日志会报出这一轮用掉多少 token、大概多少钱。
        </p>
      </section>


    </div>
  )
}
