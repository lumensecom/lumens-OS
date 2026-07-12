"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { settingsSchema } from "@/lib/settings"

type ActionResult = { error?: string; success?: boolean }

export async function updateSettings(values: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from("settings")
    .update({
      ...parsed.data,
      ai_brand_context: parsed.data.ai_brand_context || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
  if (error) return { error: error.message }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function updateProfileName(fullName: string): Promise<ActionResult> {
  const name = fullName.trim()
  if (name.length < 2) return { error: "Nombre muy corto" }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autorizado" }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: name, updated_at: new Date().toISOString() })
    .eq("id", user.id)
  if (error) return { error: error.message }

  revalidatePath("/", "layout")
  return { success: true }
}
