# 02 — Principles Spotted

Five software design principles visible in this codebase.

---

## 1. Derived State

**Definition**: Data that is computed from other data, not stored independently.

**Where it lives**:
- `src/App.tsx:49-55` — `visible`, `total`, `categoriesUsed`, `maxReceipt`, `topMerchant`
- `src/components/SpendingChart.tsx:20-25` — chart data (map of category → sum)
- `src/components/DailyChart.tsx:15-24` — chart data (map of date → sum over 7-day window)
- `src/components/Sidebar.tsx:31-33` — `total`, `categoriesUsed`, `avg`
- `src/components/ReceiptList.tsx:23-24` — `sorted` (a sorted copy)

**Why it matters**: Derived state is impossible to get out of sync because it's recalculated from raw data on every render. You can't update `total` and forget to update `categoriesUsed` — they both come from the same `visible` array. This eliminates an entire class of bugs.

**The formula**:
```
const derived = compute(rawState)
```
Every time `rawState` changes, React re-runs the component, which re-runs the computation.

---

## 2. Pure Functions for Filtering

**Definition**: A function that, given the same inputs, always returns the same output and has no side effects (no network calls, no state mutations, no console.log).

**Where they live** (all in `src/utils.ts`):
- `getMonday(d: Date): Date` — pure date math
- `getFilterBounds(filter: WeekFilter): { start, end }` — returns a range
- `isInRange(dateStr, start, end): boolean` — comparison, no side effects
- `get7DayWindow(filter: WeekFilter): string[]` — builds an array of date strings
- `filterReceipts(receipts, filter): Receipt[]` — the crown jewel

**Why `filterReceipts` is pure**:
1. Takes `receipts` (input array) and `filter` (input string)
2. Does not modify either input
3. Returns a *new* array via `Array.filter()`
4. No I/O, no state writes, no randomness
5. Same `receipts` + same `filter` = same result, always

**Why it matters**:
- Testable in isolation: `expect(filterReceipts(mockData, "this-week")).toHaveLength(3)`
- Predictable: no hidden state dependencies
- Safe to call from anywhere, anytime, without worrying about side effects

---

## 3. Separation Between Data and Presentation

**Definition**: Data logic (types, state management, persistence, calculations) lives apart from UI logic (components, styles, layout).

**The separation in this codebase**:

| Layer | Files | Responsibility |
|-------|-------|----------------|
| **Types** | `src/types.ts` | Defines shapes and constants |
| **State** | `src/hooks/useLocalStorage.ts` | Manages persistence |
| **Logic** | `src/utils.ts` | Pure calculations (date math, filtering) |
| **Components** | `src/components/*.tsx` | Rendering, events, JSX |
| **App** | `src/App.tsx` | Orchestrator — wires state to presentation |
| **Entry** | `src/main.tsx` | Bootstraps React into DOM |
| **Style** | `src/index.css` | Animations and base styles |

**Evidence in components**:
- `SpendingChart.tsx` does not know about localStorage or filters. It receives `receipts[]` and renders a pie chart. That's it.
- `ReceiptForm.tsx` does not save to localStorage. It calls `onAdd(receipt)` and lets the parent handle persistence.
- `DailyChart.tsx` does not know how filtering works. It receives `receipts[]` (already filtered) and `filter` (to determine the 7-day window).

**Why it matters**:
- Swap Recharts for Chart.js? Only touch `SpendingChart.tsx` and `DailyChart.tsx`.
- Change from weeks to months? Only touch `utils.ts`.
- Add server-side persistence? Only touch `useLocalStorage.ts` or `App.tsx`.
- Each concern changes independently.

---

## 4. Immutability

**Definition**: Never modify data in place. Always create a new copy with the changes.

**Where it's enforced**:

### Adding a receipt (`src/App.tsx:39-41`)
```ts
setReceipts((prev) => [...prev, r])
```
The spread operator `[...prev, r]` creates a new array with all existing receipts plus the new one. `prev` is never modified. The original array continues to exist unchanged.

### Deleting a receipt (`src/App.tsx:44-46`)
```ts
setReceipts((prev) => prev.filter((r) => r.id !== id))
```
`Array.filter()` creates a new array containing only the receipts that don't match the id. The original array is untouched.

### Sorting in ReceiptList (`src/components/ReceiptList.tsx:23-24`)
```ts
const sorted = [...receipts].sort(...)
```
`Array.sort()` mutates the array in place. To avoid destroying the original, we first spread into a new array `[...receipts]`, then sort the copy.

### Filtering in utils (`src/utils.ts:69-71`)
```ts
return receipts.filter((r) => isInRange(r.date, bounds.start, bounds.end))
```
`Array.filter()` always returns a new array. The original `receipts` parameter is never modified.

### Chart data in useMemo
Both `SpendingChart.tsx` and `DailyChart.tsx` use `useMemo` to build chart data. They read from the `receipts` prop but never write to it. The `Map` is local and discarded after each computation.

**What would break immutability**: `receipts.push(newReceipt)` or `receipts.sort()` — these would mutate the source array, causing bugs (React wouldn't detect the change, the UI wouldn't update, and localStorage would save stale data).

**Why it matters**: React detects changes by reference equality. A new array `!==` the old array, so React knows to re-render. If you mutate, the reference stays the same, React skips rendering, and the UI freezes.

---

## 5. Single Source of Truth

**Definition**: Every piece of data exists in exactly one place. Everything else is derived from it.

**The two truths**:

### Truth #1: `receipts` array in `App.tsx:36`
```ts
const [receipts, setReceipts, clearReceipts] = useLocalStorage<Receipt[]>("receipts", [])
```
This is the master list. It lives in one place — the `App` component — and is passed down as props. It is also synced to localStorage. Every receipt operation (add, delete, clear) goes through `setReceipts`.

Derived from `receipts`:
- `visible` (filtered subset)
- All stat cards (total, count, categories, average, highest)
- All chart data (category breakdown, daily breakdown)
- The receipt list (sorted, filtered)

### Truth #2: `filter` state in `App.tsx:37`
```ts
const [filter, setFilter] = useState<WeekFilter>("this-week")
```
This is the current time period selection. It is set by the Sidebar filter buttons and drives the `filterReceipts` function.

### Why two truths, not one?
`receipts` and `filter` are independent inputs. Neither can be derived from the other. You need both to know what to display:
```
visibleReceipts = f(receipts, filter)
```

### What is NOT a source of truth:
- `total` — derived from `visible`
- Chart data arrays — derived from `visible` in `useMemo`
- `sorted` receipts — derived from `visible` in `ReceiptList`
- localStorage — it's a cache/backup of `receipts`, not the source. If localStorage is wiped, the app recovers from the `initialValue` parameter.

**Why it matters**: When you need to fix a bug about wrong totals, you know exactly where to look: the `receipts` array and the `filterReceipts` function. You don't chase through five components that might each have their own copy of the data.
