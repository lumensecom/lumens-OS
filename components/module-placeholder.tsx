import { type LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

type ModulePlaceholderProps = {
  icon: LucideIcon
  title: string
  description: string
}

/** Estado vacío reutilizable para módulos aún no implementados. */
export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="font-display text-lg font-bold tracking-tight">
          {title}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
