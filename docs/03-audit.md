# 03 — Audit

Five edge cases examined, risks assessed, and mitigations proposed.

---

## 1. localStorage Failures

### What can go wrong

| Scenario | What happens |
|----------|-------------|
| User clears site data | `getItem` returns `null`, `JSON.parse` never runs, `initialValue` (`[]`) is used. App resets to empty. Graceful. |
| Storage quota exceeded (5 MB) | `setItem` throws a `QuotaExceededError`. The `try/catch` in `useLocalStorage.ts:15-18` swallows it silently. The UI state is lost on next reload. The user sees no error. |
| `JSON.parse` of corrupted data | If localStorage has been manually edited or contains garbage, `JSON.parse` throws. The `try/catch` catches it, returns `initialValue`. App resets to empty. Graceful. |
| Private/incognito mode | Some browsers allow `setItem` but the data is cleared when the tab closes. No error thrown. Behaves like ephemeral session storage. |
| `localStorage` is `undefined` (SSR) | Not applicable — this is a client-only Vite app. |

### What's missing

- **No user feedback when save fails**: If `setItem` throws (quota exceeded), the receipt was still added to state via `useState`. It appears on screen. But on reload, it's gone. The user has no way to know.
- **No size management**: Over time, `receipts` grows. There's no limit or cleanup of old entries beyond manual "Clear All."

### Suggested mitigations
- Track error count and show a subtle toast: "Could not save — storage is full."
- Estimate localStorage usage with `Blob([JSON.stringify(data)]).size` and warn near 4 MB.
- Export/import as JSON as a manual backup option.

---

## 2. Empty States (Zero Expenses)

### Where they appear

| Component | What shows |
|-----------|-----------|
| Stat cards | `$0.00`, `0 receipts`, `0 / 5` categories, `$0.00` highest with `"—"` merchant. All correct and non-breaking. |
| SpendingChart | A styled empty illustration: "Add receipts to see your spending breakdown" |
| DailyChart | A styled empty illustration: "No spending in this period" |
| ReceiptList | A styled empty illustration: "No receipts yet. Add your first receipt above to get started" |
| Sidebar footer | `$0.00`, `0`, `0 / 5`, `$0.00`. All correct. |

### What's good
Every component has an explicit empty state. No raw "NaN" or broken SVG when there's no data. The empty states are informative and guide the user to take action.

### What could be better
- The empty states are static illustrations. They could show a subtle animation on first render.
- The stat cards show `Avg $0.00` which is correct but could instead show `—` to indicate "no data" vs "zero spending."

---

## 3. Performance at 1,000 Expenses

### What happens now

**Memory**: Each receipt object is roughly 150-200 bytes. 1,000 receipts ≈ 200 KB. Trivial.

**Rendering**:
- Stat card math: `reduce`, `Math.max`, `Set` on 1,000 items — sub-millisecond
- SpendingChart `useMemo`: iterates 1,000 receipts, builds Map, maps 5 categories — <2ms
- DailyChart `useMemo`: iterates 1,000 receipts, builds Map, maps 7 days — <2ms
- ReceiptList: sorts 1,000 items, renders 1,000 DOM nodes — this is the bottleneck

**ReceiptList at 1,000 items**:
- 1,000 `<div>` nodes with event handlers
- 1,000 animated rows (each with `animationDelay`)
- Scrollable container with `max-h-80` (roughly 8 visible rows at a time)
- **All 1,000 are rendered in the DOM**, even if only 8 are visible

### Why it's a problem
The browser has to create and manage 1,000 DOM nodes even though 992 are hidden by the scroll container. Each has:
- Click handlers for delete
- CSS transitions on hover
- Animation-delay calculations

At 10,000 receipts this would cause measurable jank. At 1,000 it might be acceptable but not snappy.

### Suggested mitigations

**Virtualization** (recommended):
- Use `react-window` or `@tanstack/react-virtual` to render only the visible rows
- Wrapping `ReceiptList` in a virtualizer would reduce DOM nodes from 1,000 to ~12
- This is the standard solution for long lists in React

**Lazy animations**:
- Remove per-row animation delays for lists > 50 items
- Or use IntersectionObserver to animate only visible rows

**useMemo for sorting**:
Currently `sorted` is recalculated on every render. Wrap it:
```ts
const sorted = useMemo(
  () => [...receipts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [receipts],
)
```

### What's fine
- localStorage at 200 KB is well under the 5 MB limit
- The chart `useMemo` calls are O(n) and fast even at 100K items
- State updates (add/delete) are O(n) due to `[...prev, r]` and `filter` — acceptable

---

## 4. Category Typos

### How categories are defined

`src/types.ts:10-16`:
```ts
export const CATEGORIES = ["Food", "Transport", "Data", "Fun", "Other"] as const
```

### What prevents typos

**In the form**: The category dropdown (`ReceiptForm.tsx:64-71`) renders options from `CATEGORIES`. The user cannot type a category — they pick from a predefined list. **Typo impossible at input.**

