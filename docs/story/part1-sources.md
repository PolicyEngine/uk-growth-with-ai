# Part 1 sources: where the UK economy and labour market stand

Data for part 1 of the story ("The macroeconomic effects of AI on the UK"). Official published data only, with no PolicyEngine modelling. The OBR series is the OBR's own forecast.

- Raw files: `analysis/story/raw/` (as downloaded, one file per source)
- Builder: `dashboard/scripts/build_uk_context.py` (reads only the raw files, no network)
- Output: `dashboard/src/data/ukContext.json`

All files were fetched on 15 November 2026. To refresh, re-download each URL below into the same file name and re-run the builder. The builder checks each ONS file's CDID header, so a saved error page fails loudly.

## ons_ihyp: real GDP growth

- **Title:** Gross Domestic Product: Year on Year growth: CVM SA %
- **Publisher:** Office for National Statistics, dataset PN2 (the dataset ID given in the CSV header)
- **Released:** 12 November 2026 (next release 22 December 2026)
- **URL:** https://www.ons.gov.uk/generator?format=csv&uri=/economy/grossdomesticproductgdp/timeseries/ihyp/pn2
- **Series:** IHYP. This is the annual growth rate of ABMI, real GDP at market prices.
- **Raw file:** `ons_ihyp.csv` (sha256 `6363c836…`)
- **Values used:** `series.gdp_growth` takes the annual rows for 2010 to 2025. `facts.gdp_growth_latest` is 2025, 1.2%.

## ons_lzvb: output per hour worked

- **Title:** UK Whole Economy: Output per hour worked SA: Index 2023 = 100
- **Publisher:** Office for National Statistics, dataset PRDY
- **Released:** 18 August 2026 (next release 17 November 2026)
- **URL:** https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peopleinwork/labourproductivity/timeseries/lzvb/prdy
- **Series:** LZVB
- **Raw file:** `ons_lzvb.csv` (sha256 `f1764957…`)
- **Values used:** `series.productivity_oph` takes the annual rows for 2008 to 2025. `facts.productivity_oph_latest` is 2026 Q1, 100.1.

## ons_lf24: employment rate

- **Title:** Employment rate (aged 16 to 64, seasonally adjusted): %
- **Publisher:** Office for National Statistics, dataset LMS (released with the Labour market overview, UK: October 2026)
- **Released:** 20 October 2026 (next release 17 November 2026)
- **URL:** https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/timeseries/lf24/lms
- **Series:** LF24
- **Raw file:** `ons_lf24.csv` (sha256 `77a8b0e6…`)
- **Values used:**
  - `series.employment_rate` takes the published annual rows for 2010 to 2025. No averaging is done by us.
  - `facts.employment_rate_latest` is 75.3%, for the file's last monthly row, labelled "2026 JUL".
  - ONS labels rolling three-month LFS estimates by their middle month, so "2026 JUL" means June to August 2026. The October 2026 bulletin confirms 75.3% for June to August 2026 (https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/october2026).

## ons_mgsx: unemployment rate

- **Title:** Unemployment rate (aged 16 and over, seasonally adjusted): %
- **Publisher:** Office for National Statistics, dataset LMS
- **Released:** 20 October 2026 (next release 17 November 2026)
- **URL:** https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms
- **Series:** MGSX
- **Raw file:** `ons_mgsx.csv` (sha256 `7b456303…`)
- **Values used:** `series.unemployment_rate` takes the annual rows for 2010 to 2025. `facts.unemployment_rate_latest` is 4.7% for June to August 2026; the bulletin confirms it.

**LFS caveat** (applies to LF24, MGSX, and in part to LZVB through hours worked):

- The October 2026 bulletin (URL above) says response has improved and is now close to its pre-pandemic level.
- It also says "some volatility remains", particularly in estimates for mid-2023 and throughout 2024 and in small-sample breakdowns, and advises users to focus on long-term movements.
- LFS estimates are official statistics. The ONS has told OSR it will not seek reaccreditation for them, and is prioritising the Transformed LFS as their replacement.
- The full caveat is in `notes`; the series and fact notes carry a one-line pointer to it.

