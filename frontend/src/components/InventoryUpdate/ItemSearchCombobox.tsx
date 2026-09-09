import { useQuery } from "@tanstack/react-query"
import { Loader2, Search, X } from "lucide-react"
import { useEffect, useState } from "react"

import { InventoryService } from "@/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface SelectedItem {
  id: string
  name: string
  unit: string
  current_qty: number
}

export function ItemSearchCombobox({
  value,
  onSelect,
  onClear,
}: {
  value: SelectedItem | null
  onSelect: (item: SelectedItem) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(timeout)
  }, [query])

  const { data, isFetching } = useQuery({
    queryKey: ["inventory-search", debouncedQuery],
    queryFn: async () =>
      (
        await InventoryService.readInventoryItems({
          query: { q: debouncedQuery, limit: 8 },
        })
      ).data,
    enabled: isOpen && debouncedQuery.length > 0,
  })
  // Debounce means the user can still be "typing" for up to 250ms after the
  // last keystroke before the query even starts - show the loader then too,
  // not just while isFetching is true, so it doesn't flash "No matching items".
  const isSearching =
    isFetching || (query !== debouncedQuery && query.length > 0)

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{value.name}</p>
          <p className="text-xs text-muted-foreground">
            {value.current_qty} {value.unit} on hand
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onClear}
        >
          <X className="size-4" />
          <span className="sr-only">Change item</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        {isSearching ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        )}
        <Input
          className="pl-9 h-11"
          placeholder="Search item by name..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />
      </div>
      {isOpen && debouncedQuery.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-y-auto">
          {isSearching ? (
            <p className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching...
            </p>
          ) : data && data.data.length > 0 ? (
            data.data.map((item) => (
              <button
                key={item.id}
                type="button"
                className="block w-full text-left px-3 py-2.5 text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect({
                    id: item.id,
                    name: item.name,
                    unit: item.unit,
                    current_qty: item.current_qty,
                  })
                  setQuery("")
                  setIsOpen(false)
                }}
              >
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {item.current_qty} {item.unit}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">
              No matching items
            </p>
          )}
        </div>
      )}
    </div>
  )
}
