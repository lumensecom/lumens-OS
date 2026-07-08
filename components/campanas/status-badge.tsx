import { cn } from "@/lib/utils"
import { STATUS_LABELS } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"

const STYLES: Record<string, string> = {
  active: "bg-lumens-green/15 text-lumens-green border-transparent",
  testing: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent",
  paused: "bg-muted text-muted-foreground border-transparent",
  archived: "bg-muted text-muted-foreground/60 border-transparent",
}

/** Badge de estado con color según el estado de la campaña/producto. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status])}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
