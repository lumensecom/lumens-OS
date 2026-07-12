"use client"

import { usePathname } from "next/navigation"
import { Menu, LogOut } from "lucide-react"

import { NAV_MAIN, NAV_SOON, NAV_SYSTEM } from "@/lib/constants"
import { logout } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import type { Profile } from "@/lib/types"

function currentTitle(pathname: string): string {
  const all = [...NAV_MAIN, ...NAV_SOON, ...NAV_SYSTEM]
  const match = all.find((i) =>
    i.href === "/" ? pathname === "/" : pathname.startsWith(i.href),
  )
  return match?.label ?? "Dashboard"
}

export function Topbar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const title = currentTitle(pathname)
  const displayName =
    profile?.full_name || profile?.email?.split("@")[0] || "Usuario"

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      {/* Menú móvil */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[280px] bg-lumens-beige p-0 dark:bg-card"
        >
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SidebarNav profile={profile} />
        </SheetContent>
      </Sheet>

      <h1 className="font-display text-base font-bold tracking-tight">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="truncate text-sm font-medium">
                  {displayName}
                </span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {profile?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
