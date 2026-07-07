import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

type StatCardProps = {
  title: string
  value: string
  hint?: string
  icon?: LucideIcon
  accent?: "default" | "green" | "red"
}

/** Tarjeta de métrica para el dashboard. */
export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  accent = "default",
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p
          className={cn(
            "mt-2 font-mono text-2xl font-medium tabular-nums",
            accent === "green" && "text-lumens-green",
            accent === "red" && "text-lumens-red",
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
