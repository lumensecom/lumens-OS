import { NextResponse, type NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * Endpoint de AI (Claude) — listo para usarse cuando se configure
 * ANTHROPIC_API_KEY en las env vars (Vercel + .env.local).
 *
 * Tareas soportadas:
 *  - hooks:  ideas de hooks para un producto/ángulo
 *  - script: guion de video ad estilo PCE Colombia
 *  - libre:  prompt libre con contexto LUMENS
 */
const requestSchema = z.object({
  task: z.enum(["hooks", "script", "libre"]).default("libre"),
  prompt: z.string().min(3).max(4000),
})

const SYSTEM = `Eres el asistente creativo de LUMENS, un ecommerce de pago contra
entrega (PCE) en Colombia. Escribes en español colombiano, directo y emocional.
Conoces los 6 ángulos ganadores (hombre regalando, dolor directo, regalo
emocional, antes y después, miedo/seguridad, estatus). Los hooks deben funcionar
en los primeros 3 segundos de un video de Meta o TikTok.`

const TASK_PROMPTS: Record<string, string> = {
  hooks: "Genera 10 hooks distintos (máximo 12 palabras cada uno) para este producto/ángulo. Numéralos y varía el ángulo emocional entre ellos:",
  script: "Escribe un guion de video ad de 30-40 segundos (hook, desarrollo del dolor, demostración, prueba social, CTA de pago contra entrega) para:",
  libre: "",
}

export async function POST(request: NextRequest) {
  // Solo usuarios autenticados de LUMENS OS.
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI no configurada todavía (falta ANTHROPIC_API_KEY)" },
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

  const { task, prompt } = parsed.data
  const anthropic = new Anthropic()

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      // Salida corta a propósito (hooks/guiones) + límite de tiempo serverless.
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `${TASK_PROMPTS[task]}\n\n${prompt}`.trim(),
        },
      ],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")

    return NextResponse.json({ text, usage: response.usage })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Límite de uso de AI alcanzado, intenta en un minuto" },
        { status: 429 },
      )
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Error de AI (${error.status})` },
        { status: 502 },
      )
    }
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 })
  }
}
