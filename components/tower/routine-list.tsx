import Link from "next/link"

import { executeRoutine, toggleRoutine } from "@/app/(dashboard)/torre/actions"
import { TowerForm, TowerSubmit } from "@/components/tower/action-form"
import { RoutineStatus } from "@/components/tower/status"
import type { Agent, Routine, Run } from "@/lib/tower/model"
import { formatRunTime, nextRunTime, routineSchedule, runMessage } from "@/lib/tower/presentation"

export function RoutineList({ routines, latest, agents }: { routines: Routine[]; latest: Run[]; agents?: Agent[] }) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {routines.map((routine) => {
        const run = latest.find((entry) => entry.routine_code === routine.code)
        const next = nextRunTime(routine)
        const agent = agents?.find((entry) => entry.code === routine.agent_code)
        const message = run && runMessage(run.output)
        return (
          <li key={routine.code} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0 space-y-1">
              {agent && <Link href={`/torre/agentes/${agent.code}`} className="block text-xs text-muted-foreground hover:underline">{agent.code} · {agent.name}</Link>}
              <h3 className="font-semibold">{routine.name}</h3>
              <p className="text-sm text-muted-foreground">{routine.enabled ? routineSchedule(routine) : `Desactivada · ${routineSchedule(routine)}`}</p>
              {next && <p className="text-xs text-muted-foreground">Próxima · {formatRunTime(next)}</p>}
              {run && (
                <div className="text-xs text-muted-foreground">
                  <RoutineStatus status={run.status} /> · {formatRunTime(run.started_at)}
                  {message && <p className="mt-1">{message}</p>}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {routine.enabled && routine.cadence !== "event" && (
                <TowerForm action={executeRoutine}>
                  <input type="hidden" name="code" value={routine.code} />
                  <TowerSubmit>Ejecutar ahora</TowerSubmit>
                </TowerForm>
              )}
              <TowerForm action={toggleRoutine}>
                <input type="hidden" name="code" value={routine.code} />
                <input type="hidden" name="active" value={String(!routine.enabled)} />
                <TowerSubmit secondary>{routine.enabled ? "Desactivar" : "Activar"}</TowerSubmit>
              </TowerForm>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
