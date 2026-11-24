import { z } from "zod"

import { toTitleCase, type PastedOrder } from "@/lib/dropi-messages"

const field = (max: number) => z.string().trim().min(1).max(max).regex(/^[^\x00-\x1f\x7f]+$/u)
export const callBatchSize = 20

export function voiceOrderId(value: string) {
  return value.trim().replace(/^#/, "").toUpperCase()
}

export function voicePhone(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length === 10 ? `57${digits}` : digits
}

export const daptaCallPayloadSchema = z.object({
  customer_name: field(180),
  product_name: field(600),
  order_date: field(80),
  address: field(300),
  city: field(100),
  department: z.string().trim().max(100).default(""),
  order_id: field(80).transform(voiceOrderId).pipe(z.string().regex(/^[A-Z0-9][A-Z0-9._-]*$/)),
  phone: z.string().transform(voicePhone).pipe(z.string().regex(/^573\d{9}$/, "Usa un celular colombiano válido.")),
  quantity: z.number().int().min(1).max(999).optional(),
  total_cop: z.number().int().min(1).max(100_000_000).optional(),
})

export type DaptaCallPayload = z.infer<typeof daptaCallPayloadSchema>

export function orderToDaptaPayload(order: PastedOrder): DaptaCallPayload {
  return {
    customer_name: order.customerName,
    product_name: order.product,
    order_date: order.date,
    address: order.address,
    city: toTitleCase(order.city),
    department: toTitleCase(order.department),
    order_id: voiceOrderId(order.orderId),
    phone: voicePhone(order.phone),
    quantity: order.quantity,
    total_cop: order.totalCop,
  }
}

export function isCallable(order: PastedOrder) {
  return daptaCallPayloadSchema.safeParse(orderToDaptaPayload(order)).success
}

export function voiceConfig() {
  const url = URL.parse(process.env.DAPTA_FLOW_WEBHOOK_URL ?? "")
  const local = process.env.LUMENS_LOCAL_PREVIEW === "1"
  const resultSecret = process.env.DAPTA_RESULT_SECRET
  if (!url || (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username || url.password || !resultSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  return { url, resultSecret, webhookSecret: process.env.DAPTA_WEBHOOK_SECRET }
}
