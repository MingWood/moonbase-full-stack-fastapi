import type { BrewStyle, RoastingMachine } from "@/client"

export const ROASTING_MACHINE_OPTIONS: {
  value: RoastingMachine
  label: string
}[] = [
  { value: "sagvag", label: "Sagvag" },
  { value: "hq_loring", label: "HQ Loring" },
  { value: "na_robert", label: "NA Robert" },
]

export const BREW_STYLE_OPTIONS: { value: BrewStyle; label: string }[] = [
  { value: "brew", label: "Brew" },
  { value: "cupping", label: "Cupping" },
  { value: "spro", label: "Spro" },
]
