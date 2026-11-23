import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { hasTowerSchema } from "@/lib/tower/server"

export const metadata = { title: "Estado de la torre" }

export default async function TowerSetupPage() {
  const client = createClient()
  const owner = await client.rpc("is_owner")
  if (!owner.data) notFound()
  if (await hasTowerSchema(client)) redirect("/torre")

  return (
    <section className="mx-auto max-w-lg space-y-4 rounded-2xl border bg-card p-6">
      <h1 className="font-display text-2xl font-bold">Torre pendiente de conexión</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Para abrir la torre, verifica la conexión con Supabase y que estén aplicadas las migraciones hasta la 0022.
      </p>
      <Link className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/resumen">
        Abrir resumen
      </Link>
    </section>
  )
}
