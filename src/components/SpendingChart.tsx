import { useMemo } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import type { Receipt } from "../types"
import { CATEGORIES } from "../types"
import type { PieLabelRenderProps } from "recharts"

const COLORS = [
  "#6366f1", "#f43f5e", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#78716c",
]

interface SpendingChartProps {
  receipts: Receipt[]
}

export default function SpendingChart({ receipts }: SpendingChartProps) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of receipts) {
      map.set(r.category, (map.get(r.category) || 0) + r.amount)
    }
    return CATEGORIES.map((c) => ({ name: c, value: map.get(c) || 0 })).filter((d) => d.value > 0)
  }, [receipts])

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
        </div>
        <p className="text-xs text-gray-400">Add receipts to see your spending breakdown</p>
      </div>
    )
  }

  const renderLabel = (props: PieLabelRenderProps) => {
    const { name, percent } = props
    return `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          cornerRadius={4}
          label={renderLabel}
          labelLine={{ stroke: "#d1d5db", strokeWidth: 1 }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, "Spent"]}
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            fontSize: "13px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
