import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import { REVENUE_SOURCE_LABELS } from "@/lib/contabilidad"
import { formatCOP } from "@/lib/format"
import {
  resolveMonth,
  fetchEntries,
  firstParam,
  type SearchParams,
} from "@/lib/contabilidad-queries"
import { MonthSelector } from "@/components/contabilidad/month-selector"
import { ExportButton } from "@/components/contabilidad/export-button"
import { DeleteEntryButton } from "@/components/contabilidad/delete-entry-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function IngresosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { month, start, end } = resolveMonth(firstParam(searchParams.mes))
  const { revenue } = await fetchEntries(start, end)

  const total = revenue.reduce((s, r) => s + Number(r.gross_amount), 0)
  const exportRows = revenue.map((r) => ({
    fecha: r.date,
    fuente: REVENUE_SOURCE_LABELS[r.source] ?? r.source,
    producto: r.productName ?? "",
    pedidos: r.orders_count,
    monto: r.gross_amount,
    notas: r.notes ?? "",
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthSelector current={month} />
        <ExportButton rows={exportRows} filename={`ingresos-${month}.csv`} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {revenue.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Sin ingresos este mes. Usa el botón “Ingreso” para agregar uno.
                </TableCell>
              </TableRow>
            )}
            {revenue.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">
                  {format(parseISO(r.date), "d MMM", { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {REVENUE_SOURCE_LABELS[r.source] ?? r.source}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.productName ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {r.orders_count}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-lumens-green">
                  {formatCOP(Number(r.gross_amount))}
                </TableCell>
                <TableCell>
                  <DeleteEntryButton id={r.id} kind="revenue" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {revenue.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4}>Total</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCOP(total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>
    </div>
  )
}
