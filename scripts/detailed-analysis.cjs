const fs = require("fs")
const path = require("path")

const receipts = JSON.parse(fs.readFileSync(path.join(__dirname, "fake-receipts.json"), "utf-8"))

// === Helper: toLocalDate ===
function toLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

function getMonday(d) {
  const date = new Date(d)
  const diff = date.getDay() === 0 ? -6 : 1 - date.getDay()
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

// Use local date for "now" to match app behavior
const now = new Date()
const todayLocal = toLocalDate(now)
const todayMidnight = new Date(todayLocal)

const monday = getMonday(todayMidnight)
const thisWeekStart = new Date(monday)
const thisWeekEnd = new Date(monday); thisWeekEnd.setDate(thisWeekEnd.getDate() + 6); thisWeekEnd.setHours(23,59,59,999)

const lastWeekStart = new Date(monday); lastWeekStart.setDate(lastWeekStart.getDate() - 7)
const lastWeekEnd = new Date(monday); lastWeekEnd.setDate(lastWeekEnd.getDate() - 1); lastWeekEnd.setHours(23,59,59,999)

// === FILTERS ===
const thisWeek = receipts.filter(r => {
  const d = new Date(r.date)
  d.setHours(0,0,0,0)
  return d >= thisWeekStart && d <= thisWeekEnd
})

const lastWeek = receipts.filter(r => {
  const d = new Date(r.date)
  d.setHours(0,0,0,0)
  return d >= lastWeekStart && d <= lastWeekEnd
})

function analyze(label, arr) {
  const total = arr.reduce((s,r) => s+r.amount, 0)
  const byCat = {}
  for (const r of arr) {
    byCat[r.category] = (byCat[r.category] || 0) + r.amount
  }
  const maxR = arr.length ? arr.reduce((m,r) => r.amount > m.amount ? r : m) : null
  console.log(`\n=== ${label} ===`)
  console.log(`Count: ${arr.length}, Total: $${total.toFixed(2)}, Avg: $${arr.length ? (total/arr.length).toFixed(2) : '—'}`)
  console.log(`Categories: ${Object.keys(byCat).length} — ${Object.keys(byCat).join(', ')}`)
  console.log(`Highest: $${maxR ? maxR.amount.toFixed(2) : '—'} ${maxR ? `(${maxR.merchant}, ${maxR.category})` : ''}`)
  console.log(`By category:`)
  for (const [c, a] of Object.entries(byCat).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${c}: $${a.toFixed(2)} (${(a/total*100).toFixed(0)}%)`)
  }
  // Sorted by date desc
  const sorted = [...arr].sort((a,b) => new Date(b.date) - new Date(a.date))
  console.log(`\nReceipts (newest first):`)
  for (const r of sorted) {
    console.log(`  ${r.date} | $${r.amount.toFixed(2).padStart(7)} | ${r.merchant.padEnd(18)} | ${r.category}`)
  }
}

analyze("THIS WEEK", thisWeek)
analyze("LAST WEEK", lastWeek)
analyze("ALL TIME", receipts)

// 7-day window for DailyChart
console.log(`\n=== DAILY CHART (7-day window, all-time data) ===`)
const last7Days = []
for (let i = 6; i >= 0; i--) {
  const d = new Date(todayMidnight)
  d.setDate(d.getDate() - i)
  last7Days.push(toLocalDate(d))
}
for (const date of last7Days) {
  const total = receipts.filter(r => r.date === date).reduce((s,r) => s+r.amount,0)
  const items = receipts.filter(r => r.date === date).map(r => `${r.merchant} $${r.amount.toFixed(2)}`)
  console.log(`  ${date}: $${total.toFixed(2)} — ${items.join(', ')}`)
}
