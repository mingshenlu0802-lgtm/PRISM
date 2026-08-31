/**
 * Small helpers shared by the brief builder.
 *
 * Kept separate from selectors.ts so the demo layer never imports from the
 * app layer — the dependency runs one way only.
 */
import type { Article, CitationCheck, RiskFlag } from '../types'

/** Unresolved flags that the editor still has to decide about. */
export function riskOf(a: Article): RiskFlag[] {
  return a.riskFlags.filter((r) => !r.resolved && (r.severity === 'critical' || r.severity === 'high'))
}

/** Failures that still block publishing — acknowledged ones do not. */
export function blockingChecksOf(a: Article): CitationCheck[] {
  return a.citationChecks.filter((c) => c.status === 'missing' && !c.acknowledged)
}
