"use client"

import { useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowUpDown, Search } from "lucide-react"

import {
  BUCKET_COLORS, BUCKET_LABELS, type DropiBucket, type DropiOrder,
} from "@/lib/dropi"
import { formatCOP } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

type SortKey = "date" | "customer" | "city" | "sale" | "profit"

const BUCKET_ORDER: DropiBucket[] = [
  "delivered", "in_transit", "pending", "returned", "cancelled", "other",
]

export function DetailTab({ orders }: { orders: DropiOrder[] }) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"all" | DropiBucket>("all")
  const [sort, setSort] = useState<SortKey>("date")
  const [dir, setDir] = useState<"asc" | "desc">("desc")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = orders.filter((o) => {
      if (status !== "all" && o.bucket !== status) return false
      if (q) {
        const hay = `${o.customerName} ${o.phone} ${o.city} ${o.products.join(" ")}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    const factor = dir === "asc" ? 1 : -1
    list.sort((a, b) => {
      switch (sort) {
        case "customer": return factor * a.customerName.localeCompare(b.customerName)
        case "city": return factor * a.city.localeCompare(b.city)
        case "sale": return factor * (a.saleValue - b.saleValue)
        case "profit": return factor * (a.profit - b.profit)
        default: return factor * String(a.date ?? "").localeCompare(String(b.date ?? ""))
      }
    })
    return list
  }, [orders, search, status, sort, dir])

  function toggleSort(key: SortKey) {
    if (sort === key) setDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSort(key); setDir("desc") }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="page-title text-xl">Detalle completo</h3>
        <p className="text-sm text-muted-foreground">
          {orders.length} pedidos consolidados del reporte
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar cliente, ciudad, producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as "all" | DropiBucket)}>
          <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {BUCKET_ORDER.map((b) => (
              <SelectItem key={b} value={b}>{BUCKET_LABELS[b]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Mostrando {filtered.length} de {orders.length}
      </p>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <SortableHead label="Fecha" active={sort === "date"} onClick={() => toggleSort("date")} />
                <SortableHead label="Cliente" active={sort === "customer"} onClick={() => toggleSort("customer")} />
                <TableHead>Estado</TableHead>
                <SortableHead label="Ciudad" active={sort === "city"} onClick={() => toggleSort("city")} />
                <TableHead>Producto</TableHead>
                <SortableHead label="Venta" active={sort === "sale"} onClick={() => toggleSort("sale")} right />
                <SortableHead label="Ganancia" active={sort === "profit"} onClick={() => toggleSort("profit")} right />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.orderId} className="tabular-nums">
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {o.date ? format(parseISO(o.date), "d MMM", { locale: es }) : "—"}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="block max-w-[160px] truncate">{o.customerName || "—"}</span>
                    <span className="block text-xs text-muted-foreground">{o.phone}</span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${BUCKET_COLORS[o.bucket]}22`,
                        color: BUCKET_COLORS[o.bucket],
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BUCKET_COLORS[o.bucket] }} />
                      {BUCKET_LABELS[o.bucket]}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{o.city || "—"}</TableCell>
                  <TableCell>
                    <span className="block max-w-[220px] truncate">{o.products.join(", ")}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCOP(o.saleValue)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono",
                      o.profit > 0 ? "text-lumens-green" : "text-muted-foreground",
                    )}
                  >
                    {formatCOP(o.profit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function SortableHead({
  label, active, onClick, right,
}: {
  label: string
  active: boolean
  onClick: () => void
  right?: boolean
}) {
  return (
    <TableHead className={cn(right && "text-right")}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </TableHead>
  )
}
