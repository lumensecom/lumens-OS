"use client"

import { useTransition } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Target, Calculator, Sparkles } from "lucide-react"

import { updateSettings } from "@/app/(dashboard)/configuracion/actions"
import { settingsSchema, type SettingsInput } from "@/lib/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"

export function SettingsForm({ defaultValues }: { defaultValues: SettingsInput }) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema) as unknown as Resolver<SettingsInput>,
    defaultValues,
  })

  function onSubmit(values: SettingsInput) {
    startTransition(async () => {
      const res = await updateSettings(values)
      if (res?.error) toast.error(res.error)
      else toast.success("Configuración guardada")
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Metas del mes
            </CardTitle>
            <CardDescription>
              Utilidad neta mensual objetivo (COP) — mueven las barras del dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {([
              ["meta_a", "Meta A"],
              ["meta_b", "Meta B"],
            ] as const).map(([name, label]) => (
              <FormField key={name} control={form.control} name={name} render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" {...field}
                      value={(field.value as number | undefined) ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-primary" />
              Costeo por defecto
            </CardTitle>
            <CardDescription>
              Valores precargados al crear un producto nuevo
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {([
              ["default_shipping_cost", "Flete por defecto"],
              ["default_admin_cost", "Costo admin por defecto"],
              ["default_price_rule_pct", "Regla de precio (%)"],
            ] as const).map(([name, label]) => (
              <FormField key={name} control={form.control} name={name} render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" {...field}
                      value={(field.value as number | undefined) ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Contexto de marca para la AI
            </CardTitle>
            <CardDescription>
              Todo lo que escribas aquí se le pasa a la AI en cada conversación del AI Studio
              (tono, productos estrella, promesas de marca, ciudades donde más vendes…)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField control={form.control} name="ai_brand_context" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    rows={5}
                    placeholder="Ej: LUMENS vende gadgets de hogar y belleza a mujeres 25-45 en Colombia. Tono cercano, directo, sin tecnicismos. Siempre destacar pago contra entrega y envío gratis…"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar configuración
        </Button>
      </form>
    </Form>
  )
}
