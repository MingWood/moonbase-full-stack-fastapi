import type { CuppingPublic } from "@/client"

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center px-2 sm:px-3">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-stretch divide-x rounded-lg border bg-card text-left hover:bg-accent/50 transition-colors overflow-hidden"
    >
      <div className="flex flex-col justify-center px-4 py-3 shrink-0 w-20">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Order
        </span>
        <span className="font-semibold tabular-nums">#{cupping.order_id}</span>
      </div>

      <div className="flex flex-col justify-center px-4 py-3 flex-1 min-w-0">
        <span className="font-medium truncate">Roast #{cupping.roast_id}</span>
        <span className="text-sm text-muted-foreground truncate">nickname</span>
      </div>

      <div className="flex items-center divide-x shrink-0">
        <ScoreCell label="Frag" value={cupping.fragrance_score} />
        <ScoreCell label="Aroma" value={cupping.aroma_score} />
        <ScoreCell label="Taste" value={cupping.taste_score} />
        <ScoreCell label="After" value={cupping.aftertaste_score} />
      </div>
    </button>
  )
}
