import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Minus,
  Plus,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
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
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { handleError } from "@/utils"
import {
  BREW_STYLE_OPTIONS,
  ROASTING_MACHINE_OPTIONS,
  roastingMachinePrefix,
} from "./constants"
import { NotesEditor, type NotesEditorHandle } from "./NotesEditor"
import { applyNoteTimestamp, toDisplayNotes } from "./notesFormat"
import { calculateQScore } from "./qscore"
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

const SCORE_FIELDS = [
  { name: "fragrance_score", label: "Fragrance" },
  { name: "aroma_score", label: "Aroma" },
  { name: "taste_score", label: "Taste" },
  { name: "aftertaste_score", label: "Aftertaste" },
] as const

function ScoreStepper({
  label,
  value,
  onChange,
  getBase,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  getBase: () => number
}) {
  const step = (delta: number) => {
    const base = value !== 0 ? value : getBase()
    const next = Math.min(
      10,
      Math.max(0, Math.round((base + delta) * 100) / 100),
    )
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <ButtonGroup className="w-full">
        <Button
          type="button"
          variant="outline"
          className="h-14 flex-1"
          onClick={() => step(-0.5)}
        >
          <ChevronsLeft className="size-5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-14 flex-1"
          onClick={() => step(-0.25)}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Input
          className="h-14 min-w-0 flex-[2] text-center text-lg font-semibold"
          type="number"
          min={0}
          max={10}
          step={0.25}
          value={value}
          onChange={(e) =>
            onChange(e.target.value === "" ? 0 : Number(e.target.value))
          }
        />
        <Button
          type="button"
          variant="outline"
          className="h-14 flex-1"
          onClick={() => step(0.25)}
        >
          <ChevronRight className="size-5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-14 flex-1"
          onClick={() => step(0.5)}
        >
          <ChevronsRight className="size-5" />
        </Button>
      </ButtonGroup>
    </div>
  )
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
    notes: toDisplayNotes(cupping.notes ?? ""),
  }
}

export function CuppingFormModal({
  open,
  onOpenChange,
  cupping,
  defaultOrderId = 0,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cupping?: CuppingPublic | null
  defaultOrderId?: number
}) {
  const isEdit = !!cupping
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // Editing an existing cupping starts collapsed to a one-line summary in
  // the header, to save space; adding a new one always starts expanded.
  const [compact, setCompact] = useState(false)

  const form = useForm<FormInput, any, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyDefaults,
  })

  // Tracks the notes exactly as they were when the dialog opened, so
  // submit-time diffing can tell "appended text" apart from edits to
  // previously entered content.
  const notesBaselineRef = useRef("")
  const notesEditorRef = useRef<NotesEditorHandle>(null)

  // Only re-sync when the dialog opens or the target row changes, not on
  // every keystroke inside the form (form.reset identity is stable but
  // including it isn't necessary here).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (open) {
      const values = cupping
        ? toFormValues(cupping)
        : { ...emptyDefaults, order_id: defaultOrderId }
      notesBaselineRef.current = values.notes ?? ""
      form.reset(values)
      notesEditorRef.current?.setDisplayValue(values.notes ?? "")
      setCompact(!!cupping)
    }
  }, [open, cupping, defaultOrderId])

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
    const elapsedMinutes =
      isEdit && cupping
        ? Math.max(0, Math.ceil((Date.now() - cupping.date) / 60_000))
        : 0
    const notes = applyNoteTimestamp(
      notesBaselineRef.current,
      data.notes ?? "",
      elapsedMinutes,
    )
    mutation.mutate({ ...data, notes })
  }

  const [watchedFragrance, watchedAroma, watchedTaste, watchedAftertaste] =
    useWatch({
      control: form.control,
      name: [
        "fragrance_score",
        "aroma_score",
        "taste_score",
        "aftertaste_score",
      ],
    })
  const qScore = calculateQScore(
    Number(watchedFragrance) || 0,
    Number(watchedAroma) || 0,
    Number(watchedTaste) || 0,
    Number(watchedAftertaste) || 0,
  )

  const [
    watchedOrderId,
    watchedRoastId,
    watchedRoastingMachine,
    watchedBrewStyle,
    watchedManualName,
  ] = useWatch({
    control: form.control,
    name: [
      "order_id",
      "roast_id",
      "roasting_machine",
      "brew_style",
      "manual_name",
    ],
  })
  const summaryText = [
    `${roastingMachinePrefix(watchedRoastingMachine)}${watchedRoastId ?? ""}`,
    `Cup ${watchedOrderId ?? ""}`,
    ROASTING_MACHINE_OPTIONS.find((o) => o.value === watchedRoastingMachine)
      ?.label,
    BREW_STYLE_OPTIONS.find((o) => o.value === watchedBrewStyle)?.label,
    watchedManualName,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 max-h-[90vh] sm:max-w-xl">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex-row items-center justify-between gap-4 space-y-0">
          <DialogTitle className={cn(isEdit && compact && "sr-only")}>
            {isEdit ? "Edit Cupping" : "Add Cupping"}
          </DialogTitle>
          {isEdit && compact && (
            <button
              type="button"
              onClick={() => setCompact(false)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              <span className="wrap text-sm font-medium">{summaryText}</span>
            </button>
          )}
          <div className="flex items-center gap-3 mr-6">
            <div className="flex flex-col items-center px-3 py-1 rounded-md bg-red-100 dark:bg-red-950/50">
              <span className="text-[10px] uppercase tracking-wide text-red-700/70 dark:text-red-300/70">
                Q
              </span>
              <span className="font-semibold tabular-nums text-red-700 dark:text-red-300">
                {qScore}
              </span>
            </div>
            <LoadingButton
              type="submit"
              form="cupping-form"
              loading={mutation.isPending}
            >
              {isEdit ? "Save" : "Submit"}
            </LoadingButton>
          </div>
        </DialogHeader>

        <form
          id="cupping-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="overflow-y-auto px-6 py-4 flex flex-col gap-5"
        >
          {!(isEdit && compact) && (
            <>
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
                          onClick={() =>
                            field.onChange(Number(field.value) + 1)
                          }
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
            </>
          )}

          <div className="flex flex-col gap-4">
            {SCORE_FIELDS.map(({ name, label }, index) => (
              <Controller
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <ScoreStepper
                    label={label}
                    value={Number(field.value) || 0}
                    onChange={field.onChange}
                    getBase={() => {
                      for (let j = index - 1; j >= 0; j--) {
                        const v =
                          Number(form.getValues(SCORE_FIELDS[j].name)) || 0
                        if (v !== 0) return v
                      }
                      return 8
                    }}
                  />
                )}
              />
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Controller
              control={form.control}
              name="notes"
              render={({ field }) => (
                <NotesEditor
                  ref={notesEditorRef}
                  id="notes"
                  defaultValue={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Tasting notes..."
                />
              )}
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
