import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArticleEditor } from "@/components/conocimiento/article-editor"

export default async function NuevoArticuloPage() {
  const supabase = createClient()
  const { data: categories } = await supabase
    .from("knowledge_categories")
    .select("id, name")
    .order("order_index")

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/conocimiento" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Nuevo artículo
          </h2>
          <p className="text-sm text-muted-foreground">
            Markdown con vista previa en vivo
          </p>
        </div>
      </div>
      <ArticleEditor categories={categories ?? []} />
    </div>
  )
}
