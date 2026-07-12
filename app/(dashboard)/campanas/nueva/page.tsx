import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { NewCampaignForm } from "@/components/campanas/new-campaign-form"

export default async function NuevaCampanaPage() {
  const supabase = createClient()
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .order("name")

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
            Nueva campaña
          </h2>
          <p className="text-sm text-muted-foreground">
            Vincula un producto para activar el semáforo de CPA
          </p>
        </div>
      </div>
      <NewCampaignForm products={products ?? []} />
    </div>
  )
}
