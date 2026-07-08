import Link from "next/link"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  Wallet,
  TrendingUp,
  Package,
  Target,
  Trophy,
  Sparkles,
  Receipt,
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { GOALS } from "@/lib/constants"
import { formatCOP } from "@/lib/format"
import { computeTotals } from "@/lib/contabilidad"
import { resolveMonth, fetchEntries } from "@/lib/contabilidad-queries"
import {
  fetchCampaignHighlights,
  fetchTopProducts,
  fetchRecentMovements,
} from "@/lib/dashboard-queries"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardHomePage() {
  const supabase = createClient()
  const today = format(new Date(), "yyyy-MM-dd")
  const { start, end } = resolveMonth()

  const [
    {
      data: { user },
    },
    { count: productsCount },
    todayEntries,
    monthEntries,
    highlights,
    topProducts,
    movements,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .in("status", ["active", "testing", "paused"]),
    fetchEntries(today, today),
    fetchEntries(start, end),
    fetchCampaignHighlights(),
    fetchTopProducts(),
    fetchRecentMovements(),
  ])

  const utilidadHoy = computeTotals(todayEntries.revenue, todayEntries.expenses).utilidad
  const utilidadMes = computeTotals(monthEntries.revenue, monthEntries.expenses).utilidad

  const displayName = user?.email?.split("@")[0] ?? "de nuevo"
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight">
          Hola, {displayName}
        </h2>
        <p className="text-sm capitalize text-muted-foreground">{todayLabel}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Utilidad hoy"
          value={formatCOP(utilidadHoy)}
          hint="Ingresos menos gastos de hoy"
          icon={Wallet}
          accent={utilidadHoy >= 0 ? "green" : "red"}
          valueColor={utilidadHoy >= 0 ? "green" : "red"}
        />
        <StatCard
          title="Utilidad del mes"
          value={formatCOP(utilidadMes)}
          hint="Acumulado del mes en curso"
          icon={TrendingUp}
          accent={utilidadMes >= 0 ? "green" : "red"}
          valueColor={utilidadMes >= 0 ? "green" : "red"}
        />
        <StatCard
          title="Productos activos"
          value={String(productsCount ?? 0)}
          hint="En catálogo"
          icon={Package}
          accent="purple"
        />
        <StatCard
          title="Campañas activas"
          value={String(highlights.activeCount)}
          hint="Con estado activo"
          icon={Target}
          accent="blue"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas del mes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <GoalBar label="Meta A" goal={GOALS.metaA} current={utilidadMes} />
          <GoalBar label="Meta B" goal={GOALS.metaB} current={utilidadMes} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Top campañas por ROAS" icon={<Trophy className="h-4 w-4 text-lumens-green" />}>
          {highlights.top.length === 0 ? (
            <Empty text="Sube métricas de campañas para ver el ranking." />
          ) : (
            <ul className="space-y-2">
              {highlights.top.map((c, i) => (
                <li key={c.id}>
                  <Link
                    href={`/campanas/${c.id}`}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="truncate">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">
                        {i + 1}.
                      </span>
                      {c.name}
                    </span>
                    <span className="shrink-0 font-mono text-sm font-medium text-lumens-green">
                      {c.roas.toFixed(2)}x
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top productos por margen" icon={<Sparkles className="h-4 w-4 text-lumens-purple" />}>
          {topProducts.length === 0 ? (
            <Empty text="Agrega precios y costos a tus productos." />
          ) : (
            <ul className="space-y-2">
              {topProducts.map((p, i) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm"
                >
                  <span className="truncate">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {i + 1}.
                    </span>
                    {p.name}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {formatCOP(p.margin)}{" "}
                    <span className="text-lumens-purple">
                      ({p.marginPct.toFixed(0)}%)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Últimos movimientos" icon={<Receipt className="h-4 w-4 text-blue-500" />}>
          {movements.length === 0 ? (
            <Empty text="Registra ingresos y gastos en Contabilidad." />
          ) : (
            <ul className="space-y-2">
              {movements.map((m) => (
                <li
                  key={`${m.kind}-${m.id}`}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm"
                >
                  <span className="truncate text-muted-foreground">
                    {format(parseISO(m.date), "d MMM", { locale: es })} · {m.label}
                  </span>
                  <span
                    className={
                      m.amount >= 0
                        ? "shrink-0 font-mono text-sm text-lumens-green"
                        : "shrink-0 font-mono text-sm text-lumens-red"
                    }
                  >
                    {formatCOP(m.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function GoalBar({ label, goal, current }: { label: string; goal: number; current: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((current / goal) * 100)))
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">
          {label}{" "}
          <span className="ml-1 font-mono text-xs text-muted-foreground">{pct}%</span>
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

function Panel({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        {icon}
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>
}
