import { sankey, sankeyLinkHorizontal, type SankeyNode } from "d3-sankey"
import { useMemo } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { SankeyGraphLink, SankeyGraphNode } from "./buildSankeyGraph"

const WIDTH = 720
const HEIGHT = 158
const NODE_WIDTH = 10
const NODE_PADDING = 10
// Below this rendered height, a node's slice is too thin for its direct
// label to clear its neighbors without overlapping - per the dataviz
// skill's overflow rule, drop the label rather than let it collide, and
// let the (still-present) hover tooltip carry the value instead.
const MIN_LABEL_NODE_HEIGHT = 13

// Ordinal ramp for bag-size tiers: each step mixes the site's categorical
// color toward the chart surface, smallest bag = full color, largest =
// most washed out. Capped short of 100% so the lightest step still clears
// roughly 2:1 contrast against the surface.
const MAX_TIER_MIX = 55

function tierMixPercent(tierIndex: number, tierCount: number): number {
  if (tierCount <= 1) return 0
  return Math.round((tierIndex / (tierCount - 1)) * MAX_TIER_MIX)
}

function siteColorVar(site: SankeyGraphNode["site"]): string {
  return site === "wholesale" ? "var(--sync-wholesale)" : "var(--sync-retail)"
}

function nodeFill(node: SankeyGraphNode): string {
  if (node.kind === "name") return "var(--sync-root)"
  if (node.kind === "site") return siteColorVar(node.site)
  const mix = tierMixPercent(node.tierIndex ?? 0, node.tierCount ?? 1)
  if (mix === 0) return siteColorVar(node.site)
  return `color-mix(in oklch, ${siteColorVar(node.site)} ${100 - mix}%, var(--card) ${mix}%)`
}

type LayoutNode = SankeyNode<SankeyGraphNode, SankeyGraphLink>

export function SankeyDiagram({
  nodes,
  links,
}: {
  nodes: SankeyGraphNode[]
  links: SankeyGraphLink[]
}) {
  const layout = useMemo(() => {
    const generator = sankey<SankeyGraphNode, SankeyGraphLink>()
      .nodeId((d) => d.id)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      // Fixes vertical order within each column to sortKey instead of
      // d3-sankey's default crossing-minimization heuristic, so retail's
      // whole branch always renders above wholesale's with no crossings
      // between them.
      .nodeSort((a, b) => a.sortKey - b.sortKey)
      .extent([
        [1, 6],
        [WIDTH - 1, HEIGHT - 6],
      ])
    return generator({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    })
  }, [nodes, links])

  const linkPath = sankeyLinkHorizontal<SankeyGraphNode, SankeyGraphLink>()

  return (
    // Site categorical colors (fixed order, slots 1 and 2) and their
    // dark-mode steps - see the dataviz skill's validated palette.
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-auto [--sync-root:var(--muted-foreground)] [--sync-retail:#2a78d6] [--sync-wholesale:#1baf7a] dark:[--sync-retail:#3987e5] dark:[--sync-wholesale:#199e70]"
      role="img"
      aria-label="Sankey diagram: site split, then bag size mix within each site"
    >
      <title>Site split, then bag size mix within each site</title>
      <g>
        {layout.links.map((link, i) => {
          const source = link.source as LayoutNode
          const target = link.target as LayoutNode
          const color = siteColorVar(target.site ?? source.site)
          const path = linkPath(link)
          if (!path) return null
          return (
            <Tooltip key={`${source.id}->${target.id}-${i}`}>
              <TooltipTrigger asChild>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.35}
                  strokeWidth={Math.max(1, link.width ?? 0)}
                  className="cursor-default transition-[stroke-opacity] duration-150 hover:stroke-opacity-60"
                />
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-semibold tabular-nums">
                  {target.displayPercent}%
                </span>{" "}
                {source.label} &rarr; {target.label}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </g>
      <g>
        {layout.nodes.map((node) => {
          const x0 = node.x0 ?? 0
          const x1 = node.x1 ?? 0
          const y0 = node.y0 ?? 0
          const y1 = node.y1 ?? 0
          const labelOnRight = x0 < WIDTH / 2
          const showLabel =
            node.kind !== "name" && y1 - y0 >= MIN_LABEL_NODE_HEIGHT
          return (
            <Tooltip key={node.id}>
              <TooltipTrigger asChild>
                <g className="cursor-default">
                  <rect
                    x={x0}
                    y={y0}
                    width={Math.max(1, x1 - x0)}
                    height={Math.max(1, y1 - y0)}
                    rx={2}
                    fill={nodeFill(node)}
                  />
                  {showLabel && (
                    <text
                      x={labelOnRight ? x1 + 6 : x0 - 6}
                      y={(y0 + y1) / 2}
                      dy="0.32em"
                      textAnchor={labelOnRight ? "start" : "end"}
                      className="fill-foreground text-[10px]"
                    >
                      {node.label}
                      <tspan className="fill-muted-foreground tabular-nums">
                        {" "}
                        &middot; {node.displayPercent}%
                      </tspan>
                    </text>
                  )}
                </g>
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-semibold tabular-nums">
                  {node.displayPercent}%
                </span>{" "}
                {node.label}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </g>
    </svg>
  )
}
