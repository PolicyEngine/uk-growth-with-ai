# AB2026 visual system and components: builder's spec

Research for redesigning `uk-growth-with-ai` to match the Autumn Budget 2026 dashboard.

## Provenance (read first)

- **Code refs are at `87976abf` (main, 12 Nov 2026)**, extracted read-only with `git archive` to `visual/src-main/`. All `file:line` below are relative to that tree (`src/...`).
- A local checkout of the AB2026 repository (outside this repo) is **not** main: it is branch `preview-integration` at `fbbaef9d` (27 Oct), 391 files behind in `src/`. Do not copy from the working tree; copy from `visual/src-main/` or `git show 87976abf:<path>`.
- **Live = main.** The live page carries main-only classes (`obr-panel`, `umm-*`, `pviz-*`), so the crops match the cited code.
- Crops: `visual/crops/` (1440 wide at 2x, phone 390 at 2x, prefix `m-`). Full pages for every view at both widths: `visual/shots/<view>-{1440,390}-full.png`. Computed styles from the live DOM: `visual/computed-styles.md` (tables per view) and `visual/crops/computed-styles.json` (raw). Where this report and the cascade could disagree, the computed file is the authority; the values quoted here for the chart card, tiles, policy card, tabs, tips, tables and segments were checked against it.
- Stack: Next 16 App Router, React 19, Tailwind 4 (imported, barely used: the page is hand-written CSS on custom properties), `@policyengine/ui-kit` 0.12.0, `lucide-react` 0.577.0, `recharts` 2.15, `d3` 7.

**Portability key** used in the tables: **CSS** = plain CSS on custom properties, copy the rules and the tokens they read; **Kit** = needs `@policyengine/ui-kit`; **RC** = Recharts-specific; **JS** = needs the component's JS (measuring, focus handling).

## 0. The ten rules that make AB2026 look like AB2026

