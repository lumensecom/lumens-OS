import type { AiTask } from "@/lib/ai"

/**
 * Configuración de modelos del AI Studio.
 *
 * Proveedor: OpenRouter (compatible con OpenAI). Una sola API key
 * (OPENROUTER_API_KEY, empieza con `sk-or-...`) da acceso a TODOS los modelos.
 * Usamos modelos gratis con sufijo `:free`.
 *
 * ⚠️ La lista de modelos gratis rota. Si un ID falla ("model not found"),
 *    verifícalo en openrouter.ai/models (filtro precio $0) y actualízalo aquí.
 */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

/** Modelos gratis de OpenRouter (verificados). */
export const OR_MODELS = {
  /** Razonamiento fuerte y copy en español (550B MoE). Solo texto. */
  nemotron: "nvidia/nemotron-3-ultra-550b-a55b:free",
  /** Especialista en código: ideal para Liquid de Shopify. Solo texto. */
  code: "cohere/north-mini-code:free",
  /** Multimodal: lee imágenes. Se usa cuando adjuntas fotos. */
  vision: "google/gemma-4-31b-it:free",
} as const

export type OrModelKey = keyof typeof OR_MODELS

/** Etiqueta legible para cada modelo (para un futuro selector en la UI). */
export const OR_MODEL_LABELS: Record<OrModelKey, string> = {
  nemotron: "Nemotron 3 Ultra (razonamiento)",
  code: "North Mini Code (código)",
  vision: "Gemma 4 (multimodal)",
}

/** Modelo por defecto según la tarea del AI Studio. */
export const MODEL_BY_TASK: Record<AiTask, OrModelKey> = {
  libre: "nemotron",
  hooks: "nemotron",
  script: "nemotron",
  landing: "nemotron",
  liquid: "code",
  imagen: "vision",
}

/** Único modelo que ve imágenes: se fuerza cuando el mensaje trae fotos. */
export const VISION_MODEL: OrModelKey = "vision"

/**
 * Resuelve qué modelo usar. Si hay imágenes gana el modelo multimodal
 * (los demás son ciegos); si no, se respeta el override o el default de la tarea.
 */
export function resolveModel(
  task: AiTask,
  hasImages: boolean,
  override?: OrModelKey,
): { key: OrModelKey; id: string } {
  const key: OrModelKey = hasImages ? VISION_MODEL : override ?? MODEL_BY_TASK[task]
  return { key, id: OR_MODELS[key] }
}
