"""Independent audit of the finished 2028-surprise solves (docs/results_sanity_2028.md).

Reads committed JSON only: analysis/surprise/output/<closure>/*.json, the 2026-start
records in analysis/rerun/output, and analysis/surprise/uk_targets.json.  It runs no
OG solve and does not import uk_growth_with_ai or analysis/surprise/sanity.py; every
identity is recomputed here from the exported series.

    python analysis/surprise/audit_2028.py            # all sections
    python analysis/surprise/audit_2028.py --verdict  # the verdict tables (markdown)
"""
import glob
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
OLD = os.path.join(HERE, "..", "rerun", "output")
YEARS = list(range(2026, 2037))
IX = {y: i for i, y in enumerate(YEARS)}
G0 = 0.35
WEIGHT = {2026: 0.0, 2027: 0.0, 2028: 0.25, 2029: 0.5, 2030: 0.75}
WEIGHT.update({y: 1.0 for y in range(2031, 2037)})
W = np.array([WEIGHT[y] for y in YEARS])
SCEN = ["uk_low", "uk_central", "uk_high", "korinek"]
ARMS = ["tfp", "zfixed", "r4"]
ARM_NAME = {"tfp": "automation + productivity", "zfixed": "technology unchanged",
            "r4": "stress test (2031 GDP held)"}
CLOSURES = ["zk0.1", "zk0"]
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
            runs[c][n] = json.load(open(f))
    return runs


def pick(runs, c, s, a):
    """Label of the finished solve for (closure, scenario, arm), or None."""
    d = runs[c]
    if a == "tfp":
        n = f"{s}_share_shift_tfp_ramp"
        return n if n in d else None
    if a == "zfixed":
        n = f"{s}_share_shift_ramp_zfixed"
        return n if n in d else None
    its = sorted(k for k in d if k.startswith(f"{s}_share_shift_ramp_r4_"))
    # the accepted iteration is the last one whose 2031 GDP gap is inside 0.01pp
    ok = [k for k in its if abs(gap(d, k, "Y")[IX[2031]]) <= 0.01]
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
    """2031-indexed arrays of gaps for the verdict table and the cross tables."""
    ref = "continuation"
    m = {v: gap(d, n, v) for v in ("Y", "GNI", "NNI", "K", "L", "w", "C", "I", "I_total", "B", "D", "G")}
    m["r_bp"] = 1e4 * (S(d, n, "r") - S(d, ref, "r"))
    ls = lambda k: S(d, k, "w") * S(d, k, "L") / S(d, k, "Y")
    m["ls_pp"] = 100 * (ls(n) - ls(ref))
    m["debt_pp"] = 100 * (S(d, n, "D") / S(d, n, "Y") - S(d, ref, "D") / S(d, ref, "Y"))
    m["tax_pp"] = 100 * (tax_ratio(d, n) - tax_ratio(d, ref))
    return m


