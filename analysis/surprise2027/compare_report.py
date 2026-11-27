"""Tables for the 2027 run report (kept outside the repository): the 2027 set
(arrival 2027, full size 2030) against the 2028 set (arrival 2028, full size
2031), each at its own headline year, gaps against the same closure's
no-shock continuation.  Reads the two dashboard exports only:

    dashboard/src/data/surprise2027.json   (build_dashboard_data.py --year 2027)
    dashboard/src/data/surprise2028.json   (build_dashboard_data.py)

    python analysis/surprise2027/compare_report.py > /tmp/tables.md

Sections: headline numbers old vs new; every sign change; the OBR Chart B.4
overlap redone for year 4 = 2030 (slopes per 1% of TFP from the main arm less
"technology unchanged", and the net-of-OBR tables).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "dashboard" / "src" / "data"
import os
NEW = json.loads(Path(os.environ.get("NEW_JSON", DATA / "surprise2027.json")).read_text())
OLD = json.loads(Path(os.environ.get("OLD_JSON", DATA / "surprise2028.json")).read_text())

# headline variables: (key in gaps, label, unit)
VARS = [("Y", "GDP", "%"), ("GNI", "GNI", "%"), ("NNI", "NNI", "%"), ("w", "pay (wage rate)", "%"),
        ("labour_share_pp", "labour share", "pp"), ("debt_gdp_pp", "debt/GDP", "pp")]
EXTRA = [("C", "consumption", "%"), ("I", "investment", "%"), ("K", "capital", "%"),
         ("r_bp", "interest rate", "bp"), ("tax_gdp_pp", "tax/GDP", "pp")]
SCEN = [(s["id"], s["label"]) for s in NEW["scenarios"]]
ARMS = [(a["id"], a["short"]) for a in NEW["arms"]]
CLOSURES = ["zk0.1", "zk0"]
SENS = "zk0.5"
TFP = {s["id"]: s["tfp_gain_pct"] for s in NEW["scenarios"]}

# OBR Briefing paper No.9, Chart B.4 (vector data as read in obr-overlap-fable.md):
# level effect (%) of the J- and S-curves by OBR year
OBR_LEVEL = {"J": [0.03, 0.06, 0.11, 0.19, 0.30, 0.47], "S": [0.03, 0.08, 0.17, 0.33, 0.57, 0.88]}
OBR_YEAR1 = 2026          # the OBR's year 1 on the calendar (as in the 2028 review)


def cell(d, sid, arm, cl, rule=None, sens=False):
    if sens:
        return d["sensitivity"][cl]["results"][sid][arm]
    if rule:
        return d["rules"][rule]["results"].get(sid, {}).get(arm, {}).get(cl, {"status": "pending"})
    return d["results"][sid][arm][cl]


def hv(d, c, v):
    """Value of gap v in d's headline year, or None."""
    if c.get("status") != "done":
        return None
    return c["gaps"][v][d["years"].index(d["headline_year"])]


def fmt(x, u):
    if x is None:
        return "pending"
    return f"{x:+.2f}{'%' if u == '%' else ''}" + ("" if u in ("%",) else f" {u}" if u != "pp" else "pp")


def sign(x, tol):
    return 0 if x is None or abs(x) <= tol else (1 if x > 0 else -1)


def headline_tables(out, rule=None, sens=False, title=""):
    hy_o, hy_n = OLD["headline_year"], NEW["headline_year"]
    cls = [SENS] if sens else CLOSURES
    out.append(f"\n### {title}\n")
    out.append(f"Each cell: old ({hy_o}, 2028 arrival) → new ({hy_n}, 2027 arrival); change in brackets.\n")
    for cl in cls:
        out.append(f"\n**ζK {cl[2:] or '0'}**\n")
        hdr = "| scenario | arm | " + " | ".join(l for _, l, _ in VARS) + " |"
        out.append(hdr)
        out.append("|" + "---|" * (len(VARS) + 2))
        for sid, sl in SCEN:
            for arm, al in ARMS:
                co, cn = cell(OLD, sid, arm, cl, rule, sens), cell(NEW, sid, arm, cl, rule, sens)
                if co.get("status") != "done" and cn.get("status") != "done":
                    continue
                row = []
                for v, _, u in VARS:
                    o, n = hv(OLD, co, v), hv(NEW, cn, v)
                    if o is None or n is None:
                        row.append(f"{fmt(o, u)} → {fmt(n, u)}")
                    else:
                        row.append(f"{o:+.2f} → {n:+.2f} ({n - o:+.2f})")
                out.append(f"| {sl} | {al} | " + " | ".join(row) + " |")


def sign_changes(out):
    """Every headline-year gap whose sign differs between the sets (|x| > tol)."""
    tol = {"%": 0.01, "pp": 0.01, "bp": 0.5}
    rows = []
    groups = [(None, False, CLOSURES), ("debt_neutral", False, CLOSURES),
              ("fixed_spending", False, CLOSURES), (None, True, [SENS])]
    for rule, sens, cls in groups:
        for cl in cls:
            for sid, sl in SCEN:
                for arm, al in ARMS:
                    co, cn = cell(OLD, sid, arm, cl, rule, sens), cell(NEW, sid, arm, cl, rule, sens)
                    if co.get("status") != "done" or cn.get("status") != "done":
                        continue
                    for v, l, u in VARS + EXTRA:
                        o, n = hv(OLD, co, v), hv(NEW, cn, v)
                        so, sn = sign(o, tol[u]), sign(n, tol[u])
                        if so != sn:
                            rows.append(f"| {rule or 'common'} | ζK {cl[2:] or '0'} | {sl} | {al} | {l} "
                                        f"| {o:+.3f} | {n:+.3f} |")
    out.append("\n## Sign changes (headline year, any variable)\n")
    out.append("Threshold: |gap| above 0.01 (% or pp) or 0.5bp counts as signed; below it is zero.\n")
    if not rows:
        out.append("None.\n")
        return
    out.append(f"| rule | closure | scenario | arm | variable | old ({OLD['headline_year']}) "
               f"| new ({NEW['headline_year']}) |")
    out.append("|---|---|---|---|---|---|---|")
    out.extend(rows)


