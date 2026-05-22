const fs = require("fs")
const path = require("path")

const receipts = JSON.parse(fs.readFileSync(path.join(__dirname, "fake-receipts.json"), "utf-8"))

console.log("=== FAKE DATA ANALYSIS ===")
console.log(`Total receipts: ${receipts.length}`)

// Category breakdown
const byCat = {}
for (const r of receipts) {
  byCat[r.category] = (byCat[r.category] || 0) + r.amount
}
console.log("\n=== BY CATEGORY (totals) ===")
for (const [cat, total] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: $${total.toFixed(2)}`)
}

// Total
const total = receipts.reduce((s, r) => s + r.amount, 0)
console.log(`\nGrand total: $${total.toFixed(2)}`)
console.log(`Average per receipt: $${(total / receipts.length).toFixed(2)}`)
console.log(`Categories used: ${Object.keys(byCat).length}`)

// Highest
const maxR = receipts.reduce((m, r) => r.amount > m.amount ? r : m)
console.log(`Highest: $${maxR.amount.toFixed(2)} at ${maxR.merchant}`)

// Filter analysis (today = May 22 2026)
const now = new Date("2026-05-22")

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const monday = getMonday(now)
const thisWeekStart = new Date(monday)
const thisWeekEnd = new Date(monday)
thisWeekEnd.setDate(thisWeekEnd.getDate() + 6)
thisWeekEnd.setHours(23, 59, 59, 999)

const lastWeekStart = new Date(monday)
lastWeekStart.setDate(lastWeekStart.getDate() - 7)
const lastWeekEnd = new Date(monday)
lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)
lastWeekEnd.setHours(23, 59, 59, 999)

const thisWeek = receipts.filter(r => {
  const d = new Date(r.date)
  return d >= thisWeekStart && d <= thisWeekEnd
})
const lastWeek = receipts.filter(r => {
  const d = new Date(r.date)
  return d >= lastWeekStart && d <= lastWeekEnd
})

console.log(`\n=== FILTER ANALYSIS (today = May 22, 2026) ===`)
console.log(`This week (${thisWeekStart.toISOString().slice(0,10)} to ${thisWeekEnd.toISOString().slice(0,10)}): ${thisWeek.length} receipts, $${thisWeek.reduce((s,r) => s + r.amount, 0).toFixed(2)}`)
console.log(`Last week (${lastWeekStart.toISOString().slice(0,10)} to ${lastWeekEnd.toISOString().slice(0,10)}): ${lastWeek.length} receipts, $${lastWeek.reduce((s,r) => s + r.amount, 0).toFixed(2)}`)

// 7-day window
const last7Days = []
for (let i = 6; i >= 0; i--) {
  const d = new Date(now)
  d.setDate(d.getDate() - i)
  last7Days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
}

console.log(`\n=== DAILY CHART (7-day window) ===`)
for (const date of last7Days) {
  const dayTotal = receipts.filter(r => r.date === date).reduce((s, r) => s + r.amount, 0)
  const count = receipts.filter(r => r.date === date).length
  console.log(`  ${date}: $${dayTotal.toFixed(2)} (${count} receipts)`)
}

// Sort by date desc for ReceiptList
const sorted = [...receipts].sort((a, b) => new Date(b.date) - new Date(a.date))
console.log(`\n=== RECEIPT LIST (top 5 by date) ===`)
for (const r of sorted.slice(0, 5)) {
  console.log(`  ${r.date} | ${r.merchant.padEnd(18)} | $${r.amount.toFixed(2).padStart(7)} | ${r.category}`)
}
console.log(`  ... and ${sorted.length - 5} more`)

// Notes analysis
const withNotes = receipts.filter(r => r.notes).length
console.log(`\nReceipts with notes: ${withNotes}/${receipts.length}`)
