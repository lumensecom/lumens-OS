import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArticleEditor } from "@/components/conocimiento/article-editor"

export default async function EditarArticuloPage({
  params,
}: {
  params: { categoria: string; slug: string }
}) {
  const supabase = createClient()

  const [{ data: article }, { data: categories }] = await Promise.all([
    supabase.from("knowledge_articles").select("*").eq("slug", params.slug).single(),
    supabase.from("knowledge_categories").select("id, name").order("order_index"),
  ])
  if (!article) notFound()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/conocimiento/${params.categoria}/${article.slug}`}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="page-title">
            Editar artículo
          </h2>
          <p className="text-sm text-muted-foreground">{article.title}</p>
        </div>
      </div>
      <ArticleEditor
        articleId={article.id}
        categories={categories ?? []}
        defaultValues={{
          title: article.title,
          slug: article.slug,
          category_id: article.category_id ?? undefined,
          content: article.content ?? "",
          tags: article.tags ?? [],
          is_pinned: article.is_pinned ?? false,
        }}
      />
    </div>
  )
}
