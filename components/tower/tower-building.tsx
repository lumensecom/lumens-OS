"use client"

import { useRef, useState, type CSSProperties, type PointerEvent } from "react"
import { ArrowUpRight, DoorOpen, RotateCcw, RotateCw } from "lucide-react"

import styles from "./tower-building.module.css"

type OfficeStatus = "idle" | "running" | "success" | "waiting" | "blocked" | "error"

type Office = {
  code: string
  name: string
  status: OfficeStatus
}

type Floor = { code: string; label: string; offices: Office[] }

type TowerBuildingProps = {
  floors: Floor[]
  selectedCode: string | null
  onSelect: (code: string) => void
  onLobby: () => void
  lighting: "night" | "day"
  zoom: boolean
}

const officeStatus: Record<OfficeStatus, string> = {
  idle: "En espera",
  running: "En ejecución",
  success: "Completada",
  waiting: "Por aprobar",
  blocked: "Con bloqueo",
  error: "Con error",
}

const roomColors = [
  ["#8684e6", "#ad95f5"],
  ["#589fbb", "#88c6d6"],
  ["#b57d68", "#d6a882"],
  ["#8975bf", "#da9dc4"],
  ["#75a28f", "#97d3bf"],
]

function Workstation({ palette, running }: { palette: string[]; running: boolean }) {
  return (
    <span className={styles.workstation} aria-hidden="true" data-running={running}
      style={{ "--shirt": palette[0], "--screen-light": palette[1] } as CSSProperties}>
      <span className={styles.person}>
        <span className={styles.head} />
        <span className={styles.body} />
      </span>
      <span className={styles.desk}>
        <span className={styles.monitor} />
        <span className={styles.keyboard} />
      </span>
      <span className={styles.plant}><span /></span>
    </span>
  )
}

export function TowerBuilding({ floors, selectedCode, onSelect, onLobby, lighting, zoom }: TowerBuildingProps) {
  const [angle, setAngle] = useState(-22)
  const [dragging, setDragging] = useState(false)
  const gesture = useRef<{ x: number; angle: number; moved: boolean; id: number } | null>(null)
  const preventClick = useRef(false)
  const rotate = (value: number) => setAngle(Math.max(-35, Math.min(35, value)))
  const lobbyIndex = floors.length
  const floorIndex = floors.findIndex((floor) => floor.offices.some((office) => office.code === selectedCode))

  function startOrbit(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return
    preventClick.current = false
    gesture.current = { x: event.clientX, angle, moved: false, id: event.pointerId }
  }

  function moveOrbit(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current
    if (!current || current.id !== event.pointerId) return
    const distance = event.clientX - current.x
    if (!current.moved && Math.abs(distance) < 6) return
    if (!current.moved) {
      current.moved = true
      preventClick.current = true
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    rotate(current.angle + distance * .25)
  }

  function endOrbit(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id !== event.pointerId) return
    gesture.current = null
    setDragging(false)
  }

  return (
    <div className={styles.viewport} data-lighting={lighting} data-zoom={zoom}>
      <div className={styles.stage}
        data-dragging={dragging}
        style={{ "--lift-stop": floorIndex < 0 ? lobbyIndex : floorIndex, "--orbit-angle": `${angle}deg` } as CSSProperties}
        onPointerDown={startOrbit}
        onPointerMove={moveOrbit}
        onPointerUp={endOrbit}
        onPointerCancel={endOrbit}
        onLostPointerCapture={endOrbit}
        onClickCapture={(event) => {
          if (preventClick.current && event.detail > 0) {
            event.stopPropagation()
            preventClick.current = false
          }
        }}
      >
        <div className={styles.sky} aria-hidden="true">
          <span className={styles.stars} />
          <span className={styles.skyglow} />
          <span className={`${styles.city} ${styles.cityLeft}`} />
          <span className={`${styles.city} ${styles.cityRight}`} />
          <span className={styles.ground} />
          <span className={styles.shadow} />
        </div>
        <div className={styles.building} role="group" aria-label="Edificio interactivo LUMENS">
          <div className={styles.roof} aria-hidden="true"><span /></div>
          <div className={styles.terrace} aria-hidden="true" />
          <div className={styles.side} aria-hidden="true">
            {Array.from({ length: floors.length + 1 }, (_, index) => (
              <span className={styles.sideFloor} key={index}>
                <span className={styles.sideRail} />
              </span>
            ))}
            <span className={styles.liftShaft}>
              <span className={styles.lift} />
            </span>
          </div>
          <div className={`${styles.side} ${styles.sideLeft}`} aria-hidden="true">
            {Array.from({ length: floors.length + 1 }, (_, index) => (
              <span className={styles.sideFloor} key={index}><span className={styles.sideRail} /></span>
            ))}
          </div>
          <div className={styles.front}>
            <div className={styles.sign} aria-hidden="true">
              <span className={styles.mark} />
              <span>LUMENS</span>
            </div>
            {floors.map((floor, index) => (
              <div className={styles.floor} key={floor.code} role="group" aria-label={`${floor.code} · ${floor.label}`}>
                <span className={styles.floorCode} aria-hidden="true">{floor.code}</span>
                <div className={styles.rooms}>
                  {floor.offices.map((office, officeIndex) => (
                    <button
                      type="button"
                      key={office.code}
                      className={styles.office}
                      data-status={office.status}
                      aria-pressed={selectedCode === office.code}
                      aria-label={`${office.code} · ${office.name} · ${officeStatus[office.status]}`}
                      title={office.name}
                      onClick={() => onSelect(office.code)}
                    >
                      <Workstation palette={roomColors[(index + officeIndex) % roomColors.length]} running={office.status === "running"} />
                      <span className={styles.glazing} aria-hidden="true" />
                      <span className={styles.roomLabel}>
                        <span className={styles.status} />
                        <span className={styles.roomName}>{office.name}</span>
                      </span>
                      <ArrowUpRight className={styles.roomArrow} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className={`${styles.floor} ${styles.lobby}`}>
              <span className={styles.floorCode} aria-hidden="true"><DoorOpen size={14} /></span>
              <button type="button" className={styles.lobbyButton} onClick={onLobby}>
                <span className={styles.reception} aria-hidden="true"><span /></span>
                <span className={styles.lobbyDoors} aria-hidden="true" />
                <span className={styles.lobbyName}>Lobby <ArrowUpRight size={13} aria-hidden="true" /></span>
              </button>
            </div>
          </div>
          <div className={styles.plinth} aria-hidden="true" />
        </div>
      </div>
      <div className={styles.camera} aria-label="Controles de cámara 3D">
        <span>Arrastra para girar</span>
        <button type="button" aria-label="Girar a la izquierda" onClick={() => rotate(angle - 15)} disabled={angle <= -35}><RotateCcw size={15} /></button>
        <button type="button" aria-label="Restablecer cámara" onClick={() => rotate(-22)}>3D</button>
        <button type="button" aria-label="Girar a la derecha" onClick={() => rotate(angle + 15)} disabled={angle >= 35}><RotateCw size={15} /></button>
      </div>
    </div>
  )
}

export default TowerBuilding
