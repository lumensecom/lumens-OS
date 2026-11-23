import { cache } from "react"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function hasTowerSchema(client: ReturnType<typeof createClient>) {
  const { data, error } = await client.from("tower_routines").select("code").eq("code", "shift-report-0").limit(1)
  return !error && Boolean(data?.length)
}

export const getTowerClient = cache(async () => {
  const client = createClient()
  const owner = await client.rpc("is_owner")
  if (owner.error) throw new Error("No se pudo verificar el acceso a la torre.")
  if (!owner.data) notFound()
  if (!await hasTowerSchema(client)) redirect("/torre-preparacion")
  return client
})

export function requireRows<T>(response: { data: T | null; error: { message: string } | null }): T {
  if (response.error || response.data === null) {
    throw new Error(response.error?.message ?? "La consulta no devolvió datos.")
  }
  return response.data
}
