import type { Json } from "@/lib/database.types"
import { formatCOP } from "@/lib/format"

const labels: Record<string, string> = {
  contribucion_antes_de_pauta_cop: "Contribución antes de pauta",
  cpa_objetivo_cop: "CPA objetivo",
  pack_qty: "Unidades",
  pack_price_cop: "Precio del pack",
  unit_cost_cop: "Costo unitario",
  variable_cost_cop: "Otros costos variables",
  evidencia_cumplimiento: "Evidencia de cumplimiento",
  evidencia_proveedor: "Evidencia de proveedor",
  evidencia_demanda: "Evidencia de demanda",
}

export function RunDetails({ output }: { output: Json }) {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null
  return (
    <dl className="grid gap-2 text-sm">
      {Object.entries(output).map(([key, value]) => {
        if (value && typeof value === "object" && (!Array.isArray(value) || value.some((item) => typeof item !== "string"))) {
          return null
        }
        const formatted = typeof value === "number" && key.endsWith("_cop")
          ? formatCOP(value)
          : Array.isArray(value) ? value.join(", ") || "Ninguna" : String(value ?? "Sin dato")
        return (
          <div className="grid gap-1 border-t pt-2 sm:grid-cols-2" key={key}>
            <dt className="capitalize text-muted-foreground">{labels[key] ?? key.replace(/_cop$/, "").replaceAll("_", " ")}</dt>
            <dd className="break-words font-medium">{formatted}</dd>
          </div>
        )
      })}
    </dl>
  )
}
