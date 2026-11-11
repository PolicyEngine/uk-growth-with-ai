"""Recompute the accounting identities behind every reported series.

    python analysis/results_sanity_audit.py            # both committed files
    python analysis/results_sanity_audit.py PATH.json  # one results file
    python analysis/results_sanity_audit.py --export zk0.1_baseline.json
        # also cross-check against the exported re-solve on analysis/closure-sensitivity

Reads only the committed results JSON; ogcore/oguk are not needed. Every number
quoted in docs/results_sanity_audit.md is printed by this script.

Structural parameters are the OG-UK defaults at d0e6ae5 (the run never
overrides them) and are VERIFIED below rather than assumed: the r-MPK identity
closes to rounding error with them, and the foreign-capital rule reproduces
the 2026 capital gap.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parents[1] / "uk_growth_with_ai" / "data"
YEARS = [2026, 2027, 2028, 2029, 2030]
SERIES = ["Y", "C", "I", "G", "K", "L", "w", "r", "total_tax_revenue", "D"]

# OG-UK defaults (oguk_default_parameters.json @ d0e6ae5); none is set by solve.py
DELTA = 0.065                       # delta_annual
TAU_B = 0.27 * 0.55 * 1.1785        # cit_rate * c_corp_share_of_assets * adjustment
DELTA_TAU = 0.05                    # delta_tau_annual
R_WORLD = 0.02                      # world_int_rate_annual
ZETA_K = 0.1
ZETA_D = 0.4
FOREIGN_DEBT_SHARE = 0.0904         # initial_foreign_debt_ratio
R_GOV_SHIFT = 0.02                  # r_gov = r - 0.02
FRISCH, SIGMA = 0.35, 1.5
G_BASE, RAMP = 0.35, 4


def arr(arm, v):
    return np.array(arm[v][:5], dtype=float)


def pct(a, b):
    return (a / b - 1) * 100


def fmt(x, d=2, sign=True):
    return " ".join(f"{v:{'+' if sign else ''}9.{d}f}" for v in np.atleast_1d(x))


def tech(arm):
    """gamma_t and Z_t on the reported window."""
    up = np.minimum(np.arange(5) / RAMP, 1.0)
    if arm["gamma_shape"] == "ramp":
        g = G_BASE + up * (arm["gamma_terminal"] - G_BASE)
    else:
        g = np.full(5, arm["gamma_terminal"])
    z = np.ones(5) if arm["Z_terminal"] is None else 1 + up * (arm["Z_terminal"] - 1)
    return g, z


def kl_open(g, z):
    """K/L the firm would demand at the world interest rate (epsilon = 1)."""
    cost = (R_WORLD + DELTA - TAU_B * DELTA_TAU) / (1 - TAU_B)
    return (g * z / cost) ** (1 / (1 - g))


def split_capital(arm):
    """Invert K = K_d + zeta_K (K_open - K_d) for K_d and K_f."""
    g, z = tech(arm)
    k_open = kl_open(g, z) * arr(arm, "L")
    k_d = (arr(arm, "K") - ZETA_K * k_open) / (1 - ZETA_K)
    return k_open, k_d, arr(arm, "K") - k_d


def audit(path):
    res = json.loads(Path(path).read_text())
    base = res["baseline"]
    arms = [k for k, v in res.items()
            if isinstance(v, dict) and "Y" in v and k != "baseline"]
    g_y = base["g_y_annual_used"]
    g_n = np.array(base["g_n_used"])
    grow = np.exp(g_y) * (1 + g_n)          # detrending factor t -> t+1
    print("=" * 100, f"\n{path}\n", "=" * 100, sep="")
    print(f"arms: {arms}; fiscal: {res.get('assumptions', {}).get('fiscal')}")
    print(f"tau_b = {TAU_B:.5f}; g_y = {g_y}; g_n = {np.round(g_n, 5)}")

    B = {v: arr(base, v) for v in SERIES}
    print("\n[0] BASELINE levels and ratios")
    print("    years         ", fmt(YEARS, 0, False))
    for label, x in [("C/Y %", B["C"] / B["Y"] * 100), ("I/Y %", B["I"] / B["Y"] * 100),
                     ("G/Y %", B["G"] / B["Y"] * 100), ("K/Y", B["K"] / B["Y"]),
                     ("tax/Y %", B["total_tax_revenue"] / B["Y"] * 100),
                     ("D/Y %", B["D"] / B["Y"] * 100), ("r %", B["r"] * 100),
                     ("(Y-C-I-G)/Y %", (B["Y"] - B["C"] - B["I"] - B["G"]) / B["Y"] * 100)]:
        print(f"    {label:<14}", fmt(x, 2, False))
    lv = B["Y"] * np.concatenate([[1], np.cumprod(grow[:4])])
    print("    real GDP growth %, 2027-30:", fmt(pct(lv[1:], lv[:-1])),
          f"| mean {pct(lv[1:], lv[:-1]).mean():.2f}")

    print("\n[1] IDENTITIES (every arm). Max abs error over 2026-30.")
    for name in ["baseline", *arms]:
        a = res[name]
        g, z = tech(a)
        Y, K, L, w, r = (arr(a, v) for v in "YKLwr")
        e_pf = np.max(np.abs(Y / (z * K ** g * L ** (1 - g)) - 1))
        e_ls = np.max(np.abs(w * L / Y - (1 - g)))
        r_hat = (1 - TAU_B) * g * Y / K - DELTA + TAU_B * DELTA_TAU
        e_r = np.max(np.abs(r - r_hat))
        print(f"    {name:<16} Y = Z K^g L^(1-g): {e_pf:.1e} | wL/Y = 1-g: {e_ls:.1e} "
              f"| r = (1-tau_b) g Y/K - delta + tau_b delta_tau: {e_r:.1e}")

    print("\n[2] RESOURCE-CONSTRAINT RESIDUAL (absolute values as stored)")
    rc = {n: np.array(res[n]["diagnostics"]["rc_first5"]) for n in ["baseline", *arms]}
    for n, x in rc.items():
        print(f"    {n:<16} % of own GDP:", fmt(x / arr(res[n], 'Y') * 100, 5, False))
    for n in arms:
        d = (rc[n] - rc["baseline"]) / B["Y"] * 100
        print(f"    {n:<16} minus baseline, % of GDP:", fmt(d, 5))

    for name in arms:
        a = res[name]
        A = {v: arr(a, v) for v in SERIES}
        g, z = tech(a)
        print("\n" + "-" * 100, f"\nARM {name}  (gamma -> {a['gamma_terminal']}, "
              f"Z -> {a['Z_terminal']:.6f})\n", "-" * 100, sep="")
        print("[3] GAPS vs baseline, %           ", fmt(YEARS, 0, False))
        for v in SERIES:
            if v == "r":
                print(f"    {'r (bp)':<28}", fmt((A[v] - B[v]) * 1e4, 1))
            else:
                print(f"    {v:<28}", fmt(pct(A[v], B[v])))
        print(f"    {'w*L (labour income)':<28}", fmt(pct(A['w'] * A['L'], B['w'] * B['L'])))
        print(f"    {'Y - w*L (capital income)':<28}",
              fmt(pct(A['Y'] - A['w'] * A['L'], B['Y'] - B['w'] * B['L'])))
        print(f"    {'Y/L':<28}", fmt(pct(A['Y'] / A['L'], B['Y'] / B['L'])))
        print(f"    {'K/Y':<28}", fmt(pct(A['K'] / A['Y'], B['K'] / B['Y'])))
        print(f"    {'I/Y level %':<28}", fmt(A['I'] / A['Y'] * 100, 2, False))
        print(f"    {'I/Y (pp)':<28}", fmt((A['I'] / A['Y'] - B['I'] / B['Y']) * 100))
        print(f"    {'tax/Y (pp)':<28}", fmt((A['total_tax_revenue'] / A['Y']
                                             - B['total_tax_revenue'] / B['Y']) * 100))
        print(f"    {'D/Y (pp)':<28}", fmt((A['D'] / A['Y'] - B['D'] / B['Y']) * 100))
        print(f"    {'D/Y level %':<28}", fmt(A['D'] / A['Y'] * 100, 2, False))
        lva = A["Y"] * np.concatenate([[1], np.cumprod(grow[:4])])
        print(f"    {'real GDP growth %':<28}", " " * 9, fmt(pct(lva[1:], lva[:-1])))

        print("[4] GDP-GAP DECOMPOSITION (log points x100; sums exactly to the log gap)")
        t_term = np.log(z) + (g - G_BASE) * np.log(B["K"] / B["L"])
        k_term = g * np.log(A["K"] / B["K"])
        l_term = (1 - g) * np.log(A["L"] / B["L"])
        tot = np.log(A["Y"] / B["Y"])
        for lab, x in [("technology at baseline K, L", t_term), ("capital", k_term),
                       ("labour", l_term), ("sum", t_term + k_term + l_term),
                       ("log GDP gap", tot)]:
            print(f"    {lab:<28}", fmt(x * 100))
        gap = pct(A["Y"], B["Y"])
        print(f"    2026 gap as share of 2030 gap: {gap[0] / gap[4] * 100:.1f}%"
              f"; share of the 2026 gap that is labour: {l_term[0] / tot[0] * 100:.1f}%")

        print("[5] LABOUR RESPONSE vs the intratemporal condition (aggregate approximation)")
        dl = np.log(A["L"] / B["L"]) * 100
        dw = np.log(A["w"] / B["w"]) * 100
        dc = np.log(A["C"] / B["C"]) * 100
        pred = FRISCH * (dw - SIGMA * dc)
        print(f"    {'d ln L, model':<28}", fmt(dl))
        print(f"    {'frisch*(dlnw - sigma*dlnC)':<28}", fmt(pred))

        print("[6] WAGE ALGEBRA: d ln w = ln((1-g1)/(1-g0)) + d ln(Y/L)")
        share = np.log((1 - g) / (1 - G_BASE)) * 100
        print(f"    {'share term':<28}", fmt(share))
        print(f"    {'d ln(Y/L)':<28}", fmt(np.log(A['Y'] / A['L'] * B['L'] / B['Y']) * 100))
        print(f"    {'d ln w':<28}", fmt(dw))
        print(f"    rise in GDP per unit of labour needed for an unchanged wage in 2030: "
              f"{((1 - G_BASE) / (1 - g[4]) - 1) * 100:.2f}%")
        need = (1 - G_BASE) / (1 - g[4]) / (A["Y"][4] / A["L"][4] * B["L"][4] / B["Y"][4])
        k_gap = pct(A["K"], B["K"])[4]
        print(f"    capital gap that would deliver it at the model's L: "
              f"{((1 + k_gap / 100) * need ** (1 / g[4]) - 1) * 100:.1f}% (model: {k_gap:.1f}%)")

        print("[7] EXPENDITURE: gaps as % of baseline GDP in the same year")
        dY, dC, dI, dG = (A[v] - B[v] for v in "YCIG")
        for lab, x in [("dY", dY), ("dC", dC), ("dI", dI), ("dG", dG),
                       ("d(Y-C-I-G)  [external]", dY - dC - dI - dG)]:
            print(f"    {lab:<28}", fmt(x / B["Y"] * 100))
        base26 = B["Y"][0]
        xi = dI[:4].sum() / base26 * 100
        dom = (dY - dC - dG)[:4].sum() / base26 * 100
        print(f"    2026-29 sum, % of 2026 GDP: extra I {xi:.2f}, domestic resources "
              f"released (dY-dC-dG) {dom:.2f}, no domestic counterpart {(1 - dom / xi) * 100:.1f}%")

        print("[8] CAPITAL LAW OF MOTION: I_t = grow_t K_{t+1} - (1-delta) K_t - immigrant term")
        imm_b = grow[:4] * B["K"][1:] - (1 - DELTA) * B["K"][:4] - B["I"][:4]
        imm_a = grow[:4] * A["K"][1:] - (1 - DELTA) * A["K"][:4] - A["I"][:4]
        print(f"    {'immigrant term, baseline':<28}", fmt(imm_b, 5))
        print(f"    {'immigrant term, arm':<28}", fmt(imm_a, 5))
        # K_2031 implied by I_2030, using the 2029 immigrant term of each path
        k31a = (A["I"][4] + imm_a[3] + (1 - DELTA) * A["K"][4]) / grow[4]
        k31b = (B["I"][4] + imm_b[3] + (1 - DELTA) * B["K"][4]) / grow[4]
        kg = pct(A["K"], B["K"])
        print(f"    capital gap %: {fmt(kg)} | implied 2031: {pct(k31a, k31b):+.2f}")
        print(f"    annual change in the capital gap, pp: {fmt(np.diff(np.append(kg, pct(k31a, k31b))))}")
        repl = (grow[4] - (1 - DELTA)) * (A["K"][4] - B["K"][4]) / B["I"][4] * 100
        print(f"    2030 investment gap {pct(A['I'], B['I'])[4]:+.1f}%, of which holding the "
              f"2030 capital gap constant needs {repl:+.1f}%")

        print("[9] FOREIGN CAPITAL, by inverting K = K_d + zeta_K (K_open - K_d)")
        ko_b, kd_b, kf_b = split_capital(base)
        ko_a, kd_a, kf_a = split_capital(a)
        print(f"    2026 check: capital gap / labour gap = {kg[0] / pct(A['L'], B['L'])[0]:.4f}; "
              f"rule predicts zeta_K*(K_open/L)*L/K = {ZETA_K * kl_open(G_BASE, 1.0) * B['L'][0] / B['K'][0]:.4f}")
        print(f"    2026 K_d gap (must be 0, assets are inherited): {pct(kd_a, kd_b)[0]:+.6f}%")
        print(f"    {'K_open/K, baseline':<28}", fmt(ko_b / B['K'], 3, False))
        print(f"    {'K_open/K, arm':<28}", fmt(ko_a / A['K'], 3, False))
        print(f"    {'K_open gap %':<28}", fmt(pct(ko_a, ko_b)))
        print(f"    {'K_f/K %, baseline':<28}", fmt(kf_b / B['K'] * 100, 2, False))
        print(f"    {'K_f/K %, arm':<28}", fmt(kf_a / A['K'] * 100, 2, False))
        print(f"    {'K_d gap %':<28}", fmt(pct(kd_a, kd_b)))
        print(f"    {'K_f gap %':<28}", fmt(pct(kf_a, kf_b)))
        fshare = (kf_a - kf_b) / (A["K"] - B["K"]) * 100
        print(f"    {'foreign share of dK %':<28}", fmt(fshare, 1, False))
        # Income paid abroad. OG-Core pays foreigners the portfolio return r_p on
        # both K_f and D_f (aggregates.get_capital_outflows, fiscal.get_debt_service_f),
        # with r_p = (r_gov D + r K) / (D + K). D_f follows fiscal.get_D_f: every
        # arm starts from the same D_f and foreigners take zeta_D of each new issue.
        def abroad(X, kf, df):
            rp = ((X["r"] - R_GOV_SHIFT) * X["D"] + X["r"] * X["K"]) / (X["D"] + X["K"])
            return rp, rp * (kf + df)

        df_b = np.empty(5)
        df_b[0] = FOREIGN_DEBT_SHARE * B["D"][0]
        df_a = df_b.copy()
        for t in range(4):
            df_b[t + 1] = df_b[t] / grow[t] + ZETA_D * (B["D"][t + 1] - B["D"][t] / grow[t])
            df_a[t + 1] = df_a[t] / grow[t] + ZETA_D * (A["D"][t + 1] - A["D"][t] / grow[t])
        rp_b, pay_b = abroad(B, kf_b, df_b)
        rp_a, pay_a = abroad(A, kf_a, df_a)
        print(f"    {'r_p %, baseline':<28}", fmt(rp_b * 100, 2, False))
        print(f"    {'r_p %, arm':<28}", fmt(rp_a * 100, 2, False))
        print(f"    {'(K_f+D_f)/Y %, baseline':<28}", fmt((kf_b + df_b) / B['Y'] * 100, 1, False))
        print(f"    {'(K_f+D_f)/Y %, arm':<28}", fmt((kf_a + df_a) / A['Y'] * 100, 1, False))
        print(f"    {'paid abroad / Y %, baseline':<28}", fmt(pay_b / B['Y'] * 100, 2, False))
        print(f"    {'paid abroad / Y %, arm':<28}", fmt(pay_a / A['Y'] * 100, 2, False))
        print(f"    {'d(paid abroad), % base GDP':<28}", fmt((pay_a - pay_b) / B['Y'] * 100))
        print(f"    {'  of which more K_f, base r_p':<28}",
              fmt(rp_b * (kf_a - kf_b) / B['Y'] * 100))
        print(f"    {'GDP gap %':<28}", fmt(pct(A['Y'], B['Y'])))
        gni = pct(A["Y"] - pay_a, B["Y"] - pay_b)
        print(f"    {'GNI gap % (GDP-paid abroad)':<28}", fmt(gni))
        print(f"    {'GNI gap / GDP gap':<28}", fmt(gni / pct(A['Y'], B['Y']), 2, False))
        gni_r = pct(A["Y"] - A["r"] * kf_a, B["Y"] - B["r"] * kf_b)
        print(f"    {'variant: K_f earns r, no D_f':<28}", fmt(gni_r))

        print("[9c] EXTERNAL IDENTITY: Y-C-I-G = (1+r_p) F_t - grow_t F_{t+1} + rc_t, "
              "F = K_f + D_f (2026-29)")
        # 2030 needs K_f and D_f in 2031, which the results file does not hold.
        for lab, X, kf, df, rp, n in [("baseline", B, kf_b, df_b, rp_b, "baseline"),
                                      ("arm", A, kf_a, df_a, rp_a, name)]:
            F = kf + df
            ext = (X["Y"] - X["C"] - X["I"] - X["G"])[:4]
            flows = (1 + rp[:4]) * F[:4] - grow[:4] * F[1:]
            signed = (ext - flows) / X["Y"][:4] * 100
            stored = rc[n][:4] / X["Y"][:4] * 100
            print(f"    {lab:<9} implied signed rc, % GDP: {fmt(signed, 4)} | stored |rc|: "
                  f"{fmt(stored, 4, False)}")

        print("[9d] WHY Y-C-I-G SWINGS IN 2030: net foreign inflow (growth*F_{t+1} - F_t) "
              "and income paid abroad, % of baseline GDP")
        # From the identity above, with the stored residual: inflow_t =
        # r_p F_t - (Y-C-I-G)_t + rc_t. This also gives 2030 without 2031 stocks.
        out = {}
        for lab, X, kf, df, rp, n in [("baseline", B, kf_b, df_b, rp_b, "baseline"),
                                      ("arm", A, kf_a, df_a, rp_a, name)]:
            ext = X["Y"] - X["C"] - X["I"] - X["G"]
            income = rp * (kf + df)
            out[lab] = (ext, income, income - ext - rc[n])
        for i, lab in enumerate(["Y-C-I-G", "income paid abroad", "net foreign inflow"]):
            print(f"    {lab + ', baseline':<30}", fmt(out['baseline'][i] / B['Y'] * 100))
            print(f"    {lab + ', arm':<30}", fmt(out['arm'][i] / B['Y'] * 100))
            print(f"    {lab + ', gap':<30}",
                  fmt((out['arm'][i] - out['baseline'][i]) / B['Y'] * 100))
        d_ext = (out["arm"][0] - out["baseline"][0]) / B["Y"] * 100
        d_inc = (out["arm"][1] - out["baseline"][1]) / B["Y"] * 100
        d_inf = (out["arm"][2] - out["baseline"][2]) / B["Y"] * 100
        print(f"    2029 -> 2030 swing in the Y-C-I-G gap: {d_ext[4] - d_ext[3]:+.2f}pp = "
              f"inflow gap falls {d_inf[3] - d_inf[4]:.2f}pp + income paid abroad rises "
              f"{d_inc[4] - d_inc[3]:.2f}pp")
        print(f"    investment gap, % of baseline GDP: 2029 {dI[3] / B['Y'][3] * 100:+.2f}, "
              f"2030 {dI[4] / B['Y'][4] * 100:+.2f}")

        print("[E] COMPARATORS computed from inputs only (gamma, Z, delta, tau_b, baseline path)")
        # (i) inputs fixed at baseline; (ii) Solow: investment a fixed share of
        # GDP (the baseline's), labour at baseline; (iii) return pinned at the
        # baseline r: K/Y scales with gamma (closed-economy steady state, or a
        # perfectly open economy at once).
        s_b = B["I"] / B["Y"]
        K_s = B["K"].copy()
        for t in range(4):
            y_t = z[t] * K_s[t] ** g[t] * B["L"][t] ** (1 - g[t])
            K_s[t + 1] = ((1 - DELTA) * K_s[t] + s_b[t] * y_t + imm_b[t]) / grow[t]
        Y_s = z * K_s ** g * B["L"] ** (1 - g)
        r_s = (1 - TAU_B) * g * Y_s / K_s - DELTA + TAU_B * DELTA_TAU
        w_s = (1 - g) * Y_s / B["L"]
        cc = G_BASE * B["Y"][4] / B["K"][4]
        k_p = (g[4] * z[4] / cc) ** (1 / (1 - g[4])) * B["L"][4]
        Y_p = z[4] * k_p ** g[4] * B["L"][4] ** (1 - g[4])
        w_p = (1 - g[4]) * Y_p / B["L"][4]
        r_fix = (1 - TAU_B) * g[4] * np.exp(t_term[4]) * B["Y"][4] / B["K"][4] \
            - DELTA + TAU_B * DELTA_TAU
        w_fix = (np.exp(share[4] / 100 + t_term[4]) - 1) * 100
        print(f"    {'2030':<22}{'inputs fixed':>14}{'Solow':>10}{'r pinned':>10}{'model':>10}")
        rows = [
            ("GDP %", (np.exp(t_term[4]) - 1) * 100, pct(Y_s, B["Y"])[4],
             pct(Y_p, B["Y"][4]), gap[4]),
            ("capital %", 0.0, pct(K_s, B["K"])[4], pct(k_p, B["K"][4]), kg[4]),
            ("wage %", w_fix, pct(w_s, B["w"])[4], pct(w_p, B["w"][4]),
             pct(A["w"], B["w"])[4]),
            ("r, bp", (r_fix - B["r"][4]) * 1e4, (r_s - B["r"])[4] * 1e4, 0.0,
             (A["r"] - B["r"])[4] * 1e4),
            ("investment %, 2029", 0.0, pct(s_b * Y_s, B["I"])[3],
             float("nan"), pct(A["I"], B["I"])[3]),
        ]
        for lab, *vals in rows:
            print(f"    {lab:<22}" + "".join(f"{v:>+{14 if i == 0 else 10}.2f}"
                                             for i, v in enumerate(vals)))

        print("[9b] SAME PRODUCTION FUNCTION AT THE SOURCE'S CAPITAL "
              "(Korinek et al. Table 3: K +13.8%)")
        y_src = t_term[4] + g[4] * np.log(1.138) + l_term[4]
        w_src = share[4] + y_src * 100 - np.log(A["L"][4] / B["L"][4]) * 100
        print(f"    2030 GDP gap {(np.exp(y_src) - 1) * 100:+.2f}% (source +8.3%, model "
              f"{gap[4]:+.2f}%); wage {(np.exp(w_src / 100) - 1) * 100:+.2f}% "
              f"(model {pct(A['w'], B['w'])[4]:+.2f}%)")
        print(f"    source labour income, Table 3: (56.1/60.0)*1.083 - 1 = "
              f"{(56.1 / 60 * 1.083 - 1) * 100:+.2f}%; "
              f"model {pct(A['w'] * A['L'], B['w'] * B['L'])[4]:+.2f}%")
        tax_pp = (A["total_tax_revenue"][4] / A["Y"][4]
                  - B["total_tax_revenue"][4] / B["Y"][4]) * 100
        print(f"    tax/GDP rule of thumb (OBR effective rates: 46% wages, 27% profits): "
              f"{(0.46 - 0.27) * -(g[4] - G_BASE) * 100:+.2f}pp; model {tax_pp:+.2f}pp")

        print("[10] DEBT DYNAMICS (r_gov = r - 0.02)")
        for lab, X in [("baseline", B), ("arm", A)]:
            rg = X["r"] - R_GOV_SHIFT
            pb = ((1 + rg[:4]) * X["D"][:4] - grow[:4] * X["D"][1:]) / X["Y"][:4] * 100
            snow = ((1 + rg[:4]) / grow[:4] - 1) * X["D"][:4] / X["Y"][:4] * 100
            print(f"    {lab:<9} implied primary surplus % GDP: {fmt(pb)} | "
                  f"(r_gov-g) D/Y, pp: {fmt(snow)} | r_gov %: {fmt(rg[:4] * 100, 2, False)}")
            other = (X["total_tax_revenue"][:4] - X["G"][:4]) / X["Y"][:4] * 100 - pb
            print(f"    {'':<9} tax - G - primary surplus (transfers etc.), % GDP: {fmt(other)}")
        el = pct(A["total_tax_revenue"], B["total_tax_revenue"])[4] / pct(A["Y"], B["Y"])[4]
        print(f"    2030 revenue gap / GDP gap = {el:.2f}")
    return res


def context(export=None):
    """Data the report quotes that is not in the results files."""
    root = HERE.parents[1]
    print("=" * 100, "\n[X] CONTEXT: OBR data, the dashboard's rebased paths, the #30 export\n",
          "=" * 100, sep="")
    hist = json.loads((HERE / "obr_history.json").read_text())["panels"]
    for pnl in hist:
        x, y = pnl["obr"]["x"], pnl["obr"]["y"]
        w = [f"{b:.2f}" for a, b in zip(x, y) if 2026 <= a <= 2030]
        hi = max((b, a) for a, b in zip(x, y) if a <= 2025)
        print(f"    OBR {pnl['var']:<18} 2026-30: {' '.join(w)} | highest 2000-25: "
              f"{hi[0]:.2f} ({hi[1]})")
    paths = json.loads((root / "dashboard/src/data/ukAiPaths.json").read_text())["panels"]
    for pnl in paths:
        for tr in pnl["traces"][1:]:
            print(f"    chart | {pnl['title'][:28]:<28} | {tr['name']:<26} "
                  + " ".join(f"{v:.2f}" for v in tr["y"]))
    if export:
        x = json.loads(Path(export).read_text())
        srs = x["series"]
        b = json.loads((HERE / "scenarios.json").read_text())["baseline"]
        _, _, kf = split_capital(b)
        grow = np.exp(b["g_y_annual_used"]) * (1 + np.array(b["g_n_used"]))
        D, r, K = arr(b, "D"), arr(b, "r"), arr(b, "K")
        df = np.empty(5)
        df[0] = FOREIGN_DEBT_SHARE * D[0]
        for t in range(4):
            df[t + 1] = df[t] / grow[t] + ZETA_D * (D[t + 1] - D[t] / grow[t])
        rp = ((r - R_GOV_SHIFT) * D + r * K) / (D + K)
        print(f"    #30 export {export}")
        for lab, mine, key in [("Y (committed vs re-solve)", arr(b, "Y"), "Y"),
                               ("K_f", kf, "K_f"), ("D_f", df, "D_f"), ("r_p", rp, "r_p")]:
            print(f"      max abs diff, {lab}: {np.max(np.abs(mine - np.array(srs[key][:5]))):.1e}")
        cv, ss = x["convergence"], x["ss"]
        print(f"      signed residual / GDP: {[round(v, 6) for v in cv['rc_rel_Y_signed'][:5]]}")
        print(f"      steady state: D/Y {ss['D'] / ss['Y']:.4f}, r {ss['r']:.4f}")
        lom = x["demographics"]["check"]["law_of_motion_rel_residual"]
        print(f"      period-0 population law of motion, max abs relative residual: stock "
              f"inputs {lom['stock_ogcore_defaults']['maxabs']:.4f}, UK-consistent "
              f"{lom['uk_consistent']['maxabs']:.1e}")


if __name__ == "__main__":
    args = sys.argv[1:]
    export = None
    if "--export" in args:
        k = args.index("--export")
        export = args[k + 1]
        del args[k:k + 2]
    for p in args or [HERE / "scenarios.json", HERE / "scenarios_fixed_spending.json"]:
        audit(p)
    context(export)
