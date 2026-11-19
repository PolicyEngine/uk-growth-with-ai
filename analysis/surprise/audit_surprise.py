"""Independent audit of the finished surprise solves, for any shock year.

audit_2028.py (branch audit/sanity-2028-final, behind docs/results_sanity_2028.md) with a
`--year` flag.  With `--year 2028` (the default) the output is byte-identical to audit_2028.py.

Reads committed JSON only: the surprise records (analysis/surprise/output/<closure>/*.json
for 2028, analysis/surprise<year>/output/<closure>/*.json for any other year), the 2026-start
records in analysis/rerun/output, and analysis/surprise/uk_targets.json.  It runs no
OG solve and does not import uk_growth_with_ai or analysis/surprise/sanity.py; every
identity is recomputed here from the exported series, and every date is re-derived from
the shock year in `dates` (the same rule as uk_growth_with_ai.surprise.window and
calendar_weights; tests/test_audit_surprise.py holds the two together).

    python analysis/surprise/audit_surprise.py                # all sections, 2028 set
    python analysis/surprise/audit_surprise.py --year 2027    # the 2027 set
    python analysis/surprise/audit_surprise.py --verdict      # the verdict tables (markdown)
    python analysis/surprise/audit_surprise.py --mono         # section 9 alone
    python analysis/surprise/audit_surprise.py --dnfull       # the `_dnfull` checks alone (outside the verdict design)

Roles of the dates (2028 set / 2027 set): shock year SY (2028 / 2027), the ramp's zero year
and Z anchor ZY = SY - 1 (2027 / 2026), headline HY = SY + 3 (2031 / 2030).  2036 (the debt
rule's first year), the 2026-36 series and every date of the 2026-start runs are fixed.
"""
import glob
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OLD = os.path.join(HERE, "..", "rerun", "output")
YEARS = list(range(2026, 2037))
IX = {y: i for i, y in enumerate(YEARS)}
G0 = 0.35
RAMP_YEARS = 4          # the shock is at 0.25 in the shock year and at full size three years later
OLD_HEADLINE = 2030     # headline of the 2026-start runs in analysis/rerun/output
DEFAULT_YEAR = 2028


def dates(year):
    """Every date of the design, from the shock year.

    Re-derives uk_growth_with_ai.surprise.window(year) and calendar_weights(year) without importing them.
    """
    year = int(year)
    zero = year - 1
    head = zero + RAMP_YEARS
    if zero < YEARS[0] or head + 1 > YEARS[-1]:
        raise ValueError(f"shock year {year}: need {YEARS[0] + 1} <= year <= {YEARS[-1] - RAMP_YEARS}")
    weight = {y: (0.0 if y < year else float(min(max((y - zero) / RAMP_YEARS, 0.0), 1.0))) for y in YEARS}
    return {"surprise_year": year, "ramp_zero_year": zero, "z_anchor_year": zero, "headline_year": head,
            "r4_year": head, "ramp_full_year": head, "debt_rule_year": YEARS[-1], "years": list(YEARS),
            "pre_shock_years": list(range(YEARS[0], year)),
            "report_years": list(range(zero, head + 1)),       # the reporting window (not used by the audit's tables)
            # the year as far after the headline as the 2026-start runs' last year (2035) is after theirs (2030)
            "far_year": min(head + 5, YEARS[-1]),
            "weights": weight,
            "ix": {"shock": IX[year], "zero": IX[zero], "headline": IX[head]},
            "output_dir": "output" if year == DEFAULT_YEAR else os.path.join("..", f"surprise{year}", "output")}


def configure(year=DEFAULT_YEAR):
    """Set every year-dependent global for the shock year (called once at import with the default)."""
    global SY, ZY, HY, FAR, PRE, OUT, WEIGHT, W, ARM_NAME
    dt = dates(year)
    SY, ZY, HY, FAR = dt["surprise_year"], dt["ramp_zero_year"], dt["headline_year"], dt["far_year"]
    PRE = str(YEARS[0]) if ZY == YEARS[0] else f"{YEARS[0]}-{ZY % 100}"    # the pre-shock years: "2026-27" or "2026"
    OUT = os.path.normpath(os.path.join(HERE, dt["output_dir"]))
    WEIGHT = dt["weights"]
    W = np.array([WEIGHT[y] for y in YEARS])
    ARM_NAME = {"tfp": "automation + productivity", "zfixed": "technology unchanged",
                "r4": f"stress test ({HY} GDP held)"}
    build_tables()
    return dt


SCEN = ["uk_low", "uk_central", "uk_high", "korinek"]
ARMS = ["tfp", "zfixed", "r4"]
CLOSURES = ["zk0.1", "zk0", "zk0.5"]   # zk0.5 is a sensitivity closure (final pass, 13 Nov 2026)
ZK_ORDER = ["zk0", "zk0.1", "zk0.5"]      # increasing openness of the capital account
TARGETS = json.load(open(os.path.join(HERE, "uk_targets.json")))["scenarios"]
TARGETS["korinek"] = TARGETS["korinek_us_substantial_upper"]
FALL = {s: TARGETS[s]["labour_share_fall_pp"] for s in SCEN}
TFP = {s: TARGETS[s]["tfp_gain_pct"] for s in SCEN}
np.set_printoptions(linewidth=220, precision=4, suppress=True)


def load():
    runs = {}
    for c in CLOSURES:
        runs[c] = {}
        for f in sorted(glob.glob(os.path.join(OUT, c, "*.json"))):
            n = os.path.basename(f)[:-5]
            if n.endswith(".sanity") or n.startswith("GATE") or n == "baseline_ext":
                continue
            if not in_design(n):
                OUTSIDE.append(f"{c}/{n}")       # e.g. debt-neutral (_dn) or fixed-spending (_fs) variants
                continue
            runs[c][n] = json.load(open(f))
    return runs


OUTSIDE = []
SANITY_WORST = {}  # sec_vs_sanity's worst gap difference over in-design runs
IDENT_WORST = {}   # section 1's worst accepted values, filled by sec_identities


def in_design(n):
    """The continuation and the three arms per scenario under the common G/Y rule; nothing else is audited here."""
    import re
    return n == "continuation" or any(
        re.fullmatch(f"{s}_share_shift_((tfp_ramp|ramp_zfixed)(_dn|_fs)?|ramp(_dn|_fs)?_r4_\\d+)", n) for s in SCEN)


VARIANTS = ["", "dn", "fs"]
VAR_NAME = {"": "common G/Y rule", "dn": "debt-neutral transfers", "fs": "fixed spending"}


def variant(n):
    """'' (common G/Y rule), 'dn' (debt-neutral transfers) or 'fs' (fixed spending), from the label."""
    import re
    m = re.search(r"_(dn|fs)(_r4_\d+)?$", n)
    return m.group(1) if m else ""


def pick(runs, c, s, a, var=""):
    """Label of the finished solve for (closure, scenario, arm, variant), or None."""
    d = runs[c]
    sfx = f"_{var}" if var else ""
    if a == "tfp":
        n = f"{s}_share_shift_tfp_ramp{sfx}"
        return n if n in d else None
    if a == "zfixed":
        n = f"{s}_share_shift_ramp_zfixed{sfx}"
        return n if n in d else None
    its = sorted((k for k in d if k.startswith(f"{s}_share_shift_ramp{sfx}_r4_")), key=lambda k: int(k.rsplit("_", 1)[1]))
    # the accepted iteration is the last one whose headline-year GDP gap is inside 0.01pp
    ok = [k for k in its if abs(gap(d, k, "Y")[IX[HY]]) <= 0.01]
    return ok[-1] if ok else None


def S(d, n, v):
    return np.array(d[n]["series"][v], dtype=float)


def gap(d, n, v):
    return 100 * (S(d, n, v) / S(d, "continuation", v) - 1)


def gam(rec):
    return G0 + W * (rec["gamma_terminal"] - G0) if rec.get("gamma_terminal") else np.full(11, G0)


def zpath(rec):
    return 1 + W * (rec["Z_terminal"] - 1) if rec.get("Z_terminal") else np.ones(11)


def relmax(a, b):
    return float(np.max(np.abs(a - b) / np.maximum(np.abs(b), 1e-300)))


def growth_factors(d, n):
    """(1+g_n,t+1) e^{g_y} for t = 2026..2035, from I_total_t = growth K_{t+1} - (1-delta) K_t."""
    K, I = S(d, n, "K"), S(d, n, "I_total")
    return (I[:-1] + (1 - d[n]["delta"]) * K[:-1]) / K[1:]


def tax_ratio(d, n):
    return S(d, n, "total_tax_revenue") / S(d, n, "Y")


def measures(d, n):
    """Arrays of gaps by year (2026-36) for the verdict table and the cross tables."""
    ref = "continuation"
    m = {v: gap(d, n, v) for v in ("Y", "GNI", "NNI", "K", "L", "w", "C", "I", "I_total", "B", "D", "G")}
    m["r_bp"] = 1e4 * (S(d, n, "r") - S(d, ref, "r"))
    ls = lambda k: S(d, k, "w") * S(d, k, "L") / S(d, k, "Y")
    m["ls_pp"] = 100 * (ls(n) - ls(ref))
    m["debt_pp"] = 100 * (S(d, n, "D") / S(d, n, "Y") - S(d, ref, "D") / S(d, ref, "Y"))
    m["tax_pp"] = 100 * (tax_ratio(d, n) - tax_ratio(d, ref))
    for v in ("GNI", "NNI"):                     # level changes, pp of continuation GDP
        m[v + "_lvl"] = 100 * (S(d, n, v) - S(d, ref, v)) / S(d, ref, "Y")
    # final pass: the capital term of the GDP gap and the bound with the return pinned (L fixed), log points x100
    g, z = gam(d[n]), zpath(d[n])
    K0, L0 = S(d, ref, "K"), S(d, ref, "L")
    m["Y_lp"] = 100 * np.log(S(d, n, "Y") / S(d, ref, "Y"))
    m["cap_lp"] = 100 * g * np.log(S(d, n, "K") / K0)
    tech = 100 * (np.log(z) + (g - G0) * np.log(K0 / L0))
    m["bound_lp"] = (tech + g * 100 * np.log(g / G0)) / (1 - g)
    # the closure's restart error (largest relative gap of the continuation against the baseline), in per cent
    m["noise_pct"] = 100 * d[ref]["continuation_report"]["max"]
    return m


# ---------------------------------------------------------------- sections
def identity_errors(d, n, coef, gref, base, ref="continuation"):
    """Section 1's identity errors for run n of closure dict d; ref is the no-shock reference."""
    rec = d[n]
    s = {v: S(d, n, v) for v in rec["series"]}
    dl = rec["delta"]
    g, z = gam(rec), zpath(rec)
    e = {}
    e["K"] = relmax(s["K_d"] + s["K_f"], s["K"])
    e["Kd"] = relmax(s["B"] - s["D_d"], s["K_d"])
    e["D"] = relmax(s["D_d"] + s["D_f"], s["D"])
    e["GNI"] = relmax(s["Y"] - s["r_p"] * (s["K_f"] + s["D_f"]), s["GNI"])
    e["NNI"] = relmax(s["GNI"] - dl * s["K"], s["NNI"])
    e["Yfn"] = relmax(z * s["K"] ** g * s["L"] ** (1 - g), s["Y"])
    e["w"] = relmax((1 - g) * s["Y"] / s["L"], s["w"])
    e["r"] = float(np.max(np.abs(coef[0] * g * s["Y"] / s["K"] + coef[1] - dl - s["r"])))
    rc = (s["Y"] - s["C"] - s["I_d"] - s["I_g"] - s["G"]
          - (s["r_p"] + dl) * s["K_f"] + s["new_borrowing_f"] - s["debt_service_f"]) / s["Y"]
    k, z0 = IX[SY], IX[ZY]                                         # the shock year and the year before it
    e["rc"] = float(np.max(np.abs(rc[k:])))
    e["rc27"] = float(abs(rc[z0]))                                 # the last pre-shock year (2027 for the 2028 set)
    gf = growth_factors(d, n)
    e["gr"] = float(np.max(np.abs(gf[k:] / gref[k:] - 1)))       # SY->SY+1 .. 2035->36
    # ZY->SY: K_f is reset on impact, so shock-year capital is not the previous year's capital plus its investment
    e["jump"] = 100 * gref[z0] * (s["K"][k] - S(d, ref, "K")[k]) / S(d, ref, "Y")[z0]
    lhs = gref * s["D"][1:]
    rhs = ((1 + s["r_gov"]) * s["D"] + s["G"] + s["I_g"] + s["TR"] + s["agg_pension_outlays"]
           - s["total_tax_revenue"])[:-1]
    e["debt"] = float(np.max(np.abs(lhs - rhs) / s["Y"][:-1]))
    e["zero"] = max(relmax(s[v][:k], np.array(base[v])[:k]) for v in base if v != "I_g" and v != "payroll_tax_revenue")
    e["st"] = max(abs(s[v][k] / S(d, ref, v)[k] - 1) for v in ("B", "D", "D_d", "D_f", "K_d"))
    ls = 100 * (s["w"] * s["L"] / s["Y"] - 0.65)
    tgt = -100 * (g - G0)
    e["ls"] = float(np.max(np.abs(ls - tgt)))
    return e


