import { ArrowUpCircle, ArrowDownCircle, Scale, ShoppingBag } from "lucide-react"

import { GOALS, EXPENSE_CATEGORY_LABELS } from "@/lib/constants"
import { formatCOP } from "@/lib/format"
import {
  computeTotals,
  buildDailySeries,
  groupByKey,
} from "@/lib/contabilidad"
import {
  resolveMonth,
  fetchEntries,
  firstParam,
  type SearchParams,
} from "@/lib/contabilidad-queries"
import { StatCard } from "@/components/dashboard/stat-card"
import { MonthSelector } from "@/components/contabilidad/month-selector"
import { CashFlowChart } from "@/components/contabilidad/cash-flow-chart"
import { BreakdownCard } from "@/components/contabilidad/breakdown-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ContabilidadResumenPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const mes = firstParam(searchParams.mes)
  const { month, start, end, days } = resolveMonth(mes)
  const { revenue, expenses } = await fetchEntries(start, end)

  const totals = computeTotals(revenue, expenses)
  const daily = buildDailySeries(days, revenue, expenses)

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <MonthSelector current={month} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          title="Pedidos"
          value={String(totals.ordersCount)}
          icon={ShoppingBag}
          accent="blue"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas del mes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetaBar label="Meta A" goal={GOALS.metaA} current={totals.utilidad} />
          <MetaBar label="Meta B" goal={GOALS.metaB} current={totals.utilidad} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flujo de caja diario</CardTitle>
        </CardHeader>
        <CardContent>
          <CashFlowChart data={daily} />
        </CardContent>
      </Card>

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

function MetaBar({
  label,
  goal,
  current,
}: {
  label: string
  goal: number
  current: number
}) {
  const pct = Math.max(0, Math.min(100, Math.round((current / goal) * 100)))
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">
          {label}{" "}
          <span className="ml-1 font-mono text-xs text-muted-foreground">
            {pct}%
          </span>
        </span>
        <span className="font-mono text-muted-foreground">
          {formatCOP(Math.max(0, current))} / {formatCOP(goal)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
