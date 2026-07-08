import Link from "next/link"
import {
  Workflow, Search, Layout, Video, TrendingUp, Target, RefreshCw, Wrench,
  BookOpen, type LucideIcon,
} from "lucide-react"

import type { KnowledgeCategory } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"

const ICONS: Record<string, LucideIcon> = {
  workflow: Workflow,
  search: Search,
  layout: Layout,
  video: Video,
  "trending-up": TrendingUp,
  target: Target,
  "refresh-cw": RefreshCw,
  wrench: Wrench,
}

/** Card de categoría con ícono y color propios. */
export function CategoryCard({
  category,
  count,
}: {
  category: KnowledgeCategory
  count: number
}) {
  const Icon = ICONS[category.icon ?? ""] ?? BookOpen
  const color = category.color ?? "#71717a"

  return (
    <Link href={`/conocimiento/${category.slug}`} className="group">
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{category.name}</p>
            <p className="text-xs text-muted-foreground">
              {count} artículo{count === 1 ? "" : "s"}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