# ---------------------------------------------------------------- sections
def sec_identities(runs):
    print("\n## 1. Identities, recomputed (max over 2026-36 unless stated)")
    hdr = ("closure|run|K=Kd+Kf|Kd=B-Dd|D=Dd+Df|GNI|NNI|delta|prod fn Y|wage FOC|r FOC|RC/GDP max 2028-36"
           "|RC/GDP 2027|I_total growth vs cont 2028-35|2028 capital with no 2027 investment, % of GDP|debt law 2026-35|zeros 2026-27 vs baseline|2028 state vs cont|LS vs -target*w (pp)")
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
            e["rc"] = float(np.max(np.abs(rc[IX[2028]:])))
            e["rc27"] = float(abs(rc[IX[2027]]))
            gf = growth_factors(d, n)
            e["gr"] = float(np.max(np.abs(gf[2:] / gref[2:] - 1)))       # 2028->29 .. 2035->36
            # 2027->28: K_f is reset on impact, so 2028 capital is not 2027 capital plus 2027 investment
            e["jump"] = 100 * gref[1] * (s["K"][2] - S(d, "continuation", "K")[2]) / S(d, "continuation", "Y")[1]
            lhs = gref * s["D"][1:]
            rhs = ((1 + s["r_gov"]) * s["D"] + s["G"] + s["I_g"] + s["TR"] + s["agg_pension_outlays"]
                   - s["total_tax_revenue"])[:-1]
            e["debt"] = float(np.max(np.abs(lhs - rhs) / s["Y"][:-1]))
            e["zero"] = max(relmax(s[v][:2], np.array(base[v])[:2]) for v in base if v != "I_g" and v != "payroll_tax_revenue")
            e["st"] = max(abs(s[v][2] / S(d, "continuation", v)[2] - 1) for v in ("B", "D", "D_d", "D_f", "K_d"))
            ls = 100 * (s["w"] * s["L"] / s["Y"] - 0.65)
            tgt = -100 * (g - G0)
            e["ls"] = float(np.max(np.abs(ls - tgt)))
            for k, v in e.items():
                worst[k] = max(worst.get(k, 0), v)
            print(f"{c}|{n}|" + "|".join(f"{e[k]:.1e}" for k in
                  ("K", "Kd", "D", "GNI", "NNI")) + f"|{dl:.4f}|" + "|".join(f"{e[k]:.1e}" for k in
                  ("Yfn", "w", "r", "rc", "rc27", "gr")) + f"|{e['jump']:+.3f}|" + "|".join(f"{e[k]:.1e}" for k in ("debt", "zero", "st", "ls")))
    print("worst:", {k: f"{v:.1e}" for k, v in worst.items()})
    # continuation against the committed baseline, 2028-36
    for c in CLOSURES:
        d = runs[c]
        base = json.load(open(os.path.join(OUT, c, "baseline_ext.json")))["series"]
        w = {v: relmax(S(d, "continuation", v)[2:], np.array(base[v])[2:]) for v in ("Y", "K", "L", "C", "w", "r", "D", "B", "GNI")}
        print(f"continuation vs committed baseline 2028-36, {c}: max rel", {k: f"{v:.1e}" for k, v in w.items()})


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
            nb = np.delete(nb, 1)          # 2027 -> 2028 is the splice year: its flow is the baseline's
            ds = np.max(np.abs(s["debt_service_f"] / (s["r_p"] * s["D_f"]) - 1))
            sh = np.max(np.abs(s["r"] - s["r_gov"] - (s["r"][0] - s["r_gov"][0])))
            print(f"{c}|{n}|{kf}|{np.max(np.abs(nb)):.1e}|{ds:.1e}|{sh:.1e}")


def sec_z(runs):
    print("\n## Z_terminal re-derived from the continuation's 2027 K and L")
    print("closure|run|Z recorded|Z re-derived|rel diff|fixed-input gain at 2027 inputs %|at 2031 continuation inputs %|at 2036 %")
    print("---|---|---|---|---|---|---|---")
    for c in CLOSURES:
        d = runs[c]
        K, L = S(d, "continuation", "K"), S(d, "continuation", "L")
        for n, rec in d.items():
            if n == "continuation":
                continue
            g1, z1 = rec["gamma_terminal"], rec["Z_terminal"]
            s = n.split("_share")[0]
            fx = lambda y: 100 * (z1 * (K[IX[y]] / L[IX[y]]) ** (g1 - G0) - 1)
            if "tfp" in n:
                zd = (1 + TFP[s] / 100) * (K[1] / L[1]) ** (G0 - g1)
            elif "zfixed" in n:
                zd = (K[1] / L[1]) ** (G0 - g1)
            else:
                zd = float("nan")
            print(f"{c}|{n}|{z1:.6f}|{zd:.6f}|{(zd / z1 - 1):.1e}|{fx(2027):+.4f}|{fx(2031):+.4f}|{fx(2036):+.4f}")


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
    print("\n## 2. GDP gap split, log points x100 (2031)")
    print("closure|run|technology at ref inputs|capital g1*dlnK|labour (1-g1)*dlnL|sum|dlnY|residual|raw dlnZ|raw d(g lnK)|raw d((1-g) lnL)|raw sum - dlnY")
    print("---|---|---|---|---|---|---|---|---|---|---|---")
    for c in CLOSURES:
        d = runs[c]
        for n in d:
            if n == "continuation":
                continue
            t, k, l, tot, raw = decomp(d, n, 2031)
            print(f"{c}|{n}|{t:+.3f}|{k:+.3f}|{l:+.3f}|{t + k + l:+.3f}|{tot:+.3f}|{t + k + l - tot:.1e}|"
                  f"{raw[0]:+.3f}|{raw[1]:+.3f}|{raw[2]:+.3f}|{sum(raw) - tot:.1e}")


