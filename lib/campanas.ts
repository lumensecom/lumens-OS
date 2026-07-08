import { z } from "zod"

import type { CampaignMetric } from "@/lib/types"

export const CAMPAIGN_PLATFORMS = ["meta", "tiktok", "marketplace"] as const
export const CAMPAIGN_STATUSES = ["active", "paused", "testing", "archived"] as const

export const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  tiktok: "TikTok",
  marketplace: "Marketplace",
}

/** Schema para crear/editar una campaña. */
export const campaignSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  platform: z.enum(CAMPAIGN_PLATFORMS),
  product_id: z.string().optional().nullable(),
  status: z.enum(CAMPAIGN_STATUSES),
  daily_budget: z.coerce.number().nonnegative().optional().nullable(),
  external_id: z.string().optional().nullable(),
  started_at: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

/** Schema para una métrica diaria manual. */
export const metricSchema = z.object({
  date: z.string().min(1, "Fecha requerida"),
  spend: z.coerce.number().nonnegative("No puede ser negativo"),
  impressions: z.coerce.number().int().nonnegative().optional(),
  clicks: z.coerce.number().int().nonnegative().optional(),
  conversions: z.coerce.number().int().nonnegative().optional(),
  roas: z.coerce.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type CampaignInput = z.infer<typeof campaignSchema>
export type MetricInput = z.infer<typeof metricSchema>

export type Semaforo = "green" | "yellow" | "red" | "none"

export const SEMAFORO_LABELS: Record<Semaforo, string> = {
  green: "Saludable",
  yellow: "Vigilar",
  red: "Crítico",
  none: "Sin datos",
}

/**
 * Reglas LUMENS de semáforo:
 * verde CPA < 50% del margen · amarillo 50-80% · rojo > 80%.
 */
export function semaforoForCpa(
  cpa: number | null,
  margin: number | null,
): Semaforo {
  if (cpa === null || !margin || margin <= 0) return "none"
  const ratio = cpa / margin
  if (ratio < 0.5) return "green"
  if (ratio <= 0.8) return "yellow"
  return "red"
}

type MetricSlice = Pick<CampaignMetric, "date" | "spend" | "conversions">

/** CPA agregado de los últimos `days` días con datos (gasto total / conversiones totales). */
export function aggregateCpa(metrics: MetricSlice[], days = 7): number | null {
  const recent = [...metrics]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, days)
  const spend = recent.reduce((s, m) => s + Number(m.spend), 0)
  const conv = recent.reduce((s, m) => s + (m.conversions ?? 0), 0)
  if (conv === 0) return spend > 0 ? Infinity : null
  return spend / conv
}

export type Recommendation = {
  kind: "pause" | "scale" | "watch" | "none"
  message: string
}

/**
 * Recomendación según reglas LUMENS:
 * - 3 días seguidos en rojo → pausar.
 * - 3 días seguidos en verde con conversiones → escalar 25%.
 */
export function recommend(
  metrics: MetricSlice[],
  margin: number | null,
): Recommendation {
  if (!margin || margin <= 0 || metrics.length === 0) {
    return { kind: "none", message: "Registra métricas y margen para ver recomendaciones." }
  }
  const last3 = [...metrics]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3)
  if (last3.length < 3) {
    return { kind: "watch", message: "Aún hay pocos días de datos. Sigue midiendo." }
  }

  const daySemaforo = last3.map((m) => {
    const conv = m.conversions ?? 0
    const cpa = conv > 0 ? Number(m.spend) / conv : Number(m.spend) > 0 ? Infinity : null
    return { semaforo: semaforoForCpa(cpa, margin), conv }
  })

  if (daySemaforo.every((d) => d.semaforo === "red")) {
    return {
      kind: "pause",
      message: "CPA > 80% del margen por 3 días seguidos. Pausar por regla de 3 días.",
    }
  }
  if (daySemaforo.every((d) => d.semaforo === "green" && d.conv >= 1)) {
    return {
      kind: "scale",
      message: "3 días en verde con conversiones. Esta campaña debería escalar 25%.",
    }
  }
  return { kind: "watch", message: "Rendimiento mixto. Mantén el presupuesto y vigila el CPA." }
}
