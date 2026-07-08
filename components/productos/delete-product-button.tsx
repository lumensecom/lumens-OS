"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

import { deleteProduct } from "@/app/(dashboard)/productos/actions"
import { Button } from "@/components/ui/button"

export function DeleteProductButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  function onDelete() {
    if (!window.confirm("¿Eliminar este producto? Sus referencias e historial se borran también.")) return
    startTransition(async () => {
      const res = await deleteProduct(id)
      if (res?.error) toast.error(res.error)
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-lumens-red"
      onClick={onDelete}
      disabled={isPending}
      aria-label="Eliminar producto"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
