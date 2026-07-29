import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

/**
 * Webhook de retorno de Dapta — recibe el resultado de cada llamada de Juliana
 * y lo guarda en call_results para marcar el pedido como confirmado/cancelado/etc.
 *
 * Configuración:
 * 1. (Opcional) Define DAPTA_RESULT_SECRET; si está, se exige que el request
 *    traiga ?secret=... o el header x-webhook-secret con ese valor.
 * 2. En Dapta, apunta el post-call webhook de Juliana a:
 *    https://TU-DOMINIO/api/webhooks/dapta
 *
 * El payload exacto depende de Dapta; este handler es flexible: busca los
 * campos en varias rutas y guarda el JSON completo en `raw` para poder
 * ajustar el mapeo con un ejemplo real.
 */

/** Busca la primera ruta con valor no vacío dentro de un objeto anidado. */
function pick(obj: unknown, paths: string[]): unknown {
  for (const path of paths) {
    let cur: unknown = obj
    let ok = true
    for (const key of path.split(".")) {
      if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[key]
      } else {
        ok = false
        break
      }
    }
    if (ok && cur !== undefined && cur !== null && cur !== "") return cur
  }
  return undefined
}

const str = (v: unknown): string | null =>
  v === undefined || v === null ? null : String(v)

/** Normaliza el desenlace a una de nuestras categorías. */
function normalizeOutcome(raw: unknown): string | null {
  const s = String(raw ?? "").toLowerCase()
  if (!s) return null
  if (s.includes("confirm")) return "confirmado"
  if (s.includes("cancel") || s.includes("rechaz") || s.includes("no quiere")) return "cancelado"
  if (s.includes("reprogram") || s.includes("reagend") || s.includes("despues") || s.includes("luego"))
    return "reprogramado"
  if (s.includes("no contest") || s.includes("buzon") || s.includes("voicemail") || s.includes("no answer"))
    return "no_contesta"
  return s.slice(0, 40)
}

export async function POST(request: NextRequest) {
  const requiredSecret = process.env.DAPTA_RESULT_SECRET
  if (requiredSecret) {
    const provided =
      request.headers.get("x-webhook-secret") ??
      request.nextUrl.searchParams.get("secret")
    if (provided !== requiredSecret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  // order_id llega como variable dinámica del pedido (varias rutas posibles).
  const orderId = str(
    pick(body, [
      "order_id",
      "variables.order_id",
      "dynamic_variables.order_id",
      "data.order_id",
      "call.retell_llm_dynamic_variables.order_id",
      "metadata.order_id",
    ]),
  )

  const outcomeRaw = pick(body, [
    "resultado",
    "outcome",
    "analysis.resultado",
    "call_analysis.custom_analysis_data.resultado",
    "post_call_analysis.resultado",
    "data.resultado",
  ])

  const success = pick(body, [
    "call_analysis.call_successful",
    "call_successful",
    "success",
    "analysis.call_successful",
  ])

  const summary = str(
    pick(body, [
      "call_analysis.call_summary",
      "call_summary",
      "resumen",
      "summary",
      "analysis.summary",
    ]),
  )

  const phone = str(pick(body, ["phone", "to_number", "variables.phone", "customer_phone"]))
  const customerName = str(
    pick(body, ["customer_name", "variables.customer_name", "nombre"]),
  )
  const duration = pick(body, ["duration_seconds", "call_duration_seconds", "duration"])
  const agentId = str(pick(body, ["agent_id", "agent.id"]))

  const supabase = createAdminClient()
  const { error } = await supabase.from("call_results").insert({
    order_id: orderId,
    phone,
    customer_name: customerName,
    outcome: normalizeOutcome(outcomeRaw),
    success: typeof success === "boolean" ? success : success != null ? Boolean(success) : null,
    summary,
    duration_seconds: duration != null ? Number(duration) || null : null,
    agent_id: agentId,
    raw: body as never,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, order_id: orderId })
}
