import type { AiTask } from "@/lib/ai"

/**
 * Configuración de modelos de IA para el AI Studio.
 *
 * Usamos NVIDIA NIM (build.nvidia.com), que es compatible con la API de OpenAI.
 * Una sola API key (NVIDIA_API_KEY) da acceso a todos estos modelos gratis.
 *
 * ⚠️ Si algún ID falla, verifícalo en build.nvidia.com: abre el modelo, pulsa
 *    "View Code" y copia el string exacto del campo "model". Cámbialo aquí.
 */
export const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"

/** IDs exactos de los modelos en NVIDIA NIM. */
export const NIM_MODELS = {
  /** Razonamiento fuerte y copy en español (550B MoE). Solo texto. */
  nemotron: "nvidia/nemotron-3-ultra-550b-a55b",
  /** El mejor en código: ideal para Liquid de Shopify. Solo texto. */
  deepseek: "deepseek-ai/deepseek-v4-pro",
  /** Único multimodal: lee imágenes. Se usa cuando adjuntas fotos. */
  gemma: "google/gemma-4-31b-it",
} as const

export type NimModelKey = keyof typeof NIM_MODELS

/** Etiqueta legible para cada modelo (para un futuro selector en la UI). */
export const NIM_MODEL_LABELS: Record<NimModelKey, string> = {
  nemotron: "Nemotron 3 Ultra (razonamiento)",
  deepseek: "DeepSeek V4 Pro (código)",
  gemma: "Gemma 4 (multimodal)",
}

/** Modelo por defecto según la tarea del AI Studio. */
export const MODEL_BY_TASK: Record<AiTask, NimModelKey> = {
  libre: "nemotron",
  hooks: "nemotron",
  script: "nemotron",
  landing: "nemotron",
  liquid: "deepseek",
  imagen: "gemma",
}

/** Único modelo que ve imágenes: se fuerza cuando el mensaje trae fotos. */
export const VISION_MODEL: NimModelKey = "gemma"

/**
 * Resuelve qué modelo usar. Si hay imágenes, gana el modelo multimodal
 * (los demás son ciegos); si no, se respeta el override o el default de la tarea.
 */
export function resolveModel(
  task: AiTask,
  hasImages: boolean,
  override?: NimModelKey,
): { key: NimModelKey; id: string } {
  const key: NimModelKey = hasImages ? VISION_MODEL : override ?? MODEL_BY_TASK[task]
  return { key, id: NIM_MODELS[key] }
}
