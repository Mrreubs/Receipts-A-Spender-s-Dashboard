# 05 — Tinker: 50 Fake Expenses

## Methodology

1. Wrote `scripts/generate-and-analyze.cjs` — generates 50 fake receipts with
   realistic merchants, weighted categories, random amounts, dates over 30 days.
2. Ran the script to produce `scripts/fake-receipts.json`.
3. Ran a separate analysis script (`scripts/detailed-analysis.cjs`) to compute
   exact predictions for every dashboard widget *before* loading the page.
4. Saved predictions below.
5. Imported `fake-receipts.json` via Settings → Import JSON in the running app.
6. Observed each widget and recorded actual vs. predicted in the table.

---

## The Fake Data

| Property | Strategy |
|----------|----------|
| **Count** | 50 receipts |
| **Categories** | Weighted: Food 34%, Transport 22%, Fun 18%, Data 16%, Other 10% |
| **Amounts** | Per-category: Food $3–60, Transport $2.50–45, Fun $5–120, Data $2–100, Other $3–250 |
| **Merchants** | 15 per category, randomly selected |
| **Dates** | Uniformly random over the last 30 days from May 22, 2026 |
| **Notes** | ~45% empty, ~55% with short phrases like "Quick lunch", "Office supplies" |

### Actual generated summary

| Metric | Value |
|--------|-------|
| Grand total | **$1,964.38** |
| Average per receipt | **$39.29** |
| Categories used | 5 of 5 |
| Highest receipt | **$194.91** (Pharmacy, Other, Apr 28) |

### Category breakdown (all 50)

| Category | Total | % |
|----------|-------|---|
| Fun | $617.20 | 31% |
| Data | $420.83 | 21% |
| Food | $391.33 | 20% |
| Transport | $314.58 | 16% |
| Other | $220.44 | 11% |

### This Week filter (Mon May 18 – Sun May 24)

11 receipts, $344.99 total, $31.36 average.

| Category | Total | % of filter |
|----------|-------|-------------|
| Food | $163.95 | 48% |
| Data | $91.21 | 26% |
| Transport | $81.62 | 24% |
| Fun | $8.21 | 2% |

### Last Week filter (Mon May 11 – Sun May 17)

11 receipts, $493.40 total, $44.85 average.

| Category | Total | % of filter |
|----------|-------|-------------|
| Fun | $230.62 | 47% |
| Transport | $125.68 | 25% |
| Data | $71.00 | 14% |
| Food | $66.10 | 13% |

### 7-day Daily Chart window

| Date | Total | Receipts |
|------|-------|----------|
| May 16 (Sat) | $139.45 | Bowling Alley $108.01, Toll Road $31.44 |
| May 17 (Sun) | $0.00 | — |
| May 18 (Mon) | $73.45 | Juice Bar $22.52, Toll Road $7.68, Local Diner $43.25 |
| May 19 (Tue) | $125.56 | Uber Ride $43.78, McDonald's $51.62, Shell Gas $30.16 |
| May 20 (Wed) | $46.56 | Taco Stand $8.08, Subway $38.48 |
| May 21 (Thu) | $8.21 | Escape Room $8.21 |
| May 22 (Fri) | $91.21 | Spotify $11.51, Adobe CC $79.70 |

---

## Predictions

### Dashboard view, filter = "This Week"

| Widget | Exact prediction | Basis |
|--------|-----------------|-------|
| **Total Spent** | **$344.99** | Sum of 11 this-week receipts |
| **Receipts** | **11** | Count within [May 18, May 24] |
| **Categories** | **4 of 5** | Food, Data, Transport, Fun appear; Other does not |
| **Highest** | **$79.70** | Adobe CC (Data, May 22) |
| **Avg receipt** | **$31.36** | $344.99 / 11 |

### Sidebar footer

| Line | Prediction |
|------|-----------|
| Total spent | $344.99 |
| Receipts | 11 |
| Categories | 4 / 5 |
| Average | $31.36 |

### SpendingChart (donut, Dashboard, This Week)

Predicted slices (clockwise by descending amount):

