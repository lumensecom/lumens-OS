/**
 * Generador de mensajes de WhatsApp a partir del listado que se copia
 * directamente del panel de Dropi (copiar-pegar, no Excel).
 *
 * Formato de cada pedido en el pegado:
 *
 *   83140653⇥
 *    Cinturon de Colicos
 *   Tiene Nota⇥21/07/2026 10:43 p. m.⇥Johan Hernández
 *   BARRIO LIBERTADORES CARRERA 13 # 19 A - 76 CASA , INIRIDA-GUAINIA
 *   Tel: 3213964042
 *   PENDIENTE CONFIRMACION⇥INTERRAPIDISIMO⇥
 *    DISTRI SHOP PRINCIPAL
 *   CON RECAUDO
 *   SHOPIFY-LUMENS
 *   Orden ID: 2158
 *
 * El parseo se ancla en marcas fiables ("Tel:", "Orden ID:", la línea de
 * fecha) en vez de posiciones fijas, para tolerar variaciones entre estados.
 */

export type PastedOrder = {
  guia: string
  product: string
  date: string
  customerName: string
  address: string
  city: string
  department: string
  phone: string
  status: string
  carrier: string
  orderId: string
}

const DATE_RE = /\d{1,2}\/\d{1,2}\/\d{2,4}/
const GUIA_RE = /^\d{6,}$/
const TEL_RE = /^tel\s*:/i
const ORDER_ID_RE = /orden\s*id\s*:\s*(\S+)/i

const SMALL_WORDS = new Set(["de", "del", "la", "las", "los", "y", "el", "en"])

/** "HATO COROZAL" → "Hato Corozal"; respeta conectores en minúscula. */
export function toTitleCase(raw: string): string {
  return raw
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      if (i > 0 && SMALL_WORDS.has(w)) return w
      // Mayúscula en la primera letra, no en signos como "(" → "(Mesitas)".
      return w.replace(/\p{L}/u, (c) => c.toUpperCase())
    })
    .join(" ")
}

/** Primer nombre en formato bonito ("johan sneyder" → "Johan"). */
export function firstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? ""
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : ""
}

/** Separa "CALLE 1 , CIUDAD-DEPARTAMENTO" en sus tres partes. */
function splitAddress(line: string): { address: string; city: string; department: string } {
  const clean = line.trim()
  const lastComma = clean.lastIndexOf(",")
  if (lastComma === -1) return { address: clean, city: "", department: "" }

  const address = clean.slice(0, lastComma).replace(/[\s,]+$/, "").trim()
  const tail = clean.slice(lastComma + 1).trim()
  // Ciudad y departamento van unidos por el último guion ("SANTIAGO-NORTE DE SANTANDER").
  const lastDash = tail.lastIndexOf("-")
  if (lastDash === -1) return { address, city: tail, department: "" }
  return {
    address,
    city: tail.slice(0, lastDash).trim(),
    department: tail.slice(lastDash + 1).trim(),
  }
}

/** Corta el texto pegado en bloques, uno por pedido. */
function splitBlocks(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const blocks: string[][] = []
  let current: string[] = []

  for (const line of lines) {
    const bare = line.replace(/\t/g, " ").trim()
    // Una línea con solo el número de guía marca el inicio de un pedido nuevo.
    if (GUIA_RE.test(bare)) {
      if (current.some((l) => l.trim())) blocks.push(current)
      current = [line]
      continue
    }
    current.push(line)
  }
  if (current.some((l) => l.trim())) blocks.push(current)

  // Si no se detectó ninguna guía, cae al separador por líneas en blanco.
  if (blocks.length <= 1 && !lines.some((l) => GUIA_RE.test(l.replace(/\t/g, " ").trim()))) {
    return text
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n/)
      .map((chunk) => chunk.split("\n"))
      .filter((chunk) => chunk.some((l) => l.trim()))
  }
  return blocks
}

