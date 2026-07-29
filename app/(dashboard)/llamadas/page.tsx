import { createClient } from "@/lib/supabase/server"
import { LlamadasModule } from "@/components/llamadas/llamadas-module"

export const metadata = { title: "Llamadas IA · LUMENS OS" }

export default async function LlamadasPage() {
  const supabase = createClient()
  const { data: results } = await supabase
    .from("call_results")
    .select("order_id, outcome, success, summary, called_at, customer_name, phone")
    .order("called_at", { ascending: false })
    .limit(100)

  return (
    <LlamadasModule
      configured={Boolean(process.env.DAPTA_FLOW_WEBHOOK_URL)}
      recentResults={results ?? []}
    />
  )
}
