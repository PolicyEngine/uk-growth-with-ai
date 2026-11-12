# Published AI macro estimates against OG-UK's results

For #24 (paper) and #27 (tracker). Written 12 November 2026. **No OG solve was run.** Our numbers are from `main` at `959888e` and from the paper at `b2402d0`.

## 1. How this was checked

- **Every number in Section 2 was grepped from the primary text.** I downloaded each PDF or HTML page, extracted the text (PyMuPDF; there is no pdftotext on the machine) and searched for the figure.
  - "p." is the printed page, unless it says PDF page.
  - "¶" is a numbered paragraph.
- **Where only a mirror copy could be read, the row says so.** That applies to the IPPR report, the IMF SDN, the Berg–Buffie–Zanna draft and the Goldman Sachs note.
- **UNVERIFIED** marks anything I could not read in a primary source.
- **"(ours)" marks my own arithmetic**: conversions from annual to cumulative, from £ to % of GDP, and implied elasticities.
- **Two access failures:**
  - The OBR's own download gate refused automated access to Briefing paper No.9. Its figures are carried from the #31 review, which read the PDF, and the OBR FRS 2026 restates them.
  - cbo.gov and the Tony Blair Institute site refused access.

Section 2 is the table: one row per study, UK first (A), model-based second (B). Section 3 compares our results with them. Section 4 lists citation problems. Section 5 lists the red flags. Section 6 lists what the 2028-surprise rerun should recheck.

## 2. The studies

### A. UK official and UK-specific estimates

