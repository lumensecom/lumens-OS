import { createClient } from "@/lib/supabase/server"
import { ContabilidadNav } from "@/components/contabilidad/contabilidad-nav"
import { AddRevenueDialog } from "@/components/contabilidad/add-revenue-dialog"
import { AddExpenseDialog } from "@/components/contabilidad/add-expense-dialog"

export default async function ContabilidadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .order("name")

  const options = products ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Contabilidad
          </h2>
          <p className="text-sm text-muted-foreground">
            Ingresos, gastos y flujo de caja
          </p>
        </div>
        <div className="flex gap-2">
          <AddRevenueDialog products={options} />
          <AddExpenseDialog products={options} />
        </div>
      </div>
      <ContabilidadNav />
      {children}
    </div>
  )
}
