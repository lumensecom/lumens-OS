import { Wallet } from "lucide-react"

import { ModulePlaceholder } from "@/components/module-placeholder"

export default function ContabilidadPage() {
  return (
    <ModulePlaceholder
      icon={Wallet}
      title="Contabilidad"
      description="Ingresos, gastos, utilidad neta y flujo de caja diario. Se implementa en el Sprint 2."
    />
  )
}
