import { BookOpen } from "lucide-react"

import { ModulePlaceholder } from "@/components/module-placeholder"

export default function ConocimientoPage() {
  return (
    <ModulePlaceholder
      icon={BookOpen}
      accent="purple"
      title="Conocimiento"
      description="Base de conocimiento con artículos, categorías y búsqueda. Se implementa en el Sprint 3."
    />
  )
}
