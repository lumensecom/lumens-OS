import { NextResponse, type NextRequest } from "next/server"
import OpenAI from "openai"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { AI_TASKS, type AiTask } from "@/lib/ai"
import {
  OPENROUTER_BASE_URL,
  OR_MODELS,
  resolveModel,
  type OrModelKey,
} from "@/lib/ai-models"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * AI Studio — corre sobre OpenRouter (openrouter.ai), compatible con la API
 * de OpenAI. Requiere OPENROUTER_API_KEY en las env vars (una sola key da
 * acceso a todos los modelos gratis).
 *
 * Recibe la conversación completa (con imágenes en base64) y responde en
 * streaming (texto plano). El modelo se elige según la tarea, y si hay
 * imágenes se fuerza el modelo multimodal (Gemma 4). Cada tarea ajusta el
 * prompt del sistema (ver AI_TASKS).
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
  /** Override opcional del modelo (para un selector en la UI). */
  model: z.enum(Object.keys(OR_MODELS) as [OrModelKey, ...OrModelKey[]]).optional(),
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
que el usuario indique).

Responde solo con la respuesta final, sin mostrar tu razonamiento paso a paso.`

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

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "AI no configurada todavía (falta OPENROUTER_API_KEY)" },
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

  const { task, messages, model } = parsed.data

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
  const hasImages = messages.some((m) => (m.images?.length ?? 0) > 0)
  const { id: modelId } = resolveModel(task, hasImages, model)

  // Mapea la conversación al formato OpenAI (multimodal cuando hay imágenes).
  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...messages.map((m, i) => {
      // La instrucción de la tarea se antepone solo al primer mensaje del usuario.
      const text =
        i === 0 && m.role === "user" && instruction
          ? `${instruction}\n\n${m.content}`.trim()
          : m.content
      const safeText = text || "(sin texto)"

      if (m.images?.length) {
        return {
          role: m.role,
          content: [
            { type: "text" as const, text: safeText },
            ...m.images.map((img) => ({
              type: "image_url" as const,
              image_url: { url: `data:${img.media_type};base64,${img.data}` },
            })),
          ],
        } as OpenAI.Chat.Completions.ChatCompletionMessageParam
      }
      return {
        role: m.role,
        content: safeText,
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam
    }),
  ]

  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      // Opcionales: para aparecer en el ranking de OpenRouter.
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://lumensos.vercel.app",
      "X-Title": "LUMENS OS",
    },
  })

  try {
    const stream = await client.chat.completions.create({
      model: modelId,
      messages: chatMessages,
      max_tokens: 4096,
      temperature: 0.6,
      top_p: 0.95,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) controller.enqueue(encoder.encode(delta))
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
      cancel() {
        stream.controller.abort()
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Model": modelId,
      },
    })
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Límite gratis alcanzado, intenta en un minuto" },
          { status: 429 },
        )
      }
      if (error.status === 401) {
        return NextResponse.json(
          { error: "OPENROUTER_API_KEY inválida o sin permisos" },
          { status: 502 },
        )
      }
      return NextResponse.json(
        { error: `Error de AI (${error.status ?? "?"})` },
        { status: 502 },
      )
    }
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 })
  }
}
