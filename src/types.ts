export interface Receipt {
  id: string
  date: string
  merchant: string
  amount: number
  category: string
  notes: string
}

export const CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Utilities",
  "Housing",
  "Health",
  "Other",
] as const