def sec_identities(runs):
    print("\n## 1. Identities, recomputed (max over 2026-36 unless stated)")
    hdr = (f"closure|run|K=Kd+Kf|Kd=B-Dd|D=Dd+Df|GNI|NNI|delta|prod fn Y|wage FOC|r FOC|RC/GDP max {SY}-36"
           f"|RC/GDP {ZY}|I_total growth vs cont {SY}-35|{SY} capital with no {ZY} investment, % of GDP|debt law 2026-35|zeros {PRE} vs baseline|{SY} state vs cont|LS vs -target*w (pp)")
    print(hdr); print("|".join("---" for _ in hdr.split("|")))
    worst = {}
    for c in CLOSURES:
        d = runs[c]
        base = json.load(open(os.path.join(OUT, c, "baseline_ext.json")))["series"]
        # r FOC: r + delta = a * gamma Y/K + b, a = 1 - tau_b, b = tau_b delta_tau (+ credit); fit on the continuation
        Y, K = S(d, "continuation", "Y"), S(d, "continuation", "K")
        A = np.c_[G0 * Y / K, np.ones(11)]
        coef = np.linalg.lstsq(A, S(d, "continuation", "r") + d["continuation"]["delta"], rcond=None)[0]
        gref = growth_factors(d, "continuation")
        print(f"<!-- {c}: r + delta = {coef[0]:.6f} * gamma Y/K + {coef[1]:.6f} (fit on the continuation) -->")
        for n, rec in d.items():
            e = identity_errors(d, n, coef, gref, base)
            dl = rec["delta"]
            for k, v in e.items():
                worst[k] = max(worst.get(k, 0), v)
            print(f"{c}|{n}|" + "|".join(f"{e[k]:.1e}" for k in
                  ("K", "Kd", "D", "GNI", "NNI")) + f"|{dl:.4f}|" + "|".join(f"{e[k]:.1e}" for k in
                  ("Yfn", "w", "r", "rc", "rc27", "gr")) + f"|{e['jump']:+.3f}|" + "|".join(f"{e[k]:.1e}" for k in ("debt", "zero", "st", "ls")))
    print("worst:", {k: f"{v:.1e}" for k, v in worst.items()})
    IDENT_WORST.update(worst)
    # continuation against the committed baseline, shock year to 2036
    for c in CLOSURES:
        d = runs[c]
        base = json.load(open(os.path.join(OUT, c, "baseline_ext.json")))["series"]
        w = {v: relmax(S(d, "continuation", v)[IX[SY]:], np.array(base[v])[IX[SY]:]) for v in ("Y", "K", "L", "C", "w", "r", "D", "B", "GNI")}
        print(f"continuation vs committed baseline {SY}-36, {c}: max rel", {k: f"{v:.1e}" for k, v in w.items()})


def sec_variants(runs):
    """The two fiscal variants: does the closure do what it says?"""
    print("\n## Fiscal variants: closure checks")
    print(f"closure|run|variant|dn: max |D/Y / reference - 1|, {SY + 1}-36|fs: max rel dev of G from reference, {SY}-35|fs: same for TR|G/Y gap {HY} pp|TR/Y gap {HY} pp|TR gap {HY} %|verdict")
    print("|".join(["---"] * 10))
    bad = []
    for c in CLOSURES:
        d = runs[c]
        bse = json.load(open(os.path.join(OUT, c, "baseline_ext.json")))["series"]
        bx = lambda x: np.array(bse[x], dtype=float)
        for n in d:
            v = variant(n)
            if not v:
                continue
            f = lambda k, x: S(d, k, x)
            dy = f(n, "D") / f(n, "Y") / (f("continuation", "D") / f("continuation", "Y")) - 1
            e_dn = float(np.max(np.abs(dy[IX[SY + 1]:])))
            # baseline_spending holds G and TR at the committed baseline's levels (baseline_ext.json), not the
            # continuation's; the two differ by the continuation's solver error (~5e-6), so compare with the baseline
            e_g = float(np.max(np.abs(f(n, "G") / bx("G") - 1)[IX[SY]:IX[2036]]))
            e_tr = float(np.max(np.abs(f(n, "TR") / bx("TR") - 1)[IX[SY]:IX[2036]]))
            i = IX[HY]
            gy = 100 * ((f(n, "G") / f(n, "Y"))[i] - (f("continuation", "G") / f("continuation", "Y"))[i])
            ty = 100 * ((f(n, "TR") / f(n, "Y"))[i] - (f("continuation", "TR") / f("continuation", "Y"))[i])
            ok = (e_dn <= 1e-4) if v == "dn" else (e_g <= 1e-6 and e_tr <= 1e-6)
            if not ok:
                bad.append(f"{c}/{n}")
            print(f"{c}|{n}|{v}|{e_dn:.1e}|{e_g:.1e}|{e_tr:.1e}|{gy:+.3f}|{ty:+.3f}|{gap(d, n, 'TR')[i]:+.2f}|{'closure holds' if ok else 'WRONG: closure not met'}")
    print("variant closure failures:", bad or "none")
    return bad


def sec_rules_open(runs):
    """The closure rules, rebuilt: K_f = zeta_K (K_open - K_d), new foreign gilts = zeta_D x new borrowing."""
    print("\n## Closure rules rebuilt from the series")
    print("closure|run|K_f / [zeta_K (K_open - K_d)]: min .. max over 2026-36|new_borrowing_f / [zeta_D x (growth D' - D)]: max abs dev|debt_service_f / (r_p D_f): max abs dev|max abs (r - r_gov - shift), shift from 2026")
    print("---|---|---|---|---|---")
    for c in CLOSURES:
        d = runs[c]
        Y, K = S(d, "continuation", "Y"), S(d, "continuation", "K")
        dl = d["continuation"]["delta"]
        co = np.linalg.lstsq(np.c_[G0 * Y / K, np.ones(11)], S(d, "continuation", "r") + dl, rcond=None)[0]
        gref = growth_factors(d, "continuation")
        for n, rec in d.items():
            s = {v: S(d, n, v) for v in rec["series"]}
            g, z = gam(rec), zpath(rec)
            cl = rec["closure"]
            # capital demand at the world rate, given L: gamma Z (K/L)^(gamma-1) = MPK*, MPK* from the r condition
            mpk = (cl["world_int_rate_annual"] + dl - co[1]) / co[0]
            k_open = s["L"] * (g * z / mpk) ** (1 / (1 - g))
            if cl["zeta_K"] > 0:
                q = s["K_f"] / (cl["zeta_K"] * (k_open - s["K_d"]))
                kf = f"{q.min():.4f} .. {q.max():.4f}"
            else:
                kf = f"K_f = 0 (max {np.max(np.abs(s['K_f'])):.0e})"
            nb = s["new_borrowing_f"][:-1] / (cl["zeta_D"] * (gref * s["D"][1:] - s["D"][:-1])) - 1
            nb = np.delete(nb, IX[ZY])     # ZY -> SY (2027 -> 2028 for the 2028 set) is the splice year: its flow is the baseline's
            ds = np.max(np.abs(s["debt_service_f"] / (s["r_p"] * s["D_f"]) - 1))
            sh = np.max(np.abs(s["r"] - s["r_gov"] - (s["r"][0] - s["r_gov"][0])))
            print(f"{c}|{n}|{kf}|{np.max(np.abs(nb)):.1e}|{ds:.1e}|{sh:.1e}")


def sec_z(runs):
    print(f"\n## Z_terminal re-derived from the continuation's {ZY} K and L")
    print(f"closure|run|Z recorded|Z re-derived|rel diff|fixed-input gain at {ZY} inputs %|at {HY} continuation inputs %|at 2036 %")
    print("---|---|---|---|---|---|---|---")
    for c in CLOSURES:
        d = runs[c]
        K, L = S(d, "continuation", "K"), S(d, "continuation", "L")
        a0 = IX[ZY]                                   # the Z anchor year
        for n, rec in d.items():
            if n == "continuation":
                continue
            g1, z1 = rec["gamma_terminal"], rec["Z_terminal"]
            s = n.split("_share")[0]
            fx = lambda y: 100 * (z1 * (K[IX[y]] / L[IX[y]]) ** (g1 - G0) - 1)
            if "tfp" in n:
                zd = (1 + TFP[s] / 100) * (K[a0] / L[a0]) ** (G0 - g1)
            elif "zfixed" in n:
                zd = (K[a0] / L[a0]) ** (G0 - g1)
            else:
                zd = float("nan")
            print(f"{c}|{n}|{z1:.6f}|{zd:.6f}|{(zd / z1 - 1):.1e}|{fx(ZY):+.4f}|{fx(HY):+.4f}|{fx(2036):+.4f}")


def decomp(d, n, y):
    """Exact log split of the GDP gap in year y: technology at the reference inputs, capital, labour."""
    rec = d[n]
    i = IX[y]
    g1, z1 = gam(rec)[i], zpath(rec)[i]
    K0, L0, Y0 = (S(d, "continuation", v)[i] for v in ("K", "L", "Y"))
    K1, L1, Y1 = (S(d, n, v)[i] for v in ("K", "L", "Y"))
    tech = np.log(z1) + (g1 - G0) * np.log(K0 / L0)
    cap = g1 * np.log(K1 / K0)
    lab = (1 - g1) * np.log(L1 / L0)
    tot = np.log(Y1 / Y0)
    # the split as literally asked: changes in log Z, gamma log K and (1-gamma) log L
    raw = (np.log(z1), g1 * np.log(K1) - G0 * np.log(K0), (1 - g1) * np.log(L1) - (1 - G0) * np.log(L0))
    return 100 * tech, 100 * cap, 100 * lab, 100 * tot, [100 * x for x in raw]


def sec_decomp(runs):
    print(f"\n## 2. GDP gap split, log points x100 ({HY})")
    print("closure|run|technology at ref inputs|capital g1*dlnK|labour (1-g1)*dlnL|sum|dlnY|residual|raw dlnZ|raw d(g lnK)|raw d((1-g) lnL)|raw sum - dlnY")
    print("---|---|---|---|---|---|---|---|---|---|---|---")
    for c in CLOSURES:
        d = runs[c]
        for n in d:
            if n == "continuation":
                continue
            t, k, l, tot, raw = decomp(d, n, HY)
            print(f"{c}|{n}|{t:+.3f}|{k:+.3f}|{l:+.3f}|{t + k + l:+.3f}|{tot:+.3f}|{t + k + l - tot:.1e}|"
                  f"{raw[0]:+.3f}|{raw[1]:+.3f}|{raw[2]:+.3f}|{sum(raw) - tot:.1e}")


