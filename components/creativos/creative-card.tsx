import Link from "next/link"
import Image from "next/image"
import { Clapperboard, Play } from "lucide-react"

import { formatCOP } from "@/lib/format"
import { CREATIVE_PLATFORM_LABELS } from "@/lib/creativos"
import type { Creative } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/campanas/status-badge"

/** Card de creativo. `thumbUrl` es una signed URL generada server-side. */
export function CreativeCard({
  creative,
  thumbUrl,
}: {
  creative: Creative
  thumbUrl: string | null
}) {
  return (
    <Link href={`/creativos/${creative.id}`} className="group">
      <Card className="h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className="relative aspect-[9/12] bg-lumens-black">
          {thumbUrl ? (
            <Image src={thumbUrl} alt={creative.name} fill className="object-cover opacity-90" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Clapperboard className="h-8 w-8" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Play className="ml-0.5 h-5 w-5" />
            </span>
          </div>
          {creative.duration_seconds != null && creative.duration_seconds > 0 && (
            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white">
              {creative.duration_seconds}s
            </span>
          )}
        </div>
        <CardContent className="space-y-2 p-3">
          <p className="truncate text-sm font-medium">{creative.name}</p>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className="text-[11px]">
              {CREATIVE_PLATFORM_LABELS[creative.platform] ?? creative.platform}
            </Badge>
            <StatusBadge status={creative.status} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">
              {creative.best_cpa != null ? `CPA ${formatCOP(Number(creative.best_cpa))}` : "CPA —"}
            </span>
            <span className="font-mono">
              {creative.best_roas != null ? `${Number(creative.best_roas).toFixed(1)}x` : "ROAS —"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
