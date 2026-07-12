import { createClient } from "@/lib/supabase/server"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import type { Settings } from "@/lib/types"

/** Lee la fila única de settings (con fallback a los defaults si aún no existe). */
export async function fetchSettings(): Promise<Settings> {
  const supabase = createClient()
  const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle()
  return (
    data ?? {
      id: 1,
      meta_a: DEFAULT_SETTINGS.meta_a,
      meta_b: DEFAULT_SETTINGS.meta_b,
      default_shipping_cost: DEFAULT_SETTINGS.default_shipping_cost,
      default_admin_cost: DEFAULT_SETTINGS.default_admin_cost,
      default_price_rule_pct: DEFAULT_SETTINGS.default_price_rule_pct,
      ai_brand_context: null,
      updated_at: null,
    }
  )
}
