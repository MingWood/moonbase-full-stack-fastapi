import { ChevronDown } from "lucide-react"
import { useMemo, useState } from "react"

import type { RetoolCoffeeSyncStrategyPublic } from "@/client"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  buildSankeyGraph,
  formatBagSize,
  formatSite,
  formatStrategyName,
  type SankeySite,
} from "./buildSankeyGraph"
import { SankeyDiagram } from "./SankeyDiagram"

export function StrategyCard({
  name,
  rows,
}: {
  name: string
  rows: RetoolCoffeeSyncStrategyPublic[]
}) {
  const label = formatStrategyName(name)
  const { nodes, links } = useMemo(
    () => buildSankeyGraph(label, rows),
    [label, rows],
  )
  const hasFlow = links.some((link) => link.value > 0)

  // Collapsed by default - a click toggles it open.
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-6 text-left"
      >
        <CardTitle className="capitalize">{label}</CardTitle>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="flex flex-col gap-3 pt-3">
            {hasFlow ? (
              <SankeyDiagram nodes={nodes} links={links} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No site or bag size mix recorded for this strategy.
              </p>
            )}

            {hasFlow && (
              <details className="group text-sm">
                <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
                  View as table
                </summary>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Site</TableHead>
                      <TableHead>Site mix</TableHead>
                      <TableHead>Bag size</TableHead>
                      <TableHead>SKU mix</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {row.site
                            ? formatSite(row.site as SankeySite)
                            : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {row.percentage_site_mix ?? 0}%
                        </TableCell>
                        <TableCell>
                          {row.bag_size_grams
                            ? formatBagSize(row.bag_size_grams)
                            : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {row.percentage_sku_mix ?? 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </details>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
