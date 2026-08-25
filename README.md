# Balter Brewing — KPI Dashboard

A password-protected, live-entry replacement for `Balter_Brewery_KPI_Calculator_2026.xlsx`. Each department types its monthly numbers straight into the site instead of a shared Google Sheet; the app computes every KPI the same way the old workbook did (Actual, Target, Variance, YTD) and syncs across every signed-in device. Built the same way as the other Balter sites (Chemical Tracker, 13:30 Handover, Daily Packaging Handover, Logistics Daily Handover): a static site behind a Cloudflare Worker login gate — this one syncs through **Cloudflare KV** directly (no third-party sync provider) rather than JSONBin.io.

## What it does

- **Data Entry** — every raw number the departments used to type into the old sheet's `Raw Data` tab, grouped by Type (General / Quality / Utilities / Efficiency) and tagged with an Owner, for whichever month is selected in the header.
- **Complaints** — the `Raw Data CC` tab's cans/draught complaint counts and units produced for the selected month. Last-year figures are a fixed, non-editable baseline imported once from the old spreadsheet (percent-change KPIs are measured against it).
- **Production Plan** — replaces `2026_Production_Plan_Attainment.xlsx`. One flexible SKU list per month (Planned vs Produced hL, straight from NetSuite) — add or remove rows as the SKU list changes; Attainment, Diff, and the month's overall Plan Attainment total recalculate live.
- **Forecast Accuracy** — replaces `Forecast_Accuracy_Tool_-__2026.xlsx`. Planned vs Sold for each product/package category, plus an independently-tracked Litres total; the headline Forecast Accuracy % is computed from the category rows.
- **Dashboard** — Actual vs Target vs YTD for every KPI Calculator metric, grouped the same way as the old `KPI - Dash` tab, plus four headline cards up top.
- **Trends** — pick any KPI, Production Plan Attainment, or Forecast Accuracy to see Actual vs Target charted across the whole year.
- **History** — a tile per month showing how complete its data entry is; click one to jump straight into Data Entry/Complaints for that month, so a number can be corrected after the fact without disturbing the current month.
- **Copy summary / Download PDF** — copies the selected month's KPI table as text, or opens a print-formatted version for saving as a PDF.

Total Cans/Kegs Produced are entered once, on the Complaints tab (as "Units Produced"), and reused for the General section and every KPI that needs them — the old spreadsheet asked for this number in two places; this app only asks once.

Jan–Jul 2026 is pre-loaded for the KPI Calculator and Production Plan, and Jan–Jun 2026 for Forecast Accuracy (the old workbook had no actuals recorded yet for July), so the Dashboard and Trends have real data immediately. Everything after that starts blank for live entry.

## How the numbers are calculated

`public/calc.js` reimplements the old workbook's `KPI - Actual` formulas in JavaScript — it was checked cell-by-cell against the July 2026 values in the spreadsheet and matches to the original's own rounding on every KPI. Two deliberate differences from the legacy file, both because the original formula was internally inconsistent (mixing a ratio, a raw count, and a second ratio in one `SUM()`, or a `KPI - YTD` formula that always evaluated to zero regardless of input):

- **Consumer Complaints Ratio (Total)** is computed as a genuine weighted PPM/hL rate across cans + draught, not the old sheet's `SUM()` of mismatched units.
- **YTD** for every KPI is a running average of that KPI's monthly actuals from January through the selected month (matching how the old `KPI - YTD` tab behaved for the KPIs that *did* compute correctly there).

If any other KPI needs to match the legacy sheet's exact historical figure instead, tell me which one and I'll adjust it.

### Forecast Accuracy — one known simplification

The headline **Forecast Accuracy** % is `1 − (sum of each category's |Sold − Planned|) ÷ (sum of each category's Planned)`, computed in each category's own unit (cases, kegs, bottles). The legacy workbook blended these into one figure using unit-conversion factors (e.g. "6L per carton, 49.5L per keg") that aren't fully recoverable from the file alone, so this app's figure will read a little differently from the old "Actual Forecast Accuracy" row in some months. If you can share the case/keg/bottle → litre conversion factors, this can be tightened to match exactly. The Litres row itself (independent NetSuite total) and every category's own Plan Attainment % are otherwise exact.

## Repo structure

