# uk-growth-with-ai dashboard: current-state UX audit

Audited: `http://localhost:4340`, PR #40, branch `dashboard/ab2026-tabs` at `2ebcc4d` (read-only; server untouched).
Method: headless Chromium, desktop 1440×900 and phone 390×844 (touch, 2× DPR); 14 screens × 2 viewports, folds closed and open; 51 state, tooltip and focus captures; DOM audit (overflow, target sizes, contrast, text-transform, landmarks); full text dump with every fold open; source read for conditional content. AB2026 glanced live (7 views, desktop + phone) and in `/Users/vahid/ab2026-latest/src`.

Files (all under this folder):
- `shots/` — `{d|m}-{tab}[-{sub}]-{top|full|open-full}.png` (84 files)
- `states/` — selector states, tooltips, focus rings, phone interactions (51 files)
- `ab2026/` — live AB2026 reference shots
- `tools/` — capture scripts, `dump.json` (text, folds open), `audit.json`, `states.json`, `more.json`, `ab.json`

**Lead caveat for whoever merges the three audits:** AB2026 itself puts section, card-title, legend and landing icons inside tinted chips, and uses uppercase kickers on its policy cards. Both conflict with the rules in this brief (no icons in coloured boxes; sentence case). The other two agents will report them as part of AB's visual system; they should not be carried over.

