import { useEffect, useState } from "react"
import { X } from "lucide-react"

let toastId = 0

export function toast(msg: string) {
  const event = new CustomEvent("toast", { detail: { id: ++toastId, message: msg } })
  window.dispatchEvent(event)
}

export default function ToastContainer() {
  const [items, setItems] = useState<{ id: number; message: string }[]>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const { id, message } = (e as CustomEvent).detail
      setItems((prev) => [...prev, { id, message }])
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
    }
    window.addEventListener("toast", handler)
    return () => window.removeEventListener("toast", handler)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {items.map((t) => (
        <div
          key={t.id}
          className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 shadow-lg flex items-start gap-2 animate-slide-up"
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-red-400 hover:text-red-600 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
