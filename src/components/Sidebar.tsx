import { useState } from "react"
import {
  LayoutDashboard, ReceiptText, BarChart3, Settings,
  Menu, X, CalendarDays, ChevronLeft, Clock,
} from "lucide-react"
import type { Receipt, WeekFilter } from "../types"
import { CATEGORIES } from "../types"

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, href: "#dashboard" },
  { label: "Receipts", icon: ReceiptText, href: "#receipts" },
  { label: "Analytics", icon: BarChart3, href: "#analytics" },
  { label: "Settings", icon: Settings, href: "#settings" },
]

const FILTERS: { value: WeekFilter; label: string; icon: typeof CalendarDays }[] = [
  { value: "this-week", label: "This Week", icon: CalendarDays },
  { value: "last-week", label: "Last Week", icon: ChevronLeft },
  { value: "all-time", label: "All Time", icon: Clock },
]

interface SidebarProps {
  receipts: Receipt[]
  filter: WeekFilter
  onFilterChange: (f: WeekFilter) => void
}

export default function Sidebar({ receipts, filter, onFilterChange }: SidebarProps) {
  const [open, setOpen] = useState(false)

  const total = receipts.reduce((s, r) => s + r.amount, 0)
  const categoriesUsed = new Set(receipts.map((r) => r.category)).size
  const avg = receipts.length ? total / receipts.length : 0

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-20 lg:hidden w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <Menu className="w-4 h-4 text-gray-600" />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-gray-100 
          flex flex-col transition-transform duration-200 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"} 
          lg:translate-x-0 lg:sticky lg:top-0 lg:z-0`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <ReceiptText className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Receipts</p>
              <p className="text-[10px] text-gray-400 leading-tight">Spender's Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all duration-150"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </a>
          ))}
          <div className="pt-4">
            <p className="px-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Period</p>
            {FILTERS.map((f) => {
              const active = filter === f.value
              return (
                <button
                  key={f.value}
                  onClick={() => { onFilterChange(f.value); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                    active
                      ? "bg-violet-50 text-violet-700"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <f.icon className={`w-4 h-4 ${active ? "text-violet-600" : ""}`} />
                  {f.label}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-gray-100 space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Total spent</span>
            <span className="font-semibold text-gray-800">${total.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Receipts</span>
            <span className="font-semibold text-gray-800">{receipts.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Categories</span>
            <span className="font-semibold text-gray-800">{categoriesUsed} / {CATEGORIES.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Average</span>
            <span className="font-semibold text-gray-800">${avg.toFixed(2)}</span>
          </div>
        </div>
      </aside>
    </>
  )
}
