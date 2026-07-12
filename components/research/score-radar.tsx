"use client"

import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"

type Scores = {
  margin: number
  demand: number
  visual: number
  logistics: number
  competition: number
}

/** Radar de los 5 criterios LUMENS (0-10 cada uno). */
export function ScoreRadar({ scores }: { scores: Scores }) {
  const data = [
    { criterio: "Margen", valor: scores.margin },
    { criterio: "Demanda", valor: scores.demand },
    { criterio: "Visual", valor: scores.visual },
    { criterio: "Logística", valor: scores.logistics },
    { criterio: "Competencia", valor: scores.competition },
  ]

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="criterio"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
        />
        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
        <Radar
          dataKey="valor"
          stroke="#F5C518"
          fill="#F5C518"
          fillOpacity={0.35}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
