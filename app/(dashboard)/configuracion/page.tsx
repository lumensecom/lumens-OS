import { CheckCircle2, CircleDashed, Plug } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { fetchSettings } from "@/lib/settings-queries"
import type { Profile } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsForm } from "@/components/configuracion/settings-form"
import { ProfileCard } from "@/components/configuracion/profile-card"

export const metadata = { title: "Configuración · LUMENS OS" }

type IntegrationStatus = {
  name: string
  detail: string
  configured: boolean
  badge?: string
}

export default async function ConfiguracionPage() {
  const supabase = createClient()
  const [
    {
      data: { user },
    },
    settings,
  ] = await Promise.all([supabase.auth.getUser(), fetchSettings()])

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    profile = data
  }

  // Solo presencia de env vars (nunca sus valores).
  const integrations: IntegrationStatus[] = [
    {
      name: "Supabase",
      detail: "Base de datos, auth y storage",
      configured: true,
    },
    {
      name: "AI (Claude · Anthropic)",
      detail: "AI Studio: hooks, landings, Liquid y análisis de imágenes",
      configured: Boolean(process.env.ANTHROPIC_API_KEY),
      badge: "ANTHROPIC_API_KEY",
    },
    {
      name: "Dropi (webhook)",
      detail: "Recibe pedidos en POST /api/webhooks/dropi",
      configured: Boolean(process.env.DROPI_WEBHOOK_SECRET),
      badge: "DROPI_WEBHOOK_SECRET",
    },
    {
      name: "Shopify",
      detail: "Webhook de pedidos (Fase 2)",
      configured: false,
      badge: "próximamente",
    },
    {
      name: "Meta / TikTok Ads",
      detail: "Sync automático de métricas (Fase 2) — hoy: CSV en Campañas",
      configured: false,
      badge: "próximamente",
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Configuración</h2>
        <p className="text-sm text-muted-foreground">
          Administra tu cuenta, las metas, el costeo por defecto y las integraciones
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <SettingsForm
          defaultValues={{
            meta_a: Number(settings.meta_a),
            meta_b: Number(settings.meta_b),
            default_shipping_cost: Number(settings.default_shipping_cost),
            default_admin_cost: Number(settings.default_admin_cost),
            default_price_rule_pct: Number(settings.default_price_rule_pct),
            ai_brand_context: settings.ai_brand_context ?? "",
          }}
        />

        <div className="space-y-5">
          <ProfileCard profile={profile} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plug className="h-4 w-4 text-primary" />
                Integraciones
              </CardTitle>
              <CardDescription>
                Estado de las conexiones externas (las llaves van en las env vars de Vercel)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {integrations.map((i) => (
                <div key={i.name} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {i.configured ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lumens-green" />
                    ) : (
                      <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium leading-tight">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{i.detail}</p>
                    </div>
                  </div>
                  <Badge variant={i.configured ? "default" : "secondary"} className="shrink-0">
                    {i.configured ? "Conectada" : i.badge ?? "Pendiente"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
