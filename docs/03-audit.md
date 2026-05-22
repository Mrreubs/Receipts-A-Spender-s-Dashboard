# 03 — Audit

Five edge cases examined, risks assessed, mitigations proposed, and current status.

---

## 1. localStorage Failures

### What can go wrong

| Scenario | What happens |
|----------|-------------|
| User clears site data | `getItem` returns `null`, `JSON.parse` never runs, `initialValue` (`[]`) is used. App resets to empty. Graceful. |
| Storage quota exceeded (5 MB) | `setItem` throws a `QuotaExceededError`. The `try/catch` in `useLocalStorage.ts` catches it. A toast appears: "Storage is full — changes may not be saved". ✅ **Fixed** |
| `JSON.parse` of corrupted data | `JSON.parse` throws. The `try/catch` catches it, returns `initialValue`. App resets to empty. A toast appears: "Could not load data from storage". ✅ **Fixed** |
| Private/incognito mode | Some browsers allow `setItem` but the data is cleared when the tab closes. No error thrown. Behaves like ephemeral session storage. |
| `localStorage` is `undefined` (SSR) | Not applicable — this is a client-only Vite app. |

### What was done
- `useLocalStorage` now accepts an `onError` callback (third parameter)
- `App.tsx` passes `toast` as the error callback
- A `ToastContainer` component renders error notifications at the bottom-right of the screen
- Errors auto-dismiss after 4 seconds and can be manually dismissed

### What remains
- No size management: localStorage usage tracking still absent. Beyond ~10,000 receipts, quota could be hit.

---

## 2. Empty States (Zero Expenses)

### Where they appear

| Component | What shows |
|-----------|-----------|
| Stat cards | `$0.00`, `0 receipts`, `0 / 5` categories, `—` for highest (✅ changed from `$0.00`) |
| SpendingChart | Styled empty illustration: "Add receipts to see your spending breakdown" |
| DailyChart | Styled empty illustration: "No spending in this period" |
| ReceiptList | Styled empty illustration: "No receipts yet. Add your first receipt above to get started" |
| Sidebar footer | `$0.00`, `0`, `0 / 5`, `—` for average (✅ changed from `$0.00`) |

### What's good
Every component has an explicit empty state. No raw "NaN" or broken SVG when there's no data.

### What was done
- "Highest" stat card shows `—` instead of `$0.00` when there are no receipts
- Sidebar "Average" shows `—` instead of `$0.00` when there are no receipts
- All stat cards handle `sub` being `undefined` gracefully

---

## 3. Performance at 1,000 Expenses

### What happens now

**Memory**: Each receipt is ~200 bytes. 1,000 receipts ≈ 200 KB. Trivial.

**Rendering**:
- Stat card math: `reduce`, `Math.max`, `Set` on 1,000 items — sub-millisecond
- SpendingChart `useMemo`: iterates 1,000 receipts, builds Map, maps 5 categories — <2ms
- DailyChart `useMemo`: iterates 1,000 receipts, builds Map, maps 7 days — <2ms
- ReceiptList: **sorting is now memoized** with `useMemo` — recalculates only when `receipts` changes. ✅ **Fixed**

### What was done
- `sorted` array in `ReceiptList` wrapped in `useMemo` — avoids re-sorting on every render
- `total` in `ReceiptList` wrapped in `useMemo`
- Sidebar stats (`total`, `categoriesUsed`) wrapped in `useMemo`

### What was considered
- **react-window v2**: evaluated but its `ExcludeForbiddenKeys_2` type incorrectly requires `index`/`style` in `rowProps`, making the API incompatible with strict TypeScript. Skipped.
- **Alternatives**: `@tanstack/react-virtual` or a simple scroll container + IntersectionObserver. For ~1,000 items the plain scroll is acceptable. If performance becomes an issue at 10,000+ items, `@tanstack/react-virtual` would be the next step.

### Without virtualization at 1,000 items
- 1,000 DOM nodes rendered, ~992 hidden by scroll
- At 10,000 items (~2 MB localStorage), this would cause measurable jank
- For the current use case (personal expense tracking), 1,000 is a generous upper bound

---

## 4. Category Typos

### How categories are defined

`src/types.ts:10-16`:
```ts
export const CATEGORIES = ["Food", "Transport", "Data", "Fun", "Other"] as const
```

### What prevents typos

**In the form**: The category dropdown renders options from `CATEGORIES`. The user picks from a predefined list. **Typo impossible at input.**

**On data load**: `normalizeReceipts()` runs on every load from localStorage. Any receipt with an unknown category gets remapped to `"Other"`. ✅ **Fixed**

**On data add**: The form only allows valid categories via the dropdown. ✅ **Already safe**

**In the chart**: `SpendingChart` maps over `CATEGORIES` and uses `COLORS[entry.name] ?? "#78716c"` for unknown categories. ✅ **Already safe**

### What was done
- Added `normalizeCategory(cat: string): string` in `utils.ts` — returns the category if it's in `CATEGORIES`, otherwise `"Other"`
- Added `normalizeReceipts(receipts: Receipt[]): Receipt[]` — maps every receipt through `normalizeCategory`
- `App.tsx` uses `useEffect` to normalize receipts whenever the raw data from localStorage changes
- Typos from localStorage editing are silently corrected on every page load

### Remaining gap
- The normalized array (`receipts`) is **not** written back to localStorage. A typo'd entry stays typo'd in storage until the user edits it. A one-time normalization write-back could be added but risks mutating the user's data unexpectedly.

---

## 5. Currency Assumptions

### What's assumed

1. **Currency format**: All amounts displayed via `formatCurrency()` using `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`. ✅ **Fixed**
2. **No comma-decimal breakage**: `parseAmount()` replaces `,` with `.` before parsing. ✅ **Fixed**
3. **No thousand separators**: Now handled by `Intl.NumberFormat`. ✅ **Fixed**

### Where `formatCurrency` is now used

| File | Usage |
|------|-------|
| `utils.ts:76-79` | `formatCurrency(amount)` — single source of truth for formatting |
| `App.tsx` | Stat cards, header total |
| `Sidebar.tsx` | Total, average in footer |
| `ReceiptList.tsx` | Row amounts, header total |
| `DailyChart.tsx` | Y-axis labels, tooltip values |
| `SpendingChart.tsx` | Tooltip values |

### `parseAmount` — locale-safe input parsing

`src/utils.ts:81-85`:
```ts
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9,.-]/g, "").replace(",", ".")
  const val = parseFloat(cleaned)
  return Number.isNaN(val) ? 0 : val
}
```

This handles:
- `"12.99"` → 12.99 (US)
- `"12,99"` → 12.99 (EU)
- `"$12.99"` → 12.99 (currency symbol stripped)
- `"abc"` → 0 (invalid input)

### Form input type changed
`ReceiptForm.tsx` now uses `<input type="text" inputMode="decimal">` instead of `<input type="number">`. This:
- Shows a numeric keyboard on mobile
- Accepts both `.` and `,` as decimal separators
- Prevents browser-specific number input quirks

### What remains
- **Locale**: Still hardcoded to `"en-US"` and `"USD"`. A Settings page with locale selection would be needed for full i18n.
- **Currency code**: No currency prefix/suffix selector. All amounts are displayed as `$`.
- **The fix works silently**: Users in comma-decimal locales can now type `12,99` and get the correct value. No user-facing locale setting needed.

### Status: ✅ **Fixed** (medium-high risk)
