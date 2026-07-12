import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { fetchSettings } from "@/lib/settings-queries"
import { Button } from "@/components/ui/button"
import { ProductForm } from "@/components/productos/product-form"

export default async function NuevoProductoPage() {
  const settings = await fetchSettings()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/productos" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="page-title">Crear producto</h2>
          <p className="text-sm text-muted-foreground">
            El costeo completo (COGS, margen, utilidad y venta mínima) se calcula en vivo
          </p>
        </div>
      </div>
      <ProductForm
        defaultValues={{
          shipping_cost: Number(settings.default_shipping_cost),
          admin_cost: Number(settings.default_admin_cost),
          price_rule_pct: Number(settings.default_price_rule_pct),
        }}
      />
    </div>
  )
}
