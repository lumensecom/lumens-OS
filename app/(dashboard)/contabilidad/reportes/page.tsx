import { format, subDays } from "date-fns"
import { ArrowUpCircle, ArrowDownCircle, Scale, Percent } from "lucide-react"

import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants"
import { REVENUE_SOURCE_LABELS, computeTotals, groupByKey } from "@/lib/contabilidad"
import { formatCOP, formatPercent } from "@/lib/format"
import {
  fetchEntries,
  firstParam,
  type SearchParams,
} from "@/lib/contabilidad-queries"
import { StatCard } from "@/components/dashboard/stat-card"
import { RangeSelector } from "@/components/contabilidad/range-selector"
import { ExportButton } from "@/components/contabilidad/export-button"
import { BreakdownCard } from "@/components/contabilidad/breakdown-card"

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const today = format(new Date(), "yyyy-MM-dd")
  const defaultFrom = format(subDays(new Date(), 29), "yyyy-MM-dd")

  const desdeParam = firstParam(searchParams.desde)
  const hastaParam = firstParam(searchParams.hasta)
  const desde = isDate(desdeParam) ? desdeParam! : defaultFrom
  const hasta = isDate(hastaParam) ? hastaParam! : today

  const { revenue, expenses } = await fetchEntries(desde, hasta)
  const totals = computeTotals(revenue, expenses)
  const margen =
    totals.ingresos > 0 ? (totals.utilidad / totals.ingresos) * 100 : 0

  const byCategory = groupByKey(
    expenses,
    (e) => EXPENSE_CATEGORY_LABELS[e.category] ?? e.category,
    (e) => Number(e.amount),
  ).map((x) => ({ label: x.key, total: x.total }))

  const byProduct = groupByKey(
    revenue,
    (r) => r.productName ?? "Sin producto",
    (r) => Number(r.gross_amount),
  ).map((x) => ({ label: x.key, total: x.total }))

  const movements = [
    ...revenue.map((r) => ({
      tipo: "ingreso",
      fecha: r.date,
      concepto: REVENUE_SOURCE_LABELS[r.source] ?? r.source,
      producto: r.productName ?? "",
      monto: Number(r.gross_amount),
    })),
    ...expenses.map((e) => ({
      tipo: "gasto",
      fecha: e.date,
      concepto: EXPENSE_CATEGORY_LABELS[e.category] ?? e.category,
      producto: e.productName ?? "",
      monto: -Number(e.amount),
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <RangeSelector defaultFrom={defaultFrom} defaultTo={today} />
        <ExportButton
          rows={movements}
          filename={`reporte-${desde}_a_${hasta}.csv`}
        />
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ingresos"
          value={formatCOP(totals.ingresos)}
          icon={ArrowUpCircle}
          accent="green"
        />
        <StatCard
          title="Gastos"
          value={formatCOP(totals.gastos)}
          icon={ArrowDownCircle}
          accent="red"
        />
        <StatCard
          title="Utilidad neta"
          value={formatCOP(totals.utilidad)}
          icon={Scale}
          accent={totals.utilidad >= 0 ? "green" : "red"}
          valueColor={totals.utilidad >= 0 ? "green" : "red"}
        />
        <StatCard
          title="Margen"
          value={formatPercent(margen)}
          icon={Percent}
          accent="purple"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Gastos por categoría"
          items={byCategory}
          barClass="bg-lumens-red"
        />
        <BreakdownCard
          title="Ingresos por producto"
          items={byProduct}
          barClass="bg-lumens-green"
        />
      </div>
    </div>
  )
}
