import { RoutineList } from "@/components/tower/routine-list"
import { getTowerClient, requireRows } from "@/lib/tower/server"

export const metadata = { title: "Rutinas de la torre" }

export default async function RoutinesPage() {
  const client = await getTowerClient()
  const [agents, routines, latest] = await Promise.all([
    client.from("tower_agents").select("*"),
    client.from("tower_routines").select("*").order("cadence", { ascending: false }).order("local_minutes").order("agent_code"),
    client.from("tower_latest_runs").select("*"),
  ])

  return (
    <>
      <header>
        <h1 className="page-title text-3xl">Rutinas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Horarios en America/Bogota. Las rutinas por evento requieren un conector activo.</p>
      </header>
      <RoutineList agents={requireRows(agents)} routines={requireRows(routines)} latest={requireRows(latest)} />
    </>
  )
}
