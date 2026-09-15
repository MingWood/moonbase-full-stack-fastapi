import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Suspense, useState } from "react"

import { CoffeeSyncStrategiesService } from "@/client"
import { StrategyCard } from "@/components/CoffeeSyncStrategies/StrategyCard"
import { formatStrategyName } from "@/components/CoffeeSyncStrategies/buildSankeyGraph"
import PendingCoffeeSyncStrategies from "@/components/Pending/PendingCoffeeSyncStrategies"
import { Input } from "@/components/ui/input"
import { substringMatch } from "@/lib/fuzzy"

export const Route = createFileRoute("/_layout/coffee-sync-strategies")({
  component: CoffeeSyncStrategiesPage,
  head: () => ({
    meta: [
      {
        title: "Coffee Sync Strategies - Moonbase Coffee",
      },
    ],
  }),
})

function getStrategiesQueryOptions() {
  return {
    queryKey: ["coffee-sync-strategies"],
    queryFn: async () =>
      (await CoffeeSyncStrategiesService.readCoffeeSyncStrategies()).data,
  }
}

function StrategiesGrid({ search }: { search: string }) {
  const { data } = useSuspenseQuery(getStrategiesQueryOptions())

  const byName = new Map<string, typeof data.data>()
  for (const row of data.data) {
    const name = row.name ?? "(unnamed)"
    if (!byName.has(name)) byName.set(name, [])
    // biome-ignore lint/style/noNonNullAssertion: just set above if missing
    byName.get(name)!.push(row)
  }

  const filtered = Array.from(byName.entries()).filter(([name]) =>
    substringMatch(search.trim(), formatStrategyName(name)),
  )

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        No strategies match "{search}"
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {filtered.map(([name, rows]) => (
        <StrategyCard key={name} name={name} rows={rows} />
      ))}
    </div>
  )
}

function CoffeeSyncStrategiesPage() {
  const [search, setSearch] = useState("")

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Coffee Sync Strategies</h1>
        <p className="text-sm text-muted-foreground">
          One-time copy from Retool, read-only. Each diagram splits a
          strategy by site, then by bag size within each site.
        </p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="h-11 pl-9"
          placeholder="Search strategies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Suspense fallback={<PendingCoffeeSyncStrategies />}>
        <StrategiesGrid search={search} />
      </Suspense>
    </div>
  )
}
