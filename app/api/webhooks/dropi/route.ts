import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

/**
 * Webhook de Dropi (Fase 2) — listo para recibir actualizaciones de pedidos.
 *
 * Configuración:
 * 1. Define DROPI_WEBHOOK_SECRET en las env vars (Vercel + .env.local).
 * 2. Registra en Dropi la URL: https://TU-DOMINIO/api/webhooks/dropi
 *    con el header `x-webhook-secret: <el mismo secreto>`.
 *
 * El payload exacto depende de la cuenta Dropi; este handler acepta un
 * shape flexible y hace upsert por dropi_order_id. Ajustar el mapeo
 * cuando tengamos un payload real de ejemplo.
 */
const dropiOrderSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    status: z.string().optional(),
    client_name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    department: z.string().optional(),
    quantity: z.coerce.number().int().optional(),
    total: z.coerce.number().optional(),
  })
  .passthrough()

export async function POST(request: NextRequest) {
  const secret = process.env.DROPI_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook no configurado (falta DROPI_WEBHOOK_SECRET)" },
      { status: 503 },
    )
  }
  if (request.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = dropiOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload no reconocido", issues: parsed.error.issues },
      { status: 422 },
    )
  }

  const order = parsed.data
  const supabase = createAdminClient()
  const { error } = await supabase.from("orders").upsert(
    {
      dropi_order_id: order.id,
      dropi_status: order.status ?? null,
      customer_name: order.client_name ?? null,
      customer_phone: order.phone ?? null,
      customer_address: order.address ?? null,
      customer_city: order.city ?? null,
      customer_department: order.department ?? null,
      quantity: order.quantity ?? 1,
      total_amount: order.total ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "dropi_order_id" },
  )
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
