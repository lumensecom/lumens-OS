"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import { BUCKET_COLORS, BUCKET_LABELS, type WeeklyPoint } from "@/lib/dropi"

/** Barras apiladas: pedidos por semana divididos por estado. */
export function WeeklyChart({ data }: { data: WeeklyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="week"
          tickFormatter={(d) => format(parseISO(String(d)), "d MMM", { locale: es })}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={30}
          allowDecimals={false}
        />
        <Tooltip
          labelFormatter={(label) =>
            `Semana del ${format(parseISO(String(label)), "d 'de' MMMM", { locale: es })}`
          }
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="delivered" stackId="s" name={BUCKET_LABELS.delivered} fill={BUCKET_COLORS.delivered} maxBarSize={40} />
        <Bar dataKey="in_transit" stackId="s" name={BUCKET_LABELS.in_transit} fill={BUCKET_COLORS.in_transit} maxBarSize={40} />
        <Bar dataKey="pending" stackId="s" name={BUCKET_LABELS.pending} fill={BUCKET_COLORS.pending} maxBarSize={40} />
        <Bar
          dataKey="returned"
          stackId="s"
          name={BUCKET_LABELS.returned}
          fill={BUCKET_COLORS.returned}
          maxBarSize={40}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
