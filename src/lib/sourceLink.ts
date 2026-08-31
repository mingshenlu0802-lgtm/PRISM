/**
 * References have to be usable.
 *
 * A source URL is rendered as a real, clickable link whenever it points at a
 * real host. Only the reserved placeholder domain this prototype ships with
 * stays inert — a fake link that navigates somewhere is worse than one that
 * openly says it goes nowhere.
 *
 * When the desk runs for real, retrieval fills these in with live URLs and
 * every reference on the site becomes clickable without a code change.
 */

/** RFC 2606 reserves `.invalid`; nothing there can ever resolve. */
const PLACEHOLDER = /(^|\.)invalid$|(^|\.)example\.(com|net|org)$/i

export function isPlaceholderUrl(url: string): boolean {
  try {
    return PLACEHOLDER.test(new URL(url).hostname)
  } catch {
    return true
  }
}

/** Hostname without `www.`, for a compact display label. */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
