import { timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"

import { voicePhone } from "@/lib/dapta"
import { parseDaptaResult } from "@/lib/dapta-result"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const requiredSecret = process.env.DAPTA_RESULT_SECRET
  if (!requiredSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Webhook de resultados sin configurar." }, { status: 503 })
  }
  const provided = Buffer.from(request.headers.get("x-webhook-secret") ?? request.nextUrl.searchParams.get("secret") ?? "")
  const expected = Buffer.from(requiredSecret)
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (body === null) return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  const report = parseDaptaResult(body)
  if (!report.analysis) return NextResponse.json({ ok: true, ignored: true })
  if (!report.attemptId && !report.orderId && !report.callId) {
    return NextResponse.json({ error: "Falta la referencia de la llamada." }, { status: 422 })
  }

  const admin = createAdminClient()
  const store = () => admin.from("call_results")
  const lookup = () => store().select("id, order_id, phone, outcome, provider_call_id")
  const retry = () => NextResponse.json({ error: "No se pudo registrar el resultado." }, { status: 500 })
  const known = report.attemptId ? await lookup().eq("id", report.attemptId).maybeSingle()
    : report.callId ? await lookup().eq("provider_call_id", report.callId).maybeSingle()
    : null
  if (known?.error) return retry()
  let attempt = known?.data

  if (!attempt && !report.attemptId && report.orderId) {
    const pending = await lookup().eq("order_id", report.orderId).eq("requested", true).is("provider_call_id", null)
      .in("outcome", ["despachando", "en_cola", "revisar"]).limit(1).maybeSingle()
    if (pending.error) return retry()
    attempt = pending.data
  }
  if (report.attemptId && !attempt) return NextResponse.json({ error: "Intento desconocido." }, { status: 404 })
  const phone = report.phone ? voicePhone(report.phone) : null
  if (attempt && ((report.orderId && report.orderId !== attempt.order_id) ||
    (phone && attempt.phone && phone !== voicePhone(attempt.phone)) ||
    (attempt.provider_call_id && report.callId && attempt.provider_call_id !== report.callId))) {
    return NextResponse.json({ error: "El resultado no coincide con el intento." }, { status: 409 })
  }

  const outcome = {
    outcome: report.outcome, summary: report.summary, duration_seconds: report.duration,
    success: report.success, agent_id: report.agentId,
    ...(report.callId ? { provider_call_id: report.callId } : {}),
  }
  if (attempt) {
    if (["confirmado", "cancelado", "no_contesta", "reprogramado"].includes(attempt.outcome ?? "")) {
      return NextResponse.json({ ok: true, order_id: attempt.order_id })
    }
    const { error } = await store().update(outcome).eq("id", attempt.id)
      .in("outcome", ["despachando", "en_cola", "revisar", "error"])
    if (error) return retry()
  } else {
    if (!report.callId || !report.orderId) {
      return NextResponse.json({ error: "Incluye el pedido y el identificador de Dapta." }, { status: 422 })
    }
    const { error } = await store().upsert({
      ...outcome, order_id: report.orderId, phone, customer_name: report.name,
    }, { onConflict: "provider_call_id", ignoreDuplicates: true })
    if (error) return retry()
  }

  return NextResponse.json({ ok: true, order_id: attempt?.order_id ?? report.orderId })
}
