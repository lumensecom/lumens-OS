"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import {
  researchSchema,
  researchReferenceSchema,
  RESEARCH_STATUSES,
} from "@/lib/research"

type ActionResult = { error?: string; success?: boolean }

function payload(data: z.infer<typeof researchSchema>) {
  return {
    ...data,
    estimated_selling_price: data.estimated_selling_price ?? null,
    estimated_cost: data.estimated_cost ?? null,
    estimated_margin:
      data.estimated_selling_price != null && data.estimated_cost != null
        ? data.estimated_selling_price - data.estimated_cost
        : null,
    source_platform: data.source_platform || null,
    source_url: data.source_url || null,
    main_image_url: data.main_image_url || null,
    target_audience: data.target_audience || null,
    notes: data.notes || null,
    updated_at: new Date().toISOString(),
  }
}

export async function createResearch(values: unknown): Promise<ActionResult> {
  const parsed = researchSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("research_products")
    .insert({ ...payload(parsed.data), created_by: user?.id ?? null })
    .select("id")
    .single()
  if (error) return { error: error.message }

  revalidatePath("/research", "layout")
  redirect(`/research/${data.id}`)
}

export async function updateResearch(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = researchSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from("research_products")
    .update(payload(parsed.data))
    .eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/research", "layout")
  redirect(`/research/${id}`)
}

export async function updateResearchStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  const parsed = z.enum(RESEARCH_STATUSES).safeParse(status)
  if (!parsed.success) return { error: "Estado inválido" }

  const supabase = createClient()
  const { error } = await supabase
    .from("research_products")
    .update({ status: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/research", "layout")
  return { success: true }
}

export async function deleteResearch(id: string): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase.from("research_products").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/research", "layout")
  redirect("/research")
}

export async function addResearchReference(
  researchId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = researchReferenceSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = createClient()
  const { error } = await supabase.from("research_references").insert({
    research_product_id: researchId,
    ref_type: parsed.data.ref_type,
    url: parsed.data.url,
    platform: parsed.data.platform || null,
    days_active: parsed.data.days_active ?? null,
    engagement_notes: parsed.data.engagement_notes || null,
    notes: parsed.data.notes || null,
  })
  if (error) return { error: error.message }

  revalidatePath("/research", "layout")
  return { success: true }
}

export async function deleteResearchReference(id: string): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase.from("research_references").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/research", "layout")
  return { success: true }
}
