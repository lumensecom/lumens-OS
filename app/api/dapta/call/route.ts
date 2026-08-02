import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { daptaCallPayloadSchema } from "@/lib/dapta"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * Envía pedidos seleccionados al flujo de Dapta (un request por pedido).
 * El flujo dispara a Juliana para que llame al cliente.
 *
 * Configuración (env vars, nunca en el cliente):
 *  - DAPTA_FLOW_WEBHOOK_URL: URL del webhook del flujo (get_flow_webhook_url en Dapta).
 *  - DAPTA_WEBHOOK_SECRET (opcional): si el flujo valida un header compartido.
 */
const requestSchema = z.object({
  orders: z.array(daptaCallPayloadSchema).min(1).max(1000),
})

/** Cuántas invocaciones al webhook se disparan en paralelo por tanda. */
const BATCH_SIZE = 20

export async function POST(request: NextRequest) {
  // Solo usuarios autenticados de LUMENS OS.
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const webhookUrl = process.env.DAPTA_FLOW_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "Llamadas no configuradas todavía (falta DAPTA_FLOW_WEBHOOK_URL)" },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 422 })
  }

  const secret = process.env.DAPTA_WEBHOOK_SECRET
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (secret) headers["x-webhook-secret"] = secret

  const fireOne = async (order: (typeof parsed.data.orders)[number]) => {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(order),
      })
      return {
        order_id: order.order_id,
        phone: order.phone,
        ok: res.ok,
        status: res.status,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      }
    } catch (err) {
      return {
        order_id: order.order_id,
        phone: order.phone,
        ok: false,
        status: 0,
        error: (err as Error).message || "Fallo de red",
      }
    }
  }

  // Dispara en tandas (un request por pedido = una llamada) para no abrir
  // cientos de conexiones a la vez con listas grandes.
  const results: Awaited<ReturnType<typeof fireOne>>[] = []
  for (let i = 0; i < parsed.data.orders.length; i += BATCH_SIZE) {
    const batch = parsed.data.orders.slice(i, i + BATCH_SIZE)
    results.push(...(await Promise.all(batch.map(fireOne))))
  }

  const queued = results.filter((r) => r.ok).length
  return NextResponse.json({ queued, total: results.length, results })
}
