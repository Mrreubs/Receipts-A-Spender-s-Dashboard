import type { Receipt, WeekFilter } from "./types"
import { CATEGORIES } from "./types"

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
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
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
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export function filterReceipts(receipts: Receipt[], filter: WeekFilter): Receipt[] {
  const bounds = getFilterBounds(filter)
  return receipts.filter((r) => isInRange(r.date, bounds.start, bounds.end))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9,.-]/g, "").replace(",", ".")
  const val = parseFloat(cleaned)
  return Number.isNaN(val) ? 0 : val
}

export function normalizeCategory(cat: string): string {
  return CATEGORIES.includes(cat as typeof CATEGORIES[number]) ? cat : "Other"
}

export function normalizeReceipts(receipts: Receipt[]): Receipt[] {
  return receipts.map((r) => ({ ...r, category: normalizeCategory(r.category) }))
}
