import Link from "next/link"
import { Plus, Upload, TrendingUp } from "lucide-react"

import { fetchCampaignCards } from "@/lib/campanas-queries"
import { firstParam, type SearchParams } from "@/lib/contabilidad-queries"
import { Button } from "@/components/ui/button"
import { PlatformFilter } from "@/components/campanas/platform-filter"
import { CampaignCard } from "@/components/campanas/campaign-card"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default async function CampanasPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const platform = firstParam(searchParams.plataforma)
  const campaigns = await fetchCampaignCards(platform)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Campañas
          </h2>
          <p className="text-sm text-muted-foreground">
            Semáforo según CPA vs margen del producto
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/campanas/upload">
              <Upload className="mr-1 h-4 w-4" />
              Subir CSV
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/campanas/nueva">
              <Plus className="mr-1 h-4 w-4" />
              Nueva campaña
            </Link>
          </Button>
        </div>
      </div>

      <PlatformFilter />

      {campaigns.length === 0 ? (
        <ModulePlaceholder
          icon={TrendingUp}
          accent="blue"
          title="Sin campañas todavía"
          description="Crea tu primera campaña y registra sus métricas diarias, o súbelas desde un CSV de Meta/TikTok Ads Manager."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  )
}