/** Parsea un bloque en un pedido; null si no tiene teléfono utilizable. */
function parseBlock(block: string[]): PastedOrder | null {
  const lines = block.map((l) => l.replace(/ /g, " "))
  const trimmed = lines.map((l) => l.trim())

  const telIdx = trimmed.findIndex((l) => TEL_RE.test(l))
  const phoneRaw = telIdx >= 0 ? trimmed[telIdx].replace(TEL_RE, "") : ""
  const phone = phoneRaw.replace(/\D/g, "")
  if (phone.length < 7) return null

  // Guía: primera línea que sea solo dígitos.
  const guia = trimmed.find((l) => GUIA_RE.test(l.replace(/\t/g, " ").trim())) ?? ""

  // Línea de fecha + cliente (separadas por tabulaciones).
  const dateIdx = trimmed.findIndex((l) => DATE_RE.test(l))
  let date = ""
  let customerName = ""
  if (dateIdx >= 0) {
    const fields = lines[dateIdx].split("\t").map((f) => f.trim())
    const dateField = fields.findIndex((f) => DATE_RE.test(f))
    date = fields[dateField] ?? ""
    const after = fields.slice(dateField + 1).filter(Boolean)
    customerName = after[0] ?? ""
    if (!customerName) {
      const before = fields.slice(0, dateField).filter(Boolean)
      customerName = before[before.length - 1] ?? ""
    }
  }

  // Dirección: la línea inmediatamente anterior a "Tel:".
  const addressLine = telIdx > 0 ? trimmed[telIdx - 1] : ""
  const { address, city, department } = splitAddress(addressLine)

  // Estado y transportadora: la línea siguiente a "Tel:".
  let status = ""
  let carrier = ""
  if (telIdx >= 0 && telIdx + 1 < lines.length) {
    const fields = lines[telIdx + 1].split("\t").map((f) => f.trim()).filter(Boolean)
    status = fields[0] ?? ""
    carrier = fields[1] ?? ""
  }

  // Producto: primera línea con texto entre la guía y la línea de fecha.
  let product = ""
  const guiaIdx = trimmed.findIndex((l) => GUIA_RE.test(l.replace(/\t/g, " ").trim()))
  const limit = dateIdx > 0 ? dateIdx : telIdx
  for (let i = Math.max(0, guiaIdx) + 1; i < limit; i++) {
    if (trimmed[i]) {
      product = trimmed[i]
      break
    }
  }

  const orderMatch = block.join("\n").match(ORDER_ID_RE)

  return {
    guia,
    product,
    date,
    customerName,
    address,
    city,
    department,
    phone,
    status,
    carrier,
    orderId: orderMatch?.[1] ?? "",
  }
}

/** Parsea todo el texto pegado desde Dropi. */
export function parsePastedOrders(text: string): PastedOrder[] {
  if (!text.trim()) return []
  return splitBlocks(text)
    .map(parseBlock)
    .filter((o): o is PastedOrder => o !== null)
}

// ── Plantillas de mensaje ────────────────────────────────────────

export type MessageType = "confirmacion" | "oficina" | "devolucion"

export type MessageTypeDef = {
  id: MessageType
  label: string
  color: string
  helper: string
  /** Clases del botón principal para este tipo. */
  buttonClass: string
  /** Clases del chip cuando está seleccionado. */
  selectedClass: string
}

export const MESSAGE_TYPES: MessageTypeDef[] = [
  {
    id: "confirmacion",
    label: "Confirmación",
    color: "#F5C518",
    helper:
      "Pega los pedidos en estado PENDIENTE CONFIRMACION para pedirle al cliente que confirme antes de despachar.",
    buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
    selectedClass: "border-primary bg-primary/15 shadow-[0_0_0_1px_hsl(var(--primary))]",
  },
  {
    id: "oficina",
    label: "Recoger en oficina",
    color: "#3b82f6",
    helper:
      "Pega los pedidos que llegaron a oficina de la transportadora para avisarle al cliente que pase a reclamarlo.",
    buttonClass: "bg-blue-500 text-white hover:bg-blue-500/90",
    selectedClass: "border-blue-500 bg-blue-500/15 shadow-[0_0_0_1px_theme(colors.blue.500)]",
  },
  {
    id: "devolucion",
    label: "Devolución",
    color: "#ef4444",
    helper:
      "Pega los pedidos en devolución para intentar recuperar la venta antes de que el paquete regrese.",
    buttonClass: "bg-lumens-red text-white hover:bg-lumens-red/90",
    selectedClass: "border-lumens-red bg-lumens-red/15 shadow-[0_0_0_1px_#ef4444]",
  },
]

