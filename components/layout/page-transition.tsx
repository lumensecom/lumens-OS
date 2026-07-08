"use client"

import { usePathname } from "next/navigation"

/** Envuelve el contenido de página con una animación de entrada al navegar. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div
      key={pathname}
      className="duration-300 ease-out animate-in fade-in slide-in-from-bottom-2"
    >
      {children}
    </div>
  )
}
