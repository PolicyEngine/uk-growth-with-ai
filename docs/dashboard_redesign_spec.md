# Dashboard redesign spec: the Autumn Budget 2026 look for the AI dashboard

Status: design spec only. Nothing in `dashboard/` changes on this branch.

- **Target:** `dashboard/` on `dashboard/surprise-2028` (this branch is cut from `origin/dashboard/surprise-2028` at `0cda747`).
- **Reference:** [PolicyEngine/uk-autumn-budget-dashboard-2026](https://github.com/PolicyEngine/uk-autumn-budget-dashboard-2026) at `origin/main` `87976abf` (12 Nov 2026), called **AB** below. Every AB path is relative to that repo at that commit.
- **What was looked at:** AB built with `bun install --frozen-lockfile && bun --bun run build` and served with `next start`; ours as served on port 4320. Both were screenshotted with headless Chromium at 1440, 768 and 390 px. No page had horizontal scroll at any width (`scrollWidth == clientWidth`).
- **Caveat on "ours":** port 4320 serves the local worktree, which is two commits ahead of the branch base (`0c074fb`) with an uncommitted change to `surprise2028.json`. The screenshots show that state (3 of 16 solves done). The source read for this spec is `0cda747`; the two differ only in the data file.

## 1. Decisions in brief

| # | Decision | Why |
|---|---|---|
| D1 | Take the AB shell whole: `PolicyEngineShell` site header, a full-width teal title band with the page title and one control, a white sticky tab row, a grey page with white 1px-bordered cards, a slim footer. | This is what makes AB look like AB. Ours has its own band, a long intro above the tabs and soft-shadow cards. |
| D2 | **Six flat top-level tabs, no sub-tabs:** Results, Public finances, Cohorts, Scenarios and method, Literature, Code. AB's second tab row (`SubTabs`) is not ported. | Flat tabs are a standing rule for these dashboards. Six tabs fit one row at 1440 and scroll sideways inside the row at 390, as AB's five do. |
| D3 | The scenario selector moves into the title band as a band pill (AB's Year and Policies pills). It applies to Results, Public finances and Cohorts; on the other tabs it stays in place, faded. | One control, in reach from every card, exactly as AB treats year and policies. |
| D4 | The headline becomes AB headline tiles (two rows of four, one row per arm), not a table. Large figure: central closure. One line under it: the closed-capital bound. | AB's headline treatment is the tile (`HeadlineTile`), and a tile holds "figure plus one qualifier" cleanly at 390, where our table wraps to five lines per cell. |
| D5 | Keep our own SVG charts (`LineChart`, `Sparkline`) and restyle them to AB's chart theme. Do not port to Recharts. | AB's look is tokens, card rows and the legend chips, not Recharts itself. Keeping the drawing code keeps every plotted number on its current path from the data file. |
| D6 | Arms take AB's neutral series colours (teal `#319795`, blue `#026AA2`), not teal and amber. The closure is shown by dash only. | In the AB palette amber means a loss and teal a gain. "Automation only" is a scenario arm, not a loss. |
| D7 | Method and caveats follow AB's Methodology view: a contents rail, short sections, folded topics, a visible Limitations section; each chart card ends in a closed "About this chart". The three scrollytelling tabs go. | AB has no scrollytelling. Its method content is scannable and each caveat has one home. |
| D8 | Three deliberate departures from AB: no sub-tabs (D2); **icons plain, never in a tinted circle or chip**; **selected items shown by fill and border only, never a tick**. | Standing rules. AB already follows the third (`PillSelect.jsx`, `SeriesToggle.jsx` say "never a tick"); it breaks the second (`.section-icon`, `.title-icon`, `.forecast-tile-icon`). |
| D9 | Each fact has one home. Section 4.3 lists the seven duplicates on the current page and where each goes. | Standing rule. |
| D10 | `@policyengine/ui-kit` goes from 0.9.1 to 0.12.0 as the first step. | `PolicyEngineShell` and `legacy/tokens.css` do not exist in 0.9.1. |

Open questions for Vahid are in section 8.

## 2. The AB design system, as observed

AB takes very little from the ui-kit: the site header (`PolicyEngineShell`), `theme.css`, `styles.css` and `legacy/tokens.css`. Every other component is local code in `src/components/`. So "reuse" below nearly always means "port the file".

### 2.1 Shell

| Part | What it is | Where |
|---|---|---|
| Site header | `PolicyEngineShell country="uk" showFooter={false}` with policyengine.org's menu. 58px, teal-800 to teal-600 gradient. Burger menu on a phone. | `src/app/layout.tsx`, `src/utils/siteNav.js` (`SITE_NAV_ITEMS`, `SITE_HEADER_STYLES`), `src/app/siteHeader.css` |
| Title band | Full-bleed, sticky under the site header, same gradient, 58px. Left: the PE mark and an `h1` (Inter 700, 1.5rem, white, one line, ellipsis). Right: the band pills. Looks the same stuck or not; a 1px shadow once stuck. | `src/App.jsx` lines 1253–1287; `globals.css` `.title-row`, `--band-gradient`, `--title-row-height`, `--bar-pad-x` |
| Band pills | Rounded outlined buttons on a dark translucent fill, white text: icon, muted label, bold value, chevron. A pill that does not apply to the open tab keeps its place, faded, and does not open. | `YearSlider.jsx`, `PolicySelector.jsx`, `PillSelect.jsx` (`variant="band"`), `globals.css` `.band-control` |
| Tab row | White bar, full-bleed, sticky under the band, 48px (40px once stuck on desktop). Tabs: 18px line icon plus label, Inter 600 1rem, grey-600. Chosen tab: dark teal text, a teal-50 tint behind it and a 3px teal underline, both sliding between tabs. WAI-ARIA tablist with arrow keys. | `src/components/ViewTabs.jsx`, `useSlidingIndicator` in `SubTabs.jsx`, `globals.css` `.view-tabs-bar`, `.view-tab`, `.view-tabs-indicator` |
| Page | Grey-50 background. Content column `max-width: 1200px`, side padding 40px (24px at 1024 and below, 16px at 768 and below), bottom 80px. | `globals.css` `.app`, `.main-content` |
| Footer | Slim gradient bar: logo, five links, copyright. | `src/components/SiteFooter.jsx`, `globals.css` `.site-footer` |
| Landing | Three "Explore" boxes over a blurred backdrop; "About" edge tab and drawer. | `LandingPage.jsx`, `OverviewDrawer.jsx`. **Not ported** (section 3.1). |

### 2.2 Tab model

- `VIEWS` in `src/App.jsx`: Population impact, Household calculator, Pre-measures forecast, Policies, Methodology. The open tab is `?tab=`; sub-tabs are `?sub=`; state is written with `history.replaceState`.
- A tab's panel is mounted on first visit and kept (`visited`), so switching back is instant.
- Two views have a second row of sub-tabs (`SubTabs.jsx`). We do not take this.

### 2.3 Sections and cards

| Type | Anatomy | Where |
|---|---|---|
| Section heading | On the page, above its cards, no rule: icon, `h2` (1.25rem, 600), a one-line grey subtitle (0.9375rem), a "#" that copies a link on hover. 48px above every heading after the first, 20px below. | `SectionHeading.jsx`, `globals.css` `.section-heading` |
| Chart card | White, 1px grey-200 border, 12px radius, 24px padding (16px on a phone), no shadow. Rows, in order: **header** (icon, `h3` 1.125rem 600, then chart/table toggle and Download at the right); **summary sentence** (0.875rem, grey-600, the finding in words with the key figures bold); **controls row** (one Options pill whose face lists the current choices); **unit line** above the plot (0.8125rem); **plot**; **legend** (chips); **PE logo** bottom right; **"About this chart"** disclosure, closed, with a one-line preview of what is inside. | `livingStandards/LsCard.jsx`, `ControlBar.jsx`, `ViewToggle.jsx`, `ChartDownloadMenu.jsx`, `ChartMoreInfo.jsx`, `globals.css` `.chart-header`, `.chart-description` |
| Card grid | `charts-grid`: two equal columns, 20px gap; a lone card spans both. Side-by-side cards share rows through `subgrid`, so titles, plots and footers line up. One column at 1024 and below. `charts-stack`: one column. | `globals.css` `.charts-grid`, `.charts-stack` |
| Headline tile | A row of three teal-50 tiles, 1px border, 12px radius, 14px 16px padding: icon and name (0.8rem, 600), the figure (2rem, 600, tabular numerals), what it is (0.75rem, grey-500), a small unlabelled trend with the figure's year ringed, then one line on what it means above a hairline. One column at 900 and below. | `livingStandards/HeadlineTile.jsx`, `LivingStandards.css` `.forecast-tiles`, `.forecast-tile*`, `.tile-trend*` |
| Stat tiles | One white card with figures side by side: figure 1.75rem 700, label 0.875rem, optional muted sub-line, optional footer line. | `StatTiles.jsx`, `globals.css` `.stat-tiles*` |
| Row chart with detail panel | One row per item (icon, name, a dot or dumbbell on a shared axis, the value at the right), zebra bands, the chosen row tinted with a teal left edge; a bordered detail panel beside it (below it on a phone). | `OBRDumbbellChart.jsx`, `ObrDifferencePanel.jsx` |
| Policy card | A coloured top edge, a category chip, title, a facts row (Starts, Ends, Affects), a small "what changes" figure, mini stat boxes. | `PolicyCards.jsx`, `policies/PolicyVisual.jsx` |
| Disclosure | The one expander: a full-width button with a chevron, title 600, and a muted one-line preview while closed. In a card's foot it has a rule above it; alone it is a card. | `Disclosure.jsx`, `Disclosure.css` |
| Note | A visible one-line caveat with an info icon, 0.8125rem grey-600. | `Note.jsx`, `globals.css` `.note` |
| Notice | A small amber chip for provisional or pending data (`--c-notice-bg`, `--c-notice-text`). | `publication/publication.css` `.publication-provisional` |
| Missing data | A plot-sized box with a sentence, never a zero. | `UnpublishedPlot.jsx`, `publication/UnavailableNotice.jsx` |

### 2.4 Selectors

| Control | Use | Where |
|---|---|---|
| Band pill | Page-wide choices (year, policies). | `PillSelect.jsx` `variant="band"`, `PolicySelector.jsx` (`single` gives radio rows) |
| Options pill | A card's own choices, summed up on the pill's face ("2027-28 → 2031-32 · Median · Real"); opens a small dialog of segmented toggles, a bottom sheet on a phone. | `ControlBar.jsx` |
| Chart/table toggle | Two icon buttons in the card header, left of Download. | `ViewToggle.jsx` |
| Segmented switch | Two or three views of one card. | `ViewSwitch.jsx` |
| Line chips | "Show lines:" then one chip per line; on is tinted in the line's colour with its swatch, off is outlined with a hollow swatch. The chips are the legend. | `SeriesToggle.jsx` |

In every one, the chosen option is marked by weight, colour, fill or border, never a tick.

### 2.5 Charts

Source of truth: `src/utils/chartTheme.js` (JS) mirrored by the `--c-*` tokens in `globals.css`; `docs/COLOURS.md` is the table.

- **Grid:** horizontal lines only, `#E5E7EB`, dashed `3 4`. Axis line `#D1D5DB`. Zero line `#374151`, solid.
- **Ticks:** 12px, `#6B7280`. Axis title 12px 500 `#4B5563`. The unit sits as a text line above the plot, not rotated beside it, on line charts (`LsCharts.jsx`).
- **Lines:** 2.5px, small filled dots at each year. A baseline or "before" series is grey `#9CA3AF`, dashed `6 4`; a reference series is `#6B7280`, dashed `4 3`. Lines carry a short name beside them ("PolicyEngine", "Official figures"), never a value.
- **Emphasis:** a light teal band (`#EAF5F4`) behind the selected year or the projection years.
- **Bars:** 5px radius on the outer end, 1.5px gap between stacked segments.
- **Tooltip:** white card, 1px border, 8px radius, soft shadow, 13px (`ChartTooltip.jsx`, `--tip-*`).
- **Legend:** below the plot, centred, as chips; then the PE logo, 80×17px, bottom right (`utils/chartLogo.jsx`).
- **Motion:** 300ms ease-out on data changes, off with `prefers-reduced-motion`.
- **Guard:** colour literals are allowed only in `globals.css` `:root` and `chartTheme.js`; `src/colourGuard.test.js` and ESLint fail anything else.

### 2.6 Typography

Inter, self-hosted (`src/app/fonts/inter-latin-variable.woff2`, OFL), loaded with `next/font/local` in `layout.tsx`. No third-party font request. Sentence case everywhere. British English. Scale (`globals.css` `:root`):

| Token | Size | Used for |
|---|---|---|
| `--fs-stat` | 1.75rem | Stat tile figure (headline tile figure is 2rem) |
| `--fs-xl` | 1.5rem | Band title (`h1`); 1.125rem at 768 and below, 1rem at 480 and below |
| `--fs-section` | 1.25rem | Section heading (`h2`) |
| `--fs-card-title` | 1.125rem | Card title (`h3`) |
| `--fs-body-lg` | 1rem | Tabs, lead text |
| `--fs-body` | 0.9375rem | Section subtitle, body |
| `--fs-small` | 0.875rem | Card summary, labels, options |
| `--fs-caption` | 0.8125rem | Notes, units, sources |
| `--fs-micro` | 0.75rem | Ticks, tile sub-lines |

Weights: 700 band title and stat figures; 600 headings, tabs, card titles; 500 labels; 400 body. Figures use `font-variant-numeric: tabular-nums`.

### 2.7 Colour tokens

| Role | Token | Value |
|---|---|---|
| Page / card / border | `--page-bg` / `--pe-surface` / `--card-border` | `#F9FAFB` / `#FFFFFF` / `#E5E7EB` |
| Text: ink, body, muted | `--pe-gray-900`, `-800`, `-600`, `-500` | `#111827`, `#1F2937`, `#4B5563`, `#6B7280` |
| Band | `--band-gradient` | teal-800 → teal-600, left to right |
| Selection, chosen tab | `--c-highlight` (`--band-teal`) | `#285E61` |
| Tint behind the chosen tab, tiles | `--pe-teal-50` | `#F0FDFA` |
| Accent, links | `--pe-accent`, `--c-gain-text` | `#319795`, `#0F766E` |
| Neutral series, in order | `--series-1…5` | `#319795`, `#026AA2`, `#0EA5E9`, `#285E61`, `#64748B` |
| Gain / loss (meaning only) | `--c-gain` / `--c-loss` | `#319795` / `#D97706` |
| Baseline, reference | `--c-before`, `--c-reference` | `#9CA3AF`, `#6B7280` |
| Grid, axis, tick, zero | `--c-grid`, `--c-axis`, `--c-tick`, `--c-zero-line` | `#E5E7EB`, `#D1D5DB`, `#6B7280`, `#374151` |
| Highlight band, hover, row zebra | `--c-highlight-band`, `--c-hover`, `--c-row-band` | `#EAF5F4`, `#EEF6F6`, `#F9FAFB` |
| Pending notice | `--c-notice-bg`, `--c-notice-text` | `#FFF7E6`, `#7A5A1F` |
| Shadows | `--shadow-faint`, `-soft`, `-strong` | `#111827` at 4%, 8%, 12% |

### 2.8 Spacing

- Card radius 12px, padding 24px (16px on a phone). Gap between cards 20px.
- 48px above a section heading, 20px below it.
- Column 1200px; side padding 40 / 24 / 16px at over 1024 / 1024 and below / 768 and below.
- Tabs: 48px row, 12px side padding per tab, 8px gap, 8px icon gap.
- Tooltips 8px 12px; pills about 32px tall in a card, 40px in the band.

### 2.9 Method and caveats

AB puts explanation in three layers, and each item lives in one of them:

1. **On the card:** one summary sentence (the finding). Nothing else is visible.
2. **In the card's "About this chart"** (`ChartMoreInfo.jsx`, `InfoSections.jsx`): fixed sections in a fixed order, shown only when they have content: What it shows, How it's calculated, Definitions, Caveats, Sources, then one "More in Methodology" link. The closed disclosure previews its sections ("How it's calculated · Caveats · Sources").
3. **In the Methodology tab** (`MethodologyTab.jsx`, `methodology/`): a sticky "On this page" rail (220px) on the left that highlights the section being read, a "Jump to" select on a phone (`MethodContents.jsx`); sections each with an icon, title and one-sentence lede; under each, a card of folded topics (`Topic` in `MethodUi.jsx`), each with a title and a preview line. Terms are a two-column fact grid (`FactList.jsx`), stacked on a phone. **Limitations is the last section** and opens with a visible "What we're improving" list, then folded topics.

Shared terms are defined once in Methodology (`methodology/glossary.js`) and linked from cards, not repeated.

### 2.10 Mobile rules

Seen at 390 and 768, and in the media queries:

- **Site header:** logo, globe and burger.
- **Band:** two rows at 899 and below (title, then pills); title 1.125rem at 768, 1rem at 480. Pill labels drop to their value ("2027-28", "All 8").
- **Tabs:** one row that scrolls sideways inside itself, faded at an edge with more beyond (`mask-image`), the chosen tab kept 24px in from the edge (`scrollToShow`). Font 0.9375rem. They never wrap to a second line. Once stuck at 600 and below, labels hide and icons remain.
- **Cards:** one column at 1024 and below; padding 16px; the header keeps the title left and the buttons right, the title wrapping.
- **Tiles:** one column at 900 and below.
- **Charts:** x ticks shorten ("26-27") or thin to every other (`fitTicks`); legends wrap as chips; a detail panel moves under its chart.
- **Options and menus:** a sheet from the bottom of the screen.
- **Methodology:** the rail becomes a "Jump to" select; fact grids stack.
- **Never** a sideways page scroll: `.app { overflow-x: clip }`, and every grid child has `min-width: 0`.

## 3. Proposed information architecture

### 3.1 Shell for our page

- Site header: `PolicyEngineShell`, as AB.
- Title band: PE mark, `h1` "AI and the UK economy" (the full title, "The macroeconomic effects of AI on the UK", is too long for the band at 390; it stays as the page `<title>` and as the first line of the Results tab). Right: one band pill, **Scenario**.
- Tab row, then the open tab. No landing page, no About drawer: the two intro paragraphs become the lede of the Results tab (one sentence) and the "At a glance" section of Scenarios and method.
- Author and date ("Vahid Ahmadi · PolicyEngine · Updated November 2026") move from the band to the foot of the Results tab and the Code tab's version line.
- Footer: AB's slim footer. The model-versions line moves to the Code tab (its one home).
- The amber "Earlier design" banner goes once the three old tabs are rewritten (steps 7–9). Until then it stays, restyled as an AB notice.

### 3.2 Tabs

URL: `?tab=<id>&s=<scenario>`, as AB. Old `#growth`, `#scenarios`, `#methodology`, `#coverage`, `#code` links and the older `#tab/sub` forms keep working through the existing `LEGACY` map, extended.

| # | Tab | id | Icon (plain) | Scenario pill |
|---|---|---|---|---|
| 1 | Results | `results` | `trend` | active |
| 2 | Public finances | `finances` | `landmark` | active |
| 3 | Cohorts | `cohorts` | `usersRound` | active |
| 4 | Scenarios and method | `method` | `book` | faded |
| 5 | Literature | `literature` | `scale` | faded |
| 6 | Code | `code` | `code` | faded |

What happens to today's five tabs:

| Today | Becomes |
|---|---|
| Economic effects (`growth`) | **Splits.** Headline, paths and the effect rows for demand, factors and prices stay as Results. The Tax/GDP and Debt/GDP rows and the tax-gap note go to Public finances. "How the scenarios are run" goes to Scenarios and method. |
| Model (`methodology`) | **Merges** into Scenarios and method, as its "The model" section (nine scrolly steps become folded topics). |
| Scenario design (`scenarios`) | **Merges** into Scenarios and method, rewritten for the 2028 surprise. |
| Model comparison (`coverage`) | **Splits and goes.** "What each source can represent" (steps 1–6) joins Literature. "OG-UK baseline against the OBR" (steps 7–9) joins Scenarios and method as a folded topic under "The model". The tab itself goes. |
| Code (`code`) | **Stays**, restyled, without the two-pane scroll. |

### 3.3 Tab 1: Results

Section "2031 against the no-AI path" (icon `trend`; subtitle: one sentence on what is compared).

1. **Headline tiles.** Two rows, one per arm. Each row is led by the arm's name with its line swatch; four tiles: National income (GNI), GDP, Net national income (NNI), Wage rate. GNI is first.
   - Tile: plain icon and name; the 2031 central figure (2rem, 600); one line under it "closed capital +0.30%" (0.75rem, grey-500); one "what it means" line above a hairline where there is something to say (for the Automation-only GDP tile: "Held at zero by construction").
   - No trend in the tile: the paths are the next card's.
   - Data: `gap(sid, arm, CENTRAL, v)` and `gap(sid, arm, BOUND, v)` for `v` in `GNI, Y, NNI, w`, formatted by `fmt()`. A pending figure shows "pending" in grey at 1.5rem (AB `.forecast-tile-value.is-text`); a pending bound shows "closed capital pending".
   - Grid: 4 columns over 900px, 2 columns at 900 and below (our tiles are short, so two columns hold at 390).
   - Under the rows, one `Note`: "Large figures: central closure. Small figures: closed-capital bound." The symbols and definitions (zeta, NNI, wage rate per efficiency unit) go to Scenarios and method, linked.
   - The takeaway sentence (signs only, as now) is the section subtitle. The solve count ("3 of 16 solved, data built …") is an AB notice chip above the tiles, shown only while any solve is pending.
2. **Card "National income and GDP, 2027–2031"** (`charts-grid`, two cards: GNI, GDP). Each is an AB chart card: icon `trend`, title, summary sentence, unit line "% against the no-AI path", plot, chip legend, logo, "About this chart".
   - Lines: arm colour, central solid 2.5px, bound dashed `6 4` with hollow dots. End labels name the line only ("Automation + productivity", "Closed capital"); **the value leaves the end label** and is read from the tooltip, because the tiles above already state it.
   - One shared `SeriesToggle` above the two cards (`placement="section"`): four chips, arm × closure.
   - Light band behind 2031, the headline year.
3. **Card "Effect by variable, 2031"** (single card, full width). Rows grouped Demand, Factors, Prices and shares: Consumption, Investment, Capital stock, Labour, Interest rate, Labour share. Each row: name, then per arm the 2031 value and its 2027–2031 sparkline. Styled as AB's row charts: zebra `--c-row-band`, 6px row radius, group labels in 0.75rem uppercase grey. The units sentence goes into "About this chart → How it's calculated".
   - At 600 and below: each variable becomes a two-line row (name on the first line; the two arms' value and sparkline side by side on the second), so no column is narrower than 150px.
4. A `section-link` line: "Tax, debt and the spending rule are on Public finances →".

### 3.4 Tab 2: Public finances

Section "Debt and tax" (icon `landmark`).

1. **Card "Debt/GDP, 2027–2036".** Line chart of `debt_gdp_pp` for both arms, central solid and bound dashed. Light bands behind 2031 (headline) and 2036 (when the debt rule starts), each named by a small label in the plot as AB does ("No fuel duty cut, 2028-29" on its By age chart). Summary sentence gives the 2031 and 2036 values: this card is the one home of both.
2. **Card "Tax/GDP, 2027–2031".** Line chart of `tax_gdp_pp`, same treatment. The two cards sit in a `charts-grid`.
3. **Card "What the tax system misses"** (full width, a visible caveat, not folded): the tax-gap limitation as it stands in the effect table's footnote today (one schedule for labour and capital income; the effective-rate gap against the OBR's; flat employer NICs), as a two-column `FactList`: "In OG-UK" / "In the UK". One sentence on the direction of the bias. This is its one home; Scenarios and method links to it.

Section "Spending rule" (icon `sliders`).

4. **Card "How the result changes with the spending rule".** A `ViewSwitch` with three options: "Spending follows GDP" (the default everywhere else), "Fixed spending", "Debt-neutral". It redraws a small table: debt/GDP 2031 and 2036, tax/GDP 2031, GNI 2031, per arm.
   - **Data gap:** `surprise2028.json` at `0cda747` holds only the default rule. The fixed-spending and debt-neutral solves are staged in `docs/surprise_2028.md` (variants `_fixed_spending`, `_debt_neutral`) but are not in the dashboard data. Until `build_dashboard_data.py` writes them, the two options are listed, and choosing one shows an AB "unpublished" box ("No solve for this rule yet"). No number is invented. Proposed shape, to settle with the data builder: `results[sid][arm][closure].variants.{fixed_spending,debt_neutral}.gaps`.

### 3.5 Tab 3: Cohorts (to come)

Section "Welfare by birth year and earnings group" (icon `usersRound`). Reserved layout, so the tab does not change shape when data lands:

1. **Card "Welfare change by birth year"**: one line or bar per birth cohort, x axis birth year. Options pill: arm, closure.
2. **Card "By earnings group"**: AB's income ramp (`INCOME_RAMP`, amber through grey to teal, low to high) for OG-UK's ability groups, with the gradient key AB uses for ordered groups (`LsCharts.jsx`).
3. "About this chart" on each: the welfare measure and its definition.

Until the data exists, the tab shows the section heading and one `UnavailableNotice`-style card: "Cohort results are not published yet." The tab is listed from day one (decision for Vahid, section 8). Wording follows the house rule: "lower-/higher-earning groups", never poor/rich.

### 3.6 Tab 4: Scenarios and method

AB Methodology layout: rail on the left, "Jump to" on a phone. Sections, each with a plain icon, a title and a one-sentence lede, then a card of folded topics:

| Section | Folded topics | Source of the content |
|---|---|---|
| At a glance | (no topics: three sentences and the links to the paper and repo) | The two intro paragraphs on today's page |
| The 2028 surprise | Timing and ramp · The announcement jump · The reference path | "How the scenarios are run" card; `docs/surprise_2028.md` |
| Scenarios and sources | One topic per scenario (UK low, UK central, UK high, Korinek upper), each a `FactList`: labour-share fall, output at fixed inputs, source and page · The two arms | `S.scenarios[].sources`, `SOURCE` in `SurpriseResults.jsx`; `docs/uk_calibration.md` |
| Closures | Central closure · Closed-capital bound · GNI, GDP and NNI | `docs/closure_choice.md`, `docs/closure_sensitivity.md`; the headline footnote |
| The model | Why OG-UK · Households and cohorts · Firms and production · Government · Market clearing and solution · UK calibration · Baseline against the OBR | `methodologyContent.js` (9 steps), `coverageStory.jsx` steps 7–9 |
| Limitations | Visible list first, then topics: One sector · No adjustment costs · Imposed technology paths · Tax system (one line, links to Public finances) · What has not been checked | `CAVEATS` in `scenarioStory.jsx`; `docs/results_sanity_audit.md` |

The sticky panels' equations (KaTeX) and coverage grids move inside the topic they belong to. `CaveatLink` targets become topic ids; `openDisclosuresAround` opens the topic a link points into.

### 3.7 Tab 5: Literature

Source: `docs/literature_comparison.md`, which today is only on `origin/docs/literature-comparison` (draft PR #37), not on this branch.

1. Section "Published estimates" (icon `scale`): one card with AB's chart/table toggle. Table view: the study tables (A: UK official and UK-specific; B: model-based), columns Study, Year, Country, Model type, Headline number, each study name a link. At 768 and below each study is a stacked row (name, then a two-column fact grid), not a wide table.
2. Section "Our inputs against the published range": the doc's section 3.1 as a row chart, one row per source, our input marked.
3. Section "What each kind of model can represent": the four-source coverage grid from today's Model comparison tab (steps 1–6), as one table card.

**Two blockers, stated so they are not papered over:** the doc compares 2030 gaps from the earlier (2026-start, Korinek-input) runs, so its "our results" table must be regenerated for the 2028 surprise before this tab shows any of our numbers; and the tab's data should be a generated file (`dashboard/src/data/literature.json`, built from the doc's tables), not numbers typed into JSX. Until both are done the tab shows sections 1 and 3 only.

### 3.8 Tab 6: Code

One column of AB-style cards, no two-pane scroll: "Reproduce the results" (numbered steps, each a card with a `TerminalBlock`), "Use OG-UK yourself" (`CodeBlock`s), "Versions" (the model-versions line, its one home, as a `FactList`: OG-Core, OG-UK, policyengine.py, policyengine-uk, data build time and commit from `S.generated_utc` and `S.source_commit`). Code blocks keep their dark fill and get a copy button.

### 3.9 Each fact once: where today's duplicates go

| Today, stated twice | One home | Elsewhere |
|---|---|---|
| 2031 GNI and GDP: headline table and both chart end labels | Headline tiles | End labels name the line only; tooltip on hover |
| Scenario inputs (labour share, output gain, source): headline card line and Scenario design | Scenarios and method → Scenarios and sources | The band pill's menu shows the label only |
| Closure definition (zeta): headline footnote, chart legend, "How the scenarios are run" | Scenarios and method → Closures | Tiles and legends say "Central" / "Closed capital"; one link |
| Tax/GDP and Debt/GDP: effect table rows; would repeat on Public finances | Public finances cards | A link line on Results |
| Tax-gap limitation: effect table footnote; caveat in Scenario design | Public finances → "What the tax system misses" | One-line link in Limitations |
| Timing, arms, reference path: "How the scenarios are run" and Scenario design | Scenarios and method → The 2028 surprise | Nothing on Results |
| Model versions: page footer and Code tab | Code → Versions | Footer carries no versions |

## 4. Component mapping

"Port" means copy the file from AB at `87976abf` into `dashboard/src/components/` with its CSS, then trim. AB is JS (`.jsx`) like ours, so files drop in.

### 4.1 From AB or the ui-kit

| Need | Take | How |
|---|---|---|
| Site header | `PolicyEngineShell` from `@policyengine/ui-kit/layout` (0.12.0) | **ui-kit.** Copy the wiring from AB `layout.tsx`; copy `utils/siteNav.js` and `app/siteHeader.css` |
| Tokens | `@policyengine/ui-kit/theme.css`, `styles.css`, `legacy/tokens.css` | **ui-kit.** Same import order as AB `layout.tsx` |
| Font | `src/app/fonts/inter-latin-variable.woff2` + `OFL.txt`, `next/font/local` | **Port.** Drop the Google Fonts Roboto links |
| Title band | `.title-row` rules and the band markup in `App.jsx` 1253–1287 | **Port**, cut to title + one pill |
| Tabs | `ViewTabs.jsx`, `useSlidingIndicator` (from `SubTabs.jsx`), `.view-tabs*` CSS | **Port.** Drop `notch`, `leading`, the About tab |
| Footer | `SiteFooter.jsx`, `.site-footer*` | **Port** |
| Section heading | `SectionHeading.jsx`, `.section-heading*` | **Port**, with the icon bare: delete `.section-icon`'s `background`, `box-shadow` and `border-radius` |
| Icons | `TitleIcon.jsx` | **Port**, always `bare` (the `.title-icon` chip CSS is not copied). Add `code` and `sliders` paths (Lucide), which AB's set lacks |
| Headline tiles | `HeadlineTile.jsx`, `.forecast-tile*` | **Port**, cut: no `TileTrend`; `.forecast-tile-icon` without its background |
| Count-up figure | `CountUpText.jsx`, `hooks/useCountUp` | **Port** (optional polish; figures animate when the scenario changes) |
| Chart card frame | `livingStandards/LsCard.jsx` | **Port**, as `ChartCard.jsx`; keep the row order, drop the download wiring until step 10 |
| About this chart | `Disclosure.jsx`, `hooks/useCollapse`, `InfoSections.jsx`, `ABOUT_THIS_CHART` | **Port.** Not `ChartMoreInfo.jsx`'s policy-specific parts |
| Scenario pill | `PillSelect.jsx` + `PillSelect.css`, `PillChevron.jsx`, `.band-control` rules | **Port.** Replaces our `Select.jsx` |
| Fiscal-rule switch | `ViewSwitch.jsx` | **Port** |
| Chart/table toggle | `ViewToggle.jsx` | **Port** (Literature) |
| Line chips | `SeriesToggle.jsx` | **Port** |
| Tooltips | `Tip.jsx`, `ChartTooltip.css` (`--tip-*`) | **Port** the CSS; our charts keep their own hover code |
| Notes, notices, missing data | `Note.jsx`, `.publication-provisional`, `UnpublishedPlot.jsx` | **Port** |
| Method layout | `methodology/MethodContents.jsx`, `MethodUi.jsx` (`Topic`, links), `FactList.jsx`, `Methodology.css` | **Port** |
| Chart theme | `utils/chartTheme.js` constants: `CHART_COLOURS`, `SERIES_COLOURS`, `GRID_PROPS`, `TICK_STYLE`, `BEFORE_DASH`, `INCOME_RAMP`, `fitTicks` | **Port** the constants (not the Recharts helpers) as `dashboard/src/lib/chartTheme.js` |
| Logo on charts | `utils/chartLogo.jsx`, `public/assets/logos/policyengine-teal.png` | **Port** |
| Colour guard | `src/colourGuard.test.js`, `chartTheme.test.js` | **Port** (step 10) |
| Page scroll under sticky bars | `utils/pageScroll.js`, `--sticky-offset` | **Port** |

Not taken: `SubTabs` (the component), `LandingPage`, `OverviewDrawer`, `YearSlider`, `PolicySelector`, `ControlBar` (no card of ours has more than one option yet; add it when Cohorts needs it), every Recharts chart, the publication/receipt machinery, `ChartDownloadMenu` (optional, step 10).

The ui-kit's own `Tabs`, `Card`, `MetricCard`, `SegmentedControl` and `PELineChart` are **not** used: AB does not use them, and they do not look like AB.

### 4.2 Ours: restyle, rewrite or remove

| Ours | Action |
|---|---|
| `app/layout.tsx` | Rewrite to AB's shape: shell, local Inter, `lang="en-GB"`. Bundle KaTeX's CSS from the `katex` package in place of the jsDelivr link. Remove the Plotly CDN script (see `PlotPanel`). |
| `app/page.jsx` | Rewrite as the controller: `TABS`, `?tab=` + `?s=` state, `LEGACY` hash map, visited-panel mounting. |
| `app/globals.css` (1,601 lines), `panels.css` | Replace the token block with AB's `:root` (sections 2.6–2.8); delete rules as their components go. The `--pe-color-*` names stay only as aliases until the last user is gone. |
| `tabs/ai/SurpriseResults.jsx` | Split into `ResultsTab.jsx`, `PublicFinancesTab.jsx`; every accessor (`gap`, `path`, `fmt`, `signed`) is reused unchanged. |
| `tabs/ai/surprise.js` | Keep. Only change: `ARM_COLOR` to `--series-1` / `--series-2`. |
| `components/LineChart.jsx` | **Restyle**: grid `3 4` `#E5E7EB`, ticks 12px `#6B7280`, 2.5px lines, bound dash `6 4`, unit as a line above the plot (drop the rotated y title), `noValue` end labels, optional `bands` prop (years to shade). Geometry code stays. |
| `components/Sparkline.jsx` | **Restyle** colours and tip to the tokens. |
| `components/Select.jsx` | **Remove** after `PillSelect` lands. |
| `components/SvgFigure.jsx` | **Remove**; `ChartCard` replaces it. |
| `components/ScrollyStory.jsx`, `StickyPanel.jsx`, `DiagramModal.jsx` | **Remove** after steps 7–9. Diagram SVGs move inline into their topic. |
| `components/CodeBlock.jsx`, `TerminalBlock.jsx`, `lib/highlight.js`, `lib/katex.jsx` | **Keep**; restyle radius and font to tokens. |
| `components/PlotPanel.jsx`, `DotPlot.jsx`, `tabs/ai/ResultsPanel.jsx`, `HistoricalPaths.jsx`, `metrics.js`, `series.js`, `data/aiScenarios.json`, `ukAiPaths.json` | Earlier-design code. `ResultsPanel` is no longer imported by the page. **Remove** whatever nothing imports once steps 7–9 are done; check with `bun run build` and a grep. |
| `tabs/ai/scenarioStory.jsx`, `coverageStory.jsx`, `data/methodology*.js` | Content is **moved** into the new Method and Literature tabs, then the files go. |

## 5. Implementation plan

Small steps, one PR each, in this order. Every step ends with the same four checks (5.1) plus its own.

### 5.1 Checks on every step

1. **Screenshots** of every tab at 390, 768 and 1440, looked at, before and after:
   `bun <scratchpad>/pw/design_shots.mjs <outDir> ours 390,768,1440 "results=http://localhost:<port>/?tab=results" …`
   (the script used for this spec; it is not in the repo, so step 1 copies it to `dashboard/scripts/shots.mjs`).
2. **No horizontal scroll**: the same script prints `hscroll` per tab and width from `scrollWidth > clientWidth`; all must be `false`.
3. **Every number unchanged.** Before the step and after it, for each scenario (`?s=uk_low`, `uk_central`, `uk_high`, `korinek`) dump each tab's `innerText` and take the sorted list of numeric tokens (`[+−-]?\d+(\.\d+)?(%|pp)?`). The two lists must be equal, except for removals the step names in advance (the duplicates in 3.9). Step 1 adds this as `dashboard/scripts/numbers.mjs`.
4. **Still tied to the data file**: `python -m uk_growth_with_ai dashboard --check` passes (CI already runs it); `dashboard/src/data/surprise2028.json` is byte-identical before and after (`git diff --stat` shows no data file); and a grep finds no result literal in JSX: every figure on Results, Public finances and Cohorts is produced by `fmt()`/`signed()` from `gap()`/`path()`. Step 1 adds a Vitest test that renders each results tab against a fixture JSON with altered values and asserts the altered values appear.

Plus `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build` green.

### 5.2 Steps

| # | Step | Own acceptance checks |
|---|---|---|
| 1 | **Groundwork, no visual change.** ui-kit 0.9.1 → 0.12.0; add `scripts/shots.mjs`, `scripts/numbers.mjs`, the fixture test; save the "before" screenshots and number lists. | Screenshots pixel-close to before; number lists identical. |
| 2 | **Tokens and type.** AB `:root` tokens and type scale; local Inter; KaTeX CSS bundled; Plotly script removed. Old class names kept. | Computed `font-family` starts with Inter; no request to fonts.googleapis.com, cdn.plot.ly or jsdelivr in the network log; numbers identical. |
| 3 | **Shell.** `PolicyEngineShell`, title band, `ViewTabs`, footer; `?tab=` with the legacy hashes; intro paragraphs out of the header. Tab contents untouched. | At 390 the tab row is one line and scrolls inside itself; the chosen tab is visible on load for each tab; `#growth`, `#scenarios`, `#methodology/code` each open the right tab; arrow keys move between tabs; band and tabs stay stuck on scroll at all three widths. |
| 4 | **Scenario pill in the band.** `PillSelect` band variant replaces `Select`; `?s=` kept; faded on tabs it does not apply to. | Choosing each of the four scenarios changes the tiles and the URL; reload restores it; the chosen option shows by weight and colour, no tick; at 390 the menu is inside the window. |
| 5 | **Results tab.** Headline tiles, the two chart cards, the effect card (six rows), section headings with bare icons, `About this chart`. Arm colours to series 1 and 2. | The 16 headline figures (8 central, 8 bound) match the before list; **allowed removals:** the four end-label values per scenario. At 390 the tiles are two per row and no tile text is cut; pending scenarios show "pending", never 0. |
| 6 | **Public finances tab.** Debt/GDP to 2036, Tax/GDP, the tax-gap card, the spending-rule card with its pending state. | Tax/GDP and Debt/GDP 2031 and Debt/GDP 2036 values equal those the effect table showed; they now appear once on the site (grep the dump); the two unsolved rules show the unpublished box. |
| 7 | **Scenarios and method tab.** Rail, sections, folded topics; content moved from Scenario design, Model, and "How the scenarios are run"; rewritten for the 2028 surprise. | Every topic opens and closes by keyboard; a link to a term inside a closed topic opens it and scrolls below the sticky bars; the rail highlights the section in view; at 390 "Jump to" replaces the rail; the "Earlier design" banner is gone from this tab; each scenario's inputs equal `S.scenarios[]`. |
| 8 | **Literature tab.** After PR #37 merges and its results table is regenerated for the 2028 surprise: generated `literature.json`, table and stacked rows, coverage grid. | Every figure in the tab is in `literature.json`; every study link returns 200; at 390 no table scrolls the page. |
| 9 | **Code tab.** One-column cards, versions list, copy buttons; remove the scrolly components and the earlier-design files nothing imports. | `bun run build` with the files removed; no `Earlier design` text left on the site; code blocks scroll inside themselves at 390. |
| 10 | **Cohorts tab and polish.** The reserved layout with its pending state; colour guard test; optional CSV/PNG download menu; count-up figures. | Colour guard passes (no colour literal outside `globals.css` `:root` and `lib/chartTheme.js`); with reduced motion on, nothing animates. |

Steps 1–6 give the AB look on everything a reader sees first, without touching the three old tabs. Steps 7–9 are content moves and can run in any order. Step 8 waits on PR #37; step 10's real content waits on the cohort solves.

## 6. Screenshot pairs

AB on the left, ours (port 4320, 12 Nov 2026) on the right. Not committed; they are in the session scratchpad.

| Pair | File |
|---|---|
| Shell and tabs, 1440 | `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/design/pair-01-shell-tabs-1440.png` |
| Shell and tabs, 768 | `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/design/pair-02-shell-tabs-768.png` |
| Shell and tabs, 390 | `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/design/pair-03-shell-tabs-390.png` |
| Headline, 1440 (AB tiles vs our table) | `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/design/pair-04-headline-1440.png` |
| Headline, 390 | `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/design/pair-05-headline-390.png` |
| Chart card, 1440 | `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/design/pair-06-chart-card-1440.png` |
| Chart card, 390 | `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/design/pair-07-chart-card-390.png` |
| Row chart vs our effect table, 1440 | `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/design/pair-08-table-rows-1440.png` |
| Row chart vs our effect table, 390 | `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/design/pair-09-table-rows-390.png` |
| Methodology vs our Scenario design, 1440 | `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/design/pair-10-methodology-1440.png` |
| Methodology vs our Scenario design, 390 | `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/design/pair-11-methodology-390.png` |
| Two-card grid, 1440 | `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/design/pair-12-two-card-grid-1440.png` |

The single shots the pairs are cut from are in the same folder: `ab-<view>-<width>-top.png` and `-full.png` for AB's landing, finances, allhouseholds, age, living, poverty, outlook, forecast, policies, methodology and household views (1440 and 390; finances, methodology and forecast also at 768), and `ours-<tab>-<width>-top.png` and `-full.png` for growth, scenarios, methodology, coverage and code (1440 and 390; growth and scenarios also at 768).

## 7. What the pairs show

- **Shell:** AB spends 164px on site header, band and tabs, and content starts at once. Ours spends about 315px at 1440 and about 700px at 390 on the band, two intro paragraphs and tabs that wrap to two lines.
- **Headline at 390:** our table's cells wrap to five lines ("closed / capital / +0.30%") and the row header to three. AB's tiles hold a figure, a qualifier and a line of meaning with room to spare.
- **Cards:** ours are borderless with a wide soft shadow and 16px radius on a gradient page; AB's are flat, 1px-bordered, 12px radius, on plain grey. Ours carry a paragraph of footnotes under each card; AB's carry one sentence above and a closed disclosure below.
- **Charts:** ours print the 2031 value in the end label, rotate the y title and put two charts in one card; AB names lines only, sets the unit above the plot and gives each chart its own card with its own title and summary.
- **Method:** ours is a two-pane scroll of about 7,000px at 1440 (12,000px at 390) under an "Earlier design" banner; AB's is 3,700px, scannable from the rail, with everything deeper folded.

## 8. Open questions for Vahid

1. **Band title.** "AI and the UK economy" is proposed for the band because the full title does not fit at 390. Say if another short form is preferred.
2. **Cohorts tab before data.** Proposed: listed from day one with a "not published yet" card. The alternative is to add the tab only when the solves land.
3. **Headline tiles for both arms.** Proposed: both arms always visible (two rows). The alternative is one row with an arm switch, which halves the height but hides half the figures.
4. **Removing the 2031 value from chart end labels** (each fact once). It is the one place this spec takes a number off the page.
5. **Spending-rule data.** Whether the fixed-spending and debt-neutral solves will be published to the dashboard at all, and under what key.
