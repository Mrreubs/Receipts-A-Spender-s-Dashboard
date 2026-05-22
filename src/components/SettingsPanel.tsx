import { useState, useRef } from "react"
import type { AppSettings, Receipt } from "../types"
import { CURRENCIES, DEFAULT_CATEGORIES } from "../types"
import { formatCurrency, getMergedCategories, validateReceipt } from "../utils"
import { DollarSign, Plus, X, Download, Upload, Trash2, AlertTriangle } from "lucide-react"

interface SettingsPanelProps {
  settings: AppSettings
  onSettingsChange: (s: AppSettings) => void
  receipts: Receipt[]
  onImport: (data: Receipt[]) => void
  onClear: () => void
}

export default function SettingsPanel({ settings, onSettingsChange, receipts, onImport, onClear }: SettingsPanelProps) {
  const [newCat, setNewCat] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const allCategories = getMergedCategories(settings)

  const update = (partial: Partial<AppSettings>) => {
    onSettingsChange({ ...settings, ...partial })
  }

  const addCategory = () => {
    const trimmed = newCat.trim()
    if (!trimmed || allCategories.includes(trimmed)) return
    update({ customCategories: [...settings.customCategories, trimmed] })
    setNewCat("")
  }

  const removeCategory = (cat: string) => {
    update({ customCategories: settings.customCategories.filter((c) => c !== cat) })
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(receipts, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `receipts-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(data) || !data.every(validateReceipt)) throw new Error("Invalid")
        onImport(data as Receipt[])
      } catch {
        alert("Invalid file format. Please upload a valid JSON file exported from this app.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const total = receipts.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-gray-700">Currency</h2>
        </div>
        <select
          value={settings.currency}
          onChange={(e) => update({ currency: e.target.value })}
          className="w-full max-w-xs px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all duration-150 appearance-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-2">
          Preview: {formatCurrency(1234.56, settings.currency)}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-gray-700">Categories</h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {allCategories.map((cat) => {
            const isDefault = DEFAULT_CATEGORIES.includes(cat as typeof DEFAULT_CATEGORIES[number])
            return (
              <span
                key={cat}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  isDefault
                    ? "bg-gray-100 text-gray-600"
                    : "bg-violet-50 text-violet-700"
                }`}
              >
                {cat}
                {!isDefault && (
                  <button
                    onClick={() => removeCategory(cat)}
                    className="text-violet-400 hover:text-violet-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            )
          })}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New category name"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
            className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all duration-150 placeholder:text-gray-400"
          />
          <button
            onClick={addCategory}
            className="px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-violet-600 hover:to-indigo-700 transition-all duration-150 cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Download className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-gray-700">Data</h2>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all duration-150 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all duration-150 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 transition-all duration-150 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Clear All ({receipts.length} receipt{receipts.length !== 1 ? "s" : ""}, {formatCurrency(total, settings.currency)})
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="w-3 h-3" />
                Sure?
              </span>
              <button
                onClick={() => { onClear(); setShowConfirm(false) }}
                className="px-3 py-2 bg-red-600 text-white rounded-xl text-xs font-medium hover:bg-red-700 transition-all duration-150 cursor-pointer"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-200 transition-all duration-150 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
