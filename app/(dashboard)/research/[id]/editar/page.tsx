import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { RESEARCH_STATUSES } from "@/lib/research"
import { Button } from "@/components/ui/button"
import { ResearchForm } from "@/components/research/research-form"

export default async function EditarResearchPage({
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

  const status = RESEARCH_STATUSES.find((s) => s === item.status) ?? "candidate"

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/research/${item.id}`} aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="page-title">
            Editar candidato
          </h2>
          <p className="text-sm text-muted-foreground">{item.name}</p>
        </div>
      </div>
      <ResearchForm
        researchId={item.id}
        defaultValues={{
          name: item.name,
          status,
          score_margin: item.score_margin ?? undefined,
          score_demand: item.score_demand ?? undefined,
          score_visual: item.score_visual ?? undefined,
          score_logistics: item.score_logistics ?? undefined,
          score_competition: item.score_competition ?? undefined,
          estimated_selling_price:
            item.estimated_selling_price != null ? Number(item.estimated_selling_price) : undefined,
          estimated_cost:
            item.estimated_cost != null ? Number(item.estimated_cost) : undefined,
          source_platform: item.source_platform ?? "otro",
          source_url: item.source_url ?? "",
          main_image_url: item.main_image_url,
          gallery: Array.isArray(item.gallery) ? (item.gallery as string[]) : [],
          hooks_ideas: item.hooks_ideas ?? [],
          target_audience: item.target_audience ?? "",
          notes: item.notes ?? "",
        }}
      />
    </div>
  )
}
