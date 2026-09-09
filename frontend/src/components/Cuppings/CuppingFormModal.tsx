import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Minus, Plus } from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { type CuppingPublic, CuppingsService } from "@/client"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/ui/loading-button"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import { BREW_STYLE_OPTIONS, ROASTING_MACHINE_OPTIONS } from "./constants"
import { SegmentedToggle } from "./SegmentedToggle"

const formSchema = z.object({
  order_id: z.coerce.number().int().min(0),
  roast_id: z.coerce.number().int().min(0),
  roasting_machine: z.enum(["sagvag", "hq_loring", "na_robert"]),
  brew_style: z.enum(["brew", "cupping", "spro"]),
  manual_name: z.string().optional(),
  fragrance_score: z.coerce.number().min(0).max(10),
  aroma_score: z.coerce.number().min(0).max(10),
  taste_score: z.coerce.number().min(0).max(10),
  aftertaste_score: z.coerce.number().min(0).max(10),
  notes: z.string().optional(),
})

type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>

const emptyDefaults: FormInput = {
  order_id: 0,
  roast_id: 0,
  roasting_machine: "sagvag",
  brew_style: "cupping",
  manual_name: "",
  fragrance_score: 0,
  aroma_score: 0,
  taste_score: 0,
  aftertaste_score: 0,
  notes: "",
}

function toFormValues(cupping: CuppingPublic): FormInput {
  return {
    order_id: cupping.order_id,
    roast_id: cupping.roast_id,
    roasting_machine: cupping.roasting_machine,
    brew_style: cupping.brew_style,
    manual_name: cupping.manual_name ?? "",
    fragrance_score: cupping.fragrance_score,
    aroma_score: cupping.aroma_score,
    taste_score: cupping.taste_score,
    aftertaste_score: cupping.aftertaste_score,
    notes: cupping.notes ?? "",
  }
}

export function CuppingFormModal({
  open,
  onOpenChange,
  cupping,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cupping?: CuppingPublic | null
}) {
  const isEdit = !!cupping
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormInput, any, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyDefaults,
  })

  // Only re-sync when the dialog opens or the target row changes, not on
  // every keystroke inside the form (form.reset identity is stable but
  // including it isn't necessary here).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (open) {
      form.reset(cupping ? toFormValues(cupping) : emptyDefaults)
    }
  }, [open, cupping])

  const mutation = useMutation({
    mutationFn: (data: FormOutput) =>
      isEdit
        ? CuppingsService.updateCupping({
            path: { id: cupping.id },
            body: data,
          })
        : CuppingsService.createCupping({ body: data }),
    onSuccess: () => {
      showSuccessToast(
        isEdit ? "Cupping updated successfully" : "Cupping added successfully",
      )
      onOpenChange(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cuppings"] })
    },
  })

  const onSubmit = (data: FormOutput) => {
    mutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 max-h-[90vh] sm:max-w-xl">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex-row items-center justify-between gap-4 space-y-0">
          <DialogTitle>{isEdit ? "Edit Cupping" : "Add Cupping"}</DialogTitle>
          <LoadingButton
            type="submit"
            form="cupping-form"
            loading={mutation.isPending}
            className="mr-6"
          >
            {isEdit ? "Save" : "Submit"}
          </LoadingButton>
        </DialogHeader>

        <form
          id="cupping-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="overflow-y-auto px-6 py-4 flex flex-col gap-5"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Order ID</Label>
              <Controller
                control={form.control}
                name="order_id"
                render={({ field }) => (
                  <ButtonGroup>
                    <Button
                      type="button"
                      variant="outline"
                      className="size-11 shrink-0"
                      onClick={() =>
                        field.onChange(Math.max(0, Number(field.value) - 1))
                      }
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Input
                      className="h-11 text-center"
                      type="number"
                      min={0}
                      value={field.value as string | number}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="size-11 shrink-0"
                      onClick={() => field.onChange(Number(field.value) + 1)}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </ButtonGroup>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roast_id">Roast ID</Label>
              <Input
                id="roast_id"
                className="h-11"
                type="number"
                min={0}
                {...form.register("roast_id")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Roasting Machine</Label>
            <Controller
              control={form.control}
              name="roasting_machine"
              render={({ field }) => (
                <SegmentedToggle
                  options={ROASTING_MACHINE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Brew Style</Label>
            <Controller
              control={form.control}
              name="brew_style"
              render={({ field }) => (
                <SegmentedToggle
                  options={BREW_STYLE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual_name">Manual Name (optional)</Label>
            <Input
              id="manual_name"
              className="h-11"
              placeholder="e.g. Ethiopia Yirgacheffe"
              {...form.register("manual_name")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fragrance_score">Fragrance</Label>
              <Input
                id="fragrance_score"
                className="h-11"
                type="number"
                min={0}
                max={10}
                step={0.25}
                {...form.register("fragrance_score")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="aroma_score">Aroma</Label>
              <Input
                id="aroma_score"
                className="h-11"
                type="number"
                min={0}
                max={10}
                step={0.25}
                {...form.register("aroma_score")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taste_score">Taste</Label>
              <Input
                id="taste_score"
                className="h-11"
                type="number"
                min={0}
                max={10}
                step={0.25}
                {...form.register("taste_score")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="aftertaste_score">Aftertaste</Label>
              <Input
                id="aftertaste_score"
                className="h-11"
                type="number"
                min={0}
                max={10}
                step={0.25}
                {...form.register("aftertaste_score")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={5}
              placeholder="Tasting notes..."
              {...form.register("notes")}
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
