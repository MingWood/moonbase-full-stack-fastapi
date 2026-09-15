import { Skeleton } from "@/components/ui/skeleton"

const PendingCoffeeSyncStrategies = () => (
  <div className="flex flex-col gap-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <Skeleton key={index} className="h-64 w-full rounded-xl" />
    ))}
  </div>
)

export default PendingCoffeeSyncStrategies
