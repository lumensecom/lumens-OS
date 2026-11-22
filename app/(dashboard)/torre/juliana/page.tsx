import { ArrowUpRight, MessageCircle } from "lucide-react"
import Link from "next/link"

import { JulianaRefresh } from "@/components/tower/juliana-refresh"
import { TowerForm, TowerSubmit } from "@/components/tower/action-form"
import { formatCOP } from "@/lib/format"
import { julianaMessages, julianaOrder } from "@/lib/tower/juliana"
import { julianaConfig } from "@/lib/tower/juliana-config"
import type { JulianaStatus } from "@/lib/tower/model"
import { formatRunTime } from "@/lib/tower/presentation"
import { getTowerClient, requireRows } from "@/lib/tower/server"
import { sendJulianaConfirmation } from "./actions"

export const metadata = { title: "Juliana · WhatsApp" }

const labels: Record<JulianaStatus, string> = {
  review: "Por autorizar", sending: "Envío en curso", submitted: "En manos de Dapta",
  unknown: "Verificar en Dapta", confirmed: "Confirmado", human: "Atención humana",
}

export default async function JulianaPage() {
  const client = await getTowerClient()
  const ready = Boolean(julianaConfig())
  const orders = requireRows(await client.from("tower_juliana_orders").select("order_id, contact, status, updated_at")
    .order("updated_at", { ascending: false }).limit(40))

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <JulianaRefresh />
      <header className="rounded-2xl border border-violet-400/20 bg-[#1c122c] p-5 text-white sm:p-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <MessageCircle className="h-6 w-6 text-[#f2dda0]" aria-hidden="true" />
          <span className="rounded-full border border-violet-300/30 px-3 py-1 text-xs font-medium text-violet-100">
            {ready ? "Flujo configurado" : "Pendiente de conectar Dapta"}
          </span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Juliana · WhatsApp</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-violet-100/85">
          Revisa los pedidos de Shopify, autoriza el mensaje y consulta el resultado devuelto por Dapta.
        </p>
      </header>

      {!orders.length && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Aún no hay pedidos para revisar</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Los pedidos en COP con un celular colombiano y datos de entrega aparecerán aquí cuando Shopify entregue el webhook.</p>
        </section>
      )}
      {orders.map((record) => {
        const parsed = julianaOrder.safeParse(record.contact)
        if (!parsed.success) return null
        const order = parsed.data
        const messages = julianaMessages(order)
        const staleDispatch = record.status === "sending" && Date.now() - Date.parse(record.updated_at) > 30_000
        const state = staleDispatch ? "unknown" : record.status
        return (
          <article className="min-w-0 space-y-4 rounded-2xl border bg-card p-5" key={record.order_id}>
            <header className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Pedido #{order.number}</h2>
                <p className="text-sm text-muted-foreground">{order.name} · {order.city} · ••• {order.phone.slice(-4)}</p>
              </div>
              <div className="space-y-1 sm:text-right">
                <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold">{labels[state]}</span>
                <p className="text-xs text-muted-foreground">{formatRunTime(record.updated_at)}</p>
              </div>
            </header>
            <div className="flex flex-wrap gap-3 text-sm">
              <strong>{formatCOP(order.total)} COP</strong>
              <span className="text-muted-foreground">{order.priority && "Prioritario · "}{messages.policy.delivery}</span>
            </div>
            <details className="rounded-xl border bg-muted/30 p-3 text-sm">
              <summary className="cursor-pointer font-semibold">Vista previa de los mensajes</summary>
              <h3 className="mt-3 text-xs font-semibold text-muted-foreground">Al solicitar confirmación</h3>
              <p className="mt-1 whitespace-pre-line break-words">{messages.opening}</p>
              <h3 className="mt-3 border-t pt-3 text-xs font-semibold text-muted-foreground">Cuando el cliente confirma</h3>
              <p className="mt-1 whitespace-pre-line break-words">{messages.confirmed}</p>
            </details>
            {ready && record.status === "review" && (
              <TowerForm action={sendJulianaConfirmation}>
                <input type="hidden" name="id" value={record.order_id} />
                <TowerSubmit>Autorizar WhatsApp</TowerSubmit>
              </TowerForm>
            )}
          </article>
        )
      })}

      <Link href="/llamadas" className="inline-flex items-center gap-2 text-sm font-medium underline">
        Ir al módulo de llamadas <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </div>
  )
}
