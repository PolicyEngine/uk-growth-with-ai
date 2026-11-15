#!/usr/bin/env python3
"""Build dashboard/src/data/ukContext.json and ukContextChecks.json for part 1 of the story.

Official published data only, with their citations. See docs/story/part1-sources.md.

    python3 dashboard/scripts/build_uk_context.py            # download the latest releases, then build
    python3 dashboard/scripts/build_uk_context.py --offline  # build from the cached raw files only

Online, every ONS series is resolved to its latest release at run time: the
dataset-less ONS timeseries endpoint (/<topic>/timeseries/<cdid>/data) names
the dataset that holds the newest release (for GDP, PN2 after a first
estimate, QNA after the quarterly national accounts), and the builder then
downloads that dataset's CSV from the ONS generator. Every downloaded file is
checked (CDID header, JSON parse, spreadsheet signature) before it is written
to analysis/story/raw/ under a name that carries its release date, so an error
page never replaces a good cached file. analysis/story/raw/manifest.json
records, for each source, the file used, its URL, release date, fetch date and
sha256; --offline reads only that manifest and those files, and reproduces the
same output byte for byte.

Two outputs:
- ukContext.json: series and facts, read from the ONS generator CSVs, the OBR
  EFO's HTML Table A.1, the BICS figure spreadsheet (pandas) and the DSIT HTML
  table.
- ukContextChecks.json: one entry per figure part 1 prints, with the value
  read a second way from a primary file (the ONS /data JSON rather than the
  CSV; the OBR's own Annex A and detailed economy spreadsheets rather than the
  HTML; the BICS spreadsheet through xlrd directly; the DSIT table by a second
  parser). Any disagreement with ukContext.json is printed here and fails
  dashboard/scripts/checks/part1.py.

Needs pandas, xlrd and openpyxl; everything else is stdlib.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import html
import io
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "analysis" / "story" / "raw"
MANIFEST = RAW / "manifest.json"
OUT = ROOT / "dashboard" / "src" / "data" / "ukContext.json"
CHECKS_OUT = ROOT / "dashboard" / "src" / "data" / "ukContextChecks.json"

ONS = "https://www.ons.gov.uk"
GEN = ONS + "/generator?format=csv&uri="
UA = "Mozilla/5.0 (compatible; data-builder/1.0)"
try:  # python.org builds of Python ship without CA certificates
    import certifi

    SSL = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL = ssl.create_default_context()

FIRST_YEAR = 2010
GDP_Q_FROM = "2022 Q1"  # the recent window for quarterly GDP growth (after the pandemic swings)

# key -> (CDID, topic path). The dataset is resolved at run time.
ONS_SERIES = {
    "ihyp": ("IHYP", "/economy/grossdomesticproductgdp"),
    "ihyq": ("IHYQ", "/economy/grossdomesticproductgdp"),
    "ihyr": ("IHYR", "/economy/grossdomesticproductgdp"),
    "lzvb": ("LZVB", "/employmentandlabourmarket/peopleinwork/labourproductivity"),
    "lf24": ("LF24", "/employmentandlabourmarket/peopleinwork/employmentandemployeetypes"),
    "mgsx": ("MGSX", "/employmentandlabourmarket/peoplenotinwork/unemployment"),
    "kai9": ("KAI9", "/employmentandlabourmarket/peopleinwork/earningsandworkinghours"),
    "dtwm": ("DTWM", "/economy/grossdomesticproductgdp"),
    "ybha": ("YBHA", "/economy/grossdomesticproductgdp"),
}

OBR_EFO = "October 2026"
OBR_DOWNLOADS = {
    "obr_annex_a": "https://obr.uk/download/october-2026-economic-and-fiscal-outlook-charts-and-tables-annex-a/",
    "obr_economy_tables": "https://obr.uk/download/october-2026-economic-and-fiscal-outlook-detailed-forecast-tables-economy/",
}
OBR_GOVUK_PAGE = ("https://www.gov.uk/government/publications/october-2026-economic-and-fiscal-outlook/"
                  "economic-and-fiscal-outlook-october-2026")
DSIT_PAGE = ("https://www.gov.uk/government/publications/assessment-of-ai-capabilities-and-the-impact-on-the-uk-labour-market/"
             "assessment-of-ai-capabilities-and-the-impact-on-the-uk-labour-market")
BICS_BULLETINS = ONS + "/businessindustryandtrade/business/businessservices/bulletins/businessinsightsandimpactontheukeconomy/"
BICS_FIRST = "8october2026"  # Wave 165; the builder follows "Next release" links from the newest cached bulletin
LMS_BULLETIN = ONS + "/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/"

MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July",
               "August", "September", "October", "November", "December"]


# ================================================================ download
def http_get(url: str, tries: int = 4) -> bytes:
    """GET with a pause between requests and backoff on rate limits (ONS returns 429 / Cloudflare 1015)."""
    for i in range(tries):
        time.sleep(1.5)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=60, context=SSL) as r:
                body = r.read()
            if b"error code: 1015" in body[:200]:
                raise urllib.error.HTTPError(url, 429, "rate limited", None, None)
            return body
        except urllib.error.HTTPError as e:
            if e.code == 404 or i == tries - 1:
                raise
            wait = 30 * (i + 1)
            print(f"  {e.code} from {url}; retrying in {wait}s", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("unreachable")


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def save(name: str, body: bytes) -> str:
    (RAW / name).write_bytes(body)
    return name


def london_date(iso: str) -> str:
    """ONS JSON gives release dates as UTC instants of London midnight ('2026-10-19T23:00:00.000Z' = 20 October)."""
    t = dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return (t + dt.timedelta(hours=12)).date().isoformat()


def csv_meta(text: str) -> dict:
    meta = {}
    for row in csv.reader(io.StringIO(text)):
        if len(row) >= 2 and not re.match(r"\d{4}", row[0]):
            meta[row[0].strip()] = row[1].strip()
    return meta


def dmy(s: str) -> str:
    d, m, y = s.split("-")
    return f"{y}-{m}-{d}"


def long_date(s: str) -> str:
    """'8 October 2026' -> '2026-10-08'."""
    d, mon, y = s.split()
    return f"{y}-{MONTH_NAMES.index(mon) + 1:02d}-{int(d):02d}"


def _page_text(h: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h)))


def _release_date(h: str) -> str | None:
    m = re.search(r"Release date: (\d{1,2} \w+ \d{4})", _page_text(h))
    return long_date(m.group(1)) if m else None


def refresh(today: str) -> dict:
    """Download the latest release of every source into RAW and return the new manifest."""
    old = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"files": {}}
    files = {}

    for key, (cdid, topic) in ONS_SERIES.items():
        j_url = f"{ONS}{topic}/timeseries/{cdid.lower()}/data"
        jb = http_get(j_url)
        desc = json.loads(jb)["description"]  # raises on an error page
        assert desc["cdid"] == cdid, (key, desc["cdid"])
        ds = desc["datasetId"].lower()
        c_url = f"{GEN}{topic}/timeseries/{cdid.lower()}/{ds}"
        cb = http_get(c_url)
        meta = csv_meta(cb.decode("utf-8"))
        assert meta.get("CDID") == cdid and meta.get("Source dataset ID", "").lower() == ds, (key, meta)
        released = dmy(meta["Release date"])
        assert released == london_date(desc["releaseDate"]), (key, released, desc["releaseDate"])
        base = f"ons_{key}_{ds}_{released}"
        files[key] = {
            "file": save(base + ".csv", cb), "sha256": sha256(cb), "url": c_url,
            "json_file": save(base + ".json", jb), "json_sha256": sha256(jb), "json_url": j_url,
            "dataset": desc["datasetId"], "released": released, "next_release": meta.get("Next release", ""),
            "fetched": today,
        }
        print(f"  {cdid}: {desc['datasetId']} released {released}")

    # OBR: the EFO's own spreadsheets, and the GOV.UK HTML editions of the EFO and the DSIT report
    for key, url in OBR_DOWNLOADS.items():
        b = http_get(url)
        assert b[:2] == b"PK", f"{key}: not an xlsx"
        files[key] = {"file": save(f"{key}_oct2026.xlsx", b), "sha256": sha256(b), "url": url,
                      "released": "2026-10-28", "fetched": today}
    for key, page, name in [("obr_efo_govuk", OBR_GOVUK_PAGE, "obr_efo_oct2026_govuk_content.json"),
                            ("dsit_govuk", DSIT_PAGE, "dsit_ai_capabilities_2026_govuk_content.json")]:
        api = page.replace("https://www.gov.uk/", "https://www.gov.uk/api/content/")
        b = http_get(api)
        d = json.loads(b)
        files[key] = {"file": save(name, b), "sha256": sha256(b), "url": page, "api_url": api,
                      "released": "2026-10-28" if key == "obr_efo_govuk" else d["first_published_at"][:10],
                      "govuk_first_published": d["first_published_at"][:10], "fetched": today}

    # Labour market bulletin (the LFS caveat, and the period labels of LFS and AWE series)
    lm = old["files"].get("lms_bulletin", {})
    slugs = [f"{MONTH_NAMES[m].lower()}{y}" for y, m in _months_back(today, 2)]
    for slug in slugs:
        try:
            b = http_get(LMS_BULLETIN + slug)
        except urllib.error.HTTPError:
            continue
        rel = _release_date(b.decode("utf-8", "replace"))
        if rel and rel > lm.get("released", ""):
            lm = {"file": save(f"ons_labour_market_{slug}.html", b), "sha256": sha256(b),
                  "url": LMS_BULLETIN + slug, "slug": slug, "released": rel, "fetched": today}
        break
    files["lms_bulletin"] = lm

    # BICS: follow "Next release" from the newest cached bulletin; keep the newest with the AI-use figure
    files.update(refresh_bics(old["files"], today))
    files["bics_questions"] = old["files"].get("bics_questions") or {
        "file": "ons_bics_w165_questions.html",
        "url": ("https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/conditionsanddiseases/"
                "articles/businessimpactofcovid19surveyquestions/21september2026to4october2026"),
        "released": "2026-10-05", "fetched": "2026-11-15",
        "sha256": sha256((RAW / "ons_bics_w165_questions.html").read_bytes()),
    }
    man = {"note": "Files used by dashboard/scripts/build_uk_context.py; --offline reads only these.", "files": files}
    MANIFEST.write_text(json.dumps(man, indent=2) + "\n")
    return man


def _months_back(today: str, n: int):
    y, m = int(today[:4]), int(today[5:7]) - 1
    for _ in range(n):
        yield y, m
        m -= 1
        if m < 0:
            y, m = y - 1, 11


def _ai_figure_link(h: str) -> str | None:
    """The xls link of the bulletin's 'using at least one ... AI technology' figure, if it has one."""
    for m in re.finditer(r"<h3[^>]*>\s*(Figure \d+:[^<]*)</h3>", h):
        if re.search(r"using at least one (type of )?AI technolog", html.unescape(m.group(1))):
            link = re.search(r'generator\?uri=([^"&]+)(?:&amp;|&)format=xls', h[m.end():])
            return link.group(1) if link else None
    return None


