"use client"

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

import { formatCOP } from "@/lib/format"

export type ChartPoint = {
  date: string
  cpa: number | null
  roas: number | null
  conversions: number
}

/** Evolución diaria de CPA (línea), ROAS (línea) y conversiones (barras). */
export function CampaignChart({
  data,
  cpaMax,
}: {
  data: ChartPoint[]
  cpaMax: number | null
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => String(d).slice(8, 10)}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="cpa"
          tickFormatter={(v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v))}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <YAxis
          yAxisId="roas"
          orientation="right"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <Tooltip
          formatter={(value, name) => {
            if (name === "CPA") return [formatCOP(Number(value)), name]
            if (name === "ROAS") return [`${Number(value).toFixed(2)}x`, name]
            return [String(value), name]
          }}
          labelFormatter={(label) => `Día ${String(label).slice(8, 10)}`}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          yAxisId="roas"
          dataKey="conversions"
          name="Conversiones"
          fill="hsl(var(--muted-foreground))"
          opacity={0.25}
          radius={[3, 3, 0, 0]}
          maxBarSize={14}
        />
        <Line
          yAxisId="cpa"
          dataKey="cpa"
          name="CPA"
          type="monotone"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        {cpaMax !== null && (
          <Line
            yAxisId="cpa"
            dataKey={() => cpaMax}
            name="CPA máx. rentable"
            stroke="#F5C518"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            dot={false}
            legendType="plainline"
          />
        )}
        <Line
          yAxisId="roas"
          dataKey="roas"
          name="ROAS"
          type="monotone"
          stroke="#22a55b"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
