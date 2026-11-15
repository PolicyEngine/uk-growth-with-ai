# Part 1 sources: where the UK economy and labour market stand

Data for part 1 of the story ("The macroeconomic effects of AI on the UK"). Official published data only, with no PolicyEngine modelling. The OBR series is the OBR's own forecast.

- Builder: `dashboard/scripts/build_uk_context.py`
  - `python3 dashboard/scripts/build_uk_context.py` downloads the latest release of every source, then builds.
  - `python3 dashboard/scripts/build_uk_context.py --offline` builds from the cached files only and reproduces the output byte for byte.
- Raw files: `analysis/story/raw/`. ONS files are named `ons_<cdid>_<dataset>_<release date>`. `manifest.json` records, for each source, the file used, its URL, release date, fetch date and sha256. Offline runs read only the manifest.
- Outputs:
  - `dashboard/src/data/ukContext.json` holds the series and facts.
  - `dashboard/src/data/ukContextChecks.json` has one entry per figure part 1 prints (18 at present). Each entry records the publisher, dataset, series ID, release date, period, URL and primary file, and the value read from that file by a second route.
- Check: `dashboard/scripts/checks/part1.py`, run by `check_numbers.py`. It fails if any of these disagree:
  - the page's figures and the checks file;
  - `ukContext.json` and the checks file;
  - the checks file and the raw ONS JSON.

Last refreshed 15 November 2026. On 17 November the ONS releases new labour market (LMS) and productivity (PRDY) figures; re-run the builder to pick them up.

## How "latest" is found

- **ONS time series.** The builder asks the dataset-less endpoint `https://www.ons.gov.uk/<topic>/timeseries/<cdid>/data` which dataset holds the newest release (`description.datasetId`). It then downloads that dataset's CSV from `https://www.ons.gov.uk/generator?format=csv&uri=/<topic>/timeseries/<cdid>/<dataset>`.
  - Example: GDP comes from PN2 after a first quarterly estimate and from QNA after the quarterly national accounts. On 15 November 2026 a hard-coded `ihyq/qna` would have stopped at 2026 Q2; PN2 has 2026 Q3.
  - It keeps both files. The builder reads the CSV, and the checks read the JSON.
  - Release dates come from the CSV header. The JSON gives them as UTC instants, so 20 October appears there as "2026-10-19T23:00Z".
- **BICS.** The builder starts from the newest cached bulletin and follows each bulletin's "Next release" date. It keeps the newest bulletin that has the "using at least one AI technology" figure.
  - The AI-use question is asked quarterly. Wave 165 (8 October 2026) is still the latest with it. The 22 October and 5 November bulletins have no AI-use figure.
- **Labour market bulletin.** The builder tries this month's and last month's bulletin. This is the source of the LFS caveat and the period labels.
- **Fixed sources.**
  - The OBR October 2026 EFO. Its xlsx files download from obr.uk with a plain request; the earlier note that obr.uk blocks scripted downloads was wrong.
  - The DSIT report. It has no attachment, so the GOV.UK HTML page is the report itself.
- **Download safety.** The builder pauses between requests and backs off on rate limits (Cloudflare error 1015). It validates every file before writing it (CDID header, JSON, xlsx/xls signature), so an error page never replaces a good file.

## Series and where they end (as of 15 November 2026)

| Series in `ukContext.json` | Source | Frequency | Ends |
|---|---|---|---|
| `gdp_growth` (IHYP) | ONS PN2, released 12 Nov 2026 | calendar year | 2025 (the latest full year) |
| `gdp_quarterly` (IHYQ), fact `gdp_quarterly_yoy` (IHYR) | ONS PN2, 12 Nov 2026 | quarter | 2026 Q3, first estimate |
| `productivity_oph` (LZVB) | ONS PRDY, 18 Aug 2026 | quarter | 2026 Q1 (2026 Q2 due 17 Nov) |
| `employment_rate` (LF24), `unemployment_rate` (MGSX) | ONS LMS, 20 Oct 2026 | rolling three months | June to August 2026 |
| `pay_growth` (KAI9) | ONS LMS, 20 Oct 2026 | rolling three months | June to August 2026 |
| `labour_share` (DTWM / YBHA) | ONS PN2, 12 Nov 2026 | calendar year | 2025 (the latest full year) |
| `obr_gdp_forecast` | OBR EFO, 28 Oct 2026 | calendar year | 2026 to 2031, all forecast |
| `business_ai_use`, `business_ai_use_10plus` | ONS BICS Wave 165, 8 Oct 2026 | quarterly waves | 27 September 2026 (wave midpoint) |

Calendar-year series stop at 2025. The current year appears only as quarters ("2026 Q1–Q3") or as three-month periods, and is labelled that way. It is never drawn as an annual bar.

## Notes by source