def sec_wage(runs):
    print(f"\n## 3. Wage: dln w = dln(1-gamma) + dln(Y/L), {HY}, log points x100")
    print("closure|run|dln(1-g)|dln(Y/L)|of which technology|capital deepening g1*dln(K/L)|sum|dln w (series)|residual|wage gap %")
    print("---|---|---|---|---|---|---|---|---|---")
    for c in CLOSURES:
        d = runs[c]
        i = IX[HY]
        for n, rec in d.items():
            if n == "continuation":
                continue
            g1 = gam(rec)[i]
            a = 100 * np.log((1 - g1) / (1 - G0))
            yl = 100 * np.log((S(d, n, "Y")[i] / S(d, n, "L")[i]) / (S(d, "continuation", "Y")[i] / S(d, "continuation", "L")[i]))
            t, k, l, tot, _ = decomp(d, n, HY)
            kl = 100 * g1 * np.log((S(d, n, "K")[i] / S(d, n, "L")[i]) / (S(d, "continuation", "K")[i] / S(d, "continuation", "L")[i]))
            dw = 100 * np.log(S(d, n, "w")[i] / S(d, "continuation", "w")[i])
            print(f"{c}|{n}|{a:+.4f}|{yl:+.4f}|{t:+.4f}|{kl:+.4f}|{a + yl:+.4f}|{dw:+.4f}|{a + yl - dw:.1e}|{gap(d, n, 'w')[i]:+.4f}")


def sec_cross(runs):
    print(f"\n## 4. Cross-scenario, {HY} gaps")
    vs = ["Y", "GNI", "NNI", "K", "L", "w", "C", "I", "r_bp", "ls_pp", "debt_pp", "tax_pp"]
    for c in CLOSURES:
        d = runs[c]
        print(f"\n{c}\nscenario|arm|run|" + "|".join(vs) + "|K_f share of dK %|elasticity dlnK/dln(gY/K)")
        print("|".join(["---"] * (len(vs) + 5)))
        for s in SCEN:
            for a in ARMS:
                n = pick(runs, c, s, a)
                if n is None:
                    print(f"{s}|{a}|not solved" + "|" * (len(vs) + 2)); continue
                m = measures(d, n); i = IX[HY]
                dK = S(d, n, "K")[i] - S(d, "continuation", "K")[i]
                kf = 100 * (S(d, n, "K_f")[i] - S(d, "continuation", "K_f")[i]) / dK
                g1 = gam(d[n])[i]
                rent = np.log(g1 * S(d, n, "Y")[i] / S(d, n, "K")[i]) - np.log(G0 * S(d, "continuation", "Y")[i] / S(d, "continuation", "K")[i])
                el = np.log(S(d, n, "K")[i] / S(d, "continuation", "K")[i]) / rent
                print(f"{s}|{a}|{n}|" + "|".join(f"{m[v][i]:+.3f}" for v in vs) + f"|{kf:.1f}|{el:.3f}")
        print(f"\n{c}: per unit of shock ({HY})")
        print("scenario|zfixed GDP per pp of share fall|(tfp - zfixed) GDP per 1% TFP|tfp GDP / TFP|r4 wage per pp|r4 dr bp per pp|zfixed K per pp|TFP/share ratio|Z_r4 - Z_zfixed, % of Z")
        print("---|---|---|---|---|---|---|---|---")
        for s in SCEN:
            n = {a: pick(runs, c, s, a) for a in ARMS}
            i = IX[HY]
            f = lambda a, v: measures(d, n[a])[v][i] if n[a] else float("nan")
            zz = 100 * (d[n["r4"]]["Z_terminal"] / d[n["zfixed"]]["Z_terminal"] - 1) if n["r4"] and n["zfixed"] else float("nan")
            print(f"{s}|{f('zfixed', 'Y') / FALL[s]:.3f}|{(f('tfp', 'Y') - f('zfixed', 'Y')) / TFP[s]:.3f}|{f('tfp', 'Y') / TFP[s]:.3f}|"
                  f"{f('r4', 'w') / FALL[s]:.3f}|{f('r4', 'r_bp') / FALL[s]:.2f}|{f('zfixed', 'K') / FALL[s]:.3f}|{TFP[s] / FALL[s]:.3f}|{zz:+.4f}")


def sec_dynamics(runs):
    print("\n## 5. Dynamics")
    for c in CLOSURES:
        d = runs[c]
        ref = "continuation"
        Y0 = S(d, ref, "Y")
        print(f"\n### {c}: expenditure split of the GDP gap, pp of continuation GDP (Y = C + I_d + G + net outflows)")
        print("run|year|dY|dC|dI_d|dG|d net outflows|sum check|dGNI|dNNI|dB (wealth)|d tax rev|dL %|dw %|dr_p bp")
        print("|".join(["---"] * 15))
        for n in d:
            if n == ref:
                continue
            for y in (SY, HY, 2035):
                i = IX[y]
                f = lambda v: 100 * (S(d, n, v)[i] - S(d, ref, v)[i]) / Y0[i]
                no = lambda k: ((S(d, k, "r_p") + d[k]["delta"]) * S(d, k, "K_f") - S(d, k, "new_borrowing_f") + S(d, k, "debt_service_f"))[i]
                dno = 100 * (no(n) - no(ref)) / Y0[i]
                print(f"{n}|{y}|{f('Y'):+.3f}|{f('C'):+.3f}|{f('I_d'):+.3f}|{f('G'):+.3f}|{dno:+.3f}|{f('Y') - f('C') - f('I_d') - f('G') - dno:+.1e}|"
                      f"{f('GNI'):+.3f}|{f('NNI'):+.3f}|{f('B'):+.3f}|{f('total_tax_revenue'):+.3f}|{gap(d, n, 'L')[i]:+.3f}|{gap(d, n, 'w')[i]:+.3f}|{1e4 * (S(d, n, 'r_p')[i] - S(d, ref, 'r_p')[i]):+.1f}")
        print(f"\n### {c}: who finances the extra capital, share of dK (%), and K gap path")
        print("run|" + "|".join(f"{y} dK% (Kf/B/-Dd)" for y in (SY, HY, 2036)) + f"|GDP gap {HY}..2036")
        print("|".join(["---"] * 5))
        for n in d:
            if n == ref:
                continue
            cells = []
            for y in (SY, HY, 2036):
                i = IX[y]
                dv = lambda v: S(d, n, v)[i] - S(d, ref, v)[i]
                dK = dv("K")
                cells.append(f"{gap(d, n, 'K')[i]:+.2f}% (" + ("-" if abs(dK) < 1e-12 else f"{100 * dv('K_f') / dK:.0f}/{100 * dv('B') / dK:.0f}/{-100 * dv('D_d') / dK:.0f}") + ")")
            print(f"{n}|" + "|".join(cells) + "|" + ", ".join(f"{x:+.3f}" for x in gap(d, n, "Y")[IX[HY]:]))
        print(f"\n### {c}: debt/GDP gap, pp, and what drives it (counterfactual recursions on the continuation path)")
        print(f"run|{HY}|2035|2036|2036 from r_gov alone|from primary balance/GDP alone|from growth alone|all three (= gap)|d r_gov bp {HY}|d primary deficit/GDP pp {HY} (tax, G+TR, pensions)")
        print("|".join(["---"] * 10))
        gr = growth_factors(d, ref)
        def path(n_r, n_p, n_g):
            # shock-year debt is predetermined; its ratio to GDP moves with shock-year GDP (counted under growth)
            dy = [S(d, ref, "D")[IX[SY]] / S(d, n_g, "Y")[IX[SY]]]
            for i in range(IX[SY], IX[2036]):
                pd = lambda k: ((S(d, k, "G") + S(d, k, "TR") + S(d, k, "agg_pension_outlays") - S(d, k, "total_tax_revenue")) / S(d, k, "Y"))[i]
                yg = S(d, n_g, "Y")[i + 1] / S(d, n_g, "Y")[i] * gr[i]
                dy.append(((1 + S(d, n_r, "r_gov")[i]) * dy[-1] + pd(n_p)) / yg)
            return np.array(dy)
        base = path(ref, ref, ref)
        for n in d:
            if n == ref:
                continue
            m = measures(d, n)
            a, p_, g_, full = (100 * (path(*x)[-1] - base[-1]) for x in ((n, ref, ref), (ref, n, ref), (ref, ref, n), (n, n, n)))
            i = IX[HY]
            r = lambda k, v: (S(d, k, v) / S(d, k, "Y"))[i]
            dt = 100 * (r(n, "total_tax_revenue") - r(ref, "total_tax_revenue"))
            dg = 100 * (r(n, "G") + r(n, "TR") - r(ref, "G") - r(ref, "TR"))
            dp = 100 * (r(n, "agg_pension_outlays") - r(ref, "agg_pension_outlays"))
            print(f"{n}|{m['debt_pp'][IX[HY]]:+.3f}|{m['debt_pp'][IX[2035]]:+.3f}|{m['debt_pp'][IX[2036]]:+.3f}|{a:+.3f}|{p_:+.3f}|{g_:+.3f}|{full:+.3f}|"
                  f"{1e4 * (S(d, n, 'r_gov')[i] - S(d, ref, 'r_gov')[i]):+.1f}|{dg + dp - dt:+.3f} ({-dt:+.3f}, {dg:+.3f}, {dp:+.3f})")
        # the 2036 debt rule
        rows, rhs = [], []
        for n in d:
            i = IX[2036]
            s = {v: S(d, n, v)[i] for v in ("Y", "D", "G", "TR", "agg_pension_outlays", "total_tax_revenue", "r_gov")}
            rhs.append(s["G"] + (1 + s["r_gov"]) * s["D"] - s["total_tax_revenue"] + s["agg_pension_outlays"] + s["TR"])
            rows.append([0.95 * s["Y"] - s["D"], s["D"]])
        co, *_ = np.linalg.lstsq(np.array(rows), np.array(rhs), rcond=None)
        fit = np.array(rows) @ co
        yv = np.array([S(d, n, "Y")[IX[2036]] for n in d])
        print(f"\n{c}: 2036 debt rule G = growth*(rho*0.95*Y + (1-rho)*D) - (1+r_gov)*D + tax - pensions - TR, fitted on {len(rows)} runs: "
              f"growth = {co[1]:.5f}, rho_G = {co[0] / co[1]:.4f}, max |residual|/GDP = {np.max(np.abs(fit - np.array(rhs)) / yv):.1e}")
        print("run|G gap 2035 %|G gap 2036 %|debt/GDP gap 2036 pp|I gap 2035 %|I gap 2036 %|C gap 2035|C gap 2036")
        print("|".join(["---"] * 8))
        print(f"continuation level: G/Y 2035 {100 * S(d, ref, 'G')[9] / S(d, ref, 'Y')[9]:.2f}%, 2036 {100 * S(d, ref, 'G')[10] / S(d, ref, 'Y')[10]:.2f}%; D/Y 2036 {100 * S(d, ref, 'D')[10] / S(d, ref, 'Y')[10]:.2f}%")
        for n in d:
            if n == ref:
                continue
            m = measures(d, n)
            print(f"{n}|{m['G'][9]:+.2f}|{m['G'][10]:+.2f}|{m['debt_pp'][10]:+.2f}|{m['I'][9]:+.2f}|{m['I'][10]:+.2f}|{m['C'][9]:+.2f}|{m['C'][10]:+.2f}")
        print(f"\n### {c}: paths, {SY}-2036")
        for n in d:
            if n == ref:
                continue
            m = measures(d, n)
            print(n)
            for v in ("Y", "GNI", "K", "L", "w", "C", "I", "r_bp", "debt_pp", "tax_pp"):
                print(f"  {v:8s}" + " ".join(f"{x:+8.3f}" for x in m[v][IX[SY]:]))


