# 04 — Cross-Check: Charts & Data Shaping

Cross-check performed against a fresh read of every source file in `src/`. Focus is on correctness of data aggregation, filter logic, date handling, number parsing, and state flow through chart components.

---

## 1. `parseAmount` — Thousands Separator Breakage

**File**: `src/utils.ts:83-87`
**Severity**: High
**Certainty**: Bug

```ts
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9,.-]/g, "").replace(",", ".")
  const val = parseFloat(cleaned)
  return Number.isNaN(val) ? 0 : val
}
```

The single `.replace(",", ".")` replaces **every** comma with a period. This
breaks thousands-separated input:

| Input | Expected | Actual | Root cause |
|-------|----------|--------|------------|
| `"1,234.56"` (US) | 1234.56 | 1.234 | `"1.234.56"` — second period truncates parseFloat |
| `"1,234"` (US) | 1234 | 1.234 | Same — no decimal portion but thousands comma becomes dot |
| `"1.234,56"` (EU) | 1234.56 | 1.234 | `"1.234.56"` — same truncation |
| `"12.99"` (US) | 12.99 | 12.99 | Works — single dot, no comma |
| `"12,99"` (EU) | 12.99 | 12.99 | Works — single comma becomes dot |

**Why it was missed**: The two test cases that work are the ones you'd type in
an amount field (no thousands separator). But copy-pasting or importing data
with formatting breaks silently.

**Fix needed**: Distinguish thousands separators from decimal separators.
Options:
- Strip all commas first, then parse with `.` as decimal (US-centric).
- Strip all dots except the last, replace remaining `.` with nothing, then
  replace the final `,` with `.` (EU-centric).
- Detect locale from settings so the parser knows which separator is decimal.

**Impact on charts**: A receipt stored with amount 1.234 instead of 1234.56
under-reports by ~99.9%. The donut and bar charts show wrong proportions.
The stat cards show wrong totals.

---

## 2. Timezone Mismatch — Filter Bounds vs. Receipt Dates

**Files**: `src/utils.ts:39-42` (`isInRange`), `src/utils.ts:13-37` (`getFilterBounds`)
**Severity**: Medium
**Certainty**: Bug

Receipt dates are stored as `YYYY-MM-DD` strings derived from
`new Date().toISOString().slice(0, 10)` — **midnight UTC**.

Filter bounds are computed with `new Date()` (local time), `setHours(0,0,0,0)`
and `setHours(23,59,59,999)` — **local time**.

Comparison in `isInRange`:
```ts
const d = new Date(dateStr)           // midnight UTC
return d >= start && d <= end         // start/end are local
```

**Concrete failure**:

User in New York (UTC-4, EDT) adds a receipt at 9 PM on Sunday May 24, 2026.

| Step | Value |
|------|-------|
| Local time | `2026-05-24T21:00:00-04:00` |
| `toISOString()` | `2026-05-25T01:00:00.000Z` |
| Stored date | `"2026-05-25"` (Monday) |
| `getFilterBounds("this-week")` | start: Mon May 18 00:00:00 EDT, end: Sun May 24 23:59:59.999 EDT |
| `new Date("2026-05-25")` | `2026-05-25T00:00:00.000Z` = `2026-05-24T20:00:00-04:00` |
| `isInRange` | `2026-05-24T20:00:00-04:00 <= 2026-05-24T23:59:59.999-04:00` → **true** |

The receipt created on Sunday at 9 PM has date "2026-05-25" (Monday) but is
STILL included in "this-week" because the UTC midnight is 8 PM local time
on Sunday, which falls within Sunday's end bound. This is accidentally
correct in this case.

**But reverse case fails**:

User in NYC adds a receipt at 10 PM on Saturday May 23.

| Step | Value |
|------|-------|
| Local time | `2026-05-23T22:00:00-04:00` |
| `toISOString()` | `2026-05-24T02:00:00.000Z` |
| Stored date | `"2026-05-24"` (Sunday) |
| `getFilterBounds("this-week")` | Mon May 18 – Sun May 24 23:59:59.999 EDT |
| `new Date("2026-05-24")` | `2026-05-24T00:00:00.000Z` = `2026-05-23T20:00:00-04:00` |
| `isInRange` | `2026-05-23T20:00:00-04:00 <= 2026-05-24T23:59:59.999-04:00` → **true** |

Receipt created Saturday 10 PM, stored as Sunday, still included. Fine.

**The actual off-by-one**:

User in NYC adds receipt at 11 PM on Sunday May 24.