1. Page `--pe-gray-50` (#f9fafb); every result sits in a white card, 1px `--pe-gray-200` border, 12px radius, 24px padding, **no shadow at rest**. Shadows only on things that float (menus, tips) or lift on hover.
2. One teal identity colour for chrome and selection: `--c-highlight` #285e61 (tabs, band). Teal-50 #f0fdfa is the only selection tint.
3. Selection is always **fill + border / underline, never a tick badge** (segments: white pill with shadow on a grey track; tiles: teal-50 fill + teal-600 border + 1px inset ring; tabs: teal-50 tint + 3px underline; chips: tinted fill + coloured border).
4. Type: Inter (self-hosted variable). 10-step rem scale, 600 for titles, 700 only for the H1 and big numbers, tabular numerals on every figure.
5. Gain teal / loss amber, never red/green; a darker "text" variant of each for figures in prose (`--c-gain-text` #0f766e, `--c-loss-text` #b45309). Every signed value prints its sign, so colour is never the only cue.
6. Charts: dashed light grid (horizontal only), 12px grey ticks, no chart border, 5px bar radius, 1.5px gap between stacked segments, black net line, one white tooltip card style, legend below, PolicyEngine logo bottom right.
7. Card header pattern: `[icon] Title (h3, 18px/600)` + actions at the right (40x40 icon buttons), then a one-sentence finding (14px gray-600), then controls (32px pills), then the plot, then key, then logo, then an "About this chart" fold separated by a 1px rule.
8. Controls are 32px pills (radius 999) in cards and 40px boxes (radius 8) in the band; hover = teal-500 border; focus = 3px `--focus-ring` or a 2px teal outline.
9. Motion tokens 150/220/300ms with `cubic-bezier(0.22,1,0.36,1)`, all zeroed under `prefers-reduced-motion`.
10. Colour literals live only in `:root` of `globals.css` and in `utils/chartTheme.js` (JS mirror for SVG export). A test (`src/colourGuard.test.js`) and ESLint enforce it. Keep this rule in the new dashboard.

## Conflicts with Vahid's rules: "copy but strip"

| Rule | AB2026 state | Action |
| --- | --- | --- |
| No tick badges on selected cards/chips | **Complies.** No `Check` icon anywhere in `src/`; selected cards/chips use fill+border (`HouseholdCalculator.css:698, 882`; `:242` `.choice-tile.is-checked`). The only ticks are native checkboxes in the policies menu (`PolicySelector.css:156`), a form control, not a badge. | Copy as is. |
| Icons plain, no coloured chip/box | **Does not comply.** Icons sit in tinted containers in seven places: `.title-icon` 28px teal-50 rounded square (`TitleIcon.css:1`), `.section-icon` 32px teal-50 circle + inset ring (`globals.css:1031`), `.mrl-icon` 24px measure-tinted circle (`MeasureRowLabel.css:10`), the 24px icon circle inside the policy-card kicker pill (`PolicyCards.css`, `.policy-card-type .mrl-icon`), `.household-card-icon` 46px tinted circle, inverts on hover (`HouseholdCalculator.css:892`), `.landing-box-icon` 40-52px circle (`LandingPage.css:245`), `.forecast-tile-icon` (`LivingStandards.css:647`). | Copy the icon set, sizes and stroke; **drop** `background`, `box-shadow`, `border`, `border-radius` and fixed `width/height` on the wrapper; colour the glyph `--c-gain-text` (or the series colour). Icons that are already plain and can be copied directly: tab and sub-tab icons, band-control icons, download/view-toggle icons, info tips, note icons, policy-card inline 13-14px icons. Crops show the tinted versions; ignore the chip. |

## 1. Tokens

All in `src/app/globals.css` `:root` blocks (`:1-84` base, `:124-345` page). ui-kit's `theme.css` is imported at `:2` and supplies `--color-teal-*`; the page then defines its own `--pe-*` and `--c-*` set, so the tokens can be lifted without the kit.

### Colour

| Role | Token | Value | Line |
| --- | --- | --- | --- |
| Page background | `--page-bg` = `--pe-gray-50` | #f9fafb | :127 |
| Card surface | `--pe-surface` / `--c-surface` | #ffffff | :36 |
| Card border | `--card-border` = `--pe-gray-200` | #e5e7eb | :128 |
| Text primary / secondary / muted | `--pe-gray-800` / `-600` / `-500` | #1f2937 / #4b5563 / #6b7280 | :32-34 |
| Card title, big number | `--pe-gray-900` | #111827 | |
| Accent (links, buttons) / hover / dark | `--pe-teal-500` / `-600` / `-700` | #319795 / #0d9488 / #0f766e | :9-13 |
| Solid button fill / hover | `--pe-teal-700` / `--pe-teal-800` | #0f766e / #115e59 | |
| Selection, tabs, band | `--c-highlight` (`--band-teal`) | #285e61 | :237 |
| Selection tint | `--pe-teal-50` | #f0fdfa | |
| Band gradient | `--band-gradient` | teal-800 -> teal-600, left to right; rule 0.5px teal-700 | :135 |
| Gain / gain as text / light | `--c-gain` / `--c-gain-text` / `--c-gain-light` | #319795 / #0f766e / #81e6d9 | :226 |
| Loss / loss as text / soft bg / border | `--c-loss` / `--c-loss-text` / `--c-loss-soft` / `--c-loss-border` | #d97706 / #b45309 / #fef4e8 / #fde68a | :228 |
| No change, before, baseline | `--c-no-change`, `--c-before` | #9ca3af | |
| Reference series (dashed) | `--c-reference` | #6b7280 | |
| Net line | `--c-net` | #000000 | |
| Hover band / zebra band / highlight band | `--c-hover` / `--c-row-band` / `--c-highlight-band` | #eef6f6 / #f9fafb / #eaf5f4 | |
| Grid / axis / tick / axis title / zero line | `--c-grid` / `--c-axis` / `--c-tick` / `--c-axis-title` / `--c-zero-line` | #e5e7eb / #d1d5db / #6b7280 / #4b5563 / #374151 | |
| Categorical series 1-5 | `--series-1..5` | #319795 #026aa2 #0ea5e9 #285e61 #64748b | :301 |
| Measures that raise revenue (ambers, largest darkest) | `--ramp-raise-1..6` | #78350f #92400e #b45309 #d97706 #f59e0b #fbbf24 | |
| Measures that cost revenue (teals) | `--ramp-cost-1..4` | #0d9488 #14b8a6 #2dd4bf #5eead4 | |
| Income groups low -> high | `--income-ramp-1..7` | #8a3a0c #b8641c #e0954a #9ca3af #5fb3aa #2a8c84 #0f5f59 | |
| Notice | `--c-notice-bg` / `--c-notice-text` | #fff7e6 / #7a5a1f | |
| Shadows (colour only) | `--shadow-faint` / `-soft` / `-strong` | rgba(17,24,39, .04 / .08 / .12) | :200 |
| Focus ring | `--focus-ring` | gain-text at 25% | :216 |
| Footer gradient | `--footer-start` -> `--footer-end` | #234e52 -> #2c7a7b | |

Full role table with JS names: `docs/COLOURS.md` (copy this doc as the new dashboard's colour contract). No purples, no reds, no greens.

### Type scale (`globals.css:334-343`)

| Token | rem | px | Used for |
| --- | --- | --- | --- |
| `--fs-stat` | 1.75 | 28 | headline stat value (`.stat-value`, 700) |
| `--fs-xl` | 1.5 | 24 | band H1 (700, -0.025em), household card figure (700) |
| `--fs-section` | 1.25 | 20 | section H2 (600, line-height 32px) |
| `--fs-card-title` | 1.125 | 18 | card H3 (600, gray-900, lh 1.35) |
| `--fs-lead` | 1.0625 | 17 | policy-card name, landing intro |
| `--fs-body-lg` | 1 | 16 | tabs (600) |
| `--fs-body` | 0.9375 | 15 | body, section subtitle (gray-500), fold title (600) |
| `--fs-small` | 0.875 | 14 | card finding sentence (gray-600, lh 1.55), tables, menu items |
| `--fs-caption` | 0.8125 | 13 | notes, sources, tooltips, table headers |
| `--fs-micro` | 0.75 | 12 | pill controls, chips, axis ticks, kickers |

Font: Inter variable, self-hosted via `next/font/local` (`src/app/layout.tsx:36`, `src/app/fonts.css`); body 16px / 1.5, antialiased. Kicker pattern (only on policy cards): 12px, 600, uppercase, 0.04em (`globals.css:2192`). Numbers: `font-variant-numeric: tabular-nums` everywhere; big figures add `letter-spacing: -0.02em`.

### Space, radius, motion

- Space: 4 / 8 / 16 / 24 / 32 / 48 (`--pe-space-*`). Card padding 24 (16 at <=768). Card-to-card gap 20. Section-to-section 48. Section heading to first card 20. Tab panel top padding 32.
- Radius: 4 / 8 / 12 / 16 (`--pe-radius-sm..xl`); card 12; menus, tips, band controls 8; icon buttons and segments 6; pills 999; bars 5 (`--bar-radius`); row bands 6 (`--row-radius`).
- Shadows: card none; policy card `0 1px 2px faint`; hover lift `0 6px 18px soft` + `translateY(-2px)`; menus `0 8px 24px strong`; tips `0 4px 16px soft`.
- Motion: `--motion-fast` 150ms, `--motion-base` 220ms, `--motion-chart` 300ms, `--motion-slide` 250ms, `--ease-out` cubic-bezier(0.22,1,0.36,1) (`:73-84`); all 0 under reduced motion (`:86`).
- Column: `.main-content` max-width 1200, padding `0 40px 64px` (`:439`); bars use `--bar-pad-x: max(40px, calc((100vw - 1120px)/2))` so band and tabs line up with the 1120 content column (`:146`).

## 2. Page chrome

| Component | Copy from | Classes / tokens | Crop | Port |
| --- | --- | --- | --- | --- |
| Site nav + footer | `src/app/layout.tsx:1` (`PolicyEngineShell`), `src/components/SiteFooter.jsx`, `src/app/siteHeader.css` | ui-kit Header, 58px | `nav-band-tabs-subtabs.png` | Kit |
| Title band | `globals.css:474-527`; markup `App.jsx` (`.title-row`, `.title-mark`) | sticky, 58px, `--band-gradient`, white H1 24px/700/-0.025em, grid `1fr auto auto`; stuck adds `0 1px 0 --shadow-soft` | `nav-band-tabs-subtabs.png` | CSS |
| Band control (Year, Policies) | `globals.css:861-940`; `YearSlider.jsx`, `PolicySelector.jsx` | 40px high, radius 8, padding `0 14px 0 12px`, gap 8; fill `--band-control-fill` (teal-900 at 35%), 1px white-60% border; label 14px/400 white-90%, value 14px/600 white; hover/open fill 55%, border white; focus 2px white outline offset 2; inactive opacity .55 | `band-year-picker-open.png`, `band-policy-selector-open.png` | CSS+JS |
| View tabs (primary) | `globals.css:619-800`; `src/components/ViewTabs.jsx` | white strip, 1px top/bottom border, row 48px (40 once stuck); tab 16px/600 gray-600, padding `0 12px`, 18px icon gray-500, gap 8; hover teal-50 fill + `--band-teal` text; selected: sliding `.view-tabs-indicator` = teal-50 tint + 3px underline inset 8px, radius 3 3 0 0; focus 2px `--band-teal` outline, offset -2 | `nav-tab-hover.png`, `nav-tab-focus.png` | CSS+JS (indicator measures the tab) |
| Sub-tabs | `src/components/SubTabs.css`, `SubTabs.jsx` | identical geometry in a second white band; unselected colour `--c-subtab-muted` (teal-800 55% mixed with gray-500); hover teal-50 at 60%; selected same pill + underline | `nav-subtab-hover.png` | CSS+JS |
| Landing hero | `LandingPage.css:126-160` | glass panel: teal-50 -> white gradient, 1px teal-100 border, **4px teal-500 left border**, radius 12; H2 clamp(24-36px)/700; intro 15-17px gray-700; links teal-700 underlined in teal-200 | `landing-hero.png` | CSS |
| Landing boxes (3 entry cards) | `LandingPage.css:170-300`; `LandingPage.jsx` | grid 3 cols; card radius 12, 4px teal-500 top bar (`::before`), title 18-20px/600, description 15px gray-600, solid pill button "Explore ->" (teal-700, white, 14px/600, padding 7px 16px, radius 999), top-right arrow gray-400; hover: teal-500 border, `0 12px 28px strong`, translateY(-4px) | `landing-box.png`, `landing-box-hover.png` | CSS (strip icon circle) |
| Section heading | `globals.css:1001-1150`; `SectionHeading.jsx` | grid `auto 1fr`, gap 12; H2 20px/600 gray-800, lh 32; subtitle 15px gray-500, margin-top 4; "#" anchor appears on hover; margin `48px 0 20px` between sections | `section-heading.png` | CSS (strip `.section-icon` circle) |

## 3. Cards

Shared base: `.card, .hero-chart, .charts-grid > div, .charts-stack > div, .disclosure-card` (`globals.css:446-457`): white, `1px solid --card-border`, radius 12, padding `--card-padding` (24; 16 on phone), no shadow.

| Variant | Copy from | Spec | Crop | Port |
| --- | --- | --- | --- | --- |
| Chart card (the workhorse) | `globals.css:1162-1230`; header markup in any chart, e.g. `BudgetaryImpactChart.jsx` | `.chart-header` grid `1fr auto`; H3 18px/600 gray-900; `.chart-description` 14px/1.55 gray-600, margin-top 12, margin-bottom 12; then `.chart-controls`; plot; key; `.chart-logo` (80px wide logo, right aligned, padding-top 16); `.disclosure-in-card` fold | `card-chart-hero.png`, `card-chart-header.png` | CSS |
| Two-up chart grid | `globals.css:1306-1345` | `.charts-grid` 2 cols, gap 20, `only-child` spans both; 1 col at <=1024. `.charts-stack` column, gap 20 | `charts-grid-two-cards.png`, `m-charts-grid.png` | CSS |
| KPI / stat tiles (one card, figures side by side) | `globals.css:1549-1607`; `StatTiles.jsx:31` | `.stat-tiles-row` grid `repeat(var(--stat-count,2),1fr)`, gap 24; `.stat-value` 28px/700 gray-900 tabular, lh 1.2; `.stat-extra` (unit) 16px/500 gray-600; `.stat-label` 14px gray-600, mt 4; `.stat-sub` 13px/600 gray-500. 1 col and 24px value at <=768. Not rendered on the live page today; code only | none (see `tiles-forecast.png` for the live equivalent) | CSS |
| Headline tile with sparkline | `LivingStandards.css:612-740`; `livingStandards/HeadlineTile.jsx`, `sections/PovertyTiles.jsx`, `sections/ForecastHeadlineSection.jsx` | grid 3 cols gap 16 (1 col <=900); tile padding `14px 16px`, radius 12, 1px gray-200, **background teal-50**; head: icon + name 12.8px/600 gray-600 + info tip at right; value **32px/600** gray-800 tabular lh 1.1 (24px when text, e.g. "Falls 0.4pp"); sub 12px gray-500; sparkline with first/last year labels; meaning line 14px gray-600 above a 1px gray-100 rule | `tiles-poverty.png`, `tiles-forecast.png`, `tile-forecast.png`, `m-tiles.png` | CSS + small SVG |
| Example household card (result card) | `HouseholdCalculator.css:779-1290`; `personal/HouseholdCards.jsx` | grid of 4, padding `20px 20px 18px`, radius 12, `--pe-shadow-sm`, 3px accent top bar; name 16.8px/600 2-line clamp; figure **24px/700**, `-0.02em`, `+£44` in `--c-gain-text` / `−£155` in `--c-loss-text`, unit "a year" 15px gray-600; mini bar sparkline right; percentile track; description 15px gray-500; tag pill at foot (measure dot, name, value split by a hairline). Hover: translateY(-3px), border tinted to accent, `--pe-shadow-md`. Selected: `--card-tint` fill + accent border + 1px accent ring (no tick) | `household-cards-grid.png`, `card-household.png`, `card-household-hover.png`, `m-household-cards.png` | CSS (strip icon circle) |
| "Your household" CTA band | `HouseholdCalculator.css:1296-1420` | full-width teal card, white text, action button at right | `household-yours-cta.png` | CSS |
| Measure / policy card | `src/components/PolicyCards.css` (wins over the older rules in `globals.css:2110-2610`), `PolicyCards.jsx`, `PolicyChange.jsx` | grid 2 cols gap 20 with **subgrid rows** so heads, summaries and feet align across a row; padding `24px 24px 20px`, radius 12, `0 1px 2px faint`, 3px top bar in `--policy-accent`; kicker pill (12px/600 uppercase 0.04em, accent-tinted fill and border, radius 999, holds the category icon); name 17px/600 gray-900; summary 15px/1.6 gray-700, 2-line clamp; a ruled row of three facts (Starts / Ends / Affects: 13px icon + gray-500 label over a 15px/500 value, hairline above and below, vertical dividers); "What changes" step chart (dashed grey current law, solid teal policy, shaded gap with the signed difference); mini result tiles (teal-tinted, 1px teal border, radius 8, label over a 600 teal value); definition rows (600 term left, text right, hairlines); fold "About this result"; foot: underlined teal links with ExternalLink 14px + solid button "See its effect" (teal-700, white 14px/600, padding `9px 16px`, radius 8, ChartColumn 16px). Hover lift -2px. Live has no 46px icon box (that rule in globals is stale) | `card-policy.png`, `card-policy-head.png`, `card-policy-when.png`, `card-policy-spec-pchg.png`, `card-policy-foot.png`, `policy-cards-row.png`, `card-policy-details-open.png`, `m-policy-card.png` | CSS (strip the icon circle inside the kicker) |
| Comparison card (ours vs official) | `OBRDumbbellChart.jsx/.css`, `ObrDifferencePanel.jsx/.css:36`, `OBRComparisonTable.jsx/.css` | dumbbell rows (filled dot = ours, ring = official) on zebra `--c-row-band` rows radius 6, selected row `--c-hover` + 3px teal left edge; side panel: padding 16, radius 10, `--c-row-band` fill, 1px `--c-gain` border with 3px left; name 14px/600 gray-900, three bold figures under 12px labels; reason chip (pill, 12px/600, 1px border) | `card-obr-comparison.png`, `card-obr-panel.png`, `obr-dumbbell-row-hover.png` | CSS + SVG |
| Explainer / method card | `globals.css:804-840`, `methodology/Methodology.css`; `methodology/MethodUi.jsx` | `.method-card` base card; p 15px/1.6 gray-700; links teal-700; contents list at left with `aria-current` highlight; report CTA card | `method-card.png`, `method-contents.png`, `method-report-cta.png`, `m-method.png` | CSS |
| Takeaway line | `.trend-headline` (`YoungPeopleSection.css`), `.obr-deviation-statement`, `.later-years-note` | AB2026 has **no separate takeaway card**: the finding is the one-sentence `.chart-description` under each title, 14px gray-600, numbers inline | `trend-headline.png`, `card-chart-header.png` | CSS |
| Empty / unavailable plot | `globals.css:1617-1655`; `UnpublishedPlot.jsx`, `publication/UnavailableNotice.jsx` | gray-50 block radius 8, centred 14px/500 gray-600, max 34ch | (not on live today) | CSS |
| Skeleton | `publication/publication.css:206`; `publication/ViewSkeleton.jsx` | card-shaped grey bars | | CSS |

Sign colouring: `is-gain` -> `--c-gain-text`, `is-loss` -> `--c-loss-text`, zero/none -> gray-400/500; sign always printed with a true minus (U+2212). Units follow the number in a lighter, smaller weight ("a year", "pp").

## 4. Controls

| Control | Copy from | Spec | Crop | Port |
| --- | --- | --- | --- | --- |
| Options pill + dialog (the per-chart control) | `ControlBar.css`, `ControlBar.jsx` | button: min-height 32, padding `5px 10px`, radius 16, 1px gray-300, sliders icon gray-500, summary 12px/600 teal-800, chevron; hover teal-500 border + gray-50; open gray-100; focus 3px `--focus-ring`. Dialog: radius 8, padding `12px 14px 14px`, `0 8px 24px strong`, title 13px/600, group label 12px/600 gray-500. Phone (<=640): bottom sheet radius 16 16 0 0 with scrim | `pill-control-bar-button.png`, `control-bar-dialog-segmented.png`, `control-bar-dialog-map.png`, `m-control-bar-sheet.png` | CSS+JS |
| Segmented control | `ControlBar.css` `.control-bar-segments` / `.control-bar-segment`; sliding thumb `globals.css:3033-3100` + `hooks/useSegmentThumb` | track gray-100, padding 2, radius 8, gap 2; segment min-height 28 (36 phone), padding `0 10px`, 12px gray-600, radius 6; **selected: white fill, 600, teal-800, `0 1px 2px strong`** | `control-bar-dialog-segmented.png` | CSS (+JS for the slide) |
| Icon segmented (chart / table) | `ViewToggle.css`, `ViewToggle.jsx` | 40px high, 36px wide cells, 1px gray-300, radius 6, divider gray-200; selected teal-50 fill + `--c-gain-text` icon; icons 16px stroke 1.8 | `view-toggle-and-download.png` | CSS |
| Dropdown (PillSelect) | `PillSelect.css`, `PillSelect.jsx` | toggle 32px, radius 999, 1px gray-300, 12px; value in a teal-50 badge 22px high 12px/600 teal-800; list: radius 8, padding 4, `0 8px 24px strong`; option min-height 40, 14px, radius 6; active teal-50; selected 600 teal-700 (weight + colour only, no tick) | `ls-controls.png` (closed); open state not captured, see `band-year-picker-open.png` for the same list style | CSS+JS |
| Year picker | `YearSlider.css`, `YearSlider.jsx` | same list style; "Play" row on top in teal-700/600 | `band-year-picker-open.png` | CSS+JS |
| Multi-select menu (policies) | `PolicySelector.css`, `PolicySelector.jsx` | rows min-height 56, hairline between rows, native 18px checkbox (accent teal), name 14px/500 + 12px caption, info tip at right; footer: two outline buttons + solid "Done" (`--band-teal`, white, radius 8). Hover gray-50 (teal-50 if selected). Phone: bottom sheet with `--scrim` | `band-policy-selector-open.png`, `m-policy-sheet.png` | CSS+JS |
| Toggle chips (series on/off) | `SeriesToggle.css`, `SeriesToggle.jsx` | 28px, radius 999, padding `0 11px 0 8px`, 12.5px; off: gray-300 border, gray-500 text, grey swatch; **on: fill = series colour at 14%, border = series colour at 55%, text gray-700/600**; hover border darkens; focus 2px accent outline offset 2 | `series-toggle-chips.png`, `series-toggle-chip-hover.png`, `series-toggle-chip-focus.png` | CSS |
| Measure key chips (legend that can be clicked) | `MeasureKey.css:60-125`, `MeasureKey.jsx`, `MeasureRowLabel.jsx` | 38px, radius 19, 1px card-border, padding `3px 12px 3px 6px`, name 12.5px/500 gray-800; hover/active gray-400 border + `--c-hover` fill; "Policies" title 12px/600 gray-500 with a right rule | `measure-key-chips.png` | CSS (strip `.mrl-icon` circle; use a plain colour dot) |
| Choice tiles (form radio cards) | `HouseholdCalculator.css:242-300` | min-height 44, padding `8px 12px`, radius 8, 1px gray-300; **checked: teal-50 fill, teal-600 border + 1px inset ring, 600 teal-800** | `household-form-view.png` | CSS |
| Primary button | `.calculate-button` `HouseholdCalculator.css:1598`; `.preset-button` `globals.css:982`; `.landing-box-explore` | teal-700 fill, white 14.4px/600, height 40, padding `0 24px`, radius 8; hover teal-800 | `household-form-view.png`, `landing-box.png` | CSS |
| Outline button / light pill | `.light-pill-button` `PillSelect.css:160`; `.chart-download-button` | white, 1px gray-300, hover teal-500 border + teal-700 text | `view-toggle-and-download.png` | CSS |
| Search field | `ConstituencyMap.css:63-110` | 32px pill, 1px gray-300, magnifier from `--icon-search`, 12px placeholder | `map-top-bar-controls-search.png` | CSS |
| Map zoom buttons | `ConstituencyMap.css:462` | small ghost icon buttons | `map-zoom-controls.png` | CSS |
| Sliders | none on the live page: the "YearSlider" is a dropdown. No range input to copy. | | | |

State summary: hover = teal-500 border (light surfaces) or teal-50 tint (tabs, menu rows); focus-visible = `outline: 2px solid --pe-teal-500; outline-offset: 2px` for buttons/links inside `.main-content` (`globals.css:792`), 3px `--focus-ring` box-shadow for pills and fields, inset 2px for tabs; disabled = gray-400 text, not-allowed.

## 5. Icons

- **Two sources, one look.** (a) `src/components/TitleIcon.jsx`: 43 hand-inlined glyphs "after Lucide (ISC)", `viewBox 0 0 24 24`, `fill none`, `stroke currentColor`, **stroke-width 1.8**, round caps and joins (`:321-339`). Names: tag receipt briefcase coins house key percent trend bars hbars users landmark dots map list cap armchair refresh fuel flame clock building calendar link user piggy cart sparkle calculator scale wallet lifebuoy banknote compass cake usersRound userPlus pin layers fileText book database alert. (b) `lucide-react` 0.577.0 imported directly in ~25 files (Info, ChevronRight/Down, ExternalLink, ArrowRight, X, ChartLine, Table, CalendarDays, ListChecks, Github, Package, ...), passed `strokeWidth={1.8}` (2 for chevrons/arrows, 2.2 on the CTA).
- For the new dashboard: use `lucide-react` at stroke 1.8 throughout; no need to copy the inlined paths unless SVG export needs them (`titleIconPaths`, `TitleIcon.jsx:316`).
- Sizes: tabs and sub-tabs 18; section heading 18; card title 16; landing 24; household card 22; info tip and note 16; view toggle 16; inline in policy cards 13-14; measure dot 11-13; chevrons 16-18.
- Colour: `currentColor`. Tabs gray-500 -> `--band-teal` on hover/selected; titles `--c-gain-text`; info tips gray-400 -> gain-text on hover; on the band white.
- Where: every view tab and sub-tab, every section heading, every card title, band controls, legend chips (per measure), tiles, buttons (download, chart/table), notes (Info), external links.

## 6. Charts

Everything chart-wide is in `src/utils/chartTheme.js` (copy the file; it is framework-light and only its Recharts prop objects are RC-specific).

| Aspect | Value | Ref |
| --- | --- | --- |
| Grid | horizontal only, `#E5E7EB`, dash `3 4` | `chartTheme.js:356` `GRID_PROPS` |
| Ticks | 12px, `#6B7280`; axis line `#D1D5DB`; no tick marks on y | `:471-472` |
| Axis title | 12px/500 `#4B5563`, rotated in the y gutter (22px) | `:474-485` |
| Margins | `{top:10,right:8,left:0,bottom:0}`; plot spans the card | `:492` |
| Bars | outer radius 5, stacked gap 1.5px, flush inner joins (`barShape`, `roundedRectPath`) | `:365-470` |
| Zero line | `#374151` solid | `CHART_COLOURS.zeroLine` |
| Net line | black, with white-ringed dots | `--c-net` |
| Before / reference dashes | `6 4` / `4 3`; unselected series opacity 0.5 | `:341-350` |
| Selected-year shade | pale teal column behind the chosen year | `SelectedYearShade.jsx` |
| Hover cursor | `--c-hover` band behind bar/row | `:353` |
| Tooltip | white card, 1px gray-200, radius 8, `0 4px 16px soft`, padding `8px 12px`, 13px; label 13px/600; rows `swatch / name / value` grid with right-aligned tabular values; net row 600 above a 1px rule; min 200 max 300 wide | `ChartTooltip.css:3`, `ChartTooltip.jsx`, `FloatingTooltip.jsx`, `ViewportTooltip.jsx` |
| Legend | below the plot, centred, 13px (12 phone) gray-700/400; two custom forms: `GroupedLegend` (rows of swatch + label, `GroupedLegend.css:4`) and clickable chips (`MeasureKey`, `SeriesToggle`) | `chartTheme.js:516-534` |
| End labels | value printed at the row end (`.row-band-value`, dumbbell `-£520m`), in gain/loss text colour; line charts label series in the legend chips rather than at line ends | `MeasureDumbbell.css`, `OBRDumbbellChart.css` |
| Row charts | zebra `--c-row-band`, radius 6; active row `--c-hover`, name turns 600 | `globals.css:3280-3307` |
| Logo | 80px PolicyEngine wordmark bottom right of every chart card | `globals.css:1704` |
| Axis helpers | `zeroBasedAxis`, `symmetricAxis`, `fittedAxis`, `fitTicks`, `fiscalYearTicks` | `chartTheme.js:563-800` |
| Export | PNG / SVG / CSV per chart; literal colours for export come from `CHART_COLOURS` | `utils/exportChartAsSvg.js`, `utils/chartCsv.js` |

Crops: `card-chart-hero.png` (stacked bars + net line), `chart-tooltip-bar.png`, `card-waterfall.png`, `waterfall-rows.png`, `card-scatter.png`, `card-trend-age.png` (lines), `card-measure-dumbbell.png`, `card-measure-shares.png`, `card-poverty-dumbbell.png`, `card-ls.png`, `grouped-legend.png`, `ls-ramp-legend.png`, `map-key-legend.png`, `map-seat-tooltip.png`.

## 7. Tables

| Table | Copy from | Spec | Crop |
| --- | --- | --- | --- |
| Comparison table | `OBRComparisonTable.css:29-75` | `border-collapse: collapse`, 14px tabular; cells `7px 12px`, **no cell borders**; header 13px/500 gray-500 with one 1px gray-200 rule below; numbers right aligned, fixed 7.5rem; zebra by `--c-row-band` with 6px rounded row ends; hover `--c-hover`; zero/none gray-400; footnotes 12px gray-500 | `table-obr-comparison.png` |
| Data table behind a chart | `LivingStandards.css:298-335` (`.ls-table`) | same pattern; `change-positive` gain text, `change-negative` loss text | `table-ls.png` |
| Scrolling ranked table | `ConstituencyTable.css:3` (`.ctable`) | scrolls inside the card, sticky header | (see `shots/pop-all-1440-full.png`) |

Every chart with a table twin switches with the icon segmented control (section 4), not a separate tab.

## 8. Folds, tips, notes, downloads

| Component | Copy from | Spec | Crop | Port |
| --- | --- | --- | --- | --- |
| "About this chart" fold (in card) | `Disclosure.jsx:116`, `Disclosure.css`, `globals.css:1233-1290`, `ChartMoreInfo.jsx:6`; height animation `globals.css:3155-3190` (`.expander-body`, `useCollapse`) | sits after the logo, `border-top: 1px solid card-border`, margin-top 16; toggle full width, title 15px/600 gray-800 + a 13px gray-500 preview line listing the contents ("What it shows · How it's calculated · Definitions · Caveats · Sources"); chevron right, rotates 180; hover teal-700; body 14px/1.55 gray-600 | `chart-logo-and-fold-closed.png`, `fold-about-open.png` | CSS+JS |
| Standalone fold card | same, `.disclosure-card` (`globals.css:1233`) | card with padding `0 24px`, toggle padding `16px 0` | `fold-disclosure-card-closed.png`, `fold-disclosure-card-open.png` | CSS+JS |
| Collapsible group | `policies/UnmodelledMeasures.css:14` (`.umm-toggle`) | section-level expander | `unmodelled-measures.png`, `unmodelled-measures-open.png` | CSS |
| Tooltip / info popover | `Tip.jsx`, `Tip.css`; tokens `globals.css:204-214` | trigger `.info-tip`: 20px button, 16px Info icon gray-400 -> gain-text; tip: fixed, max 280 (360 wide), white, 1px gray-200, radius 8, `0 4px 16px soft`, padding `8px 12px`, 13px/1.45 gray-800, fades in 120ms after 80ms | `tip-info-popover.png` | CSS+JS |
| Note (inline caveat) | `Note.jsx:13`, `globals.css:1674` | Info 16px gray-400 + 13px/1.5 gray-600 text, margin-top 8 | | CSS |
| Callout | `.obr-panel` (teal left edge, section 3); `.method-note` is plain text inside a method card, not a box; notice colours `--c-notice-bg/text` for provisional data (`publication.css:41`) | no heavy alert boxes; a 3-4px left border is the callout signature (also the landing hero) | `card-obr-panel.png`, `landing-hero.png` | CSS |
| Source notes | `SourceLink.jsx:8`, `livingStandards/sources.jsx`, `.chart-note` (`globals.css:1665`), `.card-foot-note` (`:3195`), `.policy-card-source` (`:2559`) | 13px gray-500; link teal-700 with ExternalLink 14px | `card-policy-foot.png` | CSS |
| Download button + menu | `ChartDownloadMenu.jsx`, `ChartDownloadMenu.css` | 40x40 icon button, 1px gray-300, radius 6, gray-600 -> teal-700 with teal-500 border on hover/open; menu min 168, radius 8, padding 4, `0 8px 24px soft`; items 14px with format 600 left and detail 13px gray-500 right; hover teal-50 | `download-menu-open.png`, `view-toggle-and-download.png` | CSS+JS |
| Section "#" anchor | `globals.css:1091-1130` | appears on heading hover, copies link, shows "Copied" | | CSS+JS |
| Toast | `publication/UpdateToast.jsx`, `publication.css:571` | | | CSS |

## 9. Dark mode and responsive

**Dark mode: none.** No `prefers-color-scheme`, `data-theme` or `.dark` rule exists in `src/`; a capture with `colorScheme: dark` is pixel-identical to the light one (`crops/darkmode-probe-1440.png` vs `shots/pop-finances-1440-full.png`, zero-pixel diff). If the new dashboard needs dark, it must be designed; the token layer makes it feasible but nothing can be copied.

**Breakpoints** (max-width unless noted; counts across all CSS: 768 x22, 600 x13, 640 x11, 480 x11, 1024/1025 x15, 899/900 x13):

| Width | What changes | Ref |
| --- | --- | --- |
| <=1024 | `.charts-grid` to 1 col; page padding 24; `--bar-pad-x` 24 | `globals.css:1733` |
| <=900 | tiles 3 -> 1 col | `LivingStandards.css:619` |
| <=899 | band becomes two rows (title+policies / year), 104px | `globals.css:1749` |
| <=768 | `--card-padding` 16; page padding 16; H1 18px; band controls drop their labels; stat tiles 1 col; legends 2-col grid; policy cards 1 col (`:2918`); menus anchor left | `globals.css:1782` |
| <=640 | option dialogs become bottom sheets with scrim; section heading compacts | `ControlBar.css`, `globals.css:1134` |
| <=600 | tabs scroll sideways with edge fades, 15px, gap 4; once stuck both tab rows show **icons only**, with a home/overview button at the left (`HomeButton.jsx`, `OverviewDrawer.jsx`) | `globals.css:768`, `SubTabs.css` |
| <=480 | band: title on its own row, H1 16px, 92px | `globals.css:1860` |
| `pointer: coarse` | larger hit areas (info tip +10px), tap hints | `globals.css:3245`, `Tip.css` |
| JS mirrors | `NARROW_QUERY` 768, `PHONE_QUERY` 480 | `chartTheme.js:12-20` |

Phone crops: `m-top-finances.png`, `m-stuck-bars-icons-only.png`, `m-policy-sheet.png`, `m-control-bar-sheet.png`, `m-landing.png`, `m-policy-card.png`, `m-household-cards.png`, `m-tiles.png`, `m-charts-grid.png`, `m-method.png`.

## 10. ui-kit usage (0.12.0)

Thin. Only: `PolicyEngineShell` from `@policyengine/ui-kit/layout` (site nav), `@policyengine/ui-kit/styles.css`, `@policyengine/ui-kit/theme.css` (teal scale `--color-teal-*` used by the band gradient), `@policyengine/ui-kit/legacy/tokens.css` (`src/app/layout.tsx:1-11`, `globals.css:1-2`). **No ui-kit components are used inside the dashboard body**; every card, control and chart wrapper is the repo's own JSX + CSS. So the redesign can copy these files directly whether or not the target uses the kit.

## 11. Suggested copy order for uk-growth-with-ai

1. Tokens: `globals.css:1-345` `:root` blocks + `docs/COLOURS.md` + `src/colourGuard.test.js`.
2. `utils/chartTheme.js` (+ `chartMotion.jsx`).
3. Chrome: title band, `ViewTabs`, `SubTabs`, `SectionHeading`.
4. Card shell + chart header + `ChartDownloadMenu` + `ViewToggle` + `Disclosure`/`ChartMoreInfo` + `Tip` + `Note`.
5. Controls: `ControlBar` (pill + dialog + segments), `PillSelect`, `SeriesToggle`, `MeasureKey`.
6. Tiles (`HeadlineTile` / `.forecast-tile`), then result cards (`HouseholdCards`) and policy cards if scenarios need them.
7. Tables (`.comparison-table`).
Strip the icon chips at each step (section "Conflicts").

## Gaps in this capture

- PillSelect open list not captured (click timed out); `method-note` crop not captured; its list style is identical to the year picker crop.
- Stat tiles (`StatTiles.jsx`), empty-plot, skeleton and toast states are documented from code only; they are not on the live page at rest.
- Household calculator: the form view was opened (`household-form-view.png`) but no calculation was submitted, to keep load on the live backend at zero.
