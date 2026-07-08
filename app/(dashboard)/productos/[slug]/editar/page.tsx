import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ProductForm } from "@/components/productos/product-form"

export default async function EditarProductoPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createClient()
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", params.slug)
    .single()
  if (!product) notFound()

  const gallery = Array.isArray(product.gallery)
    ? (product.gallery as string[])
    : []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/productos/${product.slug}`} aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Editar producto
          </h2>
          <p className="text-sm text-muted-foreground">
            Los cambios de precio quedan en el historial
          </p>
        </div>
      </div>
      <ProductForm
        productId={product.id}
        defaultValues={{
          name: product.name,
          slug: product.slug,
          status: product.status,
          selling_price: Number(product.selling_price),
          compared_price:
            product.compared_price != null ? Number(product.compared_price) : undefined,
          cost_dropi: Number(product.cost_dropi),
          shipping_cost: Number(product.shipping_cost),
          landing_url: product.landing_url ?? "",
          shopify_product_id: product.shopify_product_id ?? "",
          dropi_product_id: product.dropi_product_id ?? "",
          description: product.description ?? "",
          main_image_url: product.main_image_url,
          gallery,
          best_angle: product.best_angle ?? "",
          target_audience: product.target_audience ?? "",
        }}
      />
    </div>
  )
}
