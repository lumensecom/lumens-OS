"use client"

import { useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { AlertTriangle, Phone, MessageCircle, Search } from "lucide-react"

import {
  daysPending, normalizePhone, type DropiOrder,
} from "@/lib/dropi"
import { formatCOP } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

type SortKey = "oldest" | "city" | "amount"

export function PendingTab({ orders }: { orders: DropiOrder[] }) {
  const pending = useMemo(
    () => orders.filter((o) => o.bucket === "pending"),
    [orders],
  )

  const [minDays, setMinDays] = useState("all")
  const [sort, setSort] = useState<SortKey>("oldest")
  const [search, setSearch] = useState("")
  const [city, setCity] = useState("all")

  const cities = useMemo(
    () => Array.from(new Set(pending.map((o) => o.city).filter(Boolean))).sort(),
    [pending],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const threshold = minDays === "all" ? 0 : Number(minDays)
    const list = pending.filter((o) => {
      if (threshold > 0 && daysPending(o.date) < threshold) return false
      if (city !== "all" && o.city !== city) return false
      if (q) {
        const hay = `${o.customerName} ${o.phone}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    list.sort((a, b) => {
      if (sort === "city") return a.city.localeCompare(b.city)
      if (sort === "amount") return b.saleValue - a.saleValue
      // oldest first = más días pendiente primero
      return daysPending(b.date) - daysPending(a.date)
    })
    return list
  }, [pending, minDays, city, search, sort])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="page-title text-xl">Pedidos por confirmar</h3>
        <p className="text-sm text-muted-foreground">
          {pending.length} pedidos esperando tu contacto
        </p>
      </div>

      {pending.length > 50 && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(43_90%_38%)] dark:text-primary" />
          <p>
            Cada pendiente sin confirmar en 24h reduce tu probabilidad de conversión al ~30%.
            Priorización de arriba hacia abajo: los más antiguos primero.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar nombre o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={minDays} onValueChange={setMinDays}>
          <SelectTrigger><SelectValue placeholder="Días pendiente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los días</SelectItem>
            <SelectItem value="1">Más de 24h</SelectItem>
            <SelectItem value="2">Más de 48h</SelectItem>
            <SelectItem value="3">Más de 72h</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger><SelectValue placeholder="Ordenar por" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="oldest">Más antiguo primero</SelectItem>
            <SelectItem value="city">Ciudad</SelectItem>
            <SelectItem value="amount">Monto (mayor primero)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger><SelectValue placeholder="Ciudad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Mostrando {filtered.length} de {pending.length} pendientes
      </p>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {pending.length === 0
              ? "¡Sin pedidos por confirmar! 🎉"
              : "Ningún pedido coincide con los filtros."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <PendingRow key={o.orderId} order={o} />
          ))}
        </div>
      )}
    </div>
  )
}

function PendingRow({ order }: { order: DropiOrder }) {
  const days = daysPending(order.date)
  const urgency =
    days > 3
      ? { cls: "bg-lumens-red/15 text-lumens-red", label: `${days}d` }
      : days >= 2
        ? { cls: "bg-orange-500/15 text-orange-500", label: `${days}d` }
        : days >= 1
          ? { cls: "bg-primary/20 text-[hsl(43_90%_35%)] dark:text-primary", label: `${days}d` }
          : { cls: "bg-muted text-muted-foreground", label: "hoy" }

  const phone = normalizePhone(order.phone)
  const waText = encodeURIComponent(
    `Hola ${order.customerName || ""}, te contactamos de LUMENS para confirmar tu pedido de ${order.products.join(", ")}. ¿Sigue en pie para pago contra entrega?`,
  )

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className={cn("flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-bold", urgency.cls)}>
          <span className="font-mono text-sm">{urgency.label}</span>
          <span className="text-[9px] font-medium uppercase opacity-80">pend.</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-medium">{order.customerName || "Sin nombre"}</span>
            <span className="text-xs text-muted-foreground">
              {order.date ? format(parseISO(order.date), "d MMM", { locale: es }) : "sin fecha"}
            </span>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {order.city}{order.department ? `, ${order.department}` : ""} · {order.products.join(", ")}
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatCOP(order.saleValue)}
          </span>
          <div className="flex items-center gap-1.5">
            {phone && (
              <>
                <a
                  href={`https://wa.me/${phone}?text=${waText}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-lumens-green/15 text-lumens-green transition-colors hover:bg-lumens-green/25"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a
                  href={`tel:+${phone}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-500 transition-colors hover:bg-blue-500/25"
                  title="Llamar"
                >
                  <Phone className="h-4 w-4" />
                </a>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
