import { notFound } from "next/navigation"
import { z } from "zod"

import { addEvidence, requestReview } from "@/app/(dashboard)/torre/actions"
import { TowerForm, TowerSubmit } from "@/components/tower/action-form"
import { TowerField, towerInput } from "@/components/tower/field"
import { LandingStudio } from "@/components/tower/landing-studio"
import { RunDetails } from "@/components/tower/run-details"
import { stages, type Evidence } from "@/lib/tower/model"
import { formatRunTime } from "@/lib/tower/presentation"
import { getTowerClient, requireRows } from "@/lib/tower/server"

function EvidenceSelect({ items, field, label }: { items: Evidence[]; field: string; label: string }) {
  return (
    <TowerField label={label}>
      <select className={towerInput} name={field} defaultValue="" required>
        <option value="" disabled>Selecciona una fuente</option>
        {items.map((item) => <option value={item.id} key={item.id}>{item.observation.slice(0, 110)}</option>)}
      </select>
    </TowerField>
  )
}

export default async function OpportunityPage({ params }: { params: { id: string } }) {
  if (!z.uuid().safeParse(params.id).success) notFound()
  const client = await getTowerClient()
  const [result, evidenceResponse, historyResponse] = await Promise.all([
    client.from("tower_opportunities").select("*").eq("id", params.id).maybeSingle(),
    client.from("tower_evidence").select("*").eq("opportunity_id", params.id).order("captured_on", { ascending: false }),
    client.from("tower_stage_history").select("*").eq("opportunity_id", params.id).order("recorded_at", { ascending: false }),
  ])
  if (result.error) throw new Error(result.error.message)
  if (!result.data) notFound()
  const opportunity = result.data
  const evidence = requireRows(evidenceResponse)
  const history = requireRows(historyResponse)
  const observed = evidence.filter((item) => item.kind === "observado")
  const editable = opportunity.stage === "detectada" || opportunity.stage === "en_validacion"

  return (
    <>
      <header>
        <p className="text-sm text-muted-foreground">{stages[opportunity.stage]} · {opportunity.country}</p>
        <h1 className="page-title break-words text-3xl">{opportunity.title}</h1>
        <p className="mt-2 break-words text-sm">{opportunity.problem}</p>
      </header>
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Evidencias</h2>
        {evidence.length === 0 && <p className="text-sm text-muted-foreground">Agrega al menos una observación con fuente para iniciar la validación.</p>}
        {evidence.map((item) => (
          <article className="space-y-1 border-b pb-2 text-sm" key={item.id}>
            <p className="text-xs capitalize text-muted-foreground">{item.kind === "hipotesis" ? "Hipótesis" : item.kind} · {item.captured_on}</p>
            <p className="break-words">{item.observation}</p>
            <a className="font-medium underline" href={item.source_url} rel="noreferrer" target="_blank">Abrir fuente</a>
          </article>
        ))}
        {editable && (
          <TowerForm action={addEvidence}>
            <input type="hidden" name="target_id" value={opportunity.id} />
            <TowerField label="URL de la fuente"><input className={towerInput} type="url" name="link" maxLength={2048} required /></TowerField>
            <div className="grid gap-3 sm:grid-cols-2">
              <TowerField label="Fecha de captura"><input className={towerInput} type="date" name="observed_on" required /></TowerField>
              <TowerField label="Tipo de evidencia">
                <select className={towerInput} name="evidence_kind">
                  <option value="observado">Observación</option><option value="estimado">Estimación</option><option value="hipotesis">Hipótesis</option>
                </select>
              </TowerField>
            </div>
            <TowerField label="Qué sustenta esta fuente"><textarea className={towerInput} name="evidence_text" maxLength={1500} required /></TowerField>
            <TowerSubmit>Guardar evidencia</TowerSubmit>
          </TowerForm>
        )}
      </section>
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Proveedor, cumplimiento y margen</h2>
        {opportunity.assessment && <RunDetails output={opportunity.assessment} />}
        {editable && observed.length < 3 && <p className="text-sm text-muted-foreground">Agrega observaciones distintas para demanda, proveedor y cumplimiento antes de solicitar revisión.</p>}
        {editable && observed.length >= 3 && (
          <TowerForm action={requestReview}>
            <input type="hidden" name="target_id" value={opportunity.id} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TowerField label="Unidades del pack"><input className={towerInput} name="pack_qty" type="number" min={1} max={3} required /></TowerField>
              <TowerField label="Precio del pack (COP)"><input className={towerInput} name="pack_price" type="number" min={89900} required /></TowerField>
              <TowerField label="Costo por unidad (COP)"><input className={towerInput} name="unit_cost" type="number" min={1} required /></TowerField>
              <TowerField label="Fletes y otros costos por pack (COP)"><input className={towerInput} name="variable_cost" type="number" min={0} required /></TowerField>
              <TowerField label="Stock verificado"><input className={towerInput} name="stock" type="number" min={100} required /></TowerField>
            </div>
            <p className="text-sm text-muted-foreground">Selecciona la evidencia que respalda cada verificación. En cumplimiento, documenta requisitos aplicables, derechos de material y registro vigente cuando corresponda.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <EvidenceSelect items={observed} field="demand_evidence_id" label="Evidencia de demanda local" />
              <EvidenceSelect items={observed} field="supplier_evidence_id" label="Verificación del proveedor" />
              <EvidenceSelect items={observed} field="compliance_evidence_id" label="Verificación de cumplimiento" />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="compliance_verified" value="yes" className="mt-1" required />
              Revisé las fuentes y confirmé que el producto cumple los requisitos aplicables.
            </label>
            <TowerSubmit>Enviar al Lobby</TowerSubmit>
          </TowerForm>
        )}
      </section>
      {opportunity.stage === "aprobada" && <LandingStudio opportunityId={opportunity.id} />}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Historial</h2>
        {history.map((entry) => (
          <p key={entry.id} className="text-sm"><strong>{stages[entry.stage]}</strong> · {formatRunTime(entry.recorded_at)} {entry.comment && `· ${entry.comment}`}</p>
        ))}
      </section>
    </>
  )
}
