import type { Receipt, WeekFilter, AppSettings } from "./types"
import { DEFAULT_CATEGORIES, CURRENCIES } from "./types"

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export function getFilterBounds(filter: WeekFilter): { start: Date; end: Date } {
  const now = new Date()
  const monday = getMonday(now)

  if (filter === "this-week") {
    const end = new Date(monday)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start: monday, end }
  }

  if (filter === "last-week") {
    const start = new Date(monday)
    start.setDate(start.getDate() - 7)
    const end = new Date(monday)
    end.setDate(end.getDate() - 1)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  return {
    start: new Date(0),
    end: new Date(8640000000000000),
  }
}

export function isInRange(dateStr: string, start: Date, end: Date): boolean {
  const d = new Date(dateStr)
  return d >= start && d <= end
}

export function getLast7Days(): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push(toLocalDate(d))
  }
  return days
}

export function get7DayWindow(filter: WeekFilter): string[] {
  const now = new Date()
  if (filter === "all-time") return getLast7Days()

  const monday = getMonday(now)
  if (filter === "last-week") monday.setDate(monday.getDate() - 7)

  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    days.push(toLocalDate(d))
  }
  return days
}

export function filterReceipts(receipts: Receipt[], filter: WeekFilter): Receipt[] {
  const bounds = getFilterBounds(filter)
  return receipts.filter((r) => isInRange(r.date, bounds.start, bounds.end))
}

export function formatCurrency(amount: number, currencyCode?: string): string {
  const currency = CURRENCIES.find((c) => c.code === (currencyCode ?? "USD")) ?? CURRENCIES[0]
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
  }).format(amount)
}

const CURRENCY_LOCALE_CACHE = new Map<string, string>()
function decimalSepForCurrency(currencyCode: string): string {
  if (CURRENCY_LOCALE_CACHE.has(currencyCode)) return CURRENCY_LOCALE_CACHE.get(currencyCode)!
  const c = CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0]
  const sep = (1.1).toLocaleString(c.locale).replace(/[\d\s]/g, "").trim().charAt(0) || "."
  CURRENCY_LOCALE_CACHE.set(currencyCode, sep)
  return sep
}

export function parseAmount(input: string, currencyCode: string = "USD"): number {
  let s = input.replace(/[^0-9,.-]/g, "")
  if (!s) return 0

  const dec = decimalSepForCurrency(currencyCode)

  if (dec === ",") {
    s = s.replace(/\./g, "").replace(",", ".")
  } else {
    s = s.replace(/,/g, "")
  }

  const val = parseFloat(s)
  return Number.isNaN(val) ? 0 : val
}

export function getMergedCategories(settings: AppSettings): string[] {
  return [...DEFAULT_CATEGORIES, ...settings.customCategories]
}

export function normalizeCategory(cat: string, settings: AppSettings): string {
  const all = getMergedCategories(settings)
  return all.includes(cat) ? cat : "Other"
}

export function normalizeReceipts(receipts: Receipt[], settings: AppSettings): Receipt[] {
  return receipts.map((r) => ({ ...r, category: normalizeCategory(r.category, settings) }))
}

export function validateReceipt(r: unknown): r is Receipt {
  if (!r || typeof r !== "object") return false
  const obj = r as Record<string, unknown>
  return (
    typeof obj.id === "string" &&
    typeof obj.merchant === "string" &&
    typeof obj.amount === "number" && !Number.isNaN(obj.amount) &&
    typeof obj.category === "string" &&
    typeof obj.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(obj.date) &&
    typeof obj.notes === "string"
  )
}
