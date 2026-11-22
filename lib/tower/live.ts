import type { createClient } from "@/lib/supabase/server"
import type { Agent, Alert, Approval, Routine, Run } from "./model"
import { runMessage } from "./presentation"
import { requireRows } from "./server"

type Activity = Pick<Run, "id" | "routine_code" | "started_at" | "finished_at" | "status" | "scheduled_for"> & {
  agentCode: string
  routineName: string
  message?: string
}

export type TowerSnapshot = {
  agents: Agent[]
  routines: Routine[]
  latestRuns: Run[]
  activity: Activity[]
  approvals: Pick<Approval, "id" | "title" | "created_at" | "kind">[]
  alerts: Pick<Alert, "code" | "message" | "severity" | "updated_at" | "routine_code">[]
  counts: { agents: number; scheduled: number; approvals: number; alerts: number }
}

export async function getTowerSnapshot(client: ReturnType<typeof createClient>): Promise<TowerSnapshot> {
  const [agentsResponse, routinesResponse, runsResponse, activityResponse, approvalsResponse, alertsResponse] =
    await Promise.all([
      client.from("tower_agents").select("*").order("code"),
      client.from("tower_routines").select("*").order("code"),
      client.from("tower_latest_runs").select("*").order("routine_code"),
      client.from("tower_runs").select("*").order("started_at", { ascending: false }).order("id", { ascending: false }).limit(12),
      client.from("tower_approvals").select("id, title, created_at, kind", { count: "exact" })
        .eq("status", "pending").order("created_at", { ascending: false }).order("id").limit(5),
      client.from("tower_alerts").select("code, message, severity, updated_at, routine_code", { count: "exact" })
        .is("resolved_at", null).order("updated_at", { ascending: false }).order("code").limit(5),
    ])

  const agents = requireRows(agentsResponse)
  const routines = requireRows(routinesResponse)
  const routineByCode = new Map(routines.map((routine) => [routine.code, routine]))
  const activity = requireRows(activityResponse).flatMap(({ output, ...entry }) => {
    const routine = routineByCode.get(entry.routine_code)
    if (!routine) return []
    return [{
      ...entry,
      agentCode: routine.agent_code,
      routineName: routine.name,
      message: runMessage(output),
    }]
  })

  return {
    agents,
    routines,
    latestRuns: requireRows(runsResponse),
    activity,
    approvals: requireRows(approvalsResponse),
    alerts: requireRows(alertsResponse),
    counts: {
      agents: agents.length,
      scheduled: routines.filter(({ cadence, enabled }) => cadence === "scheduled" && enabled).length,
      approvals: approvalsResponse.count ?? 0,
      alerts: alertsResponse.count ?? 0,
    },
  }
}