def sec_wage(runs):
    print("\n## 3. Wage: dln w = dln(1-gamma) + dln(Y/L), 2031, log points x100")
    print("closure|run|dln(1-g)|dln(Y/L)|of which technology|capital deepening g1*dln(K/L)|sum|dln w (series)|residual|wage gap %")
    print("---|---|---|---|---|---|---|---|---|---")
    for c in CLOSURES:
        d = runs[c]
        i = IX[2031]
        for n, rec in d.items():
            if n == "continuation":
                continue
            g1 = gam(rec)[i]
            a = 100 * np.log((1 - g1) / (1 - G0))
            yl = 100 * np.log((S(d, n, "Y")[i] / S(d, n, "L")[i]) / (S(d, "continuation", "Y")[i] / S(d, "continuation", "L")[i]))
            t, k, l, tot, _ = decomp(d, n, 2031)
            kl = 100 * g1 * np.log((S(d, n, "K")[i] / S(d, n, "L")[i]) / (S(d, "continuation", "K")[i] / S(d, "continuation", "L")[i]))
            dw = 100 * np.log(S(d, n, "w")[i] / S(d, "continuation", "w")[i])
            print(f"{c}|{n}|{a:+.4f}|{yl:+.4f}|{t:+.4f}|{kl:+.4f}|{a + yl:+.4f}|{dw:+.4f}|{a + yl - dw:.1e}|{gap(d, n, 'w')[i]:+.4f}")


