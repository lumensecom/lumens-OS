import { format, subDays } from "date-fns"

import { createClient } from "@/lib/supabase/server"
import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants"
import { REVENUE_SOURCE_LABELS } from "@/lib/contabilidad"

export type TopCampaign = { id: string; name: string; roas: number; spend: number }
export type TopProduct = { name: string; margin: number; marginPct: number }
export type Movement = {
  id: string
  kind: "ingreso" | "gasto"
  date: string
  label: string
  amount: number
}

/** Campañas activas + top 3 por ROAS ponderado de los últimos 30 días. */
export async function fetchCampaignHighlights(): Promise<{
  activeCount: number
  top: TopCampaign[]
}> {
  const supabase = createClient()
  const since = format(subDays(new Date(), 30), "yyyy-MM-dd")

  const [{ count }, { data: campaigns }, { data: metrics }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("campaigns").select("id, name").neq("status", "archived"),
    supabase
      .from("campaign_metrics")
      .select("campaign_id, spend, roas")
      .gte("date", since),
  ])

  const nameById = new Map((campaigns ?? []).map((c) => [c.id, c.name]))
  const agg = new Map<string, { weighted: number; spend: number }>()

  for (const m of metrics ?? []) {
    if (!m.campaign_id || m.roas == null) continue
    const spend = Number(m.spend)
    const prev = agg.get(m.campaign_id) ?? { weighted: 0, spend: 0 }
    prev.weighted += Number(m.roas) * spend
    prev.spend += spend
    agg.set(m.campaign_id, prev)
  }

  const top = Array.from(agg.entries())
    .filter(([id, v]) => v.spend > 0 && nameById.has(id))
    .map(([id, v]) => ({
      id,
      name: nameById.get(id)!,
      roas: v.weighted / v.spend,
      spend: v.spend,
    }))
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 3)

  return { activeCount: count ?? 0, top }
}

/** Top 3 productos por margen unitario (vista products_with_margin). */
export async function fetchTopProducts(): Promise<TopProduct[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("products_with_margin")
    .select("name, margin, margin_percentage, status")
    .in("status", ["active", "testing", "paused"])
    .order("margin", { ascending: false })
    .limit(3)

  return (data ?? [])
    .filter((p) => p.margin != null && Number(p.margin) > 0)
    .map((p) => ({
      name: p.name ?? "—",
      margin: Number(p.margin),
      marginPct: Number(p.margin_percentage ?? 0),
    }))
}

/** Últimos 5 movimientos contables (ingresos + gastos). */
export async function fetchRecentMovements(): Promise<Movement[]> {
  const supabase = createClient()
  const [{ data: rev }, { data: exp }] = await Promise.all([
    supabase
      .from("revenue_entries")
      .select("id, date, source, gross_amount, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("expense_entries")
      .select("id, date, category, amount, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const movements: (Movement & { createdAt: string })[] = [
    ...(rev ?? []).map((r) => ({
      id: r.id,
      kind: "ingreso" as const,
      date: r.date,
      label: REVENUE_SOURCE_LABELS[r.source] ?? r.source,
      amount: Number(r.gross_amount),
      createdAt: r.created_at ?? "",
    })),
    ...(exp ?? []).map((e) => ({
      id: e.id,
      kind: "gasto" as const,
      date: e.date,
      label: EXPENSE_CATEGORY_LABELS[e.category] ?? e.category,
      amount: -Number(e.amount),
      createdAt: e.created_at ?? "",
    })),
  ]

  return movements
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5)
}
