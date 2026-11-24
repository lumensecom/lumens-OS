import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { callBatchSize, daptaCallPayloadSchema, voiceConfig, type DaptaCallPayload } from "@/lib/dapta"

export const runtime = "nodejs"
export const maxDuration = 60

const requestSchema = z.object({ orders: z.array(daptaCallPayloadSchema).min(1).max(callBatchSize) })
const guardedStates = ["despachando", "en_cola", "revisar", "confirmado", "cancelado"]

export async function POST(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  const client = createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const owner = await client.rpc("is_owner")
  if (owner.error) return NextResponse.json({ error: "No se pudo verificar el acceso." }, { status: 503 })
  if (!owner.data) return NextResponse.json({ error: "Acceso reservado al dueño." }, { status: 403 })

  const config = voiceConfig()
  if (!config) return NextResponse.json({ error: "Completa la conexión y el webhook de resultados de Dapta." }, { status: 503 })

  const body = await request.json().catch(() => null)
  if (body === null) return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Revisa número de pedido, producto, cliente, fecha, dirección, ciudad y celular. Máximo 20 por envío." }, { status: 422 })
  if (new Set(parsed.data.orders.map((order) => order.order_id)).size !== parsed.data.orders.length) {
    return NextResponse.json({ error: "El lote contiene un número de pedido repetido." }, { status: 422 })
  }

  const { url, webhookSecret } = config
  const admin = createAdminClient()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (webhookSecret) headers["x-webhook-secret"] = webhookSecret

  async function fireOne(order: DaptaCallPayload) {
    const result = { order_id: order.order_id, phone: order.phone }
    const prior = await admin.from("call_results").select("id, outcome")
      .eq("order_id", order.order_id).in("outcome", guardedStates).limit(1).maybeSingle()
    if (prior.error) return { ...result, ok: false, skipped: false, error: "No se pudo consultar el historial." }
    if (prior.data) return { ...result, ok: false, skipped: true, state: prior.data.outcome }

    const reserved = await admin.from("call_results").insert({
      order_id: order.order_id, customer_name: order.customer_name, phone: order.phone,
      outcome: "despachando", requested: true,
    }).select("id").single()
    if (reserved.error) {
      return reserved.error.code === "23505"
        ? { ...result, ok: false, skipped: true, state: "despachando" }
        : { ...result, ok: false, skipped: false, error: "No se pudo registrar el intento." }
    }

    let outcome = "revisar"
    let message: string | null = "Verifica en Dapta si recibió la solicitud antes de repetirla."
    try {
      const res = await fetch(url, {
        method: "POST", headers, redirect: "error", signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({ ...order, attempt_id: reserved.data.id }),
      })
      if (res.ok) {
        outcome = "en_cola"
        message = null
      } else if (res.status >= 400 && res.status < 500 && ![408, 409, 429].includes(res.status)) {
        outcome = "error"
        message = `Dapta rechazó la solicitud (HTTP ${res.status}).`
      }
    } catch {
      // Dapta may have accepted the request before the connection failed.
    }

    const saved = await admin.from("call_results").update({ outcome, summary: message })
      .eq("id", reserved.data.id).eq("outcome", "despachando")
    if (saved.error) return { ...result, ok: false, skipped: false, state: "revisar", error: "Verifica el envío en Dapta." }
    return { ...result, ok: outcome === "en_cola", skipped: false, state: outcome, error: message ?? undefined }
  }

  const results = await Promise.all(parsed.data.orders.map(fireOne))
  return NextResponse.json({ queued: results.filter((r) => r.ok).length, total: results.length, results })
}
