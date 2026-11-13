"""Hard sanity gate after EVERY surprise-2028 solve (Vahid's standing rule:
every result must make sense in size and direction; if it does not, stop,
investigate, correct).

    python analysis/surprise/sanity.py <closure> <label> [--outdir ...]   # exit 1 on failure
    python analysis/surprise/sanity.py --write-expectations               # once, before the solves
    python analysis/surprise/sanity.py --progress                         # markdown table for #27

The expectations (signs and the size bands' reference numbers) are in
``analysis/surprise/expectations.json``, written and committed BEFORE any
surprise solve, from the 2026-start results.  They are not edited after a
result is seen; a failure is explained in the PR/issue, not tuned away.

Checks (each FAILS the gate unless marked "flag"):

1. Identities, 2026-2036: K = K_d + K_f, K_d = B - D_d, D = D_d + D_f
   (relative 1e-8); GNI <= GDP where K_f > 0; NNI < GNI; |RC/GDP| <= 1e-5 in
   2027 (baseline) and 2028-2036 (the run).
2. Single point: every exported series equals the reference EXACTLY in 2026
   and 2027 (all gaps exactly 0).
3. Expected direction at 2031 (``SIGNS``), and the labour share on the ramp:
   with epsilon = 1 and one sector the labour share is 1 - gamma, so its gap
   must be -3.9pp x the ramp weight (0.25, 0.5, 0.75, 1 in 2028-31) within
   0.02pp.
4. Size bands: each 2031 gap within 30% of the 2026-start arm's 2030 gap (the
   first full-weight year in both designs), or within an absolute floor for
   small gaps; a flipped sign above the floor fails.  The surprise arms have
   three years of response (2028-30) where the 2026-start arms had four plus
   anticipation, so smaller K and Y gaps are expected; 30% is the stated
   tolerance for that, not a fitted number.
5. Variant checks: zk0 K_f = 0 and Delta r(2031) larger than the zk0.1
   counterpart; fixed spending G equals the baseline's level in 2028-35;
   debt-neutral D/Y tracks the reference within 1e-4 (2029-2036).
6. The 2028 jump: investment and labour gaps reported; flag if the
   investment gap exceeds the old 2026 +17%.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from uk_growth_with_ai import surprise as sp  # noqa: E402
from uk_growth_with_ai.scenarios import START  # noqa: E402

OUTDIR = REPO / "analysis/surprise/output"
RERUN = REPO / "analysis/rerun/output"
EXPECT = REPO / "analysis/surprise/expectations.json"
FS_BRANCH_SHA = "37bd0e282b92d07e16c66b9649872308961c6076"   # PR #36 head, 12 Nov

ID_TOL = 1e-8
RC_TOL = 1e-5
LS_TOL_PP = 0.02
LS_FALL_PP = 3.9
BAND_REL = 0.30
BAND_FLOOR = {"Y": 0.25, "GNI": 0.25, "K": 0.25, "L": 0.25, "w": 0.25, "C": 0.25,
              "I": 1.0, "r_bp": 10.0, "debt_gdp_pp": 0.5}   # pp (bp for r)
I_JUMP_FLAG_PCT = 17.0
HEADLINE = 2031
OLD_HEADLINE = 2030

# Expected direction at 2031, written before the solves (Vahid, 12 Nov 2026).
SIGNS = {
    "tfp": {"Y": ">0", "K": ">0", "r_bp": ">0", "labour_share_pp": "<0"},
    "r4": {"Y": "~0", "w": "<0", "labour_share_pp": "<0", "GNI": "<=0"},
    "zfixed": {"w": "<0", "labour_share_pp": "<0"},
    "r4_iter": {"w": "<0", "labour_share_pp": "<0"},
}


def kind(label: str) -> tuple[str, str]:
    """(arm kind, variant) of a solve label."""
    x = sp.parse_label(label)
    return x["kind"], x["variant"]


def gaps(s, b, i) -> dict:
    g = {v: (s[v][i] / b[v][i] - 1) * 100 for v in ("Y", "GNI", "NNI", "K", "L", "w", "C", "I")
         if v in s and v in b and b[v][i]}
    g["r_bp"] = (s["r"][i] - b["r"][i]) * 1e4
    g["debt_gdp_pp"] = (s["D"][i] / s["Y"][i] - b["D"][i] / b["Y"][i]) * 100
    ls = lambda x: x["w"][i] * x["L"][i] / x["Y"][i] * 100
    g["labour_share_pp"] = ls(s) - ls(b)
    return g


# --- expectations (written once, before the solves) ---------------------------------

def _old_records():
    """The 2026-start arms' records per (closure, variant, kind)."""
    out = {}
    for c in ("zk0.1", "zk0"):
        from uk_growth_with_ai import rerun
        done = rerun.load(RERUN, c)
        base = rerun.accepted_baseline(done)
        out[(c, "", "base")] = base
        out[(c, "", "tfp")] = done["share_shift_tfp_ramp"]
        out[(c, "", "zfixed")] = done["share_shift_ramp_zfixed"]
        out[(c, "", "r4")] = rerun.accepted_r4(done, base)
        fs = {}
        for name in ("share_shift_tfp_ramp_fs", "share_shift_ramp_zfixed_fs",
                     "share_shift_ramp_fs_r4_1", "share_shift_ramp_fs_r4_2"):
            try:
                txt = subprocess.run(["git", "-C", str(REPO), "show",
                                      f"{FS_BRANCH_SHA}:analysis/rerun/output/{c}/{name}.json"],
                                     capture_output=True, text=True, check=True).stdout
                fs[name] = json.loads(txt)
            except subprocess.CalledProcessError:
                pass
        out[(c, "fs", "tfp")] = fs["share_shift_tfp_ramp_fs"]
        out[(c, "fs", "zfixed")] = fs["share_shift_ramp_zfixed_fs"]
        r4 = [r for k, r in fs.items() if "_r4_" in k
              and abs((r["series"]["Y"][4] / base["series"]["Y"][4] - 1) * 100) <= 0.01]
        out[(c, "fs", "r4")] = r4[-1]
    return out


