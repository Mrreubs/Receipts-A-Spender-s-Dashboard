# 01 — Explanation (ELI5)

Every file explained line by line, like you're ten.

---

## `src/types.ts` — The Shape of a Receipt

```ts
export interface Receipt { ... }
```
This is a **blueprint**. It says: every receipt *must* have an id, a date, a merchant name, an amount, a category, and notes. TypeScript enforces this everywhere — if you try to store a receipt without an `id`, the code won't compile.

```ts
export const CATEGORIES = ["Food", "Transport", "Data", "Fun", "Other"] as const
```
A fixed list of categories. `as const` means TypeScript treats this as a list of exact strings, not just `string[]`. This lets us use `"Food"` as a type. Every dropdown, every chart label, every category check draws from this single source.

```ts
export type WeekFilter = "this-week" | "last-week" | "all-time"
```
Three possible filter values. The `|` means "one of these three strings." No other value is valid.

---

## `src/utils.ts` — Pure Date Math

### `getMonday(d)`
Takes any date, returns the **Monday** of that week. It does the math:
- `getDay()` returns 0 (Sun) through 6 (Sat)
- If Sunday (0), go back 6 days to Monday
- Otherwise, go back `day - 1` days
- Then zero out hours/minutes/seconds

This is a **pure function**: same input always gives the same output. No side effects.

### `getFilterBounds(filter)`
Given a filter string, returns `{ start, end }` — two Date objects defining the range.
- **this-week**: Monday 00:00:00 to Sunday 23:59:59 of the current week
- **last-week**: Monday 00:00:00 of 7 days ago to Sunday 23:59:59 of last week
- **all-time**: `new Date(0)` (Jan 1 1970) to the max JS date — effectively everything

### `isInRange(dateStr, start, end)`
Converts a date string (like `"2026-05-22"`) to a Date, then checks `d >= start && d <= end`. Returns `true` or `false`.

### `get7DayWindow(filter)`
Returns an array of 7 date strings `["2026-05-18", "2026-05-19", ...]` depending on the filter:
- **this-week**: the 7 days of the current week (Mon–Sun)
- **last-week**: the 7 days of the previous week
- **all-time**: the 7 most recent calendar days

This is what drives the bar chart x-axis.

### `filterReceipts(receipts, filter)` — The Key Function
```ts
export function filterReceipts(receipts: Receipt[], filter: WeekFilter): Receipt[] {
  const bounds = getFilterBounds(filter)
  return receipts.filter((r) => isInRange(r.date, bounds.start, bounds.end))
}
```
This is a **pure function**: it takes an array and a filter, returns a *new* array. It never changes the original. `Array.filter` creates a copy with only matching items. This is how we avoid mutating state.

---

## `src/hooks/useLocalStorage.ts` — Keeping Data Alive

### Lazy initializer
```ts
const [storedValue, setStoredValue] = useState<T>(() => {
  const item = window.localStorage.getItem(key)
  return item ? JSON.parse(item) : initialValue
})
```
The function passed to `useState` runs **once** when the component mounts. It reads from `localStorage`. If there's data, parse it. If not (or if it fails), use the default value.

### Sync effect
```ts
useEffect(() => {
  window.localStorage.setItem(key, JSON.stringify(storedValue))
}, [key, storedValue])
```
Every time `storedValue` changes, this effect runs and writes the entire array to `localStorage`. This is how data persists across page reloads.

### The `remove` function
```ts
const remove = useCallback(() => {
  window.localStorage.removeItem(key)
  setStoredValue(initialValue)
}, [key, initialValue])
```
Clears `localStorage` and resets state to the initial value. Used by "Clear All" in the receipt list.

### `useCallback`
Wraps `remove` so it doesn't get re-created on every render. This is an optimization.

---

## `src/main.tsx` — The Front Door

```ts
createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
```
React 19's new `createRoot` API. Find the `<div id="root">` in `index.html` (we promise it exists with `!`), render the `App` component inside `StrictMode` (which catches bugs in development).

