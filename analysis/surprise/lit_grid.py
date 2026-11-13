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
# zk0.5 is the more open sensitivity closure added to the solve plan on 13 Nov 2026 (68ef937);
# it joins every table once its continuation is on disk.
CLOSURES = tuple(c for c in ("zk0.1", "zk0", "zk0.5") if (OUT / c / "continuation.json").exists())
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


def what_if(rec, ref, scen, eps):
    """Arithmetic, not a solve: the main arm's 2031 GDP, capital, wage and rental rate if
    capital were supplied along Korinek et al.'s schedule (6), dlnK = eps x dln(rental),
    holding the arm's own technology and labour terms.  eps=None pegs the rental rate."""
    s, b = rec["series"], ref["series"]
    i = HEAD - START
    g1 = G0 + TARGETS[SCEN[scen]]["labour_share_fall_pp"] / 100
    dY, dK, dL = (math.log(s[k][i] / b[k][i]) for k in ("Y", "K", "L"))
    tech_lab = dY - g1 * dK                       # technology + labour terms of the exact split
    shift = math.log(g1 / G0) + tech_lab          # rental change at unchanged capital
    x = 0.0 if eps is None else shift / (1 + (1 - g1) * eps)
    k = shift / (1 - g1) if eps is None else eps * x
    y = tech_lab + g1 * k
    w = math.log((1 - g1) / (1 - G0)) + y - dL
    e = lambda v: (math.exp(v) - 1) * 100
    return {"Y": e(y), "K": e(k), "w": e(w), "dln_rental": x * 100}


def imf_implied_elasticity(share_fall_pp, output_pct=2.52, tfp_pct=0.42):
    """Arithmetic on the IMF UK paper's year-4 figures (SIP/2026/072; output digitised in
    docs/uk_calibration.md): the capital-supply elasticity an aggregate Cobb-Douglas economy
    with gamma0 = 0.35 and unchanged labour would need to turn tfp_pct into output_pct when
    the capital share rises by share_fall_pp."""
    g1 = G0 + share_fall_pp / 100
    dy = math.log(1 + output_pct / 100)
    dk = (dy - math.log(1 + tfp_pct / 100)) / g1
    drent = math.log(g1 / G0) + dy - dk
    return {"dlnK_pct": dk * 100, "dln_rental_pct": drent * 100, "elasticity": dk / drent,
            "wage_pct": (math.exp(math.log((1 - g1) / (1 - G0)) + dy) - 1) * 100}


def repricing(rec, ref):
    """Debt/GDP gap in 2036 explained by the higher interest rate on the whole stock:
    sum over 2028-2035 of (r_gov gap) x baseline D/Y, in pp of GDP (no compounding)."""
    s, b = rec["series"], ref["series"]
    return sum((s["r_gov"][n] - b["r_gov"][n]) * b["D"][n] / b["Y"][n]
               for n in range(2028 - START, RULE - START)) * 100


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


# --- Verdicts against the published ranges (docs/literature_comparison.md, Section 4) ----------
# Each range is on a shock-scaled metric; the source of every bound is in the doc's Section 3.
GDP_PER_TFP = (1.0, 6.2)     # PWBM (GDP = TFP) ... IMF SIP/2026/072 (3.26 / 0.53, year 5)
LP_LEVEL = (0.2, 3.6)        # OBR BP9 J-curve at year 4 ... BoE DMP 0.9pp a year for 4 years
LP_OBR_DISPLACEMENT = 1.5    # OBR Mar 2026 Box 2.2: GDP flat, employment about -1.5% (ours)
WAGE_PER_PP = (-0.33, 1.87)  # Korinek et al. Table 5 substantial: -1.6/4.9 (eps=1) ... 5.6/3.0 (eps=inf)
ELASTICITY_MIN = 1.0         # Korinek et al. Table 5, lowest case
R_BP_PER_PP = (7.0, 22.5)    # IMF SDN/2024/001 (40bp / 5.5pp) ... Korinek eps=1 (110bp / 4.9pp)
TAX_PER_PP = (-0.23, -0.19)  # OBR Nov 2025 EFO rates ... OBR FRS 2026 Box 4.1
DEBT_OBR_PER_PP = 1.86       # OBR Mar 2026 para 6.18: +1.3% of GDP for about 0.7pp (ours)
ROWS = ["GDP per 1% of TFP", "labour productivity, level", "wage per pp of share fall",
        "labour share", "capital-supply elasticity", "r, bp per pp of share fall",
        "tax/GDP per pp of share fall", "debt/GDP in 2031"]
CATS = ["inside", "above", "below", "wrong sign", "by construction", "no comparator", "not solved"]


def _pos(x, lo, hi):
    return "below" if x < lo else "above" if x > hi else "inside"


