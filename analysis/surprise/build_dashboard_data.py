"""Build dashboard/src/data/surprise<YEAR>.json from the surprise solves.

YEAR is the shock (announcement) year: 2028 (default) reads
analysis/surprise/output; 2027 (Vahid, 18 Nov 2026: arrival 2027, full size
2030) reads analysis/surprise2027/output and writes surprise2027.json.  Every
date follows the year (window, headline, history years); key names are the
2028 schema's, so a consumer reads either file.  UGAI_TARGETS_JSON (optional)
names the uk_targets.json whose source strings are copied into `scenarios`.

    python analysis/surprise/build_dashboard_data.py [--year 2027]

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

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from uk_growth_with_ai import surprise as sp  # noqa: E402

_ap = argparse.ArgumentParser()
_ap.add_argument("--year", type=int, default=int(os.environ.get("UGAI_SURPRISE_YEAR",
                                                                 sp.SURPRISE_YEAR)))
SURPRISE = _ap.parse_known_args()[0].year
_W = sp.window(SURPRISE)
OUT_DIR = ROOT / "analysis" / ("surprise" if SURPRISE == sp.SURPRISE_YEAR
                               else f"surprise{SURPRISE}") / "output"
DEST = ROOT / "dashboard" / "src" / "data" / f"surprise{SURPRISE}.json"
YEARS = list(range(2026, 2037))
WINDOW = [_W["report_years"][0], _W["report_years"][-1]]     # [2027, 2031] for 2028
HEADLINE = _W["headline_year"]                                # 2031 for 2028, 2030 for 2027
LATE = 2036
K_HIST = sp.k_of(SURPRISE)        # history years before the shock: 2026-27 for 2028

CLOSURES = [("zk0.1", 0.1, "central"), ("zk0", 0.0, "closed-capital bound")]
# A sensitivity closure, kept apart from `results` (no header option, no
# solve count): shown only as one table on Method, common rule.
SENS_CLOSURES = [("zk0.5", 0.5, "half of new capital foreign-financed")]
SCENARIOS = [
    ("uk_low", "UK low", "uk_low"),
    ("uk_central", "UK central", "uk_central"),
    ("uk_high", "UK high", "uk_high"),
    ("korinek", "Korinek et al. (upper)", "korinek_us_substantial_upper"),
]
# Spending-rule variants, kept apart from `results` (the default rule) so no
# default-rule loop or count picks them up. Only the listed scenarios have
# solves; a variant arm is shown only with its sanity pass and, for the
# debt-neutral rule, its debt/GDP check (dn_check.ok), as paper/make_values.py
# requires. Fixed spending (`_fs`) holds G and TR at the baseline's levels.
RULE_VARIANTS = [("debt_neutral", "dn", "Debt-neutral", ["uk_central", "korinek"]),
                 ("fixed_spending", "fs", "Fixed spending", ["uk_central", "korinek"])]
# Order everywhere: the main arm, then technology unchanged, then the stress
# test. "tz" is the fixed-input Z solve (`_zfixed`): the labour share shifts
# with Z at the value that leaves output at the baseline's 2027 inputs
# unchanged. "ss" is the R4 arm that holds 2031 GDP at the no-AI path, which
# in OG-UK needs output at fixed inputs to fall: a pessimistic bound.
ARMS = [("tfp", "Automation + productivity", "Automation + productivity"),
        ("tz", "Automation, technology unchanged", "Technology unchanged"),
        ("ss", "OBR-style stress test: no output gain", "Stress test")]
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


def pay_growth(rec):
    """Pay per unit of labour, % change on the year before, re-trended at the
    run's own growth rate (the model's series are detrended): None for the
    first year. The story says "slower growth, not a cut" only when every
    year of the window is positive here."""
    w, g = rec["series"]["w"], rec["g_y_annual_used"]
    return [None] + [(w[i] / w[i - 1] * (1 + g) - 1) * 100 for i in range(1, len(w))]


def foreign_share(s, b, year=HEADLINE):
    """Foreign-owned share (%) of the capital stock added against the reference, in `year`."""
    i = YEARS.index(year)
    dk = s["K"][i] - b["K"][i]
    if abs(dk) < 1e-12 or "K_f" not in s or "K_f" not in b:
        return None
    return (s["K_f"][i] - b["K_f"][i]) / dk * 100


# Debt repriced at the OBR's speed (same method, constants and source as
# paper/make_values.py repriced_debt_pp and docs/debt_repricing.md, PR #43).
# The model's debt is one-period, so a rise in the interest rate reaches the
# whole stock at once. This redoes the debt recursion with the rate gap (arm
# less path) reaching the stock at the speed of the OBR's debt interest ready
# reckoner, holding GDP, the primary balance and the market rate at the
# solve's values (first order, no feedback). Source: OBR, October 2026
# Economic and fiscal outlook, detailed forecast tables, ready reckoner table
# 5.1 (GBP bn for +1pp on gilt and on short rates, 2026-27 to 2031-32) and
# aggregates tables 6.13 and 6.17 (2025-26 to 2031-32).
OBR_RR_GILT = (1.1313, 3.7303, 6.4512, 8.6640, 10.5657, 12.6125)
OBR_RR_SHORT = (6.5150, 7.1503, 6.6096, 6.1767, 5.5172, 5.2053)
OBR_CG_GROSS_DEBT_BN = (2996.06, 3172.4991, 3336.7799, 3489.3976, 3619.2944, 3735.8203,
                        3857.1338)
OBR_CG_GROSS_DEBT_PCT = (98.4223, 101.0028, 101.9149, 102.4897, 101.8414, 101.6155, 101.3471)
OBR_PSND_PCT = (93.1017, 95.5055, 96.6997, 97.2848, 96.6742, 95.8675, 95.6107)


def obr_passthrough(n):
    """Share of a sustained rate rise that has reached the debt stock in its k-th
    year, k = 1..n (the OBR gives six years; later years add the mean annual step
    of years three to six)."""
    psnd = [b * p / c for b, p, c in
            zip(OBR_CG_GROSS_DEBT_BN, OBR_PSND_PCT, OBR_CG_GROSS_DEBT_PCT)]
    phi = [(g + s) / (0.01 * 0.5 * (psnd[k] + psnd[k + 1]))
           for k, (g, s) in enumerate(zip(OBR_RR_GILT, OBR_RR_SHORT))]
    step = (phi[5] - phi[2]) / 3
    while len(phi) < n:
        phi.append(min(1.0, phi[-1] + step))
    return phi[:n]


def repriced_debt_pp(S, Rf, y=LATE, full=False):
    """Debt/GDP gap (pp) in year y with the rate gap phased in at the OBR's speed.
    full=True passes the whole gap through at once: the solve's own gap."""
    k0, n = YEARS.index(SURPRISE), YEARS.index(y)
    phi = [1.0] * (n - k0) if full else obr_passthrough(n - k0)
    pd = [Rf["G"][t] + Rf["I_g"][t] + Rf["TR"][t] + Rf["agg_pension_outlays"][t]
          - Rf["total_tax_revenue"][t] for t in range(n)]
    growth = [((1 + Rf["r_gov"][t]) * Rf["D"][t] + pd[t]) / Rf["D"][t + 1] for t in range(n)]
    gap = [S["r_gov"][t] - Rf["r_gov"][t] for t in range(n)]
    D = S["D"][k0]                                # debt in the shock year is predetermined
    for t in range(k0, n):
        eff = sum(phi[t - j] * (gap[j] - (gap[j - 1] if j > k0 else 0.0))
                  for j in range(k0, t + 1))
        D = S["D"][t + 1] + ((1 + Rf["r_gov"][t] + eff) * D
                             - (1 + S["r_gov"][t]) * S["D"][t]) / growth[t]
    return (D / S["Y"][n] - Rf["D"][n] / Rf["Y"][n]) * 100


