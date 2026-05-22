const fs = require("fs")
const path = require("path")

const receipts = JSON.parse(fs.readFileSync(path.join(__dirname, "fake-receipts.json"), "utf-8"))

console.log(JSON.stringify({ receiptCount: receipts.length }))

const byCat = {}
for (const r of receipts) {
  byCat[r.category] = (byCat[r.category] || 0) + r.amount
}
const total = receipts.reduce((s, r) => s + r.amount, 0)
const catsUsed = Object.keys(byCat).length
const maxR = receipts.reduce((m, r) => r.amount > m.amount ? r : m)

// This week / last week
const now = new Date("2026-05-22")
function getMonday(d) {
  const date = new Date(d)
  const diff = date.getDay() === 0 ? -6 : 1 - date.getDay()
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}
const twMon = getMonday(now)
const twEnd = new Date(twMon); twEnd.setDate(twEnd.getDate() + 6); twEnd.setHours(23,59,59,999)
const lwStart = new Date(twMon); lwStart.setDate(lwStart.getDate() - 7)
const lwEnd = new Date(twMon); lwEnd.setDate(lwEnd.getDate() - 1); lwEnd.setHours(23,59,59,999)

const tw = receipts.filter(r => { const d = new Date(r.date); return d >= twMon && d <= twEnd })
const lw = receipts.filter(r => { const d = new Date(r.date); return d >= lwStart && d <= lwEnd })

// 7-day window
const last7Days = []
for (let i = 6; i >= 0; i--) {
  const d = new Date(now)
  d.setDate(d.getDate() - i)
  last7Days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`)
}

const daily = []
for (const date of last7Days) {
  daily.push({ date, total: receipts.filter(r => r.date === date).reduce((s, r) => s + r.amount, 0) })
}

// Top merchant
const topM = receipts.reduce((m, r) => r.amount > m.amount ? r : m)

// Chart order by amount descending
const catSorted = Object.entries(byCat).sort((a, b) => b[1] - a[1])

console.log(JSON.stringify({
  total,
  avg: total / receipts.length,
  catsUsed,
  cats: catSorted.map(([c, a]) => ({ name: c, amount: Math.round(a * 100) / 100, pct: Math.round(a / total * 100) })),
  highest: { amount: maxR.amount, merchant: maxR.merchant, category: maxR.category },
  thisWeek: { count: tw.length, total: Math.round(tw.reduce((s, r) => s + r.amount, 0) * 100) / 100 },
  lastWeek: { count: lw.length, total: Math.round(lw.reduce((s, r) => s + r.amount, 0) * 100) / 100 },
  dailyChart: daily.map(d => ({ ...d, total: Math.round(d.total * 100) / 100 })),
  sortedByDate: [...receipts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3).map(r => ({ date: r.date, merchant: r.merchant, amount: r.amount })),
}), null, 2)
