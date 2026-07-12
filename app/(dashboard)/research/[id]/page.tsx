import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { formatCOP } from "@/lib/format"
import { SOURCE_LABELS, scoreColor } from "@/lib/research"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScoreRadar } from "@/components/research/score-radar"
import { ResearchActions } from "@/components/research/research-actions"
import { ResearchReferences } from "@/components/research/research-references"

export default async function ResearchDetallePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: item } = await supabase
    .from("research_products")
    .select("*")
    .eq("id", params.id)
    .single()
  if (!item) notFound()

  const { data: references } = await supabase
    .from("research_references")
    .select("*")
    .eq("research_product_id", item.id)
    .order("created_at", { ascending: false })

  const gallery = Array.isArray(item.gallery) ? (item.gallery as string[]) : []
  const total = item.total_score ?? 0

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/research" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="page-title">
                {item.name}
              </h2>
              <span className={cn("rounded-full px-2.5 py-0.5 font-mono text-sm font-bold", scoreColor(total))}>
                {total}/50
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {SOURCE_LABELS[item.source_platform ?? ""] ?? "Origen desconocido"}
              {item.source_url && (
                <a href={item.source_url} target="_blank" rel="noreferrer"
                  className="ml-2 inline-flex items-center gap-1 underline underline-offset-4">
                  ver origen <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>
          </div>
        </div>
        <ResearchActions id={item.id} status={item.status ?? "candidate"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Los 5 criterios</CardTitle></CardHeader>
          <CardContent>
            <ScoreRadar
              scores={{
                margin: item.score_margin ?? 0,
                demand: item.score_demand ?? 0,
                visual: item.score_visual ?? 0,
                logistics: item.score_logistics ?? 0,
                competition: item.score_competition ?? 0,
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Economía estimada</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Venta</p>
                <p className="font-mono font-medium">{formatCOP(Number(item.estimated_selling_price ?? 0))}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Costo</p>
                <p className="font-mono font-medium">{formatCOP(Number(item.estimated_cost ?? 0))}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Margen / CPA máx</p>
                <p className={cn("font-mono font-medium",
                  Number(item.estimated_margin ?? 0) > 0 ? "text-lumens-green" : "text-lumens-red")}>
                  {formatCOP(Number(item.estimated_margin ?? 0))}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Ideas de hooks</CardTitle></CardHeader>
            <CardContent>
              {(item.hooks_ideas ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin hooks anotados.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(item.hooks_ideas ?? []).map((h) => (
                    <Badge key={h} variant="secondary">{h}</Badge>
                  ))}
                </div>
              )}
              {item.target_audience && (
                <p className="mt-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Audiencia:</span>{" "}
                  {item.target_audience}
                </p>
              )}
              {item.notes && (
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{item.notes}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {(item.main_image_url || gallery.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Imágenes</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {[item.main_image_url, ...gallery].filter(Boolean).map((url) => (
              <div key={url} className="relative h-32 w-32 overflow-hidden rounded-md border">
                <Image src={url as string} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Evidencia y referencias</CardTitle></CardHeader>
        <CardContent>
          <ResearchReferences researchId={item.id} references={references ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
