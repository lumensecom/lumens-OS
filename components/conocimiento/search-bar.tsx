"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

/** Barra de búsqueda que navega a /conocimiento/buscar?q= */
export function SearchBar({ initial = "" }: { initial?: string }) {
  const [q, setQ] = useState(initial)
  const router = useRouter()

  return (
    <form
      className="relative max-w-md"
      onSubmit={(e) => {
        e.preventDefault()
        if (q.trim()) router.push(`/conocimiento/buscar?q=${encodeURIComponent(q.trim())}`)
      }}
    >
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar artículos, procesos, ángulos..."
        className="pl-9"
      />
    </form>
  )
}
