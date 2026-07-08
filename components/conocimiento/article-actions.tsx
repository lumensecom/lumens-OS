"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Copy, Pencil, Trash2 } from "lucide-react"

import { duplicateArticle, deleteArticle } from "@/app/(dashboard)/conocimiento/actions"
import { Button } from "@/components/ui/button"

/** Editar, duplicar (plantilla) y eliminar artículo. */
export function ArticleActions({
  id,
  editHref,
}: {
  id: string
  editHref: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function onDuplicate() {
    startTransition(async () => {
      const res = await duplicateArticle(id)
      if (res.error) { toast.error(res.error); return }
      toast.success("Artículo duplicado como copia")
      router.refresh()
    })
  }

  function onDelete() {
    if (!window.confirm("¿Eliminar este artículo?")) return
    startTransition(async () => {
      const res = await deleteArticle(id)
      if (res?.error) toast.error(res.error)
    })
  }

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="outline" asChild>
        <Link href={editHref}>
          <Pencil className="mr-1 h-4 w-4" />
          Editar
        </Link>
      </Button>
      <Button size="sm" variant="ghost" onClick={onDuplicate} disabled={isPending}>
        <Copy className="mr-1 h-4 w-4" />
        Duplicar
      </Button>
      <Button
        size="icon" variant="ghost"
        className="text-muted-foreground hover:text-lumens-red"
        onClick={onDelete}
        disabled={isPending}
        aria-label="Eliminar artículo"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
