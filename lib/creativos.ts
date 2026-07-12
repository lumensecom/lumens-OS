import { z } from "zod"

export const CREATIVE_STATUSES = ["winning", "testing", "paused", "archived"] as const
export const CREATIVE_PLATFORMS = ["meta", "tiktok", "both"] as const

export const CREATIVE_PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  tiktok: "TikTok",
  both: "Ambas",
}

/**
 * Schema de un creativo. `video_url` y `thumbnail_url` guardan la RUTA en el
 * bucket privado `creatives`; el acceso se hace con signed URLs.
 */
export const creativeSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  product_id: z.string().optional().nullable(),
  platform: z.enum(CREATIVE_PLATFORMS),
  status: z.enum(CREATIVE_STATUSES),
  video_url: z.string().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
  duration_seconds: z.coerce.number().int().nonnegative().optional().nullable(),
  hook: z.string().optional().nullable(),
  script: z.string().optional().nullable(),
  cta: z.string().optional().nullable(),
  music_ref: z.string().optional().nullable(),
  angle_type: z.string().optional().nullable(),
  total_spend: z.coerce.number().nonnegative().optional().nullable(),
  total_conversions: z.coerce.number().int().nonnegative().optional().nullable(),
  best_cpa: z.coerce.number().nonnegative().optional().nullable(),
  best_roas: z.coerce.number().nonnegative().optional().nullable(),
  best_ctr: z.coerce.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type CreativeInput = z.infer<typeof creativeSchema>
