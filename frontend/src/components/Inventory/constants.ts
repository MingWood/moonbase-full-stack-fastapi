import type { InventoryCategory, InventoryUnit } from "@/client"

export const CATEGORY_OPTIONS: { value: InventoryCategory; label: string }[] = [
  { value: "green_coffee", label: "Green Coffee" },
  { value: "roasted_coffee", label: "Roasted Coffee" },
  { value: "packaging", label: "Packaging" },
  { value: "supplies", label: "Supplies" },
  { value: "clothing", label: "Clothing" },
  { value: "merch", label: "Merch" },
  { value: "glassware", label: "Glassware" },
  { value: "boh_ingredients", label: "BOH Ingredients" },
  { value: "to_go_serveware", label: "To Go Serveware" },
  { value: "other", label: "Other" },
]

export const UNIT_OPTIONS: { value: InventoryUnit; label: string }[] = [
  { value: "lbs", label: "lbs" },
  { value: "kg", label: "kg" },
  { value: "bags", label: "bags" },
  { value: "units", label: "units" },
  { value: "boxes", label: "boxes" },
  { value: "bottles", label: "bottles" },
]

export const CATEGORY_LABELS: Record<InventoryCategory, string> =
  Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label])) as Record<
    InventoryCategory,
    string
  >
