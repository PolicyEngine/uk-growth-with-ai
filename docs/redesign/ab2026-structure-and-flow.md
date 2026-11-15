# AB2026 dashboard: information architecture and flow

Reference for redesigning uk-growth-with-ai. Captured 13 Nov 2026.

- **Live site:** https://www.policyengine.org/uk/autumn-budget-2026
- **Code:** PolicyEngine/uk-autumn-budget-dashboard-2026 at `87976abf`. All `file:line` references are to that commit, exported read-only to
  `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/redesign/ia/src-87976abf/`.
  The lead's snapshot at `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/redesign/visual/src-main/` has an identical `src/` tree (`diff -rq` reports no differences), so every reference here resolves there too.
  The local checkout `/Users/vahid/ab2026-latest` is on `preview-integration` at `fbbaef9d` (27 Oct), 763 commits behind main, so its line numbers differ (`src/App.jsx` is 1,403 lines there, 1,567 at `87976abf`). Do not copy from the checkout's working tree.
- **Live against code:** the page shows no commit id. The live tab labels, sub-tab labels, URL parameters and "policyengine.py 6.11.1" chip match the `87976abf` source by observation only.
- **Screenshots:** `/private/tmp/claude-501/-Users-vahid/c951560c-b087-4de6-83ff-7ba85b14b302/scratchpad/redesign/ia/shots/`. `d-` is desktop 1440x900, `m-` is phone 390x844 at 2x with touch emulation. `-top` is the first screen, `-full` the whole page. Reduced motion was on, so entrance animations are not shown.
- **Raw measurements:** `capture-log-d.json` and `capture-log-m.json` in the same `ia/` folder (headings, fold labels, computed styles, URL trace).

## 1. Page shell

Top to bottom on desktop (`shots/d-20-first-screen.png`):

| Layer | Height | Behaviour | Code |
|---|---|---|---|
| PolicyEngine site nav | 58px | Scrolls away; slides back in when the pointer reaches the window top. On touch devices it is plain page flow. | `src/app/layout.tsx:104-110` (`PolicyEngineShell`), `src/utils/siteNav.js:14-53`, `src/app/globals.css:376-429` |
| Title band (teal gradient, full bleed) | 58px | Sticky at top, z-index 1100. Holds the PE mark, the `h1` "UK Autumn Budget 2026" (24px/700 white), and the Year and Policies pills at the right. | `src/App.jsx:1253-1286`, `src/app/globals.css:474-525` |
| View tabs (white strip) | 48px, 40px once stuck | Sticky under the band. Five tabs, icon plus label, 16px/600, 3px teal underline that slides. | `src/components/ViewTabs.jsx:52-169`, `src/app/globals.css:619-680` |
| Sub-tab band (white strip) | 48px, 40px once stuck | Only on the two views that have sub-tabs. Sticky under the view tabs. Its row starts under the selected view tab (`--view-tab-x`). | `src/components/SubTabs.jsx:111-227`, `src/components/SubTabs.css` |
| Content column | max 1200px, 40px side padding, so 1120px of content | Grey page (`#f9fafb`), white cards. 32px above the first heading, 80px below the last card. | `src/app/globals.css:439-443`, `:552-554`, `:1954-1963` |
| Footer | 54px | Compact one-row PE footer: logo, five links, copyright. | `src/components/SiteFooter.jsx:15-33`, `src/app/globals.css:1978-2022` |

Other shell facts:

