"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { FileSpreadsheet, Loader2, UploadCloud } from "lucide-react"

import { buildDataset, type DropiDataset } from "@/lib/dropi"
import { cn } from "@/lib/utils"

export function DropiUploader({
  onLoaded,
  compact = false,
}: {
  onLoaded: (dataset: DropiDataset, fileName: string) => void
  compact?: boolean
}) {
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      setError(null)
      setParsing(true)
      try {
        const XLSX = await import("xlsx")
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { cellDates: true })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          blankrows: false,
          defval: "",
        })
        const dataset = buildDataset(grid as unknown[][])
        if (dataset.orders.length === 0) {
          setError("No se encontraron pedidos en el archivo. ¿Es el export de Dropi?")
          return
        }
        onLoaded(dataset, file.name)
      } catch {
        setError("No se pudo leer el archivo. Asegúrate de que sea un .xlsx válido.")
      } finally {
        setParsing(false)
      }
    },
    [onLoaded],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
  })

  if (compact) {
    return (
      <button
        {...getRootProps()}
        type="button"
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
      >
        <input {...getInputProps()} />
        {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        Cargar nuevo archivo
      </button>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-all",
          isDragActive
            ? "border-primary bg-primary/10 shadow-[0_0_40px_-10px_hsl(var(--primary))]"
            : "border-primary/40 hover:border-primary hover:bg-primary/5",
        )}
      >
        <input {...getInputProps()} />
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-[0_0_40px_-8px_hsl(var(--primary))]">
          {parsing ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-8 w-8" />
          )}
        </span>
        <div>
          <h3 className="font-display text-lg font-bold">Sube tu reporte de Dropi</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Arrastra el archivo .xlsx aquí o haz clic para seleccionar
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Acepta el formato exacto de exportación de Dropi (53 columnas)
        </p>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-lumens-red/10 px-3 py-2 text-center text-sm text-lumens-red">
          {error}
        </p>
      )}
    </div>
  )
}
