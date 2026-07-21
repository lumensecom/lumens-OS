/**
 * Análisis de reportes de Dropi (Colombia).
 *
 * Dropi exporta un .xlsx con ~53 columnas y una fila por producto por pedido.
 * Los nombres de columna varían entre cuentas/versiones, así que el parser
 * empareja columnas por nombre normalizado (sin acentos, en minúsculas) y
 * agrupa las filas por número de orden para obtener métricas a nivel de pedido.
 *
 * Todo el módulo es puro (sin imports de servidor) para poder correr en el
 * navegador tras leer el archivo con la librería xlsx.
 */

export type DropiBucket =
  | "delivered" // Entregado
  | "in_transit" // En tránsito / guía generada / reparto
  | "pending" // Pendiente / por confirmar
  | "returned" // Devolución / rechazado
  | "cancelled" // Cancelado
  | "other"

export const BUCKET_LABELS: Record<DropiBucket, string> = {
  delivered: "Entregado",
  in_transit: "En tránsito",
  pending: "Por confirmar",
  returned: "Devuelto",
  cancelled: "Cancelado",
  other: "Otro",
}

/** Color de marca por estado (para chips, chart y semáforos). */
export const BUCKET_COLORS: Record<DropiBucket, string> = {
  delivered: "#22a55b",
  in_transit: "#3b82f6",
  pending: "#F5C518",
  returned: "#ef4444",
  cancelled: "#9ca3af",
  other: "#c4b5fd",
}

/** Pedido consolidado (una o varias filas del mismo número de orden). */
export type DropiOrder = {
  orderId: string
  date: string | null // ISO yyyy-mm-dd
  rawStatus: string
  bucket: DropiBucket
  customerName: string
  phone: string
  city: string
  department: string
  products: string[]
  quantity: number
  saleValue: number
  supplierCost: number
  profit: number
  shippingCost: number
}

export type DropiDataset = {
  orders: DropiOrder[]
  minDate: string | null
  maxDate: string | null
  unmatchedColumns: string[] // campos clave que no se pudieron mapear
}

// ── Helpers de parseo ────────────────────────────────────────────

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "")

export const normHeader = (h: string) =>
  stripAccents(String(h ?? "").toLowerCase()).replace(/\s+/g, " ").trim()

/** Índice de la primera columna cuyo header contiene alguno de los patrones. */
function findCol(headers: string[], patterns: string[]): number {
  const normed = headers.map(normHeader)
  for (const p of patterns) {
    const idx = normed.findIndex((h) => h.includes(p))
    if (idx !== -1) return idx
  }
  return -1
}

/**
 * "$ 67.900" / "120.000" / "1.234,56" / "1,234.56" → número.
 *
 * Los montos de Dropi son pesos colombianos (enteros): tanto "." como ","
 * son separadores de miles, salvo que el último separador venga seguido de
 * exactamente 2 dígitos al final (centavos), en cuyo caso es decimal.
 */
export function parseMoney(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0
  let s = String(raw ?? "").replace(/[^\d.,-]/g, "").trim()
  if (!s) return 0

  const decimalMatch = s.match(/[.,](\d{2})$/)
  const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","))
  if (decimalMatch && lastSep === s.length - 3) {
    // Último separador seguido de 2 dígitos → decimal; el resto son miles.
    const intPart = s.slice(0, lastSep).replace(/[.,]/g, "")
    s = `${intPart}.${decimalMatch[1]}`
  } else {
    // Todos los separadores son de miles.
    s = s.replace(/[.,]/g, "")
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/** Normaliza fechas (Date de xlsx, serial, o texto) a ISO yyyy-mm-dd. */
export function parseDate(raw: unknown): string | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return toISO(raw)
  }
  if (typeof raw === "number" && raw > 0) {
    // Serial de Excel (días desde 1899-12-30).
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000))
    return Number.isNaN(d.getTime()) ? null : toISO(d)
  }
  const s = String(raw ?? "").trim()
  if (!s) return null
  const iso = s.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    const [, a, b] = m
    const year = m[3].length === 2 ? `20${m[3]}` : m[3]
    // Colombia usa dd/mm; si el 2º número es >12 es mm/dd (export en inglés).
    const [day, month] = Number(b) > 12 ? [b, a] : [a, b]
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : toISO(d)
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Clasifica el estado crudo de Dropi en un bucket. */
export function classifyStatus(raw: string): DropiBucket {
  const s = normHeader(raw)
  if (!s) return "other"
  if (s.includes("devol") || s.includes("devuelt") || s.includes("rechaz")) return "returned"
  if (s.includes("cancel") || s.includes("anulad")) return "cancelled"
  if (s.includes("entreg")) return "delivered"
  if (
    s.includes("pendiente") ||
    s.includes("por confirmar") ||
    s.includes("sin confirmar") ||
    s.includes("confirmacion")
  )
    return "pending"
  if (
    s.includes("transito") ||
    s.includes("reparto") ||
    s.includes("camino") ||
    s.includes("enviad") ||
    s.includes("despach") ||
    s.includes("guia") ||
    s.includes("novedad") ||
    s.includes("preparand") ||
    s.includes("empacad") ||
    s.includes("alistando")
  )
    return "in_transit"
  return "other"
}

