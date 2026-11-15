#!/usr/bin/env python3
"""Build dashboard/src/data/ukContext.json for part 1 of the story.

Reads only the source files saved in analysis/story/raw/ (no network) and writes
official published values with their citations. See docs/story/part1-sources.md
for one entry per source.

Run from the repository root:  python3 dashboard/scripts/build_uk_context.py
Needs pandas + xlrd (for the ONS .xls download); everything else is stdlib.
"""

from __future__ import annotations

import csv
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "analysis" / "story" / "raw"
OUT = ROOT / "dashboard" / "src" / "data" / "ukContext.json"

FIRST_YEAR = 2010
FETCHED = "2026-11-15"

LFS_BULLETIN = ("https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
                "employmentandemployeetypes/bulletins/uklabourmarket/october2026")
LFS_CAVEAT = (
    "Labour Force Survey quality: in its October 2026 labour market bulletin (" + LFS_BULLETIN + ") the ONS "
    "says LFS response has improved and is now close to its pre-pandemic level, but that some volatility "
    "remains, particularly in estimates for mid-2023 and throughout 2024 and in detailed breakdowns with "
    "small samples, and advises users to focus on long-term movements rather than short-term changes. "
    "LFS estimates are official statistics; the ONS has told the Office for Statistics Regulation it will "
    "not seek reaccreditation for them and is prioritising the Transformed LFS as their replacement."
)
LFS_SHORT = "LFS estimate: the ONS advises caution with short-term changes (see notes)."


# ---------------------------------------------------------------- readers
def read_ons_csv(name: str, cdid: str) -> dict:
    """Parse an ONS timeseries CSV (generator?format=csv). Asserts the CDID header."""
    path = RAW / name
    meta, annual, quarterly, monthly = {}, {}, {}, {}
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if len(row) < 2:
                continue
            key, val = row[0].strip(), row[1].strip()
            if re.fullmatch(r"\d{4}", key):
                annual[int(key)] = float(val)
            elif re.fullmatch(r"\d{4} Q[1-4]", key):
                quarterly[key] = float(val)
            elif re.fullmatch(r"\d{4} [A-Z]{3}", key):
                monthly[key] = float(val)
            else:
                meta[key] = val
    if meta.get("CDID") != cdid:
        raise SystemExit(f"{name}: expected CDID {cdid}, got {meta.get('CDID')!r} (bad download?)")
    d, m, y = meta["Release date"].split("-")
    meta["released"] = f"{y}-{m}-{d}"
    return {"meta": meta, "annual": annual, "quarterly": quarterly, "monthly": monthly}


def annual_from(series: dict, first: int = FIRST_YEAR) -> tuple[list, list]:
    years = sorted(y for y in series["annual"] if y >= first)
    return years, [series["annual"][y] for y in years]


def last_item(d: dict):
    k = list(d)[-1]  # ONS CSVs are in chronological order
    return k, d[k]


MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July",
               "August", "September", "October", "November", "December"]


def lfs_period(label: str) -> str:
    """ONS labels rolling three-month LFS estimates by their middle month ('2026 JUL' = Jun-Aug 2026)."""
    year, mon = label.split()
    i = MONTHS.index(mon)
    y0, y1 = int(year) - (i == 0), int(year) + (i == 11)
    a, b = MONTH_NAMES[(i - 1) % 12], MONTH_NAMES[(i + 1) % 12]
    return f"{a} {y0} to {b} {y1}" if y0 != y1 else f"{a} to {b} {y1}"


def html_table_rows(body: str, caption: str) -> list[list[str]]:
    i = body.find(caption)
    if i < 0:
        raise SystemExit(f"table {caption!r} not found")
    j = body.find("</table>", i)
    rows = []
    for tr in re.findall(r"<tr.*?</tr>", body[i:j], re.S):
        cells = re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tr, re.S)
        rows.append([html.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in cells])
    return rows


