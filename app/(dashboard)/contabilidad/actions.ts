"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { revenueSchema, expenseSchema } from "@/lib/contabilidad"

type ActionResult = { error?: string; success?: boolean }

/** Normaliza un product_id de un select ("", "none") a null. */
function normalizeId(value: string | null | undefined): string | null {
  if (!value || value === "none") return null
  return value
}

export async function createRevenue(values: unknown): Promise<ActionResult> {
  const parsed = revenueSchema.safeParse(values)
  if (!parsed.success) return { error: "Datos inválidos" }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("revenue_entries").insert({
    date: parsed.data.date,
    source: parsed.data.source,
    product_id: normalizeId(parsed.data.product_id),
    gross_amount: parsed.data.gross_amount,
    orders_count: parsed.data.orders_count,
    notes: parsed.data.notes || null,
    created_by: user?.id ?? null,
  })
  if (error) return { error: error.message }

  revalidatePath("/contabilidad", "layout")
  revalidatePath("/")
  return { success: true }
}

export async function createExpense(values: unknown): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(values)
  if (!parsed.success) return { error: "Datos inválidos" }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("expense_entries").insert({
    date: parsed.data.date,
    category: parsed.data.category,
    amount: parsed.data.amount,
    product_id: normalizeId(parsed.data.product_id),
    description: parsed.data.description || null,
    created_by: user?.id ?? null,
  })
  if (error) return { error: error.message }

  revalidatePath("/contabilidad", "layout")
  revalidatePath("/")
  return { success: true }
}

export async function deleteRevenue(id: string): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase.from("revenue_entries").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/contabilidad", "layout")
  revalidatePath("/")
  return { success: true }
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase.from("expense_entries").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/contabilidad", "layout")
  revalidatePath("/")
  return { success: true }
}
