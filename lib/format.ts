/** Formatea un monto en pesos colombianos (COP), sin decimales. */
export function formatCOP(value: number | null | undefined): string {
  const amount = value ?? 0
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Formatea un número con separadores de miles. */
export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("es-CO").format(value ?? 0)
}

/** Formatea un porcentaje (recibe el valor ya en escala 0-100). */
export function formatPercent(value: number | null | undefined): string {
  return `${(value ?? 0).toFixed(1)}%`
}
