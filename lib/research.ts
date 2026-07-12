import { z } from "zod"

export const RESEARCH_STATUSES = ["candidate", "testing", "winner", "rejected"] as const

export const RESEARCH_STATUS_LABELS: Record<string, string> = {
  candidate: "Candidato",
  testing: "En prueba",
  winner: "Ganador",
  rejected: "Rechazado",
}

export const SOURCE_PLATFORMS = [
  "meta_ads_library",
  "tiktok",
  "aliexpress",
  "amazon",
  "dropi",
  "otro",
] as const

export const SOURCE_LABELS: Record<string, string> = {
  meta_ads_library: "Meta Ads Library",
  tiktok: "TikTok",
  aliexpress: "AliExpress",
  amazon: "Amazon",
  dropi: "Dropi",
  otro: "Otro",
}

const score = z.coerce.number().int().min(0, "0-10").max(10, "0-10").optional()

/** Schema de un candidato de research (los 5 criterios LUMENS van 0-10). */
export const researchSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  status: z.enum(RESEARCH_STATUSES),
  score_margin: score,
  score_demand: score,
  score_visual: score,
  score_logistics: score,
  score_competition: score,
  estimated_selling_price: z.coerce.number().nonnegative().optional().nullable(),
  estimated_cost: z.coerce.number().nonnegative().optional().nullable(),
  source_platform: z.string().optional().nullable(),
  source_url: z.string().optional().nullable(),
  main_image_url: z.string().optional().nullable(),
  gallery: z.array(z.string()).default([]),
  hooks_ideas: z.array(z.string()).default([]),
  target_audience: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type ResearchInput = z.infer<typeof researchSchema>

/** Referencia de evidencia (ad, tienda, video, artículo). */
export const researchReferenceSchema = z.object({
  ref_type: z.enum(["ad", "store", "video", "article"]),
  url: z.string().url("URL inválida"),
  platform: z.string().optional().nullable(),
  days_active: z.coerce.number().int().nonnegative().optional().nullable(),
  engagement_notes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type ResearchReferenceInput = z.infer<typeof researchReferenceSchema>

export const RESEARCH_REF_LABELS: Record<string, string> = {
  ad: "Anuncio",
  store: "Tienda",
  video: "Video",
  article: "Artículo",
}

export const CRITERIA: { key: keyof ResearchInput; label: string; hint: string }[] = [
  { key: "score_margin", label: "Margen", hint: "¿Deja margen >50% tras costos?" },
  { key: "score_demand", label: "Demanda", hint: "¿Competidores con ads activos hace semanas?" },
  { key: "score_visual", label: "Visual", hint: "¿Se entiende en 3 segundos de video?" },
  { key: "score_logistics", label: "Logística", hint: "¿Disponible en Dropi con cobertura?" },
  { key: "score_competition", label: "Competencia", hint: "¿Hay hueco o está saturado?" },
]

/** Color del badge según el score total (0-50). */
export function scoreColor(total: number): string {
  if (total >= 35) return "text-lumens-green bg-lumens-green/15"
  if (total >= 25) return "text-[hsl(43_90%_38%)] dark:text-primary bg-primary/15"
  return "text-lumens-red bg-lumens-red/15"
}