| # | Study | Year | Country | Model type | AI shock | Horizon / baseline | Headline numbers (each with its location) |
|---|---|---|---|---|---|---|---|
| A1 | OBR, *Economic and fiscal outlook, March 2026*, ['technological displacement' scenario](https://assets.publishing.service.gov.uk/media/69a6d7b62e1f4fbda4252208/economic-and-fiscal-outlook-march-2026-web-accessible.pdf) | 2026 | UK | Judgement-based forecast scenario (OBR macro model and fiscal model) | "New technology displaces workers and is a substitute for labour". The equilibrium unemployment rate rises to 5.5%, and productivity rises enough to leave GDP unchanged. AI is named as one possible cause of a structural rise in unemployment, not as the scenario's definition (Box 2.2, p.30). | To 2030-31, against the central forecast (which already includes AI) | **GDP level unchanged** (Box 2.2, p.30–31; ¶6.18 says "GDP growth is unchanged"). Productivity is "not reflected in higher real earnings", giving a lower labour share and a higher profit share (Box 2.2). **No labour-share figure is published.** ¶6.18 (p.100–101): borrowing **+£9bn a year** on average; receipts **−£6bn a year**, "due to lower personal tax and VAT revenues from lower employment and consumer spending, partly offset by higher corporation tax"; welfare spending **+£3bn a year**; underlying debt **+1.3% of GDP by 2030-31**. Our arithmetic: £6bn is 0.17% of 2030-31 nominal GDP (£3,632bn, Table A.3, p.110). |
| A2 | OBR, *Fiscal risks and sustainability, July 2026*, [Box 4.1, "The potential impact of AI on the labour share and tax receipts"](https://assets.publishing.service.gov.uk/media/6a4cb4c74889d85e75ab40e0/E03599617_OBR_FRS_2026_Accessible.pdf) | 2026 | UK | Long-term fiscal projection with an illustrative composition shift (GDP held fixed) | "Reduced labour share" scenario: wages and salaries fall from 40% of GDP in 2030-31 to 20% in 2075-76. The OBR calls this "at the upper end" of the literature (p.87) | 2030-31 to 2075-76, against the FRS baseline | **Tax falls to under 35% of GDP, "nearly 4 percentage points lower than in the baseline"** with total GDP unchanged (p.87). Effective tax rates are **46% on wages and salaries** (income tax and NICs) and **27% on profits** (corporation tax and CGT) (p.87, footnote q, p.88). Productivity: BP9's central AI boost is **0.2pp a year over the next decade**, with alternatives "less than 0.1" to "up to 0.8 percentage points" (Box 4.1, p.86). About 10% of the UK labour force is exposed to substitution and 30% to complementarity over 10 years (p.86, citing BP9 Annex B). |
| A3 | OBR, *Economic and fiscal outlook, October 2026* ([PDF](https://obr.uk/download/economic-and-fiscal-outlook-october-2026/)) | 2026 | UK | Forecast | Central AI assumption | Medium term | "Our central forecast is for it to boost productivity growth by **0.2 percentage points a year by the medium term**" (¶1.27, p.21; repeated in ¶7.29, p.170). The share of businesses using AI was 30% in September 2026, up from 15% two years earlier (¶2.45, p.43). There is no AI labour-share or displacement scenario. |
| A4 | OBR, *Economic and fiscal outlook, November 2025*, Box 2.1 (local copy of the published PDF) | 2025 | UK | Forecast | Central AI assumption plus a productivity-upside scenario | Five-year horizon | The AI effect builds "to reach an estimated **0.2 percentage points by our five-year forecast horizon**" (Box 2.1, p.30). In the upside scenario "there is a larger boost from AI", and potential productivity growth is 1.5% (Box 2.1). March 2026 EFO ¶1.21 (p.13): at 1.5% productivity growth, "for example, due to a more optimistic scenario for the impact of AI, borrowing could be **£50 billion lower in 2030-31**". Effective tax rates: about **40% on labour income** and about **17% on profits** (¶2.64, p.50–51). |
| A5 | OBR, *Briefing paper No.9: Forecasting productivity*, Annex B | 2025 | UK | Task-exposure and diffusion estimates | AI TFP boost with J-curve and S-curve paths | 10 years | **Not re-fetched:** the OBR download gate refused automated access. The figures come from the #31 review, which read the PDF on 12 Nov 2026: a level effect of 2.3% over the decade (¶B.9), 0.2pp a year at the horizon (¶B.14), J-curve reaching 0.1pp and S-curve reaching 0.25pp a year by year five (¶B.12), and no 2030 level. The FRS 2026 summary (A2) agrees on 0.2pp, with alternatives from <0.1 to 0.8pp. |
| A6 | IMF, Bellon, Deb, Gandhi and Rockall, ["Unlocking AI-led productivity growth in the United Kingdom"](https://www.imf.org/-/media/files/publications/selected-issues-papers/2026/english/sipea2026072.pdf), Selected Issues Paper SIP/2026/072 (Country Report 26/173) | 2026 | UK | Endogenous task-adoption model with 100 sectors (Rockall et al. 2025). Capital deepens endogenously. | Calibrated so that AI raises the **aggregate capital share by about 10pp in the long run**, reached in 17 years, with cost savings of 27% per automated task (¶44, p.24; Annex III ¶4–5, p.37–38) | Years 5 and 10 from adoption, against no AI | **TFP +0.53% at year 5 and +1.40% at year 10; output +3.26% at year 5 and +7.96% at year 10** (Table 1, p.29). Regulatory reform adds +0.22pp TFP and +1.24pp output at year 5; skills adds +0.15pp and +0.83pp (Table 1). Output exceeds TFP because of capital deepening (¶46, p.25). Footnote 9 (p.24): where the investment is bought from foreign providers, "the output gains may overstate the domestic value added". Wages: "higher output will lead to higher wages overall, many workers may see lower wages due to displacement" (¶53, p.28; no number). |
| A7 | IMF, *United Kingdom: 2026 Article IV staff report*, [Country Report 26/172](https://www.imf.org/-/media/files/publications/cr/2026/english/1gbrea2026001.pdf) | 2026 | UK | Forecast plus risk matrix | Central assumption, and an "AI acceleration" risk | Medium term; 10 years | The productivity trend includes "a small boost from AI investment and diffusion (**0.2pp in line with the OBR**)" (¶12, p.9). Risk assessment matrix: "Aggregate TFP could increase by **1 to 5 percentage points over 10 years**" (Risk Assessment Matrix, p.47). |
| A8 | Bank of England, [*Monetary Policy Report, November 2026*](https://www.bankofengland.co.uk/-/media/boe/files/monetary-policy-report/2026/november/monetary-policy-report-november-2026.pdf), Boxes C and D | 2026 | UK | Data and Decision Maker Panel survey, not a model scenario | Observed and expected effects | Last three and next three years | Firms estimate AI raised productivity "by around 0.5% over the past three years ... about **0.1–0.2 percentage points to annual productivity growth** since early 2024" (Box D, PDF p.59). Firms expect AI to add "**about 0.9 percentage points per year** on average over the next three years", split about equally between slower employment growth and faster output growth (Box D). AI's effect on employment is "close to zero" so far. AI-related activity is "just under a fifth of GDP growth since the start of 2026" (Box C, PDF p.50). |
| A9 | OECD, Filippucci, Gal, Laengle and Schief, "Macroeconomic productivity gains from AI in G7 economies", OECD AI Papers No.41 (2025); [SUERF Policy Brief 1283](https://www.suerf.org/wp-content/uploads/2025/10/SUERF-Policy-Brief-1283_Filippucci-Gal-Laengle-Schief.pdf) | 2025 | G7 incl. UK | Sectoral exposure × adoption (Hulten-type aggregation) | Three adoption scenarios | 10 years, annualised | UK and US: "**0.4–1.3 percentage points**" a year of labour-productivity growth. Across the G7 the range is 0.2–0.4pp (slow), 0.5–1pp (medium) and 0.8–1.3pp (rapid) (SUERF brief p.3–4). The full OECD paper was not fetched; numbers are from the authors' brief. |
| A10 | IPPR, Jung and Srinivasa Desikan, *Transformed by AI* ([IPPR page](https://www.ippr.org/articles/transformed-by-ai); PDF read from a mirror copy) | 2024 | UK | Task-exposure accounting, not general equilibrium | Exposed tasks done 50% faster, augmented or displaced | Unstated ("integrated" AI: second wave) | Table 4.1 (p.25), integrated AI: **augmentation only +13.4% of GDP (£305bn)**; **central +6.3% (£144bn) with 4.4m jobs displaced**; **displacement only: £0 GDP gain, −7.9m jobs**. "Here and now" AI: +4% / +3.1% / £0. The summary (p.7) gives the central case as "about 6.4 per cent", inconsistent with Table 4.1. |
| A11 | Public First for Google, [*Google's impact in the UK 2023*](https://googlesukimpact2023.publicfirst.co.uk/) | 2023 | UK | Not stated on the page | AI-powered innovation | By 2030 | "**Over £400 billion in value** for the UK economy by 2030, the equivalent to an annual growth rate of 2.6%" (web report). It is not stated as a GDP level gap, and the method is not on the page. The government's *AI Opportunities Action Plan* (DSIT, 13 Jan 2025, §2.4, footnote 19) repeats the £400bn and cites this report. |
| A12 | PwC, [*The economic impact of artificial intelligence on the UK economy*](https://www.pwc.co.uk/economic-services/assets/ai-uk-report-v2.pdf) | 2017 | UK | Spatial CGE | Productivity plus consumption-side "product enhancements" | 2017–2030 | "UK GDP will be **up to 10.3% higher in 2030**", of which productivity 1.9% and product enhancement and demand 8.4% (p.4). |
| A13 | PwC for GO-Science, ["The wider economic impacts of emerging technologies in the UK"](https://www.gov.uk/government/publications/the-wider-economic-impacts-of-emerging-technologies-in-the-uk/the-wider-economic-impacts-of-emerging-technologies-in-the-uk-html) | 2025 | UK | CGE driven by investment in technology capital | Planned adoption investment in 15 technologies | To 2035 | "AI / ML technologies alone is projected to contribute to a **2.98% overall increase in the UK's real GDP by the year 2035**, which is equivalent to £79.3 billion" (main text, Section 5). |
| A14 | Goldman Sachs, Briggs and Kodnani, "The potentially large effects of artificial intelligence on economic growth", Global Economics Analyst, 26 March 2023 | 2023 | US, global | Exposure × productivity | Generative AI adoption | 10 years from about 50% adoption | US: "around **1.5pp/year**" labour-productivity growth (p.14). Global: GDP "**7%**" higher over ten years (p.15–16). **UK figure UNVERIFIED:** it appears only in the Exhibit 14 chart, which the text extraction cannot read. The text was read from a redistributed copy, which is not linked. |
| A15 | Tony Blair Institute, Sharps et al., *The impact of AI on the labour market* | 2024 | UK | — | — | — | **UNVERIFIED.** The site refused automated access (HTTP 429). Press coverage reports GDP +5 to 14% by 2050 and 1–3 million jobs displaced. Not used. |
| A16 | Resolution Foundation (newsletter on Thwaites et al. firm survey) | 2026 | Multi-country | Executive survey | Firm expectations | Next three years | Firms expect "productivity by around **1.4 per cent** while slightly reducing employment – by about **0.7 per cent**" ([RF](https://www.resolutionfoundation.org/comment/jobs-pocalypse-or-productivi-splosion-the-ai-data-is-in/)). There is no RF macro or fiscal model estimate. |
| — | NIESR, IFS, HMT | — | — | — | — | — | **No quantified AI macro or fiscal estimate found** (search, 12 Nov 2026). This is not proof that none exists. |

### B. Model-based studies (GE, OLG, DSGE, growth and task models)

| # | Study | Year | Country | Model type | AI shock | Horizon / baseline | Headline numbers (each with its location) |
|---|---|---|---|---|---|---|---|
| B1 | Korinek, Jones, Sacher, Cotter and McCrory, ["Economic scenarios for transformative AI"](https://www-cdn.anthropic.com/files/4zrzovbb/website/cf58f84d46a4a76bf5a5b039ac695fba6b80041c.pdf), Anthropic Institute WP 2026-02 | 2026 | US | Task-based GE with adoption, reinstatement and a search-and-matching block. Capital supply Δln K = ε Δln r, with ε = 3 by default (p.9 and p.26) | "Substantial" scenario: our source for both inputs | 2030, against the no-AI path | **Table 3 (p.31), substantial:** GDP **+8.3%**; TFP +3.1%; capital **+13.8%**; labour share **60.0 → 56.1** (per cent of income); labour income **+1.4%**; average wage **+2.1%** (cognitive −0.3%, others +5.9%); net return r−δ **6.5 → 7.0%**; unemployment, all workers, 3.8 → **4.6%** (cognitive 2.9 → 4.5). **Table 5 (p.37), by ε = 1 / 3 / 6 / ∞:** GDP 6.4 / 8.3 / 9.1 / 10.0; wage **−1.6 / +2.1 / +3.7 / +5.6**; net return 7.6 / 7.0 / 6.8 / 6.5; capital 9.3 / 13.8 / 15.7 / 18.2; labour share 55.1 / 56.1 / 56.5 / 57.0. No fiscal block: research is funded by lump-sum taxes. |
| B2 | Penn Wharton Budget Model (Arnon), ["The projected impact of generative AI on future productivity growth"](https://budgetmodel.wharton.upenn.edu/p/2025-09-08-the-projected-impact-of-generative-ai-on-future-productivity-growth/) | 2025 | US | **Hulten/Acemoglu task arithmetic, not PWBM's OLG model.** GDP equals TFP, with no capital deepening. | 40% of labour income exposed; 25% cost saving; adoption path | 2025–2075, against no AI | TFP and GDP **+1.5% by 2035**, nearly 3% by 2055 and 3.7% by 2075. The peak growth contribution is 0.2pp in 2032. Fiscal: "AI could reduce deficits by **$400 billion** over the ten-year budget window between 2026 and 2035" ("very preliminary"). No wage, labour-share or rate results. |
| B3 | Acemoglu, ["The simple macroeconomics of AI"](https://www.nber.org/system/files/working_papers/w32487/w32487.pdf), *Economic Policy* 40(121), 13–58, 2025 (numbers from NBER w32487) | 2024/25 | US | Hulten aggregation with task propagation. Capital adjusts at an unchanged required return. | 4.6% of tasks × 14.4% cost saving | 10 years | TFP "**no more than 0.66%**" in total (p.4 printed); GDP **+0.93–1.16%**, up to 1.4–1.56% with investment (p.4). Capital share up about **0.31pp** (p.40). Average wage about +1.0% and +0.8% (Table 1, p.41; columns read from the order of the cells). |
| B4 | Aghion and Bunel, ["AI and growth: where do we stand?"](https://www.frbsf.org/wp-content/uploads/AI-and-Growth-Aghion-Bunel.pdf) | 2024 | US, France | Historical analogy plus Acemoglu's formula with other inputs | — | 10 years | Productivity growth **+0.8 to 1.3pp a year** (analogy). Median **+0.68pp a year of TFP**, range 0.07–1.24 (p.1, p.11). |
| B5 | Baily, Brynjolfsson and Korinek, ["Machines of mind"](https://www.brookings.edu/articles/machines-of-mind-the-case-for-an-ai-powered-productivity-boom/), Brookings | 2023 | US | Illustrative arithmetic | Cognitive workers 30% more productive | 10–20 years | Output **+18%** (level), or 5% after a decade on a small growth path. Micro: Brynjolfsson, Li and Raymond (NBER w31161), +14% issues resolved per hour. |
| B6 | Cazzaniga et al., "Gen-AI: Artificial intelligence and the future of work", **IMF SDN/2024/001** (text read from a mirror) | 2024 | **UK-calibrated** | Heterogeneous-agent task model (Rockall, Pizzinelli and Tavares) | **Labour share −5.5pp** (UK 1980–2014 change); productivity +1.5pp a year over the first 10 years in one scenario | Steady state to steady state | Output **almost +10%** (low complementarity) to **+16%** with TFP almost +4% (high productivity) (p.18–19 printed). Interest rates "increase by **almost 0.4 percentage point**" in all scenarios (p.17). Low-income workers' income −2%, top +8% (p.18). Aggregate wage only in a figure (UNVERIFIED). Openness not stated. |
| B7 | Cerutti et al., ["The global impact of AI: mind the gap"](https://www.imf.org/-/media/files/publications/wp/2025/english/wpiea2025076-print-pdf.pdf), IMF WP/25/76 | 2025 | Global; UK within "other AEs" | Multi-region GIMF DSGE | TFP path calibrated to UK estimates of **+1.3 to 3.4% TFP over 10 years** (p.15) | 10 years | Other advanced economies, GDP **+4.7% (high) / +1.6% (low)** after 10 years (p.16 printed). World GDP about +4% / +1.3%. US is +5.4 / +1.8 on p.16 and +5.6 / +1.9 on p.6, inconsistent within the paper. Monetary and fiscal policy endogenous, no fiscal numbers. |
| B8 | Berg, Buffie and Zanna, "Should we fear the robot revolution? (The correct answer is yes)", *JME* 97 (2018) 117–148; IMF WP 18/116 (text: Dec 2017 conference draft) | 2018 | Generic | Ramsey growth model with robot capital. Long-run r = ρ + δ (closed) | Robot productivity rise | Short run to generations | Real wages "fall in the short run and eventually rise, but 'eventually' can easily take generations" (abstract). Per capita income **+30 to 240%** in the long run, and the low-wage phase lasts **20–50+ years** (p.6). Labour share falls to 44% (scenario 1, p.13). JME numbers UNVERIFIED against the draft. |
| B9 | Sachs, Benzell and LaGarda, "Robots: curse or blessing? A basic framework", NBER w21091 | 2015 | Generic | Two-period OLG theory | Robot productivity | Generations | Qualitative: a rise in robot productivity is more likely to lower the welfare of the young and future generations when saving is low; intergenerational transfers can make every generation gain (abstract). |
| B10 | Benzell, Kotlikoff, LaGarda and Sachs, "Robots are us: some economics of human replacement", NBER w20941 | 2015 (rev. 2018) | Generic | Two-period OLG (a period is a generation) | Machines replace high-tech workers | Long run | Low saving (0.2): national income **+7.8% then −4.2%** long run; all workers earn **24.8% less**; labour share 75.0 → 57.5%; interest rate +110% (relative) (p.13–14). High saving (0.85): income +16.8% long run; wage −2.2% (p.14–15). The OBR FRS 2026 cites this as a benchmark for its labour-share scenario (A2). |
| B11 | Benzell, Kotlikoff, LaGarda and Ye, ["Simulating endogenous global automation"](https://www.nber.org/system/files/working_papers/w29220/w29220.pdf), NBER w29220 | 2021 | 17 regions incl. UK | **Multi-region OLG CGE**, capital mobile across regions | Endogenous automation | To 2050, against no automation | **UK output +10.0% in 2050** (Western Europe +12.9, Japan +12.7, Canada +12.1, US +5.1) (p.3). US labour share 65.9 → 63.1%; high-skill wage +28.8%, low-skill −22.8%. Global r falls less with automation (3.2% against 2.8% in 2050) (p.3). |
| B12 | Caselli and Manning, "Robot arithmetic: new technology and wages", *AER: Insights* 1(1), 1–12, 2019 (text: CEP DP 1497) | 2019 | Generic | Steady-state theory | Any new technology | Long run | Average wages rise if investment goods get cheaper and competition does not fall, **assuming a constant interest rate**. "If new technology causes the interest rate to rise then this causes … possible falls in real wages" (p.8). This is the theory that explains our wage result. |
| B13 | Korinek and Suh, ["Scenarios for the transition to AGI"](https://www.nber.org/system/files/working_papers/w32255/w32255.pdf), NBER w32255 | 2024 | Generic | Task-complexity automation with capital | Business as usual vs. AGI in 5 or 20 years | Decades | Business as usual: output and wages rise forever. AGI: wages "collapse" as full automation approaches, after about 3 years in the aggressive case (p.5 and p.25). |
| B14 | Jones and Tonetti, ["Past automation and future A.I."](https://web.stanford.edu/~chadj/JonesTonetti_Automation.pdf), v0.5 | 2026 | US | Automation growth model, task elasticity about 0.2 | Continuation vs "Moore's Law everywhere" | To 2075 | Continuation: growth only **2.6% by 2075**; incomes only 4% higher in 2050 (p.4 and p.41). Extreme: growth over 7% by 2030 and 13% by 2040 (p.41). |
| B15 | Moll and Imas, ["Will AI soon lead to double-digit growth?"](https://aleximas.substack.com/p/will-ai-soon-lead-to-double-digit) (essay) | 2026 | US | Solow, Cobb-Douglas, capital share = automated task share | α from 1/3 to 1 over 2025–2045; saving rate 20% | To 2045 | Growth reaches about 12.5% by 2035 and GDP is about 8× by 2045 in the textbook model. The wage "temporarily declines" and the labour share goes to zero. They argue 4–5% growth is a more reasonable baseline for the next 10–15 years. |
| B16 | Korinek and Lockwood, ["Public finance in the age of AI: a primer"](https://www.brookings.edu/wp-content/uploads/2026/01/Korinek-Lockwood-FINAL-for-website.pdf), Brookings | 2025/26 | Generic | Optimal-tax theory | Rising capital share α | Long run | Qualitative: the maximum revenue from labour taxes as a share of output falls as α rises (§ "The labor tax Laffer curve", p.13–15). No calibrated numbers. Cited by the OBR FRS 2026. |
| B17 | CBO, "Artificial intelligence and its potential effects on the economy and the federal budget", pub. 60774 (read from Wayback) | 2024 | US | Qualitative | — | — | No quantified effects. "Because different categories of income are taxed at different rates … changes to the distribution of income among categories could offset that increase" (p.7). The 2026 *Budget and Economic Outlook* reportedly assumes a 0.1pp AI productivity boost over 2026–36: **UNVERIFIED** (cbo.gov refused access; secondary source only). |
| — | OG-Core / OG-USA / OG-UK applied to AI | — | — | — | — | — | **None found.** The OBR's own UK OLG (WP 22) is used in the FRS 2026 for ageing and debt, not AI. |

## 3. Our results against the published range

### What we compare

Our numbers are 2030 gaps against each closure's own baseline, read from `uk_growth_with_ai/data/scenarios.json` (central, ζK = 0.1) and `scenarios_zk0.json` (closed-capital bound, ζK = 0) on `main` at `959888e`. I recomputed GDP, capital, wage and r from the JSON; the rest are the paper's macros at `b2402d0`.

| 2030 gap | `share_shift_tfp`, central | `share_shift_tfp`, bound | `share_shift`, central | `share_shift`, bound |
|---|---|---|---|---|
| GDP | +4.90% | +3.10% | 0.00% (by construction) | 0.00% |
| GNI | +3.82% | +2.94% | −0.76% | −0.15% |
| Capital | +6.10% | +2.00% | +4.65% | +1.92% |
| Real wage | −0.57% | −1.95% | −5.31% | −5.04% |
| Return on capital | +108bp | +140bp | +68bp | +103bp |
| Tax/GDP | −0.35pp | +0.20pp | −0.63pp | −0.11pp |
| Debt/GDP (G/Y fixed) | −3.08pp | −1.64pp | +2.29pp | +1.91pp |

The inputs are the same in both arms: the labour share falls 3.9pp, from 65.0% to 61.1%, linearly over 2026–2030 (four years). `share_shift_tfp` adds 3.1% measured TFP at baseline inputs. Households have perfect foresight, and there is no unemployment.

**The 2028-surprise rerun.** A rerun that makes AI a 2028 surprise, with headline year 2031, is under way. It removes the anticipation effects and changes the ramp, so the exact 2030 numbers above will change. The comparisons below are about mechanism and magnitude. They should survive the rerun unless its capital response differs a lot. Section 6 lists what to recheck.

**Units.** Most published figures are either level gaps at a horizon or annual growth-rate boosts. Every conversion below (annual to cumulative, £ to % of GDP) is my own arithmetic and is labelled "(ours)". Our baseline already contains the OBR's 0.2pp-a-year AI assumption, so every gap here is on top of it. Most other studies measure against a no-AI path.

### 3.1 Inputs: is the shock itself in the published range?

**TFP: +3.1% in four years.**

| Source | What it implies, converted to our terms (ours) | Where our input sits |
|---|---|---|
| OBR central (A3–A5) | About 0.3–0.75% on the level over five years (the audit's arithmetic) | 4–10× larger |
| IMF UK baseline (A6) | +0.53% at year 5, +1.40% at year 10 | 6× its year-5 figure, 2× its year-10 figure |
| IMF Article IV risk matrix (A7) | 1–5pp over 10 years | Upper half: our rate (0.78%/yr) would give about 7.8% in 10 years if sustained (ours) |
| OECD UK range (A9) | 0.4–1.3pp/yr of labour productivity, which includes capital deepening | |
| BoE DMP firm expectations (A8) | 0.9pp/yr of labour productivity for the next three years | |
| Acemoglu (B3) | Below 0.7% TFP over ten years | Far above |

- **Verdict: above the UK official range, at the upper end of the IMF and OECD ranges.** It equals Korinek et al.'s "substantial" US scenario (B1) by construction.
- Our 2030 labour productivity (Y/L) is +5.77%, or about 1.4%/yr over four years (ours). That is just above the OECD's 1.3pp/yr rapid-adoption ceiling for the UK and above the BoE survey's 0.9pp/yr.

**Labour share: −3.9pp in four years, about 1pp a year.** Every published UK labour-share path is slower:
- The IMF UK model (A6) raises the capital share about 10pp over 17 years, or about 0.6pp a year (ours).
- The OBR's illustrative scenario (A2), which it calls "at the upper end" of the literature, takes wages and salaries from 40% to 20% of GDP over 45 years, or about 0.44pp a year (ours).
- **The OBR's March 2026 displacement scenario (A1) publishes no labour-share number.** Holding real earnings per worker at the central path while employment falls by the 1.4pp rise in equilibrium unemployment gives a fall in labour compensation of about 1.5%. With the labour-income share at 47% of GDP (Nov 2025 EFO ¶2.64), that is about **0.7pp of GDP** (ours, not an OBR figure).
- **So `share_shift` is a composition shock about five times the size implied by the scenario it is compared with.** The OBR's ¶6.18 receipts figure (about 0.17% of GDP) is consistent with that smaller shift. Our `share_shift` tax/GDP fall of −0.63pp is about 3.7 times it.
- **Verdict: our labour-share input is above every UK source.** It equals Korinek et al.'s US number in points. As a proportion it is slightly smaller (6.0% of the share against 6.5%), because our base share is 65% against their 60%.

### 3.2 GDP

- **Level.** `share_shift_tfp` GDP +4.90% (central) and +3.10% (bound) at a four-year horizon. That is:
  - inside the spread of UK level estimates for about 2030: IPPR central +3.1% to +6.3% (A10), PwC 2017 productivity-only +1.9% and total +10.3% (A12), the IMF year-5 output figure +3.26% (A6), and GO-Science +2.98% for AI by 2035 (A13);
  - well below Korinek et al.'s +8.3% (B1).
- **Response per unit of TFP is low.** GDP/TFP is 1.58 at the central closure and 1.00 at the bound (ours). Other studies:
  - Korinek et al.: 8.3/3.1 = 2.7 (ours, from B1).
  - IMF UK: 3.26/0.53 = 6.2 at year 5 and 7.96/1.40 = 5.7 at year 10 (ours, from A6).
  - Our own r-pinned upper bound in `docs/results_sanity_audit.md`: 12.38/3.07 = 4.0.
- **Verdict: below every model-based study on the capital response, and below Korinek et al.'s least elastic case.**
  - Our 2030 capital response implies a capital-supply elasticity, Δln K / Δln r, of about **0.32** at the central closure and **0.09** at the bound (ours; r is OG-Core's return, against Korinek et al.'s net return r − δ).
  - Korinek et al. consider ε = 1, 3, 6 and ∞, and their *lowest* case still has capital +9.3% and GDP +6.4% (Table 5).
  - So our central closure is less elastic than anything in their table, and GDP +4.90% is below their whole range. The reason is capital supply.
  - At ζK = 0.1, capital rises 6.1% by 2030 against Korinek et al.'s 13.8% (elasticity of capital supply 3). The paper's own counterfactual ("Against the published scenarios") shows that capital supply accounts for almost all of the GDP gap to Korinek.
  - The IMF UK model and the r-pinned bound let capital adjust to the higher return; OG-UK at ζK ≤ 0.1 does so only partially within four years.
  - At the bound, extra national saving finances 91% of extra investment, which is a Feldstein–Horioka-like world. That suits a short horizon but is a lower bound on GDP.
- **`share_shift` (GDP held at 0) matches the OBR displacement scenario (A1) and the IPPR "displacement only" case (A10).** Both have GDP unchanged. Ours is an assumption solved for, not a result, so there is no inside or outside verdict.
- **GNI is new.** Only the IMF UK paper (A6, footnote 9) notes that output gains may overstate domestic value added when the investment is bought from abroad; it gives no number. No published UK AI estimate reports GNI. Our GDP − GNI wedge of 1.08pp (`share_shift_tfp`, central) is the paper's contribution and has no comparator.

### 3.3 Wages and the labour share

- **`share_shift_tfp` wage −0.57% (central), −1.95% (bound).**
  - Korinek et al. Table 5 (B1) has the average wage at −1.6% with a capital-supply elasticity of 1, and +2.1%, +3.7% and +5.6% at 3, 6 and infinity.
  - Our two closures sit between their elasticities of 1 and 3: closer to 1 at the bound and between the two at the central closure. **That is consistent with their mapping, given our smaller capital response.**
  - The IMF UK paper (A6) says wages rise "overall" but gives no number.
  - **Why our wage is not below their ε = 1 value although our capital response is smaller:**
    - their labour share is endogenous and falls further at low ε (to 55.1 at ε = 1);
    - ours is fixed at 61.1;
    - our hours fall 0.83%, which raises output per hour.
  - Caselli and Manning (B12) give the condition: with a constant interest rate, new technology cannot lower the average wage, but if it raises the interest rate, wages can fall. Our return rises 108–140bp, so a small wage fall is the textbook outcome.
  - Berg–Buffie–Zanna (B8) and Benzell et al. (B10) get short-run wage falls with limited capital supply or low saving. Berg et al. say the eventual rise can take generations. Our central-closure wage turns positive in 2034, which is fast by their standard.
- **Verdict: inside the range implied by the capital-supply elasticity.** The sign is fragile, as the paper already says.
- **`share_shift` wage −5.31% (central), −5.04% (bound).** With no productivity gain and GDP fixed, the wage must fall by about the share fall (−6.0%) less the small rise in output per worker (+0.74%).
  - The OBR displacement scenario (A1) gets its labour-share fall through **employment**, not the wage: real earnings per worker are "not reflected in higher" productivity, which means unchanged against the central path rather than 5% lower.
  - **Verdict: the wage fall is mechanically right for the shock, but it is a different adjustment channel from the OBR's.** With no unemployment block, OG-UK puts the whole composition shift on the price of labour. The OBR puts it on the quantity. The paper should not describe `share_shift` as OBR-like on wages.

### 3.4 Interest rate and capital flows

- **The real return rises 68–140bp.**
  - Korinek et al. (B1): +50bp at ε = 3 and +110bp at ε = 1 (Table 5).
  - IMF SDN, UK-calibrated (B6): "almost 0.4 percentage point" across steady states.
  - So our rise is at the top of the range, consistent with our low implied elasticity.
  - Closed-economy OLG automation models (B10) raise r far more in the long run.
  - The IMF UK model reports no interest rate.
  - The BoE MPR (A8) treats AI as a demand boost so far, with no neutral-rate estimate.
- **Verdict: right direction; no UK estimate to size against.** The rise is larger at the bound, because less foreign capital arrives, which is the expected ordering.

### 3.5 Revenue and debt

- **Tax/GDP response per point of labour-share fall (ours):**

  | Source or arm | Per 1pp of labour-share fall |
  |---|---|
  | OBR FRS 2026 (A2) | 4/20 = 0.19pp, matching its effective tax rates (0.46 − 0.27) |
  | November 2025 EFO rates (A4) | 0.40 − 0.17 = 0.23pp |
  | `share_shift`, central | 0.16pp |
  | `share_shift`, bound | 0.03pp |
  | `share_shift_tfp`, central | 0.09pp |
  | `share_shift_tfp`, bound | **−0.05pp (wrong sign)** |

- **Verdict:**
  - `share_shift` at the central closure is just below both OBR benchmarks, which is plausible.
  - The bound and `share_shift_tfp` are well below them.
  - **`share_shift_tfp` at the bound has tax/GDP rising (+0.20pp) when the labour share falls. That is opposite in sign to every OBR source** (red flag 3).
  - The OBR's ¶6.18 £6bn (about 0.17% of GDP, ours) is mostly lower employment and consumer spending (VAT), not the tax-rate wedge, so it is not a like-for-like benchmark for a model without unemployment.
- **Debt.**
  - **`share_shift` vs the OBR.**
    - The OBR's displacement scenario has debt +1.3% of GDP by 2030-31, with spending held at its plans (A1). It includes £3bn a year of higher welfare spending.
    - Ours is +1.51pp at 2030 with spending held at baseline levels (Appendix table, fixed-spending file) and +2.29pp with G/Y fixed.
    - **Verdict: same sign; ours is somewhat larger,** although the composition shock is about five times the OBR's (3.1). The reasons:
      - no welfare channel;
      - whole-stock interest repricing (the referee's point 6) adds about 1.1pp of the +2.29pp;
      - revenue falls in line with the larger shift.
    - Per unit of composition shock, ours is smaller than the OBR's.
  - **`share_shift_tfp` vs the OBR productivity upside.**
    - The OBR's upside has borrowing about £50bn lower in 2030-31 (A4). Per year, that productivity path gives about 2.5% on the level over five years (ours), comparable to our TFP input.
    - Ours: debt/GDP −5.89pp under fixed spending, the OBR's convention. With G/Y fixed, borrowing is *higher* by 1.0% of GDP in 2030 and debt/GDP turns positive by 2035.
    - **Verdict: under the OBR's spending convention, same sign as the OBR's productivity upside.** The G/Y-fixed convention reverses it. The FRS (A2, executive summary ¶16) makes the same point: the debt benefit of higher productivity "is largely driven by the assumption that future governments do not use the receipts benefits of higher GDP growth to increase public spending".

### 3.6 Summary of where we sit

| Quantity | Published range (UK first) | Ours | Position | Main reason |
|---|---|---|---|---|
| TFP input by about 2030 | 0.3–0.75% (OBR); 0.53% (IMF, yr 5); 1–5pp over 10 yrs (IMF RAM); Korinek 3.1% | 3.1% | Above UK, at Korinek | Borrowed US "substantial" scenario |
| Labour-share fall, pp/yr | about 0.44 (OBR FRS, upper end); about 0.6 (IMF UK); about 0.7pp total implied by the OBR displacement scenario (ours) | about 1.0 | Above | Same |
| GDP level, about 5 yrs | +1.9 to +10.3% (UK studies); +3.26% (IMF); +8.3% (Korinek) | +4.90% / +3.10% | Inside the UK spread, below Korinek | Small capital response (ζK, 4-year horizon) |
| GDP per unit of TFP | 2.7 (Korinek); about 6 (IMF UK) | 1.58 / 1.00 | Below | Limited capital supply; GE saving response over 4 years |
| Wage, TFP arm | −1.6% to +5.6% (Korinek, by capital elasticity); +1.0% (Acemoglu) | −0.57% / −1.95% | Inside (low end) | Low capital elasticity, r rises (Caselli–Manning) |
| Capital-supply elasticity (implied) | 1 to ∞ (Korinek Table 5) | about 0.32 / 0.09 (ours) | Below | ζK = 0.1 inflow rule, 4-year horizon |
| Return on capital | +50 to +110bp (Korinek); about +40bp (IMF SDN, UK) | +108 / +140bp | Top of range | Same |
| Wage, share-only arm | OBR: real earnings flat, jobs fall | −5.31% / −5.04% | Different channel | No unemployment block |
| Tax/GDP per pp of share fall | 0.19–0.23 (OBR) | 0.16 / 0.03; 0.09 / −0.05 | At or below; one wrong sign | Unidentified (tax functions, capital-income taxation) |
| Debt, share-only arm, 2030 | +1.3% of GDP (OBR) | +1.51pp (fixed spending) / +2.29pp | Slightly above | Whole-stock repricing; larger shock; no welfare channel |

## 4. Citations

### 4.1 Studies the paper should cite but does not

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

### 4.2 Citations or claims in the paper that are wrong or need changing

| Where | What the paper says | What the source says | Fix |
|---|---|---|---|
| Intro ¶1 | "Two quantified AI scenarios now shape the UK debate" — the OBR's and Korinek et al.'s. "Both specify the factor-share and technology shocks." | The OBR's Box 2.2 scenario is an *unemployment* scenario about "new technology", with AI named as one possible cause. It publishes **no labour-share or productivity number** (A1). The IMF UK SIP (A6) and the OBR FRS Box 4.1 (A2) are quantified UK AI scenarios, and the paper misses both. | Rewrite. The OBR scenario specifies GDP and unemployment, not the factor-share shock. Add A6 and A2. |
| Methodology ("The two scenarios") and Limitations | "The OBR publishes no labour-share figure for its scenario" | True for EFO Box 2.2. But the OBR *does* publish an AI labour-share scenario, in FRS 2026 Box 4.1 (wages and salaries from 40% to 20% of GDP, 2030-31 to 2075-76). | Qualify: "…for its March 2026 scenario; its July 2026 FRS sets out a long-run labour-share scenario." |
| Literature, "UK official benchmarks" | Receipts fall "because labour income faces a higher effective tax rate than capital income [Box 2.2 and ¶6.18]" | Box 2.2 says that. **¶6.18 attributes the £6bn to "lower personal tax and VAT revenues from lower employment and consumer spending, partly offset by higher corporation tax"**: mainly the unemployment channel, which the model lacks. | Cite the tax-richness reason to Box 2.2 only. Say that ¶6.18's figure is mostly employment and VAT, so it is not a like-for-like target. |
| Results, "The public finances" | £6bn is "roughly 0.2 per cent of GDP" | £6bn is 0.17% of 2030-31 nominal GDP (£3,632bn, EFO Table A.3, p.110) (ours) | "about 0.17 per cent of 2030-31 GDP". Minor. |
| Results, "The public finances", and `docs/results_sanity_audit.md` | Rule of thumb with 40% and 17% (November 2025 EFO ¶2.64; correct). The audit says that 46% and 27% are in no OBR document. | **46% on wages and salaries and 27% on profits are in OBR FRS 2026 Box 4.1 (p.87, footnote q).** They use other definitions: income tax plus NICs on wages and salaries; CT plus CGT on profits. | The audit statement is wrong. The paper can give both: −0.90pp (EFO rates) and −0.74pp (FRS rates). |
| Bibliography `obr2025wp22` | Corporate author only | Working paper No.22 is by **Brzezinski, Hantzsche and Watson**, April 2025 (title page) | Add the authors. |
| Bibliography `korinek2026` | No URL | WP 2026-02, PDF on `www-cdn.anthropic.com` (B1) | Add the URL. Table 3 and Table 5 values are confirmed. |
| Bibliography `acemoglu2025` | *Economic Policy* 40(121), 13–58 | Confirmed (RePEc metadata; the FRS 2026 cites the same volume and issue). **The #24 referee table says this entry and sentence were removed, but both are still in `literature.tex` at `b2402d0`.** | Keep the entry (it is correct) and add the 0.66% figure. Correct the referee comment's claim. |
| Methodology | Labour share falls "from 60.0 to 56.1 cents" | Korinek et al.: "Labor share, pct. of income" (Table 5) | "per cent of income" (also referee minor 6). |
| `docs/OG_UK_OBR_COMPARISON.md` (repo, not paper) | Quotes "We expect GDP growth to pick up to average 1.6 per cent a year from 2027 to 2030" as ¶1.10 | The sentence is in **¶1.9** (p.7). ¶1.10 is about potential output. | Change to ¶1.9. |
| Brief to this task | "PWBM AI projections (an OLG model, the closest analogue)" | PWBM's AI brief uses Hulten task arithmetic with GDP = TFP, not its OLG model (B2) | Do not present PWBM as an OLG comparator. |

Checked and correct: Korinek et al. Table 3 and Table 5 values (B1); Jones and Tonetti, title and version (B14); Moll and Imas, essay of 9 Sept 2026, α from 1/3 to 1 by 2045, 20% saving rate (B15); Sachs et al. NBER 21091 (B9); March 2026 EFO paragraphs 1.2, 1.9, 2.10 and 6.18 and Box 2.2 as used in the appendix and results; November 2025 EFO ¶2.64 rates.

## 5. Red flags: where our results look out of line

1. **The capital response is below every published model.**
   - The implied capital-supply elasticity is about 0.3 at the central closure and 0.1 at the bound. Korinek et al.'s *lowest* case is 1, and it still gives capital +9.3% and GDP +6.4% against our +6.1% and +4.90%.
   - GDP per unit of TFP is 1.6 (bound 1.0), against 2.7 for Korinek and about 6 for the IMF UK model.
   - This is the mechanism behind our low GDP and negative wage. The paper should say plainly that the central closure is less elastic than any case in the source scenario.
2. **`share_shift` is not OBR-sized.**
   - Its 3.9pp labour-share fall is about five times what the OBR's displacement scenario implies (about 0.7pp, ours).
   - Its revenue fall (−0.63pp of GDP) is about 3.7 times the OBR's £6bn.
   - It also adjusts through a −5.3% wage, where the OBR adjusts through jobs.
   - Calling it the OBR-like arm overstates the match. It matches the OBR only on GDP, which is imposed.
3. **Tax/GDP rises (+0.20pp) in `share_shift_tfp` at the bound while the labour share falls 3.9pp.**
   - Every OBR source gives the opposite sign (−0.19 to −0.23pp per point of share fall).
   - The central closure gives the right sign, but at under half the OBR's rate per point (0.09).
   - The cause is not identified, as the paper says. A referee will ask.
4. **The input shock is at the top of the UK range.**
   - TFP +3.1% in four years is 4–10 times the OBR central effect over the same period and 6 times the IMF UK baseline at year 5.
   - The labour-share pace of about 1pp a year is faster than the OBR's self-described "upper end" scenario (about 0.44pp a year) and the IMF UK model (about 0.6pp a year).
   - The paper says the sizes are borrowed. It should also say where they sit against UK sources.
5. **The debt sign in `share_shift_tfp` depends on the convention, and the OBR's convention gives the opposite of our headline.**
   - Under fixed spending (the OBR's), debt/GDP falls (−5.89pp in 2030), the same sign as the OBR's productivity upside (borrowing £50bn lower).
   - Under our G/Y-fixed headline, borrowing is higher.
   - The OBR FRS states the same dependence (executive summary ¶16).
   - The paper already reports both. The comparison sentence should cite the OBR's version of the point.
6. **Not a red flag:**
   - The wage in `share_shift_tfp` (−0.57%) sits inside Korinek et al.'s range for elasticities 1–3. Its sign is what Caselli and Manning predict when r rises.
   - GDP +4.90% sits inside the spread of UK level estimates for about 2030.
   - The rise in r (+108bp) is at the top of the published range, consistent with the low elasticity.

## 6. What the 2028-surprise rerun should recheck

- **Implied capital-supply elasticity (Δln K / Δln r).**
  - With no anticipation, capital has less time before the headline year. Expect it to fall further below Korinek's range unless the ramp is shorter.
  - Recompute it, and the GDP/TFP ratio, at the new headline year.
- **The `share_shift_tfp` wage sign.** It depends on the same elasticity. Compare with Korinek Table 5 again.
- **Tax/GDP per point of share fall at both closures**, against the OBR's 0.19–0.23. Check whether the wrong sign at the bound survives.
- **Debt in `share_shift` under fixed spending**, against the OBR's +1.3% of GDP.
- **The horizon.** If the headline year moves to 2031, the published UK comparators for "about 5 years" (IMF year 5, IPPR, PwC 2030) remain the right set.