- **No breadcrumbs and no back links.** Orientation comes from the always-visible band title and the two tab rows.
- **Landing page at the bare URL** (`shots/d-00-landing-top.png`): a tinted intro card (h2 at 36px/700, a three-line paragraph naming the model, the scope and the forecast source), then three "ways in" boxes: "The Budget and society", "Your household", "What's in the Budget". The tab bar is hidden on the landing page; the boxes are the navigation. A blurred silhouette of the first chart sits behind. Any URL with `tab`, `sub`, `policies` or `year` skips the landing page. Code: `src/components/LandingPage.jsx:39-131`, `src/utils/landing.js:11-25`, `src/App.jsx:1300-1329`.
- **About drawer** (`shots/d-27-about-drawer-open.png`): a vertical "About" tab fixed to the left window edge opens a modal drawer with the same intro text, the same three ways in as a list, a link to policyengine.org, and a "Built with" footer holding the only links to the replication code and the pinned policyengine.py release. Code: `src/components/OverviewDrawer.jsx:34-203`, `src/components/HomeButton.jsx:49-76`, `src/components/ReplicationLine.jsx:12-32`.
- **Stuck state** (`shots/d-21-stuck-bars.png`): band 58 + tabs 42 + sub-tabs 41 = 141px of sticky chrome. With the site nav revealed (`shots/d-22-stuck-sitenav-revealed.png`) it is 199px.
- **Scroll offsets are measured, not assumed:** every anchor jump lands 16px below whichever bars are showing. Code: `src/utils/pageScroll.js:42-58` (`stickyBottom`), `:203` (`scrollBelowBars`), and `--sticky-offset` in `src/app/globals.css:593-603`.
- **Loading:** each view has a skeleton that copies the tab rows and card shapes, so the layout does not jump. Code: `src/components/publication/ViewSkeleton.jsx:236-277`.

## 2. Tab and sub-tab inventory

Defined in one array, `src/App.jsx:124-130`. Each view declares whether the Year and Policies pills apply to it.

| # | Tab (`?tab=`) | Sub-tabs (`?sub=`) | Purpose | Pills apply |
|---|---|---|---|---|
| 1 | Population impact (`dashboard`) | Public finances (default), All households (`all`), By age (`age`, plus `?age=`), Living standards (`living`), Poverty (`poverty`) | The headline results for the selected policies | Year, Policies |
| 2 | Household calculator (`household`) | none | One household: eight example cards or your own answers, then results | Year, Policies |
| 3 | Pre-measures forecast (`outlook`) | Living standards (default), Poverty (`poverty`), Forecast changes (`forecast`) | The baseline without the policies, and the OBR forecast it rests on | neither |
| 4 | Policies (`policies`) | none | One card per modelled policy (8), then 16 policies not modelled | neither |
| 5 | Methodology (`methodology`) | none; a sticky "On this page" contents list of 7 sections | Data, model, per-view method, limitations | neither |

Sub-tab lists: `src/components/PopulationImpactView.jsx:8-14`, `src/components/livingStandards/LivingStandardsTab.jsx:90-94`.

Screenshots per view (desktop; swap `d-` for `m-` for phone):
`d-01-pop-finances`, `d-02-pop-all`, `d-03-pop-age`, `d-04-pop-living`, `d-05-pop-poverty`, `d-06-household`, `d-07-outlook-living`, `d-08-outlook-poverty`, `d-09-outlook-forecast`, `d-10-policies`, `d-11-methodology`, each with `-top.png` and `-full.png`. Household results: `d-37-household-example-full.png`; own-household form, seven numbered steps with a Calculate button: `d-38-household-own-form-top.png`, `d-39-household-own-form-full.png`.

### Headline to detail to method

1. **Headline:** the landing intro, then Population impact opens on Public finances. There is no KPI row; the headline number is the one-sentence description under each card title ("In 2027-28, the selected policies cost the government £805 million").
2. **Detail:** the other four Population impact sub-tabs cut the same selection by place, income, age, living standards and poverty. Household calculator is the personal version.
3. **Context:** Pre-measures forecast gives the same Living standards and Poverty charts without the policies.
4. **Inputs:** Policies says what each measure changes and how it is modelled.
5. **Method:** each card's "About this chart" fold gives the local method and ends with a link into the matching Methodology section.

### Cross-links

All are real `<a href>` links (so they open in a new tab) that a plain click handles in place.

| Link | From, to | Code |
|---|---|---|
| "See without them →" and "See with the policies →" | Between the twin Living standards and Poverty sub-tabs in tabs 1 and 3, placed in the section subtitle | `src/components/TwinLink.jsx:17-34`, used at `src/App.jsx:1073`, `:1101`, `:1123` |
| "Work it out on Household calculator →" | Scatter card description to tab 2 | `src/App.jsx:1214-1228` |
| "More in Methodology: How we cost the policies →" | Foot of a card's fold to a Methodology anchor; opens any closed fold around the target | `src/utils/methodLink.jsx:48-63`, `src/App.jsx:911-937` |
| Policy name in a caveat | To that policy's card on Policies | `src/utils/methodLink.jsx:19-46` |
| "See its effect" | Policy card to Population impact with only that policy selected, on a year in which it has an effect (observed: `?tab=dashboard&policies=fuel_duty_rise_deferral`, `shots/d-35-after-see-its-effect.png`) | `src/components/PolicyCards.jsx:582-592`, `src/App.jsx:940-956` |
| Methodology prose links | Back out to the view or sub-tab being described | `src/components/ViewLink.jsx:10-33` |
| Section "#" | Appears on hover beside every h2; copies a deep link to that section | `src/components/SectionHeading.jsx:46-83` |

