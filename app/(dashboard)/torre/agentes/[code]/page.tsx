import { readFile } from "node:fs/promises"
import { join } from "node:path"
import Link from "next/link"
import { notFound } from "next/navigation"

import { RoutineList } from "@/components/tower/routine-list"
import { RoutineStatus } from "@/components/tower/status"
import { RunDetails } from "@/components/tower/run-details"
import { productionRoster } from "@/lib/production/roster"
import { formatRunTime } from "@/lib/tower/presentation"
import { getTowerClient, requireRows } from "@/lib/tower/server"

export default async function AgentPage({ params }: { params: { code: string } }) {
  const client = await getTowerClient()
  const [agentResult, routineResult] = await Promise.all([
    client.from("tower_agents").select("*").eq("code", params.code).maybeSingle(),
    client.from("tower_routines").select("*").eq("agent_code", params.code).order("name"),
  ])
  if (agentResult.error) throw new Error(agentResult.error.message)
  if (!agentResult.data) notFound()
  const agent = agentResult.data
  const instructions = agent.code === "3B" ? await readFile(join(process.cwd(), "docs/landing/agente-3b.md"), "utf8") : null
  const officeTask = productionRoster.find(([code]) => code === agent.code)?.[2]
  const routines = requireRows(routineResult)
  const codes = routines.map((routine) => routine.code)
  const [latest, logs] = codes.length ? await Promise.all([
    client.from("tower_latest_runs").select("*").in("routine_code", codes).then(requireRows),
    client.from("tower_runs").select("*").in("routine_code", codes).order("started_at", { ascending: false }).limit(20).then(requireRows),
  ]) : [[], []]

  return (
    <>
      <header>
        <p className="font-mono text-sm text-muted-foreground">{agent.floor === "PH" ? "PH" : `Piso ${agent.floor}`} · Oficina {agent.code}</p>
        <h1 className="page-title text-3xl">{agent.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{agent.mission}</p>
      </header>
      {officeTask && <section className="space-y-2 rounded-xl border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Responsabilidad en producción</h2>
        <p className="text-sm text-muted-foreground">{officeTask}</p>
        <Link className="text-sm font-medium underline" href="/torre/produccion">Abrir producción de landings</Link>
      </section>}
      {instructions && <details className="rounded-xl border bg-card p-4">
        <summary className="cursor-pointer font-semibold">Instrucciones del agente de landings</summary>
        <pre className="mt-3 max-h-[32rem] overflow-y-auto whitespace-pre-wrap break-words text-sm text-muted-foreground">{instructions}</pre>
      </details>}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Rutinas</h2>
        <RoutineList routines={routines} latest={latest} />
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Bitácora</h2>
        {logs.length === 0 && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Esta oficina aún no tiene ejecuciones.</p>}
        {logs.map((run) => (
          <details className="rounded-lg border bg-card p-3" key={run.id}>
            <summary className="cursor-pointer space-x-2 text-sm">
              <strong>{routines.find((routine) => routine.code === run.routine_code)?.name}</strong>
              <RoutineStatus status={run.status} />
              <span className="text-muted-foreground">{formatRunTime(run.started_at)}</span>
            </summary>
            <p className="my-2 text-xs text-muted-foreground">
              {run.scheduled_for ? `Programada · ${formatRunTime(run.scheduled_for)}` : "Manual"}
              {run.finished_at && ` · ${Math.max(0, Date.parse(run.finished_at) - Date.parse(run.started_at))} ms`}
            </p>
            <RunDetails output={run.output} />
          </details>
        ))}
      </section>
    </>
  )
}