def sec_income(runs):
    print("\n### Why consumption falls while national income rises: income by source, pp of continuation GDP")
    print(f"closure|run|year|d labour income wL|d household capital income r_p B|d transfers TR + pensions|d tax revenue|d GNI|d G|d C|d national saving (GNI - C - G)|d wealth B %|C gap % by year {SY}..2036")
    print("|".join(["---"] * 11))
    for c in CLOSURES:
        d = runs[c]; ref = "continuation"
        for n in d:
            if n == ref:
                continue
            for y in (SY, HY):
                i = IX[y]; Y0 = S(d, ref, "Y")[i]
                f = lambda fn: 100 * (fn(n) - fn(ref)) / Y0
                wl = f(lambda k: S(d, k, "w")[i] * S(d, k, "L")[i])
                rb = f(lambda k: S(d, k, "r_p")[i] * S(d, k, "B")[i])
                tr = f(lambda k: S(d, k, "TR")[i] + S(d, k, "agg_pension_outlays")[i])
                tx = f(lambda k: S(d, k, "total_tax_revenue")[i])
                gni, g, cc = (f(lambda k, v=v: S(d, k, v)[i]) for v in ("GNI", "G", "C"))
                tail = " ".join(f"{x:+.2f}" for x in gap(d, n, "C")[IX[SY]:]) if y == HY else ""
                print(f"{c}|{n}|{y}|{wl:+.3f}|{rb:+.3f}|{tr:+.3f}|{tx:+.3f}|{gni:+.3f}|{g:+.3f}|{cc:+.3f}|{gni - g - cc:+.3f}|{gap(d, n, 'B')[i]:+.3f}|{tail}")


def sec_old(runs):
    print(f"\n## 6. Korinek {HY} (surprise) against the 2026-start {OLD_HEADLINE}")
    oh, oe = OLD_HEADLINE - 2026, 2035 - 2026      # the 2026-start runs: headline 2030, last year 2035
    h, k0, fa = IX[HY], IX[SY], IX[FAR]            # surprise: headline, shock year, as far past the headline as old 2035
    for c in CLOSURES:
        d = runs[c]
        try:
            ob = json.load(open(os.path.join(OLD, c, "baseline_p1.json")))
        except FileNotFoundError:
            continue
        olds = sorted(f for f in os.listdir(os.path.join(OLD, c)) if f.startswith("share_shift_ramp_r4_") and f.endswith(".json"))
        if not olds or not os.path.exists(os.path.join(OLD, c, "share_shift_tfp_ramp.json")):
            print(f"{c}: no 2026-start arm records to compare with (baseline only); skipped"); continue
        old_r4 = olds[-1][:-5]
        for a, on in (("tfp", "share_shift_tfp_ramp"), ("zfixed", "share_shift_ramp_zfixed"), ("r4", old_r4)):
            n = pick(runs, c, "korinek", a)
            if n is None:
                print(f"{c} korinek {a}: not solved"); continue
            o = json.load(open(os.path.join(OLD, c, on + ".json")))
            og = lambda v, i: 100 * (o["series"][v][i] / ob["series"][v][i] - 1)
            m = measures(d, n)
            print(f"\n{c} {a}: {n} vs old {on} (Z old {o['Z_terminal']:.6f}, new {d[n]['Z_terminal']:.6f})")
            print(f"variable|old {OLD_HEADLINE}|new {HY}|new - old|new/old|old 2026 (anticipation)|new {SY}|old 2035|new {FAR}")
            print("|".join(["---"] * 9))
            for v in ("Y", "GNI", "K", "L", "w", "C", "I"):
                print(f"{v}|{og(v, oh):+.3f}|{m[v][h]:+.3f}|{m[v][h] - og(v, oh):+.3f}|{m[v][h] / og(v, oh):.3f}|{og(v, 0):+.3f}|{m[v][k0]:+.3f}|{og(v, oe):+.3f}|{m[v][fa]:+.3f}")
            orr = lambda i: 1e4 * (o["series"]["r"][i] - ob["series"]["r"][i])
            od = lambda i: 100 * (o["series"]["D"][i] / o["series"]["Y"][i] - ob["series"]["D"][i] / ob["series"]["Y"][i])
            print(f"r_bp|{orr(oh):+.2f}|{m['r_bp'][h]:+.2f}|{m['r_bp'][h] - orr(oh):+.2f}|{m['r_bp'][h] / orr(oh):.3f}|{orr(0):+.2f}|{m['r_bp'][k0]:+.2f}|{orr(oe):+.2f}|{m['r_bp'][fa]:+.2f}")
            print(f"debt_pp|{od(oh):+.3f}|{m['debt_pp'][h]:+.3f}|{m['debt_pp'][h] - od(oh):+.3f}|{m['debt_pp'][h] / od(oh):.3f}|{od(0):+.3f}|{m['debt_pp'][k0]:+.3f}|{od(oe):+.3f}|{m['debt_pp'][fa]:+.3f}")
            # wealth and foreign capital behind the K gap, same-distance years
            for lab, src, sb, i in ((f"old {OLD_HEADLINE}", o, ob, oh), (f"new {HY}", d[n], d["continuation"], h)):
                dv = lambda v: src["series"][v][i] - sb["series"][v][i]
                print(f"  {lab}: dK split Kf/B/-Dd = {100 * dv('K_f') / dv('K'):.0f}/{100 * dv('B') / dv('K'):.0f}/{-100 * dv('D_d') / dv('K'):.0f}%; B gap {100 * dv('B') / sb['series']['B'][i]:+.3f}%")
            print(f"  old path I gap 2026-{OLD_HEADLINE}:", " ".join(f"{og('I', i):+.2f}" for i in range(oh + 1)), f"| new {SY}-{HY}:", " ".join(f"{x:+.2f}" for x in m["I"][k0:h + 1]))
            print(f"  old path K gap 2026-{OLD_HEADLINE}:", " ".join(f"{og('K', i):+.2f}" for i in range(oh + 1)), f"| new {SY}-{HY}:", " ".join(f"{x:+.2f}" for x in m["K"][k0:h + 1]))


def sec_tax(runs):
    print(f"\n## 8. Tax diagnostics, {HY}")
    bases = ["iit_revenue", "business_tax_revenue", "cons_tax_revenue", "bequest_tax_revenue", "wealth_tax_revenue"]
    print("closure|run|d tax/GDP pp|per pp of share fall|OBR -0.19..-0.23: sign|ratio to OBR midpoint 0.21|payroll (15% of wL)|income tax + employee NICs|business|consumption|bequest|wealth|sum of bases - total|receipts level, % of ref GDP|at fixed GDP: -0.15 x fall")
    print("|".join(["---"] * 15))
    for c in CLOSURES:
        d = runs[c]
        i = IX[HY]
        for n, rec in d.items():
            if n == "continuation":
                continue
            s = n.split("_share")[0]
            r = lambda k, v: 100 * (S(d, k, v) / S(d, k, "Y"))[i]
            tot = r(n, "total_tax_revenue") - r("continuation", "total_tax_revenue")
            by = {b: r(n, b) - r("continuation", b) for b in bases}
            pay = lambda k: 100 * rec["tau_payroll"] * (S(d, k, "w") * S(d, k, "L") / S(d, k, "Y"))[i]
            dpay = pay(n) - pay("continuation")
            lev = 100 * (S(d, n, "total_tax_revenue")[i] - S(d, "continuation", "total_tax_revenue")[i]) / S(d, "continuation", "Y")[i]
            per = tot / FALL[s]
            print(f"{c}|{n}|{tot:+.3f}|{per:+.3f}|{'same (falls)' if per < 0 else 'OPPOSITE (rises)'}|{-per / 0.21:.2f}|{dpay:+.3f}|{by['iit_revenue'] - dpay:+.3f}|"
                  f"{by['business_tax_revenue']:+.3f}|{by['cons_tax_revenue']:+.3f}|{by['bequest_tax_revenue']:+.3f}|{by['wealth_tax_revenue']:+.3f}|{sum(by.values()) - tot:.1e}|{lev:+.3f}|{-0.15 * FALL[s]:+.3f}")


def sec_rules(runs):
    print(f"\n## Linear rules across scenarios ({HY}) and the wage tie")
    for c in CLOSURES:
        d = runs[c]; i = IX[HY]
        print(f"\n{c}\nscenario|zfixed wage per pp of share fall|(tfp - zfixed) wage per 1% TFP|break-even TFP/share ratio for a zero wage|scenario's ratio|zfixed C per pp|(tfp - zfixed) C per 1% TFP|{SY} gaps tfp: I, L, C|{SY} gaps zfixed: I, L, C|{SY} gaps r4: I, L, C")
        print("|".join(["---"] * 10))
        for s in SCEN:
            n = {a: pick(runs, c, s, a) for a in ARMS}
            if not (n["tfp"] and n["zfixed"]):
                print(f"{s}|not solved"); continue
            f = lambda a, v, y=HY: measures(d, n[a])[v][IX[y]]
            a_, b_ = f("zfixed", "w") / FALL[s], (f("tfp", "w") - f("zfixed", "w")) / TFP[s]
            j = lambda a: (f"{f(a, 'I', SY):+.2f}, {f(a, 'L', SY):+.3f}, {f(a, 'C', SY):+.3f}" if n[a] else "not solved")
            print(f"{s}|{a_:.3f}|{b_:.3f}|{-a_ / b_:.3f}|{TFP[s] / FALL[s]:.3f}|{f('zfixed', 'C') / FALL[s]:.3f}|{(f('tfp', 'C') - f('zfixed', 'C')) / TFP[s]:.3f}|{j('tfp')}|{j('zfixed')}|{j('r4')}")


def sec_drift(runs):
    print(f"\n## R4 drift after the target year: change in the GDP gap {HY} -> 2036 split (log points x100)")
    print(f"closure|run|GDP gap {HY}|2036|change|technology at ref inputs|capital|labour|K gap {HY} -> 2036|B gap|D_d gap|K_f gap, % of ref K|L gap {HY} -> 2036")
    h, e = IX[HY], IX[2036]
    print("|".join(["---"] * 13))
    for c in CLOSURES:
        d = runs[c]
        for n in d:
            if "_r4_" not in n:
                continue
            a, b = decomp(d, n, HY), decomp(d, n, 2036)
            m = measures(d, n)
            kf = lambda y: 100 * (S(d, n, "K_f")[IX[y]] - S(d, "continuation", "K_f")[IX[y]]) / S(d, "continuation", "K")[IX[y]]
            dd = lambda y: 100 * (S(d, n, "D_d")[IX[y]] / S(d, "continuation", "D_d")[IX[y]] - 1)
            print(f"{c}|{n}|{m['Y'][h]:+.3f}|{m['Y'][e]:+.3f}|{b[3] - a[3]:+.3f}|{b[0] - a[0]:+.3f}|{b[1] - a[1]:+.3f}|{b[2] - a[2]:+.3f}|"
                  f"{m['K'][h]:+.2f} -> {m['K'][e]:+.2f}|{m['B'][h]:+.2f} -> {m['B'][e]:+.2f}|{dd(HY):+.2f} -> {dd(2036):+.2f}|{kf(HY):+.2f} -> {kf(2036):+.2f}|{m['L'][h]:+.2f} -> {m['L'][e]:+.2f}")