## ons_dtwm and ons_ybha: compensation of employees as a share of GDP

- **Titles:**
  - UK (S.1): Compensation of employees (D.1) Uses: Current price: £m: SA (DTWM)
  - Gross Domestic Product at market prices: Current price: Seasonally adjusted £m (YBHA)
- **Publisher:** Office for National Statistics, dataset UKEA. These are two source entries in the JSON; the series points at `ons_dtwm` and its note names `ons_ybha`.
- **Released:** 30 September 2026 (next release 22 December 2026)
- **URLs:**
  - https://www.ons.gov.uk/generator?format=csv&uri=/economy/grossdomesticproductgdp/timeseries/dtwm/ukea
  - https://www.ons.gov.uk/generator?format=csv&uri=/economy/grossdomesticproductgdp/timeseries/ybha/ukea
- **Raw files:** `ons_dtwm.csv` (sha256 `8c10e860…`) and `ons_ybha.csv` (sha256 `080b6afa…`)
- **Values used:** `series.labour_share` and `facts.labour_share_latest` (2025, 49.9%).
- **Computed:** this is the only computed series. Each year is 100 × DTWM / YBHA from the annual rows, rounded to 1 decimal place.
- **Coverage:** it excludes self-employment (mixed) income, so it is not the ONS's adjusted labour share. It is labelled "Compensation of employees as a share of GDP".

## obr_efo_oct2026: OBR GDP growth forecast

- **Title:** Economic and fiscal outlook – October 2026, Annex A, Table A.1: Economy forecast
- **Publisher:** Office for Budget Responsibility (HTML edition on GOV.UK)
- **Released:** presented to Parliament 28 October 2026, corrected 30 October 2026. The correction concerned carbon price support, not GDP.
- **Page:** https://www.gov.uk/government/publications/october-2026-economic-and-fiscal-outlook/economic-and-fiscal-outlook-october-2026
- **Raw file:** `obr_efo_oct2026_govuk_content.json` (sha256 `025cd3ad…`). This is the GOV.UK content API JSON of that page, fetched from https://www.gov.uk/api/content/government/publications/october-2026-economic-and-fiscal-outlook/economic-and-fiscal-outlook-october-2026
- **Why this copy:** obr.uk blocks scripted downloads (Cloudflare), so the OBR's own xlsx tables were not downloaded. The builder parses Table A.1 from the HTML body.
- **Series:** Table A.1, row "GDP", percentage change on a year earlier.
- **Values used:** `series.obr_gdp_forecast` covers the forecast years only:

  | Year | 2026 | 2027 | 2028 | 2029 | 2030 | 2031 |
  |---|---|---|---|---|---|---|
  | Real GDP growth (%) | 1.2 | 1.0 | 1.6 | 1.8 | 1.7 | 1.6 |

- **Cross-checks:**
  - The EFO text (paragraph 1.14) gives "around 1¼ per cent" for 2026 and "around 1 per cent" for 2027.
  - Table 2.1 gives an average of 1.1 for 2026 and 2027.
  - The same figures appear in the PDF at https://assets.publishing.service.gov.uk/media/6ae4a7a9ec36e258a1998484/economic-and-fiscal-outlook-october-2026-web-accessible.pdf (page 184).
- **Not used:** Table A.1 gives the OBR's 2025 outturn as 1.3%. The newer ONS IHYP figure is 1.2%, so we do not splice the two series.
- **Vintage:** the October 2026 EFO supersedes the March 2026 EFO, which forecast 1.1% for 2026.

## ons_bics_w165: business AI use

