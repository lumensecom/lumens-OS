"use client"

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

import { formatCOP } from "@/lib/format"
import type { DailyPoint } from "@/lib/contabilidad"

/** Gráfico de flujo de caja diario: ingresos, gastos y neto. */
export function CashFlowChart({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(8, 10)}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v: number) =>
            v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
          }
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          formatter={(value, name) => [formatCOP(Number(value)), name]}
          labelFormatter={(label) => `Día ${String(label).slice(8, 10)}`}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Bar
          dataKey="ingresos"
          name="Ingresos"
          fill="#22a55b"
          radius={[3, 3, 0, 0]}
          maxBarSize={18}
        />
        <Bar
          dataKey="gastos"
          name="Gastos"
          fill="#ef4444"
          radius={[3, 3, 0, 0]}
          maxBarSize={18}
        />
        <Line
          dataKey="neto"
          name="Neto"
          type="monotone"
          stroke="#F5C518"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
