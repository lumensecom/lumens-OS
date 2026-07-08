import { cn } from "@/lib/utils"
import { formatCOP } from "@/lib/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type BreakdownItem = { label: string; total: number }

/** Card con lista de montos y barras proporcionales. */
export function BreakdownCard({
  title,
  items,
  barClass = "bg-primary",
  emptyText = "Sin datos en el período",
}: {
  title: string
  items: BreakdownItem[]
  barClass?: string
  emptyText?: string
}) {
  const max = items.reduce((m, i) => Math.max(m, i.total), 0) || 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="truncate pr-2">{item.label}</span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {formatCOP(item.total)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", barClass)}
                style={{ width: `${Math.max(4, (item.total / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
