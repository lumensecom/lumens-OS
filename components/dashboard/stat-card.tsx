import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

type Accent = "yellow" | "green" | "red" | "purple" | "blue" | "neutral"

const chipStyles: Record<Accent, string> = {
  yellow: "bg-primary/15 text-[hsl(43_90%_38%)] dark:text-primary",
  green: "bg-lumens-green/15 text-lumens-green",
  red: "bg-lumens-red/15 text-lumens-red",
  purple: "bg-lumens-purple/15 text-lumens-purple",
  blue: "bg-blue-500/15 text-blue-500",
  neutral: "bg-muted text-muted-foreground",
}

type StatCardProps = {
  title: string
  value: string
  hint?: string
  icon?: LucideIcon
  accent?: Accent
  valueColor?: "default" | "green" | "red"
}

/** Tarjeta de métrica para el dashboard. */
export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  accent = "neutral",
  valueColor = "default",
}: StatCardProps) {
  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          {Icon && (
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                chipStyles[accent],
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-2 font-mono text-2xl font-medium tabular-nums",
            valueColor === "green" && "text-lumens-green",
            valueColor === "red" && "text-lumens-red",
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
