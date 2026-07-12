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
  fulfillment_cost: z.coerce.number().nonnegative("No puede ser negativo").default(0),
  cpa_real: z.coerce.number().nonnegative().optional().nullable(),
  admin_cost: z.coerce.number().nonnegative("No puede ser negativo").default(2000),
  price_rule_pct: z.coerce.number().min(1).max(100).default(50),
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

export type Costing = {
  /** Costo total del producto puesto en la puerta (costo + fulfillment + flete). */
  cogs: number
  /** Margen bruto por venta (venta − COGS). */
  margin: number
  marginPct: number
  /** El margen bruto es a la vez el CPA máximo de break-even. */
  cpaMax: number
  /** Utilidad neta = margen − publicidad (CPA) − costo admin. */
  utility: number
  utilityPct: number
  /** Precio mínimo según la regla (COGS ≤ rulePct% del precio). */
  minPrice: number
  /** true si el precio actual cumple la regla de precio. */
  meetsRule: boolean
}

/** Costeo completo estilo Excel COSTOS Y OFERTAS. */
export function computeCosting(input: {
  selling: number
  cost: number
  fulfillment: number
  shipping: number
  cpaReal?: number | null
  admin?: number
  rulePct?: number
}): Costing {
  const selling = input.selling || 0
  const cogs = (input.cost || 0) + (input.fulfillment || 0) + (input.shipping || 0)
  const margin = selling - cogs
  const marginPct = selling > 0 ? (margin / selling) * 100 : 0
  const utility = margin - (input.cpaReal ?? 0) - (input.admin ?? 0)
  const utilityPct = selling > 0 ? (utility / selling) * 100 : 0
  const rulePct = input.rulePct ?? 50
  const minPrice = rulePct > 0 ? cogs / (rulePct / 100) : 0
  return {
    cogs,
    margin,
    marginPct,
    cpaMax: margin,
    utility,
    utilityPct,
    minPrice,
    meetsRule: selling >= minPrice,
  }
}
