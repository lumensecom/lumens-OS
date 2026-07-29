import { z } from "zod"

import { normalizePhone } from "@/lib/dropi"
import { toTitleCase, type PastedOrder } from "@/lib/dropi-messages"

/**
 * Contrato del payload que LUMENS OS envía al webhook del flujo de Dapta,
 * un pedido por request. El flujo dispara a Juliana (agente de voz) que
 * llama al cliente con estas variables.
 */
export const daptaCallPayloadSchema = z.object({
  customer_name: z.string(),
  product_name: z.string(),
  order_date: z.string(),
  address: z.string(),
  city: z.string(),
  department: z.string(),
  order_id: z.string(),
  phone: z.string().min(7, "Teléfono inválido"),
})

export type DaptaCallPayload = z.infer<typeof daptaCallPayloadSchema>

/** Convierte un pedido pegado de Dropi en el payload que espera Dapta. */
export function orderToDaptaPayload(order: PastedOrder): DaptaCallPayload {
  return {
    customer_name: order.customerName,
    product_name: order.product,
    order_date: order.date,
    address: order.address,
    city: order.city ? toTitleCase(order.city) : "",
    department: order.department ? toTitleCase(order.department) : "",
    order_id: order.orderId,
    phone: normalizePhone(order.phone),
  }
}

/** true si el pedido tiene lo mínimo para poder llamar. */
export function isCallable(order: PastedOrder): boolean {
  return normalizePhone(order.phone).length >= 10
}
