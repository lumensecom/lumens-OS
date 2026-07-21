"use client"

import { useMemo } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  Boxes, CheckCircle2, AlertTriangle, XCircle, Download,
} from "lucide-react"

import {
  computeKpis, netUtility, totalAdSpend, weeklySeries, topCities,
  type AdSpend, type DropiDataset,
} from "@/lib/dropi"
import { formatCOP } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropiUploader } from "@/components/dropi/uploader"
import { WeeklyChart } from "@/components/dropi/weekly-chart"

export function SummaryTab({
  dataset,
  ads,
  onAdsChange,
  onReplace,
  onExport,
}: {
  dataset: DropiDataset
  ads: AdSpend
  onAdsChange: (ads: AdSpend) => void
  onReplace: (dataset: DropiDataset, fileName: string) => void
  onExport: () => void
}) {
  const kpis = useMemo(() => computeKpis(dataset.orders), [dataset.orders])
  const weekly = useMemo(() => weeklySeries(dataset.orders), [dataset.orders])
  const cities = useMemo(() => topCities(dataset.orders), [dataset.orders])

  const adTotal = totalAdSpend(ads)
  const utility = netUtility(kpis, ads)
  const p = (n: number) => `${n.toFixed(1)}%`
  const share = (n: number) =>
    kpis.total > 0 ? `${Math.round((n / kpis.total) * 100)}%` : "0%"

  const period =
    dataset.minDate && dataset.maxDate
      ? `${format(parseISO(dataset.minDate), "d MMM yyyy", { locale: es })} al ${format(parseISO(dataset.maxDate), "d MMM yyyy", { locale: es })}`
      : "Sin fechas en el archivo"

  function setAd(key: keyof AdSpend, value: string) {
    onAdsChange({ ...ads, [key]: Math.max(0, Math.round(Number(value) || 0)) })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="page-title text-xl">Análisis de pedidos Dropi</h3>
          <p className="text-sm text-muted-foreground">Período: {period}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Descargar reporte
          </button>
          <DropiUploader onLoaded={onReplace} compact />
        </div>
      </div>

      {dataset.unmatchedColumns.length > 0 && (
        <p className="rounded-lg bg-lumens-red/10 px-3 py-2 text-xs text-lumens-red">
          ⚠ No se reconocieron estas columnas: {dataset.unmatchedColumns.join(", ")}. Algunos números
          pueden salir en cero — comparte un archivo de ejemplo y ajusto el mapeo.
        </p>
      )}

      {/* KPIs de estado */}
      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Pedidos totales" icon={<Boxes className="h-4 w-4" />} value={String(kpis.total)} accent="neutral" />
        <KpiCard title="Entregados" icon={<CheckCircle2 className="h-4 w-4" />} value={`${kpis.delivered}`} sub={share(kpis.delivered)} accent="green" />
        <KpiCard title="Por confirmar" icon={<AlertTriangle className="h-4 w-4" />} value={`${kpis.pending}`} sub={share(kpis.pending)} accent="yellow" highlight />
        <KpiCard title="Devueltos" icon={<XCircle className="h-4 w-4" />} value={`${kpis.returned}`} sub={share(kpis.returned)} accent="red" />
      </div>

      {/* Números reales */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyCard title="Ventas brutas" hint="Suma de entregados" value={formatCOP(kpis.ventasBrutas)} />
        <MoneyCard title="Ganancia real Dropi" hint="Ganancia de entregados" value={formatCOP(kpis.gananciaReal)} color="green" />
        <MoneyCard title="Costo devoluciones" hint="Fletes de pedidos devueltos" value={formatCOP(kpis.costoDevoluciones)} color="red" />
      </div>

      {/* Publicidad + Utilidad neta */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publicidad</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <AdInput id="meta" label="Meta Ads (FB + IG)" value={ads.meta} onChange={(v) => setAd("meta", v)} />
            <AdInput id="tiktok" label="TikTok Ads" value={ads.tiktok} onChange={(v) => setAd("tiktok", v)} />
            <AdInput id="otros" label="Otros gastos publicidad" value={ads.otros} onChange={(v) => setAd("otros", v)} />
            <div className="space-y-1.5">
              <Label>Total publicidad</Label>
              <div className="flex h-9 items-center rounded-md border bg-primary/15 px-3 font-mono text-sm font-semibold tabular-nums">
                {formatCOP(adTotal)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-lumens-green/40">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-lumens-green/15 via-transparent to-transparent" />
          <CardContent className="relative flex flex-col justify-center p-5">
            <p className="text-sm font-medium text-muted-foreground">Utilidad neta final</p>
            <p
              className={cn(
                "mt-1 font-mono text-4xl font-bold tabular-nums tracking-tight",
                utility >= 0 ? "text-lumens-green" : "text-lumens-red",
              )}
            >
              {formatCOP(utility)}
            </p>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {formatCOP(kpis.gananciaReal)} ganancia
              <br />− {formatCOP(kpis.costoDevoluciones)} devoluciones
              <br />− {formatCOP(adTotal)} publicidad
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tasas operativas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <RateCard title="% Entrega" value={p(kpis.deliveryRate)} color="green" />
        <RateCard title="% Devolución" value={p(kpis.returnRate)} color="red" />
        <RateCard title="% Pendiente confirmación" value={p(kpis.pendingRate)} color="yellow" />
      </div>

      {/* Gráfico semanal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos por semana</CardTitle>
        </CardHeader>
        <CardContent>
          {weekly.length > 0 ? (
            <WeeklyChart data={weekly} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              El archivo no trae fechas para graficar la evolución.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top ciudades */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 5 ciudades por pedidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {cities.map((c) => {
            const semaforo =
              c.deliveryRate >= 50 ? "bg-lumens-green" : c.deliveryRate >= 30 ? "bg-primary" : "bg-lumens-red"
            return (
              <div
                key={c.city}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/60"
              >
                <span className="truncate font-medium">{c.city}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{c.orders} ped.</span>
                <span className="font-mono tabular-nums">{c.deliveryRate.toFixed(0)}%</span>
                <span className={cn("h-2.5 w-2.5 rounded-full", semaforo)} />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  title, icon, value, sub, accent, highlight,
}: {
  title: string
  icon: React.ReactNode
  value: string
  sub?: string
  accent: "green" | "red" | "yellow" | "neutral"
  highlight?: boolean
}) {
  const chip: Record<string, string> = {
    green: "bg-lumens-green/15 text-lumens-green",
    red: "bg-lumens-red/15 text-lumens-red",
    yellow: "bg-primary/20 text-[hsl(43_90%_35%)] dark:text-primary",
    neutral: "bg-muted text-muted-foreground",
  }
  return (
    <Card className={cn(highlight && "border-primary/50 bg-primary/[0.06]")}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", chip[accent])}>
            {icon}
          </span>
        </div>
        <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
          {value}
          {sub && <span className="ml-2 text-sm font-normal text-muted-foreground">{sub}</span>}
        </p>
      </CardContent>
    </Card>
  )
}

function MoneyCard({
  title, hint, value, color,
}: {
  title: string
  hint: string
  value: string
  color?: "green" | "red"
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p
          className={cn(
            "mt-1 font-mono text-xl font-semibold tabular-nums",
            color === "green" && "text-lumens-green",
            color === "red" && "text-lumens-red",
          )}
        >
          {value}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function RateCard({ title, value, color }: { title: string; value: string; color: "green" | "red" | "yellow" }) {
  const cls = {
    green: "text-lumens-green",
    red: "text-lumens-red",
    yellow: "text-[hsl(43_90%_38%)] dark:text-primary",
  }[color]
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className={cn("mt-1 font-mono text-2xl font-bold tabular-nums", cls)}>{value}</p>
      </CardContent>
    </Card>
  )
}

function AdInput({
  id, label, value, onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value || ""}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
