"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  deleteRevenue,
  deleteExpense,
} from "@/app/(dashboard)/contabilidad/actions"
import { Button } from "@/components/ui/button"

export function DeleteEntryButton({
  id,
  kind,
}: {
  id: string
  kind: "revenue" | "expense"
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function onDelete() {
    if (!window.confirm("¿Eliminar este registro? No se puede deshacer.")) return
    startTransition(async () => {
      const res =
        kind === "revenue" ? await deleteRevenue(id) : await deleteExpense(id)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Registro eliminado")
      router.refresh()
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-lumens-red"
      onClick={onDelete}
      disabled={isPending}
      aria-label="Eliminar"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
