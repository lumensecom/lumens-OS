import { SidebarNav } from "@/components/layout/sidebar-nav"
import type { Profile } from "@/lib/types"

/** Sidebar fijo para desktop (oculto en mobile — ahí se usa el Sheet del Topbar). */
export function Sidebar({ profile }: { profile: Profile | null }) {
  return (
    <aside className="hidden w-[264px] shrink-0 border-r border-border/70 bg-gradient-to-b from-lumens-beige to-[hsl(40_40%_97%)] dark:from-card dark:to-[hsl(240_6%_10%)] md:block">
      <div className="sticky top-0 h-screen">
        <SidebarNav profile={profile} />
      </div>
    </aside>
  )
}