/** Une las líneas de una plantilla: descarta las opcionales (null) y colapsa
 *  saltos de línea repetidos, conservando los párrafos en blanco a propósito. */
function joinTemplate(lines: (string | null)[]): string {
  return lines
    .filter((l): l is string => l !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Arma el mensaje de WhatsApp para un pedido según el tipo elegido. */
export function buildMessage(type: MessageType, order: PastedOrder): string {
  const nombre = firstName(order.customerName)
  const saludo = nombre ? `Hola ${nombre} 👋` : "¡Hola! 👋"
  const producto = order.product || "tu pedido"
  const ciudad = order.city ? toTitleCase(order.city) : ""
  const depto = order.department ? toTitleCase(order.department) : ""
  const destino = [ciudad, depto].filter(Boolean).join(", ")
  const transportadora = order.carrier ? toTitleCase(order.carrier) : "la transportadora"

  if (type === "oficina") {
    return joinTemplate([
      `${saludo} Te escribimos de *LUMENS*.`,
      "",
      `¡Tu pedido de *${producto}* ya llegó a la oficina de ${transportadora}${ciudad ? ` en ${ciudad}` : ""}! 🎉`,
      "",
      "📍 Puedes reclamarlo presentando tu cédula.",
      order.guia ? `🔢 Número de guía: *${order.guia}*` : null,
      "💰 Recuerda llevar el valor del pedido (pago contra entrega).",
      "",
      "⚠️ La transportadora solo lo guarda unos días antes de devolverlo. ¿Cuándo puedes pasar a recogerlo?",
    ])
  }

  if (type === "devolucion") {
    return joinTemplate([
      `${saludo} Te escribimos de *LUMENS*.`,
      "",
      `Vimos que tu pedido de *${producto}*${order.guia ? ` (guía ${order.guia})` : ""} está en proceso de devolución 😔`,
      "",
      "Queremos ayudarte: si hubo un problema con la entrega, la dirección o el horario, lo solucionamos y te lo reenviamos *sin costo adicional*.",
      "",
      order.address ? `📍 Dirección registrada: ${order.address}${destino ? `, ${destino}` : ""}` : null,
      "",
      "¿Quieres que lo intentemos de nuevo? Respóndenos y lo gestionamos hoy mismo 🚚",
    ])
  }

  // Confirmación (por defecto)
  return joinTemplate([
    `${saludo} Te escribimos de *LUMENS*.`,
    "",
    `Queremos confirmar tu pedido de *${producto}* 📦`,
    destino ? `📍 Envío a: ${destino}` : null,
    "💰 Pago contra entrega: pagas cuando lo recibes en tu casa.",
    "",
    "¿Confirmas que sigue en pie para despacharlo hoy mismo? Respóndenos *SÍ* y sale de una 🚚",
  ])
}

/** Link de WhatsApp con el mensaje pre-cargado. */
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "")
  const e164 = digits.startsWith("57") ? digits : digits.length === 10 ? `57${digits}` : digits
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`
}

/** Ejemplo del formato esperado (se muestra en el dialog de ayuda). */
export const FORMAT_EXAMPLE = `83140653\t
 Cinturon de Colicos
Tiene Nota\t21/07/2026 10:43 p. m.\tJohan Hernández
BARRIO LIBERTADORES CARRERA 13 # 19 A - 76 CASA , INIRIDA-GUAINIA
Tel: 3213964042
PENDIENTE CONFIRMACION\tINTERRAPIDISIMO\t
 DISTRI SHOP PRINCIPAL
CON RECAUDO
SHOPIFY-LUMENS
Orden ID: 2158\t\t`