### Selectors and their state

- **Global selectors live in the title band**, so they are reachable from any scroll position: Year (single choice of six fiscal years, plus a Play button) and Policies (a multi-select checklist with Select all, Clear, Done; the screenshot filename says "single" but live is multi-select, and the one-policy-at-a-time branch at `src/App.jsx:288` is dormant). Shots: `d-23-year-picker-open.png`, `d-24-policy-selector-single-open.png`. Code: `src/components/YearSlider.jsx:22`, `src/components/PolicySelector.jsx:43`.
- **On tabs where a pill does not apply it stays in place, faded to 55% and inert**, so the band never changes shape (`shots/d-26-outlook-inactive-pills.png`). Code: `src/App.jsx:1267-1285`, `src/app/globals.css:538-541`.
- **Per-card choices sit in one "Options" pill inside the card**, whose face summarises every choice ("2027-28 → 2031-32 · Year by year · Before housing costs · All people"). Code: `src/components/ControlBar.jsx:31-39`.
- **A "Showing 7 of 8 policies" line** appears under the sub-tabs when the selection is not everything (`shots/d-25-one-policy-selected-showing-line.png`). Code: `src/App.jsx:1026-1036`.

URL state, verified live by clicking through the tabs (trace in `capture-log-d.json`, key `state`):

| Parameter | Written when | Carries across tabs |
|---|---|---|
| `tab` | Always, except on the landing page | n/a |
| `sub` | Only when not the default sub-tab; dropped on leaving the view, restored on return | Yes, per view |
| `year` | Only when not the default (2027-28) | Yes, to all five tabs |
| `policies` | Only once the reader changes the selection; a comma list of ids | Yes, to all five tabs |
| `age` | By age sub-tab's chosen group | Within that sub-tab |
| Card options: `ls_from`, `ls_to`, the poverty measure, the decile card's £ or %, the map's panel, the summary chart's metric | When a card's Options choice leaves its default (from code, not exercised live) | Within that card |
| `#anchor` | Section and policy-card deep links | n/a |

Code: `src/App.jsx:449-480` (writer), `src/components/SubTabs.jsx:23-55` (`useSubTabParam`), `src/App.jsx:877-899` (`handleTabChange`), `src/App.jsx:143` (old-link aliases), and for card options `src/utils/livingStandards/urlChoice.js:20`, `src/utils/livingStandards/yearRange.js:58-59`, `src/utils/livingStandards/povertyMeasure.js:30`, `src/components/DecileImpactCard.jsx:32`, `src/components/ConstituencyMap.jsx:116`, `src/components/SummaryMetricChart.jsx:302`.

Two observed limits. Every write uses `history.replaceState`, so the browser Back button does not step back a tab: across six tab and selector changes `history.length` stayed at 14, and Back returned to an earlier full page load without the `year` and `policies` that had been set. And choosing an example household did not change the URL (it stayed `?tab=household`).

## 3. Section rhythm inside a tab

Every chart view repeats the same four-level pattern (`shots/d-02-pop-all-full.png` shows two sections on one page).

1. **Section heading**: a 32px tinted circle icon, an `h2` at 20px/600, and one grey subtitle sentence at 15px. Margin 20px below; 48px above every section after the first. No rule under it. Code: `src/components/SectionHeading.jsx:22-89`, `src/app/globals.css:1001-1088`.
2. **Card** (white, 1px border, 12px radius, 24px padding): full width, or two per row with a 20px gap. Paired cards share row heights through subgrid so titles, descriptions and plots align. Code: `src/app/globals.css:446-453`, `:1306-1350`.
3. **Inside a card, in fixed order** (example `src/components/BudgetaryImpactChart.jsx:271-421`):
   1. `h3` title at 18px/600 with a small icon, and the download button at the right
   2. one plain sentence stating the finding for the selected year
   3. the Options pill, if the card has choices
   4. the chart
   5. legend chips
   6. PolicyEngine logo
   7. "About this chart" fold
