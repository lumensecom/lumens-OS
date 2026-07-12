import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { CREATIVE_STATUSES, CREATIVE_PLATFORMS } from "@/lib/creativos"
import { Button } from "@/components/ui/button"
import { CreativeForm } from "@/components/creativos/creative-form"

export default async function EditarCreativoPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const [{ data: creative }, { data: products }] = await Promise.all([
    supabase.from("creatives").select("*").eq("id", params.id).single(),
    supabase.from("products").select("id, name").order("name"),
  ])
  if (!creative) notFound()

  const status = CREATIVE_STATUSES.find((s) => s === creative.status) ?? "testing"
  const platform = CREATIVE_PLATFORMS.find((p) => p === creative.platform) ?? "meta"

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/creativos/${creative.id}`} aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Editar creativo
          </h2>
          <p className="text-sm text-muted-foreground">{creative.name}</p>
        </div>
      </div>
      <CreativeForm
        creativeId={creative.id}
        products={products ?? []}
        defaultValues={{
          name: creative.name,
          product_id: creative.product_id ?? "none",
          platform,
          status,
          video_url: creative.video_url,
          thumbnail_url: creative.thumbnail_url,
          duration_seconds: creative.duration_seconds ?? undefined,
          hook: creative.hook ?? "",
          script: creative.script ?? "",
          cta: creative.cta ?? "",
          music_ref: creative.music_ref ?? "",
          angle_type: creative.angle_type ?? "",
          total_spend: creative.total_spend != null ? Number(creative.total_spend) : undefined,
          total_conversions: creative.total_conversions ?? undefined,
          best_cpa: creative.best_cpa != null ? Number(creative.best_cpa) : undefined,
          best_roas: creative.best_roas != null ? Number(creative.best_roas) : undefined,
          best_ctr: creative.best_ctr != null ? Number(creative.best_ctr) : undefined,
          notes: creative.notes ?? "",
        }}
      />
    </div>
  )
}
