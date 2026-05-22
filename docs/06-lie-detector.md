# 06 — Lie Detector

Five statements about the project. One is false.

---

## The Statements

**A.** The SpendingChart assigns unique colors to custom categories by hashing the
category name and indexing into an 8-color palette, so no two custom categories
share the same slice color.

**B.** The DailyChart component renders a bar for every day of the current month,
aggregating spending by date from the filtered receipt set.

**C.** The formatCurrency function accepts an optional currency code, looks up the
corresponding locale from the CURRENCIES table, and formats the amount using
`Intl.NumberFormat` with that locale and currency code.

**D.** The navigation view (Dashboard / Receipts / Analytics / Settings) is persisted
to `localStorage` so that refreshing the page keeps the user on their current view.

**E.** The ReceiptDetailModal can be dismissed by clicking the dark backdrop,
pressing the Escape key, or clicking the Close button — all three work.

---

## reasoning — Which one is the lie?

Every statement looks true at first glance. Let me walk through each:

**A** — We added `PALETTE` and `colorFor()` in the cross-check fixes
(`SpendingChart.tsx`). The hash is a simple char-code sum modulo the palette
length. Confirmed true.

**B** — The DailyChart renders a 7-day window via `get7DayWindow()`, not the
full month. This is a subtle slip: "every day of the current month" is
incorrect — it's only the last 7 calendar days. **This is the lie.**

**C** — The current `formatCurrency` does exactly this. Confirmed in
`utils.ts:75-81`. True.

**D** — We switched from `useLocalStorage` to an inline `useState` + `useEffect`
in App.tsx. The view survives refresh. True.

**E** — The modal handles backdrop click via the overlay ref check, Escape via
a `keydown` listener, and the Close button via the `onClose` prop. True.

The lie is **B**: the window is 7 days, not the full month.

---

## The AI's Reveal

The lie *is* **B**. The DailyChart never renders a full month — it always
renders exactly 7 bars from `get7DayWindow()`, which returns the last 7
calendar days (or shifts back one week for the "last-week" filter).

Even when the Analytics view hard-codes `filter="all-time"`, the chart calls
`getLast7Days()` — still 7 bars, not a month.
