import { TowerFrame } from "@/components/tower/tower-frame"
import { getTowerClient } from "@/lib/tower/server"

export default async function TowerLayout({ children }: { children: React.ReactNode }) {
  await getTowerClient()
  return <TowerFrame>{children}</TowerFrame>
}
