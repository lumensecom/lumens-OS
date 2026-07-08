import Link from "next/link"
import { Pin } from "lucide-react"

import { extractExcerpt } from "@/lib/conocimiento"
import type { KnowledgeArticle } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

/** Card de artículo con extracto y tags. */
export function ArticleCard({
  article,
  categorySlug,
}: {
  article: KnowledgeArticle
  categorySlug: string
}) {
  return (
    <Link href={`/conocimiento/${categorySlug}/${article.slug}`} className="group">
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium leading-snug">{article.title}</p>
            {article.is_pinned && (
              <Pin className="h-4 w-4 shrink-0 text-primary" />
            )}
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {extractExcerpt(article.content)}
          </p>
          {(article.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(article.tags ?? []).slice(0, 4).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[11px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