- **Title:** Business insights and impact on the UK economy: 8 October 2026, Figure 1 data. Business Insights and Conditions Survey (BICS) Wave 165, live 21 September to 4 October 2026.
- **Publisher:** Office for National Statistics
- **Released:** 8 October 2026
- **Bulletin:** https://www.ons.gov.uk/businessindustryandtrade/business/businessservices/bulletins/businessinsightsandimpactontheukeconomy/8october2026
- **Data file URL:** https://www.ons.gov.uk/generator?uri=/businessindustryandtrade/business/businessservices/bulletins/businessinsightsandimpactontheukeconomy/8october2026/a52309bf&format=xls
- **Series:** current use of at least one AI technology, by size band, weighted by count, UK, 18 September 2023 to 4 October 2026.
- **Raw file:** `ons_bics_w165_fig1.xls` (sha256 `ee43d79f…`)
- **Values used:**
  - `series.business_ai_use` uses the "All industries" column. Dates are wave midpoints, from 24 September 2023 to 27 September 2026.
  - `series.business_ai_use_10plus` uses the "All size bands excluding 0 to 9" column.
  - `facts.business_ai_use` is 29.7%; the bulletin rounds it to 30%.
  - `facts.business_ai_use_10plus` is 38.1%; the bulletin rounds it to 38%.
- **Question wording:** from the ONS article "Business insights and conditions survey questions: 21 September to 4 October 2026", released 5 October 2026 (https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/conditionsanddiseases/articles/businessimpactofcovid19surveyquestions/21september2026to4october2026). The question is "Which of the following artificial intelligence technologies, if any, does your business currently use?" The answer options are:
  - Autonomous vehicles
  - Data processing using machine learning
  - Image processing using machine learning
  - Robotics
  - Text generation using Large Language Models
  - Visual content creation
  - Other (Please describe)
  - Not sure
  - Business does not currently use artificial intelligence technologies

  The page is saved as `analysis/story/raw/ons_bics_w165_questions.html`. The builder holds the wording and asserts that the question and its options appear verbatim, in order, in that file.
- **Latest wave:** the 5 November 2026 bulletin (Wave 167) has no new AI-use figure; it reports only concern about AI, at 12%. Wave 165 is the latest AI-use reading.
- **Coverage:** BICS covers private-sector businesses and excludes several industries, among them agriculture, finance and insurance, and public administration.

## dsit_ai_capabilities_2026: workers by AI exposure (IMF estimates)

- **Title:** Assessment of AI capabilities and the impact on the UK labour market, Figure 2 (data table)
- **Publisher:** Department for Science, Innovation and Technology and AI Security Institute
- **Released:** 28 January 2026
- **Original source:** IMF, "Gen-AI: Artificial Intelligence and the Future of Work", January 2024
- **Page:** https://www.gov.uk/government/publications/assessment-of-ai-capabilities-and-the-impact-on-the-uk-labour-market/assessment-of-ai-capabilities-and-the-impact-on-the-uk-labour-market
- **Raw file:** `dsit_ai_capabilities_2026_govuk_content.json` (sha256 `8db1a331…`). This is the GOV.UK content API JSON, fetched from https://www.gov.uk/api/content/government/publications/assessment-of-ai-capabilities-and-the-impact-on-the-uk-labour-market/assessment-of-ai-capabilities-and-the-impact-on-the-uk-labour-market
- **Values used:** from the UK row of the Figure 2 table.

  | Fact | Value |
  |---|---|
  | `facts.workers_high_exposure_high_complementarity` | 35% |
  | `facts.workers_high_exposure_low_complementarity` | 32% |
  | `facts.workers_low_exposure` | 33% |

  The page text says "around 70%" of UK workers are in exposed occupations, while the two high-exposure shares sum to 67%. The note records both.

## Not sourced

**Exposure by SOC major group** (`exposure: null`):

- The DfE report "The impact of AI on UK jobs and training" (28 November 2023, https://www.gov.uk/government/publications/the-impact-of-ai-on-uk-jobs-and-training) and its Annex 1 xlsx publish AIOE scores only for 4-digit SOC 2010 unit groups.
- They have no major-group table and no employment counts.
- No later DfE or DSIT source with SOC 2020 major-group exposure was found.
- An unweighted or employment-weighted mean by major group would be our own construction on the older SOC vintage, so it is left out.
