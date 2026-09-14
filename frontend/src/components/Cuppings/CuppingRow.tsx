import type { CuppingPublic } from "@/client"
import { roastingMachinePrefix } from "./constants"
import { calculateQScore } from "./qscore"

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1 text-xs leading-none">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

function QScoreCell({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-center px-2 py-1 rounded-md bg-red-100 dark:bg-red-950/50">
      <span className="text-[9px] leading-none uppercase tracking-wide text-red-700/70 dark:text-red-300/70">
        Q
      </span>
      <span className="text-sm font-semibold tabular-nums leading-tight text-red-700 dark:text-red-300">
        {value}
      </span>
    </div>
  )
}

export function CuppingRow({
  cupping,
  onClick,
}: {
  cupping: CuppingPublic
  onClick: () => void
}) {
  const qScore = calculateQScore(
    cupping.fragrance_score,
    cupping.aroma_score,
    cupping.taste_score,
    cupping.aftertaste_score,
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-stretch divide-x rounded-md border bg-card text-left hover:bg-accent/50 transition-colors overflow-hidden"
    >
      <div className="flex flex-col justify-center px-2 py-1.5 shrink-0 w-8">
        <span className="text-[9px] leading-none uppercase tracking-wide text-muted-foreground">
          Cup
        </span>
        <span className="text-sm font-semibold tabular-nums leading-tight">
          {cupping.order_id}
        </span>
      </div>

      <div className="flex flex-col justify-center px-2 py-1.5 flex-1 min-w-0">
        <span className="text-sm font-medium truncate leading-tight">
          {roastingMachinePrefix(cupping.roasting_machine)}
          {cupping.roast_id}
        </span>
        <span className="text-xs text-muted-foreground truncate leading-tight">
          {cupping.manual_name || cupping.resolved_name}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-2 py-1.5 shrink-0">
        <ScoreCell label="F" value={cupping.fragrance_score} />
        <ScoreCell label="A" value={cupping.aroma_score} />
        <ScoreCell label="T" value={cupping.taste_score} />
        <ScoreCell label="A" value={cupping.aftertaste_score} />
      </div>

      <div className="flex items-center pl-1.5 pr-2 shrink-0">
        <QScoreCell value={qScore} />
      </div>
    </button>
  )
}
