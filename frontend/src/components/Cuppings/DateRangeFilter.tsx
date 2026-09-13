import { CalendarRange } from "lucide-react"
import { useEffect, useState } from "react"
import type { DateRange as CalendarDateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatEpochMs } from "@/lib/datetime"

export interface DateRange {
  start: number | null
  end: number | null
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function timeOf(date: number | null): string {
  if (!date) return "00:00"
  const d = new Date(date)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function combine(date: Date, time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  const combined = new Date(date)
  combined.setHours(hours || 0, minutes || 0, 0, 0)
  return combined.getTime()
}

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (value: DateRange) => void
}) {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<CalendarDateRange | undefined>()
  const [startTime, setStartTime] = useState("00:00")
  const [endTime, setEndTime] = useState("23:59")

  useEffect(() => {
    if (open) {
      setRange({
        from: value.start ? new Date(value.start) : undefined,
        to: value.end ? new Date(value.end) : undefined,
      })
      setStartTime(timeOf(value.start))
      setEndTime(timeOf(value.end))
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
      start: range?.from ? combine(range.from, startTime) : null,
      end: range?.to ? combine(range.to, endTime) : null,
    })
    setOpen(false)
  }

  const clear = () => {
    onChange({ start: null, end: null })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-11 max-w-56 sm:max-w-xs justify-start gap-2 font-normal"
        >
          <CalendarRange className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={setRange}
          defaultMonth={range?.from}
          numberOfMonths={1}
        />
        <div className="flex items-center gap-3 border-t px-4 py-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="range-start-time">Start time</Label>
            <Input
              id="range-start-time"
              type="time"
              className="h-10"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="range-end-time">End time</Label>
            <Input
              id="range-end-time"
              type="time"
              className="h-10"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" onClick={clear}>
            Clear
          </Button>
          <Button onClick={apply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
