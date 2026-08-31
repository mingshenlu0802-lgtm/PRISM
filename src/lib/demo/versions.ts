/** PLACEHOLDER — replaced by the editorial content wave. */
import type { Article, Version } from '../types'
export function buildVersions(articles: Article[]): Version[] {
  return articles.map((a) => ({
    id: a.currentVersionId,
    articleId: a.id,
    n: 1,
    label: '初稿',
    createdAt: a.createdAt,
    author: 'ai-desk' as const,
    summary: '占位版本。',
    refDelta: { added: [], removed: [] },
    snapshot: a,
    state: 'adopted' as const,
    stats: { added: 0, removed: 0, changed: 0 },
  }))
}
