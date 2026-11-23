import Link from "next/link"

import { RunDetails } from "@/components/tower/run-details"
import { RoutineStatus } from "@/components/tower/status"
import { TowerRefresh } from "@/components/tower/tower-refresh"
import { formatRunTime } from "@/lib/tower/presentation"
import { getTowerClient, requireRows } from "@/lib/tower/server"

export const metadata = { title: "Reportes de las 7:00 a. m." }

const bogotaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
})

export default async function MorningReports() {
  const client = await getTowerClient()
  const now = new Date()
  const slot = `${bogotaDate.format(now)}T07:00:00-05:00`
  const [agentResult, runResult] = await Promise.all([
    client.from("tower_agents").select("code,name").order("code"),
    client.from("tower_runs").select("*").like("routine_code", "shift-report-%").eq("scheduled_for", slot),
  ])
  const agents = requireRows(agentResult)
  const reports = requireRows(runResult)
  const byCode = new Map(reports.map((report) => [report.routine_code, report]))

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <TowerRefresh />
      <header className="rounded-2xl border border-violet-400/20 bg-[#1c122c] p-6 text-white">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Reportes de las 7:00 a. m.</h1>
        <p className="mt-2 text-sm text-violet-100/85">{reports.length} de {agents.length} oficinas reportaron · Hora de Bogotá</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {agents.map((agent) => {
          const report = byCode.get(`shift-report-${agent.code.toLowerCase()}`)
          return (
            <article className="min-w-0 space-y-3 rounded-xl border bg-card p-4" key={agent.code}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link className="font-semibold hover:underline" href={`/torre/agentes/${agent.code}`}>{agent.code} · {agent.name}</Link>
                <RoutineStatus status={report?.status ?? "idle"} />
              </div>
              {report ? <RunDetails output={report.output} /> :
                <p className="text-sm text-muted-foreground">{new Date(slot) > now ? `Programado para ${formatRunTime(slot)}` : "Todavía no hay un reporte de hoy."}</p>}
            </article>
          )
        })}
      </div>
    </div>
  )
}
