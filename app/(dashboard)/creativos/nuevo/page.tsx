import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { CreativeForm } from "@/components/creativos/creative-form"

export default async function NuevoCreativoPage() {
  const supabase = createClient()
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .order("name")

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/creativos" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Nuevo creativo
          </h2>
          <p className="text-sm text-muted-foreground">
            El thumbnail se genera automáticamente del primer frame
          </p>
        </div>
      </div>
      <CreativeForm products={products ?? []} />
    </div>
  )
}
