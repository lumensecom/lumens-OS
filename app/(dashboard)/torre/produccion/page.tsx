import { ProductionForm } from "@/components/tower/production-form"
import { productionRoster } from "@/lib/production/roster"
import { getTowerClient } from "@/lib/tower/server"

export const metadata = { title: "Producción de landings" }

export default async function ProductionPage() {
  await getTowerClient()
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-2xl border border-violet-400/20 bg-[#1c122c] p-6 text-white">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Producción de landings</h1>
        <p className="mt-2 text-sm text-violet-100/85">Del problema y el producto a un ZIP con Liquid, vista previa, galería y control de cada oficina.</p>
      </header>
      <ProductionForm />
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