| Step | Value |
|------|-------|
| Stored date | `"2026-05-25"` (Monday) |
| `new Date("2026-05-25")` | `2026-05-24T20:00:00-04:00` |
| End bound (Sun May 24) | `2026-05-24T23:59:59.999-04:00` |
| `isInRange` | `2026-05-24T20:00:00-04:00 <= 2026-05-24T23:59:59.999-04:00` → **true** |

Still included. The receipt was created on Sunday (local) and appears in
this-week as expected. So where's the bug?

**The bug manifests when a receipt should be EXCLUDED**:

User in Berlin (UTC+2, CEST) adds a receipt at 11 PM on Sunday May 24.

| Step | Value |
|------|-------|
| Local time | `2026-05-24T23:00:00+02:00` |
| `toISOString()` | `2026-05-24T21:00:00.000Z` |
| Stored date | `"2026-05-24"` (Sunday) |
| `getFilterBounds("last-week")` | Mon May 11 – Sun May 17 23:59:59.999 CEST |
| `new Date("2026-05-24")` | `2026-05-24T00:00:00.000Z` = `2026-05-24T02:00:00+02:00` |
| `isInRange` | `2026-05-24T02:00:00+02:00 <= 2026-05-17T23:59:59.999+02:00` → **false** |

This receipt was created May 24 (local, this week) but is correctly excluded
from last-week. No bug here.

**Where it breaks**:

User in Berlin adds receipt at 1 AM on Monday May 25.

| Step | Value |
|------|-------|
| Local time | `2026-05-25T01:00:00+02:00` |
| `toISOString()` | `2026-05-24T23:00:00.000Z` |
| Stored date | `"2026-05-24"` (Sunday UTC!) |
| `getFilterBounds("this-week")` | Mon May 18 – Sun May 24 23:59:59.999 CEST |
| `new Date("2026-05-24")` | `2026-05-24T00:00:00.000Z` = `2026-05-24T02:00:00+02:00` |
| `isInRange` | `2026-05-24T02:00:00+02:00 <= 2026-05-24T23:59:59.999+02:00` → **true** |

A receipt created at 1 AM Monday local time is stored with Sunday's UTC date
and appears in "this-week" ending Sunday. The user created it on Monday and
expects it in "this-week" starting today (Monday), but it's included in the
previous week's "this-week" instead.

