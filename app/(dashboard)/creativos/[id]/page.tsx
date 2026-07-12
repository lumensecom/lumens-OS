import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Music, MousePointerClick } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { formatCOP } from "@/lib/format"
import { CREATIVE_PLATFORM_LABELS } from "@/lib/creativos"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreativeActions } from "@/components/creativos/creative-actions"

export default async function CreativoDetallePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: creative } = await supabase
    .from("creatives")
    .select("*")
    .eq("id", params.id)
    .single()
  if (!creative) notFound()

  const [{ data: product }, videoSigned] = await Promise.all([
    creative.product_id
      ? supabase.from("products").select("name, slug").eq("id", creative.product_id).single()
      : Promise.resolve({ data: null }),
    creative.video_url
      ? supabase.storage.from("creatives").createSignedUrl(creative.video_url, 3600)
      : Promise.resolve({ data: null }),
  ])

  const videoUrl = videoSigned.data?.signedUrl ?? null

  const metrics = [
    { label: "Gasto total", value: formatCOP(Number(creative.total_spend ?? 0)) },
    { label: "Conversiones", value: String(creative.total_conversions ?? 0) },
    { label: "Mejor CPA", value: creative.best_cpa != null ? formatCOP(Number(creative.best_cpa)) : "—" },
    { label: "Mejor ROAS", value: creative.best_roas != null ? `${Number(creative.best_roas).toFixed(2)}x` : "—" },
    { label: "Mejor CTR", value: creative.best_ctr != null ? `${Number(creative.best_ctr).toFixed(2)}%` : "—" },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/creativos" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold tracking-tight">
                {creative.name}
              </h2>
              <Badge variant="secondary">
                {CREATIVE_PLATFORM_LABELS[creative.platform] ?? creative.platform}
              </Badge>
              {creative.angle_type && (
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {creative.angle_type}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {product?.name ? (
                <Link href={`/productos/${product.slug}`} className="underline underline-offset-4">
                  {product.name}
                </Link>
              ) : (
                "Sin producto vinculado"
              )}
            </p>
          </div>
        </div>
        <CreativeActions id={creative.id} status={creative.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {videoUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={videoUrl} controls playsInline className="aspect-[9/16] w-full bg-lumens-black" />
            ) : (
              <div className="flex aspect-[9/16] items-center justify-center bg-muted text-sm text-muted-foreground">
                Sin video subido
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {metrics.map((m) => (
              <Card key={m.label}>
                <CardContent className="p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
                  <p className="font-mono text-sm font-medium tabular-nums">{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Estructura</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Hook (3 primeros segundos)</p>
                <p className="font-medium">{creative.hook ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Guion</p>
                <p className="whitespace-pre-line text-muted-foreground">{creative.script ?? "—"}</p>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <span className="flex items-center gap-1.5">
                  <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                  {creative.cta ?? "Sin CTA"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5 text-muted-foreground" />
                  {creative.music_ref ?? "Sin música de referencia"}
                </span>
              </div>
              {creative.notes && (
                <p className="border-t pt-3 text-muted-foreground">{creative.notes}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
