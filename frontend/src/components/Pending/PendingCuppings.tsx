import { Skeleton } from "@/components/ui/skeleton"

const PendingCuppings = () => (
  <div className="flex flex-col gap-2">
    {Array.from({ length: 6 }).map((_, index) => (
      <Skeleton key={index} className="h-16 w-full rounded-lg" />
    ))}
  </div>
)

export default PendingCuppings
