"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const TABS = [
  { label: "Resumen", href: "/contabilidad" },
  { label: "Ingresos", href: "/contabilidad/ingresos" },
  { label: "Gastos", href: "/contabilidad/gastos" },
  { label: "Reportes", href: "/contabilidad/reportes" },
]

export function ContabilidadNav() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
