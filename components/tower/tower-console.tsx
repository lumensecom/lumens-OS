"use client"

import Link from "next/link"
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Building2,
  CalendarClock, Clock3, DoorOpen, Inbox, Maximize, Minimize, Moon, Play,
  Sun, ZoomIn, ZoomOut,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { executeRoutine } from "@/app/(dashboard)/torre/actions"
import { RunDetails } from "@/components/tower/run-details"
import { TowerBuilding } from "@/components/tower/tower-building"
import { towerNavigation } from "@/components/tower/tower-frame"
import { useTowerLive } from "@/components/tower/use-tower-live"
import type { TowerSnapshot } from "@/lib/tower/live"
import { floors } from "@/lib/tower/model"
import { formatRunTime, nextRunTime, runMessage, statusLabels } from "@/lib/tower/presentation"
import styles from "./tower-console.module.css"

const shortTime = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  hour: "2-digit", minute: "2-digit", hour12: false,
})

const liveTime = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
})

type OfficeStatus = keyof typeof statusLabels

function Signal({ status }: { status: OfficeStatus }) {
  return <span aria-hidden="true" className={styles.signal} data-status={status} />
}

function Brand() {
  return (
    <Link className={styles.brand} href="/torre" aria-label="LUMENS OS · Torre">
      <span className={styles.brandMark} aria-hidden="true"><Building2 size={19} strokeWidth={1.65} /></span>
      <span>LUMENS<span className={styles.brandSuffix}> OS</span></span>
    </Link>
  )
}

