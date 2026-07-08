import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProductForm } from "@/components/productos/product-form"

export default function NuevoProductoPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/productos" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Crear producto
          </h2>
          <p className="text-sm text-muted-foreground">
            El margen y el CPA máximo rentable se calculan en vivo
          </p>
        </div>
      </div>
      <ProductForm />
    </div>
  )
}
