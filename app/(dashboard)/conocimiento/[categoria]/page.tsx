import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Plus, FileText } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArticleCard } from "@/components/conocimiento/article-card"

export default async function CategoriaPage({
  params,
}: {
  params: { categoria: string }
}) {
  const supabase = createClient()

  const { data: category } = await supabase
    .from("knowledge_categories")
    .select("*")
    .eq("slug", params.categoria)
    .single()
  if (!category) notFound()

  const { data: articles } = await supabase
    .from("knowledge_articles")
    .select("*")
    .eq("category_id", category.id)
    .order("is_pinned", { ascending: false })
    .order("order_index")
    .order("updated_at", { ascending: false })

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/conocimiento" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="page-title">
              {category.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {(articles ?? []).length} artículo(s)
            </p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href="/conocimiento/nuevo">
            <Plus className="mr-1 h-4 w-4" />
            Nuevo artículo
          </Link>
        </Button>
      </div>

      {(articles ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <FileText className="h-8 w-8" />
          <p className="text-sm">Sin artículos en esta categoría todavía.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(articles ?? []).map((a) => (
            <ArticleCard key={a.id} article={a} categorySlug={category.slug} />
          ))}
        </div>
      )}
    </div>
  )
}
