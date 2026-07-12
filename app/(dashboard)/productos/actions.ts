"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { productSchema, referenceSchema } from "@/lib/productos"

type ActionResult = { error?: string; success?: boolean }

export async function createProduct(values: unknown): Promise<ActionResult> {
  const parsed = productSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = createClient()
  const { error } = await supabase.from("products").insert({
    ...parsed.data,
    compared_price: parsed.data.compared_price ?? null,
    cpa_real: parsed.data.cpa_real ?? null,
    landing_url: parsed.data.landing_url || null,
    shopify_product_id: parsed.data.shopify_product_id || null,
    dropi_product_id: parsed.data.dropi_product_id || null,
    description: parsed.data.description || null,
    main_image_url: parsed.data.main_image_url || null,
    best_angle: parsed.data.best_angle || null,
    target_audience: parsed.data.target_audience || null,
  })
  if (error) {
    if (error.code === "23505") return { error: "Ya existe un producto con ese slug" }
    return { error: error.message }
  }

  revalidatePath("/productos")
  revalidatePath("/")
  redirect(`/productos/${parsed.data.slug}`)
}

export async function updateProduct(
  id: string,
  values: unknown,
  priceChangeReason?: string,
): Promise<ActionResult> {
  const parsed = productSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Si cambió el precio o el costo, guarda el histórico antes de actualizar.
  const { data: before } = await supabase
    .from("products")
    .select("selling_price, cost_dropi")
    .eq("id", id)
    .single()

  const priceChanged =
    before &&
    (Number(before.selling_price) !== parsed.data.selling_price ||
      Number(before.cost_dropi) !== parsed.data.cost_dropi)

  const { error } = await supabase
    .from("products")
    .update({
      ...parsed.data,
      compared_price: parsed.data.compared_price ?? null,
      cpa_real: parsed.data.cpa_real ?? null,
      landing_url: parsed.data.landing_url || null,
      shopify_product_id: parsed.data.shopify_product_id || null,
      dropi_product_id: parsed.data.dropi_product_id || null,
      description: parsed.data.description || null,
      main_image_url: parsed.data.main_image_url || null,
      best_angle: parsed.data.best_angle || null,
      target_audience: parsed.data.target_audience || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) {
    if (error.code === "23505") return { error: "Ya existe un producto con ese slug" }
    return { error: error.message }
  }

  if (priceChanged) {
    await supabase.from("product_price_history").insert({
      product_id: id,
      selling_price: parsed.data.selling_price,
      cost_dropi: parsed.data.cost_dropi,
      changed_by: user?.id ?? null,
      reason: priceChangeReason || null,
    })
  }

  revalidatePath("/productos", "layout")
  revalidatePath("/")
  redirect(`/productos/${parsed.data.slug}`)
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/productos", "layout")
  revalidatePath("/")
  redirect("/productos")
}

export async function addReference(
  productId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = referenceSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = createClient()
  const { error } = await supabase.from("product_references").insert({
    product_id: productId,
    ref_type: parsed.data.ref_type,
    url: parsed.data.url,
    title: parsed.data.title || null,
    notes: parsed.data.notes || null,
  })
  if (error) return { error: error.message }

  revalidatePath("/productos", "layout")
  return { success: true }
}

export async function deleteReference(id: string): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase.from("product_references").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/productos", "layout")
  return { success: true }
}
