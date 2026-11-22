import Link from "next/link"
import { submitLanding } from "@/app/(dashboard)/torre/actions"
import { TowerForm, TowerSubmit } from "@/components/tower/action-form"
import { TowerField, towerInput } from "@/components/tower/field"
import { formatRunTime } from "@/lib/tower/presentation"
import { getTowerClient, requireRows } from "@/lib/tower/server"

export async function LandingStudio({ opportunityId }: { opportunityId: string }) {
  const client = await getTowerClient()
  const [drafts, decisions] = await Promise.all([
    client.from("tower_landings").select("*").eq("opportunity_id", opportunityId).order("created_at", { ascending: false }).limit(5),
    client.from("tower_approvals").select("id,status").eq("opportunity_id", opportunityId).eq("kind", "landing"),
  ])
  const versions = requireRows(drafts)
  const reviews = requireRows(decisions)
  const waiting = reviews.some((review) => review.status === "pending")

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-display text-lg font-bold">Landing Studio</h2>
      {waiting && <Link href="/torre/lobby" className="text-sm font-medium underline">Revisar la versión pendiente en el Lobby</Link>}
      {versions.map((version) => {
        const status = reviews.find((review) => review.id === version.approval_id)?.status
        const download = `/torre/product-lab/${opportunityId}/liquid/${version.id}`
        return (
          <details key={version.id} className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {formatRunTime(version.created_at)} · {status === "approved" ? "Aprobada" : status === "rejected" ? "Rechazada" : "En revisión"}
            </summary>
            <div className="mt-3 space-y-2">
              <TowerField label="Archivo 1 · Hero">
                <textarea className={`${towerInput} font-mono`} readOnly rows={4} value={version.hero} />
              </TowerField>
              <TowerField label="Archivo 2 · Cuerpo">
                <textarea className={`${towerInput} font-mono`} readOnly rows={4} value={version.body} />
              </TowerField>
              {status === "approved" && (
                <div className="flex flex-wrap gap-3 text-sm font-medium">
                  <a href={`${download}?bloque=hero`} className="underline">Descargar 1-producto</a>
                  <a href={`${download}?bloque=body`} className="underline">Descargar 2-landing</a>
                </div>
              )}
            </div>
          </details>
        )
      })}
      {!waiting && (
        <TowerForm action={submitLanding}>
          <input type="hidden" name="target_id" value={opportunityId} />
          <p className="text-sm text-muted-foreground">Pega la adaptación de las plantillas de LUMENS. Prueba los packs, precios y variantes en una vista privada de Shopify con Releasit.</p>
          <TowerField label="1-producto · Hero Liquid"><textarea className={`${towerInput} font-mono`} name="hero_liquid" maxLength={49999} rows={4} required /></TowerField>
          <TowerField label="2-landing · Cuerpo Liquid"><textarea className={`${towerInput} font-mono`} name="body_liquid" maxLength={49999} rows={4} required /></TowerField>
          <TowerSubmit>Enviar versión al Lobby</TowerSubmit>
        </TowerForm>
      )}
    </section>
  )
}
