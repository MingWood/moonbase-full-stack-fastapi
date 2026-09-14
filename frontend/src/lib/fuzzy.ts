/**
 * Subsequence-based fuzzy match: true if every character of `query` appears
 * in `target`, in order, case-insensitively (not necessarily consecutive).
 */
export function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

export function fuzzyMatchAny(query: string, targets: string[]): boolean {
  if (!query) return true
  return targets.some((target) => fuzzyMatch(query, target))
}

/**
 * Case-insensitive substring match. Stricter than fuzzyMatch - useful when
 * targets are long free text (e.g. notes), where subsequence matching finds
 * false positives just from common letters appearing in the right order.
 */
export function substringMatch(query: string, target: string): boolean {
  if (!query) return true
  return target.toLowerCase().includes(query.toLowerCase())
}

export function substringMatchAny(query: string, targets: string[]): boolean {
  if (!query) return true
  return targets.some((target) => substringMatch(query, target))
}