def sec_lit(runs):
    print("\n## 7. Against the literature: GDP per unit of TFP and the r-pinned bound (arithmetic, not a solve)")
    # year 4 of the ramp is the headline year (the shock is at full size), year 5 the year after
    print(f"closure|scenario|GDP gap {HY} (yr 4)|{HY + 1} (yr 5)|technology at ref inputs {HY}|GDP/TFP target|marginal: (tfp - zfixed)/TFP|capital term|labour term|K gap|"
          f"r-pinned bound, L fixed: K %|GDP %|r-pinned bound at the arm's L: GDP %|capital-supply elasticity {HY}|2036")
    print("|".join(["---"] * 15))
    for c in CLOSURES:
        d = runs[c]; i = IX[HY]
        for s in SCEN:
            n, nz = pick(runs, c, s, "tfp"), pick(runs, c, s, "zfixed")
            if not n:
                print(f"{c}|{s}|not solved"); continue
            t, k, l, tot, _ = decomp(d, n, HY)     # the bound below is rebuilt from the headline year's split
            g1 = d[n]["gamma_terminal"]
            # r fixed means gamma*Y/K fixed: dlnK = dln(gamma) + dlnY, and dlnY = tech + g1 dlnK + (1-g1) dlnL
            dg = 100 * np.log(g1 / G0)
            bound = lambda dl: ((t + g1 * dg + (1 - g1) * dl) / (1 - g1))
            yb0, yb1 = bound(0.0), bound(l / (1 - g1))
            el = lambda y: (np.log(S(d, n, "K")[IX[y]] / S(d, "continuation", "K")[IX[y]])
                            / (np.log(g1 * S(d, n, "Y")[IX[y]] / S(d, n, "K")[IX[y]]) - np.log(G0 * S(d, "continuation", "Y")[IX[y]] / S(d, "continuation", "K")[IX[y]])))
            m = measures(d, n)
            mz = measures(d, nz)["Y"][i] if nz else float("nan")
            print(f"{c}|{s}|{m['Y'][i]:+.3f}|{m['Y'][i + 1]:+.3f}|{t:+.3f}|{m['Y'][i] / TFP[s]:.2f}|{(m['Y'][i] - mz) / TFP[s]:.2f}|{k:+.3f}|{l:+.3f}|{m['K'][i]:+.2f}|"
                  f"{100 * (np.exp((dg + yb0) / 100) - 1):+.2f}|{100 * (np.exp(yb0 / 100) - 1):+.2f}|{100 * (np.exp(yb1 / 100) - 1):+.2f}|{el(HY):.3f}|{el(2036):.3f}")
    print("IMF SIP/2026/072: output +2.52% at year 4 (digitised), +3.26% at year 5, TFP +0.42% / +0.53%: GDP/TFP about 6.0 / 6.2")


