"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { FileSpreadsheet, ClipboardList, ListChecks, MessageSquare } from "lucide-react"

import {
  BUCKET_LABELS, type AdSpend, type DropiDataset, type DropiOrder,
} from "@/lib/dropi"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { DropiUploader } from "@/components/dropi/uploader"
import { SummaryTab } from "@/components/dropi/summary-tab"
import { PendingTab } from "@/components/dropi/pending-tab"
import { DetailTab } from "@/components/dropi/detail-tab"
import { MessagesTab } from "@/components/dropi/messages-tab"

const STORAGE_KEY = "lumens.dropi.v1"

type Persisted = {
  dataset: DropiDataset
  ads: AdSpend
  fileName: string
}

const EMPTY_ADS: AdSpend = { meta: 0, tiktok: 0, otros: 0 }

export function DropiAnalysis() {
  const [state, setState] = useState<Persisted | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [tab, setTab] = useState("resumen")

  // Rehidrata desde localStorage al montar.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setState(JSON.parse(raw) as Persisted)
    } catch {
      /* ignora datos corruptos */
    }
    setHydrated(true)
  }, [])

  // Persiste en cada cambio.
  useEffect(() => {
    if (!hydrated) return
    try {
      if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* cuota excedida: ignora */
    }
  }, [state, hydrated])

  const handleLoaded = useCallback((dataset: DropiDataset, fileName: string) => {
    setState((prev) => ({ dataset, fileName, ads: prev?.ads ?? EMPTY_ADS }))
    setTab("resumen")
  }, [])

  const handleAds = useCallback((ads: AdSpend) => {
    setState((prev) => (prev ? { ...prev, ads } : prev))
  }, [])

  const pendingCount = useMemo(
    () => (state ? state.dataset.orders.filter((o) => o.bucket === "pending").length : 0),
    [state],
  )

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="page-title">Análisis Dropi</h2>
        <p className="text-sm text-muted-foreground">
          Sube el reporte para ver KPIs y utilidad neta, o genera mensajes de WhatsApp pegando el
          listado directo de Dropi.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="resumen" className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4" />
            Importar y resumen
          </TabsTrigger>
          <TabsTrigger value="pendientes" className="gap-1.5">
            <ListChecks className="h-4 w-4" />
            Por confirmar
            {pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="detalle" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Detalle completo
          </TabsTrigger>
          <TabsTrigger value="mensajes" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Generador de mensajes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          {state ? (
            <SummaryTab
              dataset={state.dataset}
              ads={state.ads}
              onAdsChange={handleAds}
              onReplace={handleLoaded}
              onExport={() => exportCsv(state.dataset.orders)}
            />
          ) : (
            <div className="py-8">
              <DropiUploader onLoaded={handleLoaded} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="pendientes" className="mt-4">
          {state ? (
            <PendingTab orders={state.dataset.orders} />
          ) : (
            <NeedsUpload onLoaded={handleLoaded} />
          )}
        </TabsContent>

        <TabsContent value="detalle" className="mt-4">
          {state ? (
            <DetailTab orders={state.dataset.orders} />
          ) : (
            <NeedsUpload onLoaded={handleLoaded} />
          )}
        </TabsContent>

        {/* El generador no depende del Excel: funciona con texto pegado. */}
        <TabsContent value="mensajes" className="mt-4">
          <MessagesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NeedsUpload({
  onLoaded,
}: {
  onLoaded: (dataset: DropiDataset, fileName: string) => void
}) {
  return (
    <Card>
      <CardContent className="space-y-4 py-10">
        <p className="text-center text-sm text-muted-foreground">
          Esta vista necesita el reporte de Dropi cargado.
        </p>
        <DropiUploader onLoaded={onLoaded} />
      </CardContent>
    </Card>
  )
}

/** Exporta el dataset consolidado (nivel pedido) a CSV descargable. */
function exportCsv(orders: DropiOrder[]) {
  const headers = [
    "Orden", "Fecha", "Estado", "Cliente", "Telefono", "Ciudad", "Departamento",
    "Productos", "Cantidad", "Venta", "Costo proveedor", "Ganancia", "Flete",
  ]
  const esc = (v: string | number) => {
    const s = String(v ?? "")
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(",")]
  for (const o of orders) {
    lines.push([
      esc(o.orderId), esc(o.date ?? ""), esc(BUCKET_LABELS[o.bucket]),
      esc(o.customerName), esc(o.phone), esc(o.city), esc(o.department),
      esc(o.products.join(" | ")), o.quantity, o.saleValue, o.supplierCost,
      o.profit, o.shippingCost,
    ].join(","))
  }
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `analisis-dropi-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
