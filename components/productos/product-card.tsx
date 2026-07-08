import Link from "next/link"
import Image from "next/image"
import { Package } from "lucide-react"

import { formatCOP } from "@/lib/format"
import type { ProductWithMargin } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/campanas/status-badge"

/** Card de producto para el grid: imagen, nombre, precios y margen. */
export function ProductCard({ product }: { product: ProductWithMargin }) {
  const margin = product.margin != null ? Number(product.margin) : null
  const marginPct =
    product.margin_percentage != null ? Number(product.margin_percentage) : null

  return (
    <Link href={`/productos/${product.slug}`} className="group">
      <Card className="h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className="relative aspect-[4/3] bg-muted">
          {product.main_image_url ? (
            <Image
              src={product.main_image_url}
              alt={product.name ?? ""}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Package className="h-8 w-8" />
            </div>
          )}
          <div className="absolute right-2 top-2">
            <StatusBadge status={product.status ?? "testing"} />
          </div>
        </div>
        <CardContent className="space-y-2 p-3">
          <p className="truncate text-sm font-medium">{product.name}</p>
          <div className="flex items-center justify-between text-sm">
            <span className="font-mono tabular-nums">
              {formatCOP(Number(product.selling_price ?? 0))}
            </span>
            {margin !== null && (
              <span
                className={
                  margin > 0
                    ? "font-mono text-xs text-lumens-green"
                    : "font-mono text-xs text-lumens-red"
                }
              >
                {formatCOP(margin)}
                {marginPct !== null && ` (${marginPct.toFixed(0)}%)`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
