import type { ColumnDef } from "@tanstack/react-table"
import { Filter } from "lucide-react"
import { useState } from "react"

import type { InventoryCategory, InventoryItemPublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatEpochMs } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import { CATEGORY_OPTIONS, UNIT_OPTIONS } from "./constants"
import DeleteInventoryItem from "./DeleteInventoryItem"
import { useUpdateInventoryItem } from "./useUpdateInventoryItem"

function EditableTextCell({
  itemId,
  field,
  value,
  placeholder,
  fitContent = false,
  expandable = false,
}: {
  itemId: string
  field: "name" | "supplier" | "notes" | "location" | "address"
  value: string
  placeholder?: string
  fitContent?: boolean
  expandable?: boolean
}) {
  const [text, setText] = useState(value)
  const [isEditing, setIsEditing] = useState(false)
  const mutation = useUpdateInventoryItem()

  const save = () => {
    if (text !== value) {
      mutation.mutate({ id: itemId, data: { [field]: text || null } })
    }
  }

  if (expandable) {
    if (!isEditing) {
      return (
        <button
          type="button"
          className="h-8 w-48 max-w-xs truncate text-left text-sm px-3 py-1 rounded-md border border-transparent hover:border-input hover:bg-accent/50"
          onClick={() => setIsEditing(true)}
        >
          {text || <span className="text-muted-foreground">{placeholder}</span>}
        </button>
      )
    }

    return (
      <Textarea
        className="w-64"
        rows={3}
        autoFocus
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) =>
          e.currentTarget.setSelectionRange(
            e.currentTarget.value.length,
            e.currentTarget.value.length,
          )
        }
        onBlur={() => {
          save()
          setIsEditing(false)
        }}
      />
    )
  }

  return (
    <Input
      className={fitContent ? "h-8 w-auto" : "h-8 min-w-32"}
      size={fitContent ? Math.min(Math.max(text.length, 8), 80) : undefined}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={save}
    />
  )
}

function EditableNumberCell({
  itemId,
  field,
  value,
  min = 0,
  allowEmpty = false,
}: {
  itemId: string
  field: "current_qty" | "reorder_threshold"
  value: number | null | undefined
  min?: number
  allowEmpty?: boolean
}) {
  const [text, setText] = useState(
    value === null || value === undefined ? "" : String(value),
  )
  const mutation = useUpdateInventoryItem()

  return (
    <Input
      className="h-8 w-24"
      type="number"
      min={min}
      step="any"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const original =
          value === null || value === undefined ? "" : String(value)
        if (text === original) return
        if (text === "") {
          if (allowEmpty)
            mutation.mutate({ id: itemId, data: { [field]: null } })
          else setText(original)
          return
        }
        const parsed = Number(text)
        if (Number.isNaN(parsed) || parsed < min) {
          setText(original)
          return
        }
        mutation.mutate({ id: itemId, data: { [field]: parsed } })
      }}
    />
  )
}

