import { cn } from "@/lib/utils"
import { SEMAFORO_LABELS, type Semaforo } from "@/lib/campanas"

const DOT: Record<Semaforo, string> = {
  green: "bg-lumens-green",
  yellow: "bg-primary",
  red: "bg-lumens-red",
  none: "bg-muted-foreground/40",
}

const TEXT: Record<Semaforo, string> = {
  green: "text-lumens-green",
  yellow: "text-[hsl(43_90%_38%)] dark:text-primary",
  red: "text-lumens-red",
  none: "text-muted-foreground",
}

/** Semáforo LUMENS: punto de color + etiqueta según CPA vs margen. */
export function SemaforoBadge({ value }: { value: Semaforo }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", TEXT[value])}>
      <span className={cn("h-2 w-2 rounded-full", DOT[value], value === "red" && "animate-pulse")} />
      {SEMAFORO_LABELS[value]}
    </span>
  )
}
