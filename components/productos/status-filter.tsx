"use client"

import { useQueryState } from "nuqs"

import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "testing", label: "En prueba" },
  { value: "paused", label: "Pausados" },
  { value: "archived", label: "Archivados" },
]

/** Filtro de estado de producto persistido en la URL (?estado=). */
export function StatusFilter() {
  const [estado, setEstado] = useQueryState("estado", {
    defaultValue: "all",
    shallow: false,
  })

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setEstado(opt.value === "all" ? null : opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            (estado || "all") === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
