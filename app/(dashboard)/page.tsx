import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Wallet,
  TrendingUp,
  Package,
  Target,
  Trophy,
  Sparkles,
  Receipt,
  type LucideIcon,
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { GOALS } from "@/lib/constants"
import { formatCOP } from "@/lib/format"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardHomePage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { count: productsCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .in("status", ["active", "testing", "paused"])

  const displayName = user?.email?.split("@")[0] ?? "de nuevo"
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight">
          Hola, {displayName}
        </h2>
        <p className="text-sm capitalize text-muted-foreground">{today}</p>
      </div>

      {/* Métricas clave — datos en vivo llegan en Sprint 2 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Utilidad hoy"
          value="—"
          hint="Se conecta en Sprint 2"
          icon={Wallet}
          accent="green"
        />
        <StatCard
          title="Utilidad del mes"
          value="—"
          hint="Se conecta en Sprint 2"
          icon={TrendingUp}
          accent="yellow"
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
          value="—"
          hint="Se conecta en Sprint 2"
          icon={Target}
          accent="blue"
        />
      </div>

      {/* Progreso de metas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas del mes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <GoalBar label="Meta A" goal={GOALS.metaA} current={0} />
          <GoalBar label="Meta B" goal={GOALS.metaB} current={0} />
        </CardContent>
      </Card>

      {/* Paneles */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PlaceholderPanel
          title="Top campañas por ROAS"
          icon={Trophy}
          accentClass="text-lumens-green"
        />
        <PlaceholderPanel
          title="Top productos por margen"
          icon={Sparkles}
          accentClass="text-lumens-purple"
        />
        <PlaceholderPanel
          title="Últimos movimientos"
          icon={Receipt}
          accentClass="text-blue-500"
        />
      </div>
    </div>
  )
}

function GoalBar({
  label,
  goal,
  current,
}: {
  label: string
  goal: number
  current: number
}) {
  const pct = Math.min(100, Math.round((current / goal) * 100))
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
          {formatCOP(current)} / {formatCOP(goal)}
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

function PlaceholderPanel({
  title,
  icon: Icon,
  accentClass,
}: {
  title: string
  icon: LucideIcon
  accentClass: string
}) {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Icon className={`h-4 w-4 ${accentClass}`} />
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Disponible cuando se cargue información en los próximos sprints.
        </p>
      </CardContent>
    </Card>
  )
}
