"use client"

import { Fragment, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  ClipboardPaste, FileQuestion, Loader2, PhoneCall, PhoneOff, RefreshCw,
  Trash2, Info, CheckCircle2, XCircle, CalendarClock, PhoneMissed, ChevronDown,
  Clock, ListChecks, MessageSquareText,
} from "lucide-react"

import { parsePastedOrders, toTitleCase, FORMAT_EXAMPLE, type PastedOrder } from "@/lib/dropi-messages"
import { orderToDaptaPayload, isCallable } from "@/lib/dapta"
import { normalizePhone } from "@/lib/dropi"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

type CallResult = { order_id: string; phone: string; ok: boolean; error?: string }

type StoredResult = {
  order_id: string | null
  outcome: string | null
  success: boolean | null
  summary: string | null
  called_at: string | null
  customer_name: string | null
  phone: string | null
}

type Status =
  | "por_llamar" | "en_cola" | "error"
  | "confirmado" | "reprogramado" | "no_contesta" | "cancelado"

const STATUS_META: Record<Status, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  por_llamar: { label: "Por llamar", cls: "text-muted-foreground", Icon: Clock },
  en_cola: { label: "En cola", cls: "text-blue-500", Icon: PhoneCall },
  error: { label: "Error", cls: "text-lumens-red", Icon: PhoneOff },
  confirmado: { label: "Confirmado", cls: "text-lumens-green", Icon: CheckCircle2 },
  reprogramado: { label: "Reagendar", cls: "text-blue-500", Icon: CalendarClock },
  no_contesta: { label: "Recontacto", cls: "text-orange-500", Icon: PhoneMissed },
  cancelado: { label: "Cancelado", cls: "text-lumens-red", Icon: XCircle },
}

const FILTERS: { id: "todos" | Status; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "por_llamar", label: "Por llamar" },
  { id: "en_cola", label: "En cola" },
  { id: "confirmado", label: "Confirmados" },
  { id: "reprogramado", label: "Reagendar" },
  { id: "no_contesta", label: "Recontacto" },
  { id: "cancelado", label: "Cancelados" },
]

const OUTCOMES = new Set(["confirmado", "reprogramado", "no_contesta", "cancelado"])

function StatusBadge({ status }: { status: Status }) {
  const { label, cls, Icon } = STATUS_META[status]
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", cls)}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  )
}