- **IHYP, IHYQ, IHYR (GDP):**
  - Real GDP growth, chained volume measures, seasonally adjusted, as percentage changes: IHYP on the previous calendar year, IHYQ on the previous quarter, IHYR on the same quarter a year earlier.
  - Part 1 prints 2025 growth of 1.2%, and for 2026 Q3, 0.7% on the previous quarter and 1.9% on a year earlier.
  - The annual chart keeps the full scale, so 2020 (−10.0%) and 2021 (+8.5%) show at their true size. They are labelled "Pandemic", and the quarterly chart starts at 2022 Q1.
- **LZVB:** output per hour worked, whole economy, index 2023 = 100, seasonally adjusted, drawn quarterly from 2008 Q1. It carries the LFS caveat through hours worked.
- **LF24, MGSX:**
  - LFS rates. ONS labels each rolling three-month estimate by its middle month, so "2026 JUL" is June to August 2026.
  - The October 2026 bulletin confirms 75.3% (employment) and 4.7% (unemployment) for June to August 2026.
  - **LFS caveat:** response has improved but "some volatility remains", and the ONS advises users to focus on long-term movements. LFS estimates are official statistics; the ONS will not seek reaccreditation for them and is prioritising the Transformed LFS.
- **KAI9:**
  - AWE whole-economy regular pay (excluding bonuses and arrears), three-month average on a year earlier, seasonally adjusted and nominal.
  - AWE three-month averages are labelled by their last month, so "2026 AUG" is June to August 2026. The October 2026 bulletin says regular pay growth "was 3.7% in June to August 2026".
  - It comes from the employer survey (MWSS), not the LFS.
- **DTWM / YBHA:**
  - The share is 100 × DTWM / YBHA from the annual rows, rounded to one decimal place. This is the only computed series.
  - It excludes mixed income, so it is not the ONS's adjusted labour share.
  - These series now come from PN2 rather than UKEA. The 2010–2025 shares are unchanged.
  - PN2 also has quarters to 2026 Q3, but the series is kept annual and its source line says it ends at 2025.
- **OBR, October 2026 EFO:**
  - Forecast values: 2026 1.2%, 2027 1.0%, 2028 1.6%, 2029 1.8%, 2030 1.7%, 2031 1.6%.
  - The builder reads Table A.1, row "GDP", from the GOV.UK HTML edition.
  - The checks read three further sources:
    - the OBR's own Annex A spreadsheet, sheet TA.1 (`obr_annex_a_oct2026.xlsx`), where 2026 is 1.2431…, 2027 is 1.0443… and 2031 is 1.5951…;
    - growth of real GDP in Table 1.1 of the detailed economy tables (`obr_economy_tables_oct2026.xlsx`), which agrees to one decimal place;
    - the PDF (page 184), which shows the same table.
  - The 2025 outturn in Table A.1 is 1.3%, against the ONS's later 1.2%. This is a vintage difference, so the two series are not spliced.
- **BICS Wave 165:**
  - Source: the Figure 1 xls (`ons_bics_w165_fig1.xls`) and the bulletin page (`ons_bics_w165_bulletin.html`).
  - Values: 29.7% for all businesses (the bulletin headline rounds it to 30%) and 38.1% for businesses with 10 or more employees.
  - The question wording is asserted against `ons_bics_w165_questions.html`.
  - Coverage: private-sector businesses; agriculture, finance and insurance, and public administration, among others, are excluded.
- **DSIT/AISI, 28 January 2026:**
  - Figure 2 table, UK row (IMF estimates): 35% high exposure and high complementarity, 32% high exposure and low complementarity, 33% low exposure.
  - The text says "Around 70% of UK workers", while the two high-exposure shares sum to 67%. Both are printed, and both are in the checks file.

## Mismatches against primary sources (15 November 2026)

- **Values:** no printed value differs from its primary file. All 18 figures agree at printed precision between `ukContext.json` and a second reading of the primary file.
- **Fixed in this pass:**
  - ONS JSON release dates are UTC instants, one day earlier than the CSV and bulletin dates (17 August against 18 August; 19 October against 20 October). Release dates now come from the CSV.
  - This document said obr.uk blocks scripted downloads. It does not, and the OBR's own spreadsheets are now kept and checked.
  - The GOV.UK HTML edition of the EFO has `first_published_at` 30 October 2026, the date of the correction. The OBR's release date stays 28 October 2026 (presented to Parliament), and the GOV.UK date is recorded in the manifest as `govuk_first_published`.

## Not sourced

**Exposure by SOC major group** (`exposure: null`):

- The DfE report "The impact of AI on UK jobs and training" (November 2023) publishes AIOE scores only for 4-digit SOC 2010 unit groups. It has no major-group table and no employment counts.
- No later DfE or DSIT source with SOC 2020 major-group exposure was found.
- An aggregate by major group would be our own construction, so it is left out.
