"use client"

import { useQueryState } from "nuqs"

import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "", label: "Todas" },
  { value: "meta", label: "Meta" },
  { value: "tiktok", label: "TikTok" },
]

/** Filtro de plataforma persistido en la URL (?plataforma=). */
export function PlatformFilter() {
  const [plataforma, setPlataforma] = useQueryState("plataforma", {
    defaultValue: "",
    shallow: false,
  })

  return (
    <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setPlataforma(opt.value || null)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            (plataforma || "") === opt.value
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