def sec_cross(runs):
    print("\n## 4. Cross-scenario, 2031 gaps")
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
                m = measures(d, n); i = IX[2031]
                dK = S(d, n, "K")[i] - S(d, "continuation", "K")[i]
                kf = 100 * (S(d, n, "K_f")[i] - S(d, "continuation", "K_f")[i]) / dK
                g1 = gam(d[n])[i]
                rent = np.log(g1 * S(d, n, "Y")[i] / S(d, n, "K")[i]) - np.log(G0 * S(d, "continuation", "Y")[i] / S(d, "continuation", "K")[i])
                el = np.log(S(d, n, "K")[i] / S(d, "continuation", "K")[i]) / rent
                print(f"{s}|{a}|{n}|" + "|".join(f"{m[v][i]:+.3f}" for v in vs) + f"|{kf:.1f}|{el:.3f}")
        print(f"\n{c}: per unit of shock (2031)")
        print("scenario|zfixed GDP per pp of share fall|(tfp - zfixed) GDP per 1% TFP|tfp GDP / TFP|r4 wage per pp|r4 dr bp per pp|zfixed K per pp|TFP/share ratio|Z_r4 - Z_zfixed, % of Z")
        print("---|---|---|---|---|---|---|---|---")
        for s in SCEN:
            n = {a: pick(runs, c, s, a) for a in ARMS}
            i = IX[2031]
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
            for y in (2028, 2031, 2035):
                i = IX[y]
                f = lambda v: 100 * (S(d, n, v)[i] - S(d, ref, v)[i]) / Y0[i]
                no = lambda k: ((S(d, k, "r_p") + d[k]["delta"]) * S(d, k, "K_f") - S(d, k, "new_borrowing_f") + S(d, k, "debt_service_f"))[i]
                dno = 100 * (no(n) - no(ref)) / Y0[i]
                print(f"{n}|{y}|{f('Y'):+.3f}|{f('C'):+.3f}|{f('I_d'):+.3f}|{f('G'):+.3f}|{dno:+.3f}|{f('Y') - f('C') - f('I_d') - f('G') - dno:+.1e}|"
                      f"{f('GNI'):+.3f}|{f('NNI'):+.3f}|{f('B'):+.3f}|{f('total_tax_revenue'):+.3f}|{gap(d, n, 'L')[i]:+.3f}|{gap(d, n, 'w')[i]:+.3f}|{1e4 * (S(d, n, 'r_p')[i] - S(d, ref, 'r_p')[i]):+.1f}")
        print(f"\n### {c}: who finances the extra capital, share of dK (%), and K gap path")
        print("run|" + "|".join(f"{y} dK% (Kf/B/-Dd)" for y in (2028, 2031, 2036)) + "|GDP gap 2031..2036")
        print("|".join(["---"] * 5))
        for n in d:
            if n == ref:
                continue
            cells = []
            for y in (2028, 2031, 2036):
                i = IX[y]
                dv = lambda v: S(d, n, v)[i] - S(d, ref, v)[i]
                dK = dv("K")
                cells.append(f"{gap(d, n, 'K')[i]:+.2f}% (" + ("-" if abs(dK) < 1e-12 else f"{100 * dv('K_f') / dK:.0f}/{100 * dv('B') / dK:.0f}/{-100 * dv('D_d') / dK:.0f}") + ")")
            print(f"{n}|" + "|".join(cells) + "|" + ", ".join(f"{x:+.3f}" for x in gap(d, n, "Y")[IX[2031]:]))
        print(f"\n### {c}: debt/GDP gap, pp, and what drives it (counterfactual recursions on the continuation path)")
        print("run|2031|2035|2036|2036 from r_gov alone|from primary balance/GDP alone|from growth alone|all three (= gap)|d r_gov bp 2031|d primary deficit/GDP pp 2031 (tax, G+TR, pensions)")
        print("|".join(["---"] * 10))
        gr = growth_factors(d, ref)
        def path(n_r, n_p, n_g):
            # 2028 debt is predetermined; its ratio to GDP moves with 2028 GDP (counted under growth)
            dy = [S(d, ref, "D")[IX[2028]] / S(d, n_g, "Y")[IX[2028]]]
            for i in range(IX[2028], IX[2036]):
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
            i = IX[2031]
            r = lambda k, v: (S(d, k, v) / S(d, k, "Y"))[i]
            dt = 100 * (r(n, "total_tax_revenue") - r(ref, "total_tax_revenue"))
            dg = 100 * (r(n, "G") + r(n, "TR") - r(ref, "G") - r(ref, "TR"))
            dp = 100 * (r(n, "agg_pension_outlays") - r(ref, "agg_pension_outlays"))
            print(f"{n}|{m['debt_pp'][IX[2031]]:+.3f}|{m['debt_pp'][IX[2035]]:+.3f}|{m['debt_pp'][IX[2036]]:+.3f}|{a:+.3f}|{p_:+.3f}|{g_:+.3f}|{full:+.3f}|"
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
        print(f"\n### {c}: paths, 2028-2036")
        for n in d:
            if n == ref:
                continue
            m = measures(d, n)
            print(n)
            for v in ("Y", "GNI", "K", "L", "w", "C", "I", "r_bp", "debt_pp", "tax_pp"):
                print(f"  {v:8s}" + " ".join(f"{x:+8.3f}" for x in m[v][2:]))


def sec_income(runs):
    print("\n### Why consumption falls while national income rises: income by source, pp of continuation GDP")
    print("closure|run|year|d labour income wL|d household capital income r_p B|d transfers TR + pensions|d tax revenue|d GNI|d G|d C|d national saving (GNI - C - G)|d wealth B %|C gap % by year 2028..2036")
    print("|".join(["---"] * 11))
    for c in CLOSURES:
        d = runs[c]; ref = "continuation"
        for n in d:
            if n == ref:
                continue
            for y in (2028, 2031):
                i = IX[y]; Y0 = S(d, ref, "Y")[i]
                f = lambda fn: 100 * (fn(n) - fn(ref)) / Y0
                wl = f(lambda k: S(d, k, "w")[i] * S(d, k, "L")[i])
                rb = f(lambda k: S(d, k, "r_p")[i] * S(d, k, "B")[i])
                tr = f(lambda k: S(d, k, "TR")[i] + S(d, k, "agg_pension_outlays")[i])
                tx = f(lambda k: S(d, k, "total_tax_revenue")[i])
                gni, g, cc = (f(lambda k, v=v: S(d, k, v)[i]) for v in ("GNI", "G", "C"))
                tail = " ".join(f"{x:+.2f}" for x in gap(d, n, "C")[2:]) if y == 2031 else ""
                print(f"{c}|{n}|{y}|{wl:+.3f}|{rb:+.3f}|{tr:+.3f}|{tx:+.3f}|{gni:+.3f}|{g:+.3f}|{cc:+.3f}|{gni - g - cc:+.3f}|{gap(d, n, 'B')[i]:+.3f}|{tail}")


def sec_old(runs):
    print("\n## 6. Korinek 2031 (surprise) against the 2026-start 2030")
    for c in CLOSURES:
        d = runs[c]
        try:
            ob = json.load(open(os.path.join(OLD, c, "baseline_p1.json")))
        except FileNotFoundError:
            continue
        old_r4 = sorted(f for f in os.listdir(os.path.join(OLD, c)) if f.startswith("share_shift_ramp_r4_") and f.endswith(".json"))[-1][:-5]
        for a, on in (("tfp", "share_shift_tfp_ramp"), ("zfixed", "share_shift_ramp_zfixed"), ("r4", old_r4)):
            n = pick(runs, c, "korinek", a)
            if n is None:
                print(f"{c} korinek {a}: not solved"); continue
            o = json.load(open(os.path.join(OLD, c, on + ".json")))
            og = lambda v, i: 100 * (o["series"][v][i] / ob["series"][v][i] - 1)
            m = measures(d, n)
            print(f"\n{c} {a}: {n} vs old {on} (Z old {o['Z_terminal']:.6f}, new {d[n]['Z_terminal']:.6f})")
            print("variable|old 2030|new 2031|new - old|new/old|old 2026 (anticipation)|new 2028|old 2035|new 2036")
            print("|".join(["---"] * 9))
            for v in ("Y", "GNI", "K", "L", "w", "C", "I"):
                print(f"{v}|{og(v, 4):+.3f}|{m[v][5]:+.3f}|{m[v][5] - og(v, 4):+.3f}|{m[v][5] / og(v, 4):.3f}|{og(v, 0):+.3f}|{m[v][2]:+.3f}|{og(v, 9):+.3f}|{m[v][10]:+.3f}")
            orr = lambda i: 1e4 * (o["series"]["r"][i] - ob["series"]["r"][i])
            od = lambda i: 100 * (o["series"]["D"][i] / o["series"]["Y"][i] - ob["series"]["D"][i] / ob["series"]["Y"][i])
            print(f"r_bp|{orr(4):+.2f}|{m['r_bp'][5]:+.2f}|{m['r_bp'][5] - orr(4):+.2f}|{m['r_bp'][5] / orr(4):.3f}|{orr(0):+.2f}|{m['r_bp'][2]:+.2f}|{orr(9):+.2f}|{m['r_bp'][10]:+.2f}")
            print(f"debt_pp|{od(4):+.3f}|{m['debt_pp'][5]:+.3f}|{m['debt_pp'][5] - od(4):+.3f}|{m['debt_pp'][5] / od(4):.3f}|{od(0):+.3f}|{m['debt_pp'][2]:+.3f}|{od(9):+.3f}|{m['debt_pp'][10]:+.3f}")
            # wealth and foreign capital behind the K gap, same-distance years
            for lab, src, sb, i in (("old 2030", o, ob, 4), ("new 2031", d[n], d["continuation"], 5)):
                dv = lambda v: src["series"][v][i] - sb["series"][v][i]
                print(f"  {lab}: dK split Kf/B/-Dd = {100 * dv('K_f') / dv('K'):.0f}/{100 * dv('B') / dv('K'):.0f}/{-100 * dv('D_d') / dv('K'):.0f}%; B gap {100 * dv('B') / sb['series']['B'][i]:+.3f}%")
            print("  old path I gap 2026-2030:", " ".join(f"{og('I', i):+.2f}" for i in range(5)), "| new 2028-2031:", " ".join(f"{x:+.2f}" for x in m["I"][2:6]))
            print("  old path K gap 2026-2030:", " ".join(f"{og('K', i):+.2f}" for i in range(5)), "| new 2028-2031:", " ".join(f"{x:+.2f}" for x in m["K"][2:6]))


def sec_tax(runs):
    print("\n## 8. Tax diagnostics, 2031")
    bases = ["iit_revenue", "business_tax_revenue", "cons_tax_revenue", "bequest_tax_revenue", "wealth_tax_revenue"]
    print("closure|run|d tax/GDP pp|per pp of share fall|OBR -0.19..-0.23: sign|ratio to OBR midpoint 0.21|payroll (15% of wL)|income tax + employee NICs|business|consumption|bequest|wealth|sum of bases - total|receipts level, % of ref GDP|at fixed GDP: -0.15 x fall")
    print("|".join(["---"] * 15))
    for c in CLOSURES:
        d = runs[c]
        i = IX[2031]
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
    print("\n## Linear rules across scenarios (2031) and the wage tie")
    for c in CLOSURES:
        d = runs[c]; i = IX[2031]
        print(f"\n{c}\nscenario|zfixed wage per pp of share fall|(tfp - zfixed) wage per 1% TFP|break-even TFP/share ratio for a zero wage|scenario's ratio|zfixed C per pp|(tfp - zfixed) C per 1% TFP|2028 gaps tfp: I, L, C|2028 gaps zfixed: I, L, C|2028 gaps r4: I, L, C")
        print("|".join(["---"] * 10))
        for s in SCEN:
            n = {a: pick(runs, c, s, a) for a in ARMS}
            if not (n["tfp"] and n["zfixed"]):
                print(f"{s}|not solved"); continue
            f = lambda a, v, y=2031: measures(d, n[a])[v][IX[y]]
            a_, b_ = f("zfixed", "w") / FALL[s], (f("tfp", "w") - f("zfixed", "w")) / TFP[s]
            j = lambda a: (f"{f(a, 'I', 2028):+.2f}, {f(a, 'L', 2028):+.3f}, {f(a, 'C', 2028):+.3f}" if n[a] else "not solved")
            print(f"{s}|{a_:.3f}|{b_:.3f}|{-a_ / b_:.3f}|{TFP[s] / FALL[s]:.3f}|{f('zfixed', 'C') / FALL[s]:.3f}|{(f('tfp', 'C') - f('zfixed', 'C')) / TFP[s]:.3f}|{j('tfp')}|{j('zfixed')}|{j('r4')}")


def sec_drift(runs):
    print("\n## R4 drift after the target year: change in the GDP gap 2031 -> 2036 split (log points x100)")
    print("closure|run|GDP gap 2031|2036|change|technology at ref inputs|capital|labour|K gap 2031 -> 2036|B gap|D_d gap|K_f gap, % of ref K|L gap 2031 -> 2036")
    print("|".join(["---"] * 13))
    for c in CLOSURES:
        d = runs[c]
        for n in d:
            if "_r4_" not in n:
                continue
            a, b = decomp(d, n, 2031), decomp(d, n, 2036)
            m = measures(d, n)
            kf = lambda y: 100 * (S(d, n, "K_f")[IX[y]] - S(d, "continuation", "K_f")[IX[y]]) / S(d, "continuation", "K")[IX[y]]
            dd = lambda y: 100 * (S(d, n, "D_d")[IX[y]] / S(d, "continuation", "D_d")[IX[y]] - 1)
            print(f"{c}|{n}|{m['Y'][5]:+.3f}|{m['Y'][10]:+.3f}|{b[3] - a[3]:+.3f}|{b[0] - a[0]:+.3f}|{b[1] - a[1]:+.3f}|{b[2] - a[2]:+.3f}|"
                  f"{m['K'][5]:+.2f} -> {m['K'][10]:+.2f}|{m['B'][5]:+.2f} -> {m['B'][10]:+.2f}|{dd(2031):+.2f} -> {dd(2036):+.2f}|{kf(2031):+.2f} -> {kf(2036):+.2f}|{m['L'][5]:+.2f} -> {m['L'][10]:+.2f}")


def sec_lit(runs):
    print("\n## 7. Against the literature: GDP per unit of TFP and the r-pinned bound (arithmetic, not a solve)")
    print("closure|scenario|GDP gap 2031 (yr 4)|2032 (yr 5)|technology at ref inputs 2031|GDP/TFP target|marginal: (tfp - zfixed)/TFP|capital term|labour term|K gap|"
          "r-pinned bound, L fixed: K %|GDP %|r-pinned bound at the arm's L: GDP %|capital-supply elasticity 2031|2036")
    print("|".join(["---"] * 15))
    for c in CLOSURES:
        d = runs[c]; i = IX[2031]
        for s in SCEN:
            n, nz = pick(runs, c, s, "tfp"), pick(runs, c, s, "zfixed")
            if not n:
                print(f"{c}|{s}|not solved"); continue
            t, k, l, tot, _ = decomp(d, n, 2031)
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
                  f"{100 * (np.exp((dg + yb0) / 100) - 1):+.2f}|{100 * (np.exp(yb0 / 100) - 1):+.2f}|{100 * (np.exp(yb1 / 100) - 1):+.2f}|{el(2031):.3f}|{el(2036):.3f}")
    print("IMF SIP/2026/072: output +2.52% at year 4 (digitised), +3.26% at year 5, TFP +0.42% / +0.53%: GDP/TFP about 6.0 / 6.2")


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
            for yr, blk in ((2031, "gaps_2031"), (2028, "gaps_2028")):
                for k, v in j.get(blk, {}).items():
                    worst = max(worst, abs(m[key[k]][IX[yr]] - v))
            tx = j["diagnostics"]["tax_gdp_2031"]["change_pp"]
            worst = max(worst, abs(m["tax_pp"][IX[2031]] - tx))
    print(f"{nrep} reports; fails recorded {nfail}; flags recorded {nflag}; max |my gap - sanity.json gap| over 2028 and 2031 gaps and the 2031 tax/GDP change: {worst:.1e}")


