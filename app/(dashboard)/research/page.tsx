import Link from "next/link"
import { Plus, Columns3, Search } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { firstParam, type SearchParams } from "@/lib/contabilidad-queries"
import { RESEARCH_STATUSES } from "@/lib/research"
import { Button } from "@/components/ui/button"
import { ResearchCard } from "@/components/research/research-card"
import { ResearchStatusFilter } from "@/components/research/research-status-filter"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const statusParam = firstParam(searchParams.estado)
  const status = RESEARCH_STATUSES.find((s) => s === statusParam)
  const supabase = createClient()

  let query = supabase
    .from("research_products")
    .select("*")
    .order("total_score", { ascending: false })
  if (status) query = query.eq("status", status)

  const { data: items } = await query

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">
            Research de productos
          </h2>
          <p className="text-sm text-muted-foreground">
            Candidatos rankeados por los 5 criterios LUMENS
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/research/pipeline">
              <Columns3 className="mr-1 h-4 w-4" />
              Pipeline
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/research/nuevo">
              <Plus className="mr-1 h-4 w-4" />
              Nuevo candidato
            </Link>
          </Button>
        </div>
      </div>

      <ResearchStatusFilter />

      {(items ?? []).length === 0 ? (
        <ModulePlaceholder
          icon={Search}
          accent="purple"
          title="Sin candidatos"
          description="Agrega el primer producto candidato y puntúalo con los 5 criterios LUMENS."
        />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(items ?? []).map((item) => (
            <ResearchCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
