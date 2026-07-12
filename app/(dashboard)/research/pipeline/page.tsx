import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from "@/components/research/kanban-board"

export default async function PipelinePage() {
  const supabase = createClient()
  const { data: items } = await supabase
    .from("research_products")
    .select("*")
    .order("total_score", { ascending: false })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/research" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Pipeline de research
          </h2>
          <p className="text-sm text-muted-foreground">
            Arrastra los candidatos entre columnas para cambiar su estado
          </p>
        </div>
      </div>
      <KanbanBoard items={items ?? []} />
    </div>
  )
}
