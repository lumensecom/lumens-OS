"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"
import { julianaMessages, julianaOrder, julianaResult } from "@/lib/tower/juliana"
import { julianaConfig } from "@/lib/tower/juliana-config"
import { getTowerClient } from "@/lib/tower/server"

const claimedOrder = z.object({ attempt_id: z.uuid(), contact: julianaOrder })

export async function sendJulianaConfirmation(_: { ok: boolean; message: string }, data: FormData) {
  const client = await getTowerClient()
  const target = julianaResult.shape.order_id.safeParse(data.get("id"))
  const config = julianaConfig()
  if (!target.success || !config) return { ok: false, message: "Revisa la conexión de WhatsApp con Dapta." }
  const response = await client.rpc("tower_claim_juliana", { target_order: target.data })
  const claimed = claimedOrder.safeParse(response.data)
  if (response.error || !claimed.success) return { ok: false, message: "El pedido ya fue procesado o no está disponible." }

  const { attempt_id, contact } = claimed.data
  let accepted = false
  try {
    const result = await fetch(config.endpoint, {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000),
      headers: { "Content-Type": "application/json", "x-webhook-secret": config.secret, "Idempotency-Key": attempt_id },
      body: JSON.stringify({ order_id: target.data, attempt_id, channel: "whatsapp", order: contact, ...julianaMessages(contact) }),
    })
    accepted = result.ok
  } catch {
    // A timeout can mean the downstream service already accepted the request.
  }

  const updated = await createAdminClient().rpc("tower_finish_juliana", {
    target_order: target.data, attempt: attempt_id, next_status: accepted ? "submitted" : "unknown",
  })
  revalidatePath("/torre/juliana")
  if (updated.error) return { ok: false, message: "Revisa Dapta antes de volver a contactar a este cliente." }
  return accepted
    ? { ok: true, message: "Dapta recibió la solicitud de confirmación." }
    : { ok: false, message: "Dapta no acusó recibo. Verifica el estado antes de volver a contactar al cliente." }
}
