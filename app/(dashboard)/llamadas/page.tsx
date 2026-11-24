import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { voiceConfig } from "@/lib/dapta"
import { LlamadasModule } from "@/components/llamadas/llamadas-module"

export const metadata = { title: "Llamadas IA · LUMENS OS" }

export default async function LlamadasPage() {
  const supabase = createClient()
  const owner = await supabase.rpc("is_owner")
  if (owner.error) throw new Error("No se pudo verificar el acceso a Llamadas.")
  if (!owner.data) notFound()

  const results = await supabase.from("call_results")
    .select("id, order_id, outcome, success, summary, duration_seconds, called_at, customer_name, phone, requested")
    .order("called_at", { ascending: false, nullsFirst: false }).limit(100)

  return <LlamadasModule configured={Boolean(voiceConfig())} historyAvailable={!results.error} recentResults={results.data ?? []} />
}
