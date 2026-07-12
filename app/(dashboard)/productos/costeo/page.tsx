import Link from "next/link"
import { ArrowLeft, Plus, Table2, TriangleAlert } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { formatCOP, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

export const metadata = { title: "Costeo · LUMENS OS" }

/**
 * Tabla de costeo completa (espejo del Excel COSTOS Y OFERTAS):
 * venta, costo, fulfillment, flete, COGS, margen, % margen,
 * publicidad (CPA), admin, utilidad, % utilidad y venta mínima por regla.
 */
export default async function CosteoPage() {
  const supabase = createClient()
  const { data: products } = await supabase
    .from("products_with_margin")
    .select("*")
    .neq("status", "archived")
    .order("name")

  const rows = products ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/productos" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="page-title flex items-center gap-2">
              <Table2 className="h-5 w-5 text-primary" />
              Tabla de costeo
            </h2>
            <p className="text-sm text-muted-foreground">
              Costos y ofertas de todos los productos · los valores en rojo violan la regla de precio
            </p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href="/productos/nuevo">
            <Plus className="mr-1 h-4 w-4" />
            Nuevo producto
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="min-w-[180px]">Producto</TableHead>
                <TableHead className="text-right">Venta</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Fulfillment</TableHead>
                <TableHead className="text-right">Flete</TableHead>
                <TableHead className="text-right font-semibold">COGS</TableHead>
                <TableHead className="text-right font-semibold">Margen</TableHead>
                <TableHead className="text-right">% margen</TableHead>
                <TableHead className="text-right">CPA (pauta)</TableHead>
                <TableHead className="text-right">Admin</TableHead>
                <TableHead className="text-right font-semibold">Utilidad</TableHead>
                <TableHead className="text-right">% utilidad</TableHead>
                <TableHead className="text-right">Venta mín.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="py-10 text-center text-muted-foreground">
                    Sin productos todavía.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((p) => {
                const marginPct = Number(p.margin_percentage ?? 0)
                const utility = Number(p.net_utility ?? 0)
                const minPrice = Number(p.min_selling_price ?? 0)
                const breaksRule = Number(p.selling_price ?? 0) < minPrice
                return (
                  <TableRow key={p.id} className="tabular-nums">
                    <TableCell className="font-medium">
                      <Link
                        href={`/productos/${p.slug}`}
                        className="flex items-center gap-1.5 hover:underline underline-offset-4"
                      >
                        {breaksRule && (
                          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-lumens-red" />
                        )}
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCOP(Number(p.selling_price ?? 0))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCOP(Number(p.cost_dropi ?? 0))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCOP(Number(p.fulfillment_cost ?? 0))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCOP(Number(p.shipping_cost ?? 0))}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatCOP(Number(p.cogs ?? 0))}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono font-medium",
                        Number(p.margin ?? 0) > 0 ? "text-lumens-green" : "text-lumens-red",
                      )}
                    >
                      {formatCOP(Number(p.margin ?? 0))}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono",
                        marginPct >= 50
                          ? "text-lumens-green"
                          : marginPct >= 40
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-lumens-red",
                      )}
                    >
                      {formatPercent(marginPct)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {p.cpa_real != null ? formatCOP(Number(p.cpa_real)) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCOP(Number(p.admin_cost ?? 0))}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono font-medium",
                        utility > 0 ? "text-lumens-green" : "text-lumens-red",
                      )}
                    >
                      {formatCOP(utility)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPercent(Number(p.net_utility_percentage ?? 0))}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono",
                        breaksRule ? "font-semibold text-lumens-red" : "text-muted-foreground",
                      )}
                    >
                      {minPrice > 0 ? formatCOP(minPrice) : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <TriangleAlert className="mr-1 inline h-3 w-3 text-lumens-red" />
        La venta mínima aplica la regla de precio de cada producto (por defecto: COGS ≤ 50% del
        precio, es decir venta mínima = COGS × 2). Si el precio actual queda por debajo, la fila se
        marca en rojo. Edita cualquier producto para ajustar su costeo.
      </p>
    </div>
  )
}
