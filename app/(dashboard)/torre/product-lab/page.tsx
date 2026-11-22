import Link from "next/link"

import { createOpportunity } from "@/app/(dashboard)/torre/actions"
import { TowerForm, TowerSubmit } from "@/components/tower/action-form"
import { TowerField, towerInput } from "@/components/tower/field"
import { stages } from "@/lib/tower/model"
import { getTowerClient, requireRows } from "@/lib/tower/server"

export const metadata = { title: "Product Lab" }

export default async function ProductLabPage() {
  const client = await getTowerClient()
  const results = requireRows(await client.from("tower_opportunities").select("*").order("created_at", { ascending: false }))

  return (
    <>
      <header>
        <h1 className="page-title text-3xl">Product Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registra problemas, adjunta fuentes y lleva propuestas con margen documentado al Lobby.</p>
      </header>
      <details className="rounded-xl border bg-card p-4">
        <summary className="cursor-pointer font-semibold">Nueva oportunidad</summary>
        <div className="mt-4">
          <TowerForm action={createOpportunity}>
            <div className="grid gap-3 sm:grid-cols-2">
              <TowerField label="Nombre"><input className={towerInput} name="product_title" maxLength={120} required /></TowerField>
              <TowerField label="País de la señal"><input className={towerInput} name="market_country" maxLength={60} required /></TowerField>
            </div>
            <TowerField label="Problema observado"><textarea className={towerInput} name="problem_text" maxLength={1500} required /></TowerField>
            <TowerSubmit>Crear oportunidad</TowerSubmit>
          </TowerForm>
        </div>
      </details>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-5">
        {Object.entries(stages).map(([stage, label]) => {
          const opportunities = results.filter((result) => result.stage === stage)
          return (
            <section key={stage} className="min-w-0 space-y-3 rounded-xl border bg-muted/40 p-3">
              <h2 className="flex items-center justify-between gap-2 text-sm font-semibold">{label}<span className="font-mono text-muted-foreground">{opportunities.length}</span></h2>
              {opportunities.map((opportunity) => (
                <Link className="block space-y-1 rounded-lg border bg-card p-3 hover:border-primary" href={`/torre/product-lab/${opportunity.id}`} key={opportunity.id}>
                  <strong className="block break-words text-sm">{opportunity.title}</strong>
                  <p className="line-clamp-2 break-words text-xs text-muted-foreground">{opportunity.problem}</p>
                  <p className="text-xs text-muted-foreground">{opportunity.country}</p>
                </Link>
              ))}
            </section>
          )
        })}
      </div>
    </>
  )
}
