import Link from "next/link"

import { decideReview } from "@/app/(dashboard)/torre/actions"
import { TowerForm, TowerSubmit } from "@/components/tower/action-form"
import { RunDetails } from "@/components/tower/run-details"
import { formatRunTime } from "@/lib/tower/presentation"
import { getTowerClient, requireRows } from "@/lib/tower/server"

export const metadata = { title: "Lobby de la torre" }

const decisions = { pending: "Por aprobar", approved: "Aprobada", rejected: "Rechazada" }

export default async function LobbyPage() {
  const client = await getTowerClient()
  const [reviewsResponse, alertsResponse] = await Promise.all([
    client.from("tower_approvals").select("*").order("created_at", { ascending: false }),
    client.from("tower_alerts").select("*").is("resolved_at", null).order("updated_at", { ascending: false }),
  ])
  const reviews = requireRows(reviewsResponse)
  const alerts = requireRows(alertsResponse)

  return (
    <>
      <header>
        <h1 className="page-title text-3xl">Lobby</h1>
        <p className="mt-1 text-sm text-muted-foreground">Revisa las alertas de operación y decide qué oportunidades avanzan.</p>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="min-w-0 space-y-3">
          <h2 className="font-display text-lg font-bold">Aprobaciones</h2>
          {reviews.length === 0 && <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No hay solicitudes. Las propuestas de Product Lab llegarán aquí.</p>}
          {reviews.map((review) => (
            <article id={review.id} className="space-y-3 rounded-xl border bg-card p-4" key={review.id}>
              <div className="flex flex-wrap justify-between gap-2">
                <Link className="font-bold hover:underline" href={`/torre/product-lab/${review.opportunity_id}`}>{review.title}</Link>
                <span className="text-sm text-muted-foreground">{decisions[review.status]}</span>
              </div>
              <p className="text-xs text-muted-foreground">{formatRunTime(review.created_at)}</p>
              <RunDetails output={review.payload} />
              {review.kind === "landing" && review.status === "pending" && (
                <p className="text-sm text-muted-foreground">Anota en el comentario la prueba de precios, packs, variantes y checkout de Releasit antes de aprobar.</p>
              )}
              {review.status === "pending" ? (
                <TowerForm action={decideReview}>
                  <input type="hidden" name="review_id" value={review.id} />
                  <label className="block text-sm" htmlFor={`comment-${review.id}`}>Comentario</label>
                  <textarea className="w-full rounded-md border bg-background p-2 text-sm" id={`comment-${review.id}`} name="rationale" maxLength={500} rows={2} />
                  <div className="flex flex-wrap gap-2">
                    <TowerSubmit name="decision" value="approved">Aprobar</TowerSubmit>
                    <TowerSubmit name="decision" value="rejected" secondary>Rechazar</TowerSubmit>
                  </div>
                </TowerForm>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {review.decided_at && formatRunTime(review.decided_at)}{review.comment && ` · ${review.comment}`}
                </p>
              )}
            </article>
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">Alertas abiertas</h2>
          {alerts.length === 0 && <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No hay alertas abiertas.</p>}
          {alerts.map((alert) => (
            <article className="space-y-1 rounded-lg border bg-card p-3" key={alert.code}>
              <p className="text-sm font-medium">{alert.message}</p>
              <p className="text-xs text-muted-foreground">{formatRunTime(alert.updated_at)}</p>
            </article>
          ))}
        </section>
      </div>
    </>
  )
}
