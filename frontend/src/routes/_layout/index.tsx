import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Coffee, Search } from "lucide-react"
import { Suspense, useMemo, useState } from "react"

import type { InventoryCategory, InventoryItemPublic } from "@/client"
import { InventoryService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import AddInventoryItem from "@/components/Inventory/AddInventoryItem"
import { createColumns } from "@/components/Inventory/columns"
import { CATEGORY_LABELS } from "@/components/Inventory/constants"
import PendingInventory from "@/components/Pending/PendingInventory"
import { Input } from "@/components/ui/input"
import { formatEpochMs } from "@/lib/datetime"
import { fuzzyMatchAny } from "@/lib/fuzzy"

function getInventoryQueryOptions() {
  return {
    queryFn: async () =>
      (
        await InventoryService.readInventoryItems({
          query: { skip: 0, limit: 200 },
        })
      ).data,
    queryKey: ["inventory"],
  }
}

export const Route = createFileRoute("/_layout/")({
  component: FullInventory,
  head: () => ({
    meta: [
      {
        title: "Full Inventory - Moonbase Coffee",
      },
    ],
  }),
})

function searchableFields(item: InventoryItemPublic): string[] {
  return [
    item.name,
    item.location ?? "",
    item.address ?? "",
    CATEGORY_LABELS[item.category] ?? item.category,
    item.unit,
    String(item.current_qty),
    item.reorder_threshold != null ? String(item.reorder_threshold) : "",
    item.supplier ?? "",
    item.notes ?? "",
    formatEpochMs(item.last_updated_ms),
  ]
}

function InventoryTableContent({ search }: { search: string }) {
  const { data: inventory } = useSuspenseQuery(getInventoryQueryOptions())
  const [categoryFilter, setCategoryFilter] = useState<Set<InventoryCategory>>(
    new Set(),
  )

  const columns = useMemo(
    () =>
      createColumns({
        categoryFilter,
        onToggleCategory: (value) =>
          setCategoryFilter((prev) => {
            const next = new Set(prev)
            if (next.has(value)) next.delete(value)
            else next.add(value)
            return next
          }),
        onClearCategoryFilter: () => setCategoryFilter(new Set()),
      }),
    [categoryFilter],
  )

  const filtered = useMemo(
    () =>
      inventory.data.filter(
        (item) =>
          (categoryFilter.size === 0 || categoryFilter.has(item.category)) &&
          fuzzyMatchAny(search.trim(), searchableFields(item)),
      ),
    [inventory.data, search, categoryFilter],
  )

  if (inventory.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Coffee className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No inventory yet</h3>
        <p className="text-muted-foreground">
          Add an item to start tracking your coffee inventory
        </p>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No matches found</h3>
        <p className="text-muted-foreground">
          Try a different search term or filter
        </p>
      </div>
    )
  }

  return <DataTable columns={columns} data={filtered} />
}

function InventoryTable({ search }: { search: string }) {
  return (
    <Suspense fallback={<PendingInventory />}>
      <InventoryTableContent search={search} />
    </Suspense>
  )
}

function FullInventory() {
  const [search, setSearch] = useState("")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Full Inventory</h1>
          <p className="text-muted-foreground">
            View and edit your coffee inventory
          </p>
        </div>
        <AddInventoryItem />
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search inventory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto min-w-0">
        <InventoryTable search={search} />
      </div>
    </div>
  )
}
