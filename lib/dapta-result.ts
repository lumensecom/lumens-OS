import { z } from "zod"

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

function pick(roots: Record<string, unknown>[], paths: string[]) {
  for (const root of roots) {
    for (const path of paths) {
      const value = path.split(".").reduce<unknown>((current, key) => object(current)[key], root)
      if (value === false || value === true || typeof value === "number" ||
        (typeof value === "string" && value.trim())) return value
    }
  }
  return undefined
}

function text(value: unknown, limit: number) {
  return value === undefined || value === null ? null : String(value).trim().slice(0, limit)
}

export function normalizeVoiceOutcome(value: unknown) {
  const clean = String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replaceAll(/[_-]/g, " ")
  if (/cancel|rechaz|no (?:lo )?(?:quiere|quiso)/.test(clean)) return "cancelado"
  if (/reprogram|reagend|despues|luego|call back/.test(clean)) return "reprogramado"
  if (/no (?:contest|respond|atend)|buzon|voicemail|no answer|not answered|did not answer|dial no answer/.test(clean)) return "no_contesta"
  if (/no (?:se )?confirm|sin confirm|por confirmar|confirmacion pendiente|unconfirm|duda/.test(clean)) return "revisar"
  if (/confirm/.test(clean)) return "confirmado"
  return "revisar"
}

function truth(value: unknown) {
  const clean = String(value ?? "").trim().toLowerCase()
  if (["true", "1", "yes", "si", "sí"].includes(clean)) return true
  if (["false", "0", "no"].includes(clean)) return false
  return null
}

export function parseDaptaResult(body: unknown) {
  const top = object(body)
  const data = object(top.data)
  const roots = [object(top.call), object(data.call), data, top]
  const get = (...paths: string[]) => pick(roots, paths)
  const dynamic = (key: string) => get(`dynamic_variables.${key}`, `retell_llm_dynamic_variables.${key}`, `variables.${key}`, `metadata.${key}`, key)
  const order = text(dynamic("order_id"), 80)?.replace(/^#/, "").toUpperCase() ?? null
  const attempt = z.uuid().safeParse(dynamic("attempt_id"))
  const callId = text(get("call_id", "callId", "provider_call_id"), 200)
  const event = text(get("event", "event_type"), 100)
  const outcomeRaw = get("call_analysis.custom_analysis_data.resultado", "analysis.custom_analysis_data.resultado", "resultado", "outcome")
  const disconnected = get("disconnection_reason")
  const fallback = normalizeVoiceOutcome(disconnected) === "no_contesta" ? disconnected : undefined
  const summary = text(get("call_analysis.custom_analysis_data.resumen", "analysis.custom_analysis_data.resumen",
    "call_analysis.call_summary", "analysis.call_summary", "resumen", "summary"), 4000)
  const duration = get("total_duration_seconds", "duration_seconds", "call_duration_seconds", "duration")
  const millis = get("duration_ms")
  const seconds = duration !== undefined ? Number(duration) : millis !== undefined ? Number(millis) / 1000 : NaN
  const analysis = outcomeRaw !== undefined || fallback !== undefined || summary !== null || event === "call_analyzed"
  return {
    attemptId: attempt.success ? attempt.data : null,
    callId,
    event,
    analysis,
    orderId: order && /^[A-Z0-9][A-Z0-9._-]*$/.test(order) ? order : null,
    phone: text(dynamic("phone") ?? get("to_number", "customer_phone"), 40),
    name: text(dynamic("customer_name") ?? get("nombre"), 180),
    outcome: normalizeVoiceOutcome(outcomeRaw ?? fallback),
    summary,
    duration: Number.isFinite(seconds) && seconds >= 0 && seconds < 86400 ? Math.round(seconds) : null,
    success: truth(get("call_analysis.call_successful", "analysis.call_successful", "call_successful", "success")),
    agentId: text(get("agent_id", "agent.id"), 200),
  }
}
