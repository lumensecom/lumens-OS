import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { hasTowerSchema } from "@/lib/tower/server"

export default async function HomePage() {
  const client = createClient()
  const owner = await client.rpc("is_owner")
  redirect(owner.data && await hasTowerSchema(client) ? "/torre" : "/resumen")
}
