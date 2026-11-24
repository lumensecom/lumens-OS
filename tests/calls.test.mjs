import assert from "node:assert/strict"
import test from "node:test"

import { normalizeVoiceOutcome, parseDaptaResult } from "../lib/dapta-result.ts"

for (const [given, expected] of [
  ["Confirmado", "confirmado"],
  ["No se confirmó", "revisar"],
  ["Canceló la confirmación", "cancelado"],
  ["Reagendó para después", "reprogramado"],
  ["Buzón de voz", "no_contesta"],
  ["dial_no_answer", "no_contesta"],
  ["No atendió", "no_contesta"],
  ["No contestó", "no_contesta"],
  ["Por confirmar", "revisar"],
  ["answered", "revisar"],
]) {
  test(`resultado de voz · ${given}`, () => assert.equal(normalizeVoiceOutcome(given), expected))
}

test("Dapta devuelve el pedido y conserva false como booleano", () => {
  const result = parseDaptaResult({ event: "call_analyzed", data: { call: {
    call_id: "call-test-1", duration_ms: 23150,
    retell_llm_dynamic_variables: { order_id: "#qa-1", attempt_id: "94587dda-c217-43fe-8377-05e910ff5daf" },
    to_number: "+573000000000",
    call_analysis: { call_successful: "false", custom_analysis_data: { resultado: "No contesta", resumen: "Buzón" } },
  } } })
  assert.equal(result.attemptId, "94587dda-c217-43fe-8377-05e910ff5daf")
  assert.equal(result.callId, "call-test-1")
  assert.equal(result.orderId, "QA-1")
  assert.equal(result.success, false)
  assert.equal(result.duration, 23)
  assert.equal(result.summary, "Buzón")
})

test("el evento de conexión no finaliza el pedido", () => {
  assert.equal(parseDaptaResult({ event: "call_started", call: { call_id: "test" } }).analysis, false)
  assert.equal(parseDaptaResult({ event: "call_ended", call: { disconnection_reason: "user_hangup" } }).analysis, false)
})

test("datos vacíos y duraciones inválidas", () => {
  assert.equal(parseDaptaResult(null).analysis, false)
  const result = parseDaptaResult({ order_id: "#qa-2", duration: "abc", success: false, resultado: "reagendado" })
  assert.equal(result.duration, null)
  assert.equal(result.success, false)
  assert.equal(result.outcome, "reprogramado")
})
