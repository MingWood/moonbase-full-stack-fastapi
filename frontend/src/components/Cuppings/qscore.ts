/**
 * ROUND((
 *   fragrance_score +
 *   COALESCE(NULLIF(aroma_score, 0), fragrance_score) +
 *   taste_score +
 *   COALESCE(NULLIF(aftertaste_score, 0), taste_score)
 * ) / 4 * 7 + 30, 2)
 */
export function calculateQScore(
  fragrance: number,
  aroma: number,
  taste: number,
  aftertaste: number,
): number {
  const effectiveAroma = aroma !== 0 ? aroma : fragrance
  const effectiveAftertaste = aftertaste !== 0 ? aftertaste : taste
  const raw =
    ((fragrance + effectiveAroma + taste + effectiveAftertaste) / 4) * 7 + 30
  return Math.round(raw * 100) / 100
}
