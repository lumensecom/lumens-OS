"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Pencil, Trash2 } from "lucide-react"

import {
  updateResearchStatus,
  deleteResearch,
} from "@/app/(dashboard)/research/actions"
import { RESEARCH_STATUSES, RESEARCH_STATUS_LABELS } from "@/lib/research"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

/** Cambiar estado, editar y eliminar candidato. */
export function ResearchActions({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function onStatusChange(next: string) {
    startTransition(async () => {
      const res = await updateResearchStatus(id, next)
      if (res.error) { toast.error(res.error); return }
      toast.success(`Estado: ${RESEARCH_STATUS_LABELS[next] ?? next}`)
      router.refresh()
    })
  }

  function onDelete() {
    if (!window.confirm("¿Eliminar este candidato y sus referencias?")) return
    startTransition(async () => {
      const res = await deleteResearch(id)
      if (res?.error) toast.error(res.error)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={onStatusChange} disabled={isPending}>
        <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {RESEARCH_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{RESEARCH_STATUS_LABELS[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" asChild>
        <Link href={`/research/${id}/editar`}>
          <Pencil className="mr-1 h-4 w-4" />
          Editar
        </Link>
      </Button>
      <Button
        variant="ghost" size="icon"
        className="text-muted-foreground hover:text-lumens-red"
        onClick={onDelete} disabled={isPending}
        aria-label="Eliminar candidato"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
