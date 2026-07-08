"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { articleSchema } from "@/lib/conocimiento"

type ActionResult = { error?: string; success?: boolean }

async function categorySlug(
  supabase: ReturnType<typeof createClient>,
  categoryId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("knowledge_categories")
    .select("slug")
    .eq("id", categoryId)
    .single()
  return data?.slug ?? null
}

export async function createArticle(values: unknown): Promise<ActionResult> {
  const parsed = articleSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("knowledge_articles").insert({
    ...parsed.data,
    content: parsed.data.content || null,
    created_by: user?.id ?? null,
  })
  if (error) {
    if (error.code === "23505") return { error: "Ya existe un artículo con ese slug" }
    return { error: error.message }
  }

  const catSlug = await categorySlug(supabase, parsed.data.category_id)
  revalidatePath("/conocimiento", "layout")
  redirect(catSlug ? `/conocimiento/${catSlug}/${parsed.data.slug}` : "/conocimiento")
}

export async function updateArticle(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = articleSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from("knowledge_articles")
    .update({
      ...parsed.data,
      content: parsed.data.content || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) {
    if (error.code === "23505") return { error: "Ya existe un artículo con ese slug" }
    return { error: error.message }
  }

  const catSlug = await categorySlug(supabase, parsed.data.category_id)
  revalidatePath("/conocimiento", "layout")
  redirect(catSlug ? `/conocimiento/${catSlug}/${parsed.data.slug}` : "/conocimiento")
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase.from("knowledge_articles").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/conocimiento", "layout")
  redirect("/conocimiento")
}

/** Duplica un artículo como borrador "(copia)" para usarlo de plantilla. */
export async function duplicateArticle(id: string): Promise<ActionResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: original } = await supabase
    .from("knowledge_articles")
    .select("*")
    .eq("id", id)
    .single()
  if (!original) return { error: "Artículo no encontrado" }

  const newSlug = `${original.slug}-copia-${Date.now().toString(36)}`
  const { error } = await supabase.from("knowledge_articles").insert({
    category_id: original.category_id,
    title: `${original.title} (copia)`,
    slug: newSlug,
    content: original.content,
    tags: original.tags,
    is_pinned: false,
    created_by: user?.id ?? null,
  })
  if (error) return { error: error.message }

  revalidatePath("/conocimiento", "layout")
  return { success: true }
}
