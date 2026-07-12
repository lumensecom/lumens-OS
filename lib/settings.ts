import { z } from "zod"

import { GOALS } from "@/lib/constants"

/** Schema del formulario de configuración. */
export const settingsSchema = z.object({
  meta_a: z.coerce.number().positive("Debe ser mayor a 0"),
  meta_b: z.coerce.number().positive("Debe ser mayor a 0"),
  default_shipping_cost: z.coerce.number().nonnegative(),
  default_admin_cost: z.coerce.number().nonnegative(),
  default_price_rule_pct: z.coerce.number().min(1).max(100),
  ai_brand_context: z.string().max(4000).optional().nullable(),
})

export type SettingsInput = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: SettingsInput = {
  meta_a: GOALS.metaA,
  meta_b: GOALS.metaB,
  default_shipping_cost: 18000,
  default_admin_cost: 2000,
  default_price_rule_pct: 50,
  ai_brand_context: "",
}