def write_expectations():
    old = _old_records()
    i = OLD_HEADLINE - START
    bands = {}
    for (c, v, k), rec in old.items():
        if k == "base":
            continue
        g = gaps(rec["series"], old[(c, "", "base")]["series"], i)
        bands[f"{c}|{v or 'common'}|{k}"] = {"label": rec["label"], **g}
    EXPECT.write_text(json.dumps({
        "written": "12 Nov 2026, before any surprise-2028 solve",
        "source": {"common": "analysis/rerun/output (main, #33)",
                   "fs": f"analysis/rerun/output at {FS_BRANCH_SHA} (PR #36)"},
        "compare": f"surprise {HEADLINE} gap vs 2026-start {OLD_HEADLINE} gap "
                   "(first full-weight year in both designs)",
        "band_rel": BAND_REL, "band_floor": BAND_FLOOR,
        "signs_2031": SIGNS,
        "labour_share": f"gap = -(scenario's labour_share_fall_pp) x ramp weight, within "
                        f"{LS_TOL_PP}pp (3.9 korinek, 2.9 uk_high, 1.6 uk_central, 0.7 uk_low)",
        "i_jump_flag_pct": I_JUMP_FLAG_PCT,
        "old_2030_gaps": bands,
        "bands_apply_to": "korinek arms only (the only scenario with a 2026-start counterpart)",
        "scenario_grid": sp.scenario_grid(),
        "signs_apply_to": "every scenario (uk_low, uk_central, uk_high, korinek)",
        "no_band": ["continuation", "r4 iterations other than the accepted one",
                    "debt-neutral arms (no 2026-start counterpart)"],
    }, indent=1))
    return EXPECT


# --- the gate -------------------------------------------------------------------------

