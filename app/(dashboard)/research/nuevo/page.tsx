import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ResearchForm } from "@/components/research/research-form"

export default function NuevoResearchPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/research" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Nuevo candidato
          </h2>
          <p className="text-sm text-muted-foreground">
            Puntúa los 5 criterios: el score total se calcula solo
          </p>
        </div>
      </div>
      <ResearchForm />
    </div>
  )
}