4. **"About this chart" fold**: closed by default, with a one-line preview of what is inside ("What it shows · How it's calculated · Definitions · Caveats · Sources"). Open, it shows those sections in that fixed order and ends with "More in Methodology: … →". Shot: `shots/d-28-chart-card-about-open.png`. Code: `src/components/ChartMoreInfo.jsx:83-106`, `src/components/InfoSections.jsx:11-71`, `src/components/Disclosure.jsx:35-114`.

Variations:

- **KPI tiles appear on three screens, each as a row of three under the section heading.** Forecast changes (big number, caption, sparkline, one takeaway line): `shots/d-09-outlook-forecast-top.png`, `src/components/livingStandards/sections/ForecastHeadlineSection.jsx:71`. Pre-measures Poverty, one tile per age group: `shots/d-08-outlook-poverty-top.png`, `src/components/livingStandards/sections/PovertyTiles.jsx:82`. Both use `src/components/livingStandards/HeadlineTile.jsx:113`. Household results open with three tiles ("Your change", "Share of your income", "Income percentile"): `shots/d-37-household-example-full.png`. A generic tile row exists at `src/components/StatTiles.jsx:11-29`.
- **Population impact has no KPI row and no separate takeaway box.** The takeaway is the card's description sentence.
- **Policies** uses the same heading, then two-column policy cards with a fixed internal order: category chip, name, one-line summary, Starts / Ends / Affects strip, "What changes" mini-chart, "About this result" fold, then a footer row of Source, Costing, Read policy brief, See its effect. Shots: `shots/d-33-policy-card.png`, `shots/d-34-policy-card-fold-open.png`. Code: `src/components/PolicyCards.jsx:327-600`.
- **Methodology** keeps the same heading component, with a 220px sticky contents column at the left. Each section is one summary sentence plus a card of folded topics. Shot: `shots/d-11-methodology-top.png`. Code: `src/components/MethodologyTab.jsx:78-88`, `src/components/methodology/MethodContents.jsx:69-131`.

Measured type and spacing (identical on desktop and phone unless noted):

| Element | Desktop 1440 | Phone 390 |
|---|---|---|
| Content width | 1120px | 358px (16px gutters) |
| Band `h1` | 24px/700 | 16px/700 |
| Tab and sub-tab label | 16px/600 | 15px/600 |
| Section `h2` | 20px/600, line 32px | 20px/600, line 28px |
| Section subtitle | 15px, grey `#6b7280` | same |
| Card `h3` | 18px/600 | same |
| Card padding | 24px | 16px |
| Card gap (from CSS, not measured) | 20px | 20px |
| Section gap (from CSS, not measured) | 48px | 48px |

## 4. Each fact once, caveats, methodology, downloads

**Each fact once.** The dashboard enforces this structurally in five ways.

- **Twin sub-tabs instead of repeated charts.** Living standards and Poverty exist in both Population impact (with the policies) and Pre-measures forecast (without). Each states its basis in the subtitle and links to the other; neither repeats the other's numbers.
- **One source for the intro.** The landing page and the About drawer render the same `LandingIntro` component (`src/components/LandingPage.jsx:51-66`), and only one is on screen at a time.
- **Shared terms defined once.** A card's fold lists only terms unique to it; shared terms are defined in the Methodology glossary and linked (`src/components/InfoSections.jsx:16-18`, `src/components/methodology/MethodGlossary.jsx:27`).
- **Sources named once** in `src/utils/sources.js` and rendered through `src/components/SourceLink.jsx:8-19`.
- **Replication links stated once**, in the About drawer; the code comment at `src/components/ReplicationLine.jsx:3-8` says the per-tab footer line was removed for that reason.

One pointer rather than a duplicate: Living standards' subtitle says "The change by income decile is on All households" (`src/App.jsx:1081`).

I could not check the provisional notice (it has three homes in code: landing, drawer, Policies subtitle) because the live figures are no longer provisional.

