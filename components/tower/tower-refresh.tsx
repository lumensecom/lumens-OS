"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function TowerRefresh() {
  const router = useRouter()
  useEffect(() => {
    const refreshVisible = () => { if (!document.hidden) router.refresh() }
    const timer = window.setInterval(refreshVisible, 5_000)
    document.addEventListener("visibilitychange", refreshVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", refreshVisible)
    }
  }, [router])
  return null
}
