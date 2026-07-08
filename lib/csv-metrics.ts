/**
 * Parser de exports CSV de Meta Ads Manager y TikTok Ads Manager.
 * Detecta la plataforma por las columnas presentes y normaliza
 * cada fila a una métrica diaria { date, spend, impressions, clicks, conversions }.
 */

export type ParsedMetricRow = {
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  campaignName?: string
}

export type ParseResult = {
  platform: "meta" | "tiktok" | "unknown"
  rows: ParsedMetricRow[]
  skipped: number
}

/** Parsea texto CSV respetando comillas dobles. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(cell)
      cell = ""
      if (row.some((c) => c.trim() !== "")) rows.push(row)
      row = []
    } else {
      cell += ch
    }
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== "")) rows.push(row)
  return rows
}

/** Convierte "1,234.56", "1.234,56", "$ 12.000" → número. */
export function parseAmount(raw: string): number {
  let s = raw.replace(/[^\d.,-]/g, "").trim()
  if (!s) return 0
  const lastComma = s.lastIndexOf(",")
  const lastDot = s.lastIndexOf(".")
  if (lastComma > lastDot) {
    // coma decimal (formato es-CO/europeo)
    s = s.replace(/\./g, "").replace(",", ".")
  } else {
    s = s.replace(/,/g, "")
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/** Normaliza fechas "yyyy-mm-dd", "dd/mm/yyyy" o "mm/dd/yyyy" a ISO. */
export function parseDay(raw: string): string | null {
  const s = raw.trim().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) {
    const [, a, b, year] = m
    // Por defecto asumimos dd/mm (formato Colombia); si el segundo número
    // no puede ser mes (>12), interpretamos mm/dd (export en inglés).
    const [day, month] = Number(b) > 12 ? [b, a] : [a, b]
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  return null
}

const norm = (h: string) => h.toLowerCase().trim()

function findCol(headers: string[], patterns: string[]): number {
  return headers.findIndex((h) => patterns.some((p) => norm(h).includes(p)))
}

/** Parsea un export de Meta o TikTok y devuelve filas normalizadas. */
export function parseMetricsCsv(text: string): ParseResult {
  const grid = parseCsv(text)
  if (grid.length < 2) return { platform: "unknown", rows: [], skipped: 0 }

  const headers = grid[0]
  const isMeta = findCol(headers, ["amount spent", "importe gastado"]) !== -1
  const isTiktok =
    !isMeta && findCol(headers, ["cost", "costo", "gasto total"]) !== -1

  const platform = isMeta ? "meta" : isTiktok ? "tiktok" : "unknown"

  const dateCol = findCol(headers, ["day", "día", "dia", "date", "fecha", "reporting starts", "inicio del informe"])
  const spendCol = isMeta
    ? findCol(headers, ["amount spent", "importe gastado"])
    : findCol(headers, ["total cost", "cost", "costo", "gasto total"])
  const imprCol = findCol(headers, ["impression", "impresion"])
  const clickCol = findCol(headers, ["link click", "clics en el enlace", "click", "clic"])
  const convCol = findCol(headers, ["results", "resultados", "purchase", "compra", "conversion", "conversión", "conversiones"])
  const nameCol = findCol(headers, ["campaign name", "nombre de la campaña", "campaña", "campaign"])

  if (dateCol === -1 || spendCol === -1) {
    return { platform, rows: [], skipped: grid.length - 1 }
  }

  const rows: ParsedMetricRow[] = []
  let skipped = 0

  for (const line of grid.slice(1)) {
    const date = parseDay(line[dateCol] ?? "")
    if (!date) {
      skipped++
      continue
    }
    rows.push({
      date,
      spend: parseAmount(line[spendCol] ?? "0"),
      impressions: Math.round(parseAmount(imprCol >= 0 ? (line[imprCol] ?? "0") : "0")),
      clicks: Math.round(parseAmount(clickCol >= 0 ? (line[clickCol] ?? "0") : "0")),
      conversions: Math.round(parseAmount(convCol >= 0 ? (line[convCol] ?? "0") : "0")),
      campaignName: nameCol >= 0 ? line[nameCol]?.trim() : undefined,
    })
  }

  // Consolida filas del mismo día (exports por anuncio/adset).
  const byDate = new Map<string, ParsedMetricRow>()
  for (const r of rows) {
    const prev = byDate.get(r.date)
    if (!prev) {
      byDate.set(r.date, { ...r })
    } else {
      prev.spend += r.spend
      prev.impressions += r.impressions
      prev.clicks += r.clicks
      prev.conversions += r.conversions
    }
  }

  return {
    platform,
    rows: Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1)),
    skipped,
  }
}