```
wrangler.jsonc         — Worker config (points at src/worker.js and public/)
package.json            — just the wrangler dev dependency
src/worker.js           — the entire server: auth gate + /api/sync (Cloudflare KV) + static file fallback
public/index.html       — page shell + styles
public/app.js           — data model: months, owners, raw metrics, KPI targets, seeded history
public/calc.js          — the calculation engine (raw inputs → KPI actual/YTD)
public/other-tools.js   — data + calc for Production Plan Attainment and Forecast Accuracy
public/ui.js            — state, sync, rendering, events
public/manifest.json, favicon.svg, icon-192.png, icon-512.png — same Balter branding as the other sites
```

## One-time setup

### 1. Create the KV namespace

```
npx wrangler login
npx wrangler kv namespace create KPI_KV
```

This prints an `id`. Paste it into `wrangler.jsonc` in place of `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

### 2. Push this repo to GitHub

Create a new GitHub repo and push these files to it (a private repo is recommended, though nothing sensitive lives in the code itself since secrets are set separately in Cloudflare).

### 3. Connect it to Cloudflare via Workers Builds (Git integration)

1. In the Cloudflare dashboard: **Workers & Pages → Create → Workers Builds** (or **Connect to Git** if prompted from the Workers overview).
2. Pick the GitHub repo you just created.
3. Build settings: no build command needed — Wrangler picks up `wrangler.jsonc` automatically, including the KV binding you set in step 1. Leave the root directory as `/`.
4. Deploy. The first deploy will fail health checks until secrets are set (next step) — that's expected.

### 4. Set the two secrets

In the Worker's **Settings → Variables and Secrets**, add these as type **Secret** (not Text):

| Name | Value |
|---|---|
| `SITE_PASSWORD` | The shared password your team will type in to get past the login screen |
| `SESSION_SECRET` | A long random string (e.g. generate one with `openssl rand -base64 32`) — used to sign session cookies. Don't reuse this across the sibling sites. |

The KV binding itself isn't a secret — it's set as a **Binding** on the Worker (Settings → Bindings → KV Namespace), matching what you put in `wrangler.jsonc`.

After saving secrets, redeploy (or it may auto-redeploy) and the site should come up behind the login screen.

## Local development

```
npm install
cp .dev.vars.example .dev.vars   # then fill in real values
npm run dev
```

`wrangler dev` runs a local KV namespace automatically when you don't pass `--remote`, so local testing doesn't touch production data. `.dev.vars` holds secrets for local dev only — it's gitignored, never commit it.

## Using it day to day

- **Sign in**: everyone uses the same `SITE_PASSWORD`. The session lasts 7 days per browser before it asks again.
- **Pick a month**: the dropdown in the header drives Data Entry, Complaints, and the Dashboard together.
- **Enter data**: type into any yellow-outlined cell in Data Entry or Complaints — it saves as you type and syncs to every other signed-in device within a few seconds.
- **Correct a past month**: open History, click the month, fix the number in Data Entry/Complaints — it edits that month's record directly without touching the current month.
- **Log out**: button in the top-right.

## If something's not syncing

- Check the Worker's logs in the Cloudflare dashboard (Observability is enabled in `wrangler.jsonc`) — an error from `/api/sync` usually means the `KPI_KV` binding isn't attached, or the namespace id in `wrangler.jsonc` doesn't match what's bound in the dashboard.
- The site still falls back to saving locally on that device if `/api/sync` is unreachable (the sync pill turns gold), so nobody loses their in-progress entry even if sync is temporarily down.

## Extending this

The KPI Calculator, Production Plan Attainment, and Forecast Accuracy are now all live in this one site. Nothing else from the original three spreadsheets is currently in scope — say the word if something's missing.

## Updating the metric list, SKUs, or targets

- Raw input metrics (name, unit, owner, grouping) live in `public/app.js` in the `RAW_METRICS` array.
- Owners live in the `OWNERS` array in the same file.
- KPI targets live in the `KPI_DEFS` array in `public/app.js` — change a `target` value and redeploy to update the Budget/Target column everywhere.
- The formulas themselves live in `public/calc.js`, in `computeActual()`.
- Forecast Accuracy's category list lives in `public/other-tools.js`, in `FORECAST_CATEGORIES`; its budget target is `FORECAST_TARGET_PCT`. Production Plan's SKU rows aren't a fixed list — add/remove them directly in the Production Plan tab as NetSuite's SKU list changes.
