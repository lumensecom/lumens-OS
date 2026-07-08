"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"

import { upsertMetric } from "@/app/(dashboard)/campanas/actions"
import { metricSchema, type MetricInput } from "@/lib/campanas"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const numberField = (
  label: string,
  name: keyof MetricInput,
  placeholder = "0",
) => ({ label, name, placeholder })

const FIELDS = [
  numberField("Gasto (COP)", "spend"),
  numberField("Impresiones", "impressions"),
  numberField("Clics", "clicks"),
  numberField("Conversiones", "conversions"),
]

/** Alta/edición manual de la métrica de un día (upsert por fecha). */
export function DailyMetricsDialog({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<MetricInput>({
    resolver: zodResolver(metricSchema) as unknown as Resolver<MetricInput>,
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      spend: undefined,
      impressions: undefined,
      clicks: undefined,
      conversions: undefined,
      roas: undefined,
      notes: "",
    },
  })

  function onSubmit(values: MetricInput) {
    startTransition(async () => {
      const res = await upsertMetric(campaignId, values)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Métricas del día guardadas")
      setOpen(false)
      form.reset({ ...form.getValues(), spend: undefined, impressions: undefined, clicks: undefined, conversions: undefined })
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Métricas del día
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar métricas diarias</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <FormField
                  key={f.name}
                  control={form.control}
                  name={f.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{f.label}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder={f.placeholder}
                          {...field}
                          value={(field.value as number | undefined) ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              CPA, CTR y CPM se calculan automáticamente. El ROAS se estima con
              el precio del producto vinculado.
            </p>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
