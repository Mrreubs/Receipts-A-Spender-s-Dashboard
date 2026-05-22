export interface Receipt {
  id: string
  date: string
  merchant: string
  amount: number
  category: string
  notes: string
}

export const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Data",
  "Fun",
  "Other",
] as const

export const CURRENCIES = [
  { code: "USD", label: "US Dollar ($)", locale: "en-US" },
  { code: "EUR", label: "Euro (€)", locale: "de-DE" },
  { code: "GBP", label: "British Pound (£)", locale: "en-GB" },
  { code: "CAD", label: "Canadian Dollar (C$)", locale: "en-CA" },
  { code: "AUD", label: "Australian Dollar (A$)", locale: "en-AU" },
  { code: "JPY", label: "Japanese Yen (¥)", locale: "ja-JP" },
] as const

export interface AppSettings {
  currency: string
  customCategories: string[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  currency: "USD",
  customCategories: [],
}

export type WeekFilter = "this-week" | "last-week" | "all-time"
