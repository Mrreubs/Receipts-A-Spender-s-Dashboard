import { useEffect, useRef } from "react"
import type { Receipt } from "../types"
import { formatCurrency } from "../utils"
import { X, Printer, Download } from "lucide-react"

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

  const handlePrint = () => {
    const printWin = window.open("", "_blank")
    if (!printWin) { window.print(); return }
    printWin.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: 'Courier New', monospace; margin: 0; padding: 24px; display: flex; justify-content: center; background: #f5f5f5; }
        .receipt { width: 320px; background: #fff; padding: 32px 24px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { text-align: center; font-size: 20px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 3px; }
        .store { text-align: center; font-size: 14px; font-weight: bold; margin: 0 0 16px; }
        hr { border: none; border-top: 1px dashed #999; margin: 12px 0; }
        .row { display: flex; justify-content: space-between; font-size: 13px; margin: 6px 0; }
        .label { color: #666; }
        .amount { text-align: center; font-size: 28px; font-weight: bold; margin: 16px 0; }
        .footer { text-align: center; font-size: 11px; color: #999; margin-top: 16px; }
        .notes { font-size: 12px; color: #555; margin: 8px 0; padding: 8px; background: #fafafa; border-radius: 4px; }
        @media print { body { background: #fff; padding: 0; } .receipt { box-shadow: none; } }
      </style>
      </head><body>
      <div class="receipt">
        <h1>Receipt</h1>
        <p class="store">${receipt.merchant}</p>
        <hr>
        <div class="row"><span class="label">Date</span><span>${receipt.date}</span></div>
        <div class="row"><span class="label">Category</span><span>${receipt.category}</span></div>
        ${receipt.notes ? `<div class="notes">${receipt.notes}</div>` : ""}
        <hr>
        <div class="amount">${formatCurrency(receipt.amount, currency)}</div>
        <hr>
        <div class="footer">Thank you for your patronage!</div>
      </div>
      <script>window.print();</script>
      </body></html>
    `)
    printWin.document.close()
  }

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
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Receipt</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-5 space-y-3">
            <div className="text-center border-b border-dashed border-gray-200 pb-3">
              <p className="text-lg font-bold text-gray-900">{receipt.merchant}</p>
              <p className="text-xs text-gray-400 mt-0.5">{receipt.date}</p>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Category</span>
              <span className="font-medium text-gray-700 bg-gray-50 px-2.5 py-0.5 rounded-full text-xs">{receipt.category}</span>
            </div>

            {receipt.notes && (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 italic">
                "{receipt.notes}"
              </div>
            )}

            <div className="border-t border-dashed border-gray-200 pt-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Total</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(receipt.amount, currency)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-violet-600 hover:to-indigo-700 transition-all duration-150 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-all duration-150 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-100 transition-all duration-150 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
