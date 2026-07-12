import Link from "next/link"
import { Plus, Pin } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { CategoryCard } from "@/components/conocimiento/category-card"
import { ArticleCard } from "@/components/conocimiento/article-card"
import { SearchBar } from "@/components/conocimiento/search-bar"

export default async function ConocimientoPage() {
  const supabase = createClient()

  const [{ data: categories }, { data: articles }] = await Promise.all([
    supabase.from("knowledge_categories").select("*").order("order_index"),
    supabase
      .from("knowledge_articles")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false }),
  ])

  const countByCategory = new Map<string, number>()
  for (const a of articles ?? []) {
    if (a.category_id) {
      countByCategory.set(a.category_id, (countByCategory.get(a.category_id) ?? 0) + 1)
    }
  }
  const slugById = new Map((categories ?? []).map((c) => [c.id, c.slug]))
  const pinned = (articles ?? []).filter((a) => a.is_pinned).slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Base de conocimiento
          </h2>
          <p className="text-sm text-muted-foreground">
            Procesos, plantillas y aprendizajes del negocio
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/conocimiento/nuevo">
            <Plus className="mr-1 h-4 w-4" />
            Nuevo artículo
          </Link>
        </Button>
      </div>

      <SearchBar />

      <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(categories ?? []).map((c) => (
          <CategoryCard
            key={c.id}
            category={c}
            count={countByCategory.get(c.id) ?? 0}
          />
        ))}
      </div>

      {pinned.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Pin className="h-4 w-4 text-primary" />
            Artículos fijados
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pinned.map((a) => (
              <ArticleCard
                key={a.id}
                article={a}
                categorySlug={slugById.get(a.category_id ?? "") ?? ""}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
