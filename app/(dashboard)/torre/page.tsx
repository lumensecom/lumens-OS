import { TowerConsole } from "@/components/tower/tower-console"
import { getTowerSnapshot } from "@/lib/tower/live"
import { getTowerClient } from "@/lib/tower/server"

export const metadata = { title: "Torre de agentes" }

export default async function TowerPage() {
  const initial = await getTowerSnapshot(await getTowerClient())
  return <TowerConsole initial={initial} localPreview={process.env.LUMENS_LOCAL_PREVIEW === "1"} />
}
