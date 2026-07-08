import { z } from "zod"

import type { ExpenseEntry, RevenueEntry } from "@/lib/types"

/** Fuentes de ingreso legibles. */
export const REVENUE_SOURCE_LABELS: Record<string, string> = {
  shopify: "Shopify",
  marketplace: "Marketplace",
  other: "Otro",
}

export const REVENUE_SOURCES = ["shopify", "marketplace", "other"] as const
export const EXPENSE_CATEGORIES = [
  "ads_meta",
  "ads_tiktok",
  "shipping",
  "product_cost",
  "refund",
  "tools",
  "other",
] as const

/** Schema de un ingreso. `product_id` vacío se normaliza a null. */
export const revenueSchema = z.object({
  date: z.string().min(1, "Fecha requerida"),
  source: z.enum(REVENUE_SOURCES),
  product_id: z.string().optional().nullable(),
  gross_amount: z.coerce.number().positive("Debe ser mayor a 0"),
  orders_count: z.coerce.number().int().min(1, "Mínimo 1"),
  notes: z.string().optional().nullable(),
})

/** Schema de un gasto. */
export const expenseSchema = z.object({
  date: z.string().min(1, "Fecha requerida"),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().positive("Debe ser mayor a 0"),
  product_id: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

export type RevenueInput = z.infer<typeof revenueSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>

export type Totals = {
  ingresos: number
  gastos: number
  utilidad: number
  ordersCount: number
}

/** Suma ingresos y gastos y calcula la utilidad neta. */
export function computeTotals(
  revenue: Pick<RevenueEntry, "gross_amount" | "orders_count">[],
  expenses: Pick<ExpenseEntry, "amount">[],
): Totals {
  const ingresos = revenue.reduce((s, r) => s + Number(r.gross_amount), 0)
  const gastos = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const ordersCount = revenue.reduce((s, r) => s + (r.orders_count ?? 0), 0)
  return { ingresos, gastos, utilidad: ingresos - gastos, ordersCount }
}

export type DailyPoint = { date: string; ingresos: number; gastos: number; neto: number }

/** Construye la serie diaria de flujo de caja para un rango de días. */
export function buildDailySeries(
  days: string[],
  revenue: Pick<RevenueEntry, "date" | "gross_amount">[],
  expenses: Pick<ExpenseEntry, "date" | "amount">[],
): DailyPoint[] {
  const map = new Map<string, DailyPoint>()
  for (const d of days) map.set(d, { date: d, ingresos: 0, gastos: 0, neto: 0 })

  for (const r of revenue) {
    const point = map.get(r.date)
    if (point) point.ingresos += Number(r.gross_amount)
  }
  for (const e of expenses) {
    const point = map.get(e.date)
    if (point) point.gastos += Number(e.amount)
  }
  for (const point of map.values()) point.neto = point.ingresos - point.gastos

  return Array.from(map.values())
}

/** Agrupa montos por una clave y los ordena de mayor a menor. */
export function groupByKey<T>(
  items: T[],
  keyFn: (item: T) => string,
  amountFn: (item: T) => number,
): { key: string; total: number }[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = keyFn(item)
    map.set(key, (map.get(key) ?? 0) + amountFn(item))
  }
  return Array.from(map.entries())
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total)
}
