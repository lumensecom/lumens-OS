import Link from "next/link"
import { ArrowLeft, SearchX } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { firstParam, type SearchParams } from "@/lib/contabilidad-queries"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/conocimiento/search-bar"
import { ArticleCard } from "@/components/conocimiento/article-card"

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const q = (firstParam(searchParams.q) ?? "").trim()
  const supabase = createClient()

  const [{ data: categories }, { data: results }] = await Promise.all([
    supabase.from("knowledge_categories").select("id, slug"),
    q
      ? supabase
          .from("knowledge_articles")
          .select("*")
          .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
          .order("is_pinned", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
  ])

  const slugById = new Map((categories ?? []).map((c) => [c.id, c.slug]))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/conocimiento" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="page-title">Buscar</h2>
          {q && (
            <p className="text-sm text-muted-foreground">
              {(results ?? []).length} resultado(s) para “{q}”
            </p>
          )}
        </div>
      </div>

      <SearchBar initial={q} />

      {q && (results ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <SearchX className="h-8 w-8" />
          <p className="text-sm">Sin resultados. Prueba con otras palabras.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(results ?? []).map((a) => (
            <ArticleCard
              key={a.id}
              article={a}
              categorySlug={slugById.get(a.category_id ?? "") ?? ""}
            />
          ))}
        </div>
      )}
    </div>
  )
}
