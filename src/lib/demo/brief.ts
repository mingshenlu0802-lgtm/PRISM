/** PLACEHOLDER — replaced by the editorial content wave. */
import type { Article, DailyBrief } from '../types'
export function buildBriefs(articles: Article[]): DailyBrief[] {
  return [{
    id: 'brief-2026-08-31',
    date: '2026-08-31',
    greeting: '占位简报。',
    topFive: [],
    recommended: [],
    pendingArticleIds: articles.filter((a) => a.status === 'in-review').map((a) => a.id),
    researchIds: [],
    suspiciousClaimIds: [],
    riskAlerts: [],
    citationFailures: [],
    updateNeeded: [],
    coverage: { countries: 0, languages: 0, primaryDocs: 0, clustersMerged: 0 },
    sentTo: 'editor@demo.prism.invalid',
    demo: true,
  }]
}
