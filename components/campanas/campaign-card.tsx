import Link from "next/link"

import { formatCOP } from "@/lib/format"
import { PLATFORM_LABELS, type Semaforo } from "@/lib/campanas"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/campanas/status-badge"
import { SemaforoBadge } from "@/components/campanas/semaforo-badge"

export type CampaignCardData = {
  id: string
  name: string
  platform: string
  status: string
  productName: string | null
  semaforo: Semaforo
  cpa7d: number | null
  spend7d: number
  conversions7d: number
  roasLast: number | null
}

/** Card de campaña con métricas de los últimos 7 días y semáforo. */
export function CampaignCard({ campaign }: { campaign: CampaignCardData }) {
  return (
    <Link href={`/campanas/${campaign.id}`} className="group">
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{campaign.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {campaign.productName ?? "Sin producto"}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {PLATFORM_LABELS[campaign.platform] ?? campaign.platform}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <SemaforoBadge value={campaign.semaforo} />
            <StatusBadge status={campaign.status} />
          </div>

          <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
            <Metric
              label="CPA 7d"
              value={
                campaign.cpa7d === null
                  ? "—"
                  : campaign.cpa7d === Infinity
                    ? "∞"
                    : formatCOP(campaign.cpa7d)
              }
            />
            <Metric label="Gasto 7d" value={formatCOP(campaign.spend7d)} />
            <Metric
              label="ROAS"
              value={campaign.roasLast === null ? "—" : `${campaign.roasLast.toFixed(2)}x`}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="truncate font-mono text-sm font-medium tabular-nums">{value}</p>
    </div>
  )
}