def git_sha():
    """The last commit that changed the solve outputs read here (OUT_DIR), not the
    checkout's HEAD: a rebuild on a dashboard branch still names the results commit."""
    try:
        return subprocess.check_output(["git", "-C", str(ROOT), "log", "-1", "--format=%h", "--",
                                        str(OUT_DIR.relative_to(ROOT))], text=True).strip() or None
    except Exception:
        return None


def fill(dest, cl, done, sanities, ref, variant, sid):
    """Write one scenario's three arms at closure `cl` into dest[arm][cl];
    returns the number shown. `variant` is False (default rule), "dn" or "fs"."""
    b, n = ref["series"], 0
    k = sp._keys(variant, sid)
    recs = {"tfp": done.get(k["tfp"]), "tz": done.get(k["zfixed"]),
            "ss": sp.accepted_r4(done, ref, variant, SURPRISE, sid)}
    r4_iters = [x for x in done if x.startswith(k["r4"])]
    for a, *_ in ARMS:
        rec = recs[a]
        if rec is None:
            note = None
            if a == "ss":
                note = (f"R4 not yet accepted ({len(r4_iters)} iteration(s) so far)"
                        if (k["zfixed"] in done or r4_iters) else None)
            dest[a][cl] = {"status": "pending", **({"note": note} if note else {})}
            continue
        assert rec["years_series"] == YEARS, rec["label"]
        sanity = sanities.get(rec["label"])
        if sanity is None or not sanity.get("ok"):  # unchecked or failed: not shown
            dest[a][cl] = {"status": "pending", "label": rec["label"],
                           "note": "sanity check not run" if sanity is None
                           else "sanity check failed"}
            continue
        if variant == "dn" and not (rec.get("dn_check") or {}).get("ok"):
            dest[a][cl] = {"status": "pending", "label": rec["label"],
                           "note": "debt-neutral check failed"}
            continue
        dest[a][cl] = {
            "status": "done", "label": rec["label"], "Z_terminal": rec["Z_terminal"],
            "gamma_terminal": rec["gamma_terminal"],
            "sanity": "pass",
            "gaps": gaps(rec["series"], b), "levels": levels(rec["series"]),
            # share of the extra 2031 capital stock that is foreign-owned, %
            "foreign_share_dK_2031": foreign_share(rec["series"], b),
            # real pay growth each year (pay_growth): the "not a cut" test
            "pay_growth_pct": pay_growth(rec),
        }
        if variant is False:  # common rule: debt/GDP in LATE at the OBR's repricing speed
            own = repriced_debt_pp(rec["series"], b, full=True)
            assert abs(own - dest[a][cl]["gaps"]["debt_gdp_pp"][-1]) < 1e-9, rec["label"]
            dest[a][cl]["debt_gdp_pp_obr_repricing_late"] = repriced_debt_pp(rec["series"], b)
        for v, path in dest[a][cl]["gaps"].items():  # the pre-shock years are history: zero gaps
            assert all(abs(x) < 1e-9 for x in path[:K_HIST]), (rec["label"], v, path[:K_HIST])
        n += 1
    return n