**Summary**: The UTC/local mismatch means that for users in positive UTC
offsets (Europe, Africa, Asia), receipts created in the early morning (before
the UTC offset's equivalent of midnight) get backdated one day. For users in
negative offsets (Americas), receipts created in the evening can be forward-
dated one day. The filter bounds then operate on these shifted dates.

**Impact on charts**: Both DailyChart and SpendingChart use the normalized
`displayed` receipts. If a receipt's date is shifted by one day, it appears
on the wrong day in DailyChart and could be included/excluded from the wrong
filter period in both charts.

---

## 3. Custom Categories Share One Chart Color

**File**: `src/components/SpendingChart.tsx:7-14`
**Severity**: Medium
**Certainty**: Bug

```ts
const COLORS: Record<string, string> = {
  Food: "#f43f5e",
  Transport: "#3b82f6",
  Data: "#8b5cf6",
  Fun: "#f59e0b",
  Other: "#78716c",
}
// ...
<Cell key={entry.name} fill={COLORS[entry.name] ?? "#78716c"} />
```

Any custom category that isn't in `COLORS` falls back to `"#78716c"` (gray).
If a user adds "Groceries" and "Snacks", both render as gray slices in the
donut, making them visually indistinguishable.

**Fix**: Generate colors dynamically, e.g. via a color-hash or palette
rotation from a pool of distinct hues.

---

## 4. Double Normalization on Import

**Files**: `src/App.tsx:62-64`, `src/App.tsx:48-50`
**Severity**: Low
**Certainty**: Confirmed redundant

```ts
// Step 1: explicit normalization during import
const importReceipts = useCallback(
  (data: Receipt[]) => setReceipts(
    data.map((r) => ({ ...r, category: normalizeCategory(r.category, settings) }))
  ),
  [setReceipts, settings],
)

// Step 2: useEffect re-normalizes from rawReceipts after state settles
useEffect(() => {
  setNormalized(normalizeReceipts(rawReceipts, settings))
}, [rawReceipts, settings])
```

When `importReceipts` calls `setReceipts`, `rawReceipts` updates, which
triggers the useEffect, which calls `normalizeReceipts` again. This is
idempotent (normalizing an already-normalized receipt is a no-op) but:

- Wastes a render cycle (setNormalized fires, then the useEffect fires again)
- The intermediate render briefly sees the post-import normalization, then
  the useEffect re-applies the same normalization

**Fix**: Remove the explicit `normalizeCategory` from `importReceipts` and
rely solely on the useEffect. Or vice-versa: bypass the useEffect for
imports and update both `rawReceipts` and `normalized` atomically.

---

## 5. Hardcoded Default Category List in SettingsPanel

**File**: `src/components/SettingsPanel.tsx:99`
**Severity**: Low
**Certainty**: Correctness gap

```ts
const isDefault = ["Food", "Transport", "Data", "Fun", "Other"].includes(cat)
```

This duplicates `DEFAULT_CATEGORIES` from `types.ts`. If the list in types.ts
is ever modified (e.g., "Data" renamed to "Internet"), SettingsPanel still
considers the old name non-removable and treats the new name as a custom
category (shows an X button).

**Fix**: Import `DEFAULT_CATEGORIES` and use `DEFAULT_CATEGORIES.includes(cat)`
instead of a hardcoded array literal.

---

## 6. Top Merchant Uses Sort Instead of Reduce

**File**: `src/App.tsx:74-77`
**Severity**: Low
**Certainty**: Suboptimal

```ts
const topMerchant = displayed.length
  ? [...displayed].sort((a, b) => b.amount - a.amount)[0].merchant
  : "—"
```

This sorts the entire `displayed` array O(n log n) to find one maximum.
For 1K receipts that's ~10K comparisons instead of ~1K. Negligible at current
scale, but unnecessary. A single `reduce` pass would suffice:

```ts
const topMerchant = displayed.length
  ? displayed.reduce((max, r) => r.amount > max.amount ? r : max).merchant
  : "—"
```

---

## 7. `as Receipt[]` Cast on Imported Data

**File**: `src/App.tsx:63`
**Severity**: Medium
**Certainty**: Type safety hole

```ts
const importReceipts = useCallback(
  (data: Receipt[]) => setReceipts(...),
  ...
)
```

In `SettingsPanel.tsx:55`:
```ts
onImport(data as Receipt[])
```

The `as Receipt[]` cast bypasses runtime validation. If a user imports a JSON
file with `amount: "12.99"` (string) or missing `id`, the receipt enters the
system with wrong types. A string `amount` would cause `NaN` in `reduce`
calls (stat cards, Sidebar, charts) without any error handling.

**Fix**: Validate each imported receipt at the boundary:
- `typeof r.amount === "number" && !Number.isNaN(r.amount)`
- `typeof r.id === "string" && r.id.length > 0`
- `typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date)`
- `typeof r.merchant === "string" && r.merchant.length > 0`

Reject or sanitize records that fail.

---

## 8. Locale Tied to Currency, Not User

**File**: `src/utils.ts:76-80`
**Severity**: Low
**Certainty**: Design limitation

```ts
export function formatCurrency(amount: number, currencyCode?: string): string {
  const currency = CURRENCIES.find((c) => c.code === (currencyCode ?? "USD")) ?? CURRENCIES[0]
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
  }).format(amount)
}
```

Selecting EUR forces locale `"de-DE"`, which formats €1,234.56 as
`"1.234,56 €"`. A French user selecting EUR would expect `"1 234,56 €"`
(locale `"fr-FR"`). A UK user selecting EUR might expect `"€1,234.56"`
(locale `"en-GB"`).

**Impact on charts**: The Y-axis tick labels and tooltip values use this
format. A German locale shows dots as thousands separators and commas as
decimal, which is correct for Germany but may confuse French or Italian
users who select EUR.

**Fix**: Add a separate locale setting, or use `navigator.language` as the
base and override only the currency code.

---

## 9. DailyChart Date Labels Always `en-US`

**File**: `src/components/DailyChart.tsx:23`
**Severity**: Low
**Certainty**: Inconsistency

```ts
label: new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
```

The locale is hardcoded to `"en-US"`. If a user selects EUR (which uses
`de-DE` as the format locale), the currency formatting switches to German
but the date labels stay US English.

**Fix**: Derive the date locale from the same source as the currency locale,
or from `navigator.language`.

---

## 10. Amount Validation Permits $0 Receipts

**Files**: `src/components/ReceiptForm.tsx:23`, `src/utils.ts:83-87`
**Severity**: Low
**Certainty**: Gap

```ts
if (!merchant || !amount || !date) return
```

The form checks that `amount` is non-empty, but `parseAmount("0")` returns 0,
and `parseAmount("abc")` returns 0. A receipt with amount 0 enters the system
and:

- Shows in ReceiptList with `$0.00`
- Adds a data point to DailyChart with total 0 (the empty-state check
  `data.every((d) => d.total === 0)` might trigger if all receipts are $0)
- Adds a category slice to SpendingChart — but the filter
  `.filter((d) => d.value > 0)` removes it, so it silently disappears from
  the chart.

**Impact on charts**: A $0 receipt contributes to the receipt count and
appears in the list but vanishes from the donut chart. The DailyChart may
show the empty state if all receipts in the window are $0.

**Fix**: Add `parseAmount(amount) > 0` to the validation guard, or at least
`parseAmount(amount) >= 0` to allow $0 but show it in charts.

---

## 11. `get7DayWindow` Runs Outside `useMemo`

**File**: `src/components/DailyChart.tsx:14`
**Severity**: Very Low
**Certainty**: Stylistic

```ts
const days = get7DayWindow(filter)          // runs every render
const data = useMemo(() => {
  // uses `days` from closure
}, [receipts, days])
```

`get7DayWindow` runs on every render even though its result is only consumed
inside the `useMemo`. Since it creates 7 date strings (trivially cheap),
this is not a performance issue. But SpendingChart keeps all data logic
inside its `useMemo` for consistency. The asymmetry is a maintenance
footnote: future edits must remember that `days` depends on `filter` and
pass it correctly in the dependency array.

---

## 12. Redundant `Number()` in Tooltip Formatters

**File**: `src/components/SpendingChart.tsx:67`, `src/components/DailyChart.tsx:61`
**Severity**: Very Low
**Certainty**: No-op

```ts
formatter={(value) => [formatCurrency(Number(value), currency), "Spent"]}
```

Recharts passes the raw number from the data object as `value`. `Number()`
on an already-number is a no-op. Safe but unnecessary.

---

## 13. Settings `useEffect` Writes on Every `onError` Identity Change

**File**: `src/hooks/useLocalStorage.ts:14-20`
**Severity**: Very Low
**Certainty**: Edge case

```ts
useEffect(() => {
  window.localStorage.setItem(key, JSON.stringify(storedValue))
}, [key, storedValue, onError])
```

`onError` is in the dependency array. In `App.tsx`, the `toast` function is
passed as `onError`. If `ToastContainer` re-creates `toast` on every render
(not wrapped in `useCallback`), this effect fires every render even if
`storedValue` hasn't changed, writing the same JSON to localStorage.

Looking at `ToastContainer.tsx`, `toast` is likely an exported function or
object, not a hook-local function. If it's a stable reference, this is a
no-op. But if `toast` is recreated, this effect runs unnecessarily.

---

## Summary

| # | Issue | Severity | File | Fix difficulty |
|---|-------|----------|------|----------------|
| 1 | `parseAmount` breaks on thousands separators | **High** | `utils.ts:83-87` | Moderate |
| 2 | Timezone mismatch between UTC dates and local filter bounds | **Medium** | `utils.ts:13-42` | Moderate (store dates as local YYYY-MM-DD) |
| 3 | Custom categories share one chart color | **Medium** | `SpendingChart.tsx:7-14` | Easy (palette rotation) |
| 7 | `as Receipt[]` cast bypasses import validation | **Medium** | `App.tsx:63` | Easy (runtime guard) |
| 4 | Double normalization on import | Low | `App.tsx:48-50,62-64` | Easy (pick one path) |
| 5 | Hardcoded default category list in SettingsPanel | Low | `SettingsPanel.tsx:99` | Easy (use import) |
| 6 | Top merchant uses sort instead of reduce | Low | `App.tsx:74-77` | Easy (one-liner swap) |
| 8 | Locale tied to currency, not user | Low | `utils.ts:76-80` | Moderate |
| 9 | DailyChart date labels always en-US | Low | `DailyChart.tsx:23` | Easy |
| 10 | Amount validation permits $0 receipts | Low | `ReceiptForm.tsx:23` | Easy |
| 11 | `get7DayWindow` outside `useMemo` | Very Low | `DailyChart.tsx:14` | Easy |
| 12 | Redundant `Number()` in tooltip | Very Low | Both charts | Easy |
| 13 | `onError` in effect deps | Very Low | `useLocalStorage.ts` | Harder (stable callback wrapper) |

**Bug #1 (parseAmount)** is the most impactful: it silently corrupts data
for any user who types or pastes a formatted number with thousands
separators. This directly affects chart accuracy.

**Bug #2 (timezone)** is the most subtle: it only manifests near midnight
UTC for users in timezones with large UTC offsets. For most users, most of
the time, it works correctly. But it's a fundamental design flaw that will
surface as "where did my receipt go?" reports from night-owl users in
Europe/Asia.
