import { format, subDays } from "date-fns"

import { createClient } from "@/lib/supabase/server"
import { aggregateCpa, semaforoForCpa } from "@/lib/campanas"
import type { CampaignCardData } from "@/components/campanas/campaign-card"

/** Campañas con métricas 7d agregadas, semáforo y nombre de producto. */
export async function fetchCampaignCards(
  platform?: string,
): Promise<CampaignCardData[]> {
  const supabase = createClient()
  const since = format(subDays(new Date(), 7), "yyyy-MM-dd")

  let query = supabase
    .from("campaigns")
    .select("*")
    .neq("status", "archived")
    .order("created_at", { ascending: false })
  if (platform === "meta" || platform === "tiktok") {
    query = query.eq("platform", platform)
  }

  const [{ data: campaigns }, { data: margins }, { data: metrics }] =
    await Promise.all([
      query,
      supabase.from("products_with_margin").select("id, name, margin"),
      supabase
        .from("campaign_metrics")
        .select("campaign_id, date, spend, conversions, roas")
        .gte("date", since),
    ])

  const marginById = new Map(
    (margins ?? []).map((p) => [p.id as string, p]),
  )

  return (campaigns ?? []).map((c) => {
    const own = (metrics ?? []).filter((m) => m.campaign_id === c.id)
    const cpa7d = aggregateCpa(own)
    const spend7d = own.reduce((s, m) => s + Number(m.spend), 0)
    const conversions7d = own.reduce((s, m) => s + (m.conversions ?? 0), 0)
    const latest = [...own].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    const product = c.product_id ? marginById.get(c.product_id) : undefined
    const margin = product?.margin != null ? Number(product.margin) : null

    return {
      id: c.id,
      name: c.name,
      platform: c.platform,
      status: c.status,
      productName: (product?.name as string) ?? null,
      semaforo: semaforoForCpa(cpa7d, margin),
      cpa7d,
      spend7d,
      conversions7d,
      roasLast: latest?.roas != null ? Number(latest.roas) : null,
    }
  })
}