def _sign_ok(x, rule, tol_zero=sp.R4_TOL_PP):
    return {">0": x > 0, "<0": x < 0, "<=0": x <= 1e-3, "~0": abs(x) <= tol_zero}[rule]


def check(closure, label, outdir=OUTDIR, year=sp.SURPRISE_YEAR) -> dict:
    done = sp.load(outdir, closure)
    rec = done[label]
    base_ext = sp.load_base_ext(outdir, closure)
    lab = sp.parse_label(label)
    k_, var, scen = lab["kind"], lab["variant"], lab["scenario"]
    if k_ == "continuation":
        ref = {**base_ext, "reference": "baseline"}
    else:
        ref = sp.reference_ext(outdir, closure, base_ext)
    s, b = rec["series"], ref["series"]
    n = len(s["Y"])
    res = []

    def add(name, ok, detail, level="fail"):
        res.append({"check": name, "ok": bool(ok), "level": level, "detail": detail})

    # 1. identities
    rel = lambda a, c: abs(a - c) / max(abs(c), 1e-12)
    add("K = K_d + K_f", max(rel(s["K"][i], s["K_d"][i] + s["K_f"][i]) for i in range(n)) <= ID_TOL,
        max(rel(s["K"][i], s["K_d"][i] + s["K_f"][i]) for i in range(n)))
    add("K_d = B - D_d", max(rel(s["K_d"][i], s["B"][i] - s["D_d"][i]) for i in range(n)) <= ID_TOL,
        max(rel(s["K_d"][i], s["B"][i] - s["D_d"][i]) for i in range(n)))
    add("D = D_d + D_f", max(rel(s["D"][i], s["D_d"][i] + s["D_f"][i]) for i in range(n)) <= ID_TOL,
        max(rel(s["D"][i], s["D_d"][i] + s["D_f"][i]) for i in range(n)))
    bad = [START + i for i in range(n) if s["K_f"][i] > 0 and s["GNI"][i] > s["Y"][i]]
    add("GNI <= GDP where K_f > 0", not bad, bad)
    bad = [START + i for i in range(n) if not s["NNI"][i] < s["GNI"][i]]
    add("NNI < GNI", not bad, bad)
    from uk_growth_with_ai import rerun
    base_rec = rerun.accepted_baseline(rerun.load(RERUN, closure))
    rc = [abs(base_rec["diagnostics"]["rc_rel_Y_signed"][1])] + \
        [abs(x) for x in rec["diagnostics"]["rc_rel_Y_signed"][:n - 2]]
    add("|RC/GDP| <= 1e-5, 2027-2036", max(rc) <= RC_TOL, dict(zip(range(2027, 2037), rc)))

    # 2. single point
    diff = [v for v in s if v in b and (s[v][0] != b[v][0] or s[v][1] != b[v][1])]
    add("every gap exactly 0 in 2026 and 2027", not diff, diff)

    if k_ == "continuation":
        rep = sp.continuation_report(rec, base_ext, year)
        add("restart reproduces the baseline 2028-2036", rep["ok"], rep)
        return _finish(closure, label, res, {}, {})

    i31, i28 = HEADLINE - START, year - START
    g31, g28 = gaps(s, b, i31), gaps(s, b, i28)

    # 3. signs and the labour share on the ramp
    r4_ok = k_ == "r4_iter" and abs(g31["Y"]) <= sp.R4_TOL_PP
    for v, rule in SIGNS["r4" if r4_ok else k_].items():
        add(f"sign 2031 {v} {rule}", _sign_ok(g31[v], rule), g31[v])
    w = sp.calendar_weights(year)
    target = sp.scenario_grid()[scen]
    fall = target["labour_share_fall_pp"]
    ls = {y: gaps(s, b, y - START)["labour_share_pp"] for y in range(year, HEADLINE + 1)}
    off = {y: ls[y] + fall * w[y] for y in ls}
    add("labour share = -target x ramp weight", max(abs(x) for x in off.values()) <= LS_TOL_PP,
        {"target_fall_pp": fall, "gap_pp": ls, "minus_expected_pp": off})

    # 4. size bands against the 2026-start 2030 gaps
    exp = json.loads(EXPECT.read_text())
    key = f"{closure}|{ {'': 'common', 'fs': 'fs', 'dn': 'dn'}[var] }|{'r4' if r4_ok else k_}"
    old = exp["old_2030_gaps"].get(key) if scen == "korinek" else None
    if old is None or (k_ == "r4_iter" and not r4_ok):
        add("size band vs 2026-start 2030", True, f"no band ({key})", level="info")
    else:
        for v, fl in BAND_FLOOR.items():
            new, ref_old = g31[v], old[v]
            flipped = abs(new) > fl and abs(ref_old) > fl and new * ref_old < 0
            far = abs(new - ref_old) > max(BAND_REL * abs(ref_old), fl)
            add(f"band 2031 {v} vs old 2030", not (flipped or far),
                {"new_2031": new, "old_2030": ref_old, "flipped": flipped})

    # 5. variants
    if closure == "zk0":
        add("zk0: K_f = 0", max(abs(x) for x in s["K_f"]) <= 1e-10, max(abs(x) for x in s["K_f"]))
        other = sp.load(OUTDIR, "zk0.1").get(label)
        if other is not None:
            try:
                ref1 = sp.reference_ext(OUTDIR, "zk0.1")
                dr1 = gaps(other["series"], ref1["series"], i31)["r_bp"]
                add("zk0: r rises more than at zk0.1", g31["r_bp"] > dr1,
                    {"zk0_bp": g31["r_bp"], "zk0.1_bp": dr1})
            except RuntimeError as e:
                add("zk0: r rises more than at zk0.1", True, f"not compared: {e}", "info")
    if var == "fs":
        G, Gb = s["G"], base_ext["series"]["G"]
        e = max(rel(G[i], Gb[i]) for i in range(i28, START + sp.TG1 - START))
        add("fixed spending: G at the baseline level 2028-35", e <= ID_TOL, e)
    if var == "dn":
        c = rec.get("dn_check") or sp.dn_check(rec, ref, year)
        add("debt-neutral: D/Y tracks the reference 2029-36", c["ok"], c)

    # 6. the 2028 jump
    add("2028 investment jump <= old 2026 +17%", g28["I"] <= I_JUMP_FLAG_PCT,
        {"I_2028_pct": g28["I"], "L_2028_pct": g28["L"]}, level="flag")

    # 7. red-flag diagnostics (#37 section 6), reported, never failed
    diag = diagnostics(rec, ref, base_rec, target, k_)
    add("diagnostics (red flags 1-3)", True, diag, level="info")
    out = _finish(closure, label, res, g31, g28)
    out["scenario"] = scen
    out["diagnostics"] = diag
    return out