def sec_tax_sign(runs):
    print("\nTax/GDP gap by year, pp (2028-2036), and the years in which it is positive (opposite to the OBR sign)")
    for c in CLOSURES:
        d = runs[c]
        for n in d:
            if n == "continuation":
                continue
            t = measures(d, n)["tax_pp"]
            pos = [y for y in YEARS[2:] if t[IX[y]] > 0]
            print(f"{c}|{n}|" + " ".join(f"{x:+.3f}" for x in t[2:]) + f"|positive in: {pos if pos else 'none'}")


EXPECT = {
    # variable: {arm: (text, test)}; test returns True if the a-priori expectation holds
    "Y": {"tfp": ("> 0", lambda x, c: x > 0), "zfixed": ("small, sign open (>= 0 if capital flows in)", lambda x, c: abs(x) < 2),
          "r4": ("0 within 0.01pp", lambda x, c: abs(x) <= 0.01)},
    "GNI": {"tfp": ("> 0, below GDP", lambda x, c: x > 0), "zfixed": ("below GDP", lambda x, c: True), "r4": ("<= 0", lambda x, c: x <= 0)},
    "NNI": {"tfp": ("below GNI", lambda x, c: True), "zfixed": ("below GNI", lambda x, c: True), "r4": ("< 0", lambda x, c: x < 0)},
    "K": {a: ("> 0", lambda x, c: x > 0) for a in ARMS},
    "L": {a: ("<= 0 by 2031 (wage falls)", lambda x, c: x <= 0) for a in ARMS},
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
    "Y36": {"tfp": ("> 0", lambda x, c: x > 0), "zfixed": ("small, sign open", lambda x, c: abs(x) < 2), "r4": ("near 0, not held after 2031", lambda x, c: abs(x) < 0.5)},
    "debt36": {"tfp": ("sign open under the G/Y rule", lambda x, c: True), "zfixed": ("> 0", lambda x, c: x > 0), "r4": ("> 0", lambda x, c: x > 0)},
}
ROWS = [("Y", "Y", 2031), ("GNI", "GNI", 2031), ("NNI", "NNI", 2031), ("K", "K", 2031), ("L", "L", 2031), ("w", "w", 2031), ("C", "C", 2031),
        ("I", "I", 2031), ("r_bp", "r_bp", 2031), ("ls_pp", "ls_pp", 2031), ("debt_pp", "debt_pp", 2031), ("tax_pp", "tax_pp", 2031),
        ("I28", "I", 2028), ("L28", "L", 2028), ("C28", "C", 2028), ("Y36", "Y", 2036), ("debt36", "debt_pp", 2036)]
