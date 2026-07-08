import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  parse,
} from "date-fns"

import { createClient } from "@/lib/supabase/server"
import type { RevenueEntry, ExpenseEntry } from "@/lib/types"

export type RevenueRow = RevenueEntry & { productName: string | null }
export type ExpenseRow = ExpenseEntry & { productName: string | null }

export type SearchParams = Record<string, string | string[] | undefined>

/** Devuelve el primer valor de un search param (o undefined). */
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** Resuelve un mes "YYYY-MM" (o el actual) a su rango y lista de días. */
export function resolveMonth(mes?: string) {
  const base =
    mes && /^\d{4}-\d{2}$/.test(mes)
      ? parse(`${mes}-01`, "yyyy-MM-dd", new Date())
      : new Date()
  const start = startOfMonth(base)
  const end = endOfMonth(base)
  return {
    month: format(base, "yyyy-MM"),
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
    days: eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd")),
  }
}

/** Trae ingresos y gastos de un rango, con el nombre de producto resuelto. */
export async function fetchEntries(
  start: string,
  end: string,
): Promise<{ revenue: RevenueRow[]; expenses: ExpenseRow[] }> {
  const supabase = createClient()
  const [rev, exp, prods] = await Promise.all([
    supabase
      .from("revenue_entries")
      .select("*")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false }),
    supabase
      .from("expense_entries")
      .select("*")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false }),
    supabase.from("products").select("id, name"),
  ])

  const nameById = new Map((prods.data ?? []).map((p) => [p.id, p.name]))

  const revenue: RevenueRow[] = (rev.data ?? []).map((r) => ({
    ...r,
    productName: r.product_id ? (nameById.get(r.product_id) ?? null) : null,
  }))
  const expenses: ExpenseRow[] = (exp.data ?? []).map((e) => ({
    ...e,
    productName: e.product_id ? (nameById.get(e.product_id) ?? null) : null,
  }))

  return { revenue, expenses }
}
