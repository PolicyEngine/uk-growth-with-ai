# Information architecture (draft for review), 15 November 2026

The dashboard answers one question, *what happens to the UK economy if AI arrives in 2028?*, with two models and the official record:

- the official record of where the UK stands (ONS, OBR, DSIT);
- **OG-UK**, a model of the whole economy. It has no unemployment; its results are gaps against the OBR-central path;
- **uk-ai-study** (PolicyEngine/uk-ai-study #18, provisional), a one-year microsimulation of households in FY 2026–27 when a share of employees lose their jobs.

There are three tabs. Each page follows the same order: a one-line question, the answer, charts, then detail and sources.

## 1. Story: what happens, in order

The scroll story. It is the home of part 1's statistics, part 2's three headline figures, and part 3's headline findings.

| Part | Question | Content |
|---|---|---|
| Opening | What happens if AI arrives in 2028? | The question, a one-line answer for the scenario and closure chosen in the header, and a static fan of the modelled paths |
| 1. Where the UK stands | What does the official record show? | GDP growth, output per hour, employment and unemployment, pay, and the labour share. Where official data exist they run to 2026, with partial years labelled (for example "2026 Q1–Q3"). Also the OBR's October 2026 forecast (dashed), business AI use (ONS BICS waves to 2026), and DSIT exposure tiles |
| 2. A model of the whole economy | What does OG-UK project? | The shock as tiles. One chart **morphs on scroll** from actual GDP growth to the OBR path to the AI scenario gaps. The four scenarios, with the UK range shaded. A **Sankey: where output goes** (OBR-central path against the scenario, 2031). The headline figures, the three arms, who gains, and public finances |
| 3. A model of households | What does uk-ai-study find? (provisional) | Follows the paper's own order and headline findings, cut from about 25 steps to about 8: the central case and its three channels, with baseline poverty rates beside the rise; take-up and JSA beside the headline; where the income loss falls (deciles, with the D1 caveat); who loses the job (four rules); wage cuts against job loss; a **Sankey: where a displaced pound of earnings goes** (government balance against household). The detail moves to Explore → Job-loss study |
| Close: two lenses | What can each model say? | A panel on OG-UK against uk-ai-study: what each covers, what it cannot say, and why their numbers are not added together. Links into Explore and into Method and sources |

Also on this tab: a compact "you are here" progress rail. Charts carry direct labels instead of legends where there is room, and key moments are annotated.

## 2. Explore: how do the results change with my choices?

Every interactive view. All of them follow the scenario, closure and fiscal rule pickers, and each chart has a CSV/JSON download and a PNG/SVG export.

| Sub-tab | Question | Moves in or changes |
|---|---|---|
| Income and output | How do pay, national income and GDP move? | As before. The UK range is shaded where scenarios are compared |
| Economy | What happens to demand, capital, labour and prices? | As before |
| Public finances | What happens to debt and tax under each fiscal rule? | As before, plus the debt-repricing check (#43) |
| Who gains | Who gains and loses, by birth year and earnings? | Scenario locked to UK central (the only one solved), as before |
| Sensitivity (new) | How much do the results depend on the assumptions? | Small multiples for every scenario × closure × fiscal rule cell, for GDP, GNI, wages and debt; pending cells are marked. The ζK 0.5 table moves here from Method |
| Job-loss study (new) | What moves the cost of displacement? | The part 3 detail: the full take-up/JSA/wage-cut ladder, the five incidence rules, the cost per pound on 20-draw bases, who the displaced are, UC per person, deciles under three rankings, and the policy draws (from `policy_draws.csv`, neutral labels, no cost-effectiveness ranking). Provisional |

## 3. Method and sources: how were the results made, and how do they compare?

| Sub-tab | Question | Content |
|---|---|---|
| Method | How does OG-UK produce the results? | The model as a diagram (households, firms, government, the rest of the world), the shock, closures and income measures, fiscal rules, the steady state and path, limitations, and revision history |
| Job-loss study | How does uk-ai-study produce its results? | Data (Microcosm UK 2024–25, FY 2026–27), exposure (C-AIOE), the shock, take-up, draws, what the study leaves out, and the paper (link). Provisional |
| Scenarios | What are the inputs? | The four scenarios, three arms and timing, as before |
| Evidence | How do our results compare with other UK work? | Other studies' coverage, where our numbers sit, and a slot for the UK evidence map (OBR, BoE, RF, IFS, DWP, HMRC, DSIT, IPPR, TBI, NIESR, IMF, OECD and private forecasters) when the review table arrives. Related PolicyEngine work |
| Data and code | Can I reproduce it? | Code (reproduce, pipeline, outputs), data vintages and model versions, downloads, a citation block, a dated "last updated" stamp, and a changelog |

## Cut as repetition

- Part 2's "Go deeper" cards, which restate the tab row. One line of links replaces them.
- Part 3 steps whose detail now lives in Explore → Job-loss study.
- Scenarios' "When it happens", where it repeats Method's steady-state section. Scenarios keeps the timing and Method links to it.
- Who gains' "Why", where it repeats Method's generations figure. Who gains keeps the result and links to the mechanism.

## Each fact once: homes

- **Part 1 statistics:** Story.
- **OG-UK headline figures (three tiles):** Story.
- **Every other OG-UK figure:** Explore. The story draws shapes and the Sankey states shares, the Sankey's own figures.
- **uk-ai-study headline findings:** Story.
- **Its detail:** Explore → Job-loss study.
- **Methods:** Method and sources.

## Fable 5.2's critique, and what changed (15 November 2026)

Adopted:
- **Part 2 Sankey.** OG-UK's solve outputs hold levels, but income tax is one combined series. Labour income falls in level, which a Sankey cannot carry, and the two states would look nearly identical. So part 2 shows one Sankey of the OBR-central path in 2031 as shares of GDP (labour, domestic net capital, foreign owners, depreciation), with a waterfall of the 2031 change beside it. `build_dashboard_data.py` exports the levels.
- **Part 3 Sankey.** It is built from `results/next_runs/obr_household_deciles.csv`: decile → lower income tax and NI, more benefits, other items, lower disposable income. It is labelled "job loss alone, OBR-sized run (1.67% displaced), not the central case". The closed profit account moves to Explore.
- **Part 3 order** follows `results.tex`, in eight steps:
  1. the central case, with baseline poverty and Gini;
  2. the three channels;
  3. what the system absorbs (the Sankey);
  4. where the loss falls (with the decile-1 caveat);
  5. who loses the job;
  6. job loss against wage cuts (pence per pound on 20-draw bases);
  7. what moves the cost (break-evens, take-up and JSA);
  8. what the study leaves out.
- **Scope strip on every page:** "OG-UK: no unemployment, gaps against the OBR-central path · uk-ai-study: one year, FY 2026–27, provisional".
- **Two lenses:** a short panel before part 2, and the full one at the close.
- **Source ledger** (figure, source, vintage, date checked) in Data and code.
- **Sub-tab names:**
  - Explore: Economy (income and output, then the economy, on one page), Public finances, Who gains, All scenarios, Households.
  - Method and sources: OG-UK method, Household method, Scenarios, Evidence, Data and code.
  - Old addresses resolve.
