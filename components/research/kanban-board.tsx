"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { Search } from "lucide-react"

import { updateResearchStatus } from "@/app/(dashboard)/research/actions"
import { RESEARCH_STATUSES, RESEARCH_STATUS_LABELS, scoreColor } from "@/lib/research"
import type { ResearchProduct } from "@/lib/types"
import { cn } from "@/lib/utils"

const COLUMN_STYLES: Record<string, string> = {
  candidate: "border-t-blue-500",
  testing: "border-t-primary",
  winner: "border-t-lumens-green",
  rejected: "border-t-lumens-red",
}

/** Kanban por estado con drag & drop nativo (desktop). */
export function KanbanBoard({ items }: { items: ResearchProduct[] }) {
  const [isPending, startTransition] = useTransition()
  const [overColumn, setOverColumn] = useState<string | null>(null)
  const router = useRouter()

  function onDrop(status: string, e: React.DragEvent) {
    e.preventDefault()
    setOverColumn(null)
    const id = e.dataTransfer.getData("text/plain")
    if (!id) return
    const item = items.find((i) => i.id === id)
    if (!item || item.status === status) return
    startTransition(async () => {
      const res = await updateResearchStatus(id, status)
      if (res.error) { toast.error(res.error); return }
      toast.success(`Movido a ${RESEARCH_STATUS_LABELS[status]}`)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {RESEARCH_STATUSES.map((status) => {
        const column = items.filter((i) => (i.status ?? "candidate") === status)
        return (
          <div
            key={status}
            onDragOver={(e) => { e.preventDefault(); setOverColumn(status) }}
            onDragLeave={() => setOverColumn(null)}
            onDrop={(e) => onDrop(status, e)}
            className={cn(
              "min-h-[220px] rounded-lg border border-t-4 bg-muted/30 p-2 transition-colors",
              COLUMN_STYLES[status],
              overColumn === status && "bg-primary/10",
              isPending && "opacity-70",
            )}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-medium">{RESEARCH_STATUS_LABELS[status]}</p>
              <span className="font-mono text-xs text-muted-foreground">{column.length}</span>
            </div>
            <div className="space-y-2">
              {column.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <Link
                    href={`/research/${item.id}`}
                    className="flex items-center gap-2 rounded-md border bg-card p-2 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                      {item.main_image_url ? (
                        <Image src={item.main_image_url} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Search className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                    <span className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-bold",
                      scoreColor(item.total_score ?? 0),
                    )}>
                      {item.total_score ?? 0}
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
