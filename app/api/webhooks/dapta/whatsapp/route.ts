import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { julianaResult } from "@/lib/tower/juliana"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const secret = process.env.DAPTA_WHATSAPP_RESULT_SECRET
  if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Webhook sin configurar" }, { status: 503 })
  }
  const expected = Buffer.from(secret)
  const actual = Buffer.from(request.headers.get("x-webhook-secret") ?? "")
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const parsed = julianaResult.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Resultado inválido" }, { status: 422 })
  const { order_id, attempt_id, outcome } = parsed.data
  const { data, error } = await createAdminClient().rpc("tower_finish_juliana", {
    target_order: order_id, attempt: attempt_id, next_status: outcome,
  })
  if (error) return NextResponse.json({ error: "No se pudo guardar el resultado" }, { status: 500 })
  return NextResponse.json({ ok: true, applied: data })
}
