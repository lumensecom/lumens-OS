"use client"

import { Download } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Exporta un arreglo de objetos planos a CSV y lo descarga. */
export function ExportButton({
  rows,
  filename,
}: {
  rows: Record<string, unknown>[]
  filename: string
}) {
  function onExport() {
    if (rows.length === 0) {
      toast.info("No hay datos para exportar")
      return
    }
    const headers = Object.keys(rows[0])
    const lines = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(",")),
    ]
    const blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={onExport}>
      <Download className="mr-1 h-4 w-4" />
      Exportar CSV
    </Button>
  )
}