function CategoryCell({ item }: { item: InventoryItemPublic }) {
  const mutation = useUpdateInventoryItem()
  return (
    <Select
      value={item.category}
      onValueChange={(value) =>
        mutation.mutate({
          id: item.id,
          data: { category: value as InventoryItemPublic["category"] },
        })
      }
    >
      <SelectTrigger className="h-8 w-40" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CATEGORY_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CategoryFilterHeader({
  selected,
  onToggle,
  onClear,
}: {
  selected: Set<InventoryCategory>
  onToggle: (value: InventoryCategory) => void
  onClear: () => void
}) {
  const isActive = selected.size > 0

  return (
    <div className="flex items-center gap-1">
      <span>Category</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-6", isActive && "text-primary bg-accent")}
          >
            <Filter className="size-3.5" />
            <span className="sr-only">Filter by category</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {CATEGORY_OPTIONS.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={selected.has(opt.value)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => onToggle(opt.value)}
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
          {isActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onClear}>
                Clear filter
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function RunRateCell({ item }: { item: InventoryItemPublic }) {
  const rate = item.run_rate_per_month ?? 0
  if (rate === 0) {
    return <span className="text-muted-foreground text-sm">—</span>
  }
  const isConsuming = rate < 0
  return (
    <span
      className={cn(
        "text-sm font-medium tabular-nums whitespace-nowrap",
        isConsuming
          ? "text-red-600 dark:text-red-400"
          : "text-emerald-600 dark:text-emerald-400",
      )}
    >
      {rate > 0 ? "+" : ""}
      {rate.toFixed(1)} {item.unit}/mo
    </span>
  )
}

function MonthsRemainingCell({
  months,
}: {
  months: number | null | undefined
}) {
  if (months == null) {
    return <span className="text-muted-foreground text-sm">—</span>
  }
  const urgency =
    months < 1
      ? "text-red-600 dark:text-red-400"
      : months < 2
        ? "text-orange-600 dark:text-orange-400"
        : "text-foreground"
  return (
    <span
      className={cn(
        "text-sm font-medium tabular-nums whitespace-nowrap",
        urgency,
      )}
    >
      {months.toFixed(1)} mo
    </span>
  )
}

function UnitCell({ item }: { item: InventoryItemPublic }) {
  const mutation = useUpdateInventoryItem()
  return (
    <Select
      value={item.unit}
      onValueChange={(value) =>
        mutation.mutate({
          id: item.id,
          data: { unit: value as InventoryItemPublic["unit"] },
        })
      }
    >
      <SelectTrigger className="h-8 w-24" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {UNIT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export interface CategoryFilterProps {
  categoryFilter: Set<InventoryCategory>
  onToggleCategory: (value: InventoryCategory) => void
  onClearCategoryFilter: () => void
}

export function createColumns({
  categoryFilter,
  onToggleCategory,
  onClearCategoryFilter,
}: CategoryFilterProps): ColumnDef<InventoryItemPublic>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <EditableTextCell
          key={`${row.original.id}-${row.original.name}`}
          itemId={row.original.id}
          field="name"
          value={row.original.name}
          fitContent
        />
      ),
    },
    {
      accessorKey: "category",
      header: () => (
        <CategoryFilterHeader
          selected={categoryFilter}
          onToggle={onToggleCategory}
          onClear={onClearCategoryFilter}
        />
      ),
      cell: ({ row }) => (
        <CategoryCell
          key={`${row.original.id}-${row.original.category}`}
          item={row.original}
        />
      ),
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => (
        <UnitCell
          key={`${row.original.id}-${row.original.unit}`}
          item={row.original}
        />
      ),
    },
    {
      accessorKey: "current_qty",
      header: "Qty",
      cell: ({ row }) => (
        <EditableNumberCell
          key={`${row.original.id}-${row.original.current_qty}`}
          itemId={row.original.id}
          field="current_qty"
          value={row.original.current_qty}
        />
      ),
    },
    {
      accessorKey: "reorder_threshold",
      header: "Reorder At",
      cell: ({ row }) => (
        <EditableNumberCell
          key={`${row.original.id}-${row.original.reorder_threshold}`}
          itemId={row.original.id}
          field="reorder_threshold"
          value={row.original.reorder_threshold}
          allowEmpty
        />
      ),
    },
    {
      accessorKey: "run_rate_per_month",
      header: "Run Rate",
      cell: ({ row }) => <RunRateCell item={row.original} />,
    },
    {
      accessorKey: "months_remaining",
      header: "Months Left",
      cell: ({ row }) => (
        <MonthsRemainingCell months={row.original.months_remaining} />
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => (
        <EditableTextCell
          key={`${row.original.id}-${row.original.location}`}
          itemId={row.original.id}
          field="location"
          value={row.original.location ?? ""}
          placeholder="—"
        />
      ),
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <EditableTextCell
          key={`${row.original.id}-${row.original.address}`}
          itemId={row.original.id}
          field="address"
          value={row.original.address ?? ""}
          placeholder="—"
        />
      ),
    },
    {
      accessorKey: "supplier",
      header: "Supplier",
      cell: ({ row }) => (
        <EditableTextCell
          key={`${row.original.id}-${row.original.supplier}`}
          itemId={row.original.id}
          field="supplier"
          value={row.original.supplier ?? ""}
          placeholder="—"
        />
      ),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <EditableTextCell
          key={`${row.original.id}-${row.original.notes}`}
          itemId={row.original.id}
          field="notes"
          value={row.original.notes ?? ""}
          placeholder="—"
          expandable
        />
      ),
    },
    {
      accessorKey: "last_updated_ms",
      header: "Last Updated",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {formatEpochMs(row.original.last_updated_ms)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DeleteInventoryItem id={row.original.id} name={row.original.name} />
        </div>
      ),
    },
  ]
}
