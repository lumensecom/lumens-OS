import { notFound } from "next/navigation"
import { z } from "zod"

import { ProductionForm } from "@/components/tower/production-form"
import { productionRoster } from "@/lib/production/roster"
import { getTowerClient } from "@/lib/tower/server"

export const metadata = { title: "Producción de landings" }

const assessmentSchema = z.object({
  pack_qty: z.number().int().min(1).max(3),
  pack_price_cop: z.number().int().positive(),
  unit_cost_cop: z.number().int().positive(),
  variable_cost_cop: z.number().int().min(0),
})

export default async function ProductionPage({ searchParams }: { searchParams: { oportunidad?: string } }) {
  const client = await getTowerClient()
  let source
  if (searchParams.oportunidad) {
    const id = z.uuid().safeParse(searchParams.oportunidad)
    if (!id.success) notFound()
    const opportunity = await client.from("tower_opportunities").select("id,title,problem,assessment")
      .eq("stage", "aprobada").eq("id", id.data).maybeSingle()
    if (opportunity.error) throw new Error("No se pudo cargar la oportunidad.")
    if (!opportunity.data) notFound()
    source = { ...opportunity.data, assessment: assessmentSchema.safeParse(opportunity.data.assessment).data }
  }
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-2xl border border-violet-400/20 bg-[#1c122c] p-6 text-white">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Producción de landings</h1>
        <p className="mt-2 text-sm text-violet-100/85">Del problema y el producto a un ZIP con Liquid, vista previa, galería y control de cada oficina.</p>
      </header>
      <ProductionForm source={source} />
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Tareas de las 18 oficinas</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {productionRoster.map(([code, name, task]) =>
            <article key={code} className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold">{code} · {name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{task}</p>
            </article>
          )}
        </div>
      </section>
    </div>
  )
}
