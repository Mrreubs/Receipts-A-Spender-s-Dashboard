export interface Receipt {
  id: string
  date: string
  merchant: string
  amount: number
  category: string
  notes: string
}

export const CATEGORIES = [
  "Food",
  "Transport",
  "Data",
  "Fun",
  "Other",
] as const

export type WeekFilter = "this-week" | "last-week" | "all-time"
