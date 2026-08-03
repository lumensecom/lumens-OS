import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Sparkles } from "lucide-react"

import { CHANGELOG, type ChangeTag } from "@/lib/changelog"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const TAG_META: Record<ChangeTag, { label: string; cls: string }> = {
  nuevo: { label: "Nuevo", cls: "bg-lumens-green/15 text-lumens-green" },
  mejora: { label: "Mejora", cls: "bg-primary/20 text-[hsl(43_90%_35%)] dark:text-primary" },
  arreglo: { label: "Arreglo", cls: "bg-blue-500/15 text-blue-500" },
}

/** Panel de novedades / actualizaciones de LUMENS OS. */
export function ChangelogPanel() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b bg-muted/30">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <CardTitle className="text-base">Novedades</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[520px] space-y-4 overflow-y-auto p-4">
        {CHANGELOG.map((e, i) => (
          <div key={i} className="relative pl-5">
            <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-primary/15" />
            {i < CHANGELOG.length - 1 && (
              <span className="absolute left-[3px] top-4 h-full w-px bg-border" />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", TAG_META[e.tag].cls)}>
                {TAG_META[e.tag].label}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {format(parseISO(e.date), "d 'de' MMM", { locale: es })}
              </span>
            </div>
            <h4 className="mt-1 text-sm font-semibold leading-tight">{e.title}</h4>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{e.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
