/**
 * Daily Editorial Brief.
 *
 * The brief carries summaries and links only. It has no approval controls and
 * never will: approving and publishing happen in the console, in front of the
 * gate, never from an inbox.
 *
 * Derived from the live dataset where possible, so it cannot drift out of
 * agreement with what the console is actually showing.
 */
import type { Article, DailyBrief, RiskSeverity } from '../types'
import { SIGNALS } from './signals'
import { blockingChecksOf, riskOf } from './briefUtil'

function pending(articles: Article[]): string[] {
  return articles
    .filter((a) => a.status === 'in-review' || a.status === 'needs-sources' || a.status === 'changes-requested')
    .map((a) => a.id)
}

function updateNeeded(articles: Article[]) {
  return articles
    .filter((a) => a.status === 'update-needed')
    .map((a) => ({
      articleId: a.id,
      why: '已发布内容出现新的一手材料，原文的解释框架需要重新评估；在更新前不静默修改正文。',
    }))
}

function riskAlerts(articles: Article[]) {
  const out: { articleId: string; note: string; severity: RiskSeverity }[] = []
  for (const a of articles) {
    for (const r of riskOf(a)) {
      out.push({ articleId: a.id, note: r.note, severity: r.severity })
    }
  }
  // Most severe first — the editor should not have to scan for the critical one.
  const order: Record<RiskSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  return out.sort((x, y) => order[x.severity] - order[y.severity]).slice(0, 6)
}

function citationFailures(articles: Article[]) {
  const out: { articleId: string; citationId: string; reason: string }[] = []
  for (const a of articles) {
    for (const c of blockingChecksOf(a)) {
      out.push({ articleId: a.id, citationId: c.citationId, reason: c.reason })
    }
  }
  return out.slice(0, 8)
}

const TOP_FIVE_WHY: Record<string, string> = {
  'sig-001': '判决已生效两个月，两处登记实践仍未改变——这是「判决与执行之间的落差」首次有可核对的书面记录。',
  'sig-002': '口径变更说明是可核对的一手文件，直接关系到正在流传的「激增四成」说法；方法附录仍然缺失。',
  'sig-003': '限制令原文可取得，涉及未成年人身份保护与公众知情权的直接冲突，且本站正在报道该案。',
  'sig-004': '若材料属实，将是该程序运作方式的首份文件证据；但流出途径不明，目前无机构确认。',
  'sig-005': '平台透明度数据可核对，但「谁在协调」仍只有推断——这正是本站需要把话说清楚的地方。',
}

const RECOMMENDED_WHY: Record<string, string> = {
  'art-maran': '证据结构已经稳定，剩下的全部是编辑判断与法律边界问题；这类稿件拖得越久，越容易在压力下被匆忙处理。建议今日面对。',
  'art-amirat': '一手材料已回溯到位，隐私处理是唯一未决项。若今日完成身份细节复核，可进入发布流程。',
  'art-estria': '两方立场目前只有一方有书面材料。建议先取得另一方的完整提交文件，而不是以现有材料勉强平衡。',
}

function briefFor(
  date: string, articles: Article[], greeting: string,
  topFiveIds: string[], recommendedIds: string[], researchIds: string[],
  coverage: DailyBrief['coverage'],
): DailyBrief {
  return {
    id: `brief-${date}`,
    date,
    greeting,
    topFive: topFiveIds
      .filter((id) => SIGNALS.some((s) => s.id === id))
      .map((signalId) => ({ signalId, why: TOP_FIVE_WHY[signalId] ?? '当日新增的一手材料使这条线索具备可核查性。' })),
    recommended: recommendedIds
      .filter((id) => articles.some((a) => a.id === id))
      .map((articleId) => ({ articleId, why: RECOMMENDED_WHY[articleId] ?? '证据结构已经稳定，剩余问题属于编辑判断。' })),
    pendingArticleIds: pending(articles),
    researchIds,
      riskAlerts: riskAlerts(articles),
    citationFailures: citationFailures(articles),
    updateNeeded: updateNeeded(articles),
    coverage,
    sentTo: 'editor@demo.prism.invalid',
    demo: true,
  }
}

export function buildBriefs(articles: Article[]): DailyBrief[] {
  return [
    briefFor(
      '2026-08-31', articles,
      '今天有三篇稿件在等你，其中马兰群岛那一篇涉及进行中的司法程序与一名受法律保护的未成年人，发布前必须逐项确认。' +
      '编辑台昨夜检索了 11 个语种、1,842 条原始条目，合并后剩 24 个聚类；有 3 个聚类因为无法回溯到任何一手记录而没有进入起草，' +
      '其中传播量最大的一条是一张无法验证的通函截图。图兰那篇的一手来源仍然只有 1 份，没有达到本站 2 份的下限，请不要因为它时效性强就放宽标准。',
      ['sig-001', 'sig-002', 'sig-003', 'sig-004', 'sig-005'],
      ['art-maran', 'art-amirat', 'art-estria'],
      ['res-001', 'res-006', 'res-012', 'res-014', 'res-015'],
      { countries: 11, languages: 11, primaryDocs: 15, clustersMerged: 24 },
    ),
    briefFor(
      '2026-08-30', articles,
      '昨夜的运行没有产生高风险稿件，但有两件事值得你先看：东埃斯特里亚的指南修订听证记录只公开了一方的完整提交文件，' +
      '在另一方材料到手前，任何「两种立场势均力敌」的写法都是虚假平衡；另外，来源库在上午出现了一批 URL 同步异常，' +
      '发布锁已开启并在确认无影响后解除，过程记录在操作日志里。',
      ['sig-009', 'sig-010', 'sig-008', 'sig-014', 'sig-013'],
      ['art-curriculum', 'art-estria'],
      ['res-002', 'res-007', 'res-009', 'res-013'],
      { countries: 11, languages: 10, primaryDocs: 12, clustersMerged: 21 },
    ),
    briefFor(
      '2026-08-29', articles,
      '卡利桑那篇的核心问题不是哪个数字对，而是两个数字测量的根本不是同一件事。' +
      '编辑台把它写成了「差距」而不是「真相」，请重点看这个处理方式是否站得住。' +
      '另有一条本地论坛流传的案件细节，因包含侵害过程描述与可识别信息，已按创伤知情准则不予采用，理由留在信号页上。',
      ['sig-017', 'sig-018', 'sig-021', 'sig-023'],
      ['art-kalisan', 'art-funding'],
      ['res-003', 'res-005', 'res-010', 'res-011'],
      { countries: 10, languages: 10, primaryDocs: 9, clustersMerged: 18 },
    ),
  ]
}
