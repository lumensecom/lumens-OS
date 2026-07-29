"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ClipboardPaste, FileQuestion, Loader2, PhoneCall, PhoneOff, Trash2, Info,
} from "lucide-react"

import { parsePastedOrders, toTitleCase, FORMAT_EXAMPLE } from "@/lib/dropi-messages"
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

export function LlamadasModule({ configured }: { configured: boolean }) {
  const [text, setText] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<Record<string, CallResult>>({})

  // Solo pedidos con teléfono válido son llamables.
  const orders = useMemo(
    () => parsePastedOrders(text).filter(isCallable),
    [text],
  )

  const allSelected = orders.length > 0 && selected.size === orders.length

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(orders.map((_, i) => i)))
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

  async function callSelected() {
    const chosen = orders.filter((_, i) => selected.has(i))
    if (chosen.length === 0) return
    setSending(true)
    try {
      const res = await fetch("/api/dapta/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: chosen.map(orderToDaptaPayload) }),
      })
      const data = (await res.json().catch(() => null)) as
        | { queued: number; total: number; results: CallResult[]; error?: string }
        | null
      if (!res.ok || !data) {
        throw new Error(data?.error ?? `Error ${res.status}`)
      }
      const map: Record<string, CallResult> = {}
      for (const r of data.results) map[r.order_id] = r
      setResults((prev) => ({ ...prev, ...map }))
      if (data.queued === data.total) {
        toast.success(`${data.queued} llamada${data.queued === 1 ? "" : "s"} en cola para Juliana`)
      } else {
        toast.warning(`${data.queued} de ${data.total} en cola — revisa los errores en la tabla`)
      }
      setSelected(new Set())
    } catch (err) {
      toast.error((err as Error).message || "No se pudo enviar a Dapta")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Llamadas IA · Juliana</h2>
        <p className="text-sm text-muted-foreground">
          Pega los pedidos de Dropi, selecciona a quiénes llamar y Juliana los confirma por teléfono.
        </p>
      </div>

      {!configured && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(43_90%_38%)] dark:text-primary" />
          <p>
            La conexión con Dapta aún no está activa. Falta pegar la URL del flujo en la variable
            <code className="mx-1">DAPTA_FLOW_WEBHOOK_URL</code> (Vercel). Puedes preparar la lista
            igual; el botón de llamar se activa cuando quede configurada.
          </p>
        </div>
      )}

      {/* Input */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">Listado pegado de Dropi</span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={pasteFromClipboard}>
                <ClipboardPaste className="mr-1 h-4 w-4" />
                Pegar del portapapeles
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm">
                    <FileQuestion className="mr-1 h-4 w-4" />
                    Ejemplo de formato
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Formato esperado</DialogTitle>
                    <DialogDescription>
                      Es el mismo listado que copias de Dropi (el del generador de mensajes). Cada
                      pedido con teléfono válido queda listo para llamar.
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
            className="min-h-[180px] bg-muted/50 font-mono text-xs leading-relaxed"
            spellCheck={false}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {orders.length === 0
                ? "Sin pedidos llamables detectados"
                : `${orders.length} pedido${orders.length === 1 ? "" : "s"} con teléfono · ${selected.size} seleccionado${selected.size === 1 ? "" : "s"}`}
            </p>
            <Button
              type="button"
              size="lg"
              disabled={!configured || selected.size === 0 || sending}
              onClick={callSelected}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PhoneCall className="mr-2 h-4 w-4" />
              )}
              Llamar seleccionados con Juliana{selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de pedidos */}
      {orders.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o, i) => {
                  const result = o.orderId ? results[o.orderId] : undefined
                  return (
                    <TableRow key={`${o.guia}-${i}`} className={cn(selected.has(i) && "bg-primary/5")}>
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
                        <span className="block max-w-[160px] truncate">{o.customerName || "—"}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {o.city ? toTitleCase(o.city) : "—"}
                      </TableCell>
                      <TableCell>
                        <span className="block max-w-[180px] truncate text-sm">{o.product}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {normalizePhone(o.phone)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{o.orderId || "—"}</TableCell>
                      <TableCell className="text-right">
                        {result ? (
                          result.ok ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-lumens-green">
                              <PhoneCall className="h-3 w-3" /> En cola
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-lumens-red" title={result.error}>
                              <PhoneOff className="h-3 w-3" /> Error
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