---

## `src/App.tsx` — The Brain

### State
```ts
const [receipts, setReceipts, clearReceipts] = useLocalStorage<Receipt[]>("receipts", [])
const [filter, setFilter] = useState<WeekFilter>("this-week")
```
Two pieces of state:
1. `receipts` — the master list, persisted to localStorage
2. `filter` — which time period to show, defaults to `"this-week"`

### Derived State (Not Stored, Calculated)
```ts
const visible = filterReceipts(receipts, filter)
```
This calls our pure function. `visible` is **derived state**: it's not stored anywhere, it's recalculated from `receipts` and `filter` every time either changes. React re-runs this on every render.

```ts
const total = visible.reduce((s, r) => s + r.amount, 0)
const categoriesUsed = new Set(visible.map((r) => r.category)).size
const maxReceipt = visible.length ? Math.max(...visible.map((r) => r.amount)) : 0
```
More derived state:
- `total` — sum of all visible amounts, starting at 0
- `categoriesUsed` — count of unique categories in the visible set (using `Set` to deduplicate)
- `maxReceipt` — the single highest expense (with guard for empty array)

### Handlers
```ts
const addReceipt = useCallback(
  (r: Receipt) => setReceipts((prev) => [...prev, r]),
  [setReceipts],
)
```
`useCallback` prevents the function from being recreated on every render. The `setReceipts` updater function uses the **spread operator** `[...prev, r]` which creates a new array with the new receipt appended. The original array is never modified — **immutability**.

```ts
const deleteReceipt = useCallback(
  (id: string) => setReceipts((prev) => prev.filter((r) => r.id !== id)),
  [setReceipts],
)
```
Same pattern: `Array.filter` creates a *new* array with all receipts except the one with the matching id.

### How Data Flows to Charts
```
receipts (master list, localStorage)
  → filterReceipts(receipts, filter) → visible (derived array)
    → SpendingChart gets visible as prop
    → DailyChart gets visible as prop
    → ReceiptList gets visible as prop
```
Each chart component receives the **already-filtered** array. They never see the full list. When the filter changes, React re-renders and every component receives new data.

---

## `src/components/SpendingChart.tsx` — The Donut Chart

### Data transformation
```ts
const data = useMemo(() => {
  const map = new Map<string, number>()
  for (const r of receipts) {
    map.set(r.category, (map.get(r.category) || 0) + r.amount)
  }
  return CATEGORIES.map((c) => ({ name: c, value: map.get(c) || 0 })).filter((d) => d.value > 0)
}, [receipts])
```
`useMemo` only recalculates when `receipts` changes. Inside:
1. Loop through all receipts, building a map: `{ "Food" → 45.50, "Transport" → 12.00 }`
2. Map over CATEGORIES to create an array in *category order* with amounts (or 0 if none)
3. Filter out categories with 0 value so they don't show in the chart

### Rendering
The `Pie` component renders with `innerRadius={60}` (making it a donut) and `paddingAngle={3}` (gaps between segments). Each `Cell` gets a color from a lookup map keyed by category name.

```ts
{data.map((entry) => (
  <Cell key={entry.name} fill={COLORS[entry.name] ?? "#78716c"} />
))}
```

### Empty state
If `data.length === 0`, instead of rendering a broken chart, show a styled empty-state illustration with a message.

---

## `src/components/DailyChart.tsx` — The Bar Chart

### Building the 7-day window
```ts
const days = get7DayWindow(filter)
```
This runs outside `useMemo` because it's cheap. It produces the 7 labels for the x-axis.

### Mapping receipts to days
```ts
const data = useMemo(() => {
  const map = new Map<string, number>()
  for (const r of receipts) {
    map.set(r.date, (map.get(r.date) || 0) + r.amount)
  }
  return days.map((date) => ({
    date,
    label: ...,
    total: map.get(date) || 0,
  }))
}, [receipts, days])
```
Same pattern: loop → map → aggregate. But this time grouped by `date` instead of `category`. Each day in the window gets a `total` — either the sum of that day's expenses or 0.

