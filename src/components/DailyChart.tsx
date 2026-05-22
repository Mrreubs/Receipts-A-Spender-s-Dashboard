import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import type { Receipt } from "../types"
import type { WeekFilter } from "../types"
import { get7DayWindow, formatCurrency } from "../utils"

interface DailyChartProps {
  receipts: Receipt[]
  filter: WeekFilter
}

export default function DailyChart({ receipts, filter }: DailyChartProps) {
  const days = get7DayWindow(filter)

  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of receipts) {
      map.set(r.date, (map.get(r.date) || 0) + r.amount)
    }
    return days.map((date) => ({
      date,
      label: new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).replace(",", ""),
      total: map.get(date) || 0,
    }))
  }, [receipts, days])

  if (data.every((d) => d.total === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
          <div className="w-5 h-0.5 bg-gray-300 rounded" />
        </div>
        <p className="text-xs text-gray-400">No spending in this period</p>
      </div>
    )
  }

  const maxVal = Math.max(...data.map((d) => d.total), 1)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          domain={[0, maxVal * 1.15]}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v).replace(/\.\d{2}$/, "")}
          width={48}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), "Spent"]}
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            fontSize: "13px",
          }}
        />
        <Bar
          dataKey="total"
          fill="#6366f1"
          radius={[6, 6, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
