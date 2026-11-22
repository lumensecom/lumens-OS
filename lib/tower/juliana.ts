import { z } from "zod"

const skuPattern = /^(?:envio|entrega) prioritari[oa](?:$|[\s(—-])/
const isPriority = (value: string) => skuPattern.test(value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim())
const short = z.string().trim().min(1).max(200)
const phone = z.string().regex(/^\+573\d{9}$/)
const url = z.string().max(500)

const product = z.object({ title: short, quantity: z.number().int().positive(), url: url.nullish() })
export const julianaOrder = z.object({
  number: z.string().regex(/^\d{1,15}$/),
  name: short,
  phone,
  city: short,
  priority: z.boolean(),
  total: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  products: z.array(product).min(1).max(30),
})
export type JulianaOrder = z.infer<typeof julianaOrder>

const delivery = z.object({ first_name: z.string().nullish(), phone: z.string().nullish(), city: z.string().nullish(), province: z.string().nullish() })
export const shopifyContact = z.object({
  order_number: z.number().int().positive(),
  phone: z.string().nullish(),
  customer: z.object({ first_name: z.string().nullish(), phone: z.string().nullish() }).nullish(),
  shipping_address: delivery.nullish(),
  billing_address: delivery.nullish(),
  shipping_lines: z.array(z.object({ title: z.string().nullish() })).nullish(),
  line_items: z.array(z.object({
    name: z.string().nullish(), title: z.string().nullish(),
    product_id: z.number().int().positive().nullish(), quantity: z.number().int().nonnegative(),
  })).nullish(),
})

export function catalogProductUrl(value: string | null) {
  try {
    const parsed = new URL(value ?? "")
    return parsed.protocol === "https:" && parsed.hostname === "lumenscol.com" && !parsed.port
      && !parsed.username && !parsed.password && /^\/products\/[a-z0-9-]+$/.test(parsed.pathname)
      ? parsed.origin + parsed.pathname : undefined
  } catch { return undefined }
}

export function getJulianaOrder(input: z.infer<typeof shopifyContact>, total: number | null, links: Map<number, string>) {
  const address = input.shipping_address ?? input.billing_address
  const rawPhone = [address?.phone, input.phone, input.customer?.phone].find((value) => value?.trim()) ?? ""
  const digits = rawPhone.replace(/\D/g, "")
  const normalizePhone = digits.length === 10 ? "+57" + digits : "+" + digits
  const items = input.line_items ?? []
  const result = julianaOrder.safeParse({
    number: String(input.order_number),
    name: input.customer?.first_name || address?.first_name,
    phone: normalizePhone,
    city: (address?.city?.trim() || address?.province?.trim())?.toLocaleUpperCase("es-CO"),
    priority: items.some((item) => isPriority(item.title || item.name || ""))
      || Boolean(input.shipping_lines?.some((line) => isPriority(line.title ?? ""))),
    total,
    products: items.filter((item) => item.quantity > 0 && !isPriority(item.title || item.name || ""))
      .map((item) => ({
        title: item.title || item.name, quantity: item.quantity,
        url: item.product_id ? links.get(item.product_id) : undefined,
      })),
  })
  return result.success ? result.data : null
}

export function julianaMessages(order: JulianaOrder) {
  const money = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(order.total)
  const products = order.products.map((item) => {
    const title = item.quantity > 1 ? `${item.quantity} x ${item.title}` : item.title
    return `*${title}*${item.url ? ` ${item.url}` : ""}`
  }).join("\n")
  return {
    opening: `📦 *CONFIRMA TU PEDIDO*\nHola *${order.name}* 👋 Somos LUMENS.\nTu pedido #${order.number} para *${order.city}* incluye:\n${products}\n¿Confirmas el envío?`,
    confirmed: `¡Listo, ${order.name}! 🎉 Tu pedido #${order.number} queda confirmado.\n📦 Te compartiremos el número de guía cuando esté disponible.\n💵 Ten listos los $${money} para pagar en efectivo al recibir.`,
    policy: {
      delivery: order.priority ? "2 a 3 días hábiles" : "2 a 5 días hábiles",
      cash_on_delivery: "Efectivo al recibir",
      other_payment: "Si prefiere Nequi o Daviplata, ofrecer pasarle el dato.",
      dress: "Vestido Pádel: talla única, solo se elige color.",
      escalation: "Derivar a una persona ante cancelación, enojo o preguntas sin respuesta.",
      restrictions: "No añadir descuentos, regalos, garantías, promesas de despacho ni plazos distintos. El texto de confirmación solo se envía tras una respuesta afirmativa inequívoca.",
    },
  }
}

export const julianaResult = z.object({
  order_id: z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/).max(80),
  attempt_id: z.uuid(),
  outcome: z.enum(["confirmed", "human"]),
})
