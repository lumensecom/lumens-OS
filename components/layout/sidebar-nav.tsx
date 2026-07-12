"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { APP_NAME, NAV_MAIN, NAV_SOON, type NavItem } from "@/lib/constants"
import { Separator } from "@/components/ui/separator"
import type { Profile } from "@/lib/types"

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.soon && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          pronto
        </span>
      )}
    </>
  )

  const className = cn(
    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
    active
      ? "bg-primary/15 font-semibold text-foreground shadow-sm before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-primary"
      : "text-muted-foreground hover:translate-x-0.5 hover:bg-muted hover:text-foreground",
    item.soon && "pointer-events-none opacity-60",
  )

  if (item.soon) {
    return <div className={className}>{content}</div>
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  )
}

export function SidebarNav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const roleLabel = profile?.role === "owner" ? "Owner" : "Colaborador"
  const displayName =
    profile?.full_name || profile?.email?.split("@")[0] || "Usuario"

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="px-2 py-2">
        <span className="font-display text-lg font-extrabold tracking-tight">
          {APP_NAME}
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_MAIN.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
          />
        ))}

        <Separator className="my-2" />

        {NAV_SOON.map((item) => (
          <NavLink key={item.href} item={item} active={false} />
        ))}
      </nav>

      <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
        </div>
      </div>
    </div>
  )
}