// Diccionario de patrones por campo (orden = prioridad).
const COLS = {
  orderId: ["id de la orden", "no de la orden", "numero orden", "n orden", "orden id", "id orden", "pedido id", "order id", "guia", "id"],
  status: ["estatus", "estado del envio", "estado de la orden", "estado envio", "estado", "status"],
  date: ["fecha de creacion", "fecha creacion", "fecha de la orden", "fecha", "creado", "created"],
  customer: ["nombre del cliente", "nombre cliente", "cliente", "destinatario", "nombre"],
  phone: ["telefono", "celular", "phone", "whatsapp", "movil"],
  city: ["ciudad", "municipio"],
  department: ["departamento", "depto", "provincia", "estado / departamento"],
  product: ["nombre del producto", "producto", "product"],
  quantity: ["cantidad", "unidades", "qty", "cant"],
  sale: ["total de la orden", "valor total", "precio de venta", "total orden", "valor de venta", "precio venta", "monto", "total"],
  supplier: ["precio proveedor", "costo proveedor", "precio de proveedor", "costo del producto", "costo"],
  profit: ["ganancia", "utilidad", "tu ganancia", "profit"],
  shipping: ["precio flete", "valor flete", "costo de envio", "costo envio", "flete"],
} as const

/** Si todos los valores son iguales, es un total repetido por fila → tómalo una
 *  vez; si difieren, son valores por línea → súmalos. */
function aggregateMoney(values: number[]): number {
  if (values.length === 0) return 0
  const first = values[0]
  const allEqual = values.every((v) => v === first)
  return allEqual ? first : values.reduce((s, v) => s + v, 0)
}

/**
 * Convierte la grilla cruda del xlsx (array de arrays; fila 0 = headers)
 * en un dataset consolidado por pedido.
 */
export function buildDataset(grid: unknown[][]): DropiDataset {
  const empty: DropiDataset = { orders: [], minDate: null, maxDate: null, unmatchedColumns: [] }
  if (!grid || grid.length < 2) return empty

  const headers = (grid[0] ?? []).map((h) => String(h ?? ""))
  const col = {
    orderId: findCol(headers, [...COLS.orderId]),
    status: findCol(headers, [...COLS.status]),
    date: findCol(headers, [...COLS.date]),
    customer: findCol(headers, [...COLS.customer]),
    phone: findCol(headers, [...COLS.phone]),
    city: findCol(headers, [...COLS.city]),
    department: findCol(headers, [...COLS.department]),
    product: findCol(headers, [...COLS.product]),
    quantity: findCol(headers, [...COLS.quantity]),
    sale: findCol(headers, [...COLS.sale]),
    supplier: findCol(headers, [...COLS.supplier]),
    profit: findCol(headers, [...COLS.profit]),
    shipping: findCol(headers, [...COLS.shipping]),
  }

  const unmatched: string[] = []
  if (col.status === -1) unmatched.push("estado")
  if (col.sale === -1) unmatched.push("valor de venta")
  if (col.profit === -1) unmatched.push("ganancia")
  if (col.date === -1) unmatched.push("fecha")

  const get = (row: unknown[], idx: number) => (idx >= 0 ? row[idx] : undefined)
  const str = (v: unknown) => String(v ?? "").trim()

  // Agrupa filas por número de orden (o clave sintética si no hay id).
  type Group = { rows: unknown[][] }
  const groups = new Map<string, Group>()

  for (let i = 1; i < grid.length; i++) {
    const row = grid[i]
    if (!row || row.every((c) => str(c) === "")) continue
    const idRaw = str(get(row, col.orderId))
    const key =
      idRaw ||
      `${str(get(row, col.customer))}|${str(get(row, col.phone))}|${parseDate(get(row, col.date)) ?? i}`
    const g = groups.get(key)
    if (g) g.rows.push(row)
    else groups.set(key, { rows: [row] })
  }

  const orders: DropiOrder[] = []
  let minDate: string | null = null
  let maxDate: string | null = null

  for (const [key, g] of groups) {
    const first = g.rows[0]
    const rawStatus = str(get(first, col.status))
    const date = parseDate(get(first, col.date))
    if (date) {
      if (!minDate || date < minDate) minDate = date
      if (!maxDate || date > maxDate) maxDate = date
    }

    const products = Array.from(
      new Set(g.rows.map((r) => str(get(r, col.product))).filter(Boolean)),
    )

    orders.push({
      orderId: key,
      date,
      rawStatus,
      bucket: classifyStatus(rawStatus),
      customerName: str(get(first, col.customer)),
      phone: str(get(first, col.phone)),
      city: str(get(first, col.city)),
      department: str(get(first, col.department)),
      products: products.length ? products : ["—"],
      quantity: g.rows.reduce((s, r) => s + (parseMoney(get(r, col.quantity)) || 1), 0),
      saleValue: aggregateMoney(g.rows.map((r) => parseMoney(get(r, col.sale)))),
      supplierCost: aggregateMoney(g.rows.map((r) => parseMoney(get(r, col.supplier)))),
      profit: aggregateMoney(g.rows.map((r) => parseMoney(get(r, col.profit)))),
      shippingCost: aggregateMoney(g.rows.map((r) => parseMoney(get(r, col.shipping)))),
    })
  }

  orders.sort((a, b) => (a.date && b.date ? (a.date < b.date ? 1 : -1) : 0))
  return { orders, minDate, maxDate, unmatchedColumns: unmatched }
}