# --- red-flag diagnostics (docs/red_flags_1_3.md) -------------------------------------

OBR_RATES = {"FRS 2026 Box 4.1": {"labour": 46.0, "capital": 27.0},
             "EFO Nov 2025 2.64": {"labour": 40.0, "capital": 17.0}}
OBR_RECEIPTS_PCT_GDP = -0.17      # March 2026 EFO 6.18: -GBP 6bn of GBP 3,632bn (2030-31)
REV = ("iit_revenue", "payroll_tax_revenue", "business_tax_revenue", "cons_tax_revenue",
       "bequest_tax_revenue", "wealth_tax_revenue")


def capital_elasticity(Ya, Ka, Yb, Kb, g1, g0=0.35):
    """Korinek et al.'s schedule (6): dlnK / dln(rental rate), rental = gamma Y / K."""
    import math
    dk = math.log(Ka / Kb)
    drent = math.log(g1 / g0) + math.log(Ya / Yb) - dk
    return {"dlnK": dk, "dln_rental": drent, "elasticity": dk / drent if drent else None}


TAU_PAYROLL = 0.15   # OG-UK macro_params.get_uk_tax_rates: employer NICs, 15% flat


def effective_rates(x, i, delta=sp.DELTA_ANNUAL, tau_payroll=TAU_PAYROLL):
    """Labour and capital effective rates.

    OG-Core's ``iit_revenue`` is income tax PLUS the payroll tax: OG-UK sets
    frac_tax_payroll = 0, so ``payroll_tax_revenue`` reads 0 although
    tau_payroll = 0.15 (employer NICs) is levied on w e n
    (ogcore/tax.py income_tax_liab: T_I + T_P).  So the payroll part is
    tau_payroll * w L, all on labour; the rest, T_I (income tax and employee
    NICs, fitted on PolicyEngine-UK's income_tax + national_insurance), is one
    function of total household income and is split pro rata between labour
    income w L and household capital income r_p B.  Capital also pays the
    business tax."""
    Y, LI = x["Y"][i], x["w"][i] * x["L"][i]
    KI, HK = Y - LI, x["r_p"][i] * x["B"][i]
    tp = tau_payroll * LI
    ti = x["iit_revenue"][i] - tp
    il, ik = ti * LI / (LI + HK), ti * HK / (LI + HK)
    bus = x["business_tax_revenue"][i]
    return {"labour": (il + tp) / LI * 100,
            "labour_excl_payroll": il / LI * 100,
            "capital_gross": (ik + bus) / KI * 100,
            "capital_net_of_depreciation": (ik + bus) / (KI - delta * x["K"][i]) * 100,
            "payroll_pct_gdp": tp / Y * 100,
            "income_tax_and_employee_nics_pct_gdp": ti / Y * 100,
            "household_capital_income_pct_gdp": HK / Y * 100}


