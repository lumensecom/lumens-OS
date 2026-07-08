"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Loader2, Trash2, ExternalLink } from "lucide-react"

import { addReference, deleteReference } from "@/app/(dashboard)/productos/actions"
import { referenceSchema, type ReferenceInput, REF_TYPE_LABELS } from "@/lib/productos"
import type { ProductReference } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

/** Lista + alta + borrado de referencias de competencia de un producto. */
export function ReferenceManager({
  productId,
  references,
}: {
  productId: string
  references: ProductReference[]
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<ReferenceInput>({
    resolver: zodResolver(referenceSchema) as unknown as Resolver<ReferenceInput>,
    defaultValues: { ref_type: "store", url: "", title: "", notes: "" },
  })

  function onSubmit(values: ReferenceInput) {
    startTransition(async () => {
      const res = await addReference(productId, values)
      if (res.error) { toast.error(res.error); return }
      toast.success("Referencia agregada")
      setOpen(false)
      form.reset({ ref_type: "store", url: "", title: "", notes: "" })
      router.refresh()
    })
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const res = await deleteReference(id)
      if (res.error) { toast.error(res.error); return }
      toast.success("Referencia eliminada")
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {references.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Sin referencias. Agrega tiendas o anuncios de la competencia.
        </p>
      )}
      <ul className="space-y-2">
        {references.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
            <Badge variant="secondary" className="shrink-0">
              {REF_TYPE_LABELS[r.ref_type] ?? r.ref_type}
            </Badge>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 flex-1 items-center gap-1 hover:underline"
            >
              <span className="truncate">{r.title || r.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            </a>
            {r.notes && (
              <span className="hidden max-w-[200px] truncate text-xs text-muted-foreground sm:block">
                {r.notes}
              </span>
            )}
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-lumens-red"
              onClick={() => onDelete(r.id)}
              disabled={isPending}
              aria-label="Eliminar referencia"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Agregar referencia
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva referencia</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="ref_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(REF_TYPE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="url" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título (opcional)</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