| Slice | % | Color |
|-------|---|-------|
| Food ($163.95) | 48% | Red (#f43f5e) |
| Data ($91.21) | 26% | Purple (#8b5cf6) |
| Transport ($81.62) | 24% | Blue (#3b82f6) |
| Fun ($8.21) | 2% | Amber (#f59e0b) — but at 2% the label will round to "0%" |

Total should sum to 100% (48+26+24+2). The Fun slice will be a tiny sliver.

### DailyChart (bar, Dashboard, This Week)

7 bars. Filter is "this-week" but `get7DayWindow` ignores the filter when
producing the 7-day window (it only uses the filter for `last-week` to shift
the window). So the bars are the same regardless of filter setting.

| Date | Bar height | Notes |
|------|-----------|-------|
| May 16 | $139.45 | Tallest bar |
| May 17 | $0.00 | Empty — zero-height bar visible? |
| May 18 | $73.45 | |
| May 19 | $125.56 | Second tallest |
| May 20 | $46.56 | |
| May 21 | $8.21 | Shortest non-zero |
| May 22 | $91.21 | |

Y-axis domain: [0, 139.45 × 1.15] = [0, 160.37]. Tick labels will be
truncated by `.replace(/\.\d{2}$/, "")` — e.g. "$160" at top.

**Note**: May 16 and May 17 are outside the "this-week" filter. The bars
will show them because `get7DayWindow` returns the last 7 calendar days,
but the total value comes from ALL receipts passed to the chart — which is
`displayed` (filtered to this-week). So those bars will actually be $0.00
for May 16 and May 17! The receipts on those dates are from "last week".

**Corrected daily chart prediction**: Only May 18–22 have data. May 16 and
May 17 show $0.00. The empty-state check may trigger because... no, it
won't — `data.every((d) => d.total === 0)` is false because May 18–22 are
non-zero. The chart renders with May 16 and 17 as zero bars.

### ReceiptList (Dashboard, This Week)

11 receipts, newest first:

| # | Date | Merchant | Amount |
|---|------|----------|--------|
| 1 | May 22 | Spotify | $11.51 |
| 2 | May 22 | Adobe CC | $79.70 |
| 3 | May 21 | Escape Room | $8.21 |
| 4 | May 20 | Taco Stand | $8.08 |
| 5 | May 20 | Subway | $38.48 |
| 6 | May 19 | Uber Ride | $43.78 |
| 7 | May 19 | McDonald's | $51.62 |
| 8 | May 19 | Shell Gas | $30.16 |
| 9 | May 18 | Juice Bar | $22.52 |
| 10 | May 18 | Toll Road | $7.68 |
| 11 | May 18 | Local Diner | $43.25 |

Scrollable container (max-h-80). With 11 items at ~72px each = 792px,
some will be hidden behind the scrollbar.

### Receipts view

Shows ALL 50 receipts regardless of filter. Header total = $1,964.38.
Sorted newest-first. Scrollable.

### Analytics view

Charts rendered with all 50 receipts. DailyChart uses `filter="all-time"`,
so `get7DayWindow` returns `getLast7Days()` — same last-7-days as Dashboard.
The DailyChart in Analytics will show the EXACT same bars as Dashboard,
because the 7-day window and the receipt data are the same (the filter
doesn't change the last-7-day time range). Wait — the Dashboard DailyChart
shows `displayed` which is `visible` (this-week filtered), but Analytics
DailyChart shows `receipts` (all 50). So **the Analytics bars will be
different**: May 16 will show $139.45 (not $0), and all days will match
the 7-day table above.

SpendingChart in Analytics will show all 5 categories with their full
totals:

| Slice | % |
|-------|---|
| Fun ($617.20) | 31% |
| Data ($420.83) | 21% |
| Food ($391.33) | 20% |
| Transport ($314.58) | 16% |
| Other ($220.44) | 11% |

### Settings view

Shows the SettingsPanel with:
- Currency: USD (default)
- Categories: 5 default chips, no custom
- Receipt count for Clear All: "50 receipts, $1,964.38"

---

## Actual Observations (post-import)

| Widget | Predicted | Actual | Match? |
|--------|-----------|--------|--------|
| Dashboard — Total Spent | $344.99 | | |
| Dashboard — Receipts | 11 | | |
| Dashboard — Categories | 4 / 5 | | |
| Dashboard — Highest | $79.70 | | |
| Sidebar — Total | $344.99 | | |
| Sidebar — Average | $31.36 | | |
| Sidebar — Categories | 4 / 5 | | |
| Donut — Food % | 48% | | |
| Donut — Fun % | 2% (label "0%") | | |
| DailyChart — May 16 bar | $0.00 | | |
| DailyChart — May 17 bar | $0.00 | | |
| DailyChart — May 19 bar | $125.56 | | |
| DailyChart — May 22 bar | $91.21 | | |
| ReceiptList count | 11 | | |
| ReceiptList newest | May 22, Spotify $11.51 | | |
| Receipts view total | $1,964.38 | | |
| Analytics — Fun slice | 31% | | |
| Analytics — May 16 bar | $139.45 | | |
| Settings — Clear text | "50 receipts, $1,964.38" | | |

---

## Discrepancies

| # | Finding | Detail |
|---|---------|--------|
| — | *(to be filled after import)* | |

---

## Key Takeaways

| Topic | Finding |
|-------|---------|
| **Prediction accuracy** | *(to be filled)* |
| **Edge cases surfaced** | *(to be filled)* |
| **Data quality** | *(to be filled)* |
| **Performance with 50** | *(to be filled)* |
