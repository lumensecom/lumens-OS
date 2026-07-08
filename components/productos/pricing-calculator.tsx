import { computeMargin } from "@/lib/productos"
import { formatCOP, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Calculadora de margen en vivo (se alimenta de los campos del formulario). */
export function PricingCalculator({
  selling,
  cost,
  shipping,
}: {
  selling: number
  cost: number
  shipping: number
}) {
  const { margin, marginPct, cpaMax } = computeMargin(
    selling || 0,
    cost || 0,
    shipping || 0,
  )
  const healthy = marginPct >= 50

  return (
    <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/40 p-3">
      <Cell label="Margen bruto" value={formatCOP(margin)} negative={margin < 0} />
      <Cell
        label="% margen"
        value={formatPercent(marginPct)}
        hint={healthy ? "Saludable (≥50%)" : "Bajo (<50%)"}
        negative={!healthy}
      />
      <Cell label="CPA máx. rentable" value={formatCOP(cpaMax)} negative={cpaMax <= 0} />
    </div>
  )
}

function Cell({
  label,
  value,
  hint,
  negative,
}: {
  label: string
  value: string
  hint?: string
  negative?: boolean
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("font-mono text-lg font-medium tabular-nums", negative ? "text-lumens-red" : "text-lumens-green")}>
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