# Where output goes in the headline year (story part 2's Sankey and
# waterfall): GDP split into four parts from the solve's own series, so the
# parts add up to GDP exactly. Labour income = w L; payments to foreign
# owners of UK capital and gilts = Y - GNI (GNI = Y - r_p (K_f + D_f));
# depreciation = GNI - NNI (= delta K); domestic net capital income, the
# rest = NNI - w L. Shares are of the OBR-central path's GDP (the closure's
# no-shock reference); changes are scenario minus reference, in % of the
# reference's GDP. Main arm, default (common) rule only.
SPLIT_PARTS = [("labour", "Labour income"),
               ("domestic", "Net capital income kept in the UK"),
               ("foreign", "Paid to foreign owners of UK capital and gilts"),
               ("depreciation", "Depreciation")]


def split_levels(x, i):
    lab = x["w"][i] * x["L"][i]
    return {"gdp": x["Y"][i], "labour": lab, "domestic": x["NNI"][i] - lab,
            "foreign": x["Y"][i] - x["GNI"][i], "depreciation": x["GNI"][i] - x["NNI"][i]}


def output_split(results, year=HEADLINE):
    i = YEARS.index(year)
    out = {"year": year, "arm": "tfp", "parts": [{"id": k, "label": l} for k, l in SPLIT_PARTS],
           "baseline": {}, "change": {sid: {} for sid, *_ in SCENARIOS}}
    for cl, *_ in CLOSURES:
        try:
            b = sp.reference_ext(OUT_DIR, cl)["series"]
        except Exception:
            out["baseline"][cl] = None
            for sid, *_ in SCENARIOS:
                out["change"][sid][cl] = {"status": "pending"}
            continue
        lb = split_levels(b, i)
        sh = {k: lb[k] / lb["gdp"] * 100 for k, _ in SPLIT_PARTS}
        assert all(v > 0 for v in sh.values()), (cl, sh)
        assert abs(sum(sh.values()) - 100) < 1e-9, (cl, sh)
        out["baseline"][cl] = sh
        for sid, *_ in SCENARIOS:
            r = results[sid]["tfp"][cl]
            if r["status"] != "done":
                out["change"][sid][cl] = {"status": "pending"}
                continue
            s = json.loads((OUT_DIR / cl / f"{r['label']}.json").read_text())["series"]
            ls = split_levels(s, i)
            ch = {k: (ls[k] - lb[k]) / lb["gdp"] * 100 for k in ls}
            assert abs(sum(ch[k] for k, _ in SPLIT_PARTS) - ch["gdp"]) < 1e-9, (sid, cl)
            # the GDP change is the GDP gap the results already hold
            assert abs(ch["gdp"] - r["gaps"]["Y"][i]) < 1e-9, (sid, cl)
            assert all(v > 0 for k, v in split_levels(s, i).items()), (sid, cl)
            ch["gross_capital"] = ch["domestic"] + ch["foreign"] + ch["depreciation"]
            out["change"][sid][cl] = {"status": "done", "label": r["label"], **ch}
    return out