**Caveats and disclosures.** Almost all caveats live in a card's fold under a "Caveats" heading; across the twelve captured views there were no free-standing note lines (`.note`). Three kinds of qualifier do sit on the surface, each written into a sentence that is already there: the landing intro's "Costings are our own except the bus fare cap's, which is the Treasury's"; "Later years differ: …" appended to a card's finding sentence (`src/components/BudgetaryImpactChart.jsx:282`); and the household result's line that fuel duty also changes VAT (`shots/d-37-household-example-full.png`). Policies with no effect in the chosen year are added to that list automatically, each with its reason and a link to its policy card (`src/components/ChartMoreInfo.jsx:49-69`). Legends collapse them into a "+2 with no effect" chip.

**Methodology placement.** Three tiers:

1. One sentence under the card title.
2. The card's "About this chart" fold.
3. The Methodology tab, last in the tab order, with seven sections (At a glance, Data, Model and policies, Population impact, Household calculator, Pre-measures forecast, Limitations) and 24 folded topics. Limitations has one open card, "What we're improving".

**Downloads and code links.**

| Item | Where | Code |
|---|---|---|
| Per-chart CSV, PNG, SVG | Icon button at the top right of every chart card (`shots/d-29-download-menu-open.png`). The file is framed with title, period, selected policies, the card's Options, source and date. | `src/components/ChartDownloadMenu.jsx:56-175`, `src/utils/exportFrame.js:78-89`, `src/utils/downloadContext.js:10-20` |
| Hover tooltips | Shared components exist for chart tooltips and for small tips on icons and the section "#". My hover captures (`shots/d-30-chart-hover-tooltip.png`, `shots/d-31-section-anchor-tip.png`) did not catch one on screen, so their look is not documented here. | `src/components/ChartTooltip.jsx`, `src/components/Tip.jsx:35`, `:138` |
| Chart or table toggle | Beside the download button on some cards | visible in `shots/d-01-pop-finances-full.png` |
| PDF report and eight explainer links | First card of Methodology, "Our report" | `src/components/MethodologyTab.jsx:100-127` |
| Replication code and policyengine.py 6.11.1 | About drawer footer only | `src/components/OverviewDrawer.jsx:182-199` |
| Source, Costing, Read policy brief | Footer row of each policy card | `src/components/PolicyCards.jsx:540-580` |

## 5. Mobile behaviour

No view overflowed sideways at 390px (document width was 390 on all twelve).

- **Site nav** collapses to logo, globe and hamburger, and scrolls away with the page (`shots/m-20-first-screen.png`).
- **Title band** becomes two rows, 92px: title on the first, both pills on the second with short faces ("2027-28", "All 8"). Code: `src/app/globals.css:1860-1875`.
- **View tabs** become one row that scrolls sideways inside itself, with an edge fade where more is hidden and the selected tab kept in view (`shots/m-40-tabrow-scrolled-end.png`). "About" moves from the window edge to the first slot of this row. Code: `src/components/ViewTabs.jsx:25-29`, `:70-79`, `src/app/globals.css:659-675`, `:768-788`.
- **Sub-tabs** scroll the same way, full width (`shots/m-41-subtabs-scrolled-end.png`). Code: `src/components/SubTabs.css:149-174`.
- **Once stuck, both tab rows drop their labels and show icons only** (`shots/m-21-stuck-bars.png`). Sticky chrome is then 92 + 46 + 45 = 183px of an 844px screen.
- **Policies picker and each card's Options open as bottom sheets** with a title, a scrim and a Done button (`shots/m-24-policy-selector-single-open.png`). Code: `src/components/PolicySelector.css:207-245`, `src/components/ControlBar.css:255-290`.
- **Methodology contents** become a sticky "Jump to" select (`shots/m-11-methodology-top.png`). Code: `src/components/methodology/Methodology.css:396-401`.
- **Cards** go single column below 1025px with 16px padding; the download button stays at the top right.
- **Landing boxes** stack as compact rows (`shots/m-00-landing-top.png`).

## 6. What to copy and what to avoid

### Works best

