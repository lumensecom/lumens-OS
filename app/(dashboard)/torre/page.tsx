import Link from "next/link"
import { Activity, ArrowRight, Bell, Building2, CalendarClock, DoorOpen, Inbox } from "lucide-react"

import { RoutineStatus } from "@/components/tower/status"
import { RunDetails } from "@/components/tower/run-details"
import { floors } from "@/lib/tower/model"
import { formatRunTime } from "@/lib/tower/presentation"
import { getTowerClient, requireRows } from "@/lib/tower/server"

const floorAccents = [
  "border-l-amber-400", "border-l-emerald-500", "border-l-sky-500", "border-l-indigo-500",
  "border-l-fuchsia-500", "border-l-orange-500", "border-l-teal-500", "border-l-lime-500",
]

export const metadata = { title: "Torre de agentes" }

export default async function TowerPage() {
  const client = await getTowerClient()
  const [agents, routines, runs, approvals, alerts] = await Promise.all([
    client.from("tower_agents").select("*").order("code"),
    client.from("tower_routines").select("*"),
    client.from("tower_latest_runs").select("*"),
    client.from("tower_approvals").select("id, title, created_at").eq("status", "pending").order("created_at", { ascending: false }),
    client.from("tower_alerts").select("code, message").is("resolved_at", null).order("updated_at", { ascending: false }),
  ])
  const offices = requireRows(agents)
  const jobs = requireRows(routines)
  const latest = requireRows(runs)
  const pending = requireRows(approvals)
  const openAlerts = requireRows(alerts)
  const brief = latest.find((run) => run.routine_code === "brief" && run.status === "success")
  const latestByAgent = jobs.reduce((result, routine) => {
    const run = latest.find((entry) => entry.routine_code === routine.code)
    const previous = result.get(routine.agent_code)
    if (run && (!previous || Date.parse(run.started_at) > Date.parse(previous.started_at))) {
      result.set(routine.agent_code, run)
    }
    return result
  }, new Map<string, (typeof latest)[number]>())

  const stats = [
    { label: "Oficinas", count: offices.length, Icon: DoorOpen },
    { label: "Rutinas programadas activas", count: jobs.filter((job) => job.enabled && job.cadence === "scheduled").length, Icon: CalendarClock },
    { label: "Decisiones pendientes", count: pending.length, Icon: Inbox },
    { label: "Alertas abiertas", count: openAlerts.length, Icon: Bell },
  ]

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-3xl">Torre de agentes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Rutinas, resultados y decisiones de LUMENS en hora de Colombia.</p>
        </div>
        <Link className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground" href="/torre/lobby">
          Ir al Lobby <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ Icon, count, label }) => (
          <div className="rounded-xl border bg-card p-3 sm:p-4" key={label}>
            <Icon aria-hidden="true" className="mb-2 h-5 w-5 text-muted-foreground" />
            <strong className="block font-display text-2xl">{count}</strong>
            <span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm" aria-label="Edificio LUMENS">
          <div className="flex items-center gap-3 bg-zinc-900 px-4 py-4 text-white">
            <Building2 aria-hidden="true" className="h-6 w-6 text-primary" />
            <h2 className="font-display text-lg font-bold">Edificio LUMENS</h2>
          </div>
          {floors.map(([floor, label, description], index) => (
            <section className={`grid grid-cols-[2.5rem_minmax(0,1fr)] border-b border-l-4 sm:grid-cols-[3.5rem_minmax(0,1fr)] ${floorAccents[index]}`} key={floor}>
              <div className="flex justify-center border-r bg-muted/40 pt-4 font-mono text-sm font-bold">{floor}</div>
              <div className="min-w-0 p-3 sm:p-4">
                <h3 className="text-sm font-bold">{label}</h3>
                <p className="mb-3 text-xs text-muted-foreground">{description}</p>
                <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                  {offices.filter((office) => office.floor === floor).map((office) => (
                    <Link className="group flex min-w-0 flex-col gap-2 rounded-lg border bg-background/60 p-3 hover:border-primary hover:bg-primary/5" href={`/torre/agentes/${office.code}`} key={office.code}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{office.code}</span>
                        <ArrowRight aria-hidden="true" className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                      </div>
                      <span className="text-sm font-semibold leading-tight">{office.name}</span>
                      <RoutineStatus status={latestByAgent.get(office.code)?.status ?? "idle"} />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ))}
          <Link className="flex items-center gap-3 px-4 py-4 hover:bg-muted/40" href="/torre/lobby">
            <Inbox aria-hidden="true" size={19} /> <span className="flex-1 font-bold">Lobby</span>
            <span className="text-sm text-muted-foreground">{pending.length} por revisar</span>
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </section>

        <aside className="min-w-0 space-y-4">
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Activity aria-hidden="true" size={19} /> Brief de la mañana</h2>
            {brief ? (
              <>
                <p className="text-xs text-muted-foreground">{formatRunTime(brief.started_at)}</p>
                <RunDetails output={brief.output} />
              </>
            ) : <p className="text-sm text-muted-foreground">El primer brief aparecerá al ejecutarse la rutina de las 7:30 a. m.</p>}
          </section>
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="font-display text-lg font-bold">Alertas y decisiones</h2>
            {openAlerts.slice(0, 3).map((alert) => <p className="text-sm text-destructive" key={alert.code}>{alert.message}</p>)}
            {pending.slice(0, 3).map((review) => (
              <Link className="block border-t pt-2 text-sm font-medium hover:underline" key={review.id} href={`/torre/lobby#${review.id}`}>{review.title}</Link>
            ))}
            {pending.length === 0 && openAlerts.length === 0 && <p className="text-sm text-muted-foreground">Al día con el Lobby.</p>}
          </section>
        </aside>
      </div>
    </>
  )
}
