import { z } from "zod"

/** Schema de un artículo de la base de conocimiento. */
export const articleSchema = z.object({
  title: z.string().min(2, "Título requerido"),
  slug: z
    .string()
    .min(2, "Slug requerido")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones"),
  category_id: z.string().uuid("Selecciona una categoría"),
  content: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  is_pinned: z.boolean().default(false),
})

export type ArticleInput = z.infer<typeof articleSchema>

/** Convierte el texto "a, b, c" a array de tags limpios. */
export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10)
}

/** Extrae un resumen plano del markdown (sin encabezados ni marcas). */
export function extractExcerpt(content: string | null, length = 140): string {
  if (!content) return ""
  const plain = content
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/[*_`>#[\]()!-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return plain.length > length ? `${plain.slice(0, length)}…` : plain
}
