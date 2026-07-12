import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { MetricsUploader } from "@/components/campanas/metrics-uploader"

export default async function UploadMetricsPage() {
  const supabase = createClient()
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, platform")
    .neq("status", "archived")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/campanas" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="page-title">
            Subir métricas desde CSV
          </h2>
          <p className="text-sm text-muted-foreground">
            Exporta el reporte diario de Meta Ads Manager o TikTok Ads Manager
          </p>
        </div>
      </div>
      <MetricsUploader campaigns={campaigns ?? []} />
    </div>
  )
}
