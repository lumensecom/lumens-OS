import Link from "next/link"
import { Plus, Package } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { firstParam, type SearchParams } from "@/lib/contabilidad-queries"
import { PRODUCT_STATUSES } from "@/lib/productos"
import type { ProductStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/productos/product-card"
import { ModulePlaceholder } from "@/components/module-placeholder"
import { StatusFilter } from "@/components/productos/status-filter"

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const statusParam = firstParam(searchParams.estado)
  const status = PRODUCT_STATUSES.find((s) => s === statusParam) as
    | ProductStatus
    | undefined
  const supabase = createClient()

  let query = supabase
    .from("products_with_margin")
    .select("*")
    .order("created_at", { ascending: false })
  query = status ? query.eq("status", status) : query.neq("status", "archived")

  const { data: products } = await query

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Productos
          </h2>
          <p className="text-sm text-muted-foreground">
            Catálogo con costeo y margen por producto
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/productos/nuevo">
            <Plus className="mr-1 h-4 w-4" />
            Crear producto
          </Link>
        </Button>
      </div>

      <StatusFilter />

      {(products ?? []).length === 0 ? (
        <ModulePlaceholder
          icon={Package}
          accent="purple"
          title="Sin productos"
          description="Crea tu primer producto con su costeo para activar la calculadora de margen."
        />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(products ?? []).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
