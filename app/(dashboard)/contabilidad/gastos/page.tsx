import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants"
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

export default async function GastosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { month, start, end } = resolveMonth(firstParam(searchParams.mes))
  const { expenses } = await fetchEntries(start, end)

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const exportRows = expenses.map((e) => ({
    fecha: e.date,
    categoria: EXPENSE_CATEGORY_LABELS[e.category] ?? e.category,
    producto: e.productName ?? "",
    monto: e.amount,
    descripcion: e.description ?? "",
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthSelector current={month} />
        <ExportButton rows={exportRows} filename={`gastos-${month}.csv`} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Sin gastos este mes. Usa el botón “Gasto” para agregar uno.
                </TableCell>
              </TableRow>
            )}
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap">
                  {format(parseISO(e.date), "d MMM", { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {e.productName ?? "—"}
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-muted-foreground">
                  {e.description ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-lumens-red">
                  {formatCOP(Number(e.amount))}
                </TableCell>
                <TableCell>
                  <DeleteEntryButton id={e.id} kind="expense" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {expenses.length > 0 && (
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
