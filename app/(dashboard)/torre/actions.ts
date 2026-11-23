"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getTowerClient } from "@/lib/tower/server"

type ActionState = { ok: boolean; message: string }
const routineCode = z.string().regex(/^[a-z][a-z0-9-]{1,60}$/)
const uuid = z.uuid()
const amount = z.number().int().min(0).max(2_000_000_000)
const integer = z.string().regex(/^\d+$/).transform(Number).pipe(amount)
const webUrl = z.url({ protocol: /^https?$/ }).max(2048)

function refresh(message: string): ActionState {
  revalidatePath("/torre", "layout")
  return { ok: true, message }
}

function invalid(message = "Revisa los campos del formulario."): ActionState {
  return { ok: false, message }
}

export async function executeRoutine(_: ActionState, form: FormData) {
  const client = await getTowerClient()
  const target = routineCode.safeParse(form.get("code"))
  if (!target.success) return invalid()
  const result = await client.rpc("tower_run_now", { routine_code: target.data })
  if (result.error) return invalid("No se pudo registrar la ejecución.")
  if (result.data === "inactive") return invalid("La rutina está desactivada o depende de un evento.")
  return refresh(result.data === "success" ? "Ejecución registrada." : "Revisa el resultado en la bitácora.")
}

export async function toggleRoutine(_: ActionState, form: FormData) {
  const client = await getTowerClient()
  const target = routineCode.safeParse(form.get("code"))
  const active = form.get("active")
  if (!target.success || (active !== "true" && active !== "false")) return invalid()
  const result = await client.rpc("tower_set_routine", { target_code: target.data, active: active === "true" })
  return result.data ? refresh("Estado actualizado.") : invalid("No se pudo actualizar la rutina.")
}

export async function createOpportunity(_: ActionState, form: FormData) {
  const client = await getTowerClient()
  const input = z.object({
    product_title: z.string().trim().min(1).max(120),
    problem_text: z.string().trim().min(1).max(1500),
    market_country: z.string().trim().min(2).max(60),
  }).safeParse(Object.fromEntries(form))
  if (!input.success) return invalid()
  const result = await client.rpc("tower_create_opportunity", input.data)
  return result.data ? refresh("Oportunidad registrada.") : invalid("No se pudo registrar la oportunidad.")
}

export async function addEvidence(_: ActionState, form: FormData) {
  const client = await getTowerClient()
  const input = z.object({
    target_id: uuid,
    link: webUrl,
    evidence_text: z.string().trim().min(1).max(1500),
    evidence_kind: z.enum(["observado", "estimado", "hipotesis"]),
    observed_on: z.iso.date(),
  }).safeParse(Object.fromEntries(form))
  if (!input.success) return invalid("Ingresa una fecha, una URL HTTP o HTTPS y el tipo de evidencia.")
  const result = await client.rpc("tower_add_evidence", input.data)
  if (result.error) return invalid(result.error.code === "P0001" ? result.error.message : "No se pudo guardar la evidencia.")
  return refresh("Evidencia registrada.")
}

export async function requestReview(_: ActionState, form: FormData) {
  const client = await getTowerClient()
  const input = z.object({
    target_id: uuid, pack_qty: integer, pack_price: integer, unit_cost: integer,
    variable_cost: integer, stock: integer, compliance_evidence_id: uuid, supplier_evidence_id: uuid, demand_evidence_id: uuid,
    compliance_verified: z.literal("yes"),
  }).safeParse(Object.fromEntries(form))
  if (!input.success) return invalid("Ingresa los costos, el stock y las tres evidencias requeridas.")
  const { compliance_verified: verified, ...assessment } = input.data
  const result = await client.rpc("tower_request_review", { ...assessment, compliance_verified: verified === "yes" })
  if (result.error) return invalid(result.error.code === "P0001" ? result.error.message : "No se pudo crear la solicitud.")
  return refresh("La oportunidad ya está en el Lobby.")
}

export async function decideReview(_: ActionState, form: FormData) {
  const client = await getTowerClient()
  const input = z.object({
    review_id: uuid,
    decision: z.enum(["approved", "rejected"]),
    rationale: z.string().trim().max(500),
  }).safeParse(Object.fromEntries(form))
  if (!input.success) return invalid()
  const result = await client.rpc("tower_decide_review", input.data)
  if (result.error) return invalid(result.error.code === "P0001" ? result.error.message : "No se pudo guardar la decisión.")
  return result.data ? refresh("Decisión guardada.") : invalid("La solicitud ya fue revisada o no está disponible.")
}

export async function submitLanding(_: ActionState, form: FormData) {
  const client = await getTowerClient()
  const liquid = z.string().min(1).max(49_999)
  const input = z.object({
    target_id: uuid, hero_liquid: liquid, body_liquid: liquid,
  }).safeParse(Object.fromEntries(form))
  if (!input.success) return invalid("Incluye los dos bloques Liquid de menos de 50 KB.")
  const result = await client.rpc("tower_submit_landing", input.data)
  if (result.error) return invalid(result.error.code === "P0001" ? result.error.message : "No se pudo guardar la landing.")
  return refresh("Versión guardada y enviada al Lobby.")
}