def sec_mono(runs):
    """Final pass: orderings across closures, scenarios and arms, and the income inequalities year by year."""
    print("\n## 9. Orderings and inequalities (final pass)")
    i = IX[HY]
    breaks, known = [], []
    inc = lambda xs: all(b > a for a, b in zip(xs, xs[1:]))
    dec = lambda xs: all(b < a for a, b in zip(xs, xs[1:]))
    # income inequalities in every year, every audited run including fiscal variants
    print(f"\nclosure|run|min (GDP - GNI)/GDP % over 2026-36 where K_f > 0|min (GNI - NNI)/GDP %|paid abroad r_p (K_f + D_f) / GDP %, {HY}|K_f / K % {HY}")
    print("---|---|---|---|---|---")
    for c in ZK_ORDER:
        d = runs[c]
        for n in d:
            s = {v: S(d, n, v) for v in ("Y", "GNI", "NNI", "K_f", "D_f", "r_p", "K")}
            g1 = 100 * (s["Y"] - s["GNI"]) / s["Y"]
            m1 = g1[s["K_f"] > 0].min() if (s["K_f"] > 0).any() else float("nan")
            m2 = (100 * (s["GNI"] - s["NNI"]) / s["Y"]).min()
            if (m1 == m1 and m1 < 0) or m2 <= 0:
                breaks.append(f"{c}/{n}: income inequality fails")
            print(f"{c}|{n}|{m1:+.3f}|{m2:+.3f}|{(100 * s['r_p'] * (s['K_f'] + s['D_f']) / s['Y'])[i]:.2f}|{100 * s['K_f'][i] / s['K'][i]:.1f}")
    # across closures
    print(f"\nAcross closures ({HY} gaps; zk0, zk0.1, zk0.5). GDP - GNI is in pp of continuation GDP")
    print(f"scenario|arm|variant|GDP %|GNI %|GDP - GNI, pp|K %|wage %|return bp|C %|tax/GDP pp|{SY} I %|ordering tests")
    print("|".join(["---"] * 13))
    for var in VARIANTS:
        for s in SCEN:
            for a in ARMS:
                ns = [pick(runs, c, s, a, var) for c in ZK_ORDER]
                have = [(c, n) for c, n in zip(ZK_ORDER, ns) if n]
                if len(have) < 2:
                    continue
                ms = [measures(runs[c], n) for c, n in have]
                col = lambda v, y=HY: [m[v][IX[y]] for m in ms]
                wedge = [m["Y"][i] - m["GNI_lvl"][i] for m in ms]
                tests = {"GNI-GDP gap widens": inc(wedge), "K rises with zeta_K": inc(col("K")), "return rise shrinks": dec(col("r_bp"))}
                if a != "r4":
                    tests["GDP rises with zeta_K"] = inc(col("Y")); tests["GNI rises with zeta_K"] = inc(col("GNI"))
                    tests["wage rises with zeta_K"] = inc(col("w"))
                else:
                    # GDP is held, so more of it is paid abroad as zeta_K rises: GNI and consumption fall by more
                    tests["GNI falls more with zeta_K"] = dec(col("GNI")); tests["C falls more with zeta_K"] = dec(col("C"))
                bad = [k for k, ok in tests.items() if not ok]
                for k in bad:
                    breaks.append(f"across closures, {s} {a} {var or 'common'}: {k} fails")
                f = lambda xs, p=2: " / ".join(f"{x:+.{p}f}" for x in xs)
                print(f"{s}|{a}|{var or 'common'} ({', '.join(c for c, _ in have)})|{f(col('Y'), 3 if a == 'r4' else 2)}|{f(col('GNI'))}|{f(wedge)}|{f(col('K'))}|{f(col('w'))}|{f(col('r_bp'), 1)}|"
                      f"{f(col('C'))}|{f(col('tax_pp'), 3)}|{f(col('I', SY), 1)}|{'all hold' if not bad else 'BREAK: ' + '; '.join(bad)}")
    # across scenarios
    print(f"\nAcross scenarios ({HY} gaps; solved scenarios in the order low, central, high, Korinek)")
    print("closure|arm|scenarios|GDP %|GNI %|K %|return bp|tax/GDP pp|wage % (not expected to be ordered, A2)|ordering tests")
    print("|".join(["---"] * 10))
    for c in ZK_ORDER:
        for a in ARMS:
            have = [(s, pick(runs, c, s, a)) for s in SCEN]
            have = [(s, n) for s, n in have if n]
            if len(have) < 2:
                continue
            ms = [measures(runs[c], n) for _, n in have]
            col = lambda v: [m[v][i] for m in ms]
            tests = {"K": inc(col("K")), "return": inc(col("r_bp"))}
            if a == "tfp":
                tests["GDP"] = inc(col("Y")); tests["GNI"] = inc(col("GNI"))
            if a == "r4":
                tests["GNI falls more"] = dec(col("GNI")); tests["wage falls more"] = dec(col("w"))
            if a == "zfixed":
                tests["wage falls more"] = dec(col("w"))
            bad = [k for k, ok in tests.items() if not ok]
            for k in bad:
                breaks.append(f"across scenarios, {c} {a}: {k} fails")
            f = lambda xs, p=2: " / ".join(f"{x:+.{p}f}" for x in xs)
            print(f"{c}|{a}|{', '.join(s for s, _ in have)}|{f(col('Y'), 3 if a == 'r4' else 2)}|{f(col('GNI'))}|{f(col('K'))}|{f(col('r_bp'), 1)}|{f(col('tax_pp'), 3)}|{f(col('w'))}|"
                  f"{'all hold' if not bad else 'BREAK: ' + '; '.join(bad)}")
    # across arms
    print(f"\nAcross arms ({HY} gaps; automation + productivity / technology unchanged / stress test)")
    print("closure|scenario|variant|GDP %|GNI %|NNI %|wage %|C %|K %|Z terminal|ordering tests (GDP, GNI, NNI, wage, C, K, Z: tfp > zfixed > stress)")
    print("|".join(["---"] * 11))
    for c in ZK_ORDER:
        for var in VARIANTS:
            for s in SCEN:
                ns = [pick(runs, c, s, a, var) for a in ARMS]
                if not all(ns):
                    continue
                ms = [measures(runs[c], n) for n in ns]
                col = lambda v: [m[v][i] for m in ms]
                z = [runs[c][n]["Z_terminal"] for n in ns]
                f = lambda xs, p=2: " / ".join(f"{x:+.{p}f}" for x in xs)
                tests = {v: dec(col(v)) for v in ("Y", "GNI", "NNI", "w", "C", "K")}
                tests["Z"] = dec(z)
                bad = [k for k, ok in tests.items() if not ok]
                if bad and col("Y")[1] < 0 and all(x[0] > max(x[1:]) for x in [col(v) for v in ("Y", "GNI", "NNI", "w", "C", "K")] + [z]):
                    # known A1: technology unchanged has GDP below zero, so the stress test sits just above it; the main arm is still on top
                    known.append(f"across arms, {c} {s} {var or 'common'}: technology unchanged is below the stress test on {', '.join(bad)} (A1)")
                    bad = [f"known A1 ({', '.join(bad)})"]
                    print(f"{c}|{s}|{var or 'common'}|{f(col('Y'), 3)}|{f(col('GNI'))}|{f(col('NNI'))}|{f(col('w'))}|{f(col('C'))}|{f(col('K'))}|{' / '.join(f'{x:.6f}' for x in z)}|{bad[0]}")
                    continue
                for k in bad:
                    breaks.append(f"across arms, {c} {s} {var or 'common'}: {k} fails")
                print(f"{c}|{s}|{var or 'common'}|{f(col('Y'), 3)}|{f(col('GNI'))}|{f(col('NNI'))}|{f(col('w'))}|{f(col('C'))}|{f(col('K'))}|{' / '.join(f'{x:.6f}' for x in z)}|"
                      f"{'all hold' if not bad else 'BREAK: ' + '; '.join(bad)}")
    # the stress-test wage: with GDP held, dln w = dln(1 - gamma) - dln L exactly
    print(f"\nStress test: wage gap against the share term minus the labour gap, {HY}, log points x100")
    print("closure|run|share term dln(1-g)|- dln L|dln Y (held near 0)|sum|dln w|residual")
    print("|".join(["---"] * 8))
    for c in ZK_ORDER:
        for var in VARIANTS:
            for s in SCEN:
                n = pick(runs, c, s, "r4", var)
                if not n:
                    continue
                d = runs[c]
                lg = lambda v: 100 * np.log(S(d, n, v)[i] / S(d, "continuation", v)[i])
                sh = 100 * np.log((1 - gam(d[n])[i]) / (1 - G0))
                print(f"{c}|{n}|{sh:+.3f}|{-lg('L'):+.3f}|{lg('Y'):+.3f}|{sh - lg('L') + lg('Y'):+.3f}|{lg('w'):+.3f}|{sh - lg('L') + lg('Y') - lg('w'):.1e}")
    # the news year against the headline-year wage: a higher expected wage means less work and more consumption on the news
    print(f"\nNews year ({SY}) against the {HY} wage gap, every accepted common-rule arm, ordered by the wage gap within the closure")
    print(f"closure|run|wage gap {HY} %|wage gap {SY} %|labour {SY} %|consumption {SY} %")
    print("---|---|---|---|---|---")
    for c in ZK_ORDER:
        rows = []
        for s in SCEN:
            for a in ARMS:
                n = pick(runs, c, s, a)
                if n:
                    m = measures(runs[c], n)
                    rows.append((m["w"][i], m["w"][IX[SY]], m["L"][IX[SY]], m["C"][IX[SY]], n))
        rows.sort(reverse=True)
        for r in rows:
            print(f"{c}|{r[4]}|{r[0]:+.2f}|{r[1]:+.3f}|{r[2]:+.3f}|{r[3]:+.3f}")
        rk = lambda xs: np.argsort(np.argsort(xs))
        w = np.array([r[0] for r in rows])
        print(f"{c}: rank correlation of the {HY} wage gap with {SY} labour {np.corrcoef(rk(w), rk([r[2] for r in rows]))[0, 1]:+.3f}, with {SY} consumption {np.corrcoef(rk(w), rk([r[3] for r in rows]))[0, 1]:+.3f} ({len(rows)} arms)")
    # the A15 test for every main arm whose news-year signs flip: lifetime wages above ten times the restart error
    print(f"\nA15 test: main arms whose {SY} labour or consumption sign flips, every variant")
    print(f"closure|run|wage gap {SY} %|wage gap {HY} %|mean wage gap {SY}-36 %|tolerance (10 x restart error) %|passes")
    print("---|---|---|---|---|---|---")
    for c in ZK_ORDER:
        for var in VARIANTS:
            for s in SCEN:
                n = pick(runs, c, s, "tfp", var)
                if not n:
                    continue
                m = measures(runs[c], n)
                if not any(verdict(c, s, "tfp", v, m[v[0]][IX[SY]], m, var)[1] == "A15" for v in ("L28", "C28")):
                    continue                     # no flip, or a flip that another rule explains (A17)
                tol, mw = 10 * m["noise_pct"], float(np.mean(m["w"][IX[SY]:]))
                print(f"{c}|{n}|{m['w'][IX[SY]]:+.4f}|{m['w'][i]:+.4f}|{mw:+.4f}|{tol:.4f}|{m['w'][i] > tol and mw > tol}")
    # evidence behind the mechanism-keyed verdict rules (A13-A15), for every cell they catch
    print(f"\nEvidence for A13 (technology unchanged, GDP not small) and A14 (its debt/GDP falls in {HY})")
    print("closure|run|year|GDP gap %|per pp of share fall|GDP gap, log points|capital term|bound with the return pinned, log points|bound %|debt gap %|debt/GDP gap pp")
    print("|".join(["---"] * 11))
    for c in ZK_ORDER:
        for s in SCEN:
            n = pick(runs, c, s, "zfixed")
            if not n:
                continue
            m = measures(runs[c], n)
            for y in (HY, 2036):
                j = IX[y]
                if abs(m["Y"][j]) / FALL[s] < 0.5 and m["debt_pp"][j] > 0:
                    continue
                print(f"{c}|{n}|{y}|{m['Y'][j]:+.2f}|{m['Y'][j] / FALL[s]:.2f}|{m['Y_lp'][j]:+.2f}|{m['cap_lp'][j]:+.2f}|{m['bound_lp'][j]:+.2f}|"
                      f"{100 * (np.exp(m['bound_lp'][j] / 100) - 1):+.2f}|{m['D'][j]:+.2f}|{m['debt_pp'][j]:+.2f}")
    print(f"technology unchanged, GDP gap per pp of share fall, {HY}, all solved: " + "; ".join(
        f"{c} {s} {measures(runs[c], pick(runs, c, s, 'zfixed'))['Y'][i] / FALL[s]:+.2f}" for c in ZK_ORDER for s in SCEN if pick(runs, c, s, "zfixed")))
    # the A14 test for every technology-unchanged cell whose headline-year debt/GDP falls (common rule and fixed spending)
    print(f"\nA14 test: technology unchanged, debt/GDP lower in {HY}")
    print(f"closure|run|debt/GDP gap {HY} pp|debt gap {HY} %|GDP gap {HY} %|tax/GDP gap {HY} pp|debt/GDP gap 2036 pp|passes")
    print("|".join(["---"] * 8))
    for c in ZK_ORDER:
        for var in ("", "fs"):
            for s in SCEN:
                n = pick(runs, c, s, "zfixed", var)
                if not n:
                    continue
                m = measures(runs[c], n)
                if m["debt_pp"][i] > 0:
                    continue
                ok = m["D"][i] > 0 and m["tax_pp"][i] < 0 and m["debt_pp"][IX[2036]] > 0
                print(f"{c}|{n}|{m['debt_pp'][i]:+.2f}|{m['D'][i]:+.2f}|{m['Y'][i]:+.2f}|{m['tax_pp'][i]:+.3f}|{m['debt_pp'][IX[2036]]:+.2f}|{ok}")
    # the no-shock path by closure, and the baseline gate
    print(f"\nNo-shock path by closure (the restart, {HY}) and the 2026-start baseline gate")
    print("closure|return %|K/Y|C/Y %|tax/GDP %|GNI/GDP %|paid abroad, % of GDP|of which on foreign-owned capital|K_f/K %|D/Y %|gate approved|passes|pass 1 vs pass 0, max rel (Y, K, r, D)|baseline_ext vs pass 1, 2026-35|"
          "gate: tax/GDP 2026-30 %|OBR|gate: primary balance %|gate: growth 2027-30 %|gate: payments abroad %|TPI distance|gate RC/GDP max")
    print("|".join(["---"] * 21))
    for c in ZK_ORDER:
        r = {v: S(runs[c], "continuation", v)[i] for v in ("Y", "K", "C", "r", "r_p", "K_f", "D_f", "D", "GNI", "total_tax_revenue")}
        try:
            g = json.load(open(os.path.join(OLD, c, "GATE_baseline.json")))
            ps = sorted(f for f in os.listdir(os.path.join(OLD, c)) if f.startswith("baseline_p") and f.endswith(".json"))
            p0, p1 = (json.load(open(os.path.join(OLD, c, f)))["series"] for f in (ps[0], g["baseline"] + ".json"))
            ext = json.load(open(os.path.join(OUT, c, "baseline_ext.json")))["series"]
            k = len(p1["Y"])
            d01 = max(relmax(np.array(p1[v]), np.array(p0[v])) for v in ("Y", "K", "r", "D"))
            dex = max(relmax(np.array(ext[v])[:k], np.array(p1[v])) for v in ("Y", "K", "r", "D", "C", "L", "w", "B"))
            rp = g["report"]
            fl = lambda xs: ", ".join(f"{x:.2f}" for x in xs)
            gate = (f"{g['approved']}|{len(ps)}|{d01:.1e}|{dex:.1e}|{fl(rp['tax_gdp_pct'])}|{fl(rp['obr_tax_gdp_pct'])}|{fl(rp['primary_balance_pct'])}|"
                    f"{fl(rp['growth_pct_2027_30'])}|{fl(rp['payments_abroad_pct_gdp'])}|{rp['tpi_final_distance']:.1e}|{rp['rc_rel_Y_max_abs_interior_pct'] / 100:.1e}")
        except (FileNotFoundError, KeyError) as e:
            gate = f"no gate record ({type(e).__name__})" + "|" * 10
        print(f"{c}|{100 * r['r']:.2f}|{r['K'] / r['Y']:.2f}|{100 * r['C'] / r['Y']:.1f}|{100 * r['total_tax_revenue'] / r['Y']:.1f}|{100 * r['GNI'] / r['Y']:.2f}|"
              f"{100 * r['r_p'] * (r['K_f'] + r['D_f']) / r['Y']:.2f}|{100 * r['r_p'] * r['K_f'] / r['Y']:.2f}|{100 * r['K_f'] / r['K']:.1f}|{100 * r['D'] / r['Y']:.1f}|{gate}")
    # the tax bases behind A16: who receives the capital income that replaces labour income
    print(f"\nA16: income and receipts, {HY}, pp of no-shock GDP")
    print("closure|run|labour income|gross capital income (Y - wL)|household capital income r_p B|income paid abroad|income tax + payroll|business tax|consumption tax|total receipts|tax/GDP pp per pp of share fall|"
          "depreciation delta K|return on foreign-owned capital r K_f|return on domestic capital r K_d|depreciation share of gross %|foreign share of gross %")
    print("|".join(["---"] * 16))
    for c in ZK_ORDER:
        d = runs[c]
        for s in SCEN:
            for a in ARMS:
                n = pick(runs, c, s, a)
                if not n or s not in ("uk_central", "uk_high", "korinek"):
                    continue
                Y0 = S(d, "continuation", "Y")[i]
                f = lambda fn: 100 * (fn(n) - fn("continuation")) / Y0
                x = lambda k, v: S(d, k, v)[i]
                gross = f(lambda k: x(k, 'Y') - x(k, 'w') * x(k, 'L'))
                dep = f(lambda k: d[k]["delta"] * x(k, 'K'))
                rkf, rkd = (f(lambda k, v=v: x(k, 'r') * x(k, v)) for v in ("K_f", "K_d"))
                print(f"{c}|{n}|{f(lambda k: x(k, 'w') * x(k, 'L')):+.2f}|{f(lambda k: x(k, 'Y') - x(k, 'w') * x(k, 'L')):+.2f}|{f(lambda k: x(k, 'r_p') * x(k, 'B')):+.2f}|"
                      f"{f(lambda k: x(k, 'r_p') * (x(k, 'K_f') + x(k, 'D_f'))):+.2f}|{f(lambda k: x(k, 'iit_revenue')):+.2f}|{f(lambda k: x(k, 'business_tax_revenue')):+.2f}|"
                      f"{f(lambda k: x(k, 'cons_tax_revenue')):+.2f}|{f(lambda k: x(k, 'total_tax_revenue')):+.2f}|{measures(d, n)['tax_pp'][i] / FALL[s]:+.3f}|"
                      # gross capital income = delta K + r K_f + r K_d + business tax (identity to rounding)
                      f"{dep:+.2f}|{rkf:+.2f}|{rkd:+.2f}|{100 * dep / gross:.0f}|{100 * rkf / gross:.0f}")
    # A17: debt-neutral against the common rule, same closure, scenario and arm (accepted solves only)
    print("\nA17: debt-neutral minus common rule, accepted solves of the same closure, scenario and arm")
    print(f"closure|scenario|arm|debt-neutral run|common-rule run|Z debt-neutral|Z common|transfers {SY} % (dn, common)|sum of transfer % gaps {SY}-{HY % 100}, dn - common|{SY} labour %, dn - common|opposite signs")
    print("|".join(["---"] * 11))
    npair = nopp = 0
    for c in ZK_ORDER:
        d = runs[c]
        for s in SCEN:
            for a in ARMS:
                nd, nc = pick(runs, c, s, a, "dn"), pick(runs, c, s, a, "")
                if not nd or not nc:
                    continue
                dtr = float(np.sum((gap(d, nd, "TR") - gap(d, nc, "TR"))[IX[SY]:IX[HY] + 1]))
                dl = gap(d, nd, "L")[IX[SY]] - gap(d, nc, "L")[IX[SY]]
                z = lambda k: f"{d[k]['Z_terminal']:.6f}" if d[k].get("Z_terminal") else "1"
                npair += 1; nopp += int(dtr * dl < 0)
                print(f"{c}|{s}|{ARM_NAME[a]}|{nd}|{nc}|{z(nd)}|{z(nc)}|{gap(d, nd, 'TR')[IX[SY]]:+.1f}, {gap(d, nc, 'TR')[IX[SY]]:+.1f}|{dtr:+.1f}|{dl:+.3f}|{dtr * dl < 0}")
    print(f"A17: {nopp} of {npair} accepted pairs have opposite signs")
    print("\nknown, already documented:", known or "none")
    print("ordering and inequality breaks:", breaks or "none")
    return breaks


