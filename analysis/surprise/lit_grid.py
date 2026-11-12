"""Shock-scaled 2031 metrics for the literature comparison (docs/literature_comparison.md).

Reads the committed per-solve records only (analysis/surprise/output/<closure>/*.json).
No OG solve, no package import.  Gaps are against the same closure's continuation
(the gated no-shock restart).  The stress test uses the last R4 iteration on disk.

    python analysis/surprise/lit_grid.py            # markdown tables
    python analysis/surprise/lit_grid.py --json     # the same numbers as JSON
"""
import json
import math
import re
import sys
from pathlib import Path

OUT = Path(__file__).parent / "output"
TARGETS = json.loads((Path(__file__).parent / "uk_targets.json").read_text())["scenarios"]
SCEN = {"uk_low": "uk_low", "uk_central": "uk_central", "uk_high": "uk_high",
        "korinek": "korinek_us_substantial_upper"}
ARMS = {"tfp": "share_shift_tfp_ramp", "zfixed": "share_shift_ramp_zfixed", "r4": "share_shift_ramp_r4"}
ARM_NAME = {"tfp": "automation + productivity", "zfixed": "technology unchanged",
            "r4": "stress test (GDP flat)"}
CLOSURES = ("zk0.1", "zk0")
START, HEAD, RULE = 2026, 2031, 2036
G0 = 0.35


def load(closure, scen, arm):
    d = OUT / closure
    if arm == "r4":
        fs = sorted(d.glob(f"{scen}_{ARMS[arm]}_*.json"),
                    key=lambda f: int(re.search(r"_r4_(\d+)$", f.stem).group(1))
                    if re.search(r"_r4_(\d+)$", f.stem) else -1)
        fs = [f for f in fs if re.search(r"_r4_(\d+)$", f.stem)]
        f = fs[-1] if fs else None
    else:
        f = d / f"{scen}_{ARMS[arm]}.json"
    return json.loads(f.read_text()) if f and f.exists() else None


def pct(a, b):
    return (a / b - 1) * 100


def metrics(rec, ref, scen):
    s, b = rec["series"], ref["series"]
    t = TARGETS[SCEN[scen]]
    fall, tfp = t["labour_share_fall_pp"], t["tfp_gain_pct"]
    i, j = HEAD - START, RULE - START
    m = {k: pct(s[k][i], b[k][i]) for k in ("Y", "GNI", "NNI", "K", "L", "w", "C", "I")}
    m["Y_per_L"] = pct(s["Y"][i] / s["L"][i], b["Y"][i] / b["L"][i])
    m["labour_income"] = pct(s["w"][i] * s["L"][i], b["w"][i] * b["L"][i])
    m["r_bp"] = (s["r"][i] - b["r"][i]) * 1e4
    m["labour_share_pp"] = (s["w"][i] * s["L"][i] / s["Y"][i] - b["w"][i] * b["L"][i] / b["Y"][i]) * 100
    tax = lambda x, n: x["total_tax_revenue"][n] / x["Y"][n] * 100
    m["tax_gdp_pp"] = tax(s, i) - tax(b, i)
    m["tax_per_pp"] = m["tax_gdp_pp"] / fall
    for y, n in ((HEAD, i), (RULE, j)):
        m[f"debt_gdp_pp_{y}"] = (s["D"][n] / s["Y"][n] - b["D"][n] / b["Y"][n]) * 100
    m["borrowing_pp_2031"] = ((s["D"][i + 1] - s["D"][i]) / s["Y"][i]
                              - (b["D"][i + 1] - b["D"][i]) / b["Y"][i]) * 100
    g1 = G0 + fall / 100
    dk = math.log(s["K"][i] / b["K"][i])
    drent = math.log(g1 / G0) + math.log(s["Y"][i] / b["Y"][i]) - dk
    m["dln_rental"] = drent * 100
    m["cap_elasticity"] = dk / drent
    m["w_per_pp"] = m["w"] / fall
    m["r_bp_per_pp"] = m["r_bp"] / fall
    m["K_per_pp"] = m["K"] / fall
    main = rec["label"].endswith(ARMS["tfp"])      # per-TFP ratios only where TFP moves
    m["gdp_per_tfp"] = m["Y"] / tfp if main else None
    a, c = rec.get("ss") or {}, ref.get("ss") or {}
    if a and c:
        m["ss_Y"], m["ss_K"], m["ss_w"] = pct(a["Y"], c["Y"]), pct(a["K"], c["K"]), pct(a["w"], c["w"])
        m["ss_r_bp"] = (a["r"] - c["r"]) * 1e4
        m["ss_gdp_per_tfp"] = m["ss_Y"] / tfp if main else None
        dk = math.log(a["K"] / c["K"])
        m["ss_cap_elasticity"] = dk / (math.log(g1 / G0) + math.log(a["Y"] / c["Y"]) - dk)
    return m


