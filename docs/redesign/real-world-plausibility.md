# Real-world check of the uk-growth-with-ai dashboard results

Written 13 November 2026. Read-only: no files changed, no model runs, nothing posted.

- **What was checked:** every number in `dashboard/src/data/surprise2028.json` and `cohorts2028.json` (and `methodFacts.json`) at `/Users/vahid/ugai-tabs3`, branch `dashboard/ab2026-tabs`, `2ebcc4d`.
- **Built on:** `docs/results_sanity_2028.md` (PRs #39/#42, anomalies A1–A16) and `docs/literature_comparison.md` (PR #41). Their findings are marked **carried** and were not re-fetched.
- **New here:** UK data history, pulled today from the ONS time-series service and analysed locally, plus six web sources. Each is linked in the table.
- **Not solved, so not checked:** UK low and UK high with closed capital (ζK = 0).

## How to read the verdicts

- **Every dashboard figure is a gap against a growing path**, not a change in level. History is in levels. So each gap was converted before comparing.
  - The no-shock path has the wage rate growing about 0.9% a year (3.55% over 2027–31; `analysis/rerun/output/zk0.1/baseline_p1.json`, growth factor 1% a year less the detrended drift).
  - UK central's wage gap of −1.27% therefore means pay rates grow about 2.2% over the four years, not 3.5%. They do not fall.
- **Verdicts:** plausible / at the edge / implausible, for the real world. A result can be correct inside the model and still be at the edge.
- **A dash in the wording column** means the row is plausible and needs no caveat.
- **"Ours":** arithmetic done here. **UNVERIFIED:** not read on a primary page today.

## UK history used as benchmarks (new)

All from the ONS time-series service, annual, downloaded today.

| Series | What it shows |
|---|---|
| Labour share, whole economy ([ONS FZLN](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/labourproductivity/timeseries/fzln/ucst)) | 59.0% in 2025; 57.2% in 2023; 60.5% in 2007; 53.7% in 1996. The model's level is 65%. |
| Same, four-year falls since 1990 (32 overlapping windows, ours) | Three separate episodes: the early 1990s (−3.4pp, 1992–96), 2010–15 (−2.5pp, 2010–14) and 2019–23 (−1.6pp). None fell 3.9pp. The 2019–23 fall depends on the data vintage: this series has 57.2% for 2023, the ONS article quoted in PR #41 has 59.5%. |
| Same, 1955–2025 | Falls of 3.9pp or more in four years: 1967–71 (−4.5pp) and windows between 1974 and 1985 (largest −7.7pp, 1975–79, after a +6pp spike in 1973–75). None since. |
| Same, reversals | The falls reversed: +1.8pp between 2023 and 2025; +6.3pp between 1996 and 2001. |
| Total fixed investment, volume ([ONS NPQT](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/npqt/pn2)) and GDP ([ONS ABMI](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/abmi/pn2)) | Largest one-year rise since 1990: +9.3% (2021 rebound), then +7.5% (2005). As a share of GDP: +1.7pp (2021), otherwise at most +1.3pp. Post-war record: +2.7pp of GDP (1988). Largest three-year rise in the investment share: +3.3pp (1986–89). Investment is 19.1% of GDP in 2025; the model's is 20.6%. |
| Business investment, volume ([ONS NPEL](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/npel/cxnv)) | Largest one-year rises since 1997: +9.2% (2015), +8.4% (2007), +8.2% (2016). The series shows +23.3% in 2005, which I believe is a one-off asset transfer (UNVERIFIED). |
| Primary income balance ([ONS HBOJ](https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments/timeseries/hboj/pnbp)) over nominal GDP ([ONS YBHA](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ybha/pn2)) | −1.2% of GDP in 2025, −1.6% in 2024. Range since 2005: +1.0% to −2.3% (2016). This is all primary income, not investment income alone. The model's no-shock path pays 1.5% of GDP abroad. The dashboard shows this only as the gap between GDP and GNI. |
| Current account balance ([ONS AA6H](https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments/timeseries/aa6h/pnbp)) | −3.0% of GDP in 2025. Range since 2005: −0.8% to −5.1% (2016). |
| Household saving ratio ([ONS NRJS](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/nrjs/ukea)) | 9.7% in 2025. Rose 2.9pp in 2009 and again in 2024. |
| GDP growth (ABMI, ours) | GDP rose 8.0% over 2010–14 and 11.2% over 1992–96, the two periods when the labour share fell most. |

Other sources read today:

- **Real wages, 2008–14:** median hourly wages 4.7% lower in 2014 than in 2008 ([Nuffield Foundation](https://www.nuffieldfoundation.org/news/men-and-younger-workers-see-biggest-falls-in-pay-low-paid-see-smaller-falls-than-those-on-higher-earnings)); mean weekly earnings −7.4% ([IFS](https://www.ifs.org.uk/publications/7544)). Both from search summaries, not the full text.
- **Pay and productivity:** mean hourly compensation grew in line with labour productivity over 1981–2019; median pay lagged by about 25 points ([Teichgräber and Van Reenen, CEP DP 1812](https://cep.lse.ac.uk/_new/publications/abstract.asp?index=8612), abstract).
- **Debt interest:** a 1 point rise in gilt rates adds £1.3bn in year one and £9.6bn in year five, because "the rate increase only affects new gilt issuance". A 1 point rise in short rates adds £8.1bn in year one, falling to £4.9bn ([OBR ready reckoner, March 2025 forecast](https://obr.uk/forecasts-in-depth/tax-by-tax-spend-by-spend/debt-interest-central-government-net/)). Together that is about 0.3% of GDP in year one and 0.4–0.5% by year five (ours, on GDP of £3.0tn). The page's text gives £12.0bn for gilt rates by the end of the forecast, against £9.6bn in its table; the table is used here.
- **Real gilt yields:** yields on index-linked gilts over 15 years went "from a low of −2.56% in November 2021 to 2.5% in September 2026"; the article lists AI capital spending among the causes ([LSEG/FTSE Russell, 12 October 2026](https://www.lseg.com/en/insights/ftse-russell/a-real-revolution-why-have-uk-real-yields-increased-so-much)).
- **Wealth:** the wealthiest 1% of households hold 10% of wealth, the same as the least wealthy half. Median wealth peaks at £502,500 for ages 65–74, 33 times that of ages 16–24 ([ONS, April 2020 to March 2022](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/bulletins/totalwealthingreatbritain/april2020tomarch2022)). The top 10% hold 41% ([ONS FOI response](https://cy.ons.gov.uk/aboutus/transparencyandgovernance/privatelyownedwealthintheuk), from a search summary); the dashboard quotes 43% for 2018–20.
- **Income by source at the top:** business income is 21% of the top 1%'s income and 9% for everyone else ([IFS, Measuring top income shares in the UK](https://www.ifs.org.uk/publications/measuring-top-income-shares-uk), from a search summary). No table of investment income by earnings decile was found.
- **Higher rates and wealth:** the 2021–23 rate rise wiped "£2.1 trillion of household net worth", and higher rates help "young, would-be homeowners" ([Resolution Foundation, Peaked interest?, July 2023](https://www.resolutionfoundation.org/publications/peaked-interest/)). A later RF report says those in their 60s lost most (search summary only, UNVERIFIED).
- **Foreign ownership:** the rest of the world held 58.8% of UK quoted shares in 2024 ([ONS](https://www.ons.gov.uk/economy/investmentspensionsandtrusts/bulletins/ownershipofukquotedshares/2024), from a search summary).
- **Automation and wages:** one more robot per thousand workers lowers the employment rate by 0.2 points and wages by 0.42% in US local labour markets ([Acemoglu and Restrepo, NBER w23285](https://www.nber.org/papers/23285), abstract of the published version).

## Results table

2031 gaps against the no-shock path unless a year is given. "Central" is ζK = 0.1; "closed" is ζK = 0. Main arm is automation + productivity.

### Inputs and timing

| Result | Our value | Real-world benchmark | Verdict | Why | Suggested wording or caveat |
|---|---|---|---|---|---|
| Labour-share fall, UK low | 0.7pp in four years | Exceeded in each of three episodes since 1990 (ONS FZLN, above) | plausible | Well inside UK experience. | The UK labour share has fallen by more than this in four years on three occasions since 1990. |
| Labour-share fall, UK central | 1.6pp in four years | Exceeded in 1992–96 (−3.4pp) and 2010–14 (−2.5pp) (ONS FZLN) | plausible | Inside the range. But the past falls were cyclical and reversed; ours is permanent. | The UK labour share fell further than this in 1992–96 and in 2010–14, though both falls later reversed. |
| Labour-share fall, UK high | 2.9pp in four years | One episode since 1990 (1992–96, −3.4pp) | at the edge | Matched once in 35 years, during a recovery from recession. | A fall this fast has happened once since 1990. |
| Labour-share fall, Korinek et al. (upper) | 3.9pp in four years | None since 1985 (ONS FZLN). Korinek et al.'s own case is for the US over 3.5 years (carried, [B1](https://www-cdn.anthropic.com/files/4zrzovbb/website/cf58f84d46a4a76bf5a5b039ac695fba6b80041c.pdf)) | at the edge | Outside UK experience since 1985. Already labelled as a US upper case. | The UK labour share has not fallen this fast since the early 1980s. |
| Labour-share level | 65% | 59.0% in 2025 (ONS FZLN); 57% (OBR, carried) | at the edge | The model's level is 6–8 points above the data, so each point of fall is a smaller proportional cut than it would be in UK accounts. | The model's labour share is 65% of GDP, against 59% in ONS data. |
| Mix of the shock, UK central | 4.0pp of share fall per 1% of productivity | Acemoglu 0.5; Korinek et al. 0.9–1.3; Rachel 0.15; IMF UK 3.7 (all carried, PR #41 Section 3.1) | at the edge | Only the IMF's UK model has a mix this share-heavy. This mix, not the size of the shock, produces the wage result. | UK central pairs a large shift in income shares with a small productivity gain, as the IMF's UK study does; other studies assume less shift per unit of productivity. |
| Productivity gain | +0.2% / +0.4% / +1.6% / +3.1% | OBR, IMF, OECD and BoE survey ranges (carried, PR #41 Section 4.3). Market-sector productivity has contributed negatively to growth since 2008 ([ONS](https://www.ons.gov.uk/economy/economicoutputandproductivity/productivitymeasures/bulletins/growthaccountingmultifactorproductivityestimatesuk/octobertodecember2024), search summary) | plausible | Korinek's case is at the edge. UK cases sit inside official ranges. +3.1% in four years is about 0.8% a year on top of the path, against roughly zero since 2008. | — |
| Timing: unanticipated in 2028 | A surprise, then perfect foresight | 30% of businesses used AI in September 2026, up from 15% two years earlier (OBR October 2026, carried, A3) | at the edge | Adoption is gradual and already under way. The surprise is a modelling device, which the Method tab says. | AI is treated as arriving unexpectedly in 2028 so that every scenario starts from the same point; in practice adoption is already under way. |
| Timing: full effect by 2031, flat after | Ramp ends in year four | IMF: capital share +10pp reached in 17 years; productivity +0.53% at year five, +1.40% at year ten (carried, A6) | at the edge | Sources have the shock still growing after year four. Ours stops, so 2032–36 paths show adjustment to a finished shock. | The scenarios stop growing in 2031; published studies have AI's effect still building after that. |

### Output and income, main arm

| Result | Our value | Real-world benchmark | Verdict | Why | Suggested wording or caveat |
|---|---|---|---|---|---|
| GDP, UK low / central, central closure | +0.41% / +0.92% | IMF UK +2.52% at year four for the same productivity gain (carried). About +0.1 / +0.2 points a year on 1.6% growth (ours) | plausible | Small against normal forecast error. Low against the IMF, for a stated reason (capital supply). | GDP is 0.9% higher by 2031, about a third of the IMF's estimate for the same productivity gain. |
| GDP, UK high | +2.74% | About +0.7 points a year (ours). OECD rapid case 1.27 points a year of labour productivity; BoE survey firms expect 0.9 (carried) | plausible | Inside the upper half of UK estimates. | — |
| GDP, Korinek | +4.89% (central), +3.05% (closed) | Korinek et al. +8.3% (carried). About +1.2 points a year, taking growth to about 2.8% for four years (ours) | at the edge | Outside the post-pandemic rebound, GDP last grew this fast over four years in 1999–2003 (ONS ABMI, ours). | This is a US scenario applied to the UK, shown as an upper case. |
| GDP, UK central, closed capital | +0.37% | Below a no-capital-deepening benchmark of 1.0 per 1% of productivity (carried, Section 4.4) | at the edge | The UK runs a current account deficit of 3.0% of GDP (ONS AA6H), so no foreign funding at all is a bound, not a description. | With no foreign capital, GDP rises by about as much as productivity alone. |
| GNI | +0.57% (central), +0.30% (closed); low +0.27%, high +2.02%, Korinek +3.80% | See payments abroad | plausible | Follows from GDP and the foreign share. | — |
| Payments abroad (GDP less GNI), UK central | +0.35pp of GDP, on a path that pays 1.5% | Primary income balance −1.2% of GDP in 2025; range to −2.3% (ONS HBOJ/YBHA) | plausible | Path matches the data; the total (about 1.9%) is inside the range since 2005. | The UK's net income paid abroad was 1.2–1.6% of GDP in 2024–25; this adds about 0.35 points. |
| Payments abroad, Korinek | +1.09pp of GDP, total about 2.6% | Record −2.3% of GDP (2016) | at the edge | Just beyond the largest deficit on record. | In the upper case net income paid abroad would exceed its 2016 record. |
| Foreign share of new capital | 77% (central); 73% under the debt-neutral rule; 0% (closed) | Rest of the world holds 58.8% of UK quoted shares (ONS, above). Implied extra inflow about 1 point of GDP a year for UK central (ours) against a 3.0% current account deficit | plausible | Korinek's case is at the edge. UK central's inflow fits inside past swings in the current account. Korinek's is about 3 points a year, which would take the deficit past the 2016 record of 5.1%. | About three-quarters of the extra capital is foreign-owned; foreign investors already own about 59% of UK listed shares. |
| NNI | +0.27% (central), +0.23% (closed) | No external estimate | plausible | An accounting step from GNI. It is the measure least sensitive to the closure. | — |

### Pay, hours and spending, main arm

| Result | Our value | Real-world benchmark | Verdict | Why | Suggested wording or caveat |
|---|---|---|---|---|---|
| Wage rate, UK central | −1.27% (central), −1.71% (closed) | Real pay fell 5–7% in level over 2008–14 (Nuffield, IFS). Here the level still rises about 2.2% over four years against 3.5% on the path (ours) | at the edge | The size is plausible: a slowdown of 0.3 points a year is small against history. The sign is the weak part: it turns positive if capital is supplied as elastically as in other studies (carried, red flag 1). | Pay rates are 1.3% lower than they would otherwise be in 2031; they still rise in real terms, by about 0.5% a year in place of 0.9%. |
| "Pay rates fall" (landing sentence) | Text | Same | implausible | A wording finding, not a model one. A reader will take "fall" as a cut in pay. The level rises in every UK main arm. | Pay rates grow more slowly than on the OBR-central path. |
| Wage falls while GDP rises | GDP +0.92%, wage −1.27% | 2010–14: labour share −2.5pp while GDP rose 8.0%, and real pay fell (ONS FZLN, ABMI). Mean pay tracked productivity over 1981–2019 (Teichgräber and Van Reenen) | plausible | The UK has had four-year periods of rising GDP with pay lagging. Over decades pay has kept up, so a permanent gap is less well supported. | Pay lagged output in 2010–14; over four decades average pay has kept pace with productivity. |
| Wage rate, UK low / high / Korinek | −0.53% / −1.27% / −0.59% | Korinek et al. +2.1% at their default (carried) | at the edge | Not monotonic in the shock, and below the published range per point of share fall (carried, A2). | Pay rates depend on the mix of the two inputs, so a larger scenario does not always mean a larger effect on pay. |
| Hours worked | −0.30% (central), −0.40% (closed); +0.17% in 2028 | OBR displacement scenario: unemployment rate to 5.5% (carried, A1). Robots lower local employment (Acemoglu and Restrepo) | at the edge | The size is small. The form differs: evidence points to job losses for some workers, not slightly fewer hours for all. | The model has no unemployment, so displacement shows up as lower pay for everyone, not job losses for some. |
| Consumption | −0.39% in 2031, −0.55% in 2028 (central); −0.52% (closed); Korinek +0.28% | Saving ratio has moved 2.9 points in a year (ONS NRJS); the result needs about 0.5 points of GDP more saving (carried, A3) | at the edge | The size is ordinary. The direction relies on households foreseeing the whole path and saving at once; the model has no share-price gains or demand effects. | Households in the model save more as soon as AI is announced, so spending starts below the path. |
| Investment in 2028, UK low / central | +3.4% / +7.8% (about 0.7 / 1.6 points of GDP) | Largest one-year rises since 1990: +9.3% and +1.7 points of GDP in 2021, otherwise +1.3 points (ONS NPQT/ABMI) | at the edge | UK low is plausible. UK central's first year equals the largest rise since 1990, and stays that high for three years. | Investment jumps in the first year because the model has no adjustment costs; the size is not a forecast. |
| Investment in 2028, UK high / Korinek | +15.1% / +21.3% (about 3.1 / 4.4 points of GDP); Korinek +29.6% by 2030 | Post-war record +2.7 points of GDP (1988); largest three-year rise in the share +3.3 points (1986–89) | implausible | Larger than any year since 1948. | The first-year jump in investment is larger than any on record and reflects the model's lack of adjustment costs. |
| Investment in 2031 | +3.6% (central); +13.2% (Korinek) | Same series | plausible | A rise of 0.7 points of GDP in the investment share is ordinary. | — |
| Capital stock | +2.01% (central), +0.67% (closed); low +0.87%, high +4.09%, Korinek +6.03% | Korinek et al. +9.3% to +18.2% (carried). IMF implies more (carried) | at the edge | Below every published case for the same shock. The 2028 gap (+0.43%) includes capital that arrives with no investment recorded (carried, decision 5). | Capital responds less than in other studies because foreign inflows are capped and saving takes time. |

### Interest rate and public finances

| Result | Our value | Real-world benchmark | Verdict | Why | Suggested wording or caveat |
|---|---|---|---|---|---|
| Interest rate, UK low / central | +17bp / +38bp (central); +48bp (closed) | Long real gilt yields moved about 500bp between 2021 and 2026, with AI investment named as one cause (LSEG). Rachel: AI raises the neutral rate about 1 point (carried, B19). Korinek et al. modest case +10bp (carried) | plausible | Small against observed moves in real yields. Somewhat above the published rate per point of share fall. | A rise of under half a point is small against the moves in real gilt yields since 2021. |
| Interest rate, UK high | +76bp | Same | plausible | Inside Rachel's figure. | — |
| Interest rate, Korinek | +109bp (central), +142bp (closed) | Korinek et al. +50bp at their default, +110bp in their least elastic case (carried) | at the edge | At or beyond the source's own least elastic case. | In the upper case the interest rate rises by more than in the study it is taken from. |
| Gilt rate moves one for one with the return on capital | Same bp | No UK estimate found (BoE: "it depends", carried, A19) | at the edge | An assumption, not evidence. The no-shock path has a real gilt rate of 3.2%; long index-linked gilts yielded 2.5% in September 2026 (LSEG), but those are linked to RPI (from memory, UNVERIFIED), so the two are not like for like. | The model assumes government borrowing costs rise by as much as the return on capital. |
| Debt/GDP in 2031, main arm | −0.13pp (UK central); −0.07 / −1.35 / −3.02pp (low / high / Korinek); +0.33pp (UK central, closed) | OBR and Penn Wharton: higher productivity lowers debt (carried) | plausible | Same sign as official scenarios at the central closure. | Debt/GDP is slightly lower in 2031 and higher from 2032. |
| Debt/GDP by 2036, UK low / central, main arm | +0.84pp / +1.99pp | OBR ready reckoner: 1 point on all rates costs about 0.3% of GDP in year one and 0.4–0.5% by year five. The model charges 0.95% from year one (ours) | at the edge | The model's debt is all one-year, so it reprices two to three times too fast: the OBR's figures are about a third of the model's cost in year one and 45–50% by year five (ours). Debt would still end higher unless under about 20% of the model's interest effect survived (break-even 21% for UK low, 18% for UK central, ours). So the sign holds and the size is overstated, perhaps by half. | Debt ends higher because the model reprices the whole debt stock at once; UK gilts reprice over many years, so the real effect would be smaller. |
| Debt/GDP by 2036, UK high, main arm | +2.07pp | Same. Interest alone adds +4.8pp in the model (carried, audit Section 5) | at the edge | Debt ends lower than the path if under 57% of the model's interest effect survives (ours). The OBR's speed implies about 45–50%, so the sign is a close call. | In this scenario debt would be about unchanged or lower by 2036 if gilts repriced at the speed the OBR assumes. |
| Debt/GDP by 2036, Korinek, main arm | +1.12pp (central), +1.03pp (closed) | Same. Interest alone adds +7.0pp (central) and +9.1pp (closed) | implausible | Debt ends lower than the path unless at least 84% of the model's interest effect survives (ours). The OBR's speed implies about half. The sign is produced by the one-year debt assumption. | In this scenario the rise in debt by 2036 depends on the model's one-year debt; with UK gilt maturities debt would be lower than the path. |
| Debt/GDP, stress test | +0.87pp in 2031, +3.40pp in 2036 (UK central); +2.14 / +8.45pp (Korinek) | OBR displacement scenario: +1.3% of GDP by 2030-31 for about 0.7pp of share fall; ours for that size is +0.38pp (carried) | at the edge | Smaller than the OBR's at year four (no unemployment or welfare cost), then inflated by the repricing after 2031. | The stress test's debt figure leaves out the cost of unemployment and reprices all debt at once. |
| Tax/GDP, central closure | −0.19pp (UK central); −0.08 / −0.29 / −0.35pp | OBR: −0.19 to −0.23 per point of share fall; ours is −0.09 to −0.12 in the main arm (carried, A6) | at the edge | Right sign, about half the OBR's size. | The model's tax system loses about half as much revenue per point of labour share as the OBR's. |
| Tax/GDP, closed capital | −0.01pp (UK central), +0.02pp by 2035; **+0.21pp (Korinek)**, +0.25pp by 2035 | Every OBR source has it falling (carried) | implausible | Known (A6): one income-tax schedule taxes the extra capital income. | With closed capital the model's tax result is not reliable and should not be quoted. |
| Employer payroll tax rate | 15% flat | PolicyEngine-UK: 11.0% of labour cost on average, 13.9% at the margin (`methodFacts.json`) | at the edge | Above the average rate, close to the marginal one. Already shown on the dashboard. | The model's payroll tax is a flat 15%, against an average employer rate of 11% of labour cost. |
| No-shock path: debt/GDP 95%, tax/GDP 42.2%, GDP growth 1.6% a year | Levels | Debt matched to the OBR (rerun R1, carried). OBR tax take 38.5% of GDP by 2030-31 (March 2026, press reports, UNVERIFIED) | at the edge | The debt level and growth rate are plausible. 42% looks like total receipts, not taxes. Not re-checked against the October 2026 forecast. | The model's tax/GDP of 42% is closer to the OBR's total receipts than to its tax take. |

### Other arms and the debt-neutral rule

| Result | Our value | Real-world benchmark | Verdict | Why | Suggested wording or caveat |
|---|---|---|---|---|---|
| Technology unchanged, UK central | GDP +0.47% (central), −0.03% (closed); GNI +0.15%; NNI −0.21%; wage −1.71%; consumption −0.61% | No published scenario shifts income shares with no productivity gain (carried, Section 4.3) | at the edge | A decomposition, not a scenario. The pay level still rises about 1.8% over four years (ours). | This arm isolates the shift in income shares; no study treats it as a likely outcome. |
| Stress test, UK central | GDP 0 (imposed); GNI −0.30%; NNI −0.72%; wage −2.19%; consumption −0.84%; tax/GDP −0.24pp | OBR displacement scenario: GDP unchanged, real earnings per worker unchanged, unemployment up (carried, A1). Real pay fell 5–7% over 2008–14 | at the edge | The size is modest: pay still rises about 1.3% in level. But it needs output at fixed inputs to fall 0.45% while AI spreads, and it puts the whole loss on pay where the OBR puts it on jobs. | The stress test matches the OBR's scenario on GDP only; the OBR has the loss falling on jobs, the model on pay rates. |
| Stress and technology-unchanged arms, UK high and Korinek | Wage −3.05% to −5.36%; consumption −1.08% to −2.07% | 2008–14 squeeze (above) | at the edge | Pay is flat or falls in level: from +0.4% to −2.0% over four years (ours). Smaller than 2008–14, but that followed a financial crisis. | In the larger scenarios without a productivity gain, pay rates fall in real terms. |
| Stress test at closed capital | Almost the same as technology unchanged (wage −2.09% against −2.12%) | — | plausible | Explained (carried, A1). It is not a pessimistic bound there, which the dashboard says. | — |
| Debt-neutral rule, main arm | GDP +1.02%; GNI +0.68%; NNI +0.37%; wage −1.26%; consumption −0.56%; tax/GDP −0.21pp; debt gap 0 (imposed) | No government adjusts transfers each year to hold a debt path | plausible | A modelling device. Results are within 0.15 points of the main arm except consumption, which is 0.17 points lower because households pay the fiscal cost. | Under this rule transfers are cut each year to keep debt on the OBR-central path; it shows who would pay, not what a government would do. |
| Debt-neutral rule, other arms and closed capital | GDP +0.60% / 0.00% (central); +0.45% / +0.07% / 0.00% (closed); consumption −0.84% / −1.24% | Same | plausible | Same pattern. | — |

### Cohort welfare (UK central only; debt-neutral transfers is the headline rule)

| Result | Our value | Real-world benchmark | Verdict | Why | Suggested wording or caveat |
|---|---|---|---|---|---|
| Share of adults losing, main arm | 0.05% (central), 0.9% (closed). 15–19% if bequests are not valued. 15–18% with the later fiscal cost charged; 48–50% with both | OBR displacement: unemployment to 5.5%. Korinek et al.: cognitive wages −0.3%, others +5.9% (carried). Acemoglu and Restrepo: local job and wage losses | implausible | As a headline figure. "Almost nobody loses" comes from three model features: no job loss, wealth spread too evenly, and a value placed on leaving bequests. The figure moves from 0% to 50% with two accounting choices. | Between almost none and about half of adults lose, depending on whether bequests are valued and who pays the later fiscal cost; the model has no job losses, so it understates how uneven the effect would be. |
| Share losing, technology unchanged / stress test | 21% / 52% (central); 20% / 24% (closed). Up to 66% / 83% on the widest measure | Same | at the edge | Same sensitivity. More credible in direction: the young lose. | Between a fifth and four-fifths of adults lose in these arms, depending on the measure. |
| Average welfare change, adults alive | +0.79% (main), +0.43% (technology unchanged), −0.07% (stress); +0.49% / +0.12% / −0.39% without bequests; common rule +0.91% / +0.60% / +0.27% | No external estimate | at the edge | A gain while pay is lower and consumption is below the path until 2039. By form, bequests give +0.52, leisure +0.19 and consumption +0.07. | The average gain is mostly the value of larger bequests and more leisure; consumption itself is below the path until 2039. |
| By age | Largest gain at about 60–70 (+1.2%); smallest at 20 (+0.25%); stress test: everyone 44 or younger loses; future cohorts +0.8% to +0.9% | Median wealth peaks at 65–74, 33 times that of 16–24 (ONS). But the 2021–23 rate rise cut household wealth by £2.1tn and helped would-be buyers (Resolution Foundation) | at the edge | The age pattern of wealth is right. The channel is incomplete: when rates rise, existing assets (pensions, bonds, houses) lose value, which hits older holders. The model has no asset prices. Higher profits would work the other way. | Older households gain in the model because they hold more wealth and earn a higher return; it leaves out changes in asset prices, which fell when rates rose in 2022–23. |
| By earnings group | Bottom 25% +1.09%, top 1% +0.49% (main); bottom group gains most in every arm | Model: top tenth holds 33% of wealth, bottom half 11%. ONS: top 10% hold 41–43%, top 1% hold 10%, bottom half 9–10%. IFS: business income is 21% of the top 1%'s income, 9% for others | implausible | The model gives the bottom earnings group 17% of wealth and makes capital 19% of its income, against 10% for the top 1%. UK data run the other way. The dashboard says this, but still shows the figures. | The ranking by earnings group reflects the model's evenly spread wealth, not UK data, and should not be read as a distributional result. |
| Where it comes from (main arm, central) | Capital income +1.68%, labour income −0.67%, transfers −0.06% of remaining consumption | Labour share falls 1.6pp; return up 38bp | plausible | Consistent with the aggregates. | — |
| First year consumption is above the path | 2039 (main); 2051 (technology unchanged); never (stress) | — | at the edge | Depends on the ramp ending in 2031. | Consumption returns above the path only after the scenario has stopped growing. |

### Cells without their own row

Each takes the verdict of the row named.

- **UK low, technology unchanged and stress test** (GDP +0.20% / 0; wage −0.76% / −0.95%; consumption −0.27% / −0.37%; debt/GDP 2036 +1.18 / +1.47pp): as the UK central rows for those arms, at smaller size.
- **Interest rate, capital, investment and hours in the technology-unchanged and stress arms** (UK central: +34 / +31bp, +1.88% / +1.73%, +2.8% / +1.9%, −0.29% / −0.27%): as the main-arm rows; all are the same sign as the main arm and smaller.
- **Debt/GDP by 2036 in those arms** (UK central +2.67 / +3.40pp; Korinek +6.38 / +8.45pp): as the debt rows; the repricing caveat applies in full.
- **Korinek stress test, GNI −0.79% and NNI −1.87%:** as the stress-test row for UK high and Korinek.
- **2028 values of GDP, GNI, NNI, the wage and hours** (UK central: +0.36%, +0.28%, +0.24%, −0.42%, +0.17%): as the consumption and investment rows; they rest on the same first-year response.
- **Share of adults losing under the common fiscal rule** (0% / 10% / 34% at the central closure; 5–55% without bequests): as the share-losing rows.
- **Payments abroad** is not shown as its own figure; readers see it as GDP less GNI and as the foreign share of new capital.

## What needs investigation or correction, ranked

1. **Cohorts: the share of adults losing and the ranking by earnings group.**
   - "0.05% of adults lose" is the first figure on the Cohorts tab. It becomes 15% or 48–50% under choices the same panel offers.
   - The bottom earnings group gaining most contradicts UK wealth and income data.
   - Suggested: lead with the range, and move the earnings-group figures out of the headline into the caveat that already explains them.
2. **Debt/GDP "higher in every arm by 2036".**
   - The OBR's ready reckoner implies the model reprices debt two to three times too fast.
   - Korinek: the sign reverses unless at least 84% of the model's interest effect survives; the OBR's speed implies about half. UK high is a close call (break-even 57%). For UK low and UK central the sign holds (break-even about 20%) and the size is overstated.
   - Suggested: check with a debt recursion that phases the rate in at the OBR's speed (arithmetic on existing solves, no rerun), and reword the automatic sentence in `FinancesSection.jsx`.
   - The break-evens use the audit's interest-only column and ignore interactions, so they are approximate.
3. **"Pay rates fall" on the landing page.**
   - Pay rates rise in level in every UK main arm. The gap is slower growth: about 0.5% a year against 0.9% for UK central.
   - The sign also depends on the capital closure and on UK central's share-heavy mix (carried from PR #41).
   - Suggested: "pay rates grow more slowly", and one line saying the sign depends on how much capital arrives.
4. **Tax/GDP with closed capital** (+0.21pp for Korinek; about zero and then positive for UK central; the tax chart stops at 2031, so the later sign change is not shown). Known (A6) and already caveated. No new evidence; listed so it stays visible.
5. **First-year investment for UK high and Korinek** (+15% and +21%, or 3.1 and 4.4 points of GDP in one year). Larger than any year since 1948. The Method tab's caveat is right; the Results charts for 2027–31 still show the spike without it.
6. **The shock stops in 2031.** Sources have AI's effect still growing after year four. Every figure for 2032–36, and the cohort results that depend on them, describes adjustment to a finished shock.
7. **Older households gain.** The direction depends on leaving out asset prices. Worth one caveat on the Cohorts tab.
8. **Smaller points.**
   - The model's labour share (65%) is above the ONS (59%) and OBR (57%) measures.
   - The no-shock real gilt rate (3.2%) has not been compared with market real yields on a like-for-like index.
   - The 42.2% tax/GDP level needs its OBR counterpart named.
   - The Korinek case is outside UK experience on the labour share, payments abroad, the current account and the interest rate; it is already labelled as a US upper case.

## Limits of this review

- Several benchmarks come from search summaries, not the full page, and are marked.
- The debt arithmetic in item 2 is a scaling, not a recursion.
- The OBR ready reckoner is the March 2025 vintage; the 2026 one was not found.
- No UK source gives the response of gilt yields to growth news as a number, and no table of capital income by earnings decile was found.
- OBR October 2026 baseline levels were not re-read.
