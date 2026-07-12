import { NextResponse, type NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { AI_TASKS, type AiTask } from "@/lib/ai"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * AI Studio (Claude) — requiere ANTHROPIC_API_KEY en las env vars.
 *
 * Recibe la conversación completa (con imágenes en base64) y responde
 * en streaming (texto plano). Cada tarea ajusta el prompt del sistema:
 *  - libre:   chat con contexto LUMENS
 *  - hooks:   ideas de hooks para un producto/ángulo
 *  - script:  guion de video ad estilo PCE Colombia
 *  - landing: estructura + copy de landing PCE (basada en imágenes si hay)
 *  - liquid:  sección Liquid de Shopify lista para pegar
 *  - imagen:  análisis de imágenes → ángulos, hooks y prompts creativos
 */
const imageSchema = z.object({
  media_type: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  data: z.string().min(1).max(6_000_000),
})

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(30_000),
  images: z.array(imageSchema).max(4).optional(),
})

const requestSchema = z.object({
  task: z.enum(["libre", "hooks", "script", "landing", "liquid", "imagen"]).default("libre"),
  messages: z.array(messageSchema).min(1).max(24),
})

const BASE_SYSTEM = `Eres el asistente creativo de LUMENS, un ecommerce de pago contra
entrega (PCE) en Colombia. Escribes en español colombiano, directo y emocional.
Conoces los 6 ángulos ganadores (hombre regalando, dolor directo, regalo
emocional, antes y después, miedo/seguridad, estatus). Los hooks deben funcionar
en los primeros 3 segundos de un video de Meta o TikTok.

Estructura de landing que usa LUMENS (siempre en este orden):
1. HERO: headline con el hook principal, subheadline con la promesa, precio con
   tachado (ancla), badge de "Pago contra entrega" y CTA inmediato.
2. PROBLEMA: agitación del dolor con lenguaje del cliente.
3. SOLUCIÓN + DEMO: el producto en acción, 3-5 beneficios en bullets con íconos.
4. PRUEBA SOCIAL: testimonios con nombre y ciudad colombiana, fotos reales.
5. OFERTA: stack de valor, garantía, envío gratis, urgencia/escasez honesta.
6. CIERRE: FAQ cortas + formulario de pedido contra entrega (nombre, teléfono,
   dirección, ciudad/departamento).

Cuando generes código Liquid para Shopify: una sección completa y auto-contenida
({% schema %} con settings para todos los textos, imágenes y colores; CSS dentro
de <style> con clases prefijadas para no chocar con el tema; mobile-first; sin
librerías externas; formulario de COD que apunta a /cart/add o el form action
que el usuario indique).`

function taskInstruction(task: AiTask): string {
  return AI_TASKS.find((t) => t.id === task)?.instruction ?? ""
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

  const { task, messages } = parsed.data

  // Contexto de marca editable desde Configuración.
  const { data: settings } = await supabase
    .from("settings")
    .select("ai_brand_context")
    .eq("id", 1)
    .maybeSingle()
  const system = settings?.ai_brand_context
    ? `${BASE_SYSTEM}\n\nContexto adicional de la marca (definido por el dueño):\n${settings.ai_brand_context}`
    : BASE_SYSTEM

  const instruction = taskInstruction(task)
  const apiMessages: Anthropic.MessageParam[] = messages.map((m, i) => {
    const blocks: Anthropic.ContentBlockParam[] = (m.images ?? []).map((img) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: img.media_type, data: img.data },
    }))
    // La instrucción de la tarea se antepone solo al primer mensaje del usuario.
    const text =
      i === 0 && m.role === "user" && instruction
        ? `${instruction}\n\n${m.content}`.trim()
        : m.content
    blocks.push({ type: "text", text: text || "(sin texto)" })
    return { role: m.role, content: blocks }
  })

  const anthropic = new Anthropic()

  try {
    const stream = anthropic.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      system,
      messages: apiMessages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        stream.on("text", (text) => controller.enqueue(encoder.encode(text)))
        try {
          await stream.finalMessage()
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
      cancel() {
        stream.abort()
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
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
