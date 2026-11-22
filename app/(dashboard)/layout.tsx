import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { DashboardFrame } from "@/components/layout/dashboard-frame"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // El middleware ya protege estas rutas; esto es una guarda extra.
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <DashboardFrame sidebar={<Sidebar profile={profile} />} topbar={<Topbar profile={profile} />}>
      {children}
    </DashboardFrame>
  )
}
