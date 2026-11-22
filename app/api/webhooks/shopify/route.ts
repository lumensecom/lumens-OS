import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { catalogProductUrl, getJulianaOrder, shopifyContact } from "@/lib/tower/juliana"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const orderEvent = z.object({
  admin_graphql_api_id: z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/),
  created_at: z.iso.datetime({ offset: true }),
  currency: z.string().regex(/^[A-Z]{3}$/).nullish(),
  total_price: z.string().nullish(),
  line_items: z.array(z.object({ quantity: z.number().int().min(0).max(1_000_000) })).max(1000).nullish(),
})

export async function POST(request: NextRequest) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET
  const domain = process.env.SHOPIFY_STORE_DOMAIN
  if (!secret || !domain || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Webhook sin configurar" }, { status: 503 })
  }
  if (request.headers.get("x-shopify-shop-domain") !== domain.toLowerCase()
      || request.headers.get("x-shopify-topic") !== "orders/create") {
    return NextResponse.json({ error: "Evento no autorizado" }, { status: 401 })
  }

  const maxBytes = 1_048_576
  if (Number(request.headers.get("content-length")) > maxBytes) {
    return NextResponse.json({ error: "Evento demasiado grande" }, { status: 413 })
  }
  const body = Buffer.from(await request.arrayBuffer())
  if (body.length > maxBytes) {
    return NextResponse.json({ error: "Evento demasiado grande" }, { status: 413 })
  }
  const signature = Buffer.from(request.headers.get("x-shopify-hmac-sha256") ?? "", "base64")
  const digest = createHmac("sha256", secret).update(body).digest()
  if (signature.length !== digest.length || !timingSafeEqual(signature, digest)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(body.toString("utf8"))
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const event = orderEvent.safeParse(payload)
  if (!event.success) {
    return NextResponse.json({ error: "Evento de pedido no reconocido" }, { status: 422 })
  }

  const order = event.data
  const quantity = order.line_items?.reduce((total, item) => total + item.quantity, 0) || null
  const total = order.currency === "COP" && /^\d+(?:\.0+)?$/.test(order.total_price ?? "")
    ? Number(order.total_price) : null

  const admin = createAdminClient()
  const contact = shopifyContact.safeParse(payload)
  const payable = total !== null && Number.isSafeInteger(total) ? total : null
  const links = new Map<number, string>()
  if (contact.success && payable !== null) {
    const ids = Array.from(new Set(contact.data.line_items?.flatMap((item) => item.product_id ? [item.product_id] : []) ?? []))
    if (ids.length > 0 && ids.length <= 30) {
      const { data } = await admin.from("products").select("shopify_product_id,landing_url")
        .in("shopify_product_id", ids.flatMap((id) => [String(id), `gid://shopify/Product/${id}`]))
      for (const entry of data ?? []) {
        const url = catalogProductUrl(entry.landing_url)
        if (url) links.set(Number(entry.shopify_product_id?.split("/").at(-1)), url)
      }
    }
  }
  const confirmation = contact.success && payable !== null ? getJulianaOrder(contact.data, payable, links) : null
  const { error } = await admin.rpc("tower_receive_juliana_order", {
    order_id: order.admin_graphql_api_id,
    order_created_at: order.created_at,
    order_quantity: confirmation ? confirmation.products.reduce((total, item) => total + item.quantity, 0) : quantity,
    order_currency: order.currency ?? null,
    order_total_cop: payable,
    contact: confirmation,
  })
  if (error) {
    console.error("Shopify order intake failed", error.code)
    return NextResponse.json({ error: "No se pudo guardar el evento" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
