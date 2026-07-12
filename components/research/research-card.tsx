import Link from "next/link"
import Image from "next/image"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatCOP } from "@/lib/format"
import { RESEARCH_STATUS_LABELS, SOURCE_LABELS, scoreColor } from "@/lib/research"
import type { ResearchProduct } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

/** Card de candidato: imagen, score total, estado y margen estimado. */
export function ResearchCard({ item }: { item: ResearchProduct }) {
  const total = item.total_score ?? 0

  return (
    <Link href={`/research/${item.id}`} className="group">
      <Card className="h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className="relative aspect-[4/3] bg-muted">
          {item.main_image_url ? (
            <Image
              src={item.main_image_url}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Search className="h-8 w-8" />
            </div>
          )}
          <span
            className={cn(
              "absolute right-2 top-2 rounded-full px-2 py-0.5 font-mono text-xs font-bold backdrop-blur",
              scoreColor(total),
            )}
          >
            {total}/50
          </span>
        </div>
        <CardContent className="space-y-2 p-3">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className="text-[11px]">
              {RESEARCH_STATUS_LABELS[item.status ?? "candidate"]}
            </Badge>
            <span className="truncate text-xs text-muted-foreground">
              {item.estimated_margin != null
                ? `Margen ${formatCOP(Number(item.estimated_margin))}`
                : (SOURCE_LABELS[item.source_platform ?? ""] ?? "")}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