### Empty state
```ts
if (data.every((d) => d.total === 0)) { ... }
```
If every bar is zero, show the empty state instead of a flat line.

### Bar styles
`radius={[6, 6, 0, 0]}` rounds the top corners. `maxBarSize={48}` prevents bars from being comically wide. The y-axis domain is `[0, maxVal * 1.15]` to give 15% headroom above the tallest bar.

---

## `src/components/ReceiptForm.tsx` — Adding Expenses

Each input is **controlled**: its `value` comes from state, and `onChange` updates state. When submitted:
1. Check required fields are filled
2. Call `onAdd` with a new receipt object (generated UUID, parsed float amount)
3. Reset all fields to defaults (clearing the form)

The category dropdown draws its options from `CATEGORIES` — it will automatically reflect any changes to the categories list.

---

## `src/components/ReceiptList.tsx` — The Scrollable List

### Sorting
```ts
const sorted = [...receipts].sort(...)
```
The spread `[...receipts]` creates a copy before sorting. `Array.sort` mutates in place, so we never sort the original array. **Immutability**.

### Hover-reveal delete
The delete button starts `opacity-0` and becomes `group-hover:opacity-100`. This is pure CSS — no JavaScript hover logic needed.

### Animated entries
Each row gets `animate-slide-up` with an increasing `animationDelay`. This creates a cascading reveal effect.

---

## `src/components/Sidebar.tsx` — Navigation and Summary

### Filter buttons
Three buttons render from `FILTERS` array. The active one gets `bg-violet-50 text-violet-700` highlighting. Clicking calls `onFilterChange`, which flows up to `App.tsx` and updates `filter` state.

### Static nav
Four navigation links (`Dashboard`, `Receipts`, `Analytics`, `Settings`) are hardcoded anchor tags. They don't do anything functional yet — just placeholder navigation.

### Mobile toggle
On screens smaller than `lg`, the sidebar is hidden off-screen (`-translate-x-full`). A hamburger button in the top-left toggles it. A backdrop overlay (`bg-black/20`) closes it when tapped.

### Bottom stats
Total, count, categories, and average are computed from the receipts passed as props. These are **derived statistics** computed on every render.

---

## `src/index.css` — Animations and Tailwind

```css
@import "tailwindcss";
```
Imports the entire Tailwind CSS framework. Vite resolves this via the `@tailwindcss/vite` plugin.

### Custom animations
Four keyframe animations:
- `fadeIn` — opacity 0→1 with 12px upward slide (500ms)
- `slideUp` — opacity 0→1 with 8px upward slide (300ms)
- `scaleIn` — opacity 0→1 with scale 0.95→1 (200ms)
- `pulse-soft` — gentle opacity pulse

These are registered as Tailwind utilities so they can be used as classes like `animate-fade-in`.

---

## `vite.config.ts` — Build Setup

```ts
plugins: [react(), tailwindcss()]
```
Two Vite plugins:
1. `@vitejs/plugin-react` — enables JSX transform and React Refresh (HMR)
2. `@tailwindcss/vite` — processes Tailwind CSS classes, scans your JSX for class names, tree-shakes unused styles

---

## Data Flow Diagram (Simplified)

```
   User fills form
        ↓
   ReceiptForm.onAdd(new receipt)
        ↓
   App: setReceipts(prev => [...prev, r])    ← immutability
        ↓
   localStorage updated via useEffect
        ↓
   App re-renders
        ↓
   visible = filterReceipts(receipts, filter)   ← pure function, no mutation
        ↓
   Props flow to:
     ├─ StatCards   (total, count, categories, highest)
     ├─ SpendingChart (donut: grouped by category)
     ├─ DailyChart    (bars: grouped by date, 7-day window)
     └─ ReceiptList  (sorted copy, animated rows)
```
