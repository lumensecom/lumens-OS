import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowLeft, Pencil, Package, Wallet, Percent, Target as TargetIcon, History,
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { formatCOP, formatPercent } from "@/lib/format"
import { PLATFORM_LABELS } from "@/lib/campanas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusBadge } from "@/components/campanas/status-badge"
import { ReferenceManager } from "@/components/productos/reference-manager"
import { DeleteProductButton } from "@/components/productos/delete-product-button"

export default async function ProductoDetallePage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createClient()

  const { data: product } = await supabase
    .from("products_with_margin")
    .select("*")
    .eq("slug", params.slug)
    .single()
  if (!product || !product.id) notFound()

  const [{ data: references }, { data: campaigns }, { data: revenue }, { data: history }] =
    await Promise.all([
      supabase
        .from("product_references")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("campaigns")
        .select("id, name, platform, status")
        .eq("product_id", product.id)
        .neq("status", "archived"),
      supabase
        .from("revenue_entries")
        .select("gross_amount, orders_count")
        .eq("product_id", product.id),
      supabase
        .from("product_price_history")
        .select("*")
        .eq("product_id", product.id)
        .order("changed_at", { ascending: false })
        .limit(10),
    ])

  const totalRevenue = (revenue ?? []).reduce((s, r) => s + Number(r.gross_amount), 0)
  const totalOrders = (revenue ?? []).reduce((s, r) => s + (r.orders_count ?? 0), 0)
  const gallery = Array.isArray(product.gallery) ? (product.gallery as string[]) : []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/productos" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold tracking-tight">
                {product.name}
              </h2>
              <StatusBadge status={product.status ?? "testing"} />
            </div>
            <p className="text-sm text-muted-foreground">
              {product.target_audience ?? "Sin audiencia definida"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/productos/${product.slug}/editar`}>
              <Pencil className="mr-1 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <DeleteProductButton id={product.id} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Margen bruto"
          value={formatCOP(Number(product.margin ?? 0))}
          hint={`${formatCOP(Number(product.selling_price ?? 0))} venta − ${formatCOP(Number(product.cost_dropi ?? 0) + Number(product.shipping_cost ?? 0))} costos`}
          icon={Wallet}
          accent={Number(product.margin ?? 0) > 0 ? "green" : "red"}
        />
        <StatCard
          title="% margen"
          value={formatPercent(Number(product.margin_percentage ?? 0))}
          icon={Percent}
          accent="purple"
        />
        <StatCard
          title="CPA máx. rentable"
          value={formatCOP(Number(product.cpa_max_rentable ?? 0))}
          icon={TargetIcon}
          accent="yellow"
        />
        <StatCard
          title="Ingresos históricos"
          value={formatCOP(totalRevenue)}
          hint={`${totalOrders} pedidos registrados`}
          icon={Package}
          accent="blue"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Imágenes</CardTitle></CardHeader>
          <CardContent>
            {product.main_image_url || gallery.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {product.main_image_url && (
                  <div className="relative h-32 w-32 overflow-hidden rounded-md border">
                    <Image src={product.main_image_url} alt={product.name ?? ""} fill className="object-cover" unoptimized />
                  </div>
                )}
                {gallery.map((url) => (
                  <div key={url} className="relative h-32 w-32 overflow-hidden rounded-md border">
                    <Image src={url} alt="" fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin imágenes todavía.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Ángulo y contenido</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Mejor ángulo</p>
              <p>{product.best_angle ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Descripción</p>
              <p className="whitespace-pre-line text-muted-foreground">
                {product.description ?? "—"}
              </p>
            </div>
            {product.landing_url && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Landing</p>
                <p className="font-mono text-xs">{product.landing_url}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campañas vinculadas</CardTitle>
          </CardHeader>
          <CardContent>
            {(campaigns ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin campañas.{" "}
                <Link href="/campanas/nueva" className="underline underline-offset-4">
                  Crear una
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {(campaigns ?? []).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/campanas/${c.id}`}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary">
                          {PLATFORM_LABELS[c.platform] ?? c.platform}
                        </Badge>
                        <StatusBadge status={c.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-muted-foreground" />
              Historial de precios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(history ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin cambios registrados. Se guardan automáticamente al editar precios.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(history ?? []).map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {h.changed_at
                        ? format(parseISO(h.changed_at), "d MMM yyyy", { locale: es })
                        : "—"}
                      {h.reason && ` · ${h.reason}`}
                    </span>
                    <span className="font-mono text-xs tabular-nums">
                      venta {formatCOP(Number(h.selling_price ?? 0))} · costo{" "}
                      {formatCOP(Number(h.cost_dropi ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referencias de competencia</CardTitle>
        </CardHeader>
        <CardContent>
          <ReferenceManager productId={product.id} references={references ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