1. **One shell, two fixed tab rows, selectors in a sticky band.** The reader always knows where they are and can change year or selection without scrolling up.
2. **A rigid card anatomy**: title, one-sentence finding, options, chart, legend, fold. Every view reads the same way, and the finding is in words before the chart.
3. **The fold with a preview line.** "How it's calculated · Caveats · Sources" tells the reader what is inside before opening, and keeps caveats off the main surface without hiding that they exist.
4. **With and without as twin sub-tabs** joined by a link in the subtitle, rather than two charts side by side.
5. **Deep links everywhere**: tab, sub-tab, year, selection and section anchors are all in the URL, defaults are omitted, and old addresses are redirected.
6. **Cross-links that carry intent**: "See its effect" sets the selection and picks a year in which the policy has an effect.
7. **Per-chart downloads that carry their own context** (selection, options, date).
8. **Phone treatment**: bottom sheets for pickers, scrolling tab rows with edge fades, no sideways overflow.

### Weaknesses not to copy

1. **No headline on the main results tab.** Population impact opens straight on a chart; there is no KPI row or summary. For uk-growth-with-ai, where the scenarios are the story, a headline row on the first tab would serve readers better.
2. **The landing page is an extra click** before any number, and the Year and Policies pills are live on it with nothing to change.
3. **Back button does not step through tabs** because every navigation uses `replaceState` (verified live).
4. **Sticky chrome is heavy**: 141px on desktop, 199px with the site nav revealed, 183px on phone.
5. **Icon-only stuck tabs on phone** leave ten unlabelled icons, and three of them (Population impact, All households, By age) are near-identical people icons.
6. **Inactive pills stay visible on three of five tabs.** On Pre-measures forecast the Year pill says "The year doesn't change this tab", yet the growth chart shades the selected year (`shots/m-26-outlook-inactive-pills.png`).
7. **Duplicate sub-tab names across tabs** ("Living standards", "Poverty") rely on the subtitle to tell them apart, and "Pre-measures forecast" is jargon for a baseline.
8. **The replication code link is only in the About drawer**, behind an edge tab. Methodology links to microcosm, policyengine-uk and policyengine.py, but not to the dashboard's own repository: the only reader-facing reference to it in `src/` is `src/components/ReplicationLine.jsx:9`.
9. **Methodology is almost entirely folded** (24 closed topics), so browser find probably does not reach most of it (inferred from the closed content carrying the `hidden` attribute; not tested).
10. **The `policies` parameter is a long id list** (seven ids for "7 of 8"), which makes shared links unwieldy.
11. **Household choice is not in the URL**, so a result for an example household cannot be shared as a link.
12. **The sub-tab row starts under the selected tab**, so on Pre-measures forecast it begins mid-page (`shots/d-07-outlook-living-top.png`). It is deliberate but costs custom measurement code (`src/components/ViewTabs.jsx:81-98`).

## Builder's copy list

| Pattern | Start from |
|---|---|
| View registry with per-view selector flags | `src/App.jsx:124-130` |
| URL writer and reader | `src/App.jsx:205-210`, `:449-480` |
| Tab bar | `src/components/ViewTabs.jsx`, `src/app/globals.css:585-788` |
| Sub-tab band and `?sub=` hook | `src/components/SubTabs.jsx`, `src/components/SubTabs.css` |
| Sticky title band with selector pills | `src/App.jsx:1253-1286`, `src/app/globals.css:459-550`, `:861-940` |
| Section heading with copy-link | `src/components/SectionHeading.jsx` |
| Card grid | `src/app/globals.css:446-453`, `:1158-1227`, `:1306-1350` |
| Fold and its fixed sections | `src/components/Disclosure.jsx`, `src/components/ChartMoreInfo.jsx`, `src/components/InfoSections.jsx` |
| Per-card Options pill | `src/components/ControlBar.jsx` |
| Twin and cross-view links | `src/components/TwinLink.jsx`, `src/components/ViewLink.jsx`, `src/utils/methodLink.jsx` |
| Download menu and export frame | `src/components/ChartDownloadMenu.jsx`, `src/utils/exportFrame.js` |
| Headline tiles | `src/components/livingStandards/HeadlineTile.jsx`, `src/components/StatTiles.jsx` |
| Methodology layout and contents | `src/components/MethodologyTab.jsx:78-88`, `src/components/methodology/MethodContents.jsx`, `src/components/methodology/MethodUi.jsx:91-97` |
| Scroll below sticky bars | `src/utils/pageScroll.js` |
| Landing and About drawer | `src/components/LandingPage.jsx`, `src/components/OverviewDrawer.jsx` |
| Compact footer | `src/components/SiteFooter.jsx` |
