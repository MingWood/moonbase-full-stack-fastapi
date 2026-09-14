import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ClipboardList, Plus } from "lucide-react"
import { useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"

import { type InventoryAdjustmentIn, InventoryService } from "@/client"
import { AdjustmentRow } from "@/components/InventoryUpdate/AdjustmentRow"
import {
  type AdjustmentFormInput,
  type AdjustmentFormOutput,
  formSchema,
} from "@/components/InventoryUpdate/schema"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout/inventory-update")({
  component: InventoryUpdate,
  head: () => ({
    meta: [
      {
        title: "Inventory Update - Moonbase Coffee",
      },
    ],
  }),
})

const emptyRow = () => ({
  item: null,
  changeType: "subtraction" as const,
  quantity: "1",
  note: "",
})

interface SubmittedChange {
  id: string
  name: string
  delta: number
  unit: string
}

function InventoryUpdate() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  // In-memory only (no localStorage/sessionStorage) - intentionally cleared
  // on every page refresh, this is just a running log for the current visit.
  const [submittedChanges, setSubmittedChanges] = useState<SubmittedChange[]>(
    [],
  )

  const form = useForm<AdjustmentFormInput, any, AdjustmentFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: { rows: [] },
  })
  const { fields, append, remove } = useFieldArray<AdjustmentFormInput>({
    control: form.control,
    name: "rows",
  })

  const mutation = useMutation({
    mutationFn: (adjustments: InventoryAdjustmentIn[]) =>
      InventoryService.bulkAdjustInventory({ body: { adjustments } }),
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
  })

  const onSubmit = (data: AdjustmentFormOutput) => {
    const newChanges: SubmittedChange[] = data.rows.map((row) => ({
      id: crypto.randomUUID(),
      name: row.item.name,
      delta:
        row.changeType === "addition"
          ? Number(row.quantity)
          : -Number(row.quantity),
      unit: row.item.unit,
    }))

    mutation.mutate(
      data.rows.map((row) => ({
        inventory_item_id: row.item.id,
        change_type: row.changeType,
        quantity: Number(row.quantity),
        note: row.note || null,
      })),
      {
        onSuccess: () => {
          showSuccessToast("Inventory updated successfully")
          setSubmittedChanges((prev) => [...newChanges, ...prev])
          form.reset({ rows: [] })
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-24 sm:pb-6 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory Update</h1>
        <p className="text-muted-foreground">
          Record stock additions and subtractions
        </p>
      </div>

      {submittedChanges.length > 0 && (
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Recent Changes</h3>
          </div>
          <ul className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
            {submittedChanges.map((change) => (
              <li
                key={change.id}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="truncate">{change.name}</span>
                <span
                  className={
                    change.delta > 0
                      ? "text-green-600 dark:text-green-500 shrink-0"
                      : "text-red-600 dark:text-red-500 shrink-0"
                  }
                >
                  {change.delta > 0 ? "+" : ""}
                  {change.delta} {change.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fields.length === 0 && submittedChanges.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No changes yet</h3>
          <p className="text-muted-foreground mb-4">
            Tap the button below to record an addition or subtraction
          </p>
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <AdjustmentRow
              key={field.id}
              control={form.control}
              index={index}
              onRemove={() => remove(index)}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-12 border-dashed"
          onClick={() => append(emptyRow())}
        >
          <Plus className="mr-2 size-4" />
          Add Row
        </Button>

        {fields.length > 0 && (
          <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4 sm:static sm:border-0 sm:bg-transparent sm:p-0">
            <LoadingButton
              type="submit"
              className="w-full h-12 max-w-xl mx-auto flex"
              loading={mutation.isPending}
            >
              Submit
            </LoadingButton>
          </div>
        )}
      </form>
    </div>
  )
}
