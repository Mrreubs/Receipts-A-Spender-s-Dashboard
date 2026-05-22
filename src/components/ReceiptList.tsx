import type { Receipt } from "../types"
import { Trash2, Store, RotateCcw } from "lucide-react"

interface ReceiptListProps {
  receipts: Receipt[]
  onDelete: (id: string) => void
  onClear: () => void
}

export default function ReceiptList({ receipts, onDelete, onClear }: ReceiptListProps) {
  if (receipts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
          <Store className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">No receipts yet</p>
        <p className="text-xs text-gray-400 mt-1">Add your first receipt above to get started</p>
      </div>
    )
  }

  const sorted = [...receipts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-gray-700">Receipts</h2>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
            {receipts.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">${receipts.reduce((s, r) => s + r.amount, 0).toFixed(2)}</span>
          {receipts.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1 -mr-1">
        {sorted.map((r, i) => (
          <div
            key={r.id}
            className="group flex items-center gap-3 bg-gray-50 hover:bg-gray-100/70 rounded-xl px-4 py-3 transition-all duration-150 animate-slide-up"
            style={{ animationDelay: `${i * 20}ms` }}
          >
            <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
              <Store className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800 truncate">{r.merchant}</span>
                <span className="text-[11px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                  {r.category}
                </span>
              </div>
              {r.notes && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{r.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">${r.amount.toFixed(2)}</p>
                <p className="text-[11px] text-gray-400">{r.date}</p>
              </div>
              <button
                onClick={() => onDelete(r.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
