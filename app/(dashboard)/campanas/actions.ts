"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { campaignSchema, metricSchema, CAMPAIGN_STATUSES } from "@/lib/campanas"

type ActionResult = { error?: string; success?: boolean }

function normalizeId(value: string | null | undefined): string | null {
  if (!value || value === "none") return null
  return value
}

/** ROAS estimado = (conversiones × precio del producto) / gasto. */
async function estimateRoas(
  supabase: ReturnType<typeof createClient>,
  campaignId: string,
  spend: number,
  conversions: number,
): Promise<number | null> {
  if (spend <= 0 || conversions <= 0) return null
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("product_id")
    .eq("id", campaignId)
    .single()
  if (!campaign?.product_id) return null
  const { data: product } = await supabase
    .from("products")
    .select("selling_price")
    .eq("id", campaign.product_id)
    .single()
  if (!product || Number(product.selling_price) <= 0) return null
  return (conversions * Number(product.selling_price)) / spend
}

export async function createCampaign(values: unknown): Promise<ActionResult> {
  const parsed = campaignSchema.safeParse(values)
  if (!parsed.success) return { error: "Datos inválidos" }

  const supabase = createClient()
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: parsed.data.name,
      platform: parsed.data.platform,
      product_id: normalizeId(parsed.data.product_id),
      status: parsed.data.status,
      daily_budget: parsed.data.daily_budget ?? null,
      external_id: parsed.data.external_id || null,
      started_at: parsed.data.started_at || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single()
  if (error) return { error: error.message }

  revalidatePath("/campanas")
  revalidatePath("/")
  redirect(`/campanas/${data.id}`)
}

export async function updateCampaignStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  const parsed = z.enum(CAMPAIGN_STATUSES).safeParse(status)
  if (!parsed.success) return { error: "Estado inválido" }

  const supabase = createClient()
  const { error } = await supabase
    .from("campaigns")
    .update({
      status: parsed.data,
      paused_at: parsed.data === "paused" ? new Date().toISOString().slice(0, 10) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/campanas", "layout")
  revalidatePath("/")
  return { success: true }
}

export async function deleteCampaign(id: string): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase.from("campaigns").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/campanas", "layout")
  revalidatePath("/")
  redirect("/campanas")
}

export async function upsertMetric(
  campaignId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = metricSchema.safeParse(values)
  if (!parsed.success) return { error: "Datos inválidos" }

  const supabase = createClient()
  const { date, spend, impressions = 0, clicks = 0, conversions = 0, roas, notes } = parsed.data

  const cpa = conversions > 0 ? spend / conversions : null
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : null
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : null
  const finalRoas =
    roas ?? (await estimateRoas(supabase, campaignId, spend, conversions))

  const { error } = await supabase.from("campaign_metrics").upsert(
    {
      campaign_id: campaignId,
      date,
      spend,
      impressions,
      clicks,
      conversions,
      cpa,
      ctr,
      cpm,
      roas: finalRoas,
      notes: notes || null,
    },
    { onConflict: "campaign_id,date" },
  )
  if (error) return { error: error.message }

  revalidatePath("/campanas", "layout")
  revalidatePath("/")
  return { success: true }
}

const importRowSchema = z.object({
  date: z.string(),
  spend: z.number().nonnegative(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
})

/** Importa en lote las filas parseadas de un CSV a una campaña. */
export async function importMetrics(
  campaignId: string,
  rows: unknown,
): Promise<ActionResult & { imported?: number }> {
  const parsed = z.array(importRowSchema).max(400).safeParse(rows)
  if (!parsed.success || parsed.data.length === 0) {
    return { error: "Filas inválidas o vacías" }
  }

  const supabase = createClient()
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, product_id")
    .eq("id", campaignId)
    .single()
  if (!campaign) return { error: "Campaña no encontrada" }

  let price = 0
  if (campaign.product_id) {
    const { data: product } = await supabase
      .from("products")
      .select("selling_price")
      .eq("id", campaign.product_id)
      .single()
    price = Number(product?.selling_price ?? 0)
  }

  const payload = parsed.data.map((r) => ({
    campaign_id: campaignId,
    date: r.date,
    spend: r.spend,
    impressions: r.impressions,
    clicks: r.clicks,
    conversions: r.conversions,
    cpa: r.conversions > 0 ? r.spend / r.conversions : null,
    ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : null,
    cpm: r.impressions > 0 ? (r.spend / r.impressions) * 1000 : null,
    roas:
      price > 0 && r.spend > 0 && r.conversions > 0
        ? (r.conversions * price) / r.spend
        : null,
  }))

  const { error } = await supabase
    .from("campaign_metrics")
    .upsert(payload, { onConflict: "campaign_id,date" })
  if (error) return { error: error.message }

  revalidatePath("/campanas", "layout")
  revalidatePath("/")
  return { success: true, imported: payload.length }
}