def refresh_bics(old: dict, today: str) -> dict:
    slug = old.get("bics_bulletin", {}).get("slug", BICS_FIRST)
    best, seen = None, 0
    while slug and seen < 12:
        seen += 1
        try:
            b = http_get(BICS_BULLETINS + slug)
        except urllib.error.HTTPError:
            break
        h = b.decode("utf-8", "replace")
        link = _ai_figure_link(h)
        if link:
            best = (slug, b, h, link)
        nxt = re.search(r"Next release: (\d{1,2} \w+ \d{4})", _page_text(h))
        if not nxt or long_date(nxt.group(1)) > today:
            break
        d, mon, y = nxt.group(1).split()
        slug = f"{int(d)}{mon.lower()}{y}"
    if not best:
        return {k: old[k] for k in ("bics_bulletin", "bics_figure") if k in old}
    slug, b, h, link = best
    wave = re.search(r"Wave (\d+) of the Business Insights", _page_text(h)).group(1)
    rel = _release_date(h)
    url = f"{ONS}/generator?uri={link}&format=xls"
    xb = http_get(url)
    assert xb[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1", "BICS figure: not an .xls"
    return {
        "bics_bulletin": {"file": save(f"ons_bics_w{wave}_bulletin.html", b), "sha256": sha256(b),
                          "url": BICS_BULLETINS + slug, "slug": slug, "wave": int(wave), "released": rel, "fetched": today},
        "bics_figure": {"file": save(f"ons_bics_w{wave}_fig1.xls", xb), "sha256": sha256(xb), "url": url,
                        "wave": int(wave), "released": rel, "fetched": today},
    }


# ================================================================ readers
def checked(f: dict, key: str = "file", sha: str = "sha256") -> Path:
    p = RAW / f[key]
    if sha in f:
        assert sha256(p.read_bytes()) == f[sha], f"{f[key]}: sha256 differs from the manifest"
    return p


def read_ons_csv(f: dict, cdid: str) -> dict:
    """Parse an ONS generator CSV. Asserts the CDID header and the sha256 in the manifest."""
    meta, annual, quarterly, monthly = {}, {}, {}, {}
    for row in csv.reader(io.StringIO(checked(f).read_text(encoding="utf-8"))):
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
        raise SystemExit(f"{f['file']}: expected CDID {cdid}, got {meta.get('CDID')!r} (bad download?)")
    return {"meta": meta, "annual": annual, "quarterly": quarterly, "monthly": monthly}


def last_item(d: dict):
    k = list(d)[-1]  # ONS CSVs are in chronological order
    return k, d[k]


def lfs_period(label: str) -> str:
    """LFS rolling three-month estimates are labelled by their middle month ('2026 JUL' = June to August 2026)."""
    year, mon = label.split()
    i = MONTHS.index(mon)
    y0, y1 = int(year) - (i == 0), int(year) + (i == 11)
    a, b = MONTH_NAMES[(i - 1) % 12], MONTH_NAMES[(i + 1) % 12]
    return f"{a} {y0} to {b} {y1}" if y0 != y1 else f"{a} to {b} {y1}"


def awe_period(label: str) -> str:
    """AWE three-month averages are labelled by their last month ('2026 AUG' = June to August 2026)."""
    year, mon = label.split()
    i = MONTHS.index(mon)
    return lfs_period(f"{int(year) - (i == 0)} {MONTHS[(i - 1) % 12]}")


def t_month(label: str, offset: int = 0) -> float:
    """Decimal year at the middle of the labelled month, shifted by `offset` months."""
    year, mon = label.split()
    m = int(year) * 12 + MONTHS.index(mon) + offset
    return round(m // 12 + (m % 12 + 0.5) / 12, 4)


def t_quarter(label: str) -> float:
    year, q = label.split()
    return round(int(year) + (int(q[1]) - 0.5) / 4, 4)


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


# ================================================================ build
LFS_SHORT = "LFS estimate: the ONS advises caution with short-term changes (see notes)."


def build(man: dict) -> dict:
    F = man["files"]
    sources, series, facts = {}, {}, {}
    s = {k: read_ons_csv(F[k], cdid) for k, (cdid, _) in ONS_SERIES.items()}

    for key, (cdid, _) in ONS_SERIES.items():
        f = F[key]
        sources[f"ons_{key}"] = {
            "title": s[key]["meta"]["Title"],
            "publisher": "Office for National Statistics",
            "released": f["released"],
            "url": f["url"],
            "series": f"{cdid} (ONS dataset {f['dataset']})",
            "fetched": f["fetched"],
        }

    # --- Output: annual growth (full years), and the latest quarters
    ihyp, ihyq, ihyr = s["ihyp"], s["ihyq"], s["ihyr"]
    years = sorted(y for y in ihyp["annual"] if y >= FIRST_YEAR)
    series["gdp_growth"] = {
        "label": "Real GDP growth, calendar year", "unit": "%", "source": "ons_ihyp",
        "x": years, "y": [ihyp["annual"][y] for y in years],
        "note": "Chained volume measure, percentage change on the previous calendar year. Full calendar years only; "
                f"{years[-1]} is the latest complete year. Latest years are open to revision.",
    }
    facts["gdp_growth_latest"] = {
        "label": "Real GDP growth", "value": ihyp["annual"][years[-1]], "unit": "%", "period": str(years[-1]),
        "source": "ons_ihyp", "note": "Calendar-year growth, chained volume measure.",
    }
    qs = [q for q in ihyq["quarterly"] if q >= GDP_Q_FROM]
    series["gdp_quarterly"] = {
        "label": "Real GDP growth, quarter on previous quarter", "unit": "%", "source": "ons_ihyq",
        "x": qs, "y": [ihyq["quarterly"][q] for q in qs],
        "note": "Chained volume measure, seasonally adjusted, percentage change on the previous quarter. "
                "The latest quarter is a first estimate.",
    }
    q, v = last_item(ihyq["quarterly"])
    facts["gdp_quarterly_latest"] = {
        "label": "Real GDP growth, quarter on previous quarter", "value": v, "unit": "%", "period": q,
        "source": "ons_ihyq", "note": "Seasonally adjusted, chained volume measure; first estimate.",
    }
    q2, v2 = last_item(ihyr["quarterly"])
    assert q2 == q, (q, q2)
    facts["gdp_quarterly_yoy"] = {
        "label": "Real GDP growth, quarter on the same quarter a year earlier", "value": v2, "unit": "%",
        "period": q2, "source": "ons_ihyr", "note": "Seasonally adjusted, chained volume measure; first estimate.",
    }

    # --- Productivity: quarterly
    lz = s["lzvb"]
    qs = [q for q in lz["quarterly"] if q >= "2008 Q1"]
    series["productivity_oph"] = {
        "label": "Output per hour worked, whole economy", "unit": "index", "source": "ons_lzvb",
        "x": qs, "t": [t_quarter(q) for q in qs], "y": [lz["quarterly"][q] for q in qs],
        "note": "Index, 2023 = 100, quarterly, seasonally adjusted. Output per hour is derived partly from LFS hours "
                "worked, so it carries the LFS quality caveat.",
    }
    q, v = last_item(lz["quarterly"])
    facts["productivity_oph_latest"] = {
        "label": "Output per hour worked, whole economy", "value": v, "unit": "index (2023 = 100)", "period": q,
        "source": "ons_lzvb", "note": "Latest quarter, seasonally adjusted.",
    }

    # --- Labour market and pay: rolling three-month estimates, one per month
    for sid, key, label, period_of, offset, note in [
        ("employment_rate", "lf24", "Employment rate, aged 16 to 64", lfs_period, 0,
         "Three-month average, seasonally adjusted. " + LFS_SHORT),
        ("unemployment_rate", "mgsx", "Unemployment rate, aged 16 and over", lfs_period, 0,
         "Three-month average, seasonally adjusted. " + LFS_SHORT),
        ("pay_growth", "kai9", "Regular pay growth, whole economy", awe_period, -1,
         "Average weekly earnings, regular pay (excluding bonuses and arrears), three-month average on the same "
         "period a year earlier, seasonally adjusted, nominal (not adjusted for inflation). From the Monthly Wages "
         "and Salaries Survey of employers, not the LFS."),
    ]:
        m = s[key]["monthly"]
        labels = [k for k in m if int(k[:4]) >= FIRST_YEAR]
        series[sid] = {
            "label": label, "unit": "%", "source": f"ons_{key}",
            "x": labels, "t": [t_month(k, offset) for k in labels], "y": [m[k] for k in labels],
            "first": period_of(labels[0]), "last": period_of(labels[-1]),
            "note": note + " Points are placed at the middle month of each three-month period.",
        }
        k, v = last_item(m)
        facts[sid + "_latest"] = {
            "label": label, "value": v, "unit": "%", "period": period_of(k), "source": f"ons_{key}", "note": note,
        }

    # --- Compensation of employees / GDP: annual, ends at the latest full year
    dtwm, ybha = s["dtwm"], s["ybha"]
    years = sorted(y for y in dtwm["annual"] if y >= FIRST_YEAR and y in ybha["annual"])
    share = [round(100 * dtwm["annual"][yr] / ybha["annual"][yr], 1) for yr in years]
    series["labour_share"] = {
        "label": "Compensation of employees as a share of GDP", "unit": "%", "source": "ons_dtwm",
        "x": years, "y": share,
        "note": "Computed here as 100 x DTWM / YBHA (both current prices, annual; YBHA from source ons_ybha), rounded "
                f"to one decimal place. Annual series; {years[-1]} is the latest full calendar year (the quarterly "
                "accounts cover only part of the current year). Excludes the labour income of the self-employed "
                "(mixed income), so it is lower than labour-share measures that adjust for self-employment.",
    }
    facts["labour_share_latest"] = {
        "label": "Compensation of employees as a share of GDP", "value": share[-1], "unit": "%",
        "period": str(years[-1]), "source": "ons_dtwm",
        "note": "Computed as 100 x DTWM / YBHA (YBHA from source ons_ybha), rounded to one decimal place.",
    }

    # --- OBR forecast (Table A.1, GOV.UK HTML edition of the EFO)
    fo = F["obr_efo_govuk"]
    obr = json.loads(checked(fo).read_text(encoding="utf-8"))
    assert obr["title"] == f"Economic and fiscal outlook – {OBR_EFO}", obr["title"]
    rows = html_table_rows(obr["details"]["body"], "Table A.1: Economy forecast")
    year_row = next(r for r in rows if r and r[1:2] == ["2025"])
    status_row = next(r for r in rows if "Outturn" in r)
    gdp_row = next(r for r in rows if r and r[0] == "GDP")
    yrs = [int(c) for c in year_row[1:] if c]
    vals = [float(c) for c in gdp_row[1:1 + len(yrs)]]
    assert status_row[1] == "Outturn" and status_row[2] == "Forecast", status_row
    fc = [(yr, v) for yr, v in zip(yrs, vals) if yr >= 2026]
    sources["obr_efo_oct2026"] = {
        "title": f"Economic and fiscal outlook – {OBR_EFO} (Table A.1: Economy forecast)",
        "publisher": "Office for Budget Responsibility",
        "released": "2026-10-28",
        "url": OBR_GOVUK_PAGE,
        "series": "Table A.1, row 'GDP' (percentage change on a year earlier)",
        "fetched": fo["fetched"],
    }
    series["obr_gdp_forecast"] = {
        "label": "OBR forecast of real GDP growth", "unit": "%", "source": "obr_efo_oct2026",
        "x": [yr for yr, _ in fc], "y": [v for _, v in fc],
        "note": f"The OBR's central forecast, {OBR_EFO} Economic and fiscal outlook (presented 28 October 2026, "
                "corrected 30 October 2026). All years shown are forecasts, not outturns. The same table gives "
                f"{vals[0]}% as the OBR's 2025 outturn; the later ONS estimate (IHYP) differs, so the two are not spliced.",
    }

    # --- BICS
    import pandas as pd  # noqa: E402  (only needed for the .xls)

    fb, fbb = F["bics_figure"], F["bics_bulletin"]
    bics = pd.read_excel(checked(fb), header=None)
    title = str(bics.iat[0, 0])
    assert title.startswith("Figure 1:") and "AI technology" in title, title
    hdr = next(i for i in range(len(bics)) if str(bics.iat[i, 0]).strip() == "Date")
    cols = [str(c).strip() for c in bics.iloc[hdr]]
    body = bics.iloc[hdr + 1:].dropna(subset=[0])
    c_all, c_10 = cols.index("All industries"), cols.index("All size bands excluding 0 to 9")
    dates = [str(d).strip() for d in body[0]]
    all_vals = [float(v) for v in body[c_all]]
    ten_vals = [float(v) for v in body[c_10]]
    btext = _page_text(checked(fbb).read_text(encoding="utf-8"))
    wave = fbb["wave"]
    live = re.search(rf"Wave {wave} survey was live for the period (\d+ \w+(?: \d{{4}})?) to (\d+ \w+ \d{{4}})", btext)
    month_txt = re.search(r"Figure 1:[^.]*? in (\w+ \d{4})", btext).group(1)
    rel = dt.date.fromisoformat(fbb["released"])
    sources["ons_bics"] = {
        "title": f"Business insights and impact on the UK economy: {rel.day} {MONTH_NAMES[rel.month - 1]} {rel.year} "
                 f"(BICS Wave {wave}), Figure 1 data",
        "publisher": "Office for National Statistics",
        "released": fb["released"],
        "url": fb["url"],
        "series": "Figure 1: current use of at least one AI technology, by size band, weighted by count",
        "fetched": fb["fetched"],
    }
    q_text = "Which of the following artificial intelligence technologies, if any, does your business currently use?"
    q_options = ["Autonomous vehicles", "Data processing using machine learning",
                 "Image processing using machine learning", "Robotics",
                 "Text generation using Large Language Models", "Visual content creation",
                 "Other (Please describe)", "Not sure",
                 "Business does not currently use artificial intelligence technologies"]
    qpage = html.unescape(re.sub(r"<[^>]+>", "\n", checked(F["bics_questions"]).read_text(encoding="utf-8")))
    qlines = [ln.strip() for ln in qpage.splitlines() if ln.strip()]
    qi = qlines.index(q_text)  # raises if the wording is not in the saved questions page
    assert qlines[qi + 1:qi + 1 + len(q_options)] == q_options, qlines[qi:qi + 12]
    question = "\"" + q_text + "\" Options: " + "; ".join(q_options)
    bics_note = ("Business Insights and Conditions Survey, private-sector businesses in the industries BICS covers "
                 "(it excludes, among others, agriculture, finance and insurance, and public administration), "
                 "weighted by count of businesses. Survey question: " + question + ". Dates are the midpoint of each wave.")
    for sid, lab, vv in [("business_ai_use", "all sizes", all_vals), ("business_ai_use_10plus", "10 or more employees", ten_vals)]:
        series[sid] = {"label": f"Businesses using at least one AI technology, {lab}", "unit": "%",
                       "source": "ons_bics", "x": dates, "y": vv, "note": bics_note}
    period = f"{month_txt} (Wave {wave}, {live.group(1)} to {live.group(2)})"
    facts["business_ai_use"] = {
        "label": "Businesses using at least one AI technology", "value": all_vals[-1], "unit": "%",
        "period": period, "source": "ons_bics", "note": "All size bands. " + bics_note,
    }
    facts["business_ai_use_10plus"] = {
        "label": "Businesses with 10 or more employees using at least one AI technology", "value": ten_vals[-1],
        "unit": "%", "period": period, "source": "ons_bics", "note": bics_note,
    }

    # --- DSIT / AISI (reporting IMF estimates)
    fd = F["dsit_govuk"]
    dsit = json.loads(checked(fd).read_text(encoding="utf-8"))
    rows = html_table_rows(dsit["details"]["body"], "Figure 2")
    head = next(r for r in rows if r and r[0] == "Advanced economies")
    uk = next(r for r in rows if r and r[0] == "UK")
    pct = {h: float(v.rstrip("%")) for h, v in zip(head[1:], uk[1:]) if v}
    sources["dsit_ai_capabilities_2026"] = {
        "title": "Assessment of AI capabilities and the impact on the UK labour market (Figure 2, citing IMF, "
                 "Gen-AI: Artificial Intelligence and the Future of Work, January 2024)",
        "publisher": "Department for Science, Innovation and Technology and AI Security Institute",
        "released": dsit["first_published_at"][:10],
        "url": DSIT_PAGE,
        "series": "Figure 2 table, row 'UK'",
        "fetched": fd["fetched"],
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

    lm = F["lms_bulletin"]
    lfs_caveat = (
        f"Labour Force Survey quality: in its labour market bulletin released {lm['released']} ({lm['url']}) the ONS "
        "says LFS response has improved and is now close to its pre-pandemic level, but that some volatility "
        "remains, particularly in estimates for mid-2023 and throughout 2024 and in detailed breakdowns with "
        "small samples, and advises users to focus on long-term movements rather than short-term changes. "
        "LFS estimates are official statistics; the ONS has told the Office for Statistics Regulation it will "
        "not seek reaccreditation for them and is prioritising the Transformed LFS as their replacement."
    )
    notes = [
        "Official published data only; no PolicyEngine modelling. The OBR series is the OBR's own forecast.",
        lfs_caveat,
        "LFS rolling three-month estimates are labelled in ONS files by their middle month, and AWE three-month "
        "averages by their last month; periods here are given as the full three months.",
        "GDP and productivity figures are revised as new data arrive; values are as published on the release dates in 'sources'.",
        f"The OBR October 2026 EFO gives 2025 GDP growth of {vals[0]}% (its outturn at the time); the ONS series IHYP gives "
        f"{ihyp['annual'][2025]}%. The difference is a data vintage, not a forecast.",
        "Calendar-year series (GDP growth, compensation of employees as a share of GDP) end at the latest full year; "
        "the current year appears only in the quarterly and monthly series, labelled by its quarters or months.",
        "Compensation of employees as a share of GDP is the only computed series (a ratio of two ONS series); it is not the ONS's self-employment-adjusted labour share.",
        "Exposure by SOC major group is null: the DfE report 'The impact of AI on UK jobs and training' (November 2023) "
        "publishes AIOE scores only for 4-digit SOC 2010 unit groups with no major-group table or employment counts, "
        "and no later DfE/DSIT source with SOC 2020 major-group scores was found. Aggregating the unit-group scores "
        "ourselves (for example an unweighted mean by major group) is possible but would be our own construction on SOC 2010.",
        "BICS covers private-sector businesses in selected industries; results for businesses with 0 to 9 employees carry large survey weights, so the ONS often headlines the 10-or-more-employees figure.",
    ]
    return {"generated_by": "dashboard/scripts/build_uk_context.py", "sources": sources, "series": series,
            "facts": facts, "exposure": None, "notes": notes}


# ================================================================ primary-source checks
# Every figure part 1 prints: (id, path in ukContext.json, printed format).
# pct1 = one decimal with %, idx1 = one decimal, share0 = whole number with %.
PRINTED = [
    ("gdp_growth_latest", "facts.gdp_growth_latest.value", "pct1"),
    ("obr_gdp_forecast_first", "series.obr_gdp_forecast.y.0", "pct1"),
    ("obr_gdp_forecast_second", "series.obr_gdp_forecast.y.1", "pct1"),
    ("obr_gdp_forecast_last", "series.obr_gdp_forecast.y.-1", "pct1"),
    ("gdp_quarterly_latest", "facts.gdp_quarterly_latest.value", "pct1"),
    ("gdp_quarterly_yoy", "facts.gdp_quarterly_yoy.value", "pct1"),
    ("productivity_oph_latest", "facts.productivity_oph_latest.value", "idx1"),
    ("employment_rate_latest", "facts.employment_rate_latest.value", "pct1"),
    ("unemployment_rate_latest", "facts.unemployment_rate_latest.value", "pct1"),
    ("pay_growth_latest", "facts.pay_growth_latest.value", "pct1"),
    ("labour_share_latest", "facts.labour_share_latest.value", "pct1"),
    ("business_ai_use", "facts.business_ai_use.value", "pct1"),
    ("business_ai_use_10plus", "facts.business_ai_use_10plus.value", "pct1"),
    ("workers_high_exposure_high_complementarity", "facts.workers_high_exposure_high_complementarity.value", "share0"),
    ("workers_high_exposure_low_complementarity", "facts.workers_high_exposure_low_complementarity.value", "share0"),
    ("workers_low_exposure", "facts.workers_low_exposure.value", "share0"),
    ("workers_high_exposure_sum", None, "share0"),
    ("dsit_around", None, "share0"),
]


def fmt(v: float, kind: str) -> str:
    """Part 1's formats (part1/format.js), with U+2212 for negatives."""
    if kind == "share0":
        t = f"{int(abs(v) + 0.5)}%"
    else:
        t = f"{abs(v):.1f}" + ("%" if kind == "pct1" else "")
    return ("−" + t) if v < 0 and float(t.rstrip("%")) != 0 else t


def get_path(d, path: str):
    for p in path.split("."):
        d = d[int(p)] if isinstance(d, list) else d[p]
    return d


def ons_json_value(f: dict, period: str) -> tuple[str, dict]:
    """The value for `period` read from the ONS /data JSON (the builder reads the CSV)."""
    j = json.loads(checked(f, "json_file", "json_sha256").read_text(encoding="utf-8"))
    for arr in ("years", "quarters", "months"):
        for row in j[arr]:
            if row["date"] == period:
                return row["value"], j["description"]
    raise KeyError(period)


def primary_checks(man: dict, ctx: dict) -> dict:
    import openpyxl
    import xlrd

    F = man["files"]
    figs = {}

    def add(fid, value_raw, value, period, publisher, dataset, series_id, released, url, primary_file, read_by):
        figs[fid] = {"id": fid, "publisher": publisher, "dataset": dataset, "series_id": series_id,
                     "release_date": released, "period": period, "value": value, "primary_value_raw": value_raw,
                     "url": url, "primary_file": primary_file, "read_by": read_by}

    # ONS series: the /data JSON of the same release
    def ons(fid, key, period, shown=None):
        f = F[key]
        raw, desc = ons_json_value(f, period)
        assert desc["cdid"] == ONS_SERIES[key][0]
        add(fid, raw, float(raw), shown or period, "Office for National Statistics", desc["datasetId"], desc["cdid"],
            f["released"], f["json_url"], f"analysis/story/raw/{f['json_file']}",
            "ONS timeseries /data JSON (the builder reads the generator CSV)")

    C = ctx["facts"]
    ons("gdp_growth_latest", "ihyp", C["gdp_growth_latest"]["period"])
    ons("gdp_quarterly_latest", "ihyq", C["gdp_quarterly_latest"]["period"])
    ons("gdp_quarterly_yoy", "ihyr", C["gdp_quarterly_yoy"]["period"])
    ons("productivity_oph_latest", "lzvb", C["productivity_oph_latest"]["period"])
    for fid, key in [("employment_rate_latest", "lf24"), ("unemployment_rate_latest", "mgsx"), ("pay_growth_latest", "kai9")]:
        label = ctx["series"][fid.replace("_latest", "")]["x"][-1]
        ons(fid, key, label, f"{C[fid]['period']} (ONS label '{label}')")

    yr = C["labour_share_latest"]["period"]
    d_raw, _ = ons_json_value(F["dtwm"], yr)
    y_raw, _ = ons_json_value(F["ybha"], yr)
    add("labour_share_latest", f"DTWM {d_raw} / YBHA {y_raw}", round(100 * float(d_raw) / float(y_raw), 1), yr,
        "Office for National Statistics", F["dtwm"]["dataset"], "DTWM / YBHA", F["dtwm"]["released"],
        f"{F['dtwm']['json_url']} ; {F['ybha']['json_url']}",
        f"analysis/story/raw/{F['dtwm']['json_file']} ; analysis/story/raw/{F['ybha']['json_file']}",
        "ONS /data JSON, 100 x DTWM / YBHA rounded to one decimal place")

    # OBR: Annex A spreadsheet (Table A.1), cross-checked with Table 1.1 of the detailed economy tables
    fa, fe = F["obr_annex_a"], F["obr_economy_tables"]
    rows = list(openpyxl.load_workbook(checked(fa), data_only=True, read_only=True)["TA.1"].iter_rows(values_only=True))
    yrow = next(r for r in rows if 2025 in r and 2031 in r)
    grow = next(r for r in rows if any(isinstance(c, str) and c.strip() == "GDP" for c in r))
    a1 = {y: g for y, g in zip(yrow, grow) if isinstance(y, int)}
    rows = list(openpyxl.load_workbook(checked(fe), data_only=True, read_only=True)["1.1"].iter_rows(values_only=True))
    col = list(rows[2]).index("Real GDP")
    lvl = {r[1]: r[col] for r in rows if isinstance(r[1], int)}
    ox = ctx["series"]["obr_gdp_forecast"]["x"]
    for fid, i in [("obr_gdp_forecast_first", 0), ("obr_gdp_forecast_second", 1), ("obr_gdp_forecast_last", -1)]:
        y = ox[i]
        g11 = 100 * (lvl[y] / lvl[y - 1] - 1)
        assert f"{a1[y]:.1f}" == f"{g11:.1f}", (y, a1[y], g11)
        add(fid, repr(a1[y]), round(a1[y], 1), str(y), "Office for Budget Responsibility",
            f"Economic and fiscal outlook – {OBR_EFO}, charts and tables: Annex A", "Table A.1, row 'GDP' (forecast)",
            fa["released"], fa["url"], f"analysis/story/raw/{fa['file']}",
            f"OBR Annex A xlsx, sheet TA.1; agrees to one decimal place with growth of real GDP in Table 1.1 of the "
            f"detailed economy tables ({lvl[y]:.3f} / {lvl[y - 1]:.3f}, analysis/story/raw/{fe['file']})")

    # BICS: the figure file read with xlrd directly, and the bulletin's own rounded headline
    fb = F["bics_figure"]
    sh = xlrd.open_workbook(str(checked(fb))).sheet_by_index(0)
    hdr = next(i for i in range(sh.nrows) if str(sh.cell_value(i, 0)).strip() == "Date")
    heads = [str(c).strip() for c in sh.row_values(hdr)]
    last = max(i for i in range(hdr + 1, sh.nrows) if str(sh.cell_value(i, 0)).strip())
    for fid, colname in [("business_ai_use", "All industries"), ("business_ai_use_10plus", "All size bands excluding 0 to 9")]:
        raw = sh.cell_value(last, heads.index(colname))
        add(fid, str(raw), float(raw), f"Wave {fb['wave']}, midpoint {str(sh.cell_value(last, 0)).strip()}",
            "Office for National Statistics", f"BICS Wave {fb['wave']}, Figure 1 data",
            f"Figure 1, column '{colname}', last wave", fb["released"], fb["url"], f"analysis/story/raw/{fb['file']}",
            "xlrd read of the ONS figure .xls (the builder uses pandas)")
    btext = _page_text(checked(F["bics_bulletin"]).read_text(encoding="utf-8"))
    head_all = re.search(r"Figure 1: [^(]*\((\d+)%\) businesses reported using at least one", btext)
    if head_all:
        figs["business_ai_use"]["bulletin_headline"] = f"{head_all.group(1)}%"
        assert round(figs["business_ai_use"]["value"]) == int(head_all.group(1))

    # DSIT: the Figure 2 table read by a second parser, and the text's "around 70%"
    fd = F["dsit_govuk"]
    body = json.loads(checked(fd).read_text(encoding="utf-8"))["details"]["body"]
    tbl = body[body.find("Figure 2"):]
    tbl = tbl[:tbl.find("</table>")]
    cells = [_page_text(c).strip() for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tbl, re.S)]
    hi, ui = cells.index("Advanced economies"), cells.index("UK")
    dmap = dict(zip(cells[hi + 1:ui], cells[ui + 1:ui + (ui - hi)]))
    dsit_name = "Department for Science, Innovation and Technology and AI Security Institute"
    dsit_ds = "Assessment of AI capabilities and the impact on the UK labour market"
    for fid, colname in [("workers_high_exposure_high_complementarity", "High exposure, High complementarity"),
                         ("workers_high_exposure_low_complementarity", "High exposure, Low complementarity"),
                         ("workers_low_exposure", "Low exposure")]:
        raw = dmap[colname]
        add(fid, raw, float(raw.rstrip("%")), "IMF estimate, January 2024", dsit_name, dsit_ds,
            f"Figure 2 table, row 'UK', column '{colname}'", fd["released"], fd["url"], f"analysis/story/raw/{fd['file']}",
            "cell-by-cell read of the GOV.UK HTML report (the builder parses table rows)")
    a, b = figs["workers_high_exposure_high_complementarity"], figs["workers_high_exposure_low_complementarity"]
    add("workers_high_exposure_sum", f"{a['primary_value_raw']} + {b['primary_value_raw']}", a["value"] + b["value"],
        "IMF estimate, January 2024", dsit_name, dsit_ds, "Figure 2 table, row 'UK', sum of the two high-exposure columns",
        fd["released"], fd["url"], f"analysis/story/raw/{fd['file']}", "sum of the two cells")
    m = re.search(r"Around (\d+)% of UK workers[^.]*", _page_text(body))
    assert m, "DSIT text: 'Around N% of UK workers' not found"
    add("dsit_around", m.group(0)[:120], float(m.group(1)), "IMF estimate, January 2024", dsit_name, dsit_ds,
        "report text", fd["released"], fd["url"], f"analysis/story/raw/{fd['file']}", "the report's own sentence")

    out, mismatches = [], []
    for fid, path, kind in PRINTED:
        f = figs[fid]
        f.update({"printed": fmt(f["value"], kind), "format": kind, "json_path": path})
        if path is not None and fmt(get_path(ctx, path), kind) != f["printed"]:
            mismatches.append(f"{fid}: ukContext {get_path(ctx, path)} vs primary {f['primary_value_raw']} ({f['primary_file']})")
        out.append(f)
    for msg in mismatches:
        print("MISMATCH", msg, file=sys.stderr)
    return {
        "generated_by": "dashboard/scripts/build_uk_context.py",
        "note": "One entry per figure part 1 prints. 'value' is read from the primary file by a second route, "
                "independent of the route that wrote ukContext.json; 'printed' is how part 1 shows it. "
                "dashboard/scripts/checks/part1.py fails if the page, ukContext.json and this file disagree.",
        "figures": out,
    }


# ================================================================ main
def main() -> None:
    ap = argparse.ArgumentParser(description="Build ukContext.json and ukContextChecks.json for story part 1.")
    ap.add_argument("--offline", action="store_true", help="build from the cached raw files in the manifest only")
    args = ap.parse_args()
    man = json.loads(MANIFEST.read_text()) if args.offline else refresh(dt.date.today().isoformat())
    ctx = build(man)
    OUT.write_text(json.dumps(ctx, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    chk = primary_checks(man, ctx)
    CHECKS_OUT.write_text(json.dumps(chk, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(ctx['series'])} series, {len(ctx['facts'])} facts, "
          f"{len(ctx['sources'])} sources; {CHECKS_OUT.relative_to(ROOT)}: {len(chk['figures'])} figures")


if __name__ == "__main__":
    main()
