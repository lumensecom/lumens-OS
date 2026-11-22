import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const owner = await createClient().rpc("is_owner")
  redirect(owner.data ? "/torre" : "/resumen")
}