export function LlamadasModule({
  configured,
  recentResults = [],
}: {
  configured: boolean
  recentResults?: StoredResult[]
}) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [sending, setSending] = useState(false)
  const [sendByPhone, setSendByPhone] = useState<Record<string, CallResult>>({})
  const [filter, setFilter] = useState<"todos" | Status>("todos")

  // Resultados guardados (de la base) indexados por order_id.
  const storedByOrder = useMemo(() => {
    const map: Record<string, StoredResult> = {}
    for (const r of recentResults) {
      if (r.order_id && !map[r.order_id]) map[r.order_id] = r
    }
    return map
  }, [recentResults])

  // Solo pedidos con teléfono válido son llamables.
  const orders = useMemo(() => parsePastedOrders(text).filter(isCallable), [text])

  const statusOf = (o: PastedOrder): Status => {
    const stored = o.orderId ? storedByOrder[o.orderId] : undefined
    if (stored?.outcome && OUTCOMES.has(stored.outcome)) return stored.outcome as Status
    const send = sendByPhone[normalizePhone(o.phone)]
    if (send) return send.ok ? "en_cola" : "error"
    return "por_llamar"
  }

  const storedOf = (o: PastedOrder) =>
    o.orderId ? storedByOrder[o.orderId] : undefined

  // Conteos por filtro (sobre todos los pedidos).
  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: orders.length }
    for (const o of orders) {
      const s = statusOf(o)
      c[s] = (c[s] ?? 0) + 1
    }
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, sendByPhone, storedByOrder])

  // Índices visibles según el filtro activo.
  const visibleIdx = useMemo(() => {
    return orders
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => filter === "todos" || statusOf(o) === filter)
      .map(({ i }) => i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, filter, sendByPhone, storedByOrder])

  const pendingIdx = useMemo(
    () => orders.map((o, i) => ({ o, i })).filter(({ o }) => statusOf(o) === "por_llamar").map(({ i }) => i),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, sendByPhone, storedByOrder],
  )

  const allVisibleSelected = visibleIdx.length > 0 && visibleIdx.every((i) => selected.has(i))

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }
  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) visibleIdx.forEach((i) => next.delete(i))
      else visibleIdx.forEach((i) => next.add(i))
      return next
    })
  }
  function toggleExpand(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function pasteFromClipboard() {
    try {
      const clip = await navigator.clipboard.readText()
      if (!clip.trim()) return toast.warning("El portapapeles está vacío")
      setText(clip)
      setSelected(new Set())
      toast.success("Texto pegado")
    } catch {
      toast.error("El navegador bloqueó el portapapeles — pega con Ctrl/Cmd + V")
    }
  }

  async function callOrders(list: PastedOrder[], label: string) {
    if (!configured) return toast.error("Falta configurar Dapta (DAPTA_FLOW_WEBHOOK_URL)")
    if (list.length === 0) return
    setSending(true)
    try {
      const res = await fetch("/api/dapta/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: list.map(orderToDaptaPayload) }),
      })
      const data = (await res.json().catch(() => null)) as
        | { queued: number; total: number; results: CallResult[]; error?: string }
        | null
      if (!res.ok || !data) throw new Error(data?.error ?? `Error ${res.status}`)
      setSendByPhone((prev) => {
        const next = { ...prev }
        for (const r of data.results) next[normalizePhone(r.phone)] = r
        return next
      })
      if (data.queued === data.total) {
        toast.success(`${data.queued} ${label} en cola para Juliana`)
      } else {
        toast.warning(`${data.queued} de ${data.total} en cola — revisa los errores`)
      }
      setSelected(new Set())
    } catch (err) {
      toast.error((err as Error).message || "No se pudo enviar a Dapta")
    } finally {
      setSending(false)
    }
  }

  const selectedOrders = () => orders.filter((_, i) => selected.has(i))

  return (
    <div className="space-y-5 pb-28">
      <div>
        <h2 className="page-title">Llamadas IA · <span className="text-gradient">Juliana</span></h2>
        <p className="text-sm text-muted-foreground">
          Pega los pedidos de Dropi, selecciona a quiénes llamar y sigue su estado: en cola,
          confirmados, para reagendar o recontactar.
        </p>
      </div>

      {!configured && (
        <div className="flex items-start gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(43_90%_38%)] dark:text-primary" />
          <p>
            La conexión con Dapta aún no está activa (falta <code className="mx-1">DAPTA_FLOW_WEBHOOK_URL</code>
            en Vercel). Puedes preparar la lista igual; el botón de llamar se activa al configurarla.
          </p>
        </div>
      )}

      {/* Input */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">Listado pegado de Dropi</span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={pasteFromClipboard}>
                <ClipboardPaste className="mr-1 h-4 w-4" />
                Pegar del portapapeles
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm">
                    <FileQuestion className="mr-1 h-4 w-4" />
                    Formato
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Formato esperado</DialogTitle>
                    <DialogDescription>
                      Es el mismo listado que copias de Dropi. Cada pedido con teléfono válido queda
                      listo para llamar.
                    </DialogDescription>
                  </DialogHeader>
                  <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs">
                    {FORMAT_EXAMPLE}
                  </pre>
                </DialogContent>
              </Dialog>
              {text && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setText(""); setSelected(new Set()) }}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          <Textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setSelected(new Set()) }}
            placeholder="Pega aquí el listado de pedidos que copiaste de Dropi..."
            className="min-h-[160px] bg-muted/50 font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
          {orders.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {orders.length} pedido{orders.length === 1 ? "" : "s"} con teléfono detectado{orders.length === 1 ? "" : "s"}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filtros + tabla */}
      {orders.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const n = counts[f.id] ?? 0
              const active = filter === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn("chip", active ? "chip-active" : "chip-idle")}
                >
                  {f.label}
                  <span className={cn(
                    "rounded-full px-1.5 text-[11px] font-bold",
                    active ? "bg-primary/25" : "bg-background/70",
                  )}>
                    {n}
                  </span>
                </button>
              )
            })}
          </div>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                        aria-label="Seleccionar visibles"
                      />
                    </TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Análisis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleIdx.map((i) => {
                    const o = orders[i]
                    const st = statusOf(o)
                    const stored = storedOf(o)
                    const hasAnalysis = Boolean(stored?.summary)
                    const isOpen = expanded.has(i)
                    return (
                      <Fragment key={`${o.guia}-${i}`}>
                        <TableRow className={cn(selected.has(i) && "bg-primary/5")}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selected.has(i)}
                              onChange={() => toggle(i)}
                              className="h-4 w-4 accent-[hsl(var(--primary))]"
                              aria-label={`Seleccionar ${o.customerName}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="block max-w-[170px] truncate">{o.customerName || "—"}</span>
                            <span className="block max-w-[170px] truncate text-xs text-muted-foreground">{o.product}</span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {o.city ? toTitleCase(o.city) : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs">
                            {normalizePhone(o.phone)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{o.orderId || "—"}</TableCell>
                          <TableCell><StatusBadge status={st} /></TableCell>
                          <TableCell className="text-right">
                            {hasAnalysis ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(i)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-foreground/80 hover:text-foreground"
                              >
                                <MessageSquareText className="h-3.5 w-3.5" />
                                Leer
                                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {isOpen && stored && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={7} className="py-3">
                              <div className="rounded-lg border bg-background p-3">
                                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                                  <StatusBadge status={st} />
                                  {stored.called_at && (
                                    <span>· {format(parseISO(stored.called_at), "d MMM HH:mm", { locale: es })}</span>
                                  )}
                                </div>
                                <p className="text-sm leading-relaxed">{stored.summary}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                  {visibleIdx.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        No hay pedidos en este filtro.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Resultados recientes (de la base) — histórico global */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="page-title text-xl">Resultados recientes</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Actualizar
          </Button>
        </div>
        {recentResults.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aún no llegan resultados. Cuando Juliana termine una llamada, aparecerán aquí.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Resumen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentResults.map((r, i) => (
                    <TableRow key={`${r.order_id ?? "sin"}-${i}`}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {r.called_at ? format(parseISO(r.called_at), "d MMM HH:mm", { locale: es }) : "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="block max-w-[160px] truncate">{r.customer_name || r.phone || "—"}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.order_id || "—"}</TableCell>
                      <TableCell>
                        {r.outcome && OUTCOMES.has(r.outcome)
                          ? <StatusBadge status={r.outcome as Status} />
                          : <span className="text-xs text-muted-foreground">{r.outcome || "—"}</span>}
                      </TableCell>
                      <TableCell>
                        <span className="block max-w-[320px] truncate text-sm text-muted-foreground">
                          {r.summary || "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Barra de acción flotante */}
      {orders.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="float-bar glass flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 shadow-xl">
            <div className="flex items-center gap-2 pl-1 text-sm">
              <ListChecks className="h-4 w-4 text-primary" />
              <span className="font-semibold">{selected.size}</span>
              <span className="text-muted-foreground">seleccionado{selected.size === 1 ? "" : "s"}</span>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!configured || sending || pendingIdx.length === 0}
                onClick={() => callOrders(pendingIdx.map((i) => orders[i]), "pendientes")}
                title="Llama a todos los que aún no están en cola"
              >
                <PhoneCall className="mr-1 h-4 w-4" />
                Pendientes ({pendingIdx.length})
              </Button>
              <Button
                type="button"
                disabled={!configured || sending || selected.size === 0}
                onClick={() => callOrders(selectedOrders(), "llamadas")}
              >
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PhoneCall className="mr-2 h-4 w-4" />}
                Llamar con Juliana{selected.size > 0 ? ` (${selected.size})` : ""}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
