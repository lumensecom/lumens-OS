import Link from "next/link"
import { notFound } from "next/navigation"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, Pin } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Markdown } from "@/components/conocimiento/markdown"
import { ArticleActions } from "@/components/conocimiento/article-actions"

export default async function ArticuloPage({
  params,
}: {
  params: { categoria: string; slug: string }
}) {
  const supabase = createClient()

  const { data: article } = await supabase
    .from("knowledge_articles")
    .select("*")
    .eq("slug", params.slug)
    .single()
  if (!article) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/conocimiento/${params.categoria}`} aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="page-title">
                {article.title}
              </h2>
              {article.is_pinned && <Pin className="h-4 w-4 text-primary" />}
            </div>
            <p className="text-sm text-muted-foreground">
              Actualizado{" "}
              {article.updated_at
                ? format(parseISO(article.updated_at), "d 'de' MMMM yyyy", { locale: es })
                : "—"}
            </p>
          </div>
        </div>
        <ArticleActions
          id={article.id}
          editHref={`/conocimiento/${params.categoria}/${article.slug}/editar`}
        />
      </div>

      {(article.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(article.tags ?? []).map((tag) => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          {article.content ? (
            <Markdown content={article.content} />
          ) : (
            <p className="text-sm text-muted-foreground">Artículo vacío.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
