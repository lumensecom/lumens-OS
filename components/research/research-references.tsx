"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Loader2, Trash2, ExternalLink } from "lucide-react"

import {
  addResearchReference,
  deleteResearchReference,
} from "@/app/(dashboard)/research/actions"
import {
  researchReferenceSchema,
  type ResearchReferenceInput,
  RESEARCH_REF_LABELS,
} from "@/lib/research"
import type { ResearchReference } from "@/lib/types"
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

/** Evidencia del research: anuncios activos, tiendas, videos. */
export function ResearchReferences({
  researchId,
  references,
}: {
  researchId: string
  references: ResearchReference[]
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<ResearchReferenceInput>({
    resolver: zodResolver(researchReferenceSchema) as unknown as Resolver<ResearchReferenceInput>,
    defaultValues: {
      ref_type: "ad", url: "", platform: "", days_active: undefined,
      engagement_notes: "", notes: "",
    },
  })

  function onSubmit(values: ResearchReferenceInput) {
    startTransition(async () => {
      const res = await addResearchReference(researchId, values)
      if (res.error) { toast.error(res.error); return }
      toast.success("Referencia agregada")
      setOpen(false)
      form.reset()
      router.refresh()
    })
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const res = await deleteResearchReference(id)
      if (res.error) { toast.error(res.error); return }
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {references.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Sin evidencia todavía. Agrega anuncios activos, tiendas o videos virales.
        </p>
      )}
      <ul className="space-y-2">
        {references.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
            <Badge variant="secondary" className="shrink-0">
              {RESEARCH_REF_LABELS[r.ref_type] ?? r.ref_type}
            </Badge>
            <a href={r.url} target="_blank" rel="noreferrer"
              className="flex min-w-0 flex-1 items-center gap-1 hover:underline">
              <span className="truncate">{r.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            </a>
            {r.days_active != null && (
              <span className="shrink-0 font-mono text-xs text-lumens-green">
                {r.days_active}d activo
              </span>
            )}
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-lumens-red"
              onClick={() => onDelete(r.id)} disabled={isPending}
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
            Agregar evidencia
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva evidencia</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="ref_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(RESEARCH_REF_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="days_active" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días corriendo (ads)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" {...field}
                        value={(field.value as number | undefined) ?? ""} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="url" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="engagement_notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Engagement (likes, views, comentarios)</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
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
