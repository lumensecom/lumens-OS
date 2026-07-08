"use client"

import { useTransition } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { createCampaign } from "@/app/(dashboard)/campanas/actions"
import {
  campaignSchema,
  type CampaignInput,
  CAMPAIGN_PLATFORMS,
  PLATFORM_LABELS,
} from "@/lib/campanas"
import { STATUS_LABELS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProductOption } from "@/components/contabilidad/add-revenue-dialog"

export function NewCampaignForm({ products }: { products: ProductOption[] }) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema) as unknown as Resolver<CampaignInput>,
    defaultValues: {
      name: "",
      platform: "meta",
      product_id: "none",
      status: "testing",
      daily_budget: undefined,
      external_id: "",
      started_at: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  })

  function onSubmit(values: CampaignInput) {
    startTransition(async () => {
      const res = await createCampaign(values)
      // Si tiene éxito redirige al detalle; solo llegamos aquí con error.
      if (res?.error) toast.error(res.error)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Ej: AlivioPro - Hombres regalando - CBO" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plataforma</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CAMPAIGN_PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PLATFORM_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(["testing", "active", "paused"] as const).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="product_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Producto (define el semáforo de CPA)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? "none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguno" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="daily_budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Presupuesto diario (COP)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    {...field}
                    value={(field.value as number | undefined) ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="started_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de inicio</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="external_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID externo (Meta/TikTok, opcional)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear campaña
        </Button>
      </form>
    </Form>
  )
}
