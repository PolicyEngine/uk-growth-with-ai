"""Build dashboard/src/data/surprise2028.json from the 2028-surprise solves.

Re-runnable: reads whatever per-solve records exist in
analysis/surprise/output/{zk0.1,zk0}/ and marks every missing
scenario x arm x closure as "pending".  No solve is run.

Gaps are against the no-shock restart (continuation.json) of the same closure,
as fixed by the continuation gate.  The automation-only arm is the accepted R4
iteration (2031 GDP gap within R4_TOL_PP of zero); the fixed-input Z point
(`_zfixed`) is never shown as that arm.

    python analysis/surprise/build_dashboard_data.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from uk_growth_with_ai import surprise as sp  # noqa: E402

OUT_DIR = ROOT / "analysis" / "surprise" / "output"
DEST = ROOT / "dashboard" / "src" / "data" / "surprise2028.json"
YEARS = list(range(2026, 2037))
WINDOW = [2027, 2031]
HEADLINE = 2031
LATE = 2036

CLOSURES = [("zk0.1", 0.1, "central"), ("zk0", 0.0, "closed-capital bound")]
SCENARIOS = [
    ("uk_low", "UK low", "uk_low"),
    ("uk_central", "UK central", "uk_central"),
    ("uk_high", "UK high", "uk_high"),
    ("korinek", "Korinek upper", "korinek_us_substantial_upper"),
]
ARMS = [("tfp", "Automation + productivity"), ("ss", "Automation only")]
PCT_VARS = {"Y": "GDP", "GNI": "GNI", "NNI": "NNI", "w": "Wage rate", "C": "Consumption",
            "I": "Investment", "K": "Capital", "L": "Labour"}


def gaps(s, b):
    n = len(YEARS)
    out = {v: [(s[v][i] / b[v][i] - 1) * 100 for i in range(n)] for v in PCT_VARS}
    out["r_bp"] = [(s["r"][i] - b["r"][i]) * 1e4 for i in range(n)]
    out["debt_gdp_pp"] = [(s["D"][i] / s["Y"][i] - b["D"][i] / b["Y"][i]) * 100 for i in range(n)]
    out["tax_gdp_pp"] = [(s["total_tax_revenue"][i] / s["Y"][i]
                          - b["total_tax_revenue"][i] / b["Y"][i]) * 100 for i in range(n)]
    ls = lambda x, i: x["w"][i] * x["L"][i] / x["Y"][i] * 100
    out["labour_share_pp"] = [ls(s, i) - ls(b, i) for i in range(n)]
    return out


def levels(s):
    n = len(YEARS)
    return {"debt_gdp": [s["D"][i] / s["Y"][i] * 100 for i in range(n)],
            "tax_gdp": [s["total_tax_revenue"][i] / s["Y"][i] * 100 for i in range(n)],
            "labour_share": [s["w"][i] * s["L"][i] / s["Y"][i] * 100 for i in range(n)]}


def git_sha():
    try:
        return subprocess.check_output(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"],
                                       text=True).strip()
    except Exception:
        return None


def main():
    targets = json.loads((ROOT / "analysis" / "surprise" / "uk_targets.json").read_text())["scenarios"]
    closures, results, n_done = {}, {sid: {a: {} for a, _ in ARMS} for sid, *_ in SCENARIOS}, 0
    for cl, zk, role in CLOSURES:
        done = sp.load(OUT_DIR, cl)
        try:
            ref = sp.reference_ext(OUT_DIR, cl)
        except Exception as e:  # gate not passed: everything at this closure is pending
            closures[cl] = {"zeta_K": zk, "role": role, "reference": None, "note": str(e)}
            for sid, *_ in SCENARIOS:
                for a, _ in ARMS:
                    results[sid][a][cl] = {"status": "pending"}
            continue
        b = ref["series"]
        assert done["continuation"]["years_series"] == YEARS
        closures[cl] = {"zeta_K": zk, "role": role, "reference": ref["reference"],
                        "reference_levels": levels(b)}
        for sid, *_ in SCENARIOS:
            k = sp._keys(False, sid)
            recs = {"tfp": done.get(k["tfp"]), "ss": sp.accepted_r4(done, ref, False, 2028, sid)}
            r4_iters = [x for x in done if x.startswith(k["r4"]) and not x.endswith(".sanity")]
            for a, _ in ARMS:
                rec = recs[a]
                if rec is None:
                    note = None
                    if a == "ss":
                        note = (f"R4 not yet accepted ({len(r4_iters)} iteration(s) so far)"
                                if (k["zfixed"] in done or r4_iters) else None)
                    results[sid][a][cl] = {"status": "pending", **({"note": note} if note else {})}
                    continue
                assert rec["years_series"] == YEARS, rec["label"]
                sanity = done.get(rec["label"] + ".sanity", {})
                results[sid][a][cl] = {
                    "status": "done", "label": rec["label"], "Z_terminal": rec["Z_terminal"],
                    "gamma_terminal": rec["gamma_terminal"],
                    "sanity": sanity.get("status") or sanity.get("result") or (
                        "pass" if sanity.get("ok") else None),
                    "gaps": gaps(rec["series"], b), "levels": levels(rec["series"]),
                }
                n_done += 1
    scen = []
    for sid, label, tkey in SCENARIOS:
        t = targets[tkey]
        scen.append({"id": sid, "label": label, "labour_share_fall_pp": t["labour_share_fall_pp"],
                     "gamma_terminal": t["gamma_terminal"], "tfp_gain_pct": t["tfp_gain_pct"],
                     "sources": t["sources"]})
    data = {
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "source_commit": git_sha(), "years": YEARS, "window": WINDOW, "headline_year": HEADLINE,
        "late_year": LATE, "surprise_year": 2028, "default_scenario": "uk_central",
        "scenarios": scen, "arms": [{"id": a, "label": l} for a, l in ARMS],
        "closures": closures, "results": results, "solves_done": n_done,
        "solves_total": len(SCENARIOS) * len(ARMS) * len(CLOSURES),
    }
    DEST.write_text(json.dumps(data, indent=1, allow_nan=False) + "\n")
    print(f"wrote {DEST.relative_to(ROOT)}: {n_done}/{data['solves_total']} combinations done")
    for sid, *_ in SCENARIOS:
        for a, _ in ARMS:
            for cl, *_ in CLOSURES:
                r = results[sid][a][cl]
                if r["status"] == "done":
                    i = YEARS.index(HEADLINE)
                    g = r["gaps"]
                    print(f"  {sid:10s} {a:3s} {cl:5s} 2031 GDP {g['Y'][i]:+.2f}% GNI {g['GNI'][i]:+.2f}% "
                          f"NNI {g['NNI'][i]:+.2f}% w {g['w'][i]:+.2f}%  ({r['label']})")
                else:
                    print(f"  {sid:10s} {a:3s} {cl:5s} pending {r.get('note', '')}")


if __name__ == "__main__":
    main()
