import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Wallet, Package, PhoneCall, LayoutGrid } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { formatCOP } from "@/lib/format"
import { computeTotals } from "@/lib/contabilidad"
import { resolveMonth, fetchEntries } from "@/lib/contabilidad-queries"
import { StatCard } from "@/components/dashboard/stat-card"
import { ToolLauncher } from "@/components/dashboard/tool-launcher"
import { ChangelogPanel } from "@/components/dashboard/changelog-panel"

export default async function DashboardHomePage() {
  const supabase = createClient()
  const today = format(new Date(), "yyyy-MM-dd")
  const { start, end } = resolveMonth()

  const [
    {
      data: { user },
    },
    { count: productsCount },
    monthEntries,
    { count: confirmedToday },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .in("status", ["active", "testing", "paused"]),
    fetchEntries(start, end),
    supabase
      .from("call_results")
      .select("*", { count: "exact", head: true })
      .eq("outcome", "confirmado")
      .gte("called_at", `${today}T00:00:00`),
  ])

  const utilidadMes = computeTotals(monthEntries.revenue, monthEntries.expenses).utilidad
  const displayName = user?.email?.split("@")[0] ?? "de nuevo"
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title text-3xl">
          Hola, <span className="text-gradient">{displayName}</span>
        </h2>
        <p className="text-sm capitalize text-muted-foreground">{todayLabel}</p>
      </div>

      {/* Métricas clave */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Utilidad del mes"
          value={formatCOP(utilidadMes)}
          hint="Acumulado del mes en curso"
          icon={Wallet}
          accent={utilidadMes >= 0 ? "green" : "red"}
          valueColor={utilidadMes >= 0 ? "green" : "red"}
        />
        <StatCard
          title="Confirmados hoy"
          value={String(confirmedToday ?? 0)}
          hint="Pedidos confirmados por Juliana"
          icon={PhoneCall}
          accent="blue"
        />
        <StatCard
          title="Productos activos"
          value={String(productsCount ?? 0)}
          hint="En catálogo"
          icon={Package}
          accent="purple"
        />
      </div>

      {/* Hub: launcher + novedades */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg font-bold tracking-tight">Herramientas</h3>
          </div>
          <ToolLauncher />
        </div>
        <ChangelogPanel />
      </div>
    </div>
  )
}
