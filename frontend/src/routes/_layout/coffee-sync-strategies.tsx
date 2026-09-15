import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { CoffeeSyncStrategiesService } from "@/client"
import { StrategyCard } from "@/components/CoffeeSyncStrategies/StrategyCard"
import PendingCoffeeSyncStrategies from "@/components/Pending/PendingCoffeeSyncStrategies"

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

function StrategiesGrid() {
  const { data } = useSuspenseQuery(getStrategiesQueryOptions())

  const byName = new Map<string, typeof data.data>()
  for (const row of data.data) {
    const name = row.name ?? "(unnamed)"
    if (!byName.has(name)) byName.set(name, [])
    // biome-ignore lint/style/noNonNullAssertion: just set above if missing
    byName.get(name)!.push(row)
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from(byName.entries()).map(([name, rows]) => (
        <StrategyCard key={name} name={name} rows={rows} />
      ))}
    </div>
  )
}

function CoffeeSyncStrategiesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Coffee Sync Strategies</h1>
        <p className="text-sm text-muted-foreground">
          One-time copy from Retool, read-only. Each diagram splits a
          strategy by site, then by bag size within each site.
        </p>
      </div>
      <Suspense fallback={<PendingCoffeeSyncStrategies />}>
        <StrategiesGrid />
      </Suspense>
    </div>
  )
}
