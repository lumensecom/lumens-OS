import { notFound } from "next/navigation"
import { format, parseISO, subDays } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowLeft,
  PauseCircle,
  Rocket,
  Eye,
  Wallet,
  MousePointerClick,
  Target as TargetIcon,
  Percent,
} from "lucide-react"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { formatCOP } from "@/lib/format"
import {
  PLATFORM_LABELS,
  aggregateCpa,
  semaforoForCpa,
  recommend,
} from "@/lib/campanas"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/dashboard/stat-card"
import { SemaforoBadge } from "@/components/campanas/semaforo-badge"
import { CampaignActions } from "@/components/campanas/campaign-actions"
import { DailyMetricsDialog } from "@/components/campanas/daily-metrics-dialog"
import { CampaignChart } from "@/components/campanas/campaign-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const since = format(subDays(new Date(), 30), "yyyy-MM-dd")

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", params.id)
    .single()
  if (!campaign) notFound()

  const [{ data: metrics }, { data: product }] = await Promise.all([
    supabase
      .from("campaign_metrics")
      .select("*")
      .eq("campaign_id", campaign.id)
      .gte("date", since)
      .order("date", { ascending: true }),
    campaign.product_id
      ? supabase
          .from("products_with_margin")
          .select("name, margin, cpa_max_rentable")
          .eq("id", campaign.product_id)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const rows = metrics ?? []
  const margin = product?.margin != null ? Number(product.margin) : null
  const cpaMax =
    product?.cpa_max_rentable != null ? Number(product.cpa_max_rentable) : null

  const cpa7d = aggregateCpa(rows)
  const semaforo = semaforoForCpa(cpa7d, margin)
  const reco = recommend(rows, margin)

  const totalSpend = rows.reduce((s, m) => s + Number(m.spend), 0)
  const totalConv = rows.reduce((s, m) => s + (m.conversions ?? 0), 0)
  const totalClicks = rows.reduce((s, m) => s + (m.clicks ?? 0), 0)
  const totalImpr = rows.reduce((s, m) => s + (m.impressions ?? 0), 0)
  const ctr = totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0

  const chartData = rows.map((m) => ({
    date: m.date,
    cpa: m.cpa != null ? Number(m.cpa) : null,
    roas: m.roas != null ? Number(m.roas) : null,
    conversions: m.conversions ?? 0,
  }))

  const recoStyles = {
    pause: "border-lumens-red/40 bg-lumens-red/10 text-lumens-red",
    scale: "border-lumens-green/40 bg-lumens-green/10 text-lumens-green",
    watch: "border-primary/40 bg-primary/10 text-[hsl(43_90%_35%)] dark:text-primary",
    none: "border-border bg-muted/40 text-muted-foreground",
  }[reco.kind]

  const RecoIcon =
    reco.kind === "pause" ? PauseCircle : reco.kind === "scale" ? Rocket : Eye

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/campanas" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold tracking-tight">
                {campaign.name}
              </h2>
              <Badge variant="secondary">
                {PLATFORM_LABELS[campaign.platform] ?? campaign.platform}
              </Badge>
              <SemaforoBadge value={semaforo} />
            </div>
            <p className="text-sm text-muted-foreground">
              {product?.name ?? "Sin producto vinculado"}
              {margin !== null && ` · Margen ${formatCOP(margin)}`}
              {campaign.daily_budget != null &&
                ` · Presupuesto ${formatCOP(Number(campaign.daily_budget))}/día`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DailyMetricsDialog campaignId={campaign.id} />
          <CampaignActions id={campaign.id} status={campaign.status} />
        </div>
      </div>

      <div className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", recoStyles)}>
        <RecoIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="font-medium">{reco.message}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="CPA 7 días"
          value={cpa7d === null ? "—" : cpa7d === Infinity ? "Sin conv." : formatCOP(cpa7d)}
          hint={cpaMax !== null ? `Máx. rentable ${formatCOP(cpaMax)}` : undefined}
          icon={TargetIcon}
          accent={semaforo === "green" ? "green" : semaforo === "red" ? "red" : "yellow"}
        />
        <StatCard title="Gasto 30 días" value={formatCOP(totalSpend)} icon={Wallet} accent="red" />
        <StatCard title="Conversiones 30d" value={String(totalConv)} icon={MousePointerClick} accent="blue" />
        <StatCard title="CTR 30 días" value={`${ctr.toFixed(2)}%`} icon={Percent} accent="purple" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución 30 días</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Sin métricas todavía. Regístralas manualmente o sube un CSV.
            </p>
          ) : (
            <CampaignChart data={chartData} cpaMax={cpaMax} />
          )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">Impr.</TableHead>
                <TableHead className="text-right">Clics</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                <TableHead className="text-right">CPA</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...rows].reverse().map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(parseISO(m.date), "d MMM", { locale: es })}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCOP(Number(m.spend))}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {(m.impressions ?? 0).toLocaleString("es-CO")}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {m.clicks ?? 0}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {m.conversions ?? 0}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {m.cpa != null ? formatCOP(Number(m.cpa)) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {m.roas != null ? `${Number(m.roas).toFixed(2)}x` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
