import { Minus, Plus, Trash2 } from "lucide-react"
import { type Control, Controller } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ItemSearchCombobox } from "./ItemSearchCombobox"
import type { AdjustmentFormInput } from "./schema"

export function AdjustmentRow({
  control,
  index,
  onRemove,
}: {
  control: Control<AdjustmentFormInput>
  index: number
  onRemove: () => void
}) {
  return (
    <Card className="py-4">
      <CardContent className="px-4 flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <Controller
              control={control}
              name={`rows.${index}.item`}
              render={({ field, fieldState }) => (
                <>
                  <ItemSearchCombobox
                    value={field.value}
                    onSelect={field.onChange}
                    onClear={() => field.onChange(null)}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive mt-1">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 text-muted-foreground"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Remove row</span>
          </Button>
        </div>

        <Controller
          control={control}
          name={`rows.${index}.changeType`}
          render={({ field }) => (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={field.value === "addition" ? "default" : "outline"}
                className="flex-1 h-11"
                onClick={() => field.onChange("addition")}
              >
                <Plus className="mr-1 size-4" />
                Add
              </Button>
              <Button
                type="button"
                variant={field.value === "subtraction" ? "default" : "outline"}
                className={cn(
                  "flex-1 h-11",
                  field.value === "subtraction" &&
                    "bg-destructive hover:bg-destructive/90",
                )}
                onClick={() => field.onChange("subtraction")}
              >
                <Minus className="mr-1 size-4" />
                Remove
              </Button>
            </div>
          )}
        />

        <Controller
          control={control}
          name={`rows.${index}.quantity`}
          render={({ field, fieldState }) => (
            <div>
              <ButtonGroup>
                <Button
                  type="button"
                  variant="outline"
                  className="size-11 shrink-0"
                  onClick={() => {
                    const current = Number(field.value) || 0
                    field.onChange(String(Math.max(0, current - 1)))
                  }}
                >
                  <Minus className="size-4" />
                </Button>
                <Input
                  className="h-11 text-center"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="size-11 shrink-0"
                  onClick={() => {
                    const current = Number(field.value) || 0
                    field.onChange(String(current + 1))
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </ButtonGroup>
              {fieldState.error && (
                <p className="text-xs text-destructive mt-1">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />

        <Controller
          control={control}
          name={`rows.${index}.note`}
          render={({ field }) => (
            <Input
              className="h-11"
              placeholder="Note (optional)"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </CardContent>
    </Card>
  )
}
