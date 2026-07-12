"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { creativeSchema, CREATIVE_STATUSES } from "@/lib/creativos"

type ActionResult = { error?: string; success?: boolean }

function normalizeId(value: string | null | undefined): string | null {
  if (!value || value === "none") return null
  return value
}

function payload(data: z.infer<typeof creativeSchema>) {
  return {
    name: data.name,
    product_id: normalizeId(data.product_id),
    platform: data.platform,
    status: data.status,
    video_url: data.video_url || null,
    thumbnail_url: data.thumbnail_url || null,
    duration_seconds: data.duration_seconds ?? null,
    hook: data.hook || null,
    script: data.script || null,
    cta: data.cta || null,
    music_ref: data.music_ref || null,
    angle_type: data.angle_type?.trim().toLowerCase().replace(/\s+/g, "_") || null,
    total_spend: data.total_spend ?? 0,
    total_conversions: data.total_conversions ?? 0,
    best_cpa: data.best_cpa ?? null,
    best_roas: data.best_roas ?? null,
    best_ctr: data.best_ctr ?? null,
    notes: data.notes || null,
    updated_at: new Date().toISOString(),
  }
}

export async function createCreative(values: unknown): Promise<ActionResult> {
  const parsed = creativeSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from("creatives")
    .insert(payload(parsed.data))
    .select("id")
    .single()
  if (error) return { error: error.message }

  revalidatePath("/creativos", "layout")
  redirect(`/creativos/${data.id}`)
}

export async function updateCreative(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = creativeSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from("creatives")
    .update(payload(parsed.data))
    .eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/creativos", "layout")
  redirect(`/creativos/${id}`)
}

export async function updateCreativeStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  const parsed = z.enum(CREATIVE_STATUSES).safeParse(status)
  if (!parsed.success) return { error: "Estado inválido" }

  const supabase = createClient()
  const { error } = await supabase
    .from("creatives")
    .update({ status: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/creativos", "layout")
  return { success: true }
}

export async function deleteCreative(id: string): Promise<ActionResult> {
  const supabase = createClient()

  // Borra también los archivos del bucket si existen.
  const { data: creative } = await supabase
    .from("creatives")
    .select("video_url, thumbnail_url")
    .eq("id", id)
    .single()
  const paths = [creative?.video_url, creative?.thumbnail_url].filter(
    (p): p is string => !!p,
  )
  if (paths.length > 0) {
    await supabase.storage.from("creatives").remove(paths)
  }

  const { error } = await supabase.from("creatives").delete().eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/creativos", "layout")
  redirect("/creativos")
}
