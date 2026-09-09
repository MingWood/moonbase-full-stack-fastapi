import { CalendarRange } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatEpochMs } from "@/lib/datetime"

export interface DateRange {
  start: number | null
  end: number | null
}

function msToLocalInputValue(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputValueToMs(value: string): number | null {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (value: DateRange) => void
}) {
  const [open, setOpen] = useState(false)
  const [draftStart, setDraftStart] = useState("")
  const [draftEnd, setDraftEnd] = useState("")

  useEffect(() => {
    if (open) {
      setDraftStart(value.start ? msToLocalInputValue(value.start) : "")
      setDraftEnd(value.end ? msToLocalInputValue(value.end) : "")
    }
  }, [open, value.start, value.end])

  const label =
    value.start && value.end
      ? `${formatEpochMs(value.start)} – ${formatEpochMs(value.end)}`
      : value.start
        ? `From ${formatEpochMs(value.start)}`
        : value.end
          ? `Until ${formatEpochMs(value.end)}`
          : "All time"

  const apply = () => {
    onChange({
      start: localInputValueToMs(draftStart),
      end: localInputValueToMs(draftEnd),
    })
    setOpen(false)
  }

  const clear = () => {
    onChange({ start: null, end: null })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-11 max-w-56 sm:max-w-xs justify-start gap-2 font-normal"
        >
          <CalendarRange className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Filter by Date</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="range-start">Start</Label>
            <Input
              id="range-start"
              type="datetime-local"
              className="h-11"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="range-end">End</Label>
            <Input
              id="range-end"
              type="datetime-local"
              className="h-11"
              value={draftEnd}
              onChange={(e) => setDraftEnd(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={clear}>
            Clear
          </Button>
          <Button onClick={apply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