def main():
    tpath = Path(os.environ.get("UGAI_TARGETS_JSON") or ROOT / "analysis" / "surprise" / "uk_targets.json")
    targets = json.loads(tpath.read_text())["scenarios"]
    closures, results, n_done = {}, {sid: {a: {} for a, *_ in ARMS} for sid, *_ in SCENARIOS}, 0
    rules = {rid: {"label": label, "variant": var, "scenarios": sids, "results": {}}
             for rid, var, label, sids in RULE_VARIANTS}
    for cl, zk, role in CLOSURES:
        loaded = sp.load(OUT_DIR, cl)
        done = {k: v for k, v in loaded.items() if not k.endswith(".sanity")}
        sanities = {f.name[:-len(".sanity.json")]: json.loads(f.read_text())
                    for f in (OUT_DIR / cl).glob("*.sanity.json")}
        try:
            ref = sp.reference_ext(OUT_DIR, cl)
        except Exception as e:  # gate not passed: everything at this closure is pending
            closures[cl] = {"zeta_K": zk, "role": role, "reference": None, "note": str(e)}
            for sid, *_ in SCENARIOS:
                for a, *_ in ARMS:
                    results[sid][a][cl] = {"status": "pending"}
            for rid, _, _, sids in RULE_VARIANTS:
                for sid in sids:
                    for a, *_ in ARMS:
                        rules[rid]["results"].setdefault(sid, {x: {} for x, *_ in ARMS})[a][cl] = {"status": "pending"}
            continue
        b = ref["series"]
        assert done["continuation"]["years_series"] == YEARS
        # Effective tax rates on the no-shock path in HEADLINE, as the sanity gate
        # computes them (the paper's EffLabourPct / EffCapitalPct / EffWedgePp read
        # the same file): % of labour income incl. employer NICs, % of gross
        # capital income.
        eff = json.loads((OUT_DIR / cl / "uk_central_share_shift_tfp_ramp.sanity.json").read_text())[
            "diagnostics"][f"effective_rates_{HEADLINE}"]["reference"]
        closures[cl] = {"zeta_K": zk, "role": role, "reference": ref["reference"],
                        "reference_levels": levels(b),
                        "reference_effective_tax_rates": {k: eff[k] for k in ("labour", "capital_gross")}}
        for sid, *_ in SCENARIOS:
            n_done += fill(results[sid], cl, done, sanities, ref, False, sid)
        for rid, var, _, sids in RULE_VARIANTS:
            for sid in sids:
                fill(rules[rid]["results"].setdefault(sid, {a: {} for a, *_ in ARMS}),
                     cl, done, sanities, ref, var, sid)
    sensitivity = {}
    for cl, zk, role in SENS_CLOSURES:
        loaded = sp.load(OUT_DIR, cl)
        done = {k: v for k, v in loaded.items() if not k.endswith(".sanity")}
        sanities = {f.name[:-len(".sanity.json")]: json.loads(f.read_text())
                    for f in (OUT_DIR / cl).glob("*.sanity.json")}
        ref = sp.reference_ext(OUT_DIR, cl)
        assert done["continuation"]["years_series"] == YEARS
        res = {sid: {a: {} for a, *_ in ARMS} for sid, *_ in SCENARIOS}
        for sid, *_ in SCENARIOS:
            fill(res[sid], cl, done, sanities, ref, False, sid)
        sensitivity[cl] = {"zeta_K": zk, "role": role, "reference": ref["reference"],
                           "results": {sid: {a: r[cl] for a, r in arms.items()} for sid, arms in res.items()}}
    scen = []
    for sid, label, tkey in SCENARIOS:
        t = targets[tkey]
        scen.append({"id": sid, "label": label, "labour_share_fall_pp": t["labour_share_fall_pp"],
                     "gamma_terminal": t["gamma_terminal"], "tfp_gain_pct": t["tfp_gain_pct"],
                     "sources": t["sources"]})
    data = {
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "source_commit": git_sha(), "years": YEARS, "window": WINDOW, "headline_year": HEADLINE,
        "late_year": LATE, "surprise_year": SURPRISE, "default_scenario": "uk_central",
        "scenarios": scen, "arms": [{"id": a, "label": l, "short": sh} for a, l, sh in ARMS],
        "closures": closures, "results": results, "rules": rules, "sensitivity": sensitivity,
        "solves_done": n_done,
        "output_split": output_split(results),
        "solves_total": len(SCENARIOS) * len(ARMS) * len(CLOSURES),
    }
    DEST.write_text(json.dumps(data, indent=1, allow_nan=False) + "\n")
    print(f"wrote {DEST.relative_to(ROOT)}: {n_done}/{data['solves_total']} combinations done")
    for sid, *_ in SCENARIOS:
        for a, *_ in ARMS:
            for cl, *_ in CLOSURES:
                r = results[sid][a][cl]
                if r["status"] == "done":
                    i = YEARS.index(HEADLINE)
                    g = r["gaps"]
                    print(f"  {sid:10s} {a:3s} {cl:5s} {HEADLINE} GDP {g['Y'][i]:+.2f}% GNI {g['GNI'][i]:+.2f}% "
                          f"NNI {g['NNI'][i]:+.2f}% w {g['w'][i]:+.2f}%  ({r['label']})")
                else:
                    print(f"  {sid:10s} {a:3s} {cl:5s} pending {r.get('note', '')}")
    for cl, sens in sensitivity.items():
        for sid, arms in sens["results"].items():
            for a, r in arms.items():
                if r["status"] == "done":
                    g, i = r["gaps"], YEARS.index(HEADLINE)
                    print(f"  sensitivity {cl} {sid:10s} {a:3s} {HEADLINE} GDP {g['Y'][i]:+.2f}% GNI {g['GNI'][i]:+.2f}% "
                          f"w {g['w'][i]:+.2f}%  ({r['label']})")
                else:
                    print(f"  sensitivity {cl} {sid:10s} {a:3s} pending {r.get('note', '')}")
    for rid, rule in rules.items():
        for sid, arms in rule["results"].items():
            for a, cls in arms.items():
                for cl, r in cls.items():
                    if r["status"] == "done":
                        i = YEARS.index(HEADLINE)
                        g = r["gaps"]
                        print(f"  {rid} {sid:10s} {a:3s} {cl:5s} {HEADLINE} GDP {g['Y'][i]:+.2f}% GNI {g['GNI'][i]:+.2f}% "
                              f"w {g['w'][i]:+.2f}% C {g['C'][i]:+.2f}%  ({r['label']})")
                    else:
                        print(f"  {rid} {sid:10s} {a:3s} {cl:5s} pending {r.get('note', '')}")


if __name__ == "__main__":
    main()