// ── Métricas ─────────────────────────────────────────────────────

export type DropiKpis = {
  total: number
  delivered: number
  inTransit: number
  pending: number
  returned: number
  cancelled: number
  other: number
  ventasBrutas: number // suma de venta de entregados
  gananciaReal: number // suma de ganancia de entregados
  costoDevoluciones: number // flete de devueltos
  deliveryRate: number
  returnRate: number
  pendingRate: number
}

const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0)

export function computeKpis(orders: DropiOrder[]): DropiKpis {
  const by = (b: DropiBucket) => orders.filter((o) => o.bucket === b)
  const delivered = by("delivered")
  const inTransit = by("in_transit")
  const pending = by("pending")
  const returned = by("returned")
  const cancelled = by("cancelled")
  const other = by("other")

  const opBase = delivered.length + returned.length + inTransit.length

  return {
    total: orders.length,
    delivered: delivered.length,
    inTransit: inTransit.length,
    pending: pending.length,
    returned: returned.length,
    cancelled: cancelled.length,
    other: other.length,
    ventasBrutas: delivered.reduce((s, o) => s + o.saleValue, 0),
    gananciaReal: delivered.reduce((s, o) => s + o.profit, 0),
    costoDevoluciones: returned.reduce((s, o) => s + o.shippingCost, 0),
    deliveryRate: pct(delivered.length, opBase),
    returnRate: pct(returned.length, opBase),
    pendingRate: pct(pending.length, orders.length),
  }
}

/** Publicidad ingresada manualmente + utilidad neta. */
export type AdSpend = { meta: number; tiktok: number; otros: number }

export function totalAdSpend(a: AdSpend): number {
  return (a.meta || 0) + (a.tiktok || 0) + (a.otros || 0)
}

export function netUtility(kpis: DropiKpis, ads: AdSpend): number {
  return kpis.gananciaReal - kpis.costoDevoluciones - totalAdSpend(ads)
}

/** Días pendiente desde la fecha del pedido hasta hoy. */
export function daysPending(date: string | null): number {
  if (!date) return 0
  const then = new Date(`${date}T00:00:00`)
  const diff = Date.now() - then.getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

/** Lunes de la semana ISO de una fecha ISO. */
function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  const day = (d.getDay() + 6) % 7 // 0 = lunes
  d.setDate(d.getDate() - day)
  return toISO(d)
}

export type WeeklyPoint = {
  week: string
  delivered: number
  in_transit: number
  pending: number
  returned: number
}

/** Pedidos por semana, apilados por estado. */
export function weeklySeries(orders: DropiOrder[]): WeeklyPoint[] {
  const map = new Map<string, WeeklyPoint>()
  for (const o of orders) {
    if (!o.date) continue
    const wk = weekStart(o.date)
    const p =
      map.get(wk) ??
      { week: wk, delivered: 0, in_transit: 0, pending: 0, returned: 0 }
    if (o.bucket === "delivered") p.delivered++
    else if (o.bucket === "in_transit") p.in_transit++
    else if (o.bucket === "pending") p.pending++
    else if (o.bucket === "returned") p.returned++
    map.set(wk, p)
  }
  return Array.from(map.values()).sort((a, b) => (a.week < b.week ? -1 : 1))
}

export type CityStat = {
  city: string
  orders: number
  delivered: number
  deliveryRate: number
}

/** Top ciudades por número de pedidos, con su tasa de entrega. */
export function topCities(orders: DropiOrder[], limit = 5): CityStat[] {
  const map = new Map<string, { orders: number; delivered: number; opBase: number }>()
  for (const o of orders) {
    const city = o.city || "Sin ciudad"
    const s = map.get(city) ?? { orders: 0, delivered: 0, opBase: 0 }
    s.orders++
    if (o.bucket === "delivered") s.delivered++
    if (o.bucket === "delivered" || o.bucket === "returned" || o.bucket === "in_transit") s.opBase++
    map.set(city, s)
  }
  return Array.from(map.entries())
    .map(([city, s]) => ({
      city,
      orders: s.orders,
      delivered: s.delivered,
      deliveryRate: pct(s.delivered, s.opBase),
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit)
}

/** Teléfono en formato E.164 Colombia para tel: y wa.me. */
export function normalizePhone(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("57")) return digits
  if (digits.length === 10) return `57${digits}`
  return digits
}
