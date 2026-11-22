import Link from "next/link"
import { Building2, CalendarClock, FlaskConical, Inbox } from "lucide-react"

import { getTowerClient } from "@/lib/tower/server"

const navigation = [
  { href: "/torre", label: "Edificio", Icon: Building2 },
  { href: "/torre/lobby", label: "Lobby", Icon: Inbox },
  { href: "/torre/product-lab", label: "Product Lab", Icon: FlaskConical },
  { href: "/torre/rutinas", label: "Rutinas", Icon: CalendarClock },
]

export default async function TowerLayout({ children }: { children: React.ReactNode }) {
  await getTowerClient()
  return (
    <div className="mx-auto max-w-screen-xl space-y-6">
      <nav aria-label="Torre de agentes" className="flex flex-wrap gap-2">
        {navigation.map(({ href, label, Icon }) => (
          <Link className="chip inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-muted" href={href} key={href}>
            <Icon aria-hidden="true" className="h-4 w-4" /> {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
