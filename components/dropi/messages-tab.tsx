"use client"

import { Fragment, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ClipboardPaste, Copy, Download, FileQuestion, Link2, MessageCircle,
  Phone, Sparkles, Trash2,
} from "lucide-react"

import {
  MESSAGE_TYPES, buildMessage, parsePastedOrders, toTitleCase, whatsappLink,
  FORMAT_EXAMPLE, type MessageType, type PastedOrder,
} from "@/lib/dropi-messages"
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

export function MessagesTab() {
  const [type, setType] = useState<MessageType>("confirmacion")
  const [text, setText] = useState("")
  const [generated, setGenerated] = useState<PastedOrder[] | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  const activeType = MESSAGE_TYPES.find((t) => t.id === type) ?? MESSAGE_TYPES[0]

  // Detección en vivo mientras el usuario pega.
  const detected = useMemo(() => parsePastedOrders(text), [text])

  // Los mensajes se derivan del tipo activo: cambiar el tipo los actualiza.
  const rows = useMemo(
    () => (generated ?? []).map((order) => ({ order, message: buildMessage(type, order) })),
    [generated, type],
  )

  async function pasteFromClipboard() {
    try {
      const clip = await navigator.clipboard.readText()
      if (!clip.trim()) {
        toast.warning("El portapapeles está vacío")
        return
      }
      setText(clip)
      toast.success("Texto pegado")
    } catch {
      toast.error("El navegador bloqueó el portapapeles — pega con Ctrl/Cmd + V")
    }
  }

  function copy(value: string, label: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(label))
      .catch(() => toast.error("No se pudo copiar"))
  }

  function downloadCsv() {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const header = ["#", "Cliente", "Ciudad", "Departamento", "Orden ID", "Guia", "Telefono", "Mensaje", "Link WhatsApp"]
    const lines = [header.join(",")]
    rows.forEach(({ order, message }, i) => {
      lines.push([
        String(i + 1), esc(order.customerName), esc(order.city), esc(order.department),
        esc(order.orderId), esc(order.guia), esc(order.phone),
        esc(message), esc(whatsappLink(order.phone, message)),
      ].join(","))
    })
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `mensajes-${type}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="page-title text-xl">Generador de mensajes</h3>
        <p className="text-sm text-muted-foreground">
          Pega el listado que copiaste de Dropi y genera un WhatsApp personalizado por cliente.
        </p>
      </div>

      {/* ── Sección 1: tipo de mensaje ── */}
      <div className="grid gap-2 sm:grid-cols-3">
        {MESSAGE_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all hover:-translate-y-0.5",
              type === t.id ? t.selectedClass : "hover:border-muted-foreground/40",
            )}
          >
            <span
              className="h-8 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            <span>
              <span className="block text-sm font-semibold">{t.label}</span>
              <span className="block text-xs text-muted-foreground">
                {t.id === "confirmacion" ? "Antes de despachar" : t.id === "oficina" ? "Ya llegó a oficina" : "Recuperar la venta"}
              </span>
            </span>
          </button>
        ))}
      </div>

      <p className="rounded-lg border-l-2 border-primary bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        {activeType.helper}
      </p>

      {/* ── Sección 2: input ── */}
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
                      Selecciona las filas de pedidos en Dropi, cópialas (Ctrl/Cmd + C) y pégalas
                      aquí. Cada pedido son ~10 líneas y se separan entre sí; el lector se guía por
                      el número de guía, la línea <code>Tel:</code> y <code>Orden ID:</code>.
                    </DialogDescription>
                  </DialogHeader>
                  <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs">
                    {FORMAT_EXAMPLE}
                  </pre>
                  <p className="text-xs text-muted-foreground">
                    Puedes pegar decenas de pedidos de una sola vez — se detectan todos.
                  </p>
                </DialogContent>
              </Dialog>
              {text && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setText(""); setGenerated(null) }}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pega aquí el listado de pedidos que copiaste de Dropi..."
            className="min-h-[200px] bg-muted/50 font-mono text-xs leading-relaxed"
            spellCheck={false}
          />

          <Button
            type="button"
            size="lg"
            className={cn("w-full", activeType.buttonClass)}
            disabled={detected.length === 0}
            onClick={() => { setGenerated(detected); setExpanded(null) }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {detected.length === 0
              ? "Generar mensajes (sin pedidos detectados)"
              : `Generar mensajes (${detected.length} ${detected.length === 1 ? "pedido detectado" : "pedidos detectados"})`}
          </Button>
        </CardContent>
      </Card>

      {/* ── Sección 3: resultados ── */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {rows.length} {rows.length === 1 ? "mensaje generado" : "mensajes generados"}
              <span className="ml-2 font-normal text-muted-foreground">· {activeType.label}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={downloadCsv}>
                <Download className="mr-1 h-4 w-4" />
                Descargar CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  copy(
                    rows.map((r) => whatsappLink(r.order.phone, r.message)).join("\n"),
                    `${rows.length} links copiados`,
                  )
                }
              >
                <Link2 className="mr-1 h-4 w-4" />
                Copiar todos los links
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead className="min-w-[220px]">Mensaje</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ order, message }, i) => {
                    const isOpen = expanded === i
                    return (
                      <Fragment key={`${order.guia}-${i}`}>
                        <TableRow>
                          <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">
                            <span className="block max-w-[160px] truncate">
                              {order.customerName || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {order.city ? toTitleCase(order.city) : "—"}
                            {order.department && (
                              <span className="block text-xs text-muted-foreground">
                                {toTitleCase(order.department)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {order.orderId || "—"}
                            {order.guia && (
                              <span className="block text-[10px] text-muted-foreground">
                                guía {order.guia}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs">{order.phone}</TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => setExpanded(isOpen ? null : i)}
                              className="text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                              title="Ver mensaje completo"
                            >
                              {message.replace(/\n+/g, " ").slice(0, 60)}
                              {message.length > 60 ? "…" : ""}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={whatsappLink(order.phone, message)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-lumens-green/15 text-lumens-green transition-colors hover:bg-lumens-green/25"
                                title="Abrir WhatsApp con el mensaje"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => copy(message, "Mensaje copiado")}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                                title="Copiar mensaje"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => copy(order.phone, "Teléfono copiado")}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-blue-500 transition-colors hover:bg-blue-500/25"
                                title="Copiar teléfono"
                              >
                                <Phone className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={7} className="py-3">
                              <pre className="whitespace-pre-wrap rounded-lg border bg-background p-3 font-sans text-sm leading-relaxed">
                                {message}
                              </pre>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
