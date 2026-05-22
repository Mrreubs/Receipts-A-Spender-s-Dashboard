import { useCallback, useEffect, useState } from "react"
import type { Receipt, WeekFilter } from "./types"
import { CATEGORIES } from "./types"
import { useLocalStorage } from "./hooks/useLocalStorage"
import { filterReceipts, formatCurrency, normalizeReceipts } from "./utils"
import ReceiptForm from "./components/ReceiptForm"
import ReceiptList from "./components/ReceiptList"
import SpendingChart from "./components/SpendingChart"
import DailyChart from "./components/DailyChart"
import Sidebar from "./components/Sidebar"
import ToastContainer, { toast } from "./components/ToastContainer"
import { Wallet, ReceiptText, TrendingUp, Tags, ArrowUpRight, CalendarDays } from "lucide-react"

function StatCard({ icon: Icon, label, value, sub }: {
  icon: typeof Wallet
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [rawReceipts, setReceipts, clearReceipts] = useLocalStorage<Receipt[]>("receipts", [], toast)
  const [filter, setFilter] = useState<WeekFilter>("this-week")

  const [receipts, setNormalized] = useState<Receipt[]>(() => normalizeReceipts(rawReceipts))

  useEffect(() => {
    setNormalized(normalizeReceipts(rawReceipts))
  }, [rawReceipts])

  const addReceipt = useCallback(
    (r: Receipt) => setReceipts((prev) => [...prev, r]),
    [setReceipts],
  )

  const deleteReceipt = useCallback(
    (id: string) => setReceipts((prev) => prev.filter((r) => r.id !== id)),
    [setReceipts],
  )

  const visible = filterReceipts(receipts, filter)
  const total = visible.reduce((s, r) => s + r.amount, 0)
  const categoriesUsed = new Set(visible.map((r) => r.category)).size
  const maxReceipt = visible.length ? Math.max(...visible.map((r) => r.amount)) : 0
  const topMerchant = visible.length
    ? [...visible].sort((a, b) => b.amount - a.amount)[0].merchant
    : "—"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/40 flex">
      <Sidebar receipts={visible} filter={filter} onFilterChange={setFilter} />

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100 lg:pl-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between lg:justify-end">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <ReceiptText className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Receipts</p>
                <p className="text-[10px] text-gray-400 leading-tight">Spender's Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="capitalize">{filter.replace("-", " ")}</span>
              </div>
              <span className="hidden sm:inline text-sm text-gray-400">{visible.length} receipt{visible.length !== 1 ? "s" : ""}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300 hidden sm:inline" />
              <span className="font-semibold text-gray-700">{formatCurrency(total)}</span>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Wallet} label="Total Spent" value={formatCurrency(total)} sub={visible.length ? `${visible.length} receipts` : undefined} />
            <StatCard icon={ReceiptText} label="Receipts" value={`${visible.length}`} sub={visible.length ? `Avg ${formatCurrency(total / visible.length)}` : undefined} />
            <StatCard icon={Tags} label="Categories" value={`${categoriesUsed}`} sub={`of ${CATEGORIES.length}`} />
            <StatCard icon={TrendingUp} label="Highest" value={maxReceipt > 0 ? formatCurrency(maxReceipt) : "—"} sub={topMerchant} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm font-semibold text-gray-700">New Receipt</h2>
            </div>
            <ReceiptForm onAdd={addReceipt} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Tags className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">By Category</h2>
              </div>
              <SpendingChart receipts={visible} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">Daily Spending</h2>
              </div>
              <DailyChart receipts={visible} filter={filter} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <ReceiptList
              receipts={visible}
              onDelete={deleteReceipt}
              onClear={clearReceipts}
            />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