def diagnostics(rec, ref, base_rec, target, kind_) -> dict:
    s, b = rec["series"], ref["series"]
    g1 = sp.G_BASE + target["labour_share_fall_pp"] / 100
    out = {"capital_supply_elasticity": {}, "gdp_per_tfp": {}}
    for y in (HEADLINE, sp.window()["debt_rule_year"]):
        i = y - START
        out["capital_supply_elasticity"][y] = capital_elasticity(
            s["Y"][i], s["K"][i], b["Y"][i], b["K"][i], g1)
        if kind_ == "tfp" and target["tfp_gain"]:
            out["gdp_per_tfp"][y] = (s["Y"][i] / b["Y"][i] - 1) / target["tfp_gain"]
    ss_a, ss_b = rec.get("ss") or {}, base_rec.get("ss") or {}
    if all(k in ss_a and k in ss_b for k in ("Y", "K")):
        out["capital_supply_elasticity"]["SS"] = capital_elasticity(
            ss_a["Y"], ss_a["K"], ss_b["Y"], ss_b["K"], g1)
        if kind_ == "tfp" and target["tfp_gain"]:
            out["gdp_per_tfp"]["SS"] = (ss_a["Y"] / ss_b["Y"] - 1) / target["tfp_gain"]
    i = HEADLINE - START
    if all(v in s and v in b for v in REV):
        dec = {v: (s[v][i] / s["Y"][i] - b[v][i] / b["Y"][i]) * 100 for v in REV}
        dtax = (s["total_tax_revenue"][i] / s["Y"][i]
                - b["total_tax_revenue"][i] / b["Y"][i]) * 100
        lsf = -gaps(s, b, i)["labour_share_pp"]
        out["tax_gdp_2031"] = {
            "change_pp": dtax, "by_base_pp": dec,
            "per_pp_of_labour_share_fall": dtax / lsf if lsf else None,
            "obr_per_pp": [-0.19, -0.23],
            "receipts_level_change_pct_gdp": (s["total_tax_revenue"][i]
                                              - b["total_tax_revenue"][i]) / b["Y"][i] * 100,
            "obr_receipts_6_18_pct_gdp": OBR_RECEIPTS_PCT_GDP,
            "labour_share_fall_pp": lsf}
        tp = rec.get("tau_payroll", TAU_PAYROLL)
        out["effective_rates_2031"] = {"arm": effective_rates(s, i, tau_payroll=tp),
                                       "reference": effective_rates(b, i, tau_payroll=tp),
                                       "obr": OBR_RATES}
        ra, rb = out["effective_rates_2031"]["arm"], out["effective_rates_2031"]["reference"]
        out["tax_gdp_2031"]["by_base_pp_payroll_split"] = {
            "payroll (employer NICs, tau_payroll)": ra["payroll_pct_gdp"] - rb["payroll_pct_gdp"],
            "income tax and employee NICs": (ra["income_tax_and_employee_nics_pct_gdp"]
                                             - rb["income_tax_and_employee_nics_pct_gdp"])}
    return out


