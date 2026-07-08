import { TrendingUp } from "lucide-react"

import { ModulePlaceholder } from "@/components/module-placeholder"

export default function CampanasPage() {
  return (
    <ModulePlaceholder
      icon={TrendingUp}
      accent="blue"
      title="Campañas"
      description="Métricas de campañas Meta y TikTok, semáforo de CPA y subida de CSV. Se implementa en el Sprint 2."
    />
  )
}
