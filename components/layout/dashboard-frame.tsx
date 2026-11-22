"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { PageTransition } from "@/components/layout/page-transition"

export function DashboardFrame({ sidebar, topbar, children }: {
  sidebar: ReactNode
  topbar: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  if (pathname === "/torre") return children

  return (
    <div className="ambient flex min-h-screen bg-background">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <main className="flex-1 p-4 md:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