# ---------------------------------------------------------------- build
def main() -> None:
    sources, series, facts, notes = {}, {}, {}, []

    # --- ONS timeseries
    ihyp = read_ons_csv("ons_ihyp.csv", "IHYP")
    lzvb = read_ons_csv("ons_lzvb.csv", "LZVB")
    lf24 = read_ons_csv("ons_lf24.csv", "LF24")
    mgsx = read_ons_csv("ons_mgsx.csv", "MGSX")
    dtwm = read_ons_csv("ons_dtwm.csv", "DTWM")
    ybha = read_ons_csv("ons_ybha.csv", "YBHA")

    def ons_source(sid, s, title, url, series_id):
        sources[sid] = {
            "title": title,
            "publisher": "Office for National Statistics",
            "released": s["meta"]["released"],
            "url": url,
            "series": series_id,
            "fetched": FETCHED,
        }

    gen = "https://www.ons.gov.uk/generator?format=csv&uri="
    ons_source("ons_ihyp", ihyp, ihyp["meta"]["Title"],
               gen + "/economy/grossdomesticproductgdp/timeseries/ihyp/pn2",
               "IHYP (ONS dataset PN2)")
    ons_source("ons_lzvb", lzvb, lzvb["meta"]["Title"],
               gen + "/employmentandlabourmarket/peopleinwork/labourproductivity/timeseries/lzvb/prdy",
               "LZVB (ONS dataset PRDY)")
    ons_source("ons_lf24", lf24, lf24["meta"]["Title"],
               gen + "/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/timeseries/lf24/lms",
               "LF24 (ONS dataset LMS)")
    ons_source("ons_mgsx", mgsx, mgsx["meta"]["Title"],
               gen + "/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms",
               "MGSX (ONS dataset LMS)")
    ons_source("ons_dtwm", dtwm, dtwm["meta"]["Title"],
               gen + "/economy/grossdomesticproductgdp/timeseries/dtwm/ukea", "DTWM (ONS dataset UKEA)")
    ons_source("ons_ybha", ybha, ybha["meta"]["Title"],
               gen + "/economy/grossdomesticproductgdp/timeseries/ybha/ukea", "YBHA (ONS dataset UKEA)")

    # Output
    x, y = annual_from(ihyp)
    series["gdp_growth"] = {
        "label": "Real GDP growth, calendar year",
        "unit": "%",
        "source": "ons_ihyp",
        "x": x, "y": y,
        "note": "Chained volume measure, percentage change on previous year. Latest years are open to revision.",
    }
    facts["gdp_growth_latest"] = {
        "label": "Real GDP growth",
        "value": y[-1], "unit": "%", "period": str(x[-1]), "source": "ons_ihyp",
        "note": "Calendar-year growth, chained volume measure.",
    }

    x, y = annual_from(lzvb, 2008)
    series["productivity_oph"] = {
        "label": "Output per hour worked, whole economy",
        "unit": "index",
        "source": "ons_lzvb",
        "x": x, "y": y,
        "note": "Index, 2023 = 100, annual. Output per hour is derived partly from LFS hours worked, so it carries the LFS quality caveat.",
    }
    q, v = last_item(lzvb["quarterly"])
    facts["productivity_oph_latest"] = {
        "label": "Output per hour worked, whole economy",
        "value": v, "unit": "index (2023 = 100)", "period": q, "source": "ons_lzvb",
        "note": "Latest quarter, seasonally adjusted.",
    }

    # Labour market
    for sid, s, label, fact_label in [
        ("employment_rate", lf24, "Employment rate, aged 16 to 64", "Employment rate, aged 16 to 64"),
        ("unemployment_rate", mgsx, "Unemployment rate, aged 16 and over", "Unemployment rate, aged 16 and over"),
    ]:
        src = "ons_lf24" if s is lf24 else "ons_mgsx"
        x, y = annual_from(s)
        series[sid] = {
            "label": label, "unit": "%", "source": src, "x": x, "y": y,
            "note": "Seasonally adjusted; annual values as published by the ONS. " + LFS_SHORT,
        }
        m, v = last_item(s["monthly"])
        facts[sid + "_latest"] = {
            "label": fact_label, "value": v, "unit": "%", "period": lfs_period(m), "source": src,
            "note": "Three-month average, seasonally adjusted. " + LFS_SHORT,
        }

    years = sorted(y for y in dtwm["annual"] if y >= FIRST_YEAR and y in ybha["annual"])
    share = [round(100 * dtwm["annual"][yr] / ybha["annual"][yr], 1) for yr in years]
    series["labour_share"] = {
        "label": "Compensation of employees as a share of GDP",
        "unit": "%",
        "source": "ons_dtwm",
        "x": years, "y": share,
        "note": "Computed here as 100 x DTWM / YBHA (both current prices, annual; YBHA from source ons_ybha), rounded to one decimal place. "
                "Excludes the labour income of the self-employed (mixed income), so it is lower than "
                "labour-share measures that adjust for self-employment.",
    }
    facts["labour_share_latest"] = {
        "label": "Compensation of employees as a share of GDP",
        "value": share[-1], "unit": "%", "period": str(years[-1]), "source": "ons_dtwm",
        "note": "Computed as 100 x DTWM / YBHA (YBHA from source ons_ybha), rounded to one decimal place.",
    }

    # --- OBR forecast (October 2026 EFO, Table A.1, GOV.UK HTML edition)
    obr = json.loads((RAW / "obr_efo_oct2026_govuk_content.json").read_text(encoding="utf-8"))
    assert obr["title"] == "Economic and fiscal outlook – October 2026", obr["title"]
    rows = html_table_rows(obr["details"]["body"], "Table A.1: Economy forecast")
    year_row = next(r for r in rows if r and r[1:2] == ["2025"])
    status_row = next(r for r in rows if "Outturn" in r)
    gdp_row = next(r for r in rows if r and r[0] == "GDP")
    yrs = [int(c) for c in year_row[1:] if c]
    vals = [float(c) for c in gdp_row[1:1 + len(yrs)]]
    assert status_row[1] == "Outturn" and status_row[2] == "Forecast", status_row
    fc = [(yr, v) for yr, v in zip(yrs, vals) if yr >= 2026]
    sources["obr_efo_oct2026"] = {
        "title": "Economic and fiscal outlook – October 2026 (Table A.1: Economy forecast)",
        "publisher": "Office for Budget Responsibility",
        "released": "2026-10-28",
        "url": "https://www.gov.uk/government/publications/october-2026-economic-and-fiscal-outlook/economic-and-fiscal-outlook-october-2026",
        "series": "Table A.1, row 'GDP' (percentage change on a year earlier)",
        "fetched": FETCHED,
    }
    series["obr_gdp_forecast"] = {
        "label": "OBR forecast of real GDP growth",
        "unit": "%",
        "source": "obr_efo_oct2026",
        "x": [yr for yr, _ in fc], "y": [v for _, v in fc],
        "note": "The OBR's central forecast, October 2026 Economic and fiscal outlook (presented 28 October 2026, "
                "corrected 30 October 2026). All years shown are forecasts, not outturns. The same table gives "
                f"{vals[0]}% as the OBR's 2025 outturn; the later ONS estimate (IHYP) differs, so the two are not spliced.",
    }

    # --- BICS
    import pandas as pd  # noqa: E402  (only needed for the .xls)

    bics = pd.read_excel(RAW / "ons_bics_w165_fig1.xls", header=None)
    title = str(bics.iat[0, 0])
    assert title.startswith("Figure 1:") and "AI technology" in title, title
    hdr = next(i for i in range(len(bics)) if str(bics.iat[i, 0]).strip() == "Date")
    cols = [str(c).strip() for c in bics.iloc[hdr]]
    body = bics.iloc[hdr + 1:].dropna(subset=[0])
    c_all, c_10 = cols.index("All industries"), cols.index("All size bands excluding 0 to 9")
    dates = [str(d).strip() for d in body[0]]
    all_vals = [float(v) for v in body[c_all]]
    ten_vals = [float(v) for v in body[c_10]]
    sources["ons_bics_w165"] = {
        "title": "Business insights and impact on the UK economy: 8 October 2026 (BICS Wave 165), Figure 1 data",
        "publisher": "Office for National Statistics",
        "released": "2026-10-08",
        "url": "https://www.ons.gov.uk/generator?uri=/businessindustryandtrade/business/businessservices/bulletins/businessinsightsandimpactontheukeconomy/8october2026/a52309bf&format=xls",
        "series": "Figure 1: current use of at least one AI technology, by size band, weighted by count",
        "fetched": FETCHED,
    }
    q_text = "Which of the following artificial intelligence technologies, if any, does your business currently use?"
    q_options = ["Autonomous vehicles", "Data processing using machine learning",
                 "Image processing using machine learning", "Robotics",
                 "Text generation using Large Language Models", "Visual content creation",
                 "Other (Please describe)", "Not sure",
                 "Business does not currently use artificial intelligence technologies"]
    qpage = html.unescape(re.sub(r"<[^>]+>", "\n", (RAW / "ons_bics_w165_questions.html").read_text(encoding="utf-8")))
    qlines = [ln.strip() for ln in qpage.splitlines() if ln.strip()]
    qi = qlines.index(q_text)  # raises if the wording is not in the saved questions page
    assert qlines[qi + 1:qi + 1 + len(q_options)] == q_options, qlines[qi:qi + 12]
    question = "\"" + q_text + "\" Options: " + "; ".join(q_options)
    bics_note = ("Business Insights and Conditions Survey, private-sector businesses in the industries BICS covers "
                 "(it excludes, among others, agriculture, finance and insurance, and public administration), "
                 "weighted by count of businesses. Survey question: " + question + ". Dates are the midpoint of each wave.")
    series["business_ai_use"] = {
        "label": "Businesses using at least one AI technology, all sizes",
        "unit": "%", "source": "ons_bics_w165", "x": dates, "y": all_vals, "note": bics_note,
    }
    series["business_ai_use_10plus"] = {
        "label": "Businesses using at least one AI technology, 10 or more employees",
        "unit": "%", "source": "ons_bics_w165", "x": dates, "y": ten_vals, "note": bics_note,
    }
    facts["business_ai_use"] = {
        "label": "Businesses using at least one AI technology",
        "value": all_vals[-1], "unit": "%", "period": "September 2026 (Wave 165, 21 September to 4 October 2026)",
        "source": "ons_bics_w165",
        "note": "All size bands; the ONS bulletin rounds this to 30%. " + bics_note,
    }
    facts["business_ai_use_10plus"] = {
        "label": "Businesses with 10 or more employees using at least one AI technology",
        "value": ten_vals[-1], "unit": "%", "period": "September 2026 (Wave 165, 21 September to 4 October 2026)",
        "source": "ons_bics_w165",
        "note": "The ONS bulletin rounds this to 38%. " + bics_note,
    }

    # --- DSIT / AISI (reporting IMF estimates): share of workers by AI exposure
    dsit = json.loads((RAW / "dsit_ai_capabilities_2026_govuk_content.json").read_text(encoding="utf-8"))
    rows = html_table_rows(dsit["details"]["body"], "Figure 2")
    head = next(r for r in rows if r and r[0] == "Advanced economies")
    uk = next(r for r in rows if r and r[0] == "UK")
    pct = {h: float(v.rstrip("%")) for h, v in zip(head[1:], uk[1:]) if v}
    sources["dsit_ai_capabilities_2026"] = {
        "title": "Assessment of AI capabilities and the impact on the UK labour market (Figure 2, citing IMF, "
                 "Gen-AI: Artificial Intelligence and the Future of Work, January 2024)",
        "publisher": "Department for Science, Innovation and Technology and AI Security Institute",
        "released": dsit["first_published_at"][:10],
        "url": "https://www.gov.uk/government/publications/assessment-of-ai-capabilities-and-the-impact-on-the-uk-labour-market/assessment-of-ai-capabilities-and-the-impact-on-the-uk-labour-market",
        "series": "Figure 2 table, row 'UK'",
        "fetched": FETCHED,
    }
    imf_note = ("IMF estimates as reported by DSIT/AISI. DSIT: the IMF measures exposure using an index of the "
                "correspondence between AI applications and the human abilities each occupation requires; its "
                "complementarity assessment is based on the social and physical context of work, and in "
                "high-complementarity roles AI may be more likely to boost efficiency and productivity. DSIT notes "
                "such indices are indicative rather than precise. The two high-exposure groups sum to "
                f"{pct['High exposure, High complementarity'] + pct['High exposure, Low complementarity']:g}%; "
                "the DSIT text says 'around 70%'.")
    for fid, key, label in [
        ("workers_high_exposure_high_complementarity", "High exposure, High complementarity",
         "Workers in occupations with high AI exposure and high complementarity"),
        ("workers_high_exposure_low_complementarity", "High exposure, Low complementarity",
         "Workers in occupations with high AI exposure and low complementarity"),
        ("workers_low_exposure", "Low exposure", "Workers in occupations with low AI exposure"),
    ]:
        facts[fid] = {"label": label, "value": pct[key], "unit": "% of workers", "period": "IMF estimate, January 2024",
                      "source": "dsit_ai_capabilities_2026", "note": imf_note}

    notes += [
        "Official published data only; no PolicyEngine modelling. The OBR series is the OBR's own forecast.",
        LFS_CAVEAT,
        "LFS rolling three-month estimates are labelled in ONS files by their middle month; periods here are given as the full three months.",
        "GDP and productivity figures are revised as new data arrive; values are as published on the release dates in 'sources'.",
        "The OBR October 2026 EFO gives 2025 GDP growth of 1.3% (its outturn at the time); the ONS series IHYP, "
        "released 12 November 2026, gives 1.2%. The difference is a data vintage, not a forecast.",
        "Compensation of employees as a share of GDP is the only computed series (a ratio of two ONS series); it is not the ONS's self-employment-adjusted labour share.",
        "Exposure by SOC major group is null: the DfE report 'The impact of AI on UK jobs and training' (November 2023) "
        "publishes AIOE scores only for 4-digit SOC 2010 unit groups with no major-group table or employment counts, "
        "and no later DfE/DSIT source with SOC 2020 major-group scores was found. Aggregating the unit-group scores "
        "ourselves (for example an unweighted mean by major group) is possible but would be our own construction on SOC 2010.",
        "BICS covers private-sector businesses in selected industries; results for businesses with 0 to 9 employees carry large survey weights, so the ONS often headlines the 10-or-more-employees figure.",
    ]

    out = {
        "generated_by": "dashboard/scripts/build_uk_context.py",
        "sources": sources,
        "series": series,
        "facts": facts,
        "exposure": None,
        "notes": notes,
    }
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(series)} series, {len(facts)} facts, {len(sources)} sources")


if __name__ == "__main__":
    main()
