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

process.stdout.write(JSON.stringify(receipts, null, 2))
