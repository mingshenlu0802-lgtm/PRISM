/**
 * Demo dataset assembly.
 *
 * Every record below is fictional. Jurisdictions, courts, statistics offices,
 * journals, outlets and organisations do not exist; source URLs sit on the
 * reserved `.invalid` TLD and can never resolve. Nothing here is a real news
 * report, a real citation or a real person's words.
 */
import type { PrismState } from '../types'
import { SOURCES } from './sources'
import { CHARTS } from './charts'
import { ARTICLES } from './articles'
import { FACT_CHECKS } from './factchecks'
import { ASSETS } from './assets'
import { SIGNALS } from './signals'
import { RESEARCH, SUSPICIOUS } from './research'
import { buildVersions, currentVersionIdFor } from './versions'
import { buildBriefs } from './brief'
import { PIPELINE_RUNS } from './pipeline'
import { AUDIT } from './audit'

/** The prototype runs on a fixed clock so the demo is deterministic. */
export const TODAY = '2026-08-31'
export const NOW = '2026-08-31T06:40:00Z'

export function buildInitialState(): PrismState {
  // Each entry points at the newest adopted version of itself; the generator
  // owns that id so the two can never drift apart.
  const articles = ARTICLES.map((a) => ({ ...a, currentVersionId: currentVersionIdFor(a) }))
  const versions = buildVersions(articles)
  return {
    articles,
    sources: SOURCES,
    factChecks: FACT_CHECKS,
    signals: SIGNALS,
    research: RESEARCH,
    suspiciousClaims: SUSPICIOUS,
    assets: ASSETS,
    charts: CHARTS,
    versions,
    vibeRuns: [],
    briefs: buildBriefs(articles),
    pipelineRuns: PIPELINE_RUNS,
    audit: AUDIT,
    lock: { engaged: false },
    today: TODAY,
  }
}
