import { z } from "zod"

export const PRODUCT_STATUSES = ["active", "testing", "paused", "archived"] as const

/** Schema completo de un producto. Los montos van en COP. */
export const productSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  slug: z
    .string()
    .min(2, "Slug requerido")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones"),
  status: z.enum(PRODUCT_STATUSES),
  selling_price: z.coerce.number().nonnegative("No puede ser negativo"),
  compared_price: z.coerce.number().nonnegative().optional().nullable(),
  cost_dropi: z.coerce.number().nonnegative("No puede ser negativo"),
  shipping_cost: z.coerce.number().nonnegative("No puede ser negativo"),
  landing_url: z.string().optional().nullable(),
  shopify_product_id: z.string().optional().nullable(),
  dropi_product_id: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  main_image_url: z.string().optional().nullable(),
  gallery: z.array(z.string()).default([]),
  best_angle: z.string().optional().nullable(),
  target_audience: z.string().optional().nullable(),
})

export type ProductInput = z.infer<typeof productSchema>

/** Schema de una referencia de competencia. */
export const referenceSchema = z.object({
  ref_type: z.enum(["store", "ad", "video"]),
  url: z.string().url("URL inválida"),
  title: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type ReferenceInput = z.infer<typeof referenceSchema>

export const REF_TYPE_LABELS: Record<string, string> = {
  store: "Tienda",
  ad: "Anuncio",
  video: "Video",
}

/** Convierte un nombre a slug URL-safe. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Margen bruto, % de margen y CPA máximo rentable. */
export function computeMargin(
  selling: number,
  cost: number,
  shipping: number,
): { margin: number; marginPct: number; cpaMax: number } {
  const margin = selling - cost - shipping
  const marginPct = selling > 0 ? (margin / selling) * 100 : 0
  return { margin, marginPct, cpaMax: margin }
}