export function TowerConsole({ initial, localPreview }: { initial: TowerSnapshot; localPreview: boolean }) {
  const { snapshot, connected, checkedAt, refresh } = useTowerLive(initial)
  const [selectedCode, setSelectedCode] = useState<string | null>(initial.agents.find((agent) => agent.code === "0")?.code ?? initial.agents[0]?.code ?? null)
  const [lighting, setLighting] = useState<"night" | "day">("night")
  const [zoom, setZoom] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [fallbackExpansion, setFallbackExpansion] = useState(false)
  const [runningCode, setRunningCode] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ agentCode: string; message: string; ok: boolean } | null>(null)
  const building = useRef<HTMLElement>(null)
  const inspector = useRef<HTMLElement>(null)

  useEffect(() => {
    function syncFullscreen() {
      setExpanded(document.fullscreenElement === building.current)
    }
    function closeExpanded(event: KeyboardEvent) {
      if (event.key === "Escape") setFallbackExpansion(false)
    }
    document.addEventListener("fullscreenchange", syncFullscreen)
    document.addEventListener("keydown", closeExpanded)
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen)
      document.removeEventListener("keydown", closeExpanded)
    }
  }, [])

  const selected = snapshot.agents.find((agent) => agent.code === selectedCode)
  const activeRoutine = snapshot.routines.find((routine) => routine.code === runningCode)
  const runsByRoutine = new Map(snapshot.latestRuns.map((run) => [run.routine_code, run]))
  const latestByAgent = new Map<string, TowerSnapshot["latestRuns"][number]>()
  for (const routine of snapshot.routines) {
    const run = runsByRoutine.get(routine.code)
    const previous = latestByAgent.get(routine.agent_code)
    if (run && (!previous || Date.parse(run.started_at) > Date.parse(previous.started_at))) latestByAgent.set(routine.agent_code, run)
  }
  const pendingAgents = new Set(
    snapshot.approvals.flatMap((approval) => approval.kind === "landing" ? ["3B"] : approval.kind === "opportunity" ? ["2A"] : []),
  )
  function officeStatus(code: string): OfficeStatus {
    if (activeRoutine?.agent_code === code) return "running"
    if (pendingAgents.has(code)) return "waiting"
    return latestByAgent.get(code)?.status ?? "idle"
  }

  const sceneFloors = floors.map(([code, label]) => ({
    code, label,
    offices: snapshot.agents.filter((agent) => agent.floor === code)
      .map((agent) => ({ code: agent.code, name: agent.name, status: officeStatus(agent.code) })),
  }))
  const brief = runsByRoutine.get("brief")
  const selectedRoutines = snapshot.routines.filter((routine) => routine.agent_code === selected?.code)
  const selectedRun = selected && latestByAgent.get(selected.code)
  const stats = [
    { label: "Oficinas", value: snapshot.counts.agents, Icon: DoorOpen, tone: "lavender" },
    { label: "Rutinas programadas", value: snapshot.counts.scheduled, Icon: CalendarClock, tone: "gold" },
    { label: "Por aprobar", value: snapshot.counts.approvals, Icon: Inbox, tone: "amber", href: "/torre/lobby" },
    { label: "Alertas abiertas", value: snapshot.counts.alerts, Icon: Bell, tone: "rose", href: "/torre/lobby" },
  ]

  function selectOffice(code: string) {
    setSelectedCode(code)
    if (window.matchMedia("(max-width: 900px)").matches && !document.fullscreenElement && !fallbackExpansion) {
      inspector.current?.focus()
    }
  }

  async function toggleFullscreen() {
    if (fallbackExpansion) {
      setFallbackExpansion(false)
    } else if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      try {
        if (!building.current?.requestFullscreen) throw new Error("Fullscreen unavailable")
        await building.current.requestFullscreen()
      } catch {
        setFallbackExpansion(true)
      }
    }
  }

  async function runRoutine(code: string, agentCode: string) {
    setFeedback(null)
    setRunningCode(code)
    const form = new FormData()
    form.set("code", code)
    try {
      const result = await executeRoutine({ ok: false, message: "" }, form)
      await refresh(true)
      setFeedback({ agentCode, ...result })
    } catch {
      setFeedback({ agentCode, ok: false, message: "No se pudo conectar con la rutina." })
    } finally {
      setRunningCode(null)
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Brand />
          <nav className={styles.nav} aria-label="Navegación de la torre">
            {towerNavigation.map(({ href, label, Icon }) => (
              <Link className={styles.navLink} href={href} key={href} aria-current={href === "/torre" ? "page" : undefined}>
                <Icon aria-hidden="true" size={16} />{label}
              </Link>
            ))}
          </nav>
          <Link href="/resumen" className={styles.overviewLink}>Resumen <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </div>
      </header>

      <main className={styles.main}>
        <header className={styles.heading}>
          <div>
            <h1>Torre de <em>agentes</em></h1>
            <p>Abre una oficina para ver su actividad y ejecutar una rutina.</p>
          </div>
          <div className={styles.sync}>
            {localPreview && <span className={styles.demo}>Demo local</span>}
            <span className={styles.live} data-connected={connected} role="status" title="Se actualiza cada cinco segundos mientras la pestaña está visible">
              <i aria-hidden="true" />{connected ? "En vivo" : "Reconectando"}
            </span>
            {checkedAt && <time className={styles.clock} dateTime={new Date(checkedAt).toISOString()} title="Última sincronización (hora de Bogotá)"><Clock3 size={13} aria-hidden="true" />{liveTime.format(checkedAt)} COT</time>}
          </div>
        </header>

        <div className={styles.metrics}>
          {stats.map(({ label, value, Icon, tone, href }) => {
            const contents = <>
              <div className={styles.metricIcon} data-tone={tone}><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></div>
              <div className={styles.metricValue}><strong>{value}</strong><span>{label}</span></div>
              {href && <ArrowUpRight size={14} className={styles.metricArrow} aria-hidden="true" />}
            </>
            return href
              ? <Link href={href} key={label} className={styles.metric}>{contents}</Link>
              : <div key={label} className={styles.metric}>{contents}</div>
          })}
        </div>

        <div className={styles.workspace}>
          <section className={styles.stage} data-expanded={fallbackExpansion} ref={building} aria-label="Edificio LUMENS">
            <div className={styles.stageToolbar}>
              <h2><Building2 size={19} strokeWidth={1.65} aria-hidden="true" />Edificio LUMENS</h2>
              {(expanded || fallbackExpansion) && selected && (
                <span className={styles.fullSelection}><Signal status={officeStatus(selected.code)} />{selected.name}</span>
              )}
              <div className={styles.stageActions}>
                <button type="button" onClick={() => setLighting(lighting === "night" ? "day" : "night")} aria-label={lighting === "night" ? "Cambiar a modo día" : "Cambiar a modo noche"}>
                  {lighting === "night" ? <Moon size={15} /> : <Sun size={15} />}
                  <span>{lighting === "night" ? "Noche" : "Día"}</span>
                </button>
                <button type="button" onClick={() => setZoom(!zoom)} aria-pressed={zoom} aria-label={zoom ? "Alejar edificio" : "Acercar edificio"}>
                  {zoom ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                  <span>{zoom ? "Alejar" : "Acercar"}</span>
                </button>
                <button type="button" onClick={() => void toggleFullscreen()} aria-label={expanded || fallbackExpansion ? "Salir de pantalla completa" : "Pantalla completa"}>
                  {expanded || fallbackExpansion ? <Minimize size={15} /> : <Maximize size={15} />}
                </button>
              </div>
            </div>

            <div className={styles.scene}>
              <TowerBuilding
                floors={sceneFloors}
                selectedCode={selectedCode}
                onSelect={selectOffice}
                onLobby={() => { window.location.assign("/torre/lobby") }}
                lighting={lighting}
                zoom={zoom}
              />
            </div>

            <div className={styles.legend} aria-label="Estados de oficina">
              <span><Signal status="running" />En ejecución</span>
              <span><Signal status="waiting" />Por aprobar</span>
              <span><Signal status="success" />Completada</span>
              <span><Signal status="idle" />En espera</span>
              <span><Signal status="blocked" />Con bloqueo</span>
              <span><Signal status="error" />Con error</span>
            </div>
          </section>

          <aside className={styles.side}>
            <section className={styles.inspector} ref={inspector} tabIndex={-1} aria-label="Oficina seleccionada">
              {selected ? (
                <>
                  <div className={styles.officeTop}>
                    <div className={styles.officeId}><span>{selected.code}</span>{selected.floor === "PH" ? "Penthouse" : `Piso ${selected.floor}`}</div>
                    <span className={styles.officeStatus}><Signal status={officeStatus(selected.code)} />{statusLabels[officeStatus(selected.code)]}</span>
                  </div>
                  <h2>{selected.name}</h2>
                  <p className={styles.mission}>{selected.mission}</p>
                  {selectedRun && (
                    <div className={styles.officeLastRun}>
                      <Clock3 size={14} aria-hidden="true" />Última ejecución · {formatRunTime(selectedRun.started_at)}
                      {runMessage(selectedRun.output) && <p>{runMessage(selectedRun.output)}</p>}
                    </div>
                  )}
                  <div className={styles.routines}>
                    <h3>Rutinas</h3>
                    {selectedRoutines.map((routine) => {
                      const next = nextRunTime(routine)
                      const description = !routine.enabled ? "Desactivada"
                        : next ? `Próxima · ${formatRunTime(next)}`
                          : routine.cadence === "event" ? "Por evento" : "Bajo pedido"
                      return (
                        <div key={routine.code} className={styles.routine}>
                          <div><strong>{routine.name}</strong><span>{description}</span></div>
                          {routine.enabled && routine.cadence !== "event" && (
                            <button
                              type="button" className={styles.runButton}
                              disabled={runningCode !== null}
                              aria-label={`Ejecutar ${routine.name}`}
                              onClick={() => void runRoutine(routine.code, selected.code)}
                            >
                              {runningCode === routine.code ? <Activity size={15} className={styles.runningIcon} aria-hidden="true" /> : <Play size={14} fill="currentColor" aria-hidden="true" />}
                            </button>
                          )}
                        </div>
                      )
                    })}
                    {feedback?.agentCode === selected.code && <p role={feedback.ok ? "status" : "alert"} className={styles.feedback} data-ok={feedback.ok}>{feedback.message}</p>}
                  </div>
                  <Link className={styles.panelLink} href={`/torre/agentes/${selected.code}`}>Ver ficha y bitácora <ArrowRight size={15} aria-hidden="true" /></Link>
                </>
              ) : <p className={styles.mission}>Selecciona una oficina.</p>}
            </section>

            <section className={styles.activity} aria-labelledby="tower-activity">
              <div className={styles.activityHeader}>
                <h2 id="tower-activity"><Activity size={17} aria-hidden="true" />Actividad reciente</h2>
                <ArrowDownRight size={16} aria-hidden="true" />
              </div>
              {snapshot.activity.length ? (
                <ul className={styles.feed}>
                  {snapshot.activity.slice(0, 5).map((event) => (
                    <li key={event.id}>
                      <button type="button" onClick={() => selectOffice(event.agentCode)}>
                        <Signal status={event.status} />
                        <div className={styles.feedTask}><strong>{event.routineName}</strong><span>{statusLabels[event.status]} · Oficina {event.agentCode}</span></div>
                        <time dateTime={event.started_at}>{shortTime.format(new Date(event.started_at))}</time>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className={styles.empty}>Las ejecuciones aparecerán aquí cuando empiece la actividad.</p>}
            </section>
          </aside>
        </div>

        <div className={styles.operationDetails}>
          <section className={styles.inspector} aria-labelledby="tower-brief">
            <h3 id="tower-brief">Brief de la mañana</h3>
            {brief?.status === "success" ? (
              <>
                <p className={styles.detailDate}>{formatRunTime(brief.started_at)}</p>
                <RunDetails output={brief.output} />
              </>
            ) : <p className={styles.mission}>El brief se genera a las 7:30 a. m. en hora de Colombia.</p>}
          </section>
          <section className={styles.inspector} aria-labelledby="tower-priorities">
            <h3 id="tower-priorities">Alertas y decisiones</h3>
            {!snapshot.alerts.length && !snapshot.approvals.length && <p className={styles.mission}>El Lobby está al día.</p>}
            <ul className={styles.priorities}>
              {snapshot.alerts.slice(0, 3).map((alert) => (
                <li key={alert.code}><Signal status={alert.severity === "critical" ? "error" : "blocked"} />{alert.message}</li>
              ))}
              {snapshot.approvals.slice(0, 3).map((approval) => (
                <li key={approval.id}><Signal status="waiting" /><Link href={`/torre/lobby#${approval.id}`}>{approval.title}</Link></li>
              ))}
            </ul>
            <Link className={styles.panelLink} href="/torre/lobby">Ir al Lobby <ArrowRight size={15} aria-hidden="true" /></Link>
          </section>
        </div>
      </main>
    </div>
  )
}
