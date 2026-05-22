import { useEffect, useRef } from "react"
import type { Receipt } from "../types"
import { formatCurrency } from "../utils"
import { X, Store, Download, Calendar, Tag, DollarSign, FileText } from "lucide-react"

interface ReceiptDetailModalProps {
  receipt: Receipt
  currency?: string
  onClose: () => void
}

export default function ReceiptDetailModal({ receipt, currency, onClose }: ReceiptDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [onClose])

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `receipt-${receipt.date}-${receipt.merchant.replace(/\s+/g, "-").toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-sm animate-scale-in">
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Receipt Details</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-center pb-3 border-b border-gray-50">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(receipt.amount, currency)}</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{receipt.merchant}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Date</p>
                <p className="text-sm font-medium text-gray-800">{receipt.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Category</p>
                <span className="inline-block text-xs font-medium bg-violet-50 text-violet-700 px-2.5 py-0.5 rounded-full">
                  {receipt.category}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Amount</p>
                <p className="text-sm font-semibold text-gray-800">{formatCurrency(receipt.amount, currency)}</p>
              </div>
            </div>

            {receipt.notes && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Notes</p>
                  <p className="text-sm text-gray-700">{receipt.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleDownload}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-violet-600 hover:to-indigo-700 transition-all duration-150 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download JSON
          </button>
          <button
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-all duration-150 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
