import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { TOOLS, TOOL_ACCENT } from "@/lib/tools"
import { cn } from "@/lib/utils"

/** Menú visual del hub: tarjetas para saltar a cada herramienta. */
export function ToolLauncher() {
  return (
    <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {TOOLS.map((tool) => {
        const accent = TOOL_ACCENT[tool.accent]
        const Icon = tool.icon
        const inner = (
          <>
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                accent.wash,
              )}
            />
            <div className="relative flex items-start gap-3">
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
                  accent.chip,
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate font-display text-sm font-bold">{tool.label}</h3>
                  {tool.soon ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      pronto
                    </span>
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {tool.description}
                </p>
              </div>
            </div>
          </>
        )

        const base = cn(
          "group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_-16px_rgb(0_0_0/0.18)] transition-all duration-200 dark:border-white/10",
          tool.soon
            ? "cursor-default opacity-70"
            : cn("hover:-translate-y-1 hover:border-primary/40", accent.glow),
        )

        return tool.soon ? (
          <div key={tool.href} className={base}>{inner}</div>
        ) : (
          <Link key={tool.href} href={tool.href} className={base}>{inner}</Link>
        )
      })}
    </div>
  )
}
