import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

type Accent = "yellow" | "green" | "red" | "purple" | "blue" | "neutral"

const chipStyles: Record<Accent, string> = {
  yellow: "bg-primary/20 text-[hsl(43_90%_35%)] shadow-[0_0_16px_-4px_rgb(245_197_24/0.7)] dark:text-primary",
  green: "bg-lumens-green/15 text-lumens-green shadow-[0_0_16px_-4px_rgb(34_165_91/0.55)]",
  red: "bg-lumens-red/15 text-lumens-red shadow-[0_0_16px_-4px_rgb(239_68_68/0.55)]",
  purple: "bg-lumens-purple/15 text-lumens-purple shadow-[0_0_16px_-4px_rgb(124_58_237/0.55)]",
  blue: "bg-blue-500/15 text-blue-500 shadow-[0_0_16px_-4px_rgb(59_130_246/0.55)]",
  neutral: "bg-muted text-muted-foreground",
}

/** Lavado de gradiente por acento para dar profundidad a la tarjeta. */
const washStyles: Record<Accent, string> = {
  yellow: "from-primary/[0.12]",
  green: "from-lumens-green/[0.1]",
  red: "from-lumens-red/[0.1]",
  purple: "from-lumens-purple/[0.1]",
  blue: "from-blue-500/[0.1]",
  neutral: "from-muted/60",
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
    <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent",
          washStyles[accent],
        )}
      />
      <CardContent className="relative p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          {Icon && (
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
                chipStyles[accent],
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight",
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