def obr_overlap(out):
    hy = NEW["headline_year"]
    out.append(f"\n## OBR overlap against Chart B.4, year 4 = {hy}\n")
    # adoption clock: year 4 of the scenario ramp is OBR year 4
    j4, s4 = OBR_LEVEL["J"][3], OBR_LEVEL["S"][3]
    # calendar clock: OBR year 1 = 2026; the scenario runs 2027..hy = OBR years 2..(hy-2025)
    y0, y1 = NEW["surprise_year"] - OBR_YEAR1 + 1, hy - OBR_YEAR1 + 1
    jc = OBR_LEVEL["J"][y1 - 1] - OBR_LEVEL["J"][y0 - 2]
    sc = OBR_LEVEL["S"][y1 - 1] - OBR_LEVEL["S"][y0 - 2]
    oy0, oy1 = OLD["surprise_year"] - OBR_YEAR1 + 1, OLD["headline_year"] - OBR_YEAR1 + 1
    jo = OBR_LEVEL["J"][oy1 - 1] - OBR_LEVEL["J"][oy0 - 2]
    so = OBR_LEVEL["S"][oy1 - 1] - OBR_LEVEL["S"][oy0 - 2]
    out.append(f"- **Adoption clock** (scenario year 4 = OBR year 4): the OBR path has "
               f"{j4:.2f}% (J) to {s4:.2f}% (S) of AI productivity. Unchanged from the 2028 review, "
               f"since both sets put year 4 at their headline.")
    out.append(f"- **Calendar clock** (OBR year 1 = {OBR_YEAR1}): the scenario's years "
               f"{NEW['surprise_year']}–{hy} are OBR years {y0}–{y1}, over which the OBR curves add "
               f"{jc:.2f}% (J) to {sc:.2f}% (S). In the 2028 set ({OLD['surprise_year']}–"
               f"{OLD['headline_year']}, OBR years {oy0}–{oy1}) it was {jo:.2f}% to {so:.2f}%.")
    out.append("")
    # slopes per 1% of tfp input: (main arm - technology unchanged) / tfp input
    out.append(f"**Per 1% of TFP input, {hy}** (main arm less technology unchanged, divided by the "
               f"scenario's TFP input; range over the four scenarios).\n")
    out.append("| per 1% TFP | " + " | ".join(f"ζK {c[2:] or '0'}" for c in CLOSURES) + " |")
    out.append("|---|" + "---|" * len(CLOSURES))
    slopes = {}
    for v, l, u in VARS + [("C", "consumption", "%"), ("tax_gdp_pp", "tax/GDP", "pp")]:
        cells = []
        for cl in CLOSURES:
            xs = []
            for sid, _ in SCEN:
                a, z = cell(NEW, sid, "tfp", cl), cell(NEW, sid, "tz", cl)
                if a.get("status") == "done" and z.get("status") == "done" and TFP[sid]:
                    xs.append((hv(NEW, a, v) - hv(NEW, z, v)) / TFP[sid])
            slopes[(v, cl)] = xs
            cells.append("pending" if not xs else
                         f"{min(xs):+.2f}" + (f" to {max(xs):+.2f}" if max(xs) - min(xs) > 0.005 else ""))
        out.append(f"| {l} | " + " | ".join(cells) + " |")
    # net-of-OBR tables, linear scaling with each scenario's own slope
    nets = [0.2, 0.3, 0.4]
    for cl in CLOSURES:
        out.append(f"\n**{hy} gaps as published and net of the OBR's effect, ζK {cl[2:] or '0'}** "
                   "(linear: published − net × the scenario's own slope per 1% TFP).\n")
        out.append("| scenario, variable | published | " + " | ".join(f"net {x}" for x in nets) + " |")
        out.append("|---|---|" + "---|" * len(nets))
        for sid, sl in SCEN:
            a, z = cell(NEW, sid, "tfp", cl), cell(NEW, sid, "tz", cl)
            if a.get("status") != "done" or z.get("status") != "done" or not TFP[sid]:
                continue
            for v, l, u in VARS:
                p = hv(NEW, a, v)
                sl_ = (p - hv(NEW, z, v)) / TFP[sid]
                vals = " | ".join(f"{p - x * sl_:+.2f}" for x in nets)
                out.append(f"| {sl} {l} ({u}) | {p:+.2f} | {vals} |")


def main():
    out = [f"<!-- generated by analysis/surprise2027/compare_report.py from surprise2027.json "
           f"({NEW['source_commit']}) and surprise2028.json ({OLD['source_commit']}) -->"]
    out.append("\n## Headline numbers, old against new\n")
    headline_tables(out, title="Common fiscal rule (results)")
    headline_tables(out, rule="debt_neutral", title="Debt-neutral transfers (rules.debt_neutral)")
    headline_tables(out, rule="fixed_spending", title="Fixed spending (rules.fixed_spending)")
    headline_tables(out, sens=True, title="ζK 0.5 sensitivity (common rule)")
    sign_changes(out)
    obr_overlap(out)
    print("\n".join(out))


if __name__ == "__main__":
    sys.exit(main())
