"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { TowerSnapshot } from "@/lib/tower/live"

export function useTowerLive(initial: TowerSnapshot) {
  const [snapshot, setSnapshot] = useState(initial)
  const [connected, setConnected] = useState(true)
  const [checkedAt, setCheckedAt] = useState<number | null>(null)
  const request = useRef<AbortController | null>(null)
  const etag = useRef<string | null>(null)

  const refresh = useCallback(async (force = false) => {
    if (request.current && !force) return
    request.current?.abort()
    const active = new AbortController()
    request.current = active
    const timeout = window.setTimeout(() => active.abort(), 8_000)
    try {
      const headers: HeadersInit = {}
      if (etag.current) headers["If-None-Match"] = etag.current
      const response = await fetch("/api/tower/live", { cache: "no-store", headers, signal: active.signal })
      if (response.status !== 304) {
        if (!response.ok) throw new Error("Tower stream unavailable")
        const next: TowerSnapshot = await response.json()
        if (request.current !== active) return
        etag.current = response.headers.get("ETag")
        setSnapshot(next)
      }
      if (request.current === active) {
        setConnected(true)
        setCheckedAt(Date.now())
      }
    } catch {
      if (request.current === active) setConnected(false)
    } finally {
      window.clearTimeout(timeout)
      if (request.current === active) request.current = null
    }
  }, [])

  useEffect(() => {
    function refreshVisible() {
      if (!document.hidden) void refresh()
    }
    refreshVisible()
    const timer = window.setInterval(refreshVisible, 5_000)
    document.addEventListener("visibilitychange", refreshVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", refreshVisible)
      const active = request.current
      request.current = null
      active?.abort()
    }
  }, [refresh])

  return { snapshot, connected, checkedAt, refresh }
}
