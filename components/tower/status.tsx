import { cn } from "@/lib/utils"
import { statusLabels } from "@/lib/tower/presentation"

const colors: Record<keyof typeof statusLabels, string> = {
  idle: "bg-muted-foreground",
  running: "animate-pulse bg-emerald-500",
  success: "bg-emerald-500",
  waiting: "bg-amber-500",
  blocked: "bg-amber-500",
  error: "bg-red-500",
}

export function RoutineStatus({ status }: { status: keyof typeof statusLabels }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", colors[status])} />
      {statusLabels[status]}
    </span>
  )
}