def sec_vs_sanity(runs):
    print("\n## Cross-check against the committed <label>.sanity.json (read only as a comparison; nothing is taken from it)")
    key = {"Y": "Y", "GNI": "GNI", "NNI": "NNI", "K": "K", "L": "L", "w": "w", "C": "C", "I": "I", "r_bp": "r_bp", "debt_gdp_pp": "debt_pp", "labour_share_pp": "ls_pp"}
    worst = 0.0; nfail = 0; nflag = 0; nrep = 0
    for c in CLOSURES:
        d = runs[c]
        for n in d:
            f = os.path.join(OUT, c, n + ".sanity.json")
            if not os.path.exists(f):
                print(f"{c}|{n}|no sanity report"); continue
            j = json.load(open(f)); nrep += 1
            nfail += len(j.get("fails", [])); nflag += len(j.get("flags", []))
            if n == "continuation":
                continue
            m = measures(d, n)
            for yr, blk in ((HY, f"gaps_{HY}"), (SY, f"gaps_{SY}")):
                for k, v in j.get(blk, {}).items():
                    worst = max(worst, abs(m[key[k]][IX[yr]] - v))
            tx = j["diagnostics"][f"tax_gdp_{HY}"]["change_pp"]
            worst = max(worst, abs(m["tax_pp"][IX[HY]] - tx))
    print(f"{nrep} reports; fails recorded {nfail}; flags recorded {nflag}; max |my gap - sanity.json gap| over {SY} and {HY} gaps and the {HY} tax/GDP change: {worst:.1e}")
    SANITY_WORST["gap"] = worst


def sec_dnfull(runs):
    """The `_dnfull` solve (transfers hold debt/GDP on the reference path to the horizon) and its reference.

    Outside the verdict design: nothing here enters `runs` or the verdict counts.  The checks and their pass
    rules were set (by an independent Fable 5.2 decision, 16 Nov 2026) after some of these values had been seen,
    so every threshold reuses a tolerance already in this script.  The cohort figures computed from this solve
    (export_cohorts.py) are not audited here.
    """
    c, ref_n, arm_n, dn_n = "zk0.1", "continuation_dnfull", "uk_central_share_shift_tfp_ramp_dnfull", "uk_central_share_shift_tfp_ramp_dn"
    print("\n## The `_dnfull` solve (outside the verdict design)")
    fp = {k: os.path.join(OUT, c, k + ".json") for k in (ref_n, arm_n)}
    if not all(os.path.exists(f) for f in fp.values()):
        print("not solved"); return []
    d = runs[c]
    rec = {k: json.load(open(f)) for k, f in fp.items()}
    base = json.load(open(os.path.join(OUT, c, "baseline_ext.json")))["series"]
    Y, K = S(d, "continuation", "Y"), S(d, "continuation", "K")
    coef = np.linalg.lstsq(np.c_[G0 * Y / K, np.ones(11)], S(d, "continuation", "r") + d["continuation"]["delta"], rcond=None)[0]
    dR = {"continuation": d["continuation"], ref_n: rec[ref_n]}      # the reference, against the continuation
    dA = {"continuation": rec[ref_n], arm_n: rec[arm_n]}             # the arm, with continuation_dnfull as "continuation"
    W1 = IDENT_WORST
    ident_keys = ("K", "Kd", "D", "GNI", "NNI", "Yfn", "w", "rc")
    rows, bad = [], []

    def row(no, what, val, tol, ok=None):
        if ok is None:
            ok = tol is None or val <= tol
        verdict = "report only" if tol is None else ("pass" if ok else "FAIL")
        if tol is not None and not ok:
            bad.append(no)
        rows.append(f"{no}|{what}|{val if isinstance(val, str) else f'{val:.1e}'}|{'' if tol is None else (tol if isinstance(tol, str) else f'{tol:.1e}')}|{verdict}")

    def dy_dev(dd, n, r):
        x = S(dd, n, "D") / S(dd, n, "Y") / (S(dd, r, "D") / S(dd, r, "Y")) - 1
        return float(np.max(np.abs(x[IX[SY + 1]:])))

    def gy_dev(dd, n):
        return float(np.max(np.abs(S(dd, n, "G") / S(dd, n, "Y") / dd[n]["alpha_G_used"] - 1)[IX[SY]:]))

    # reference
    eR = identity_errors(dR, ref_n, coef, growth_factors(dR, "continuation"), base)
    row(1, f"reference: {PRE} equal to baseline_ext (rel)", eR["zero"], W1["zero"])
    row(2, f"reference: {SY} state (B, D, D_d, D_f, K_d) equal to continuation (rel)", eR["st"], W1["st"])
    row(3, f"reference: D/Y against continuation, {SY + 1}-36, max abs(ratio - 1)", dy_dev(dR, ref_n, "continuation"), 1e-4)
    row(4, f"reference: G/Y against alpha_G_used, {SY}-36 (rel)", gy_dev(dR, ref_n), 1e-6)
    for k in ident_keys:
        row(5, f"reference: identity {k}", eR[k], W1[k])
    rst = {v: relmax(S(dR, ref_n, v)[IX[SY]:], np.array(base[v])[IX[SY]:]) for v in ("Y", "K", "L", "C", "w", "r", "D", "B", "GNI")}
    row(6, f"reference: max rel gap to baseline_ext, {SY}-36 (households anticipate the post-2036 transfer rule; "
           f"record's continuation_report max {rec[ref_n]['continuation_report']['max']:.2e}, ok={rec[ref_n]['continuation_report']['ok']})",
        max(rst.values()), None)
    # arm
    row(7, f"arm: closure, D/Y against continuation_dnfull, {SY + 1}-36", dy_dev(dA, arm_n, "continuation"), 1e-4)
    row(7, f"arm: D/Y against continuation, {SY + 1}-36 (information)", dy_dev({**dA, "c0": d["continuation"]}, arm_n, "c0"), None)
    row(8, f"arm: G/Y against alpha_G_used, {SY}-36 (rel)", gy_dev(dA, arm_n), 1e-6)
    eA = identity_errors(dA, arm_n, coef, growth_factors(dA, "continuation"), base)
    for k in ident_keys:
        row(9, f"arm: identity {k}", eA[k], W1[k])
    row(9, f"arm: {PRE} equal to baseline_ext (rel)", eA["zero"], W1["zero"])
    row(9, f"arm: {SY} state equal to continuation_dnfull (rel)", eA["st"], W1["st"])
    row(9, "arm: labour share against -target x ramp weight (pp)", eA["ls"], W1["ls"])
    mA = measures(dA, arm_n)          # gaps against continuation_dnfull
    mD = measures(d, dn_n) if dn_n in d else None
    i = IX[HY]
    sg = {"Y > 0": mA["Y"][i] > 0, "K > 0": mA["K"][i] > 0, "r gap > 0": mA["r_bp"][i] > 0, "labour-share gap < 0": mA["ls_pp"][i] < 0}
    row(10, f"arm: {HY} signs against continuation_dnfull (" + ", ".join(f"{k}: {'yes' if v else 'no'}" for k, v in sg.items()) + ")",
        "all" if all(sg.values()) else "not all", "all four", all(sg.values()))
    if mD is not None:
        same = {v: np.sign(mA[v][i]) == np.sign(mD[v][i]) for v in ("Y", "K", "w", "C", "r_bp")}
        row(10, f"arm: {HY} sign of Y, K, w, C, r equal to the `_dn` arm's against continuation ("
                + ", ".join(f"{k} {mA[k][i]:+.2f} vs {mD[k][i]:+.2f}" for k in same) + ")",
            "all" if all(same.values()) else "not all", "all five", all(same.values()))
        row(11, f"arm: {HY} dnfull less dn, Y / K / w / C %: " + " / ".join(f"{mA[v][i] - mD[v][i]:+.2f}" for v in ("Y", "K", "w", "C")), "-", None)
    key = {"Y": "Y", "GNI": "GNI", "NNI": "NNI", "K": "K", "L": "L", "w": "w", "C": "C", "I": "I", "r_bp": "r_bp", "debt_gdp_pp": "debt_pp", "labour_share_pp": "ls_pp"}
    j = json.load(open(os.path.join(OUT, c, arm_n + ".sanity.json")))
    jr = json.load(open(os.path.join(OUT, c, ref_n + ".sanity.json")))
    wd = 0.0
    for yr, blk in ((HY, f"gaps_{HY}"), (SY, f"gaps_{SY}")):
        for k, v in j.get(blk, {}).items():
            wd = max(wd, abs(mA[key[k]][IX[yr]] - v))
    wd = max(wd, abs(mA["tax_pp"][i] - j["diagnostics"][f"tax_gdp_{HY}"]["change_pp"]))
    tol = SANITY_WORST["gap"]
    row(12, f"arm: recomputed {SY} and {HY} gaps against the committed .sanity.json", wd, tol)
    nf = len(j.get("fails", [])) + len(jr.get("fails", []))
    row(12, f"sanity.json fails recorded (arm + reference); flags: arm {j.get('flags', [])}, reference {jr.get('flags', [])}",
        str(nf), "0", nf == 0)
    for k in (ref_n, arm_n):
        q = rec[k]["dn_check_full"]
        row(13, f"{k}: to-horizon closure {q['periods'][0]}-{q['periods'][1]}, max abs rel (quoted from the record, not recomputed; ok={q['ok']})",
            q["max_abs_rel"], None)
    print("check|what|value|pass if <=|result")
    print("---|---|---|---|---")
    for r_ in rows:
        print(r_)
    print("dnfull check failures:", bad or "none")
    return bad


def sec_tax_sign(runs):
    print(f"\nTax/GDP gap by year, pp ({SY}-2036), and the years in which it is positive (opposite to the OBR sign)")
    for c in CLOSURES:
        d = runs[c]
        for n in d:
            if n == "continuation":
                continue
            t = measures(d, n)["tax_pp"]
            pos = [y for y in YEARS[IX[SY]:] if t[IX[y]] > 0]
            print(f"{c}|{n}|" + " ".join(f"{x:+.3f}" for x in t[IX[SY]:]) + f"|positive in: {pos if pos else 'none'}")


def build_tables():
    """The a-priori expectations, the verdict rows and their labels for the configured shock year.

    The keys I28, L28, C28 (shock-year rows) and Y36, debt36 keep their 2028 names for every year.
    """
    global EXPECT, ROWS, LABEL
    EXPECT = {
        # variable: {arm: (text, test)}; test returns True if the a-priori expectation holds
        "Y": {"tfp": ("> 0", lambda x, c: x > 0), "zfixed": ("small, sign open (>= 0 if capital flows in)", lambda x, c: abs(x) < 2),
              "r4": ("0 within 0.01pp", lambda x, c: abs(x) <= 0.01)},
        "GNI": {"tfp": ("> 0, below GDP", lambda x, c: x > 0), "zfixed": ("below GDP", lambda x, c: True), "r4": ("<= 0", lambda x, c: x <= 0)},
        "NNI": {"tfp": ("rises less than GNI in levels", lambda x, c: True), "zfixed": ("rises less than GNI in levels", lambda x, c: True), "r4": ("< 0", lambda x, c: x < 0)},
        "K": {a: ("> 0", lambda x, c: x > 0) for a in ARMS},
        "L": {a: (f"<= 0 by {HY} (wage falls)", lambda x, c: x <= 0) for a in ARMS},
        "w": {"tfp": ("sign open: share effect against productivity", lambda x, c: True), "zfixed": ("< 0", lambda x, c: x < 0), "r4": ("< 0", lambda x, c: x < 0)},
        "C": {"tfp": ("sign open; > 0 expected if income rises", lambda x, c: x > 0), "zfixed": ("< 0", lambda x, c: x < 0), "r4": ("< 0", lambda x, c: x < 0)},
        "I": {a: ("> 0", lambda x, c: x > 0) for a in ARMS},
        "r_bp": {a: ("> 0", lambda x, c: x > 0) for a in ARMS},
        "ls_pp": {a: ("= -target", None) for a in ARMS},
        "debt_pp": {"tfp": ("sign open under the G/Y rule", lambda x, c: True), "zfixed": ("> 0", lambda x, c: x > 0), "r4": ("> 0", lambda x, c: x > 0)},
        "tax_pp": {a: ("< 0 (OBR sign)", lambda x, c: x < 0) for a in ARMS},
        "I28": {a: ("> 0, a one-year jump", lambda x, c: x > 0) for a in ARMS},
        "L28": {a: ("> 0 (more work on the news)", lambda x, c: x > 0) for a in ARMS},
        "C28": {a: ("< 0 (more saving on the news)", lambda x, c: x < 0) for a in ARMS},
        "Y36": {"tfp": ("> 0", lambda x, c: x > 0), "zfixed": ("small, sign open", lambda x, c: abs(x) < 2), "r4": (f"near 0, not held after {HY}", lambda x, c: abs(x) < 0.5)},
        "debt36": {"tfp": ("sign open under the G/Y rule", lambda x, c: True), "zfixed": ("> 0", lambda x, c: x > 0), "r4": ("> 0", lambda x, c: x > 0)},
    }
    ROWS = [("Y", "Y", HY), ("GNI", "GNI", HY), ("NNI", "NNI", HY), ("K", "K", HY), ("L", "L", HY), ("w", "w", HY), ("C", "C", HY),
            ("I", "I", HY), ("r_bp", "r_bp", HY), ("ls_pp", "ls_pp", HY), ("debt_pp", "debt_pp", HY), ("tax_pp", "tax_pp", HY),
            ("I28", "I", SY), ("L28", "L", SY), ("C28", "C", SY), ("Y36", "Y", 2036), ("debt36", "debt_pp", 2036)]
    LABEL = {"I28": f"{SY} investment %", "L28": f"{SY} labour %", "C28": f"{SY} consumption %", "Y36": "2036 GDP %", "debt36": "2036 debt/GDP, pp",
             "Y": "GDP %", "GNI": "GNI %", "NNI": "NNI %", "K": "capital %", "L": "labour %", "w": "wage %", "C": "consumption %",
             "I": "investment %", "r_bp": "return, bp", "ls_pp": "labour share, pp", "debt_pp": "debt/GDP, pp", "tax_pp": "tax/GDP, pp"}


