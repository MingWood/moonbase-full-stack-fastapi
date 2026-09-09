import { z } from "zod"

const selectedItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  current_qty: z.number(),
})

const rowSchema = z.object({
  item: selectedItemSchema.nullable().refine((v) => v !== null, {
    message: "Select an item",
  }),
  changeType: z.enum(["addition", "subtraction"]),
  quantity: z.string().refine(
    (v) => {
      const n = Number(v)
      return v !== "" && !Number.isNaN(n) && n > 0
    },
    { message: "Enter a quantity greater than 0" },
  ),
  note: z.string(),
})

export const formSchema = z.object({
  rows: z.array(rowSchema).min(1, { message: "Add at least one row" }),
})

export type AdjustmentFormInput = z.input<typeof formSchema>
export type AdjustmentFormOutput = z.output<typeof formSchema>