def grid():
    g = {}
    for c in CLOSURES:
        ref = json.loads((OUT / c / "continuation.json").read_text())
        for scen in SCEN:
            for arm in ARMS:
                rec = load(c, scen, arm)
                g[(c, scen, arm)] = metrics(rec, ref, scen) if rec else None
            a, z = g[(c, scen, "tfp")], g[(c, scen, "zfixed")]
            if a and z:
                tfp = TARGETS[SCEN[scen]]["tfp_gain_pct"]
                a["marginal_gdp_per_tfp"] = (a["Y"] - z["Y"]) / tfp
                a["marginal_K_per_tfp"] = (a["K"] - z["K"]) / tfp
                a["marginal_w_per_tfp"] = (a["w"] - z["w"]) / tfp
                a["marginal_r_bp_per_tfp"] = (a["r_bp"] - z["r_bp"]) / tfp
    return g


def two_factor(g, c):
    """Least squares of the main arm's GDP gap on (TFP %, share fall pp), no constant."""
    rows = [(TARGETS[SCEN[s]]["tfp_gain_pct"], TARGETS[SCEN[s]]["labour_share_fall_pp"],
             g[(c, s, "tfp")]["Y"]) for s in SCEN if g[(c, s, "tfp")]]
    if len(rows) < 2:
        return None
    sxx = sum(x * x for x, _, _ in rows); sxz = sum(x * z for x, z, _ in rows)
    szz = sum(z * z for _, z, _ in rows); sxy = sum(x * y for x, _, y in rows)
    szy = sum(z * y for _, z, y in rows); det = sxx * szz - sxz * sxz
    a, b_ = (sxy * szz - szy * sxz) / det, (szy * sxx - sxy * sxz) / det
    return {"per_1pct_tfp": a, "per_pp_share_fall": b_, "n": len(rows),
            "max_abs_resid": max(abs(y - a * x - b_ * z) for x, z, y in rows)}


COLS = [("Y", "GDP %"), ("GNI", "GNI %"), ("K", "K %"), ("I", "I %"), ("L", "hours %"),
        ("Y_per_L", "Y/L %"), ("w", "wage %"), ("labour_income", "labour income %"),
        ("C", "C %"), ("r_bp", "r bp"), ("tax_gdp_pp", "tax/GDP pp"),
        ("debt_gdp_pp_2031", "debt/GDP pp 2031"), ("debt_gdp_pp_2036", "debt/GDP pp 2036")]
SCALED = [("gdp_per_tfp", "GDP per 1% TFP"), ("marginal_gdp_per_tfp", "marginal GDP per 1% TFP"),
          ("cap_elasticity", "capital-supply elasticity"), ("ss_cap_elasticity", "same, steady state"),
          ("K_per_pp", "K % per pp"), ("w_per_pp", "wage % per pp"), ("r_bp_per_pp", "r bp per pp"),
          ("tax_per_pp", "tax/GDP pp per pp"), ("ss_Y", "steady-state GDP %"),
          ("ss_gdp_per_tfp", "steady-state GDP per 1% TFP"), ("ss_w", "steady-state wage %"),
          ("ss_r_bp", "steady-state r bp")]


def table(g, cols):
    out = ["| closure | scenario | arm | " + " | ".join(n for _, n in cols) + " |",
           "|---|---|---|" + "---|" * len(cols)]
    for c in CLOSURES:
        for s in SCEN:
            for a in ARMS:
                m = g[(c, s, a)]
                cells = ["not solved"] * len(cols) if m is None else [
                    "—" if m.get(k) is None else f"{m[k]:+.2f}" for k, _ in cols]
                out.append(f"| ζK {c[2:]} | {s} | {ARM_NAME[a]} | " + " | ".join(cells) + " |")
    return "\n".join(out)


def main(argv=None):
    g = grid()
    fits = {c: two_factor(g, c) for c in CLOSURES}
    if "--json" in (argv or sys.argv[1:]):
        print(json.dumps({"grid": {"|".join(k): v for k, v in g.items()}, "two_factor": fits}, indent=1))
        return 0
    print("### 2031 gaps against the continuation\n\n" + table(g, COLS))
    print("\n### Shock-scaled metrics, 2031 (per pp = per point of labour-share fall)\n\n" + table(g, SCALED))
    print("\n### Main-arm GDP gap = a x TFP% + b x share fall pp (least squares, no constant)\n")
    for c, f in fits.items():
        print(f"- ζK {c[2:]}: " + ("too few solves" if not f else
              f"a = {f['per_1pct_tfp']:.3f}, b = {f['per_pp_share_fall']:.3f}, "
              f"n = {f['n']}, max |residual| = {f['max_abs_resid']:.3f}pp"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