**In the chart**: `SpendingChart.tsx` maps over `CATEGORIES` to build data. Even if a receipt had a typo'd category (impossible via the form, but hypothetically from a localStorage edit), it would appear in the chart's `data` array but be filtered out because `CATEGORIES.map` only produces entries for known categories. The typo'd data would be invisible — not shown but also not counted.

**In logic code**: Any file that references a category compares against `CATEGORIES.includes(value)` or uses the `COLORS` lookup map. Unknown categories fall through to a default color:
```ts
fill={COLORS[entry.name] ?? "#78716c"}
```

### The one gap
If someone manually edits localStorage and adds a receipt with category `"Fud"`, it won't show in the pie chart (not in `CATEGORIES`), it won't count toward the categories-used stat (not in the `Set` of known categories), and it will show in ReceiptList with the generic "Other" — wait, no. It shows the raw `"Fud"` string in the list. The list renders `r.category` directly. So "Fud" appears in the list but not the chart. This is inconsistent.

### Suggested fix
In `filterReceipts` or as a normalization step on load, map unknown categories to `"Other"`:
```ts
const normalized = receipts.map((r) => ({
  ...r,
  category: CATEGORIES.includes(r.category as any) ? r.category : "Other",
}))
```

---

## 5. Currency Assumptions

### What's assumed

1. **Dollar sign**: Every displayed amount uses `$`: `$45.50`, `$${value}`, etc.
2. **Two decimal places**: `.toFixed(2)` is applied everywhere — amounts, totals, averages.
3. **Point as decimal separator**: `parseFloat("45.50")` assumes `.` is the decimal mark.
4. **No thousand separators**: `1000` displays as `$1000.00` (no comma).
5. **No currency code**: Everything is `$` — no USD, EUR, or JPY indicator.

### Where assumptions are baked in

| File | Line(s) | Pattern |
|------|---------|---------|
| `ReceiptForm.tsx` | 55 | `<input type="number" step="0.01">` — HTML validation for 2 decimal places |
| `ReceiptForm.tsx` | 24 | `parseFloat(amount)` — parses `"45.50"` correctly, but `"45,50"` → `45` (silently wrong) |
| `SpendingChart.tsx` | 65 | `` `$${Number(value).toFixed(2)}` `` — hardcoded `$` |
| `DailyChart.tsx` | 56 | `tickFormatter={(v) => \`$${v}\`}` — hardcoded `$` |
| `DailyChart.tsx` | 60 | `` `$${Number(value).toFixed(2)}` `` — hardcoded `$` |
| `App.tsx` | 80, 87-90 | Hardcoded `$` in all stat cards |
| `ReceiptList.tsx` | 40, 76 | Hardcoded `$` in totals and row amounts |
| `Sidebar.tsx` | 112, 124 | Hardcoded `$` in footer stats |

### Impact per locale

| Locale | Decimal separator | Thousand separator | Input `"1000.50"` | Display |
|--------|:---:|:---:|:---:|:---:|
| en-US | `.` | `,` | parses as 1000.50 | `$1,000.50` (no comma — would show `$1000.50`) |
| de-DE | `,` | `.` | `parseFloat("1000,50")` → `1000` (wrong!) | `$1000,00` (wrong value, wrong format) |
| fr-FR | `,` | ` ` | `parseFloat("1000,50")` → `1000` (wrong!) | `$1000,00` (wrong value, wrong format) |
| ja-JP | `.` | `,` | parses as 1000.50 | `$1000.50` (acceptable) |

### What actually breaks

**`parseFloat` with comma decimals**: A German user entering `12,99` gets `parseFloat("12,99")` → `12`. They lose 99 cents. Every time. This is the most impactful bug in the entire app.

**toLocaleString not used**: `(1000.5).toFixed(2)` → `"1000.50"`. It should be `(1000.5).toLocaleString("de-DE", { style: "currency", currency: "EUR" })` → `"1.000,50 €"`.

**Number input with step**: The HTML `<input type="number" step="0.01">` accepts `12,99` on German browsers and displays it correctly in the input, but then `parseFloat` misreads it.

### Suggested mitigations

**Short-term (quick fix)**:
- Replace `parseFloat` with a locale-aware parser (e.g., remove non-numeric chars except the first `.` or `,`)
- Or replace `<input type="number">` with `<input type="text" inputMode="decimal">` and parse manually

**Medium-term (proper i18n)**:
- Detect user locale from `navigator.language`
- Use `Intl.NumberFormat` for all display:
  ```ts
  new Intl.NumberFormat(navigator.language, { style: "currency", currency: "USD" }).format(amount)
  ```
- Store amounts as cents (integers) to avoid floating-point issues

**Long-term**:
- Make currency configurable in Settings (add a currency selector)
- Store currency preference in localStorage
- Format all values through a single `formatCurrency(amount)` utility function so there's one place to change

### Current risk level: **Medium-High**
The comma-decimal bug actively corrupts input for users in Europe and South America. Everything else is cosmetic.