Not verified:
- I opened 22 of the 160 images by eye (all 14 desktop screens' key states among them, 5 phone views, 4 AB2026 views). Everything else is backed by the DOM audit and text dump only. Not opened: most phone full-page shots, the focus-ring crops, `d-pill-open`, `d-tip-linechart`, the rule-state crops, Method → Limitations/History, Literature → Comparison matrix/Sources and Code screens on desktop (text read in full; layout judged from structure and page heights).
- Phone tooltip on the Literature matrix: tap fired, the shot does not show a tip. Unconfirmed, not reported as a bug.
- `uk_low`/`uk_high` closed-capital "pending" rendering: seen only as the "18 of 24 solves done" notice and in source.
- AB2026: only Population impact (Public finances), Policies, Methodology and the landing were opened; By age, Living standards, Household calculator and Pre-measures forecast are described from their DOM (headings, controls, folds) and source, not from looking.
- Contrast figures come from computed colours against the nearest opaque background; text over the header gradient was excluded as a false positive.

---

## 1. Inventory

### 1.0 Shell (every screen)

| ID | Item | Content / behaviour |
|---|---|---|
| S-01 | PolicyEngine site header | Logo, Research, Tools, Model, API, Python, About, Donate, country selector; burger on phone |
| S-02 | Title band | h1 "AI and the UK economy" (browser title is "The macroeconomic effects of AI on the UK" — two names) |
| S-03 | Scenario pill (`BandPill`) | Sliders icon, "Scenario", value. Options: UK low · UK central (note "Headline") · UK high · Korinek et al. (upper) (note "US “substantial” inputs"). URL `?s=`. Faded (opacity 0.55, `aria-disabled`, `title` only) on Method, Literature, Code |
| S-04 | Main tab row (`ViewTabs`) | Results (trend) · Cohorts (usersRound) · Scenarios and method (book) · Literature (scale) · Code (code). URL `?tab=`. Scrolls sideways on phone (638px of tabs in 370px) |
| S-05 | Sub-tab row | Same component, smaller; present on 4 of 5 tabs. URL `?sub=` |
| S-06 | Footer | Logo, About us, Donate, Developer tools, Privacy policy, Terms, © |

Sub-tabs: Results → Overview / Income and output / By variable / Public finances. Method → Scenarios / How it's built / Limitations / History. Literature → Comparison matrix / Where our numbers sit / Sources. Code → Reproduce / Use OG-UK. Cohorts has none. **14 screens.**

### 1.1 Results → Overview (question: "what happens, in one line, and how sure?")

| ID | Item | Content |
|---|---|---|
| R-OV-01 | Hero question (h2) | "What happens to the UK economy if AI arrives in 2028?" |
| R-OV-02 | Hero answer | "Output rises a little, pay rates fall, and the UK keeps less of the gain than GDP suggests." (wording varies by scenario) |
| R-OV-03 | Context line | "UK central scenario, 2031, vs the OBR-central path ⓘ. Change the scenario at the top of the page." Tooltip on "OBR-central path" |
| R-OV-04 | KPI card: Output (GDP) | +0.92%, "Everything produced in the UK", ⓘ tooltip, range strip with four scenario dots (Low/Central/High/Korinek) — each dot is a tooltip **and a scenario selector** |
| R-OV-05 | KPI card: Pay | −1.27%, "What a given amount of work earns", ⓘ, range strip (High and Central coincide: both −1.27%) |
| R-OV-06 | KPI card: Income UK residents keep | +0.57%, "Output less what goes to foreign owners", ⓘ, range strip |
| R-OV-07 | "Why" (h3) | Three icon + sentence items: productivity → output; capital share → pay; "About 77% of the new capital is foreign-owned…" |
| R-OV-08 | "How sure is this?" strip | One sentence + link "See the figures with no foreign capital in the details" (jumps to R-OV-10) |
| R-OV-09 | Notice (conditional) | "18 of 24 solves done; the rest show “pending”." Shown for UK low / UK high only |
| R-OV-10 | Section heading "Explore the details" | "Three kinds of AI and both capital closures, 2031, differences from the OBR-central path." |
| R-OV-11 | Card "Four measures, three kinds of AI" | Arm toggles (3, show/hide); dumbbell chart: Wage rate, Income UK residents keep (GNI), … after depreciation (NNI), Total output (GDP) × 3 arms × circle (central) and diamond (closed capital); 24 values, each dot a tooltip; "Stress test: held at 0 by design" under GDP; axis −2%…+2%; "pending" text where unsolved |
| R-OV-12 | Dot key | Circle = central closure, diamond = closed capital, link "Closures and terms →" (goes to Method top) |
| R-OV-13 | Fold card "Why the stress test holds GDP at 0" | Preview "As in the OBR's Box 2.2 displacement scenario"; one paragraph (`StressNote`) |

### 1.2 Results → Income and output (question: "how do the gaps build up year by year?")

| ID | Item | Content |
|---|---|---|
| R-IN-01 | Section heading | "National income and GDP, 2027–2031" / "How the gaps build up from the 2028 surprise." |
| R-IN-02 | Legend bar: arm toggles | Automation + productivity · Automation, technology unchanged · OBR-style stress test: no output gain. Multi-select show/hide, shared across all Results sub-tabs (not in URL) |
| R-IN-03 | Legend bar: closure selector | "Closure": Central (ζK = 0.1) · Closed capital (ζK = 0) · Both. Radio group, URL `&closure=`. "What's this?" tooltip that also navigates to Method |
| R-IN-04 | Chart card "Income UK residents keep (GNI)" | One-line direction summary; unit line; line chart, 3 arms, AI-shock marker 2028, 2031 shaded, end labels are series names; hover tooltip by year; PE logo; fold "About this chart" (What it shows · How it's calculated · Caveats) |
| R-IN-05 | Chart card "Total output (GDP)" | Same; caveat links to Literature → Where our numbers sit |
| R-IN-06 | Conditional states | "Both": solid/dashed key line; pending note "Closed-capital results pending: …"; empty states ("Every series is hidden…", "Closed-capital results pending for this scenario.", "No solve for this scenario yet.") |

### 1.3 Results → By variable (question: "what moves underneath?")

| ID | Item | Content |
|---|---|---|
| R-VA-01 | Section heading | "Effect by variable, 2027–2031" / "Hover, tap or focus a chart for each year." |
| R-VA-02 | Legend bar | Same arm toggles + closure selector as R-IN-02/03 |
| R-VA-03 | Group "Demand (%)" | Mini charts: Consumption (with amber note "consumption stays below the OBR-central path through 2031, while national income is above it"), Investment |
| R-VA-04 | Group "Factors (%)" | Capital stock, Labour |
| R-VA-05 | Group "Prices and shares (percentage points)" | Interest rate, Labour share |
| R-VA-06 | Axis note | Dashed horizontal = OBR-central path; dotted vertical = 2028 shock; shared scales |

Each mini chart: icon, title, "2031 value at the line end", no y-axis, three end labels, hover tooltip. No "About this chart" fold, no PE logo.

### 1.4 Results → Public finances (question: "what happens to debt and tax, and can I trust it?")

| ID | Item | Content |
|---|---|---|
| R-PF-01 | Section heading | "Public finances" / "Debt and tax as shares of GDP, central closure." |
| R-PF-02 | Legend bar | Same arm toggles + closure selector |
| R-PF-03 | Chart card "Debt/GDP, 2027–2036" | Five-sentence summary; line chart to 2036 with end values (+1.99 / +2.67 / +3.40pp), markers "AI shock" and "debt rule starts"; fold "About this chart" (What it shows) |
| R-PF-04 | Chart card "Tax/GDP, 2027–2031" | End values −0.19 / −0.21 / −0.24pp; fold (What it shows · Caveats) |
| R-PF-05 | Card "Our tax and debt effects are likely understated" | Paragraph; two figures "Tax/GDP in 2031: model −0.19pp" → "With UK tax rates, about −0.30 to −0.37pp"; amber italic caveat |
| R-PF-06 | Fold "How the scaling works" | Paragraph; two range strips (Labour vs capital tax-rate gap: OG-UK about 14pp vs OBR 19–23pp; Employer National Insurance: PolicyEngine-UK average vs OG-UK flat rate) each with an effect chip ("Understates the revenue fall (main effect)" in an amber box; "Partly offsets the first row (smaller)"); "Net:" line |
| R-PF-07 | Fold "Sources" | Four source lines, link to Method |
| R-PF-08 | Card "How the result changes with the spending rule" | Switch: Spending follows GDP · Fixed spending · Debt-neutral (local state, `aria-pressed`). Default → one sentence. Fixed spending → "No solve for this rule yet…". Debt-neutral → 3×4 table (GDP, GNI, Wage rate, Consumption by arm) + note |

### 1.5 Cohorts (question: "who gains, who loses?")

| ID | Item | Content |
|---|---|---|
| C-01 | Section heading | "Who gains, who loses" / "Welfare by birth year and lifetime-earnings group when AI arrives as a surprise in 2028." |
| C-02 | Note (conditional) | "Cohort results exist for UK central only, so this tab shows UK central whatever scenario is chosen above." |
| C-03 | Control: Arm | Single-select segment, 3 arms |
| C-04 | Control: Closure | Central (ζK = 0.1) · Closed capital (ζK = 0) — no "Both", local state, separate from Results' closure |
| C-05 | Control: Fiscal rule | Debt-neutral transfers (headline) · Common fiscal rule (comparison) |
| C-06 | Headline paragraph block | Four bold-led sentences: Who loses / On average / Where it comes from / By earnings — ten figures in running prose |
| C-07 | Native `<details>` "The same average by form" | Consumption / leisure / bequests split |
| C-08 | Chart card "Welfare change by birth year" | Summary restates the selection; line chart 1929–2060, 7 earnings groups + "All groups" dashed; legend toggles (4 hidden by default, struck through); marker "Enter after 2028 →"; fold "About this chart" (all five sections) |
| C-09 | Section heading "Why" | No subtitle |
| C-10 | Info card "Consumption dips first, then recovers" | |
| C-11 | Info card "Lower earners rely less on wages" | Two paragraphs |
| C-12 | Info card "Who pays the fiscal cost" | |
| C-13 | Info card "Young adults bear the stress test" | (arm-dependent) |

### 1.6 Scenarios and method

Step indicator (M-00): seven numbered steps — The shock, Timing, Scenarios, Arms (on "Scenarios"), Closures and rules, The model (on "How it's built"), Limitations (on "Limitations"). Clicking a step changes sub-tab and scrolls.

**Scenarios sub-tab** (question: "what exactly is being assumed?")

| ID | Item | Content |
|---|---|---|
| M-SC-01 | Step 1 "What the shock is" | 3 info cards, each with a fold: Automation (How it maps) · Productivity (Why Z is not a percentage) · Everything else unchanged (The OBR-central path) |
| M-SC-02 | Step 2 "When it happens" | Card "The timing, 2026–2036": phase strip + bar timeline, 11 focusable year columns with tooltips |
| M-SC-03 | Step 2 cards | One starting point, 2027 (How the restart works) · A surprise in 2028 (What the first year contains) · The 2028 jump (Why there is a spike) |
| M-SC-04 | Step 3 "The scenarios" | Card "Scenario inputs, 2031": scatter map (4 points, focusable) + 3-line key |
| M-SC-05 | Step 3 scenario cards | UK low (UK range) · UK central (Headline scenario) · UK high (UK range) · Korinek et al., US "substantial" (upper) (US inputs): labour share, output at fixed inputs, γ; fold "Sources and arithmetic" on each |
| M-SC-06 | Step 3 footnote | "Derivations: UK calibration note. Published figures are compared on Literature." |
| M-SC-07 | Step 4 "Three arms per scenario" | 3 cards with coloured top border + kicker (Main result / Shown beside the stress test / A bound, not a forecast), "Output at fixed inputs" box, fold "How Z is set" |

**How it's built** (question: "how does the model produce these numbers?")

| ID | Item | Content |
|---|---|---|
| M-BU-01 | Step 5 "Closures and the spending rule" | Cards: Central closure ζK = 0.1 (fold "Why it is central") · Closed-capital bound ζK = 0 (fold "What it bounds") |
| M-BU-02 | Card "Three income measures" | GDP → GNI → NNI |
| M-BU-03 | Three rule cards | Spending follows GDP (Default, on every Results chart) · Fixed spending (Sensitivity) · Debt-neutral (For cohort welfare); footnote on the 2036 debt rule |
| M-BU-04 | Step 6 "How it is solved": card "The model in one row" | Four clickable blocks (Households, Firms, Government, Markets) opening a detail panel |
| M-BU-05 | Card "Many generations at once" | Schematic bars by age band |
| M-BU-06 | Card "How labour is taxed" | Employee NICs / Employer NICs 15% flat vs 11.0% average; fold "Employee and employer NICs" |
| M-BU-07 | Card "Steady state, then the path" | Fold "Time path iteration" |
| M-BU-08 | Card "Gated before and after" | Fold "The two gates" |

**Limitations** (M-LI-01): step 7 heading + seven cards, each with a "Detail" fold: One sector · No unemployment · Imposed technology paths · Slow capital response · Revenue responds too little · Part of the effect may be counted twice · Perfect foresight.

**History** (M-HI-01): heading "Revision history" + one card with fold "All changes" (7 dated entries, issue links). No step number.

### 1.7 Literature

| ID | Item | Content |
|---|---|---|
| L-MX-01 | Comparison matrix | Heading "What each source can represent"; card "Coverage by channel": key (Modelled / Partly / No / Not stated), 9 channels × 5 sources (OG-UK, Korinek, Moll & Imas, OBR, IMF UK), 45 focusable cells with tooltips; on phone becomes 9 stacked cards; source footnote |
| L-MX-02 | Three info cards | Only OG-UK: households · Only Korinek et al.: jobs and tasks · What nobody models |
| L-NU-01 | Card "GDP: ours in 2031 against published estimates" | Range bars: 2 "ours" rows, 8 published; legend of 5 mark types |
| L-NU-02 | Info card "Why UK central GDP is below the IMF's" | Three paragraphs |
| L-NU-03 | Card "Average wage: ours in 2031 against published estimates" | 2 ours, 4 published ("No number published" for IMF UK) |
| L-NU-04 | Card "The OG-UK baseline against the OBR" | 1.57% vs 1.6% + four-bar chart |
| L-SO-01 | Sources | Heading + two groups (UK official and UK-specific: 10 entries; Model-based studies: 6 entries), each: short name, full title, one-line finding, locator, occasional access note |

### 1.8 Code

| ID | Item | Content |
|---|---|---|
| K-RE-01 | Heading "Reproduce the results" + card "Before you start" | Versions used (7 rows), You need (3 bullets), four folds: Install the model · Patch OG-Core for a time-varying γ · Environment · The sp helper used below |
| K-RE-02 | Card "The 2028-surprise pipeline" | Nine-step chip row (anchor links) + output line |
| K-RE-03 | Nine step cards | Number, title, file path, one sentence, fold "Commands and detail" with copy button |
| K-RE-04 | Info cards | "Model units, not pounds" · "Check the numbers" |
| K-OG-01 | "Use OG-UK yourself" | Five cards each with a "Code" fold (Install, Define a reform, Solve the steady state, Run the transition path, More sectors) + "Documentation" card |

### 1.9 Reader's journey today

1. Lands on Results → Overview: one-sentence answer, three KPIs, why, how sure. Good first screen.
2. Scrolls into "Explore the details": a 24-value dumbbell chart that introduces arms and closures before either has been explained.
3. Income and output → By variable → Public finances: paths, mechanisms, fiscal. Each repeats the legend bar.
4. Cohorts: distribution by birth year. Uses its own three selectors and ignores the scenario pill.
5. Scenarios and method: seven numbered steps spread over three sub-tabs, then an unnumbered History.
6. Literature: who models what, where the numbers sit, sources.
7. Code: reproduce; use OG-UK.

Definitions the reader needs on screen 1–2 (arm, closure, OBR-central path) live on screen 5–6.

---

## 2. Problems, ranked by impact

### High

**P1. The same choice is made in different places, in different ways, with different names.**
- Scenario: header pill, *and* the 12 KPI range dots on Overview (each silently changes the global scenario), *and* ignored on Cohorts (pill stays live and bright there while the data is UK central only; the only signal is a note, C-02).
- Closure: Results has Central / Closed capital / Both in the URL; Cohorts has its own two-option local segment; Overview has no selector and always shows both as circle/diamond. (Public finances' subtitle does follow the selector.)
- Arms: multi-select show/hide legend on Results; single-select "Arm" segment on Cohorts. Same three labels, opposite behaviour.
- Rule: "Spending rule" (three options, `aria-pressed` switch) on Public finances; "Fiscal rule" (two options, radio segment) on Cohorts; "Debt-neutral" vs "Debt-neutral transfers"; Cohorts' "Common fiscal rule" matches none of Method's three rule names (Spending follows GDP / Fixed spending / Debt-neutral), so the reader cannot tell whether it is the default rule.
- State persistence differs: scenario and closure in URL; arms, rule and all Cohorts selectors lost on reload, so views cannot be shared.

**P2. Two tab rows on four of five tabs; 14 screens; the step indicator spans three of them.** The convention is flat tabs; AB2026 uses a second row on only the two tabs with many charts. Here Code has a second row for two items, Literature for three, and Method's 1–7 stepper jumps the reader between sub-tabs (step 5 lives on a different screen from step 4; History is outside the sequence). On a phone both rows scroll sideways and neither shows how many tabs remain ("Scenarios and m…", "By var…").

**P3. "What's this?" and cross-links break the reader's place.**
- "What's this?" next to Closure opens a tooltip and, on click/tap, navigates to Method → Scenarios, top of page — not to "Closures and the spending rule", which is on How it's built. On a phone the tap navigates at once, so the tooltip is never readable.
- "Closures and terms →" (R-OV-12) has the same wrong destination.
- The GDP chart's Literature link is a plain `href`: full reload to `?tab=literature&sub=numbers`, dropping scenario and closure (verified from `s=uk_high&closure=both`).

**P4. By variable charts are close to unreadable.** A shared y-scale across each unit group flattens four of the six mini charts into near-horizontal lines; three end labels overlap or sit within 1–2px of each other (−0.4/−0.6/−0.8, −1.6/−1.6/−1.6); there is no y-axis; in "Both" the dashed lines sit on the solid ones. The identical subtitle "2031 value at the line end" is repeated six times. No "About this chart", no logo — inconsistent with every other chart card.

**P5. Overview's second half overloads the entry screen.** "Four measures, three kinds of AI" shows 24 numbers with two marker shapes and three colours before arms or closures are defined; the arm legend labels carry two icons each (chip + arrow). Its title is a count, not a finding. On phone the left-hand arm colour ticks are detached from their rows.

**P6. Cohorts headline is prose, not a headline.** Ten figures in four running sentences with inline arrows; no KPI cards, unlike Results → Overview. The most quotable figure ("fewer than 1% of adults alive in 2028 lose") has no visual weight. Selector block takes the first screen on phone (three stacked groups, ~600px) before any result.

**P7. A selector option with nothing behind it.** "Fixed spending" shows "No solve for this rule yet." One of three options is an empty state; the Debt-neutral option yields a table while the default yields a sentence — three different content shapes behind one switch.

### Medium

**P8. Each fact once — repeats found** (from the text dump, folds open):
- Overview KPIs repeat inside the dumbbell card on the same screen: +0.92%, −1.27%, +0.57%.
- −0.19pp tax/GDP: Tax/GDP chart end label and the "understated" card (same screen).
- Labour-share fall −1.6pp: By variable (three times, one per arm) and Method → UK central card.
- Stress-test explanation ("holds 2031 GDP at the OBR-central path… Box 2.2…") stated in R-OV-13, in Method arm card (M-SC-07) and its fold, and in the "Three income measures" GDP block.
- Central/closed closure definition: closure tooltip, Overview dot key, Method closure cards, Literature legend.
- OBR-central path definition: Overview tooltip, Method "Everything else unchanged" fold.
- R4 tolerance "within 0.01pp of zero": Method arm fold and Code step 6.
- Spending-rule definitions: Public finances card and Method rule cards.
- "about 14pp" tax-rate gap: strip label and Sources fold; 2036 debt-rule start: five places.
- Cohorts: chart summary restates the three selector values shown just above it.

**P9. Card inconsistency.** Five card patterns: `ChartCard` (logo + About fold), mini charts (neither), `InfoCard`, hand-rolled `h3.info-card-title` cards (RangeBars, ModelFlow, GrowthCheck, timeline, pipeline), and fold-only cards. Cohorts uses a native `<details>` with a triangle where everything else uses the chevron `Disclosure`. Fold titles vary: "About this chart", "Detail", "Commands and detail", "Code", "Sources and arithmetic", "How Z is set". Method arm cards have a coloured top border; no other card does. Section headings: some with icon (Results, Cohorts), some without (Literature, Code), some numbered (Method).

**P10. Density.** Method → Scenarios is 2,784px closed and 3,790px open on desktop, 7,600px open on phone, with 13 folds; Code → Reproduce 3,247 / 5,060 / 6,783px with 13 folds. Debt/GDP card carries a five-sentence summary above the chart. Limitations is seven cards whose body is one sentence and whose fold is one more sentence — the fold costs more than it hides.

**P11. Sentence case and typography.**
- Uppercase via CSS on: By variable group titles ("DEMAND (%)", "FACTORS (%)", "PRICES AND SHARES"), nine Method kickers ("HEADLINE SCENARIO", "A BOUND, NOT A FORECAST", "DEFAULT, ON EVERY RESULTS CHART"…), Literature row groups ("OURS, AUTOMATION + PRODUCTIVITY, 2031", "PUBLISHED"), Code ("VERSIONS USED", "YOU NEED").
- Line-chart axis ticks use a hyphen ("-0.50") while values elsewhere use a true minus ("−0.19pp").
- Axis precision differs between the paired GNI/GDP charts depending on state (0.25 steps vs 0.2 steps).
- Text labels otherwise sentence case; proper nouns fine.

**P12. Naming drift.** h1 "AI and the UK economy" vs document title "The macroeconomic effects of AI on the UK". "Pay" (KPI) vs "Wage rate" (dumbbell) vs "Average wage" (Literature). "Income UK residents keep" vs "GNI" vs "national income". "Output" vs "Total output" vs "GDP". "Arm" vs "kinds of AI". "Closed capital" vs "Closed-capital bound". Arm names have long and short forms that swap between legend and chart ("OBR-style stress test: no output gain" / "Stress test").

**P13. Icons.** No tick badges (the icon set in `Icon.jsx` has no check/tick glyph; selected states use fill and border). No bare icon sits in a coloured chip (computed-style check on every icon parent). Borderline: the amber "Understates the revenue fall (main effect)" box and its grey twin (R-PF-06) and the "Output at fixed inputs" boxes on the arm cards (M-SC-07) are icon-plus-text inside a tinted box — decide whether those count. AB2026 itself puts section and card icons in tinted chips, which must not be copied. Issues: same icon for different things (trend = Results tab, Income sub-tab, Automation + productivity arm, Adoption; landmark = Public finances, scenario cards, fixed spending, common fiscal rule; usersRound = Cohorts tab, cohort chart, generations card); arm legend entries carry two icons; Literature/Code section headings have none; "Both" closure option has no icon while its siblings do.

**P14. Accessibility.**
- Target size (phone, Results → Overview, site header and footer links included): 47 of 65 interactive elements are under 24px in one dimension, 54 under 40px. KPI range dots and dumbbell dots are 10–16px; ⓘ buttons 20px; matrix cells 26px; segment options 32px; legend toggles 34px.
- Inactive scenario pill explains itself only through `title` (no touch, no keyboard, no screen-reader description) and stays in the tab order.
- Scenario list is `role="listbox"` without arrow-key support (ArrowDown leaves focus on the trigger).
- Tooltips are `span role="button"` with an `aria-label`; the tip box has `role="tooltip"` but is never tied to its target with `aria-describedby`, so assistive tech gets the label only. A tip that also navigates ("What's this?") is two actions on one control.
- Mini-chart tooltip covers the chart it describes (`states/d-tip-minichart.png`).
- Contrast below 4.5:1: teal end labels and values `#319795` on white (3.5:1, 13px), step numbers and hidden-legend text `#9CA3AF` on white (2.5:1), "(ζK = 0)" grey on grey (4.4:1), 10.5–11px labels on the teal tax-gap markers (4.2:1). Chart axis text is 11–12px.
- No skip link. Landmarks, `lang`, single h1, `prefers-reduced-motion` and visible 2px focus rings are present and consistent (good).
- Series distinguished by colour only in the line charts (teal / blue / grey), and Cohorts' seven hard-coded hues (orange→pink→purple→blue→navy) are neither the PE palette nor a light-to-dark ramp as the code comment claims.

**P15. Mobile.** No horizontal page scroll anywhere (good). Problems: both tab rows clip mid-word; the closure segment wraps "Both" onto its own row; Cohorts selectors fill the first screen; Method stepper scrolls sideways inside itself (470–520px in 358px); long pages (see P10); dumbbell chart loses the arm labels' link to rows.

### Low

- P16. "Change the scenario at the top of the page." is an instruction about the UI in the headline area; AB2026 never needs one because the pill is self-evident and sticky.
- P17. Pay shows High and Central at the same point ("High · Central") with no explanation on the card.
- P18. Section "Why" on Cohorts has no subtitle and one of its four cards changes with the arm selector with no cue.
- P19. Dead code (grep-confirmed, no render sites): `ScenarioStrip` and `Takeaway` in `Headline.jsx`, `components/Sparkline.jsx`.
- P20. No chart download; no "About"/overview drawer; no landing or cover.
- P21. "Explore the details" heading and "Four measures, three kinds of AI" are labels, not findings.

Rule checks that passed: no "poor/rich" wording anywhere (bottom 25% / top 1% / "lower earners" used); no tick badges; no icons in coloured boxes.

---

## 3. First-pass comparison with AB2026

AB2026 structure (live): five flat views — Population impact · Household calculator · Pre-measures forecast · Policies · Methodology. Second row only on Population impact (5) and Pre-measures forecast (3). Header pills: Year and Policies, faded with an explanatory label on tabs they do not affect. Landing hero with three entry cards.

| AB2026 does | Growth dashboard today | Adopt |
|---|---|---|
| All global choices are header pills, one place (stickiness not tested) | Scenario in pill; closure, arms, rule scattered in-page | Scenario and closure both as header pills; nothing else global |
| Per-chart options sit in one `ControlBar` line on that chart ("Options: £bn"), summarised as text | Legend bar repeated above each sub-tab; rule switch inside a card; Cohorts has a three-row selector block | One control bar per chart card for chart-only options (rule, series) |
| Second row only where a view holds many charts (2 of 5 views) | Second row on 4 of 5 tabs | Second row on Results and Other studies only |
| Methodology is one page (3,681px desktop): "On this page" side list, each section = icon, one-sentence summary, a stack of folds with keyword previews | Seven-step stepper over three sub-tabs with cards + folds, then History | One Method page with an on-page list; sections collapse to summary + folds; Scenarios split out as its own tab |
| Every chart card: title, one finding sentence, plot, grouped legend chips, logo, download button, "About this chart" with fixed section order | Main charts match (ported); mini charts, range bars, timeline, scenario map do not; no download | Every chart in the same card; add download |
| Chart sentence states the finding with the number ("…cost the government £805 million") | Summaries describe direction only, or give reading instructions ("End labels give 2031; hover…") | Finding sentence with the figure; move reading hints to About |
| Selected-year shading tied to the Year pill | 2031 shaded but fixed | Keep; label it "headline year" once |
| Landing hero + three entry cards answering "where do I go?" | Overview does this job partly | Keep Overview as the landing; add three "go deeper" entry cards in place of the dumbbell block |
| "About" drawer available from every tab | None | Optional: a short "About this study" drawer (what, who, status of solves) |
| Tab labels name the audience question (Population impact, Household calculator) | Results, Cohorts, Scenarios and method, Literature, Code | Rename to reader questions (see §4) |
| Policies tab: one card per policy — kicker, title, one sentence, Starts/Ends/Affects strip, "What changes" mini chart | Scenario cards on Method are uniform (good) but buried at step 3 | Give scenarios their own tab, AB "Policies" style (without the uppercase kicker chip) |
| Phone: pills shorten ("All 8"), "About" pinned left of the tabs | Pill keeps full label; tabs clip | Short pill values on phone |

Do **not** adopt from AB2026: icons inside tinted chips (section headings, card titles, legend chips, landing cards) — forbidden here; keep this dashboard's plain icons.

Tab by tab:
- **Results ↔ Population impact**: same shape (sub-tab row of topics). Adopt the heading → chart card → control bar rhythm; one chart per card full width where the chart is the point (AB's revenue chart), small multiples only with their own scales.
- **Cohorts ↔ By age / Living standards**: AB puts the "Show / Policies" options in the chart's control bar (seen in source and DOM, not by eye). Adopt. AB has a `StatTiles` component; whether By age leads with it was not checked — the tiles proposed in §4 are this audit's suggestion.
- **Method ↔ Methodology**: adopt wholesale (side list, summary sentence, fold stacks, "Limitations" as the last section with a plain list).
- **Literature**: closest AB twin is Pre-measures forecast (a reference view with its own second row); range bars should use the AB chart card (closest: AB's "How our estimates compare with the official costings" dumbbell card).
- **Code**: no AB twin; fold stacks in the Methodology style rather than 14 separate cards.

---

## 4. Proposed information architecture

One recommendation. Six tabs; a second row only where a single page would be longer than today's longest screen. 14 screens → 11.

**Why not fully flat.** Results was split into sub-tabs on 12 Nov because the page was too long. Summing today's page heights (closed folds; each includes ~330px desktop / ~520px phone of repeated chrome):

| If merged into one page | Desktop | Phone |
|---|---|---|
| Today's longest single screen (Method → Scenarios) | 2,784px | 5,442px |
| Method (How it's built + Limitations + History) | 3,970px | 6,675px |
| Literature (three sub-tabs) | 5,048px | 9,824px |
| Method + Literature | 9,018px | 16,499px |
| Code (two sub-tabs) | 4,192px | 6,204px |

So Literature is **not** folded into Method, and it keeps its second row. Method and Code become single pages only because their cards convert to AB-style fold stacks (AB's whole Methodology page is 3,681px on desktop with about 30 folds); sections folded by default are named below. If a rebuilt Method or Code page still exceeds ~5,400px on a phone, it keeps a second row.

**Header (global):** title · **Scenario** pill · **Closure** pill (Central / Closed capital / Both). Both in the URL. Each fades with a visible caption on tabs it does not affect, and on a tab with partial coverage (Who gains: UK central only → the Scenario pill shows "UK central" locked, with the reason as visible text, replacing note C-02).

**Per-chart control bar (local):** arm show/hide legend; spending rule (Public finances and Who gains, same names everywhere); earnings-group legend (Who gains). One vocabulary: *scenario* (how big), *case* (the three arms), *closure* (who owns new capital), *spending rule*.

| # | Tab | Second row | Flow (headline → detail → method) |
|---|---|---|---|
| 1 | **Results** | Summary · Income and output · Economy · Public finances | Summary: question, answer, 3 KPIs, why, how sure, three entry cards. Other three: section heading → finding sentence → chart cards → About folds |
| 2 | **Who gains** (was Cohorts) | none | Stat tiles → welfare chart with control bar → why cards → About fold |
| 3 | **Scenarios** (new, from Method → Scenarios steps 2–4) | none | Scenario map → four scenario cards → three case cards → timeline. Shorter than today's 5,442px phone page because step 1 moves to Method |
| 4 | **Method** | none; "On this page" list | The shock → Closures and spending rules → The model → Limitations → Revision history. Folded by default: every "why/how" detail, the model blocks, labour tax, solving, gates, history |
| 5 | **Other studies** (was Literature) | Coverage · Our numbers · Sources | Unchanged order within each |
| 6 | **Code** | none; "On this page" list | Before you start → Pipeline (nine folds in one stack) → Check the numbers → Use OG-UK yourself (five folds). Folded by default: all commands |

### Section order per tab

**Results → Summary**: hero question and answer (R-OV-01/02) · context line without the instruction · three KPI cards with range strips (dots become tooltips only; the pill is the one scenario control) · Why · How sure → links to the Closure pill · three entry cards: "Year by year", "Inside the economy", "Public finances". Solve-progress notice stays here when relevant.

**Results → Income and output**: finding sentence · "Income, wage and output in 2031" chart card (the dumbbell, moved here, reading the Closure pill: one marker per case under Central or Closed, both under Both) · GNI path card · GDP path card · fold "Why the stress test holds GDP at 0" inside the dumbbell card's About.

**Results → Economy** (was By variable): six chart cards, each with its own y-scale and axis, 2-up grid (1-up on phone), finding sentence carrying the 2031 figure, About fold; consumption note becomes the Consumption card's finding sentence.

**Results → Public finances**: Debt/GDP card · Tax/GDP card (control bar: spending rule, replacing the separate rule card; "Fixed spending" hidden until solved or shown disabled with "not yet solved") · "Our tax and debt effects are likely understated" card with its two folds.

**Who gains**: stat tiles (share who lose; average change; bottom 25%; top 1%) · chart card with control bar (case, spending rule, group legend) · fold "The same average by form" as a `Disclosure` · four why cards · About fold.

**Scenarios**: map · four scenario cards (folds: sources and arithmetic) · "Three cases per scenario" cards (folds: how Z is set) · timeline card + three timing cards.

**Method**: (1) The shock — three cards; (2) Closures and spending rules — closure cards, three income measures, rule cards; (3) The model — model row, generations, labour tax, solving, gates; (4) Limitations — one list card, seven rows, detail inline (no folds); (5) Revision history.

**Other studies**: Coverage (matrix + three "only…" cards) · Our numbers (GDP range card, IMF explanation, wage range card, baseline-vs-OBR card) · Sources (two groups).

**Code**: Before you start (versions, needs, four setup folds) · Pipeline: chip row + nine folds in one card · Model units, not pounds · Check the numbers · Use OG-UK yourself (five folds + documentation link).

### Where each current item goes (nothing dropped)

| Current ID | New home |
|---|---|
| S-01, S-06 | Unchanged |
| S-02 | Title band; one name (decide: "AI and the UK economy" as h1, long form as document title/subtitle) |
| S-03 | Header Scenario pill (unchanged role; sole scenario control) |
| S-04 | Main tab row, six tabs: Results · Who gains · Scenarios · Method · Other studies · Code |
| S-05 | Second row on Results and Other studies only |
| R-OV-01, R-OV-02 | Results → Summary, hero |
| R-OV-03 | Summary context line; OBR-central tooltip kept; "Change the scenario…" sentence removed (redundant with the pill — flag for sign-off) |
| R-OV-04, 05, 06 | Summary KPI cards; range dots keep tooltips, lose the select action |
| R-OV-07 | Summary "Why" |
| R-OV-08 | Summary "How sure"; link targets the Closure pill / Income and output |
| R-OV-09 | Summary, under the KPIs (conditional) |
| R-OV-10 | Replaced by three entry cards; its subtitle text becomes the dumbbell card's unit line |
| R-OV-11 | Results → Income and output, first chart card |
| R-OV-12 | That card's legend; "Closures and terms" link → Method §2 (correct anchor) |
| R-OV-13 | About fold of the dumbbell card (single home for the stress-test explanation; Method case card links to it) |
| R-IN-01 | Income and output heading |
| R-IN-02 | Per-chart control bar (case legend) on each Results chart card |
| R-IN-03 | Header Closure pill; "What's this?" becomes a tooltip-only ⓘ plus a separate "More" link to Method §2 |
| R-IN-04, R-IN-05 | Income and output, cards 2 and 3; Literature link becomes an in-app link to Other studies → Our numbers that keeps scenario and closure |
| R-IN-06 | Same cards (conditional states unchanged) |
| R-VA-01 | Results → Economy heading |
| R-VA-02 | Covered by R-IN-02/03 homes |
| R-VA-03, 04, 05 | Economy: six full chart cards, grouped under Demand, Factors, Prices and shares (sentence-case group labels) |
| R-VA-06 | Each card's About fold ("What it shows"); the shared-scale sentence goes when scales become per-chart |
| R-PF-01 | Public finances heading; subtitle reads the Closure pill |
| R-PF-02 | Covered by R-IN-02/03 homes |
| R-PF-03, R-PF-04 | Public finances cards 1 and 2; long Debt/GDP summary split: first sentence stays, rest → About |
| R-PF-05, 06, 07 | Public finances card 3 with its two folds |
| R-PF-08 | Spending-rule option in the Public finances control bar; default-rule sentence and Debt-neutral table render in a "Under this rule" card below the charts; definitions live once in Method §2 |
| C-01 | Who gains heading |
| C-02 | Locked Scenario pill with visible caption |
| C-03 | Chart control bar: case (single-select, labelled as such) |
| C-04 | Header Closure pill ("Both" falls back to Central here, stated in the caption) |
| C-05 | Chart control bar: spending rule, names aligned with Method |
| C-06 | Stat tiles (who loses, average, bottom 25%, top 1%) + one sentence for "where it comes from"; remaining qualifiers → About |
| C-07 | `Disclosure` under the tiles |
| C-08 | Who gains chart card; summary no longer restates the selectors |
| C-09–C-13 | "Why" section, four cards, subtitle added |
| M-00 | Replaced by the "On this page" list on Method and by tab order on Scenarios |
| M-SC-01 | Method §1 The shock |
| M-SC-02, M-SC-03 | Scenarios tab, "When it happens" |
| M-SC-04, 05, 06 | Scenarios tab, top |
| M-SC-07 | Scenarios tab, "Three cases per scenario" |
| M-BU-01, 02, 03 | Method §2 Closures and spending rules |
| M-BU-04–08 | Method §3 The model |
| M-LI-01 | Method §4 Limitations (seven rows, detail inline) |
| M-HI-01 | Method §5 Revision history |
| L-MX-01, L-MX-02 | Other studies → Coverage |
| L-NU-01, 02, 03, 04 | Other studies → Our numbers (same order) |
| L-SO-01 | Other studies → Sources |
| K-RE-01–04 | Code, sections 1–4 |
| K-OG-01 | Code, "Use OG-UK yourself" |

82 inventory IDs, 82 mapped (ranges in the table expand to every ID).

### Removed or changed form — needs explicit sign-off

Nothing below loses content without a stated home, but each of these stops existing in its current form:

| Item | What changes | Content kept where |
|---|---|---|
| R-OV-03 sentence "Change the scenario at the top of the page." | Removed | Nowhere — redundant with the pill |
| R-OV-04–06 KPI range dots as scenario selectors | Select action removed; tooltips stay | Scenario pill is the one control |
| R-OV-10 heading "Explore the details" + subtitle | Heading removed, replaced by three entry cards | Subtitle becomes the dumbbell card's unit line |
| R-OV-11 dumbbell showing both closures at once | Moves off the landing screen; shows both only when Closure = Both | All 24 values still reachable (Both); default view shows 12 |
| R-OV-13 stress-test fold card | Stops being its own card | About fold of the dumbbell card |
| R-IN-02/03 legend bar above each sub-tab | Split: closure → header pill; arms → per-chart control bar | Same options |
| R-VA-06 axis note, incl. "share one scale" sentence | Shared-scale sentence removed (scales become per chart) | Line/marker explanation → each card's About |
| R-VA-03–05 six-times subtitle "2031 value at the line end" | Removed | Finding sentence carries the 2031 figure |
| R-PF-08 standalone spending-rule card | Becomes a control-bar option + "Under this rule" card | Table and sentence kept; rule definitions only in Method §2 |
| R-PF-03 five-sentence Debt/GDP summary | First sentence stays as the finding | Rest → About this chart |
| C-02 "UK central only" note | Removed as a note | Locked Scenario pill with visible caption |
| C-04 Cohorts' own closure control | Removed | Header Closure pill ("Both" falls back to Central, stated) |
| C-06 four-sentence headline | Becomes stat tiles + one sentence | Qualifiers (bequests not valued; cost after 2035; "result of the model's evenly spread wealth") → About / Why card — these are caveats, so check they stay visible enough |
| C-07 native `<details>` | Becomes the standard fold | Same text |
| C-08 chart summary restating the selection | Removed | Control bar shows the selection |
| M-00 seven-step stepper | Removed | "On this page" list on Method; tab order on Scenarios |
| M-SC-01 (step 1) | Moves from the Scenarios screen to Method §1 | Same cards |
| M-LI-01 seven "Detail" folds | Folds removed, detail shown inline | Same text |
| Repeated facts listed in P8 | Each keeps one home, other sites become links | Homes: KPIs (Summary), stress-test explanation (dumbbell About), closure and rule definitions (Method §2), OBR-central path (Method §1), R4 tolerance (Code), −1.6pp labour share (Economy) |

### Decisions for Vahid

1. **Page length vs flat tabs.** Recommended: second row on Results and Other studies only; Method and Code single pages with fold stacks. Alternative: fold Literature into Method (flat, but ~16,500px on a phone before trimming) — not recommended.
2. Closure as a header pill (recommended) versus a per-chart option. Consequence: the landing dumbbell no longer shows both closures by default.
3. One title: "AI and the UK economy" or "The macroeconomic effects of AI on the UK".
4. "Fixed spending": hide until solved, or show disabled.
5. Vocabulary: "case" for arm (or keep "kind of AI"); and whether Cohorts' "Common fiscal rule" is the "Spending follows GDP" rule under another name.
6. Whether icon-plus-text tinted boxes (R-PF-06 effect chips, M-SC-07 "Output at fixed inputs") count as icons in coloured boxes.
