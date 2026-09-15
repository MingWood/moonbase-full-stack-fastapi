import { useMemo } from "react"

import type { RetoolCoffeeSyncStrategyPublic } from "@/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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
                      {row.site ? formatSite(row.site as SankeySite) : "—"}
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
    </Card>
  )
}
