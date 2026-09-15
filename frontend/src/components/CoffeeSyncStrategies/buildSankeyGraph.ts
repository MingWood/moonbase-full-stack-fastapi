import type { RetoolCoffeeSyncStrategyPublic } from "@/client"

export type SankeySite = "retail" | "wholesale"

export interface SankeyGraphNode {
  [key: string]: unknown
  id: string
  label: string
  kind: "name" | "site" | "bagSize"
  site?: SankeySite
  /** Position within this site's ascending bag-size list, for the ordinal color ramp. */
  tierIndex?: number
  tierCount?: number
  /**
   * The stored percentage this node represents - percentage_site_mix for a
   * site node, percentage_sku_mix (relative to that site, not the whole
   * strategy) for a bag-size node. Shown in labels/tooltips. Deliberately
   * separate from the d3-sankey-computed `value`, which links use on a
   * common total-relative scale so flow conserves and node heights lay out
   * correctly - see buildSankeyGraph's rescaling comment below.
   */
  displayPercent: number
  /**
   * Fixed vertical ordering key within a node's column - passed to
   * d3-sankey's nodeSort so retail's whole branch always renders above
   * wholesale's, with no crossings between them, regardless of row order
   * or the layout's own crossing-minimization heuristic.
   */
  sortKey: number
}

export interface SankeyGraphLink {
  [key: string]: unknown
  source: string
  target: string
  value: number
}

export function formatStrategyName(name: string): string {
  return name.replace(/_/g, " ")
}

export function formatBagSize(grams: number): string {
  return grams >= 1000 && grams % 1000 === 0 ? `${grams / 1000}kg` : `${grams}g`
}

export function formatSite(site: SankeySite): string {
  return site === "wholesale" ? "Wholesale" : "Retail"
}

// Retail always ranks above wholesale - see sortKey on SankeyGraphNode.
function siteRank(site: SankeySite): number {
  return site === "retail" ? 0 : 1
}

/**
 * Builds a two-stage Sankey graph (site, then bag size within each site)
 * for one coffee_sync_strategies name group.
 *
 * percentage_site_mix is denormalized onto every bag-size row for a site,
 * so it's read once per site (not summed) to get the site split. Rows with
 * a zero percentage (no flow) are dropped rather than drawn as an
 * invisible link.
 */
export function buildSankeyGraph(
  rootLabel: string,
  rows: RetoolCoffeeSyncStrategyPublic[],
): { nodes: SankeyGraphNode[]; links: SankeyGraphLink[] } {
  const rootId = "root"
  const nodes = new Map<string, SankeyGraphNode>()
  const links: SankeyGraphLink[] = []

  nodes.set(rootId, {
    id: rootId,
    label: rootLabel,
    kind: "name",
    displayPercent: 100,
    sortKey: 0,
  })

  const siteMix = new Map<SankeySite, number>()
  for (const row of rows) {
    const site = row.site as SankeySite | null | undefined
    if (!site || siteMix.has(site)) continue
    siteMix.set(site, row.percentage_site_mix ?? 0)
  }

  for (const [site, pct] of siteMix) {
    if (pct <= 0) continue
    const siteId = `site:${site}`
    nodes.set(siteId, {
      id: siteId,
      label: formatSite(site),
      kind: "site",
      site,
      displayPercent: pct,
      sortKey: siteRank(site),
    })
    links.push({ source: rootId, target: siteId, value: pct })
  }

  const bagSizesBySite = new Map<SankeySite, { grams: number; pct: number }[]>()
  const seenBagRows = new Set<string>()
  for (const row of rows) {
    const site = row.site as SankeySite | null | undefined
    const grams = row.bag_size_grams
    const pct = row.percentage_sku_mix ?? 0
    if (!site || !grams || pct <= 0 || (siteMix.get(site) ?? 0) <= 0) continue
    const dedupeKey = `${site}:${grams}`
    if (seenBagRows.has(dedupeKey)) continue
    seenBagRows.add(dedupeKey)
    if (!bagSizesBySite.has(site)) bagSizesBySite.set(site, [])
    // biome-ignore lint/style/noNonNullAssertion: just set above if missing
    bagSizesBySite.get(site)!.push({ grams, pct })
  }

  for (const [site, sizes] of bagSizesBySite) {
    sizes.sort((a, b) => a.grams - b.grams)
    const siteId = `site:${site}`
    const siteMixPct = siteMix.get(site) ?? 0
    sizes.forEach(({ grams, pct }, tierIndex) => {
      const bagId = `bag:${site}:${grams}`
      nodes.set(bagId, {
        id: bagId,
        label: formatBagSize(grams),
        kind: "bagSize",
        site,
        tierIndex,
        tierCount: sizes.length,
        displayPercent: pct,
        // siteRank * 1000 keeps every retail bag node's key below every
        // wholesale one, however many tiers either site has.
        sortKey: siteRank(site) * 1000 + tierIndex,
      })
      // percentage_sku_mix is relative to its own site's 100%, not the
      // strategy total - rescale onto the same total-relative scale as the
      // site link (siteMixPct) so this node's incoming/outgoing flow
      // conserves and d3-sankey sizes/positions it correctly. The
      // un-rescaled `pct` is still what's shown, via displayPercent above.
      const scaledValue = (siteMixPct * pct) / 100
      links.push({ source: siteId, target: bagId, value: scaledValue })
    })
  }

  return { nodes: Array.from(nodes.values()), links }
}
