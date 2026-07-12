import {
  MessagesSquare,
  Zap,
  Clapperboard,
  LayoutTemplate,
  Code2,
  ImagePlus,
  type LucideIcon,
} from "lucide-react"

export type AiTask = "libre" | "hooks" | "script" | "landing" | "liquid" | "imagen"

export type AiTaskDef = {
  id: AiTask
  label: string
  description: string
  placeholder: string
  icon: LucideIcon
  /** Instrucción que el endpoint antepone al primer mensaje del usuario. */
  instruction: string
  /** Sugiere adjuntar imágenes para esta tarea. */
  wantsImages?: boolean
}

/** Tareas disponibles en el AI Studio (compartidas entre UI y endpoint). */
export const AI_TASKS: AiTaskDef[] = [
  {
    id: "libre",
    label: "Chat libre",
    description: "Pregunta lo que sea con contexto LUMENS/PCE",
    placeholder: "Escribe tu mensaje…",
    icon: MessagesSquare,
    instruction: "",
  },
  {
    id: "hooks",
    label: "Hooks",
    description: "10 hooks de 3 segundos para un producto/ángulo",
    placeholder: "Producto, ángulo y a quién le vendes…",
    icon: Zap,
    instruction:
      "Genera 10 hooks distintos (máximo 12 palabras cada uno) para este producto/ángulo. Numéralos y varía el ángulo emocional entre ellos:",
  },
  {
    id: "script",
    label: "Guion de video",
    description: "Guion de 30-40s con hook, dolor, demo y CTA",
    placeholder: "Producto, ángulo, duración deseada…",
    icon: Clapperboard,
    instruction:
      "Escribe un guion de video ad de 30-40 segundos (hook, desarrollo del dolor, demostración, prueba social, CTA de pago contra entrega) para:",
  },
  {
    id: "landing",
    label: "Landing",
    description: "Estructura + copy completo con la estructura LUMENS",
    placeholder: "Producto, precio, precio tachado y ángulo… (adjunta fotos del producto)",
    icon: LayoutTemplate,
    instruction:
      "Crea el copy COMPLETO de una landing PCE siguiendo exactamente la estructura de landing de LUMENS (Hero → Problema → Solución+Demo → Prueba social → Oferta → Cierre). Si hay imágenes adjuntas, basa el copy en lo que se ve en ellas (características visibles, uso, contexto). Entrega cada sección con títulos claros, el copy final listo para usar, y al final sugiere qué imagen/video usar en cada sección:",
    wantsImages: true,
  },
  {
    id: "liquid",
    label: "Liquid Shopify",
    description: "Sección .liquid completa lista para pegar en el tema",
    placeholder: "Pega el copy de la landing o describe la sección que necesitas…",
    icon: Code2,
    instruction:
      "Genera UNA sección Liquid de Shopify completa y auto-contenida para la landing PCE descrita a continuación. Incluye: {% schema %} con settings editables para todos los textos, imágenes y colores; CSS dentro de <style> con clases prefijadas (.lumens-*); diseño mobile-first con los colores de LUMENS (amarillo #F5C518, negro #1A1A1A, beige #FFF8F5); y el formulario de pedido contra entrega. Entrega solo el código en un bloque ```liquid con una nota corta de instalación (Personalizar → Agregar sección):",
  },
  {
    id: "imagen",
    label: "Prompt desde imagen",
    description: "Sube fotos → ángulos, hooks y prompts creativos",
    placeholder: "Adjunta las fotos del producto y di qué necesitas…",
    icon: ImagePlus,
    instruction:
      "Analiza las imágenes adjuntas de este producto y entrega: (1) qué es y qué problema resuelve, (2) el mejor ángulo de venta PCE y a quién apunta, (3) 5 hooks basados en lo que se ve, (4) prompts listos para generar creativos con AI (imagen y video), en español y en inglés, describiendo escena, estilo, iluminación y formato 9:16. Contexto del usuario:",
    wantsImages: true,
  },
]
