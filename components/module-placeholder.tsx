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

type ModulePlaceholderProps = {
  icon: LucideIcon
  title: string
  description: string
  accent?: Accent
}

/** Estado vacío reutilizable para módulos aún no implementados. */
export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
  accent = "yellow",
}: ModulePlaceholderProps) {
  return (
    <Card className="duration-500 animate-in fade-in zoom-in-95">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full",
            chipStyles[accent],
          )}
        >
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="font-display text-lg font-bold tracking-tight">
          {title}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