LABEL = {"I28": "2028 investment %", "L28": "2028 labour %", "C28": "2028 consumption %", "Y36": "2036 GDP %", "debt36": "2036 debt/GDP, pp",
         "Y": "GDP %", "GNI": "GNI %", "NNI": "NNI %", "K": "capital %", "L": "labour %", "w": "wage %", "C": "consumption %",
         "I": "investment %", "r_bp": "return, bp", "ls_pp": "labour share, pp", "debt_pp": "debt/GDP, pp", "tax_pp": "tax/GDP, pp"}
# cells that match the sign rule but are still surprising, or miss it for a reason set out in the anomalies
NOTE = {}


def verdict(c, s, a, v, x, m):
    """(verdict, anomaly) for one cell; m holds the run's gaps by year."""
    i = IX[2031]
    if v == "ls_pp":
        return ("consistent", "") if abs(x + FALL[s]) < 1e-3 else ("WRONG", "")
    if v == "GNI":
        if x > m["Y"][i] + 1e-9:
            return "WRONG", ""
        if a == "zfixed" and x < 0:
            return "surprising-but-explained", "A1"
    if v == "NNI":
        if x > m["GNI"][i]:
            return "WRONG", ""
        if a in ("tfp", "zfixed") and x < 0 < m["GNI"][i]:
            return "surprising-but-explained", "A5"
    if v == "Y" and a == "zfixed" and x < 0:
        return "surprising-but-explained", "A1"
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
        return "consistent", ""
    if v == "I28":
        return ("surprising-but-explained", "A7") if x > 0 else ("WRONG", "A7")
    if v == "Y36" and a == "r4":
        return ("surprising-but-explained", "A8") if abs(x) > 0.01 else ("consistent", "")
    text, test = EXPECT[v][a]
    if test is None or test(x, c):
        return "consistent", ""
    return "WRONG", ""


