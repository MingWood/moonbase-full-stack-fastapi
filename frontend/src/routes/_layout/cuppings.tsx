import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Coffee, Plus, Search } from "lucide-react"
import { Fragment, Suspense, useState } from "react"

import type { CuppingPublic } from "@/client"
import { CuppingsService } from "@/client"
import { CuppingFormModal } from "@/components/Cuppings/CuppingFormModal"
import { CuppingRow } from "@/components/Cuppings/CuppingRow"
import {
  BREW_STYLE_OPTIONS,
  ROASTING_MACHINE_OPTIONS,
} from "@/components/Cuppings/constants"
import {
  type DateRange,
  DateRangeFilter,
} from "@/components/Cuppings/DateRangeFilter"
import { SegmentedToggle } from "@/components/Cuppings/SegmentedToggle"
import PendingCuppings from "@/components/Pending/PendingCuppings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import useAuth from "@/hooks/useAuth"
import { formatEpochMsDate } from "@/lib/datetime"
import { substringMatchAny } from "@/lib/fuzzy"

const SCOPE_OPTIONS: { value: "all" | "mine"; label: string }[] = [
  { value: "all", label: "Show All" },
  { value: "mine", label: "Show Me" },
]

function cuppingSearchableFields(cupping: CuppingPublic): string[] {
  return [
    String(cupping.roast_id),
    String(cupping.order_id),
    cupping.manual_name ?? "",
    cupping.resolved_name ?? "",
    cupping.notes ?? "",
    cupping.who_tasted,
    ROASTING_MACHINE_OPTIONS.find((o) => o.value === cupping.roasting_machine)
      ?.label ?? cupping.roasting_machine,
    BREW_STYLE_OPTIONS.find((o) => o.value === cupping.brew_style)?.label ??
      cupping.brew_style,
    formatEpochMsDate(cupping.date),
  ]
}

function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-3 pb-1 first:pt-0">
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function getCuppingsQueryOptions(range: DateRange) {
  return {
    queryFn: async () =>
      (
        await CuppingsService.readCuppings({
          query: {
            start_ms: range.start ?? undefined,
            end_ms: range.end ?? undefined,
            limit: 500,
          },
        })
      ).data,
    queryKey: ["cuppings", range.start, range.end],
  }
}

export const Route = createFileRoute("/_layout/cuppings")({
  component: CuppingsPage,
  head: () => ({
    meta: [
      {
        title: "Cuppings - Moonbase Coffee",
      },
    ],
  }),
})

function CuppingsListContent({
  range,
  search,
  scope,
  onEdit,
}: {
  range: DateRange
  search: string
  scope: "all" | "mine"
  onEdit: (cupping: CuppingPublic) => void
}) {
  const { data: cuppings } = useSuspenseQuery(getCuppingsQueryOptions(range))
  const { user: currentUser } = useAuth()
  const isFiltered = range.start != null || range.end != null

  if (cuppings.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Coffee className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">
          {isFiltered ? "No cuppings in this range" : "No cuppings yet"}
        </h3>
        <p className="text-muted-foreground">
          {isFiltered
            ? "Try a different date range"
            : "Tap Add to record your first cupping"}
        </p>
      </div>
    )
  }

  const currentUserIdentity = currentUser
    ? currentUser.full_name || currentUser.email
    : null
  const filtered = cuppings.data.filter(
    (cupping) =>
      (scope === "all" || cupping.who_tasted === currentUserIdentity) &&
      substringMatchAny(search.trim(), cuppingSearchableFields(cupping)),
  )

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

  let previousDayKey: string | null = null

  return (
    <div className="flex flex-col gap-2">
      {filtered.map((cupping) => {
        const currentDayKey = dayKey(cupping.date)
        const showSeparator = currentDayKey !== previousDayKey
        previousDayKey = currentDayKey

        return (
          <Fragment key={cupping.id}>
            {showSeparator && (
              <DateSeparator label={formatEpochMsDate(cupping.date)} />
            )}
            <CuppingRow cupping={cupping} onClick={() => onEdit(cupping)} />
          </Fragment>
        )
      })}
    </div>
  )
}

function CuppingsPage() {
  const [range, setRange] = useState<DateRange>({ start: null, end: null })
  const [search, setSearch] = useState("")
  const [scope, setScope] = useState<"all" | "mine">("all")
  const [modalTarget, setModalTarget] = useState<CuppingPublic | "new" | null>(
    null,
  )
  const { data: cuppings } = useQuery(getCuppingsQueryOptions(range))
  const lastCupping = cuppings?.data[cuppings.data.length - 1]
  const nextOrderId = lastCupping ? lastCupping.order_id + 1 : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-16 z-10 -mx-6 md:-mx-8 flex flex-col gap-3 border-b bg-background px-6 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              placeholder="Search cuppings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button className="h-11" onClick={() => setModalTarget("new")}>
            <Plus className="mr-2 size-4" />
            Add
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <DateRangeFilter value={range} onChange={setRange} />
          <div className="w-44 shrink-0">
            <SegmentedToggle
              options={SCOPE_OPTIONS}
              value={scope}
              onChange={setScope}
            />
          </div>
        </div>
      </div>

      <Suspense fallback={<PendingCuppings />}>
        <CuppingsListContent
          range={range}
          search={search}
          scope={scope}
          onEdit={setModalTarget}
        />
      </Suspense>

      <CuppingFormModal
        open={modalTarget !== null}
        onOpenChange={(open) => {
          if (!open) setModalTarget(null)
        }}
        cupping={modalTarget && modalTarget !== "new" ? modalTarget : undefined}
        defaultOrderId={nextOrderId}
      />
    </div>
  )
}
