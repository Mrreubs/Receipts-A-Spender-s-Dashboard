import { useCallback, useEffect, useState } from "react"
import type { Receipt, WeekFilter, AppSettings } from "./types"
import { DEFAULT_SETTINGS } from "./types"
import { useLocalStorage } from "./hooks/useLocalStorage"
import { filterReceipts, formatCurrency, normalizeReceipts, getMergedCategories } from "./utils"
import ReceiptForm from "./components/ReceiptForm"
import ReceiptList from "./components/ReceiptList"
import SpendingChart from "./components/SpendingChart"
import DailyChart from "./components/DailyChart"
import Sidebar from "./components/Sidebar"
import SettingsPanel from "./components/SettingsPanel"
import ToastContainer, { toast } from "./components/ToastContainer"
import { Wallet, ReceiptText, TrendingUp, Tags, ArrowUpRight, CalendarDays } from "lucide-react"
import Logo from "./components/Logo"

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

export type View = "dashboard" | "receipts" | "analytics" | "settings"

export default function App() {
  const [rawReceipts, setReceipts, clearReceipts] = useLocalStorage<Receipt[]>("receipts", [], toast)
  const [settings, setSettings] = useLocalStorage<AppSettings>("settings", DEFAULT_SETTINGS, toast)
  const [filter, setFilter] = useState<WeekFilter>("this-week")
  const [view, setView] = useState<View>("dashboard")

  const [receipts, setNormalized] = useState<Receipt[]>(() => normalizeReceipts(rawReceipts, settings))

  useEffect(() => {
    setNormalized(normalizeReceipts(rawReceipts, settings))
  }, [rawReceipts, settings])

  const addReceipt = useCallback(
    (r: Receipt) => setReceipts((prev) => [...prev, r]),
    [setReceipts],
  )

  const deleteReceipt = useCallback(
    (id: string) => setReceipts((prev) => prev.filter((r) => r.id !== id)),
    [setReceipts],
  )

  const importReceipts = useCallback(
    (data: Receipt[]) => setReceipts(data),
    [setReceipts],
  )

  const allCategories = getMergedCategories(settings)
  const visible = filterReceipts(receipts, filter)
  const total = view === "receipts"
    ? receipts.reduce((s, r) => s + r.amount, 0)
    : visible.reduce((s, r) => s + r.amount, 0)
  const displayed = view === "receipts" ? receipts : visible
  const categoriesUsed = new Set(displayed.map((r) => r.category)).size
  const maxReceipt = displayed.length ? Math.max(...displayed.map((r) => r.amount)) : 0
  const topMerchant = displayed.length
    ? displayed.reduce((max, r) => r.amount > max.amount ? r : max).merchant
    : "—"
  const showFilter = view !== "receipts"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/40 flex">
      <Sidebar receipts={displayed} filter={filter} onFilterChange={setFilter} view={view} onViewChange={setView} currency={settings.currency} totalCategories={allCategories.length} />

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100 lg:pl-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between lg:justify-end">
            <div className="lg:hidden">
              <Logo size={32} showText />
            </div>
            <div className="flex items-center gap-3 ml-auto">
              {showFilter && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span className="capitalize">{filter.replace("-", " ")}</span>
                </div>
              )}
              <span className="hidden sm:inline text-sm text-gray-400">{displayed.length} receipt{displayed.length !== 1 ? "s" : ""}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300 hidden sm:inline" />
              <span className="font-semibold text-gray-700">{formatCurrency(total, settings.currency)}</span>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
          {view === "dashboard" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Wallet} label="Total Spent" value={formatCurrency(total, settings.currency)} sub={displayed.length ? `${displayed.length} receipts` : undefined} />
                <StatCard icon={ReceiptText} label="Receipts" value={`${displayed.length}`} sub={displayed.length ? `Avg ${formatCurrency(total / displayed.length, settings.currency)}` : undefined} />
                <StatCard icon={Tags} label="Categories" value={`${categoriesUsed}`} sub={`of ${allCategories.length}`} />
                <StatCard icon={TrendingUp} label="Highest" value={maxReceipt > 0 ? formatCurrency(maxReceipt, settings.currency) : "—"} sub={topMerchant} />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-700">New Receipt</h2>
                </div>
                <ReceiptForm onAdd={addReceipt} categories={allCategories} currency={settings.currency} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Tags className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-700">By Category</h2>
                  </div>
                  <SpendingChart receipts={displayed} currency={settings.currency} />
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-700">Daily Spending</h2>
                  </div>
                  <DailyChart receipts={displayed} filter={filter} currency={settings.currency} />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <ReceiptList
                  receipts={displayed}
                  onDelete={deleteReceipt}
                  onClear={clearReceipts}
                  currency={settings.currency}
                />
              </div>
            </>
          )}

          {view === "receipts" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <ReceiptList
                receipts={receipts}
                onDelete={deleteReceipt}
                onClear={clearReceipts}
                currency={settings.currency}
              />
            </div>
          )}

          {view === "analytics" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Tags className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-700">By Category</h2>
                  </div>
                  <SpendingChart receipts={receipts} currency={settings.currency} />
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-700">Daily Spending</h2>
                  </div>
                  <DailyChart receipts={receipts} filter="all-time" currency={settings.currency} />
                </div>
              </div>
            </>
          )}

          {view === "settings" && (
            <SettingsPanel
              settings={settings}
              onSettingsChange={setSettings}
              receipts={receipts}
              onImport={importReceipts}
              onClear={clearReceipts}
            />
          )}
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