def sec_verdict(runs):
    counts = {}
    for c in CLOSURES:
        d = runs[c]
        for s in SCEN:
            ns = {a: pick(runs, c, s, a) for a in ARMS}
            print(f"\n**{s}, {c}** (labour share −{FALL[s]}pp, TFP +{TFP[s]}%). Runs: "
                  + "; ".join(f"{ARM_NAME[a]}: " + (f"`{ns[a]}`" if ns[a] else "not solved") for a in ARMS) + "\n")
            if not any(ns.values()):
                counts["not solved"] = counts.get("not solved", 0) + len(ROWS) * 3
                continue
            print("| gap (2031 unless stated) | " + " | ".join(f"{ARM_NAME[a]}: expected | model | verdict" for a in ARMS) + " |")
            print("|---|" + "---|---|---|" * 3)
            ms = {a: measures(d, ns[a]) if ns[a] else None for a in ARMS}
            for v, src, yr in ROWS:
                row = [LABEL[v]]
                for a in ARMS:
                    if ns[a] is None:
                        row += [EXPECT[v][a][0], "–", "not solved"]
                        counts["not solved"] = counts.get("not solved", 0) + 1
                        continue
                    x = ms[a][src][IX[yr]]
                    vd, an = verdict(c, s, a, v, x, ms[a])
                    counts[vd] = counts.get(vd, 0) + 1
                    fmt = f"{x:+.1f}" if src == "r_bp" else (f"{x:+.3f}" if a == "r4" and v in ("Y", "Y36") else f"{x:+.2f}")
                    row += [EXPECT[v][a][0], fmt, vd + (f" ({an})" if an else "")]
                print("| " + " | ".join(row) + " |")
    print("\nverdict counts:", counts, "| cells:", sum(counts.values()))
    return counts


if __name__ == "__main__":
    runs = load()
    if "--verdict" in sys.argv:
        sec_verdict(runs); sys.exit(0)
    print("finished solves:", {c: sorted(runs[c]) for c in CLOSURES})
    sec_identities(runs)
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
    sec_vs_sanity(runs)
    sec_verdict(runs)
