"use client"

import { useQueryState } from "nuqs"

import { cn } from "@/lib/utils"
import { RESEARCH_STATUSES, RESEARCH_STATUS_LABELS } from "@/lib/research"

/** Filtro de estado del research persistido en la URL (?estado=). */
export function ResearchStatusFilter() {
  const [estado, setEstado] = useQueryState("estado", {
    defaultValue: "",
    shallow: false,
  })

  const options = [
    { value: "", label: "Todos" },
    ...RESEARCH_STATUSES.map((s) => ({ value: s, label: RESEARCH_STATUS_LABELS[s] })),
  ]

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setEstado(opt.value || null)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            (estado || "") === opt.value
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