# cells that match the sign rule but are still surprising, or miss it for a reason set out in the anomalies
NOTE = {}


def verdict(c, s, a, v, x, m, var=""):
    """(verdict, anomaly) for one cell; m holds the run's gaps by year."""
    i = IX[HY]
    if var == "dn" and v in ("debt_pp", "debt36"):
        # debt/GDP is held on the reference path (1e-4 relative of about 95% is 0.01pp)
        return ("consistent", "") if abs(x) <= 0.02 else ("WRONG", "")
    if var == "fs" and v in ("debt_pp", "debt36") and a == "tfp":
        # with G and TR at the reference levels, extra GDP and revenue should lower debt/GDP
        return ("consistent", "") if x < 0 else ("surprising-but-explained", "A4")
    if v == "ls_pp":
        return ("consistent", "") if abs(x + FALL[s]) < 1e-3 else ("WRONG", "")
    if v == "GNI":
        if x > m["Y"][i] + 1e-9:
            return "WRONG", ""
        if a == "zfixed" and x < 0:
            return "surprising-but-explained", "A1"
    if v == "NNI":
        # in levels NNI must rise by less than GNI whenever capital rises (NNI = GNI - delta K)
        if m["NNI_lvl"][i] > m["GNI_lvl"][i] and m["K"][i] > 0:
            return "WRONG", ""
        # in per cent it can rise by more, when capital grows by less than GNI
        if x > m["GNI"][i] or (a in ("tfp", "zfixed") and x < 0 < m["GNI"][i]):
            return "surprising-but-explained", "A5"
    if v == "Y" and a == "zfixed" and x < 0:
        return "surprising-but-explained", "A1"
    if v in ("Y", "Y36") and a == "zfixed" and abs(x) / FALL[s] >= 0.5:
        # not small. Explained only if the capital term accounts for the whole gap and GDP is under the pinned-return bound
        j = IX[2036] if v == "Y36" else i
        ok = m["cap_lp"][j] >= m["Y_lp"][j] > 0 and m["Y_lp"][j] < m["bound_lp"][j]
        return ("surprising-but-explained", "A13") if ok else ("WRONG", "")
    if v in ("Y", "Y36") and a == "zfixed":
        return "consistent", ""
    if v == "debt_pp" and a == "zfixed" and var in ("", "fs") and x <= 0:
        # the ratio falls. Debt below GDP in per cent is implied by the fall itself, so the test is the narrated
        # mechanism: debt is higher, tax/GDP is lower in the headline year (a wider primary deficit), and the ratio is higher by 2036
        ok = m["D"][i] > 0 and m["tax_pp"][i] < 0 and m["debt_pp"][IX[2036]] > 0
        return ("surprising-but-explained", "A14") if ok else ("WRONG", "")
    if v == "L28" and var == "dn" and x <= 0:
        # A17: the debt-neutral rule front-loads transfers over shock year to headline. Explained only if transfers over those years
        # are above the common rule's same arm (sum of % gaps), the income effect that lowers labour on the news
        return ("surprising-but-explained", "A17") if m.get("tr_dn_minus_common", -1) > 0 else ("WRONG", "")
    if v in ("L28", "C28") and a == "tfp" and ((x <= 0) if v == "L28" else (x >= 0)):
        # the news-year signs flip. Explained only if lifetime wages are higher: the wage gap is above ten times the
        # closure's restart error in the headline year and on average from the shock year to 2036 (the shock-year wage
        # alone can sit inside the noise)
        tol = 10 * m["noise_pct"]
        ok = m["w"][i] > tol and np.mean(m["w"][IX[SY]:]) > tol
        return ("surprising-but-explained", "A15") if ok else ("WRONG", "")
    if v == "w" and a == "tfp":
        return ("surprising-but-explained", "A2") if x < 0 < m["Y"][i] else ("consistent", "")
    if v == "C" and a == "tfp":
        return ("surprising-but-explained", "A3") if x < 0 < m["GNI"][i] else ("consistent", "")
    if v in ("debt_pp", "debt36") and a == "tfp":
        return "surprising-but-explained", "A4"
    if v == "tax_pp":
        if x >= 0:
            return "WRONG", "A6"
        if abs(x) / FALL[s] < 0.19 / 2:      # under half the OBR's lower figure per point of share fall
            return "surprising-but-explained", "A6"
        if abs(x) / FALL[s] > 1.5 * 0.23:    # over one and a half times the OBR's upper figure
            return "surprising-but-explained", "A16"
        return "consistent", ""
    if v == "I28":
        return ("surprising-but-explained", "A7") if x > 0 else ("WRONG", "A7")
    if v == "Y36" and a == "r4":
        return ("surprising-but-explained", "A8") if abs(x) > 0.01 else ("consistent", "")
    text, test = EXPECT[v][a]
    if test is None or test(x, c):
        return "consistent", ""
    return "WRONG", ""


def expect_text(v, a, var):
    if var == "dn" and v in ("debt_pp", "debt36"):
        return "0 (held on the reference path)"
    if var == "fs" and v in ("debt_pp", "debt36") and a == "tfp":
        return "< 0 (spending fixed, GDP higher)"
    return EXPECT[v][a][0]


def sec_verdict(runs):
    counts = {}
    for var in VARIANTS:
        # the two fiscal variants enter the table only once a solve of that variant exists
        if var and not any(variant(n) == var for c in CLOSURES for n in runs[c]):
            continue
        cv = {}
        if var:
            print(f"\n### Variant: {VAR_NAME[var]} (`_{var}`)")
        for c in CLOSURES:
            d = runs[c]
            for s in SCEN:
                ns = {a: pick(runs, c, s, a, var) for a in ARMS}
                print(f"\n**{s}, {c}" + (f", {VAR_NAME[var]}" if var else "") + f"** (labour share −{FALL[s]}pp, TFP +{TFP[s]}%). Runs: "
                      + "; ".join(f"{ARM_NAME[a]}: " + (f"`{ns[a]}`" if ns[a] else "not solved") for a in ARMS) + "\n")
                if not any(ns.values()):
                    cv["not solved"] = cv.get("not solved", 0) + len(ROWS) * 3
                    continue
                print(f"| gap ({HY} unless stated) | " + " | ".join(f"{ARM_NAME[a]}: expected | model | verdict" for a in ARMS) + " |")
                print("|---|" + "---|---|---|" * 3)
                ms = {a: measures(d, ns[a]) if ns[a] else None for a in ARMS}
                if var == "dn":
                    for a in ARMS:
                        nc = pick(runs, c, s, a, "")
                        if ns[a] and nc:
                            ms[a]["tr_dn_minus_common"] = float(np.sum((gap(d, ns[a], "TR") - gap(d, nc, "TR"))[IX[SY]:IX[HY] + 1]))
                for v, src, yr in ROWS:
                    row = [LABEL[v]]
                    for a in ARMS:
                        if ns[a] is None:
                            row += [expect_text(v, a, var), "–", "not solved"]
                            cv["not solved"] = cv.get("not solved", 0) + 1
                            continue
                        x = ms[a][src][IX[yr]]
                        vd, an = verdict(c, s, a, v, x, ms[a], var)
                        cv[vd] = cv.get(vd, 0) + 1
                        fmt = f"{x:+.1f}" if src == "r_bp" else (f"{x:+.3f}" if (a == "r4" and v in ("Y", "Y36")) or (var == "dn" and v in ("debt_pp", "debt36")) else f"{x:+.2f}")
                        row += [expect_text(v, a, var), fmt, vd + (f" ({an})" if an else "")]
                    print("| " + " | ".join(row) + " |")
        if var:
            print(f"\nverdict counts, {VAR_NAME[var]}:", cv, "| cells:", sum(cv.values()))
        else:
            counts = cv
            print("\nverdict counts:", cv, "| cells:", sum(cv.values()))
    return counts


def parse_year(argv):
    """The value of --year (`--year 2027` or `--year=2027`); 2028 when absent."""
    for j, a in enumerate(argv):
        if a == "--year":
            if j + 1 >= len(argv):
                raise SystemExit("--year needs a value, e.g. --year 2027")
            return int(argv[j + 1])
        if a.startswith("--year="):
            return int(a.split("=", 1)[1])
    return DEFAULT_YEAR


configure(DEFAULT_YEAR)


def main(argv):
    try:
        configure(parse_year(argv))
    except ValueError as e:
        raise SystemExit(str(e))
    missing = [c for c in CLOSURES if not os.path.exists(os.path.join(OUT, c, "continuation.json"))]
    if missing:
        # every section reads the no-shock continuation of each closure; the 2028 set has all three
        raise SystemExit(f"shock year {SY}: no continuation.json under {OUT} for {', '.join(missing)}; "
                         "the audit runs once every closure's continuation is recorded")
    runs = load()
    if "--mono" in argv:
        sec_mono(runs); return 0
    if "--verdict" in argv:
        sec_verdict(runs); return 0
    if "--dnfull" in argv:
        import contextlib, io
        with contextlib.redirect_stdout(io.StringIO()):     # fills IDENT_WORST and SANITY_WORST
            sec_identities(runs); sec_vs_sanity(runs)
        sec_dnfull(runs); return 0
    print("finished solves:", {c: sorted(runs[c]) for c in CLOSURES})
    print("finished, outside the three-arm design, not audited:", OUTSIDE or "none")
    sec_identities(runs)
    sec_variants(runs)
    sec_rules_open(runs)
    sec_z(runs)
    sec_decomp(runs)
    sec_wage(runs)
    sec_cross(runs)
    sec_dynamics(runs)
    sec_income(runs)
    sec_old(runs)
    sec_tax(runs)
    sec_tax_sign(runs)
    sec_rules(runs)
    sec_drift(runs)
    sec_lit(runs)
    sec_mono(runs)
    sec_vs_sanity(runs)
    sec_dnfull(runs)
    sec_verdict(runs)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