def verdicts(m, arm):
    """One verdict per row of ROWS for a solved cell (m) of the given arm."""
    if m is None:
        return ["not solved"] * len(ROWS)
    v = []
    v.append(_pos(m["gdp_per_tfp"], *GDP_PER_TFP) if arm == "tfp" else
             "by construction" if arm == "r4" else "no comparator")
    v.append(_pos(m["Y_per_L"], *LP_LEVEL) if arm == "tfp" else
             ("below" if m["Y_per_L"] < LP_OBR_DISPLACEMENT else "inside") if arm == "r4"
             else "no comparator")
    v.append(_pos(m["w_per_pp"], *WAGE_PER_PP) if arm == "tfp" else
             "by construction" if arm == "r4" else "no comparator")
    v.append("by construction")
    v.append("below" if m["cap_elasticity"] < ELASTICITY_MIN else "inside")
    v.append(_pos(m["r_bp_per_pp"], *R_BP_PER_PP))
    t = m["tax_per_pp"]                      # OBR: negative; "below" = smaller fall than the OBR's
    v.append("wrong sign" if t > 0 else "below" if t > TAX_PER_PP[1] else
             "above" if t < TAX_PER_PP[0] else "inside")
    d = m["debt_gdp_pp_2031"]
    v.append(("inside" if d <= 0 else "above") if arm == "tfp" else
             ("below" if d / (-m["labour_share_pp"]) < DEBT_OBR_PER_PP else "inside") if arm == "r4"
             else "no comparator")
    return v


def verdict_table(g):
    from collections import Counter
    n, per_row = Counter(), {r: Counter() for r in ROWS}
    out = ["| closure | scenario | arm | " + " | ".join(ROWS) + " |", "|---|---|---|" + "---|" * len(ROWS)]
    for c in CLOSURES:
        for s in SCEN:
            for a in ARMS:
                v = verdicts(g[(c, s, a)], a)
                n.update(v)
                for r, x in zip(ROWS, v):
                    per_row[r][x] += 1
                out.append(f"| ζK {c[2:]} | {s} | {ARM_NAME[a]} | " + " | ".join(v) + " |")
    tot = ["| row | " + " | ".join(CATS) + " |", "|---|" + "---|" * len(CATS)]
    for r in ROWS:
        tot.append(f"| {r} | " + " | ".join(str(per_row[r][k]) for k in CATS) + " |")
    tot.append("| **all rows** | " + " | ".join(f"**{n[k]}**" for k in CATS) + " |")
    return "\n".join(out), "\n".join(tot), dict(n)


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
    vt, tot, n = verdict_table(g)
    print(f"\n### Verdicts ({sum(n.values())} cells = 4 scenarios x 3 arms x {len(CLOSURES)} closures x {len(ROWS)} rows)\n")
    print(tot + "\n\n" + vt)
    print("\n### What if capital were supplied at Korinek et al.'s elasticities (arithmetic on the "
          "main arm, 2031; not a solve)\n")
    print("| closure | scenario | ε | GDP % | K % | wage % |\n|---|---|---|---|---|---|")
    for c in CLOSURES:
        ref = json.loads((OUT / c / "continuation.json").read_text())
        for s_ in SCEN:
            rec = load(c, s_, "tfp")
            if not rec:
                continue
            m = g[(c, s_, "tfp")]
            print(f"| ζK {c[2:]} | {s_} | solved ({m['cap_elasticity']:.2f}) | {m['Y']:+.2f} | "
                  f"{m['K']:+.2f} | {m['w']:+.2f} |")
            for eps in (1, 3, 6, None):
                q = what_if(rec, ref, s_, eps)
                print(f"| | | {'∞' if eps is None else eps} | {q['Y']:+.2f} | {q['K']:+.2f} | {q['w']:+.2f} |")
    print("\n### Debt/GDP gap in 2036 and the part from repricing the debt stock (pp of GDP)\n")
    print("| closure | scenario | arm | debt/GDP 2036 | of which higher interest rate, 2028-35 | r_gov gap 2031, bp |")
    print("|---|---|---|---|---|---|")
    for c in CLOSURES:
        ref = json.loads((OUT / c / "continuation.json").read_text())
        for s_ in SCEN:
            for a in ARMS:
                rec = load(c, s_, a)
                if rec:
                    i = HEAD - START
                    print(f"| ζK {c[2:]} | {s_} | {ARM_NAME[a]} | {g[(c, s_, a)]['debt_gdp_pp_2036']:+.2f} | "
                          f"{repricing(rec, ref):+.2f} | "
                          f"{(rec['series']['r_gov'][i] - ref['series']['r_gov'][i]) * 1e4:+.0f} |")
    print("\n### Elasticity implied by the IMF UK paper's year-4 output (+2.52% for TFP +0.42%)\n")
    for f in (1.56, 2.35):
        q = imf_implied_elasticity(f)
        print(f"- share fall {f}pp: capital {q['dlnK_pct']:+.2f} log points, rental {q['dln_rental_pct']:+.2f}, "
              f"elasticity {q['elasticity']:.2f}, wage {q['wage_pct']:+.2f}%")
    print("\n### Cross-scenario fit of the main-arm GDP gap = a x TFP% + b x share fall pp (least "
          "squares, no constant).\n### The figure quoted in the doc is the paired one above "
          "(marginal GDP per 1% TFP), not this fit.\n")
    for c, f in fits.items():
        print(f"- ζK {c[2:]}: " + ("too few solves" if not f else
              f"a = {f['per_1pct_tfp']:.3f}, b = {f['per_pp_share_fall']:.3f}, "
              f"n = {f['n']}, max |residual| = {f['max_abs_resid']:.3f}pp"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
