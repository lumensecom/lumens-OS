import { SidebarNav } from "@/components/layout/sidebar-nav"
import type { Profile } from "@/lib/types"

/** Sidebar fijo para desktop (oculto en mobile — ahí se usa el Sheet del Topbar). */
export function Sidebar({ profile }: { profile: Profile | null }) {
  return (
    <aside className="hidden w-[280px] shrink-0 border-r bg-lumens-beige dark:bg-card md:block">
      <div className="sticky top-0 h-screen">
        <SidebarNav profile={profile} />
      </div>
    </aside>
  )
}
