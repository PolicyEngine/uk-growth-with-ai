# Published AI macro estimates against OG-UK's 2028-surprise results

For #27 (tracker) and #24 (paper). Written 13 November 2026. **No OG solve was run.**

- This replaces the 12 November version of this note (PR #37), which compared the old 2026-start results.
- Our numbers are the per-solve records in `analysis/surprise/output/{zk0.1,zk0}/` on `rerun/surprise-2028` at `a4e2180`. Every one is printed by `analysis/surprise/lit_grid.py`, which reads the committed JSON only.
- The design is in `docs/surprise_2028.md` and `docs/uk_calibration.md`: AI arrives as an unanticipated shock in 2028, and the headline year is 2031, adoption year 4.
- `docs/results_sanity_2028.md` (PR #39) audits the same solves. This note uses its anomaly numbers A1–A12 and does not repeat its accounting.

## Summary

**Two facts about the headline, which have to be read together.**
- **Scaled by the shock and pooled across all published models, it is inside the range.** UK central at ζK = 0.1 gives GDP +0.92% for a TFP gain of 0.4%, or 2.3 per 1% of TFP. Published models span 1.0 to 6.2. That range pools studies with different mixes of TFP and share shift, so it is a weak test.
- **Against the two studies with the same shock, it is below.** UK central is 37% of the IMF's UK output figure at year 4 (+0.92% against +2.52%). The Korinek arm is 59% of Korinek et al.'s (+4.89% against +8.3%), and below their least elastic case (+6.4%).

**One mechanism explains the gap and most other verdicts: capital supply.** The solves imply a capital-supply elasticity of 0.57–0.68 at ζK = 0.1 and 0.15–0.17 at ζK = 0. The lowest published case is 1 (Korinek et al.) and their default is 3. The IMF's year-4 output implies about 5, or about 1.6 on a faster share path (ours, Section 4.4). That is why, against a study with the same shock, our GDP is lower, our wage is lower and our interest rate is higher.

**Verdict counts.** The grid is 192 cells: 4 scenarios × 3 arms × 2 closures × 8 outcome rows (Section 4.2).

| verdict | cells |
|---|---|
| inside the published range | 22 |
| above | 13 |
| below | 54 |
| wrong sign | 1 |
| by construction (an imposed input or an identity) | 30 |
| no comparator | 24 |
| not solved (UK low and UK high at ζK = 0) | 48 |

- Of the 54 "below" cells, 18 are the capital-supply elasticity itself and 17 are the size of the tax/GDP response. The other 19 follow from the elasticity or from the missing unemployment channel.
- All 13 "above" cells follow from the elasticity (10 interest-rate cells, 1 debt cell) or from the US scenario's size (2 labour-productivity cells).
- Two bounds are soft. The GDP row uses the pooled range above. The labour-productivity ceiling of 3.6% extends a three-year survey figure to four years; at three years (2.7%) UK high moves from "inside" to "above".
- No cell is outside every published range without a cause in the model. Three results are problems all the same (Section 5).

**Three red flags.**

1. **The central closure is less elastic than every published model, and that single number sets the size of GDP, the sign of the wage and the size of the interest-rate rise.**
   - If capital were supplied at Korinek et al.'s elasticities of 1 to 6, UK central GDP in 2031 would be +1.2% to +2.3% in place of +0.92%, and the wage −1.0% to +0.1% in place of −1.27% (arithmetic on the solve, not a rerun; it matches Korinek et al.'s own table at their default of 3 and less well at 1 and ∞).
   - Fix: solve a more open case at ζK = 0.5 as a sensitivity beside the two existing closures. **This entered the solve plan overnight** (`68ef937` on `rerun/surprise-2028`, 13 November: "zk0.5 closure (published sensitivity)"). No ζK = 0.5 solve is on disk yet. An earlier 2026-start run at ζK = 0.5, made before the R1–R4 fixes, implies an elasticity of about 5.
2. **Debt/GDP ends higher in every arm by 2036, including "automation + productivity". The OBR and Penn Wharton have higher productivity lowering debt.**
   - For UK central the whole +2.0pp is the higher interest rate applied to the entire debt stock at once (+2.3pp). Without that, debt/GDP would be about 0.3pp lower than baseline.
   - Fix: no rerun. Report the split beside every debt number.
3. **Tax/GDP rises in the Korinek main arm at ζK = 0** while the labour share falls 3.9pp, and the fall is 50–77% of the OBR's size at ζK = 0.1. This is known (A6 in the audit) and Vahid decided on 12 November to keep and report it.

**Two calibration points that the comparison turned up.**

- **UK central's wage fall comes from its mix of shocks, which is the IMF's.** It pairs 4pp of labour-share fall with each 1% of TFP. Korinek et al. pair about 1pp. With the IMF's own output figure the same mix leaves the average wage unchanged (+0.06%, ours), and the IMF's model family reports "average wages almost unchanged". Ours is −1.27% because GDP rises 0.92% where the IMF has 2.52%. On the straight-line share path (2.35pp) the IMF's output would imply −1.2%, the same as ours.
- **The IMF's two UK papers disagree on the UK's 1980–2014 capital-share rise:** about 10pp in the 2026 Selected Issues paper and 5.5pp in the working paper behind it. UK central's 1.6pp does not depend on either figure, but the straight-line cross-check in `docs/uk_calibration.md` (2.35pp) uses the 10pp.

## 1. How this was checked

- **Every number in Sections 2 and 3 was read from the primary text**, by downloading the PDF or HTML page, extracting its text (PyMuPDF) and searching for the figure. "p." is the printed page unless it says PDF page; "¶" is a numbered paragraph.
  - **Carried from the 12 November note and not re-read tonight:** rows A1–A4, A6–A8, A10–A14, A16, B2, B4, B5, B8–B16. They were read from the primary text then.
  - **Re-read or first read on 13 November:** A5, A9, A17–A21, B1, B3, B6, B7 and B18–B29. Every figure that sets a bound in Section 4.2 was also searched for again in the downloaded text (OBR March 2026 ¶6.18 and Box 2.2, FRS Box 4.1, November 2025 ¶2.64; IMF Table 1; the IMF SDN; Korinek et al. Tables 3 and 5; Penn Wharton; the BoE survey figure).
- **"(ours)" marks arithmetic done here:** unit conversions, ratios, horizon scaling and the what-if table.
- **UNVERIFIED** marks anything not read in a primary source. Nothing marked UNVERIFIED feeds a verdict.
- **New on 13 November.** Read in full for the first time:
  - OBR Briefing paper No.9, from the PDF that the #31 review had downloaded. The 12 November note carried its figures second-hand; they are confirmed.
  - The full OECD G7 paper, where the earlier note had only the authors' brief.
  - Rockall, Tavares and Pizzinelli (IMF WP/25/68), the UK model behind both IMF UK studies.
  - Rachel (2025), Moll, Rachel and Restrepo (2022), Karabarbounis and Neiman (2014), Autor et al. (2020), Misch et al. (2025), Lennox and Dixon (2026), Brollo et al. (2024), Guerreiro, Rebelo and Teles (2017), the ONS labour-share article, the DSIT assessment, and the BCG and Public First reports.
- **Mirror copies.** The IPPR report, the IMF SDN, the Berg–Buffie–Zanna draft and the Goldman Sachs note were read from mirror copies, as before.
- **Access failures on 13 November.** These sites refused automated access and were not pursued further:
  - cbo.gov: the 2026 *Budget and Economic Outlook* and its productivity slides.
  - institute.global: the Tony Blair Institute report (HTTP 429).
  - bis.org: the PDF of BIS Working Paper 1179. Its abstract page was readable.
  - cbi.org.uk: the CBI and Oliver Wyman report of August 2026.
- **Searched and not found:**
  - a quantified AI macro or fiscal scenario from NIESR (only a firm-level blog), the IFS (the 2025 and 2026 Green Budgets mention AI in passing), the Resolution Foundation (productivity measurement and a firm survey only), HM Treasury, or the IPPR after its 2024 report;
  - a UK-specific figure from Goldman Sachs: the 2023 note's country chart is unreadable as text and no later UK note was found;
  - a Bank of England estimate of AI's effect on the neutral rate or on investment. Earlier Monetary Policy Reports were not read; the November 2026 one is the latest;
  - a new aggregate estimate from Acemoglu and Restrepo or Brynjolfsson beyond B3 and B5;
  - any application of OG-Core, OG-USA or OG-UK to AI or automation.

Section 2 lists the studies. Section 3 is the benchmark table by outcome. Section 4 compares our results. Section 5 lists the red flags. Section 6 lists citation problems in the paper. Section 7 says what to run next.

## 2. The studies

### A. UK official and UK-specific estimates

| # | Study | Year | Country | Model type | AI shock | Horizon / baseline | Headline numbers (each with its location) |
|---|---|---|---|---|---|---|---|
| A1 | OBR, *Economic and fiscal outlook, March 2026*, ['technological displacement' scenario](https://assets.publishing.service.gov.uk/media/69a6d7b62e1f4fbda4252208/economic-and-fiscal-outlook-march-2026-web-accessible.pdf) | 2026 | UK | Judgement-based forecast scenario (OBR macro model and fiscal model) | "New technology displaces workers and is a substitute for labour". The equilibrium unemployment rate rises to 5.5%, and productivity rises enough to leave GDP unchanged. AI is named as one possible cause of a structural rise in unemployment, not as the scenario's definition (Box 2.2, p.30). | To 2030-31, against the central forecast (which already includes AI) | **GDP level unchanged** (Box 2.2, p.30–31; ¶6.18 says "GDP growth is unchanged"). Productivity is "not reflected in higher real earnings", giving a lower labour share and a higher profit share (Box 2.2). **No labour-share figure is published.** ¶6.18 (p.100–101): borrowing **+£9bn a year** on average; receipts **−£6bn a year**, "due to lower personal tax and VAT revenues from lower employment and consumer spending, partly offset by higher corporation tax"; welfare spending **+£3bn a year**; underlying debt **+1.3% of GDP by 2030-31**. Our arithmetic: £6bn is 0.17% of 2030-31 nominal GDP (£3,632bn, Table A.3, p.110). |
| A2 | OBR, *Fiscal risks and sustainability, July 2026*, [Box 4.1, "The potential impact of AI on the labour share and tax receipts"](https://assets.publishing.service.gov.uk/media/6a4cb4c74889d85e75ab40e0/E03599617_OBR_FRS_2026_Accessible.pdf) | 2026 | UK | Long-term fiscal projection with an illustrative composition shift (GDP held fixed) | "Reduced labour share" scenario: wages and salaries fall from 40% of GDP in 2030-31 to 20% in 2075-76. The OBR calls this "at the upper end" of the literature (p.87) | 2030-31 to 2075-76, against the FRS baseline | **Tax falls to under 35% of GDP, "nearly 4 percentage points lower than in the baseline"** with total GDP unchanged (p.87). Effective tax rates are **46% on wages and salaries** (income tax and NICs) and **27% on profits** (corporation tax and CGT) (p.87, footnote q, p.88). Productivity: BP9's central AI boost is **0.2pp a year over the next decade**, with alternatives "less than 0.1" to "up to 0.8 percentage points" (Box 4.1, p.86). About 10% of the UK labour force is exposed to substitution and 30% to complementarity over 10 years (p.86, citing BP9 Annex B). |
| A3 | OBR, *Economic and fiscal outlook, October 2026* ([PDF](https://obr.uk/download/economic-and-fiscal-outlook-october-2026/)) | 2026 | UK | Forecast | Central AI assumption | Medium term | "Our central forecast is for it to boost productivity growth by **0.2 percentage points a year by the medium term**" (¶1.27, p.21; repeated in ¶7.29, p.170). The share of businesses using AI was 30% in September 2026, up from 15% two years earlier (¶2.45, p.43). There is no AI labour-share or displacement scenario. |
| A4 | OBR, [*Economic and fiscal outlook, November 2025*](https://obr.uk/efo/economic-and-fiscal-outlook-november-2025/), Box 2.1 (read from a local copy of the published PDF) | 2025 | UK | Forecast | Central AI assumption plus a productivity-upside scenario | Five-year horizon | The AI effect builds "to reach an estimated **0.2 percentage points by our five-year forecast horizon**" (Box 2.1, p.30). In the upside scenario "there is a larger boost from AI", and potential productivity growth is 1.5% (Box 2.1). March 2026 EFO ¶1.21 (p.13): at 1.5% productivity growth, "for example, due to a more optimistic scenario for the impact of AI, borrowing could be **£50 billion lower in 2030-31**". Effective tax rates: about **40% on labour income** and about **17% on profits** (¶2.64, p.50–51). |
| A5 | OBR, [*Briefing paper No.9: Forecasting productivity*](https://obr.uk/briefing-paper-no-9-forecasting-productivity/), Annex B (read from the PDF downloaded for the #31 review) | 2025 | UK | Acemoglu-type task arithmetic with J-curve and S-curve paths | 40% of UK occupations exposed; 33% of exposed tasks feasibly automated in a decade; average cost saving 32%; labour share "approximately 57 per cent of GDP" (¶B.9) | 10 years | "AI could boost the level of economy-wide productivity by **2.3 per cent over the next decade**" (¶B.9, PDF p.49). J-curve: gains reach "**0.1 percentage points annually by year five**"; S-curve: "a ¼ of a percentage point in five years" (¶B.12, PDF p.50). Central: "around **0.2 percentage point at our forecast horizon**"; conservative: "less than 0.1 percentage points annually on average over the next decade" (¶B.14, PDF p.51). |
| A6 | IMF, Bellon, Deb, Gandhi and Rockall, ["Unlocking AI-led productivity growth in the United Kingdom"](https://www.imf.org/-/media/files/publications/selected-issues-papers/2026/english/sipea2026072.pdf), Selected Issues Paper SIP/2026/072 (Country Report 26/173) | 2026 | UK | Endogenous task-adoption model with 100 sectors (Rockall et al. 2025). Capital deepens endogenously. | Calibrated so that AI raises the **aggregate capital share by about 10pp in the long run**, reached in 17 years, with cost savings of 27% per automated task (¶44, p.24; Annex III ¶4–5, p.37–38) | Years 5 and 10 from adoption, against no AI | **TFP +0.53% at year 5 and +1.40% at year 10; output +3.26% at year 5 and +7.96% at year 10** (Table 1, p.29). Regulatory reform adds +0.22pp TFP and +1.24pp output at year 5; skills adds +0.15pp and +0.83pp (Table 1). Output exceeds TFP because of capital deepening (¶46, p.25). Footnote 9 (p.25): where the investment is bought from foreign providers, "the output gains may overstate the domestic value added". Wages: "higher output will lead to higher wages overall, many workers may see lower wages due to displacement" (¶53, p.28; no number). |
| A7 | IMF, *United Kingdom: 2026 Article IV staff report*, [Country Report 26/172](https://www.imf.org/-/media/files/publications/cr/2026/english/1gbrea2026001.pdf) | 2026 | UK | Forecast plus risk matrix | Central assumption, and an "AI acceleration" risk | Medium term; 10 years | The productivity trend includes "a small boost from AI investment and diffusion (**0.2pp in line with the OBR**)" (¶12, p.9). Risk assessment matrix: "Aggregate TFP could increase by **1 to 5 percentage points over 10 years**" (Risk Assessment Matrix, p.47). |
| A8 | Bank of England, [*Monetary Policy Report, November 2026*](https://www.bankofengland.co.uk/-/media/boe/files/monetary-policy-report/2026/november/monetary-policy-report-november-2026.pdf), Boxes C and D | 2026 | UK | Data and Decision Maker Panel survey, not a model scenario | Observed and expected effects | Last three and next three years | Firms estimate AI raised productivity "by around 0.5% over the past three years ... about **0.1–0.2 percentage points to annual productivity growth** since early 2024" (Box D, PDF p.59). Firms expect AI to add "**about 0.9 percentage points per year** on average over the next three years", split about equally between slower employment growth and faster output growth (Box D). AI's effect on employment is "close to zero" so far. AI-related activity is "just under a fifth of GDP growth since the start of 2026" (Box C, PDF p.50). |
| A9 | OECD, Filippucci, Gal, Laengle and Schief, ["Macroeconomic productivity gains from artificial intelligence in G7 economies"](https://www.oecd.org/en/publications/macroeconomic-productivity-gains-from-artificial-intelligence-in-g7-economies_a5319ab5-en.html), OECD AI Papers No.41 (full paper) | 2025 | G7 incl. UK | Sectoral exposure × adoption, Hulten aggregation; labour productivity = TFP × 1.5 | Three adoption scenarios | 10 years, annual average | **UK: 0.39 (slow), 0.97 (medium), 1.27 (rapid) percentage points a year of labour productivity**; US 0.41, 0.99, 1.28 (Table 2, p.24). The TFP gain "is then converted into labour productivity growth by applying **a multiplication factor of 1.5, which accounts for the role of capital deepening**" (p.21, PDF p.23; footnote 25: Cobb-Douglas with a capital share of 1/3). UK TFP is therefore 0.26, 0.65 and 0.85pp a year (ours). |
| A10 | IPPR, Jung and Srinivasa Desikan, *Transformed by AI* ([IPPR page](https://www.ippr.org/articles/transformed-by-ai); PDF read from a mirror copy) | 2024 | UK | Task-exposure accounting, not general equilibrium | Exposed tasks done 50% faster, augmented or displaced | Unstated ("integrated" AI: second wave) | Table 4.1 (p.25), integrated AI: **augmentation only +13.4% of GDP (£305bn)**; **central +6.3% (£144bn) with 4.4m jobs displaced**; **displacement only: £0 GDP gain, −7.9m jobs**. "Here and now" AI: +4% / +3.1% / £0. The summary (p.7) gives the central case as "about 6.4 per cent", inconsistent with Table 4.1. |
| A11 | Public First for Google, [*Google's impact in the UK 2023*](https://googlesukimpact2023.publicfirst.co.uk/) | 2023 | UK | Not stated on the page | AI-powered innovation | By 2030 | "**Over £400 billion in value** for the UK economy by 2030, the equivalent to an annual growth rate of 2.6%" (web report). It is not stated as a GDP level gap, and the method is not on the page. The government's *AI Opportunities Action Plan* (DSIT, 13 Jan 2025, §2.4, footnote 19) repeats the £400bn and cites this report. |
| A12 | PwC, [*The economic impact of artificial intelligence on the UK economy*](https://www.pwc.co.uk/economic-services/assets/ai-uk-report-v2.pdf) | 2017 | UK | Spatial CGE | Productivity plus consumption-side "product enhancements" | 2017–2030 | "UK GDP will be **up to 10.3% higher in 2030**", of which productivity 1.9% and product enhancement and demand 8.4% (p.4). |
| A13 | PwC for GO-Science, ["The wider economic impacts of emerging technologies in the UK"](https://www.gov.uk/government/publications/the-wider-economic-impacts-of-emerging-technologies-in-the-uk/the-wider-economic-impacts-of-emerging-technologies-in-the-uk-html) | 2025 | UK | CGE driven by investment in technology capital | Planned adoption investment in 15 technologies | To 2035 | "AI / ML technologies alone is projected to contribute to a **2.98% overall increase in the UK's real GDP by the year 2035**, which is equivalent to £79.3 billion" (main text, Section 5). |
| A14 | Goldman Sachs, Briggs and Kodnani, "The potentially large effects of artificial intelligence on economic growth", Global Economics Analyst, 26 March 2023 ([GS summary page](https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent)) | 2023 | US, global | Exposure × productivity | Generative AI adoption | 10 years from about 50% adoption | US: "around **1.5pp/year**" labour-productivity growth (p.14). Global: GDP "**7%**" higher over ten years (p.15–16). **UK figure UNVERIFIED:** it appears only in the Exhibit 14 chart, which the text extraction cannot read. The text was read from a redistributed copy, which is not linked. |
| A15 | Tony Blair Institute, Sharps et al., [*The impact of AI on the labour market*](https://institute.global/insights/economic-prosperity/the-impact-of-ai-on-the-labour-market) | 2024 | UK | — | — | — | **UNVERIFIED.** The site refused automated access again on 13 Nov (HTTP 429). Secondary summaries report 1–3 million jobs displaced by 2050, peaking at 60,000–275,000 a year, and GDP +5 to 14% by 2050. Not used. |
| A16 | Resolution Foundation (newsletter on Thwaites et al. firm survey) | 2026 | Multi-country | Executive survey | Firm expectations | Next three years | Firms expect "productivity by around **1.4 per cent** while slightly reducing employment – by about **0.7 per cent**" ([RF](https://www.resolutionfoundation.org/comment/jobs-pocalypse-or-productivi-splosion-the-ai-data-is-in/)). There is no RF macro or fiscal model estimate. |
| A17 | DSIT, [*Assessment of AI capabilities and the impact on the UK labour market*](https://www.gov.uk/government/publications/assessment-of-ai-capabilities-and-the-impact-on-the-uk-labour-market/assessment-of-ai-capabilities-and-the-impact-on-the-uk-labour-market) | 2026 | UK | Evidence review, no model | — | 10 years | Published 28 January 2026. "OECD estimates suggest UK labour productivity growth from AI could reach **0.4–1.2 percentage points annually** over the next decade". It restates A9 (whose own range is 0.4–1.3) and gives no government estimate. |
| A18 | ONS, ["Trends in the UK labour share: 1997 to 2023"](https://www.ons.gov.uk/economy/economicoutputandproductivity/output/articles/trendsintheuklabourshare1997to2023/2024-11-25) | 2024 | UK | National accounts | — (history, not AI) | 1948–2023 | "a long downward fall in the labour share between 1948 and 1996, with a relatively rapid fall during the 1980s; followed by a recovery in the labour share starting in 1997 by around **5.5 percentage points, particularly in the years up to 2001**". The ONS measure rose "from 53.8% in 1996 to 59.5% in 2023". A pace benchmark for our labour-share shock. |
| A19 | Bank of England conference, "Transformative artificial intelligence (AI): implications for structural change and monetary policy", June 2026: Cesa-Bianchi, [panel slides on long-term r*](https://www.bankofengland.co.uk/-/media/boe/files/events/2026/a-cesa-bianchi-slides.pdf) (own views, not the Bank's) | 2026 | — | Model illustrations, charts only | TFP shocks of different profiles | — | "What's the Effect of AI on r*? The honest economist's answer: it depends" (PDF p.2). "The nature of the shock and its profile matter (a lot)" (PDF p.5). **No number.** No Bank estimate of AI's effect on the neutral rate was found. |
| A20 | Boston Consulting Group, ["AI productivity model methodology note"](https://web-assets.bcg.com/4e/3f/536f5c274edc801625ac8ff77bc4/the-uks-1-trillion-ai-opportunity-methodology.pdf) | undated (horizon 2026–2036) | UK | Sector-level task-based growth accounting, S-curve adoption; "not a GDP forecast" | Three adoption scenarios, current AI capabilities only | 2026–2036 | "Our three scenarios produce annual UK labour productivity contributions of **0.3 to 0.8 percentage points per year**, equivalent to cumulative GDP gains of £400 billion to £1 trillion over the decade" (PDF p.1). It "does not model dynamic adjustment costs, price and wage effects, or sectoral reallocation". |
| A21 | Public First for Microsoft, [*Unlocking the UK's AI potential*](https://microsoftuk.publicfirst.co.uk/) | undated (after Nov 2023) | UK | Task classification with GPT-4; method not on the page | AI and cloud adoption "with the right enablers" | By 2035 | "increasing GDP by over **£550 billion by 2035**. That's the equivalent of raising annual growth rates by 2% a year" (web report). Not stated as a level gap. |
| A22 | CBI and Oliver Wyman, *The adoption decade* | 2026 | UK | — | — | — | **UNVERIFIED.** The PDF was not served to an automated request (13 Nov). Press coverage gives no headline GDP figure. Not used. |
| — | NIESR, IFS, Resolution Foundation, HMT; Goldman Sachs (UK) | — | — | — | — | — | **No quantified AI macro or fiscal estimate found** (searches on 12 and 13 Nov 2026; details in Section 1). This is not proof that none exists. |

### B. Model-based studies (GE, OLG, DSGE, growth and task models)

| # | Study | Year | Country | Model type | AI shock | Horizon / baseline | Headline numbers (each with its location) |
|---|---|---|---|---|---|---|---|
| B1 | Korinek, Jones, Sacher, Cotter and McCrory, ["Economic scenarios for transformative AI"](https://www-cdn.anthropic.com/files/4zrzovbb/website/cf58f84d46a4a76bf5a5b039ac695fba6b80041c.pdf), Anthropic Institute WP 2026-02 | 2026 | US | Task-based GE with adoption, reinstatement and a search-and-matching block. Capital supply Δln K = ε Δln r, with ε = 3 by default (p.9 and p.26) | "Substantial" scenario: our source for both inputs | 2030, against the no-AI path | **Table 3 (p.31), substantial:** GDP **+8.3%**; TFP +3.1%; capital **+13.8%**; labour share **60.0 → 56.1** (per cent of income); labour income **+1.4%**; average wage **+2.1%** (cognitive −0.3%, others +5.9%); net return r−δ **6.5 → 7.0%**; unemployment, all workers, 3.8 → **4.6%** (cognitive 2.9 → 4.5). **Table 5 (p.37), by ε = 1 / 3 / 6 / ∞:** GDP 6.4 / 8.3 / 9.1 / 10.0; wage **−1.6 / +2.1 / +3.7 / +5.6**; net return 7.6 / 7.0 / 6.8 / 6.5; capital 9.3 / 13.8 / 15.7 / 18.2; labour share 55.1 / 56.1 / 56.5 / 57.0. No fiscal block: research is funded by lump-sum taxes. **Table 3, other columns (p.31):** modest: GDP +1.6%, TFP +0.7%, capital +2.3%, labour share 60.0 → 59.4, average wage +0.7%, net return 6.5 → 6.6%; extreme: GDP +32.4%, TFP +13.4%, capital +56.3%, labour share → 45.2, wage +9.7%, net return → 8.3%. **Timing:** the scenarios run from a mid-2026 anchor to the start of 2030, "three and a half years later" (footnote 11, p.26). **Capital supply:** "We set the elasticity of capital supply at ε = 3, which is **higher than five years of saving at historical rates would imply**" (p.26). Capital follows a static supply schedule, so anticipation of the shock plays no part in the capital response. |
| B2 | Penn Wharton Budget Model (Arnon), ["The projected impact of generative AI on future productivity growth"](https://budgetmodel.wharton.upenn.edu/p/2025-09-08-the-projected-impact-of-generative-ai-on-future-productivity-growth/) | 2025 | US | **Hulten/Acemoglu task arithmetic, not PWBM's OLG model.** GDP equals TFP, with no capital deepening. | 40% of labour income exposed; 25% cost saving; adoption path | 2025–2075, against no AI | TFP and GDP **+1.5% by 2035**, nearly 3% by 2055 and 3.7% by 2075. The peak growth contribution is 0.2pp in 2032. Fiscal: "AI could reduce deficits by **$400 billion** over the ten-year budget window between 2026 and 2035" ("very preliminary"). No wage, labour-share or rate results. |
| B3 | Acemoglu, ["The simple macroeconomics of AI"](https://www.nber.org/system/files/working_papers/w32487/w32487.pdf), *Economic Policy* 40(121), 13–58, 2025 (numbers from NBER w32487) | 2024/25 | US | Hulten aggregation with task propagation. Capital adjusts at an unchanged required return. | 4.6% of tasks × 14.4% cost saving | 10 years | TFP "**no more than 0.66%**" in total (p.4 printed); GDP **+0.93–1.16%**, up to 1.4–1.56% with investment (p.4). Capital share up about **0.31pp** (p.40). Average wage about +1.0% and +0.8% (Table 1, p.41; columns read from the order of the cells). "GDP gains will be equal to the TFP gains multiplied by **1.75 (≃ 1/(1 − 0.43))**" (PDF p.36). |
| B4 | Aghion and Bunel, ["AI and growth: where do we stand?"](https://www.frbsf.org/wp-content/uploads/AI-and-Growth-Aghion-Bunel.pdf) | 2024 | US, France | Historical analogy plus Acemoglu's formula with other inputs | — | 10 years | Productivity growth **+0.8 to 1.3pp a year** (analogy). Median **+0.68pp a year of TFP**, range 0.07–1.24 (p.1, p.11). |
| B5 | Baily, Brynjolfsson and Korinek, ["Machines of mind"](https://www.brookings.edu/articles/machines-of-mind-the-case-for-an-ai-powered-productivity-boom/), Brookings | 2023 | US | Illustrative arithmetic | Cognitive workers 30% more productive | 10–20 years | Output **+18%** (level), or 5% after a decade on a small growth path. Micro: Brynjolfsson, Li and Raymond (NBER w31161), +14% issues resolved per hour. |
| B6 | Cazzaniga et al., "Gen-AI: Artificial intelligence and the future of work", **IMF SDN/2024/001** ([doi:10.5089/9798400262548.006](https://doi.org/10.5089/9798400262548.006); imf.org refused access, so the text was read from a [mirror](https://www.developmentaid.org/api/frontend/cms/file/2024/01/SDNEA2024001-1.pdf)) | 2024 | **UK-calibrated** | Heterogeneous-agent task model (Rockall, Pizzinelli and Tavares) | **Labour share −5.5pp** (UK 1980–2014 change); productivity +1.5pp a year over the first 10 years in one scenario | Steady state to steady state | Output **almost +10%** (low complementarity) to **+16%** with TFP almost +4% (high productivity) (p.18–19 printed). Interest rates "increase by **almost 0.4 percentage point**" in all scenarios (p.17). Low-income workers' income −2%, top +8% (p.18). Aggregate wage only in a figure (UNVERIFIED). Openness not stated. The model is B18. |
| B7 | Cerutti et al., ["The global impact of AI: mind the gap"](https://www.imf.org/-/media/files/publications/wp/2025/english/wpiea2025076-print-pdf.pdf), IMF WP/25/76 | 2025 | Global; UK within "other AEs" | Multi-region GIMF DSGE | TFP path calibrated to UK estimates of **+1.3 to 3.4% TFP over 10 years** (p.15) | 10 years | Other advanced economies, GDP **+4.7% (high) / +1.6% (low)** after 10 years (p.16 printed). World GDP about +4% / +1.3%. US is +5.4 / +1.8 on p.16 and +5.6 / +1.9 on p.6, inconsistent within the paper. Monetary and fiscal policy endogenous, no fiscal numbers. World: GDP "nearly 4 percent under a high TFP growth scenario and 1.3 percent under a low TFP growth scenario over the next decade, with **underlying TFP gains of 0.8-2.4 percent**" (PDF p.6), which is 1.6–1.7 of GDP per 1% of TFP (ours). |
| B8 | Berg, Buffie and Zanna, "Should we fear the robot revolution? (The correct answer is yes)", *JME* 97 (2018) 117–148; IMF WP 18/116 (text: [Dec 2017 conference draft](https://www.aeaweb.org/conference/2018/preliminary/paper/NKZHYSBE)) | 2018 | Generic | Ramsey growth model with robot capital. Long-run r = ρ + δ (closed) | Robot productivity rise | Short run to generations | Real wages "fall in the short run and eventually rise, but 'eventually' can easily take generations" (abstract). Per capita income **+30 to 240%** in the long run, and the low-wage phase lasts **20–50+ years** (p.6). Labour share falls to 44% (scenario 1, p.13). JME numbers UNVERIFIED against the draft. |
| B9 | Sachs, Benzell and LaGarda, ["Robots: curse or blessing? A basic framework"](https://www.nber.org/system/files/working_papers/w21091/w21091.pdf), NBER w21091 | 2015 | Generic | Two-period OLG theory | Robot productivity | Generations | Qualitative: a rise in robot productivity is more likely to lower the welfare of the young and future generations when saving is low; intergenerational transfers can make every generation gain (abstract). |
| B10 | Benzell, Kotlikoff, LaGarda and Sachs, ["Robots are us: some economics of human replacement"](https://www.nber.org/system/files/working_papers/w20941/w20941.pdf), NBER w20941 | 2015 (rev. 2018) | Generic | Two-period OLG (a period is a generation) | Machines replace high-tech workers | Long run | Low saving (0.2): national income **+7.8% then −4.2%** long run; all workers earn **24.8% less**; labour share 75.0 → 57.5%; interest rate +110% (relative) (p.13–14). High saving (0.85): income +16.8% long run; wage −2.2% (p.14–15). The OBR FRS 2026 cites this as a benchmark for its labour-share scenario (A2). |
| B11 | Benzell, Kotlikoff, LaGarda and Ye, ["Simulating endogenous global automation"](https://www.nber.org/system/files/working_papers/w29220/w29220.pdf), NBER w29220 | 2021 | 17 regions incl. UK | **Multi-region OLG CGE**, capital mobile across regions | Endogenous automation | To 2050, against no automation | **UK output +10.0% in 2050** (Western Europe +12.9, Japan +12.7, Canada +12.1, US +5.1) (p.3). US labour share 65.9 → 63.1%; high-skill wage +28.8%, low-skill −22.8%. Global r falls less with automation (3.2% against 2.8% in 2050) (p.3). |
| B12 | Caselli and Manning, "Robot arithmetic: new technology and wages", *AER: Insights* 1(1), 1–12, 2019 (text: [CEP DP 1497](https://cep.lse.ac.uk/pubs/download/dp1497.pdf)) | 2019 | Generic | Steady-state theory | Any new technology | Long run | Average wages rise if investment goods get cheaper and competition does not fall, **assuming a constant interest rate**. "If new technology causes the interest rate to rise then this causes … possible falls in real wages" (p.8). This is the theory that explains our wage result. |
| B13 | Korinek and Suh, ["Scenarios for the transition to AGI"](https://www.nber.org/system/files/working_papers/w32255/w32255.pdf), NBER w32255 | 2024 | Generic | Task-complexity automation with capital | Business as usual vs. AGI in 5 or 20 years | Decades | Business as usual: output and wages rise forever. AGI: wages "collapse" as full automation approaches, after about 3 years in the aggressive case (p.5 and p.25). |
| B14 | Jones and Tonetti, ["Past automation and future A.I."](https://web.stanford.edu/~chadj/JonesTonetti_Automation.pdf), v0.5 | 2026 | US | Automation growth model, task elasticity about 0.2 | Continuation vs "Moore's Law everywhere" | To 2075 | Continuation: growth only **2.6% by 2075**; incomes only 4% higher in 2050 (p.4 and p.41). Extreme: growth over 7% by 2030 and 13% by 2040 (p.41). |
| B15 | Moll and Imas, ["Will AI soon lead to double-digit growth?"](https://aleximas.substack.com/p/will-ai-soon-lead-to-double-digit) (essay) | 2026 | US | Solow, Cobb-Douglas, capital share = automated task share | α from 1/3 to 1 over 2025–2045; saving rate 20% | To 2045 | Growth reaches about 12.5% by 2035 and GDP is about 8× by 2045 in the textbook model. The wage "temporarily declines" and the labour share goes to zero. They argue 4–5% growth is a more reasonable baseline for the next 10–15 years. |
| B16 | Korinek and Lockwood, ["Public finance in the age of AI: a primer"](https://www.brookings.edu/wp-content/uploads/2026/01/Korinek-Lockwood-FINAL-for-website.pdf), Brookings | 2025/26 | Generic | Optimal-tax theory | Rising capital share α | Long run | Qualitative: the maximum revenue from labour taxes as a share of output falls as α rises (§ "The labor tax Laffer curve", p.13–15). No calibrated numbers. Cited by the OBR FRS 2026. |
| B17 | CBO, "Artificial intelligence and its potential effects on the economy and the federal budget", pub. 60774 ([CBO](https://www.cbo.gov/system/files/2024-12/60774-AI-fed-budget.pdf); read from the Wayback Machine copy) | 2024 | US | Qualitative | — | — | No quantified effects. "Because different categories of income are taxed at different rates … changes to the distribution of income among categories could offset that increase" (p.7). The 2026 *Budget and Economic Outlook* reportedly builds in a 0.1pp AI productivity boost over 2026–36: **UNVERIFIED** (cbo.gov refused access on 12 and 13 Nov; the figure is from an AEI summary). |
| B18 | Rockall, Tavares and Pizzinelli, ["AI adoption and inequality"](https://www.imf.org/-/media/files/publications/wp/2025/english/wpiea2025068-print-pdf.pdf), IMF WP/25/68 | 2025 | **UK-calibrated** | Heterogeneous-agent task model with a finite long-run capital-supply elasticity, after Moll, Rachel and Restrepo (B21). The model behind A6 and B6. | Baseline: aggregate capital share +5.5pp, the UK's 1980–2014 change. Extended (endogenous adoption): +10.2pp | Steady state to steady state, 2014–2048 | **Table 2 (p.24), baseline AI:** output **+10.6%**, mean wages **+0.2%**; with complementarity and extra productivity: output +12.2%, mean wages +1.6%. **Table 4 (p.38), extended:** capital share +10.2pp, output **+20.7%**, mean wages **−0.5%**. "The extended AI model projects TFP growth of 1.7 percent and output growth of 20.7 percent, significantly higher than the baseline AI scenario (1.4 percent and 10.6 percent respectively) … **average wages almost unchanged in all scenarios**" (p.35). Capital supply: "the capital supply does not fully adjust even in the long run, resulting in a higher equilibrium return on capital" (p.15). |
| B19 | Rachel, ["What next for r*? A capital market equilibrium perspective on the natural rate of interest"](https://www.brookings.edu/wp-content/uploads/2025/09/3_Rachel_17465-JHUP_BPEA-Fall-2025-WEB-1.pdf), *Brookings Papers on Economic Activity*, Fall 2025 | 2025 | Advanced economies | Capital-market equilibrium model of r* | "TFP growth is boosted by 0.75 percentage points over the next decade and by 0.25 percentage points thereafter"; markups +2pp; "the labor share declines gradually by up to 1.1 percentage points" (p.177) | Decades | "AI and inflation risk scenarios are most powerful quantitatively, each **raising r* by about 1 percentage point** … the effects of an AI-driven growth boom build up over several years" (p.137). |
| B20 | Aldasoro, Doerr, Gambacorta and Rees, ["The impact of artificial intelligence on output and inflation"](https://www.bis.org/publ/work1179.htm), BIS WP 1179 | 2024 | Generic | Multi-sector DSGE | AI as a permanent, sector-specific productivity rise; households and firms either anticipate it or do not | Short and long run | Abstract only: "AI significantly raises output, consumption and investment in the short and long run". Without anticipation, adoption is initially disinflationary; with it, inflation rises at once. **Numbers UNVERIFIED** (the PDF could not be read). |
| B21 | Moll, Rachel and Restrepo, ["Uneven growth: automation's impact on income and wealth inequality"](https://www.nber.org/system/files/working_papers/w28440/w28440.pdf), *Econometrica* 90(6), 2022 (numbers from NBER w28440) | 2022 | US | Perpetual-youth model with an upward-sloping long-run capital supply | Automation since 1980 | Transition and long run | "Despite the increase in the average output per hour of labor … **mean wages go down by 3% in 2020 and by 1% in the long run**", although capital supply "is fairly elastic (with a semi-elasticity d ln K/dr = 50)" (PDF p.19). "We view this choice … as conservative, in the sense that **much of the evidence suggests a more inelastic supply of capital**" (PDF p.35). The return to wealth less σ × g "increased by 0.7–2 percentage points" over 1980–2007 (PDF p.6). Korinek et al. (B1, footnote 1) convert the semi-elasticity of 50 to ε ≈ 6 on their definition. |
| B22 | Karabarbounis and Neiman, ["The global decline of the labor share"](https://www.nber.org/system/files/working_papers/w19136/w19136.pdf), *QJE* 129(1), 2014 (numbers from NBER w19136) | 2014 | Global | Data plus CES model | Falling relative price of investment | 1975–2012 | "a **5 percentage point decline** in the share of global corporate gross value added paid to labor **over the last 35 years**" (PDF p.3). Elasticity of substitution "about 1.25"; the investment-price fall "delivers roughly half" of the decline (PDF p.5). A pace benchmark: 0.14pp a year (ours). |
| B23 | Autor, Dorn, Katz, Patterson and Van Reenen, ["The fall of the labor share and the rise of superstar firms"](https://www.nber.org/system/files/working_papers/w23396/w23396.pdf), *QJE* 135(2), 2020 (numbers from NBER w23396) | 2020 | US | Firm-level data | Concentration | 1982–2012 | In manufacturing, "from 1997-2012 … the labor share fell by around **6 percentage points**" (footnote 25, PDF p.17). A sector, not the economy: 0.4pp a year (ours). |
| B24 | Misch, Park, Pizzinelli and Sher, ["Artificial intelligence and productivity in Europe"](https://www.imf.org/-/media/files/publications/wp/2025/english/wpiea2025067-print-pdf.pdf), IMF WP/25/67 | 2025 | Europe incl. UK | Acemoglu-type task arithmetic, static | Country-specific exposure and adoption | Medium term (5 years, per A6 footnote 8) | "the productivity gains from AI in Europe are likely to be modest, at around **1.1 percent** over the medium term in our preferred scenario" (PDF p.18). The UK value is in a chart only: **UNVERIFIED**. A6 says its own 1.4% at 10 years is "consistent with" this paper's UK estimate (Annex III ¶5). |
| B25 | Lennox and Dixon, ["Generative AI and occupational change in Australia: a task-based CGE analysis"](https://www.gtap.agecon.purdue.edu/resources/res_download.asp?D_ID=13101) (version of 14 April 2026) | 2026 | Australia | Task- and occupation-based CGE, 45 industries; long-run comparative statics; "a fixed global rate of return to capital" | GenAI "fully and broadly adopted" | Long run | "Real GDP rises by **29.8%**, while welfare rises by only 16.2% … investment's share of GDP increases from 34.5% to 40.7%" (abstract). "task-level technical change … accounts for roughly one third of the total (**10.1 pp**). The majority of the aggregate output gain … [comes] from the capital deepening that AI-driven automation necessitates" (PDF p.11). "the labour share of income falls from **60.0% to 52.4%** of GDP" (PDF p.16). Real wages rise almost everywhere. |
| B26 | Brollo et al., ["Broadening the gains from generative AI: the role of fiscal policies"](https://www.imf.org/-/media/files/publications/sdn/2024/english/sdnea2024002.pdf), IMF SDN/2024/002 | 2024 | Generic | Model with sectoral automation, mobility frictions and unemployment insurance | Productivity of automated capital; smaller scenario "similar to Cazzaniga and others" | Long run and transition | Smaller scenario: "output increases by about 17 percent, while the labor income share in the affected sector falls by 10 percentage points, reducing total labor income share in the economy by 5 percentage points" (Annex 1, PDF p.34). Tax: capital and labour income "were taxed at similar average rates in the early 1980s, the gap had grown to **almost 10 percentage points in 2018**" in advanced economies (PDF p.24). "if gen AI reduces the labor income share and capital income is taxed less, requisite tax revenue will fall" (PDF p.18). No revenue number. |
| B27 | Guerreiro, Rebelo and Teles, ["Should robots be taxed?"](https://www.nber.org/system/files/working_papers/w23806/w23806.pdf), *Review of Economic Studies* 89(1), 2022 (text from NBER w23806) | 2017/2022 | US | OLG with occupational choice; optimal Mirrleesian taxes | Falling cost of robots | Decades | Qualitative for our purpose: "a sustained fall in the cost of automation generates a large rise in income inequality and a fall in the welfare of those who work in routine occupations" (PDF p.5). Optimal robot tax "5.1, 2.2, and 0.6 percent in the decades that start in 2018, 2028, and 2038" (PDF p.6). No aggregate wage, GDP or revenue figure. |
| B28 | Fornaro and Wolf, ["Macroeconomic policies for AI"](https://econ-papers.upf.edu/papers/1943.pdf), UPF Economics WP 1943 | 2026 | Generic | New Keynesian model with automation | Wider scope for automation | Short and long run | Qualitative (abstract): automation "reduces workers' share of income. Since workers have a high propensity to consume, advances in AI may depress aggregate demand and lead to a slump". A demand channel that OG-UK does not have. |
| B29 | Luduvice and Pinheiro, ["AI-augmented capital-skill complementarity"](https://www.clevelandfed.org/-/media/project/clevelandfedtenant/clevelandfedsite/publications/working-papers/2026/wp2622.pdf), Cleveland Fed WP 26-22 | 2026 | US | Estimated dynamic GE with AI capital in a nested CES | AI usage share; AI price | — | Qualitative (abstract): "A rise in the AI usage share is contractionary as it increases reliance on a scarce complementary input. A fall in AI prices is expansionary". "A tax on AI capital income raises limited revenue while the AI capital stock remains small". No comparable number. |
| — | OG-Core / OG-USA / OG-UK applied to AI or automation | — | — | — | — | — | **None found** (searches on 12 and 13 Nov 2026). The OBR's own UK OLG (WP 22) is used in the FRS 2026 for ageing and debt, not AI. |

## 3. Benchmark table by outcome

Each row gives the study, the size of its shock, its horizon and its value, and then the shock-scaled figure used in Section 4. The scaled figures are ours. Row labels (A6, B1, …) refer to Section 2.

**How horizons are made comparable.**
- Our headline is adoption year 4. Sources that publish a path are read at year 4 or 5 on their own path: the IMF UK paper (A6) and Korinek et al. (B1, 3.5 years).
- Ten-year and steady-state sources are not rescaled to year 4. A straight line would overstate the early years of an S-shaped or J-shaped path. They are compared on ratios that do not depend on the horizon: GDP per 1% of TFP, the wage and the interest rate per point of labour-share fall, and tax/GDP per point.
- OBR growth-rate figures are turned into year-4 levels with the rule in `docs/uk_calibration.md`: a growth boost that ramps linearly to g by year five gives a level of 2g at year 4.
- Our baseline already contains the OBR's 0.2pp a year AI assumption, so our gaps are on top of it. Most studies measure against a path with no AI.

### 3.1 The shock: TFP and the labour share

| Study | Horizon | TFP or productivity | Labour-share fall | Share fall per 1% of TFP (ours) | Share fall per year (ours) |
|---|---|---|---|---|---|
| OBR BP9 and FRS 2026 (A5, A2) | year 4 (ours, 2g rule) | +0.2% (J-curve), +0.4% (central), +0.5% (S-curve), +1.6% (0.8pp alternative) | — | — | — |
| OBR FRS 2026 Box 4.1 (A2) | 45 years | GDP unchanged | 20pp of GDP in wages and salaries | — | 0.44pp |
| OBR March 2026 displacement scenario (A1) | to 2030-31 | productivity up, GDP unchanged | about 0.7pp (ours; none published) | — | — |
| IMF UK Selected Issues (A6) | year 4; year 5; year 10 | +0.42% (digitised); +0.53%; +1.40% | 10pp in the long run, reached in 17 years; 1.56pp at year 4 (ours, `uk_calibration.md`) | 3.7 at year 4 (ours) | 0.59pp on a straight line |
| IMF Article IV risk matrix (A7) | 10 years | +1 to 5pp | — | — | — |
| OECD (A9), UK | 10 years | labour productivity +0.39, +0.97, +1.27pp a year; TFP two-thirds of that | — | — | — |
| BoE DMP firms (A8) | next 3 years | labour productivity +0.9pp a year | — | — | — |
| Rockall et al. (B18), UK | steady state, 34 years | +1.4% (baseline), +1.7% (extended) | 5.5pp, 10.2pp | 3.9, 6.0 | 0.16pp, 0.30pp |
| Korinek et al. (B1), US | 3.5 years | +0.7%, +3.1%, +13.4% | 0.6pp, 3.9pp, 14.8pp | 0.9, 1.3, 1.1 | 0.17pp, 1.1pp, 4.2pp |
| Acemoglu (B3), US | 10 years | +0.66% | 0.31pp | 0.5 | 0.03pp |
| Rachel (B19) | 10 years | +0.75pp a year, about +7.5% | up to 1.1pp | 0.15 | 0.11pp |
| Lennox and Dixon (B25), Australia | long run, full adoption | direct technical change +10.1pp of GDP | 7.6pp | 0.75 | — |
| Brollo et al. (B26), smaller scenario | long run | output +17% | 5pp | — | — |
| BCG (A20), UK | 10 years | labour productivity +0.3 to +0.8pp a year | — | — | — |
| Karabarbounis and Neiman (B22), global | 35 years | — | 5pp | — | 0.14pp |
| ONS (A18), UK | 1996–2023 | — | a rise of about 5.5pp, most of it by 2001 | — | — |
| **Ours** | year 4 | +0.2%, +0.4%, +1.6%, +3.1% | 0.7pp, 1.6pp, 2.9pp, 3.9pp | 3.5, 4.0, 1.8, 1.3 | 0.18pp, 0.40pp, 0.73pp, 0.98pp |

### 3.2 GDP per 1% of TFP

| Study | Shock | Horizon | Output | TFP | Output per 1% of TFP (ours) | How capital is supplied |
|---|---|---|---|---|---|---|
| Penn Wharton (B2) | TFP only | 2035 | +1.5% | +1.5% | 1.0 | no capital deepening, by construction |
| OECD (A9) | TFP only | 10 years | — | — | 1.5 (labour productivity) | rule: 1/(1 − 1/3) |
| Cerutti et al. (B7), world | TFP only | 10 years | +1.3%, nearly +4% | +0.8%, +2.4% | 1.6–1.7 | multi-region DSGE, endogenous saving |
| Acemoglu (B3) | TFP, capital share +0.31pp | 10 years | +0.93% to +1.16% | "no more than 0.66%" | 1.75 by formula (1.4 with hard tasks) | unchanged required return |
| Korinek et al. (B1), ε = 1 | substantial: share −4.9pp | 3.5 years | +6.4% | +3.1% | 2.1 | elasticity 1 |
| Korinek et al. (B1), ε = 3 | modest, substantial, extreme | 3.5 years | +1.6%, +8.3%, +32.4% | +0.7%, +3.1%, +13.4% | 2.3, 2.7, 2.4 | elasticity 3 |
| Korinek et al. (B1), ε = ∞ | substantial: share −3.0pp | 3.5 years | +10.0% | +3.1% | 3.2 | rental rate pegged |
| Lennox and Dixon (B25), Australia | full adoption; share −7.6pp | long run | +29.8% | +10.1pp direct | 3.0 | world rate of return fixed |
| IMF UK (A6) | capital share +10pp in the long run | year 4 (digitised); year 5; year 10 | +2.52%; +3.26%; +7.96% | +0.42%; +0.53%; +1.40% | 6.0; 6.2; 5.7 | finite long-run elasticity (B18, B21) |
| Rockall et al. (B18) | capital share +5.5pp; +10.2pp | steady state | +10.6%; +20.7% | +1.4%; +1.7% | 7.6; 12.2 (not used: steady state) | same |
| **Published range used** | | | | | **1.0 to 6.2** | |

The ratio rises with the share shift, because a higher capital share raises the demand for capital at any given TFP. The range therefore pools studies with different mixes, and Section 4.4 separates the two effects in our results.

### 3.3 Capital and investment

| Study | Shock | Horizon | Capital stock | Implied capital-supply elasticity |
|---|---|---|---|---|
| Korinek et al. (B1), Table 5, substantial | share −4.9 to −3.0pp, TFP +3.1% | 3.5 years | +9.3% (ε = 1), +13.8% (3), +15.7% (6), +18.2% (∞) | 1, 3, 6, ∞ (theirs: Δln K / Δln rental rate) |
| Korinek et al. (B1), modest | share −0.6pp, TFP +0.7% | 3.5 years | +2.3% | 3 |
| Moll, Rachel and Restrepo (B21) | automation | long run | "a modest expansion in output and the capital-output ratio" | semi-elasticity 50, which is ε ≈ 6 (B1, footnote 1); "much of the evidence suggests a more inelastic supply" |
| IMF UK (A6) | TFP +0.42%, output +2.52% (digitised) | year 4 | not published | 4.8 if the share fall is 1.56pp; 1.6 if it is the straight-line 2.35pp (ours: aggregate Cobb-Douglas arithmetic, `imf_implied_elasticity` in `lit_grid.py`) |
| Lennox and Dixon (B25) | full adoption | long run | investment share of GDP 34.5% → 40.7% | ∞ (fixed world rate of return) |
| OG-UK at ζK = 0.5, 2026-start run made before the R1–R4 fixes (`docs/closure_sensitivity.md`) | share −3.9pp, TFP +3.1% | 2030 | +18.4% | 5.4 (ours) |
| **Published range used** | | | | **1 or more** |

No UK source publishes an investment response to AI. The BoE reports that AI-related activity was "just under a fifth of GDP growth since the start of 2026" (A8), which is a level of activity and not a scenario.

### 3.4 Wages and labour income

| Study | Shock | Horizon | Average wage | Per point of share fall (ours) |
|---|---|---|---|---|
| Korinek et al. (B1), Table 5, substantial | share −4.9 / −3.9 / −3.5 / −3.0pp; TFP +3.1% | 3.5 years | −1.6% (ε = 1), +2.1% (3), +3.7% (6), +5.6% (∞) | −0.33, +0.54, +1.06, +1.87 |
| Korinek et al. (B1), modest | share −0.6pp, TFP +0.7% | 3.5 years | +0.7% | +1.17 |
| Rockall et al. (B18), UK | capital share +5.5pp, +10.2pp | steady state | +0.2% (baseline), +1.6% (with extra productivity), −0.5% (extended) | +0.04, +0.29, −0.05 |
| Moll, Rachel and Restrepo (B21), US | automation since 1980 | 2020; long run | −3%; −1% | — |
| IMF UK (A6) | TFP +0.42%, output +2.52% | year 4 | "higher wages overall" (no number). From the identity wage = labour share × output per worker: +0.06% if the share fall is 1.56pp, −1.19% if it is 2.35pp (ours) | +0.04; −0.51 |
| Lennox and Dixon (B25) | share −7.6pp, GDP +29.8% | long run | "near-universal real wage increase" (no average published) | — |
| OBR March 2026 displacement (A1) | GDP unchanged, unemployment +1.4pp | to 2030-31 | real earnings per worker unchanged; labour income about −1.5% through jobs (ours) | — |
| Caselli and Manning (B12) | any technology | long run | cannot fall at a constant interest rate; can fall if the rate rises | — |
| **Published range used** | | | | **−0.33 to +1.87** (Korinek et al., ε = 1 to ∞) |

### 3.5 Interest rate

| Study | Shock | Horizon | Change in the real return | Per point of share fall (ours) |
|---|---|---|---|---|
| Korinek et al. (B1), modest | share −0.6pp, TFP +0.7% | 3.5 years | 6.5 → 6.6%: +10bp (rounded) | 17bp |
| Korinek et al. (B1), substantial | share −3.9pp, TFP +3.1% | 3.5 years | +50bp (ε = 3); +110bp (ε = 1); +30bp (6); 0 (∞) | 13bp; 22bp; 9bp; 0 |
| IMF SDN, UK-calibrated (B6) | capital share +5.5pp | steady state | "almost 0.4 percentage point" | 7bp |
| Rachel (B19) | TFP +0.75pp a year for a decade, share −1.1pp, markups +2pp | builds over several years | r* "about 1 percentage point" | not scaled: mostly a growth effect |
| Bank of England (A8, A19) | — | — | no estimate | — |
| **Published range used** | | | | **7bp to 22bp** (ε = ∞ excluded: it is the pegged-rate case) |

### 3.6 Tax revenue and debt

| Study | Shock | Horizon | Value | Scaled (ours) |
|---|---|---|---|---|
| OBR FRS 2026 Box 4.1 (A2) | wages and salaries −20pp of GDP, GDP unchanged | 45 years | tax "nearly 4 percentage points" of GDP lower | −0.19pp of GDP per point of share fall |
| OBR November 2025 EFO rates (A4) | — | — | effective rates about 40% on labour income, 17% on profits | −0.23pp per point |
| OBR March 2026 displacement (A1) | share about −0.7pp (ours), GDP unchanged | to 2030-31 | receipts −£6bn a year (0.17% of GDP); debt +1.3% of GDP | debt +1.86pp per point of share fall |
| OBR productivity upside (A4) | productivity growth +0.5pp a year | 2030-31 | borrowing £50bn lower | — |
| OBR FRS 2026, higher-productivity variant with primary spending a constant share of GDP (¶5.17 and ¶5.20, p.114–115) | productivity growth +0.4pp a year; interest rates assumed unchanged | to 2075-76 | "only a small difference in the debt trajectory compared to the baseline" | sign: debt slightly lower |
| Penn Wharton (B2) | TFP +1.5% by 2035 | 2026–2035 | deficits $400bn lower | sign: debt lower |
| Brollo et al. (B26), advanced economies | — | 2018 | average tax burden on labour "almost 10 percentage points" above that on capital | −0.10pp per point (ours) |
| CBO (B17) | — | — | qualitative; the composition of income "could offset" higher revenue | — |
| Korinek and Lockwood (B16) | rising capital share | long run | qualitative: labour-tax revenue falls as a share of output | — |

- The FRS variant is the closest to our convention, because our spending is a fixed share of GDP. It holds interest rates at baseline. Ours do not stay at baseline, and that is the source of red flag 2.
- The tax range used in Section 4 is the OBR's (−0.19 to −0.23), because it is the UK's. OG-UK's own labour–capital gap of about 14pp (`docs/red_flags_1_3.md`) lies between the IMF's advanced-economy average (10pp) and the OBR's UK figures (19–23pp).

## 4. Our results against the ranges

### 4.1 What we compare

2031 gaps against the same closure's continuation (the gated no-shock restart), from `lit_grid.py`. The stress test is the last R4 iteration on disk (`r4_2` for Korinek at ζK = 0.1, `r4_1` elsewhere). UK low and UK high are not solved at ζK = 0.

The debt-neutral variants that landed overnight (UK central at ζK = 0.1: GDP +1.02% in the main arm and +0.60% with technology unchanged) are not in the grid. Their capital and wage responses are within 0.15pp of the arms below, so the GDP, capital, wage and interest-rate verdicts would not change.

| closure | scenario | arm | GDP % | GNI % | capital % | investment % | hours % | GDP per hour % | wage % | labour income % | consumption % | return, bp | tax/GDP, pp | debt/GDP 2031, pp | debt/GDP 2036, pp |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ζK 0.1 | UK low | automation + productivity | +0.41 | +0.27 | +0.87 | +1.60 | -0.13 | +0.55 | -0.53 | -0.67 | -0.16 | +17 | -0.08 | -0.07 | +0.84 |
| ζK 0.1 | UK low | technology unchanged | +0.20 | +0.06 | +0.81 | +1.21 | -0.13 | +0.32 | -0.76 | -0.88 | -0.27 | +15 | -0.09 | +0.17 | +1.18 |
| ζK 0.1 | UK low | stress test (GDP flat) | +0.00 | -0.13 | +0.75 | +0.86 | -0.12 | +0.12 | -0.95 | -1.07 | -0.37 | +14 | -0.10 | +0.38 | +1.47 |
| ζK 0.1 | UK central | automation + productivity | +0.92 | +0.57 | +2.01 | +3.58 | -0.30 | +1.22 | -1.27 | -1.57 | -0.39 | +38 | -0.19 | -0.13 | +1.99 |
| ζK 0.1 | UK central | technology unchanged | +0.47 | +0.15 | +1.88 | +2.78 | -0.29 | +0.77 | -1.71 | -2.00 | -0.61 | +34 | -0.21 | +0.35 | +2.67 |
| ζK 0.1 | UK central | stress test (GDP flat) | +0.00 | -0.30 | +1.73 | +1.94 | -0.27 | +0.28 | -2.19 | -2.46 | -0.84 | +31 | -0.24 | +0.87 | +3.40 |
| ζK 0.1 | UK high | automation + productivity | +2.74 | +2.02 | +4.09 | +8.32 | -0.58 | +3.34 | -1.27 | -1.84 | -0.20 | +76 | -0.29 | -1.35 | +2.07 |
| ζK 0.1 | UK high | technology unchanged | +0.94 | +0.32 | +3.50 | +5.10 | -0.53 | +1.47 | -3.05 | -3.57 | -1.08 | +62 | -0.40 | +0.57 | +4.79 |
| ζK 0.1 | UK high | stress test (GDP flat) | -0.00 | -0.57 | +3.19 | +3.42 | -0.50 | +0.50 | -3.98 | -4.46 | -1.53 | +54 | -0.46 | +1.59 | +6.24 |
| ζK 0.1 | Korinek | automation + productivity | +4.89 | +3.80 | +6.03 | +13.22 | -0.82 | +5.75 | -0.59 | -1.40 | +0.28 | +109 | -0.35 | -3.02 | +1.12 |
| ζK 0.1 | Korinek | technology unchanged | +1.34 | +0.47 | +4.81 | +6.93 | -0.72 | +2.07 | -4.05 | -4.74 | -1.42 | +82 | -0.55 | +0.67 | +6.38 |
| ζK 0.1 | Korinek | stress test (GDP flat) | -0.00 | -0.79 | +4.36 | +4.53 | -0.68 | +0.68 | -5.36 | -6.00 | -2.07 | +71 | -0.63 | +2.14 | +8.45 |
| ζK 0 | UK low | all three | not solved |  |  |  |  |  |  |  |  |  |  |  |  |
| ζK 0 | UK central | automation + productivity | +0.37 | +0.30 | +0.67 | +3.31 | -0.40 | +0.77 | -1.71 | -2.10 | -0.52 | +48 | -0.01 | +0.33 | +1.98 |
| ζK 0 | UK central | technology unchanged | -0.03 | -0.10 | +0.63 | +2.45 | -0.38 | +0.35 | -2.12 | -2.49 | -0.73 | +44 | -0.05 | +0.78 | +2.67 |
| ζK 0 | UK central | stress test (GDP flat) | +0.00 | -0.06 | +0.63 | +2.52 | -0.38 | +0.39 | -2.09 | -2.46 | -0.71 | +44 | -0.04 | +0.74 | +2.61 |
| ζK 0 | UK high | all three | not solved |  |  |  |  |  |  |  |  |  |  |  |  |
| ζK 0 | Korinek | automation + productivity | +3.05 | +2.88 | +1.80 | +12.67 | -1.13 | +4.22 | -2.03 | -3.14 | -0.16 | +142 | +0.21 | -1.56 | +1.03 |
| ζK 0 | Korinek | technology unchanged | -0.05 | -0.21 | +1.53 | +5.94 | -0.97 | +0.92 | -5.13 | -6.05 | -1.75 | +107 | -0.10 | +1.85 | +6.43 |
| ζK 0 | Korinek | stress test (GDP flat) | +0.00 | -0.16 | +1.53 | +6.06 | -0.97 | +0.98 | -5.08 | -6.00 | -1.72 | +107 | -0.10 | +1.79 | +6.33 |

The same solves on the shock-scaled metrics. "Per pp" is per percentage point of labour-share fall. The elasticity is Korinek et al.'s: Δln K / Δln(rental rate), with the rental rate γY/K.

| closure | scenario | arm | GDP per 1% TFP | of which TFP alone (main less technology-unchanged) | capital-supply elasticity | same, steady state | wage % per pp | return, bp per pp | tax/GDP pp per pp | steady-state GDP % | steady-state wage % | steady-state return, bp |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ζK 0.1 | UK low | automation + productivity | +2.07 | +1.10 | +0.57 | +1.38 | -0.76 | +24 | -0.11 | +0.66 | -0.16 | +11 |
| ζK 0.1 | UK low | technology unchanged | — | — | +0.58 | +1.24 | -1.08 | +22 | -0.13 | +0.41 | -0.44 | +11 |
| ζK 0.1 | UK low | stress test (GDP flat) | — | — | +0.60 | +1.11 | -1.36 | +20 | -0.15 | +0.20 | -0.70 | +10 |
| ζK 0.1 | UK central | automation + productivity | +2.29 | +1.11 | +0.59 | +1.39 | -0.79 | +24 | -0.12 | +1.49 | -0.41 | +25 |
| ζK 0.1 | UK central | technology unchanged | — | — | +0.60 | +1.27 | -1.07 | +21 | -0.13 | +0.98 | -0.99 | +24 |
| ζK 0.1 | UK central | stress test (GDP flat) | — | — | +0.62 | +1.13 | -1.37 | +19 | -0.15 | +0.45 | -1.60 | +24 |
| ζK 0.1 | UK high | automation + productivity | +1.71 | +1.13 | +0.60 | +1.58 | -0.44 | +26 | -0.10 | +3.96 | +0.61 | +47 |
| ζK 0.1 | UK high | technology unchanged | — | — | +0.63 | +1.31 | -1.05 | +21 | -0.14 | +1.88 | -1.73 | +44 |
| ζK 0.1 | UK high | stress test (GDP flat) | — | — | +0.65 | +1.15 | -1.37 | +19 | -0.16 | +0.80 | -2.95 | +42 |
| ζK 0.1 | Korinek | automation + productivity | +1.58 | +1.14 | +0.62 | +1.72 | -0.15 | +28 | -0.09 | +6.76 | +2.32 | +65 |
| ζK 0.1 | Korinek | technology unchanged | — | — | +0.65 | +1.34 | -1.04 | +21 | -0.14 | +2.64 | -2.26 | +58 |
| ζK 0.1 | Korinek | stress test (GDP flat) | — | — | +0.68 | +1.16 | -1.37 | +18 | -0.16 | +1.08 | -3.99 | +56 |
| ζK 0 | UK low | all three | not solved |  |  |  |  |  |  |  |  |  |
| ζK 0 | UK central | automation + productivity | +0.92 | +1.00 | +0.16 | +1.06 | -1.07 | +30 | -0.00 | +1.27 | -0.55 | +29 |
| ζK 0 | UK central | technology unchanged | — | — | +0.16 | +0.95 | -1.32 | +28 | -0.03 | +0.77 | -1.12 | +28 |
| ζK 0 | UK central | stress test (GDP flat) | — | — | +0.16 | +0.96 | -1.30 | +28 | -0.03 | +0.81 | -1.07 | +28 |
| ζK 0 | UK high | all three | not solved |  |  |  |  |  |  |  |  |  |
| ζK 0 | Korinek | automation + productivity | +0.98 | +1.00 | +0.15 | +1.33 | -0.52 | +36 | +0.05 | +6.08 | +1.91 | +75 |
| ζK 0 | Korinek | technology unchanged | — | — | +0.17 | +0.99 | -1.32 | +27 | -0.03 | +2.05 | -2.60 | +67 |
| ζK 0 | Korinek | stress test (GDP flat) | — | — | +0.17 | +1.00 | -1.30 | +28 | -0.02 | +2.12 | -2.52 | +68 |

### 4.2 Verdict rules and counts

One verdict per cell and row, by these rules. They are coded in `lit_grid.py` (`verdicts`), so the counts reproduce.

| Row | Metric | Published range (Section 3) | Applies to |
|---|---|---|---|
| GDP per 1% of TFP | 2031 GDP gap / TFP target | 1.0 to 6.2 | main arm. Stress test: by construction (GDP is held flat). Technology unchanged: no comparator, because no published scenario shifts the labour share with TFP unchanged |
| Labour productivity, level | 2031 gap in GDP per hour | main arm: 0.2% to 3.6%, the UK range at year 4 (OBR J-curve to the BoE DMP's 0.9pp a year, which firms gave for three years, held for four). With three years (2.7%) UK high would be "above". Stress test: about 1.5%, the OBR displacement scenario (GDP flat, employment about 1.5% lower; ours) | main arm and stress test |
| Wage per pp of share fall | 2031 wage gap / share fall | −0.33 to +1.87 | main arm. Stress test: by construction (with GDP flat, labour income falls by the share fall) |
| Labour share | 2031 gap | — | by construction in every arm: it is the input, and the solves reproduce it to 0.001pp |
| Capital-supply elasticity | Δln K / Δln rental rate | 1 or more | every arm |
| r, bp per pp of share fall | 2031 gap in the return / share fall | 7 to 22 | every arm |
| Tax/GDP per pp of share fall | 2031 gap in tax/GDP / share fall | −0.23 to −0.19 | every arm. "Below" means a smaller fall than the OBR's |
| Debt/GDP in 2031 | 2031 gap | main arm: zero or lower (OBR productivity scenarios and Penn Wharton). Stress test: +1.86pp per pp of share fall (OBR displacement) | main arm and stress test |

Counts by row:

| row | inside | above | below | wrong sign | by construction | no comparator | not solved |
|---|---|---|---|---|---|---|---|
| GDP per 1% of TFP | 4 | 0 | 2 | 0 | 6 | 6 | 6 |
| labour productivity, level | 4 | 2 | 6 | 0 | 0 | 6 | 6 |
| wage per pp of share fall | 1 | 0 | 5 | 0 | 6 | 6 | 6 |
| labour share | 0 | 0 | 0 | 0 | 18 | 0 | 6 |
| capital-supply elasticity | 0 | 0 | 18 | 0 | 0 | 0 | 6 |
| r, bp per pp of share fall | 8 | 10 | 0 | 0 | 0 | 0 | 6 |
| tax/GDP per pp of share fall | 0 | 0 | 17 | 1 | 0 | 0 | 6 |
| debt/GDP in 2031 | 5 | 1 | 6 | 0 | 0 | 6 | 6 |
| **all rows** | **22** | **13** | **54** | **1** | **30** | **24** | **48** |

Every cell:

| closure | scenario | arm | GDP per 1% of TFP | labour productivity, level | wage per pp of share fall | labour share | capital-supply elasticity | r, bp per pp of share fall | tax/GDP per pp of share fall | debt/GDP in 2031 |
|---|---|---|---|---|---|---|---|---|---|---|
| ζK 0.1 | UK low | automation + productivity | inside | inside | below | by construction | below | above | below | inside |
| ζK 0.1 | UK low | technology unchanged | no comparator | no comparator | no comparator | by construction | below | inside | below | no comparator |
| ζK 0.1 | UK low | stress test (GDP flat) | by construction | below | by construction | by construction | below | inside | below | below |
| ζK 0.1 | UK central | automation + productivity | inside | inside | below | by construction | below | above | below | inside |
| ζK 0.1 | UK central | technology unchanged | no comparator | no comparator | no comparator | by construction | below | inside | below | no comparator |
| ζK 0.1 | UK central | stress test (GDP flat) | by construction | below | by construction | by construction | below | inside | below | below |
| ζK 0.1 | UK high | automation + productivity | inside | inside | below | by construction | below | above | below | inside |
| ζK 0.1 | UK high | technology unchanged | no comparator | no comparator | no comparator | by construction | below | inside | below | no comparator |
| ζK 0.1 | UK high | stress test (GDP flat) | by construction | below | by construction | by construction | below | inside | below | below |
| ζK 0.1 | Korinek | automation + productivity | inside | above | inside | by construction | below | above | below | inside |
| ζK 0.1 | Korinek | technology unchanged | no comparator | no comparator | no comparator | by construction | below | inside | below | no comparator |
| ζK 0.1 | Korinek | stress test (GDP flat) | by construction | below | by construction | by construction | below | inside | below | below |
| ζK 0 | UK low | all three | not solved |  |  |  |  |  |  |  |
| ζK 0 | UK central | automation + productivity | below | inside | below | by construction | below | above | below | above |
| ζK 0 | UK central | technology unchanged | no comparator | no comparator | no comparator | by construction | below | above | below | no comparator |
| ζK 0 | UK central | stress test (GDP flat) | by construction | below | by construction | by construction | below | above | below | below |
| ζK 0 | UK high | all three | not solved |  |  |  |  |  |  |  |
| ζK 0 | Korinek | automation + productivity | below | above | below | by construction | below | above | wrong sign | inside |
| ζK 0 | Korinek | technology unchanged | no comparator | no comparator | no comparator | by construction | below | above | below | no comparator |
| ζK 0 | Korinek | stress test (GDP flat) | by construction | below | by construction | by construction | below | above | below | below |

The shock itself is judged once per scenario, not once per cell (Section 4.3). Sections 4.4 to 4.8 give the reason for every verdict that is not "inside".

### 4.3 The shock

| Scenario | TFP at year 4 | Against the UK range of 0.2% to 2.0% (OBR J-curve to the IMF risk matrix's 5pp over 10 years, linear) | Labour-share fall at year 4 | Against the UK range of 0.7pp to 2.9pp (OBR displacement, implied, to the OBR FRS "upper end" path) |
|---|---|---|---|---|
| UK low | +0.2% | inside, at the bottom | 0.7pp | inside, at the bottom |
| UK central | +0.4% | inside | 1.6pp | inside |
| UK high | +1.6% | inside, near the top | 2.9pp | inside, at the top |
| Korinek US substantial | +3.1% | above | 3.9pp | above |

- The UK scenarios are inside by design: they were calibrated to these sources.
- **The pace of the share shift is fast against history in every scenario but UK low.**
  - The global labour share fell 0.14pp a year over 35 years (B22). The UK capital share rose 0.16pp a year over 1980–2014 on the IMF working paper's figure (B18).
  - UK low is 0.18pp a year, UK central 0.40pp, UK high 0.73pp and Korinek 0.98pp.
  - The UK labour share has moved quickly before: it rose about 5.5pp after 1996, "particularly in the years up to 2001" (A18). So UK central's 1.6pp in four years is not outside UK experience.
- **The mix is share-heavy.** UK low and UK central pair 3.5pp and 4.0pp of share fall with each 1% of TFP. That matches the IMF's UK model (3.7 at year 4; 3.9 and 6.0 in B18) and is three times Korinek et al.'s 0.9–1.3. It matters for the wage (Section 4.6).
- **"Technology unchanged" and the stress test have no published counterpart as shocks.** No source has a labour-share shift with zero or negative TFP. The OBR's displacement scenario is the nearest, and it has productivity rising. These two arms are decompositions of the main arm, not scenarios.

### 4.4 GDP and capital: inside when scaled, below against the same shock

**Scaled: inside.** GDP per 1% of TFP in the main arm at ζK = 0.1 is 2.1 (UK low), 2.3 (UK central), 1.7 (UK high) and 1.6 (Korinek), inside 1.0 to 6.2.

**At ζK = 0: just below.** The ratio is 0.92 (UK central) and 0.98 (Korinek), under Penn Wharton's 1.0, which has no capital deepening at all.
- Why: capital adds 0.24pp for UK central and hours take 0.26pp away, so GDP moves by the technology term alone (audit Section 2 and A1). Hours fall because the wage falls.
- Verdict: below, explained. The ζK = 0 closure is a bound, and this is what a bound with almost no capital response looks like.

**The ratio hides two effects. Separated, the response to TFP alone is at the bottom of the range.**
- **TFP alone: 1.1 per 1% of TFP.** This is the main arm less the technology-unchanged arm, divided by the TFP gain: 1.10 to 1.14 at ζK = 0.1 in the four scenarios and 1.00 at ζK = 0. It is the audit's figure (PR #39, Section 7).
- **The share shift alone: 0.28 to 0.34 per point at ζK = 0.1**, from the technology-unchanged arm, and about zero (−0.02) at ζK = 0.
- 1.1 compares with pure-TFP studies: 1.0 (Penn Wharton), 1.5 (OECD), 1.6–1.7 (Cerutti et al.) and 1.75 (Acemoglu). The last three are ten-year or long-run figures with capital fully adjusted. In our steady state the same figure is 1.3.
- The share effect is why UK central's ratio (2.3) is higher than the Korinek arm's (1.6): UK central has three times as much share shift per unit of TFP.

**Against a study with the same shock: below, and capital supply accounts for all of it.**

| Same-shock comparison | Published | Ours, ζK = 0.1 | Ours, ζK = 0 |
|---|---|---|---|
| UK central against IMF UK at year 4 (A6): TFP +0.4%, share about −1.6pp | output +2.52% (digitised) | +0.92% | +0.37% |
| Korinek arm against Korinek et al. Table 5 (B1): TFP +3.1%, share −3.9pp | GDP +6.4% (ε = 1) to +10.0% (ε = ∞); capital +9.3% to +18.2% | GDP +4.89%; capital +6.0% | GDP +3.05%; capital +1.8% |

- **The implied capital-supply elasticity is 0.57–0.68 at ζK = 0.1 and 0.15–0.17 at ζK = 0, in every arm of every scenario.** The published range starts at 1. That is 18 "below" cells with one cause.
- **Imposing Korinek et al.'s default elasticity on our own solve reproduces their headline.** The table holds each main arm's technology and labour terms and lets capital follow Korinek et al.'s schedule. It is arithmetic, not a solve.

  | closure | scenario | ε | GDP % | capital % | wage % |
  |---|---|---|---|---|---|
  | ζK 0.1 | UK low | solved (0.57) | +0.41 | +0.87 | -0.53 |
  | | | 1 | +0.56 | +1.28 | -0.39 |
  | | | 3 | +0.87 | +2.16 | -0.08 |
  | | | 6 | +1.03 | +2.61 | +0.07 |
  | | | ∞ | +1.27 | +3.29 | +0.31 |
  | ζK 0.1 | UK central | solved (0.59) | +0.92 | +2.01 | -1.27 |
  | | | 1 | +1.23 | +2.89 | -0.96 |
  | | | 3 | +1.96 | +4.93 | -0.24 |
  | | | 6 | +2.34 | +5.98 | +0.12 |
  | | | ∞ | +2.91 | +7.62 | +0.68 |
  | ζK 0.1 | UK high | solved (0.60) | +2.74 | +4.09 | -1.27 |
  | | | 1 | +3.38 | +5.80 | -0.66 |
  | | | 3 | +4.93 | +10.06 | +0.84 |
  | | | 6 | +5.74 | +12.31 | +1.62 |
  | | | ∞ | +7.00 | +15.86 | +2.82 |
  | ζK 0.1 | Korinek | solved (0.62) | +4.89 | +6.03 | -0.59 |
  | | | 1 | +5.81 | +8.45 | +0.28 |
  | | | 3 | +8.20 | +14.83 | +2.54 |
  | | | 6 | +9.45 | +18.29 | +3.73 |
  | | | ∞ | +11.42 | +23.84 | +5.60 |
  | ζK 0 | UK central | solved (0.16) | +0.37 | +0.67 | -1.71 |
  | | | 1 | +1.16 | +2.85 | -0.93 |
  | | | 3 | +1.88 | +4.86 | -0.23 |
  | | | 6 | +2.25 | +5.90 | +0.13 |
  | | | ∞ | +2.81 | +7.51 | +0.69 |
  | ζK 0 | Korinek | solved (0.15) | +3.05 | +1.80 | -2.03 |
  | | | 1 | +5.57 | +8.32 | +0.37 |
  | | | 3 | +7.91 | +14.61 | +2.59 |
  | | | 6 | +9.14 | +18.00 | +3.77 |
  | | | ∞ | +11.08 | +23.46 | +5.61 |

  - At ε = 3 the Korinek arm gives GDP +8.2%, capital +14.8% and the wage +2.5%. Korinek et al. publish +8.3%, +13.8% and +2.1% at ε = 3.
  - **The match is weaker away from 3.** At ε = 1 the arithmetic gives GDP +5.8% and the wage +0.3%, against their +6.4% and −1.6%: the wage has the opposite sign. At ε = ∞ it gives capital +23.8% and GDP +11.4%, against their +18.2% and +10.0%.
    - The reason is that their labour share is endogenous. It falls to 55.1 at ε = 1 and only to 57.0 at ε = ∞, while ours is fixed at a 3.9pp fall. So read the ε = 1 and ε = ∞ rows as rough.
  - **The IMF's year-4 output implies an elasticity of 4.8** if its share fall is the 1.56pp we infer, and 1.6 if it is the straight-line 2.35pp (ours: an aggregate Cobb-Douglas reading of a 100-sector model, on a digitised figure). Both are above our 0.6.
  - So the production side and the shock are consistent with both studies at their own capital response. Most of the difference is how much capital arrives in four years; the rest is what the other models have and ours does not (an endogenous share, unemployment).
- **Why ours is less elastic.**
  - ζK = 0.1 lets in 10% of the excess demand for capital at the 2% world rate. The rest has to come from household saving, and four years of life-cycle saving is small against the stock.
  - The elasticity rises with time: in our steady state it is 1.1–1.7 at ζK = 0.1 and 1.0–1.3 at ζK = 0.
  - The surprise design is not the cause: the Korinek arm's 2031 numbers match the old perfect-foresight 2030 numbers (audit A10).
- **Is a low elasticity defensible?** Partly.
  - Korinek et al. say their ε = 3 "is higher than five years of saving at historical rates would imply", and justify it by AI capital being "financed in a world market" (B1). Moll, Rachel and Restrepo say "much of the evidence suggests a more inelastic supply of capital" than their own choice (B21).
  - `docs/closure_choice.md` adopted ζK = 0.1 because its baseline matches the UK's net income paid abroad, and because its split of extra investment between home and foreign saving (0.25–0.28 from national saving) sits between published estimates for the EU and the euro area. That memo's evidence is about the UK's balance of payments, not about AI capital.
  - The same memo shows ζK = 0.5 matching the UK's gross figures only: the current-account deficit (about 3% of GDP) and foreign claims on the capital stock (37% against about 40%). On net it pays 4% of GDP abroad against the UK's 1.2–1.6%, and owes 123% of GDP against about 2%. So 0.5 is not a better description of the UK; it is the closure whose capital response is inside the AI literature's range.
  - A 2026-start run at ζK = 0.5, made before the R1–R4 fixes, gave GDP +9.9% and capital +18.4% for the Korinek shock: an elasticity of 5.4.
- Verdict: **a problem of range, not of error** (red flag 1). The two closures we publish span elasticities of 0.15 to 0.7. The published models span 1 to ∞.

### 4.5 Labour productivity

- **Main arm:** GDP per hour is +0.55% (UK low), +1.22% (UK central) and +3.34% (UK high) at ζK = 0.1, inside the UK range of 0.2% to 3.6%. The Korinek arm is +5.75% (+4.22% at ζK = 0): above, because it is a US scenario about eight times UK central's TFP.
- **Stress test: below the OBR's displacement scenario in all six solved cells.** With GDP flat, the OBR has employment about 1.5% lower and so output per worker about 1.5% higher. Ours is +0.12% to +0.98%.
  - Why: OG-UK has no unemployment. Hours fall only 0.1% to 1.0%, through labour supply. The adjustment falls on the wage (Section 4.6).

### 4.6 Wages: below Korinek et al.'s range in every UK main arm

- **Per point of share fall, the main-arm wage is −0.76 (UK low), −0.79 (UK central), −0.44 (UK high) and −0.15 (Korinek) at ζK = 0.1.** The published range is −0.33 to +1.87. Only the Korinek arm is inside. At ζK = 0 both solved arms are below (−1.07 and −0.52).
- **Two causes, both identified.**
  1. **The elasticity.** In the what-if table UK central's wage is −0.96% at ε = 1, −0.24% at ε = 3 and +0.12% at ε = 6, against −1.27% solved. This is Caselli and Manning's condition (B12): the wage can fall only if the return rises, and ours rises 38bp.
  2. **The mix.** UK central's wage is negative even at Korinek et al.'s default elasticity of 3, because it has 4pp of share fall per 1% of TFP against their 1.3pp. The per-point metric is harsh on a share-heavy scenario.
- **Against the IMF's UK models the wage is close.**
  - The IMF paper says wages rise "overall" and gives no number (A6). Its own output figure implies a wage change of +0.06% at year 4 with our 1.56pp share fall, and −1.19% with the straight-line 2.35pp (ours).
  - Its model family reports mean wages of +0.2%, +1.6% and −0.5% across steady states for capital-share rises of 5.5pp and 10.2pp: "average wages almost unchanged in all scenarios" (B18).
  - Our steady-state wage for UK central is −0.41% at ζK = 0.1 and −0.55% at ζK = 0. At ζK = 0.1 it is +0.61% for UK high and +2.32% for Korinek.
  - Moll, Rachel and Restrepo's automation example has mean wages 3% lower in 2020 and 1% lower in the long run (B21). A wage fall during the transition is a published result for this class of model.
- **The wage is not monotonic in the shock** (audit A2): −0.53%, −1.27%, −1.27%, −0.59% from low to Korinek. That follows from the mix: the share-heavy scenarios lose more per unit of shock.
- **Stress test and technology unchanged.** With GDP flat, labour income falls by the share fall divided by 0.65, which is 1.54% per point, by identity. The OBR's scenario puts the same loss on jobs with real earnings per worker unchanged (A1). The copy should not describe the stress test's wage fall as OBR-like.
- Verdict: **below, explained.** The sign of the UK central wage is not robust: it needs an elasticity of about 5 to turn positive.

### 4.7 Interest rate: at or above the top of the range

- **Per point of share fall the return rises 18–22bp in the two arms without TFP at ζK = 0.1 (inside 7–22bp), 24–28bp in the main arm (above), and 27–36bp at ζK = 0 (above).**
- In levels the Korinek main arm is +109bp at ζK = 0.1 and +142bp at ζK = 0. Korinek et al. have +50bp at ε = 3 and +110bp at ε = 1. So ζK = 0.1 sits at their least elastic case and ζK = 0 beyond it. That is the expected order.
- UK central is +38bp at ζK = 0.1 and +48bp at ζK = 0. Scaled from the IMF SDN's steady-state "almost 0.4 percentage point" for 5.5pp (B6), 1.6pp would give about 12bp. Our own steady state gives +25bp and +29bp, about twice the IMF's rate per point.
- **Split by cause, ours is about 21bp per point of share fall plus 9bp per 1% of TFP at ζK = 0.1** (the main arm less the technology-unchanged arm). Applied to Rachel's AI scenario (B19: TFP about +7.5%, share −1.1pp), that gives about 90bp against his "about 1 percentage point". His model has a third channel, markups, so this is a check of size only.
- No UK source gives a number. A Bank economist's summary, in his own name, is "it depends" (A19).
- Verdict: **above, explained by the same elasticity.** With less capital arriving, the return has to rise more to clear the market.

### 4.8 Tax and debt

**Tax/GDP: smaller than the OBR's response everywhere, and one wrong sign.**
- Per point of share fall: −0.15 to −0.16 in the stress test at ζK = 0.1, −0.13 to −0.14 with technology unchanged and −0.09 to −0.12 in the main arm, against the OBR's −0.19 to −0.23. At ζK = 0 it is −0.03 in the two arms without TFP, −0.004 in UK central's main arm and **+0.05 in the Korinek main arm**.
- The OBR's figure holds GDP and interest rates fixed, so the stress test is the like-for-like arm. It is 71–77% of the OBR's midpoint at ζK = 0.1 and 12–13% at ζK = 0 (audit Section 7).
- Causes, from the audit (A6) and `docs/red_flags_1_3.md`:
  - OG-UK's gap between labour and capital tax rates is about 14pp, against the OBR's 19–23pp.
  - At ζK = 0 the return rises 44–142bp on all household wealth, and the single income-tax schedule taxes that extra capital income.
- Verdict: **below in 17 cells, wrong sign in 1.** Red flag 3.

**Debt/GDP in 2031.**
- **Main arm: lower than baseline in five of six solved cells** (−0.07pp to −3.02pp), the same sign as the OBR's productivity scenarios and Penn Wharton. UK central at ζK = 0 is +0.33pp: above.
- **Stress test: below the OBR's displacement scenario.** Ours is +0.54pp per point of share fall at ζK = 0.1 and +0.46pp at ζK = 0, against the OBR's +1.86pp. UK low, the like-for-like size, has debt +0.38pp in 2031 against the OBR's +1.3% of GDP by 2030-31.
  - Why: no unemployment and so no welfare spending (the OBR has +£3bn a year), a smaller revenue fall, and spending held at a fixed share of GDP.

**Debt/GDP by 2036: higher in every arm, which no published productivity scenario shows.**
- The main arm ends at +0.84pp (UK low), +1.99pp (UK central), +2.07pp (UK high) and +1.12pp (Korinek) at ζK = 0.1.
- The OBR's nearest variant, higher productivity with spending a constant share of GDP, has "only a small difference in the debt trajectory", on the lower side, because it assumes "interest rates do not vary from the baseline" (A2, ¶5.20). Penn Wharton has deficits lower.
- **The whole rise is the interest rate.** The government's rate rises with the return on capital, and it applies to the entire debt stock from the first year. The table sets the 2036 debt gap beside the sum over 2028–35 of the rate gap times baseline debt/GDP (no compounding).

  | closure | scenario | arm | debt/GDP 2036, pp | of which higher interest rate, 2028–35, pp | government rate gap in 2031, bp |
  |---|---|---|---|---|---|
  | ζK 0.1 | UK low | automation + productivity | +0.84 | +1.03 | +17 |
  | ζK 0.1 | UK low | technology unchanged | +1.18 | +0.94 | +15 |
  | ζK 0.1 | UK low | stress test (GDP flat) | +1.47 | +0.86 | +14 |
  | ζK 0.1 | UK central | automation + productivity | +1.99 | +2.31 | +38 |
  | ζK 0.1 | UK central | technology unchanged | +2.67 | +2.13 | +34 |
  | ζK 0.1 | UK central | stress test (GDP flat) | +3.40 | +1.95 | +31 |
  | ζK 0.1 | UK high | automation + productivity | +2.07 | +4.55 | +75 |
  | ζK 0.1 | UK high | technology unchanged | +4.79 | +3.83 | +61 |
  | ζK 0.1 | UK high | stress test (GDP flat) | +6.24 | +3.45 | +54 |
  | ζK 0.1 | Korinek | automation + productivity | +1.12 | +6.51 | +109 |
  | ζK 0.1 | Korinek | technology unchanged | +6.38 | +5.11 | +82 |
  | ζK 0.1 | Korinek | stress test (GDP flat) | +8.45 | +4.56 | +71 |
  | ζK 0 | UK central | automation + productivity | +1.98 | +2.93 | +48 |
  | ζK 0 | UK central | technology unchanged | +2.67 | +2.71 | +44 |
  | ζK 0 | UK central | stress test (GDP flat) | +2.61 | +2.72 | +44 |
  | ζK 0 | Korinek | automation + productivity | +1.03 | +8.35 | +142 |
  | ζK 0 | Korinek | technology unchanged | +6.43 | +6.57 | +107 |
  | ζK 0 | Korinek | stress test (GDP flat) | +6.33 | +6.60 | +107 |

  - For UK central's main arm, repricing is +2.31pp of a +1.99pp gap. Without it, debt/GDP would be about 0.3pp below baseline, the OBR's sign.
  - UK gilts have a long average maturity, so only a fraction of the stock reprices in eight years. The model has one-period debt.
- The 2031 borrowing flow, the change in debt over the year as a share of GDP, is also higher in the main arm (+0.44pp for UK central at ζK = 0.1), where the OBR's productivity upside has borrowing £50bn lower (A4). The cause is the same.
- Verdict: **the 2031 sign is inside the range; the 2036 sign is not, and the cause is a modelling simplification.** Red flag 2.

### 4.9 Results with no row in the grid

- **Consumption falls in every UK main arm** (−0.16% to −0.39% at ζK = 0.1) while GDP rises. The one DSGE study that reports consumption has it rising "in the short and long run" (B20), for a pure productivity shock.
  - Ours agrees on the TFP part: the main arm's consumption is about 0.55pp per 1% of TFP above the technology-unchanged arm's, in all four scenarios.
  - The fall comes from the share shift: labour income is 1.6% lower for UK central, part of the extra capital income goes abroad, and investment and public spending take a larger share of output (audit A3).
- **GNI and NNI have no published comparator.** Only the IMF UK paper notes, in a footnote, that output "may overstate the domestic value added" when the investment is bought abroad (A6). Our GDP − GNI wedge is 0.35pp for UK central at ζK = 0.1.
- **Unemployment.** Korinek et al. have unemployment 0.1pp higher (modest) and 0.8pp higher (substantial); the OBR's scenario has 1.4pp. OG-UK has none. Hours fall 0.1% to 1.1%.

## 5. Red flags

The test was: a result outside every published range with no cause in the model. **No cell meets it.** Every "above", "below" and "wrong sign" verdict has a cause in Section 4 or in the audit (A1–A12). Three of those causes are problems for the published numbers all the same.

### 1. The capital closure is outside the published range, and it decides the headline

- **What.** The implied capital-supply elasticity is 0.57–0.68 at ζK = 0.1 and 0.15–0.17 at ζK = 0. Korinek et al.'s lowest case is 1 and their default is 3. The IMF's UK output figure implies 4.8, or 1.6 on a faster share path (ours).
- **What it moves.** Against the same shock, UK central's GDP is 37% of the IMF's at year 4 (+0.92% against +2.52%) and the Korinek arm's is 59% of Korinek et al.'s (+4.89% against +8.3%). The wage is below their range in every UK main arm, and the return is at or above the top of the range in every cell.
- **Why it is a flag and not an error.** The production side and the shock reproduce Korinek et al.'s headline once their default elasticity is imposed (Section 4.4). The low elasticity has support in the saving evidence that both Korinek et al. and Moll, Rachel and Restrepo cite. But we publish a central case and a lower bound, and no case inside the published range.
- **Fix.** Solve the main arm, the technology-unchanged arm and the stress test at **ζK = 0.5** for the four scenarios, as a sensitivity case. That is 12–16 arm solves plus a ζK = 0.5 baseline on the R1–R4 fixes and its no-shock restart: two to three hours.
  - **Status: already planned.** `68ef937` on `rerun/surprise-2028` (13 November) added ζK = 0.5 to the rerun as a published sensitivity, to run after the UK central debt-neutral set. No ζK = 0.5 solve is on disk yet. `lit_grid.py` adds the closure to every table once its continuation is committed.
  - This does not reopen the closure decision. `docs/closure_choice.md` adopted 0.1 and found that 0.5 matches the UK's gross external figures but misses the net ones by a wide margin. The case for solving it is narrower: it is the closure whose capital response falls inside the published range.
  - A 2026-start run at ζK = 0.5, made before the R1–R4 fixes, implies an elasticity of 5.4: close to Moll, Rachel and Restrepo's long-run value and to the IMF's implied 4.8, and inside Korinek et al.'s range.
- **Estimated effect** (the what-if table; arithmetic, not a solve):

  | Main arm, 2031 | Solved, ζK = 0.1 | ε = 1 | ε = 3 | ε = 6 |
  |---|---|---|---|---|
  | UK central GDP | +0.92% | +1.23% | +1.96% | +2.34% |
  | UK central wage | −1.27% | −0.96% | −0.24% | +0.12% |
  | UK low GDP | +0.41% | +0.56% | +0.87% | +1.03% |
  | UK high GDP | +2.74% | +3.38% | +4.93% | +5.74% |
  | Korinek GDP | +4.89% | +5.81% | +8.20% | +9.45% |

  - The ε = 1 column is rough: at ε = 1 the same arithmetic gives the wrong wage sign against Korinek et al.'s own table (Section 4.4). The ε = 3 column matches their table.
  - GNI would rise by less than GDP, because the extra capital is foreign-owned. The 2026-start run at ζK = 0.5 had GNI +7.7% against GDP +9.9%.
  - The return would rise less, so the debt and tax results would move towards the OBR's as well.
- **If there is no rerun:** say next to every headline that the central closure delivers about a third of the IMF's output effect for the same TFP, and that the published elasticities start at 1.

### 2. Debt/GDP rises by 2036 in the main arm, opposite to the OBR and Penn Wharton

- **What.** "Automation + productivity" has debt/GDP +0.84pp to +2.07pp by 2036 at ζK = 0.1 and +1.0pp to +2.0pp at ζK = 0. Published productivity scenarios have debt flat or lower.
- **Why.** The interest rate on the whole debt stock rises with the return on capital from the first year. That alone adds +1.0pp to +8.4pp by 2036 across the six solved main arms, more than the whole gap in each. The OBR's comparable variant holds interest rates at baseline.
- **Fix: no rerun.** Publish the split from `lit_grid.py` beside every debt number, and say that the model's debt is one-period while UK gilts are long-dated. With the interest effect removed, UK central's main arm has debt/GDP about 0.3pp lower than baseline in 2036, the OBR's sign.
- **A model change, not proposed for now:** phase the higher rate in over the maturity of the stock. It needs a change to OG-Core's `r_gov` rule.

### 3. Tax/GDP: the wrong sign in one cell, and half to three-quarters of the OBR's size elsewhere

- **What.** The Korinek main arm at ζK = 0 has tax/GDP +0.21pp with the labour share 3.9pp lower. UK central's main arm at ζK = 0 is −0.006pp, zero in practice. At ζK = 0.1 the response is 0.09–0.16pp per point against the OBR's 0.19–0.23pp.
- **Why.** A labour–capital tax gap of about 14pp against the OBR's 19–23pp, and a single income-tax schedule that taxes the extra capital income when the return rises (audit A6).
- **Status.** Known. Vahid decided on 12 November to keep and report it. The audit predicts a second wrong sign for UK high at ζK = 0 (+0.08pp), which is not solved.
- **Fix without a rerun:** a caveat wherever fiscal results at ζK = 0 appear. A ζK = 0.5 run would lower the rise in the return and so the size of this effect.

### Not red flags

- **GDP per 1% of TFP** is inside the published range at ζK = 0.1 in all four scenarios.
- **The shock** is inside the UK range for the three UK scenarios. The Korinek scenario is above it and is labelled as a US scenario.
- **The wage fall in UK central** is what the IMF's share-heavy mix gives when capital is scarce. It is close to the IMF model family's "almost unchanged" in the long run, and a transition wage fall is a published result (B21). Its sign is not robust and the copy should say so.
- **GDP against the same-shock studies** is below, and that is red flag 1, not a separate one.
- **Consumption falling while GDP rises** is the share shift, not the productivity gain (Section 4.9).
- **The stress test differs from the OBR's displacement scenario on jobs and wages** because OG-UK has no unemployment. It matches on GDP by construction.

## 6. Citations

Sections 6.1 and 6.2 were written on 12 November against the paper at `b2402d0` and are carried over unchanged. Section 6.3 is new.

### 6.1 Studies the paper should cite but does not

In order of importance for an NIER referee:

1. **IMF UK Selected Issues 2026 (A6).**
   - It is a UK-calibrated, quantified AI scenario with a capital-share shock: +10pp in the long run, TFP +0.53% and output +3.26% at year 5.
   - It is the closest UK comparator and contradicts the introduction's "two quantified AI scenarios now shape the UK debate".
   - Its footnote 9 makes our GDP-versus-domestic-value-added point qualitatively.
2. **OBR *Fiscal risks and sustainability*, July 2026, Box 4.1 (A2).**
   - The OBR's own AI labour-share and tax scenario: tax/GDP falls nearly 4pp when wages and salaries fall 20pp of GDP.
   - It gives effective tax rates of 46% and 27%.
   - It directly benchmarks the paper's public-finances section.
3. **IMF SDN 2024/001, Cazzaniga et al. (B6).** UK-calibrated, labour share −5.5pp, r about +0.4pp. A labour-share shock of our size, on UK data.
4. **OBR EFO October 2026 (A3).** The latest statement of the central AI assumption (0.2pp a year by the medium term). The paper's baseline discussion uses March 2026 and BP9 only.
5. **Caselli and Manning (2019, *AER: Insights*) (B12).** The theory for why our wage can fall: a rising interest rate.
6. **Benzell, Kotlikoff, LaGarda and Sachs (2015) "Robots are us" (B10)** and **Benzell, Kotlikoff, LaGarda and Ye (2021) (B11).**
   - These are the quantitative OLG automation papers. B11 is a multi-region OLG with UK output +10% by 2050.
   - The paper cites only the qualitative Sachs et al. (2015).
7. **Berg, Buffie and Zanna (2018, *JME*) (B8).** Short-run wage falls under automation with slow capital accumulation.
8. **Acemoglu's numbers (B3).** The paper cites Acemoglu (2025) only qualitatively. "No more than 0.66%" TFP over ten years is the standard low anchor and should be stated beside our 3.1%.
9. **OECD (Filippucci et al. 2025) (A9) and Aghion and Bunel (2024) (B4).** The productivity range the OBR itself cites (FRS 2026 ¶2.43, footnote 14).
10. **Korinek and Lockwood (2026) (B16).** Fiscal theory on labour-tax erosion; cited by the OBR.
11. **Bank of England MPR November 2026 (A8).** The only UK evidence on realised AI effects (0.1–0.2pp a year so far) and on firm expectations (0.9pp a year).
12. **Optional:** Cerutti et al. (2025) (B7) for open-economy DSGE context; PWBM (B2) for a US fiscal sign.

### 6.2 Citations or claims in the paper that are wrong or need changing

| Where | What the paper says | What the source says | Fix |
|---|---|---|---|
| Intro ¶1 | "Two quantified AI scenarios now shape the UK debate" — the OBR's and Korinek et al.'s. "Both specify the factor-share and technology shocks." | The OBR's Box 2.2 scenario is an *unemployment* scenario about "new technology", with AI named as one possible cause. It publishes **no labour-share or productivity number** (A1). The IMF UK SIP (A6) and the OBR FRS Box 4.1 (A2) are quantified UK AI scenarios, and the paper misses both. | Rewrite. The OBR scenario specifies GDP and unemployment, not the factor-share shock. Add A6 and A2. |
| Methodology ("The two scenarios") and Limitations | "The OBR publishes no labour-share figure for its scenario" | True for EFO Box 2.2. But the OBR *does* publish an AI labour-share scenario, in FRS 2026 Box 4.1 (wages and salaries from 40% to 20% of GDP, 2030-31 to 2075-76). | Qualify: "…for its March 2026 scenario; its July 2026 FRS sets out a long-run labour-share scenario." |
| Literature, "UK official benchmarks" | Receipts fall "because labour income faces a higher effective tax rate than capital income [Box 2.2 and ¶6.18]" | Box 2.2 says that. **¶6.18 attributes the £6bn to "lower personal tax and VAT revenues from lower employment and consumer spending, partly offset by higher corporation tax"**: mainly the unemployment channel, which the model lacks. | Cite the tax-richness reason to Box 2.2 only. Say that ¶6.18's figure is mostly employment and VAT, so it is not a like-for-like target. |
| Results, "The public finances" | £6bn is "roughly 0.2 per cent of GDP" | £6bn is 0.17% of 2030-31 nominal GDP (£3,632bn, EFO Table A.3, p.110) (ours) | "about 0.17 per cent of 2030-31 GDP". Minor. |
| Results, "The public finances", and `docs/results_sanity_audit.md` | Rule of thumb with 40% and 17% (November 2025 EFO ¶2.64; correct). The audit says that 46% and 27% are in no OBR document. | **46% on wages and salaries and 27% on profits are in OBR FRS 2026 Box 4.1 (p.87, footnote q).** They use other definitions: income tax plus NICs on wages and salaries; CT plus CGT on profits. | The audit statement is wrong. The paper can give both: −0.90pp (EFO rates) and −0.74pp (FRS rates). |
| Bibliography `obr2025wp22` | Corporate author only | Working paper No.22 is by **Brzezinski, Hantzsche and Watson**, April 2025 (title page) | Add the authors. |
| Bibliography `korinek2026` | No URL | WP 2026-02, PDF on `www-cdn.anthropic.com` (B1) | Add the URL. Table 3 and Table 5 values are confirmed. |
| Bibliography `acemoglu2025` | *Economic Policy* 40(121), 13–58 | Confirmed (RePEc metadata; the FRS 2026 cites the same volume and issue). The referee pass removed a different item, `acemoglu2026`. | Keep. Add the "no more than 0.66%" TFP figure beside our 3.1%. |
| Methodology | Labour share falls "from 60.0 to 56.1 cents" | Korinek et al.: "Labor share, pct. of income" (Table 5) | "per cent of income" (also referee minor 6). |
| `docs/OG_UK_OBR_COMPARISON.md` (repo, not paper) | Quotes "We expect GDP growth to pick up to average 1.6 per cent a year from 2027 to 2030" as ¶1.10 | The sentence is in **¶1.9** (p.7). ¶1.10 is about potential output. | Change to ¶1.9. |
| Brief to this task | "PWBM AI projections (an OLG model, the closest analogue)" | PWBM's AI brief uses Hulten task arithmetic with GDP = TFP, not its OLG model (B2) | Do not present PWBM as an OLG comparator. |

Checked and correct: Korinek et al. Table 3 and Table 5 values (B1); Jones and Tonetti, title and version (B14); Moll and Imas, essay of 9 Sept 2026, α from 1/3 to 1 by 2045, 20% saving rate (B15); Sachs et al. NBER 21091 (B9); March 2026 EFO paragraphs 1.2, 1.9, 2.10 and 6.18 and Box 2.2 as used in the appendix and results; November 2025 EFO ¶2.64 rates.

### 6.3 Added on 13 November

Further studies the paper should cite, in order of importance:

1. **Rockall, Tavares and Pizzinelli (2025), IMF WP/25/68 (B18).** The UK model behind both IMF UK studies. It gives the long-run numbers the Selected Issues paper lacks: output +10.6% to +20.7% and mean wages −0.5% to +1.6% for capital-share rises of 5.5pp and 10.2pp.
2. **Moll, Rachel and Restrepo (2022, *Econometrica*) (B21).** The source of the finite capital-supply elasticity in Korinek et al. and in the IMF model, and a published case of the mean wage falling under automation (−3% in 2020, −1% in the long run). It is the closest published support for our wage result.
3. **Rachel (2025, *BPEA*) (B19).** The only quantified estimate of AI's effect on the natural rate: about +1pp. Our return rises 38bp for a much smaller shock, and the split by cause agrees with his size (Section 4.7).
4. **OECD (2025), full paper (A9).** UK values by scenario (0.39, 0.97, 1.27pp a year) and the 1.5 multiplier from TFP to labour productivity, which is the simplest published benchmark for GDP per unit of TFP.
5. **Karabarbounis and Neiman (2014, *QJE*) (B22) and the ONS labour-share article (A18).** The pace of past labour-share changes, against which to state ours.

Two statements to correct in our own documents:

| Where | What it says | What the source says | Fix |
|---|---|---|---|
| `docs/uk_calibration.md` (and the 12 November version of this note, A5) | Briefing paper No.9 "was not re-read" | It is readable from the PDF downloaded for the #31 review. ¶B.9, ¶B.12 and ¶B.14 say what the calibration assumes (A5). | Drop the caveat and cite the paragraphs directly. |
| `docs/uk_calibration.md`, Section 1 | The IMF calibrates to a 10pp long-run capital-share rise, the UK's 1980–2014 change (A6, Annex III ¶4) | The working paper behind it sets the 1980–2014 change at **5.5pp** and gets 10.2pp only for AI in its extended model (B18, Tables 2 and 4). The IMF SDN (B6) also uses 5.5pp. | Say that the IMF's two papers differ. UK central's 1.6pp comes from the TFP path and the 27% cost saving, so it does not change. The straight-line cross-check of 2.35pp rests on the 10pp. |


## 7. What to run or change next

In order of value:

1. **The sensitivity case at ζK = 0.5** (red flag 1), which entered the solve plan overnight (`68ef937`). It is the only action here that needs solves. It would put one published closure inside the range of the literature and show how much of the wage and debt results is the closure.
   - Run all four scenarios, not UK central only, so that the Korinek arm can be set against Korinek et al.'s Table 5.
   - Then rerun `lit_grid.py` and compare the implied elasticity with the 5.4 of the old run.
2. **UK low and UK high at ζK = 0**, already in the solve plan. They fill the 48 "not solved" cells. The audit predicts a second wrong tax sign for UK high.
3. **No solve needed:**
   - quote GDP per 1% of TFP with its two parts (1.1 per 1% of TFP and about 0.3 per point of share fall at ζK = 0.1, as in the audit), not the single ratio of 2.3;
   - put the debt split (red flag 2) next to every debt number;
   - state the implied capital-supply elasticity next to each closure label;
   - correct the two statements in Section 6.3.

## Reproduce

```
python analysis/surprise/lit_grid.py          # every table in Section 4 and the counts
python analysis/surprise/lit_grid.py --json   # the same numbers as JSON
```

The script reads `analysis/surprise/output/` and `analysis/surprise/uk_targets.json` only. It imports nothing from the package and runs no model.
