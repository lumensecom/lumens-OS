import { computeCosting } from "@/lib/productos"
import { formatCOP, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Calculadora de costeo en vivo (se alimenta de los campos del formulario). */
export function PricingCalculator({
  selling,
  cost,
  fulfillment,
  shipping,
  cpaReal,
  admin,
  rulePct,
}: {
  selling: number
  cost: number
  fulfillment: number
  shipping: number
  cpaReal?: number | null
  admin?: number
  rulePct?: number
}) {
  const c = computeCosting({
    selling: selling || 0,
    cost: cost || 0,
    fulfillment: fulfillment || 0,
    shipping: shipping || 0,
    cpaReal: cpaReal ?? 0,
    admin: admin ?? 0,
    rulePct: rulePct || 50,
  })
  const healthy = c.marginPct >= 50

  return (
    <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cell label="COGS" value={formatCOP(c.cogs)} hint="costo + fulfillment + flete" neutral />
        <Cell label="Margen bruto" value={formatCOP(c.margin)} negative={c.margin < 0} />
        <Cell
          label="% margen"
          value={formatPercent(c.marginPct)}
          hint={healthy ? "Saludable (≥50%)" : "Bajo (<50%)"}
          negative={!healthy}
        />
        <Cell label="CPA máx. rentable" value={formatCOP(c.cpaMax)} negative={c.cpaMax <= 0} />
      </div>
      <div className="grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-4">
        <Cell label="Utilidad" value={formatCOP(c.utility)} hint="margen − CPA − admin" negative={c.utility < 0} />
        <Cell label="% utilidad" value={formatPercent(c.utilityPct)} negative={c.utility < 0} />
        <Cell
          label={`Venta mínima (regla ${rulePct || 50}%)`}
          value={formatCOP(c.minPrice)}
          hint={c.meetsRule ? "Precio actual cumple ✓" : "Precio por debajo de la regla"}
          negative={!c.meetsRule}
        />
        <Cell label="Precio actual" value={formatCOP(selling || 0)} neutral />
      </div>
    </div>
  )
}

function Cell({
  label,
  value,
  hint,
  negative,
  neutral,
}: {
  label: string
  value: string
  hint?: string
  negative?: boolean
  neutral?: boolean
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-mono text-lg font-medium tabular-nums",
          neutral ? "text-foreground" : negative ? "text-lumens-red" : "text-lumens-green",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