def _finish(closure, label, res, g31, g28):
    fails = [r for r in res if not r["ok"] and r["level"] == "fail"]
    flags = [r for r in res if not r["ok"] and r["level"] == "flag"]
    return {"closure": closure, "label": label, "ok": not fails,
            "fails": [r["check"] for r in fails], "flags": [r["check"] for r in flags],
            "gaps_2031": g31, "gaps_2028": g28, "checks": res}


# --- progress table for #27 -------------------------------------------------------------

def progress(outdir=OUTDIR) -> str:
    rows = ["**Surprise 2028 progress** (rerun/surprise-2028; gaps vs the no-shock restart)",
            "", "| closure | solve | min | sanity | 2028 I | 2028 L | 2031 GDP | 2031 K | "
            "2031 wage | 2031 LS pp | 2031 Δr bp | 2031 GNI | 2031 NNI |",
            "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for c in ("zk0.1", "zk0", "zk0.5"):
        for label, rec in sp.load(outdir, c).items():
            f = Path(outdir) / c / f"{label}.sanity.json"
            san = json.loads(f.read_text()) if f.exists() else None
            st = "–" if san is None else ("pass" if san["ok"] else "FAIL: " + "; ".join(san["fails"]))
            if san and san["flags"]:
                st += " (flag: " + "; ".join(san["flags"]) + ")"
            g, h = (san or {}).get("gaps_2031") or {}, (san or {}).get("gaps_2028") or {}
            fmt = lambda d, v, u="%": f"{d[v]:+.2f}{u}" if v in d else "–"
            rows.append(f"| {c} | `{label}` | {rec.get('elapsed_min', 0):.1f} | {st} | "
                        f"{fmt(h, 'I')} | {fmt(h, 'L')} | {fmt(g, 'Y')} | {fmt(g, 'K')} | "
                        f"{fmt(g, 'w')} | {fmt(g, 'labour_share_pp', '')} | "
                        f"{fmt(g, 'r_bp', '')} | {fmt(g, 'GNI')} | {fmt(g, 'NNI')} |")
    return "\n".join(rows)


def main(argv=None) -> int:
    a = argparse.ArgumentParser()
    a.add_argument("closure", nargs="?")
    a.add_argument("label", nargs="?")
    a.add_argument("--outdir", default=str(OUTDIR))
    a.add_argument("--write-expectations", action="store_true")
    a.add_argument("--progress", action="store_true")
    args = a.parse_args(argv)
    if args.write_expectations:
        print("wrote", write_expectations())
        return 0
    if args.progress:
        print(progress(args.outdir))
        return 0
    out = check(args.closure, args.label, Path(args.outdir))
    f = Path(args.outdir) / args.closure / f"{args.label}.sanity.json"
    f.write_text(json.dumps(out, indent=1, default=float))
    for r in out["checks"]:
        mark = "ok  " if r["ok"] else ("FAIL" if r["level"] == "fail" else r["level"].upper())
        print(f"{mark} {r['check']}")
    print(("SANITY PASS " if out["ok"] else "SANITY FAIL ") + f"{args.closure} {args.label}"
          + (f": {out['fails']}" if out["fails"] else "")
          + (f" (flags: {out['flags']})" if out["flags"] else ""))
    return 0 if out["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
