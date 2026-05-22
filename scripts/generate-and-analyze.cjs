const fs = require("fs")
const path = require("path")
const { v4 } = require("../node_modules/uuid/dist-node/index.js")

const MERCHANTS = {
  Food: ["Whole Foods", "Chipotle", "Starbucks", "Pizza Hut", "Subway", "Local Diner", "Sushi Bar", "Taco Stand", "Pasta House", "Juice Bar", "Bakery Fresh", "KFC", "McDonald's", "Deli Counter", "Thai Kitchen"],
  Transport: ["Shell Gas", "Exxon", "Uber Ride", "Metro Card", "Parking Meter", "Lyft", "Amtrak", "BP Gas", "City Bus", "Toll Road"],
  Data: ["Netflix", "Spotify", "AWS Hosting", "GitHub Sponsors", "Phone Bill", "iCloud Storage", "VPN Service", "Domain Renewal", "Adobe CC", "Internet Provider"],
  Fun: ["Movie Theater", "Mini Golf", "Concert Tickets", "Bowling Alley", "Arcade Zone", "Escape Room", "Museum Entry", "Zoo Admission", "Comedy Club", "Book Store"],
  Other: ["Walmart", "Target", "Home Depot", "Pharmacy", "Laundry Mat", "Post Office", "Hardware Store", "Gift Shop", "Thrift Store", "Office Max"],
}

const CATEGORY_WEIGHTS = [
  { cat: "Food", w: 0.34 },
  { cat: "Transport", w: 0.22 },
  { cat: "Fun", w: 0.18 },
  { cat: "Data", w: 0.16 },
  { cat: "Other", w: 0.10 },
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function weightedCategory() {
  const r = Math.random()
  let acc = 0
  for (const { cat, w } of CATEGORY_WEIGHTS) {
    acc += w
    if (r < acc) return cat
  }
  return "Other"
}

function randomAmount(category) {
  const ranges = {
    Food: [3, 60],
    Transport: [2.5, 45],
    Fun: [5, 120],
    Data: [2, 100],
    Other: [3, 250],
  }
  const [lo, hi] = ranges[category] || [5, 50]
  const raw = lo + Math.random() * (hi - lo)
  return Math.round(raw * 100) / 100
}

function randomDate(daysBack) {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const NOTES_OPTIONS = ["", "", "", "Quick lunch", "Weekly groceries", "Monthly sub", "Birthday gift", "Office supplies", "Date night", "Refill", ""]

const receipts = []
for (let i = 0; i < 50; i++) {
  const cat = weightedCategory()
  const merchant = pick(MERCHANTS[cat])
  receipts.push({
    id: v4(),
    merchant,
    amount: randomAmount(cat),
    category: cat,
    date: randomDate(30),
    notes: pick(NOTES_OPTIONS),
  })
}

fs.writeFileSync(path.join(__dirname, "fake-receipts.json"), JSON.stringify(receipts, null, 2))
console.log(`Wrote ${receipts.length} receipts to fake-receipts.json`)

// === ANALYSIS ===
const byCat = {}
for (const r of receipts) {
  byCat[r.category] = (byCat[r.category] || 0) + r.amount
}
const total = receipts.reduce((s, r) => s + r.amount, 0)
const maxR = receipts.reduce((m, r) => r.amount > m.amount ? r : m)

console.log("\n=== DASHBOARD PREDICTIONS ===")
console.log(`Total receipts: ${receipts.length}`)
console.log(`Grand total: $${total.toFixed(2)}`)
console.log(`Average: $${(total / receipts.length).toFixed(2)}`)
console.log(`Categories used: ${Object.keys(byCat).length}`)
console.log(`Highest: $${maxR.amount.toFixed(2)} (${maxR.merchant}, ${maxR.category})`)

console.log("\nBy category:")
const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1])
for (const [cat, amt] of sorted) {
  console.log(`  ${cat}: $${amt.toFixed(2)} (${(amt/total*100).toFixed(1)}%)`)
}

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

console.log(`\nThis week (${twMon.toISOString().slice(0,10)}–${twEnd.toISOString().slice(0,10)}): ${tw.length} receipts, $${tw.reduce((s,r)=>s+r.amount,0).toFixed(2)}`)
console.log(`Last week (${lwStart.toISOString().slice(0,10)}–${lwEnd.toISOString().slice(0,10)}): ${lw.length} receipts, $${lw.reduce((s,r)=>s+r.amount,0).toFixed(2)}`)

// Daily breakdown
const last7Days = []
for (let i = 6; i >= 0; i--) {
  const d = new Date(now)
  d.setDate(d.getDate() - i)
  last7Days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`)
}
console.log("\nDaily chart bars:")
let anyNonZero = false
for (const date of last7Days) {
  const total = receipts.filter(r => r.date === date).reduce((s, r) => s + r.amount, 0)
  const count = receipts.filter(r => r.date === date).length
  if (total > 0) anyNonZero = true
  console.log(`  ${date}: $${total.toFixed(2)} (${count} receipts)`)
}
if (!anyNonZero) console.log("  → Empty state: 'No spending in this period' expected")
