"""Build docs/closure_sensitivity.md and output/summary.json from the solve JSONs.

Every number in the doc is computed here from ``analysis/closure/output/*.json``;
the interpretation is hand-written in ``analysis/closure/notes.md`` and spliced
in.  Safe to run on a partial set of solves.

GNI (documented in the doc as well):

    GNI_t = Y_t - r_p,t * K_f,t - r_p,t * D_f,t

``r_p * K_f`` is the return paid to foreign owners of UK private capital and
``r_p * D_f`` (OG-Core's ``debt_service_f``) the interest paid on
foreign-held government debt.  ``r_p`` (the portfolio return) is used because
that is the rate OG-Core charges on K_f in its own resource constraint
(``aggregates.get_capital_outflows`` is called with ``r_p``).  delta*K_f is not
netted: Y is gross, so this is gross national income.  A variant using the
firm rate ``r`` on K_f is reported alongside.  All series are detrended by the
same g_y and g_n in every arm, so ratios between arms in the same year are
unaffected by re-trending.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
OUT = HERE / "output"
DOC = REPO / "docs" / "closure_sensitivity.md"
NOTES = HERE / "notes.md"
COMMITTED = REPO / "uk_growth_with_ai" / "data" / "legacy" / "scenarios_2026-11-11.json"  # the run #30 reproduced

ZKS = ("0", "0.1", "0.5")
ARMS = ("share_shift_tfp_ramp", "share_shift_ramp")
ARM_NAME = {"share_shift_tfp_ramp": "`share_shift_tfp_ramp`",
            "share_shift_ramp": "`share_shift_ramp`"}
Y2030 = 4


def load():
    runs = {}
    for f in sorted(OUT.glob("*.json")):
        d = json.loads(f.read_text())
        if "series" in d and "label" in d:   # skip summary.json / extra_exports.json
            runs[f.stem] = d
    return runs


def arr(run, k):
    return np.asarray(run["series"][k], dtype=float)


def gni(run, rate="r_p"):
    return arr(run, "Y") - arr(run, rate) * arr(run, "K_f") - arr(run, "debt_service_f")


def pct(x, d=2):
    return "n/a" if x is None or not np.isfinite(x) else f"{100 * x:+.{d}f}%"


def fmt(x, d=4):
    return "n/a" if x is None else f"{x:.{d}f}"


def arm_metrics(arm, base):
    yrs = arm["years"]
    out = {"years": yrs}
    gY = arr(arm, "Y") / arr(base, "Y") - 1
    gG = gni(arm) / gni(base) - 1
    gGr = gni(arm, "r") / gni(base, "r") - 1
    gK = arr(arm, "K") / arr(base, "K") - 1
    gL = arr(arm, "L") / arr(base, "L") - 1
    gC = arr(arm, "C") / arr(base, "C") - 1
    gI = arr(arm, "I") / arr(base, "I") - 1
    dK = arr(arm, "K") - arr(base, "K")
    dKf = arr(arm, "K_f") - arr(base, "K_f")
    pay_arm = (arr(arm, "Y") - gni(arm)) / arr(arm, "Y")
    out.update({
        "gdp_gap": gY.tolist(), "gni_gap": gG.tolist(), "gni_gap_r_variant": gGr.tolist(),
        "K_gap": gK.tolist(), "L_gap": gL.tolist(), "C_gap": gC.tolist(), "I_gap": gI.tolist(),
        "r_change_bp": (1e4 * (arr(arm, "r") - arr(base, "r"))).tolist(),
        "r_p_change_bp": (1e4 * (arr(arm, "r_p") - arr(base, "r_p"))).tolist(),
        "foreign_share_of_extra_K": (dKf / np.where(dK != 0, dK, np.nan)).tolist(),
        "payments_abroad_share_Y_arm": pay_arm.tolist(),
        "K_gap_over_L_gap_2026": float(gK[0] / gL[0]) if gL[0] != 0 else None,
    })
    return out


def compare_committed(runs):
    if not COMMITTED.exists():
        return None
    c = json.loads(COMMITTED.read_text())
    res = {}
    for arm in ("baseline",) + ARMS:
        r = runs.get(f"zk0.1_{arm}")
        if not r or arm not in c:
            continue
        d = {}
        for v in ("Y", "K", "L", "r", "C", "I", "w"):
            if v in c[arm]:
                a = np.asarray(c[arm][v][:5])
                b = arr(r, v)[:5]
                d[v] = float(np.max(np.abs(b / a - 1)))
        res[arm] = d
    return res


def main():
    runs = load()
    summ = {"runs": sorted(runs), "closures": {}, "convergence": {}, "committed_check": None}
    for zk in ZKS:
        b = runs.get(f"zk{zk}_baseline")
        if not b:
            continue
        cl = {"baseline": {"r_2026": arr(b, "r")[0], "r_2030": arr(b, "r")[Y2030],
                           "Kf_over_K_2030": float(arr(b, "K_f")[Y2030] / arr(b, "K")[Y2030]),
                           "Df_over_D_2030": float(arr(b, "D_f")[Y2030] / arr(b, "D")[Y2030]),
                           "gni_over_gdp_2030": float(gni(b)[Y2030] / arr(b, "Y")[Y2030])}}
        for arm in ARMS:
            a = runs.get(f"zk{zk}_{arm}")
            if a:
                cl[arm] = arm_metrics(a, b)
                cl[arm]["Z_terminal"] = a["Z_terminal"]
        summ["closures"][zk] = cl
    for k, r in runs.items():
        c = r["convergence"]
        summ["convergence"][k] = {
            "tpi_iterations": c["tpi_iterations"], "tpi_final_distance": c["tpi_final_distance"],
            "converged": c["converged"], "rc_rel_Y_2026": c["rc_rel_Y_signed"][0],
            "rc_rel_Y_max_abs_interior": c["rc_rel_Y_max_abs_interior"],
            "rc_rel_Y_last": c["rc_rel_Y_signed"][-1],
            "euler_savings_max": c["euler_savings_max"], "euler_labour_max": c["euler_labour_max"],
            "identities_maxabs": r["identities_maxabs"],
        }
    summ["committed_check"] = compare_committed(runs)
    (OUT / "summary.json").write_text(json.dumps(summ, indent=1, default=float))
    DOC.write_text(render(runs, summ))
    print(f"wrote {DOC} and {OUT / 'summary.json'} from {len(runs)} solves")


def render(runs, summ):
    L = []
    w = L.append
    w("# Capital-closure sensitivity, GNI and the period-0 demographics test\n")
    w("Diagnostic reruns for issues #16 (closure / GNI), #15 (2026 resource-constraint "
      "residual) and #18 (environment); tracker #27 step 5. Generated by "
      "`analysis/closure/summarise.py` from the solve outputs in "
      "`analysis/closure/output/`; the prose comes from `analysis/closure/notes.md`. "
      f"Solves present: {len(runs)} of 10.\n")
    if NOTES.exists():
        w(NOTES.read_text().strip() + "\n")

    w("## Design\n")
    w("* Arms: the no-AI `baseline` and the two ramp arms, `share_shift_tfp_ramp` "
      "(share_shift_tfp: labour share −3.9pp, +3.1% TFP at fixed inputs) and `share_shift_ramp` "
      "(share_shift: labour share −3.9pp, GDP level unchanged at fixed inputs), against the "
      "OBR-central baseline. Ids follow #22; the solves ran before that merge as "
      "`anthropic_ramp` / `obr_ramp` and were renamed afterwards (numbers unchanged; each "
      "file records `renamed_from`).")
    w("* `zeta_K` ∈ {0, 0.1, 0.5}. 0.1 is OG-UK's default and the committed run; it is "
      "re-solved here because the committed results do not export `B`, `K_d`, `K_f`, "
      "`D_d` or `D_f`, so there was no GNI for the headline. That makes 9 closure solves, "
      "not 6, plus one pre-TP demographics baseline.")
    w("* Everything else is held at the committed settings: `zeta_D = 0.4`, "
      "`world_int_rate_annual = 0.02`, `epsilon = 1`, `tG1 = 10`, `g_y_annual = 0.010`, "
      "common `alpha_G` from each closure's baseline, ramp 2026→2030. "
      "**`zeta_K = 0` closes the economy to foreign *private* capital only**: foreigners "
      "still absorb 40% of new government debt (`zeta_D`), so `D_f > 0` and GNI < GDP "
      "even there.")
    w("* Each closure has its own baseline; its ramp arms inherit that baseline's initial "
      "assets and debt. Z is re-solved per closure against that baseline's 2026 K and L, "
      "exactly as `solve.run_scenarios` does, so every closure carries the same technology "
      "target. (Holding Z at the 0.1 values would add a spurious fixed-input TFP "
      "difference, because the γ-only gain (K/L)^Δγ − 1 depends on baseline K/L.)")
    w("* GNI = Y − r_p·K_f − r_p·D_f. `r_p·K_f` is the return to foreign owners of UK "
      "capital, `r_p·D_f` (OG-Core `debt_service_f`) the interest on foreign-held gilts. "
      "`r_p` is the rate OG-Core itself charges on K_f in the resource constraint "
      "(`get_capital_outflows` is called with `r_p`). δ·K_f is not netted (gross national "
      "income). The variant with the firm rate `r` on K_f is in `summary.json` "
      "(`gni_gap_r_variant`). Gaps are ratios between arms in the same year, so the common "
      "detrending cancels.\n")

    w("## 2030 gaps against each closure's own baseline\n")
    w("| zeta_K | arm | Z | GDP gap | GNI gap | GNI − GDP gap | K gap | I gap | C gap | Δr (bp) | foreign share of extra K |")
    w("|---|---|---|---|---|---|---|---|---|---|---|")
    for zk in ZKS:
        cl = summ["closures"].get(zk, {})
        for arm in ARMS:
            m = cl.get(arm)
            if not m:
                w(f"| {zk} | {ARM_NAME[arm]} | pending | | | | | | | | |")
                continue
            i = Y2030
            w(f"| {zk} | {ARM_NAME[arm]} | {m['Z_terminal']:.6f} | {pct(m['gdp_gap'][i])} | "
              f"{pct(m['gni_gap'][i])} | {100 * (m['gni_gap'][i] - m['gdp_gap'][i]):+.2f}pp | "
              f"{pct(m['K_gap'][i])} | {pct(m['I_gap'][i], 1)} | {pct(m['C_gap'][i])} | "
              f"{m['r_change_bp'][i]:+.0f} | {pct(m['foreign_share_of_extra_K'][i], 1)} |")
    w("")
    w("Baselines (no AI), 2030:\n")
    w("| zeta_K | r 2026 | r 2030 | K_f / K | D_f / D | GNI / GDP |")
    w("|---|---|---|---|---|---|")
    for zk in ZKS:
        b = summ["closures"].get(zk, {}).get("baseline")
        if b:
            w(f"| {zk} | {100 * b['r_2026']:.2f}% | {100 * b['r_2030']:.2f}% | "
              f"{100 * b['Kf_over_K_2030']:.1f}% | {100 * b['Df_over_D_2030']:.1f}% | "
              f"{100 * b['gni_over_gdp_2030']:.2f}% |")
    w("")

    w("## Year by year\n")
    for zk in ZKS:
        cl = summ["closures"].get(zk, {})
        for arm in ARMS:
            m = cl.get(arm)
            if not m:
                continue
            w(f"**zeta_K = {zk}, {ARM_NAME[arm]}**\n")
            w("| year | GDP gap | GNI gap | K gap | L gap | I gap | Δr (bp) | foreign share of extra K | payments abroad / GDP (arm) |")
            w("|---|---|---|---|---|---|---|---|---|")
            for i, y in enumerate(m["years"][:5]):
                w(f"| {y} | {pct(m['gdp_gap'][i])} | {pct(m['gni_gap'][i])} | "
                  f"{pct(m['K_gap'][i])} | {pct(m['L_gap'][i])} | {pct(m['I_gap'][i], 1)} | "
                  f"{m['r_change_bp'][i]:+.0f} | {pct(m['foreign_share_of_extra_K'][i], 1)} | "
                  f"{100 * m['payments_abroad_share_Y_arm'][i]:.2f}% |")
            k = m["K_gap_over_L_gap_2026"]
            w(f"\n2026 K gap / L gap = {k:.3f}\n" if k is not None else "")

    w("## Levels exported (detrended model units)\n")
    w("`B`, `K`, `K_d`, `K_f`, `D`, `D_d`, `D_f`, `r`, `r_p`, `r_gov`, `Y`, `C`, `I`, "
      "`I_total`, `I_d`, `L`, `w`, `G`, `TR`, `new_borrowing_f`, `debt_service_f` for "
      "2026–2035 are in each `analysis/closure/output/<run>.json` under `series`. 2030 "
      "values:\n")
    w("| run | Y | B | K | K_d | K_f | D_d | D_f | r | r_p | C | I |")
    w("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for k, r in runs.items():
        s = {v: arr(r, v)[Y2030] for v in ("Y", "B", "K", "K_d", "K_f", "D_d", "D_f",
                                            "r", "r_p", "C", "I")}
        w(f"| `{k}` | " + " | ".join(
            f"{100 * s[v]:.2f}%" if v in ("r", "r_p") else f"{s[v]:.4f}"
            for v in ("Y", "B", "K", "K_d", "K_f", "D_d", "D_f", "r", "r_p", "C", "I")) + " |")
    w("")

    w("## Convergence (every run)\n")
    w("TPI distance is parsed from OG-Core's `ogcore.TPI` log (the committed runner sets "
      "`ENFORCE_SOLUTION_CHECKS = False`, which also disables the non-convergence error). "
      "RC is the signed resource-constraint error divided by GDP in the same period; the "
      "full per-period paths are in each run's `convergence.rc_rel_Y_signed`. The last "
      "period (t = T−1) carries OG-UK's known boundary error and is excluded from the "
      "interior max.\n")
    w(f"| run | TPI iterations | final distance (tol 1e-4) | converged | RC/GDP 2026 (signed) | max abs RC/GDP, 2027…T−2 | Euler savings max | Euler labour max | identity max abs |")
    w("|---|---|---|---|---|---|---|---|---|")
    for k, c in summ["convergence"].items():
        idm = max(c["identities_maxabs"].values())
        w(f"| `{k}` | {c['tpi_iterations']} | {c['tpi_final_distance']:.2e} | "
          f"{'yes' if c['converged'] else '**NO**'} | {100 * c['rc_rel_Y_2026']:+.4f}% | "
          f"{100 * c['rc_rel_Y_max_abs_interior']:.2e}% | {c['euler_savings_max']:.1e} | "
          f"{c['euler_labour_max']:.1e} | {idm:.1e} |")
    w("")
    cc = summ["committed_check"]
    if cc:
        w("Reproduction of the run committed at the time (now "
          "`uk_growth_with_ai/data/legacy/scenarios_2026-11-11.json`) by the "
          "zeta_K = 0.1 solves, max relative difference over 2026–2030:\n")
        w("| arm | " + " | ".join(next(iter(cc.values())).keys()) + " |")
        w("|---|" + "---|" * len(next(iter(cc.values()))))
        for arm, d in cc.items():
            w(f"| `{arm}` | " + " | ".join(f"{v:.1e}" for v in d.values()) + " |")
        w("")

    w("## Period-0 demographics test (#15)\n")
    b, pt = runs.get("zk0.1_baseline"), runs.get("pretp_zk0.1_baseline")
    if b:
        dc = b["demographics"]["check"]
        lom = dc["law_of_motion_rel_residual"]
        w("OG-UK's `_build_specs` passes `omega_S_preTP` from the UK fetch but never "
          "`g_n_preTP`, `rho_preTP` or `imm_rates_preTP`, so period 0 runs on OG-Core's "
          "shipped values. The pre-period → 2026 population law of motion "
          "(`omega_0[s+1](1+g_n_preTP) = (1−rho_pre[s])·omega_pre[s] + imm_pre[s+1]·omega_pre[s+1]`), "
          "relative residual by age:\n")
        w("| pre-TP inputs | min | max | max abs |")
        w("|---|---|---|---|")
        for k, lab in (("stock_ogcore_defaults", "stock (OG-Core defaults, what runs use)"),
                       ("uk_consistent", "UK-consistent (same fetch)")):
            v = lom[k]
            w(f"| {lab} | {100 * v['min']:+.3f}% | {100 * v['max']:+.3f}% | {100 * v['maxabs']:.3g}% |")
        w(f"\n`g_n_preTP`: stock {dc['g_n_preTP_stock']:.6f}, UK {dc['g_n_preTP_uk']:.6f}; "
          f"max |Δ rho_preTP| {dc['rho_preTP_maxabs_diff']:.2e}; max |Δ imm_rates_preTP| "
          f"{dc['imm_rates_preTP_maxabs_diff']:.2e}.\n")
    if b and pt:
        cb, cp = b["convergence"], pt["convergence"]
        w("| baseline | RC/GDP 2026 (signed) | RC/GDP 2027 | RC/GDP 2028 | max abs RC/GDP, 2027…T−2 | Y 2026 | K 2026 | TPI distance |")
        w("|---|---|---|---|---|---|---|---|")
        for lab, r, c in (("stock pre-TP", b, cb), ("UK-consistent pre-TP", pt, cp)):
            w(f"| {lab} | {100 * c['rc_rel_Y_signed'][0]:+.4f}% | {100 * c['rc_rel_Y_signed'][1]:+.2e}% | "
              f"{100 * c['rc_rel_Y_signed'][2]:+.2e}% | {100 * c['rc_rel_Y_max_abs_interior']:.2e}% | "
              f"{arr(r, 'Y')[0]:.6f} | {arr(r, 'K')[0]:.6f} | {c['tpi_final_distance']:.2e} |")
        w("")

    w("## Environment (#18)\n")
    any_run = next(iter(runs.values()), None)
    if any_run:
        pv = any_run["provenance"]
        w("| item | value |")
        w("|---|---|")
        w(f"| Python | {pv['python']} (`{pv['python_executable'].replace(str(Path.home()), "~")}`) |")
        for pkg, v in pv["packages"].items():
            w(f"| {pkg} | {v} |")
        w(f"| oguk | {pv.get('oguk_version')} at git {pv['oguk_git_sha']} (editable checkout) |")
        w(f"| dask | {pv.get('dask')} |")
        w("| OG-Core patch | `patches/ogcore-0.17.0-firm-gamma-tv.diff` applied (checked by `_load_oguk`) |")
        srcs = {r["demographics"]["source"] for r in runs.values()}
        fb = sorted({r["demographics"]["un_api_fallbacks_to_github"] for r in runs.values()})
        w(f"| demographics source | {', '.join(sorted(srcs))} (UN-fallback messages per run: {fb}) |")
        hashes = {json.dumps(r["demographics"]["hash"], sort_keys=True) for r in runs.values()}
        w(f"| demographic inputs identical across runs | {'yes' if len(hashes) == 1 else 'NO'} "
          f"(sha256 of omega, omega_SS, omega_S_preTP, g_n, rho, imm_rates) |")
        w("| env | `DASK_DISTRIBUTED__SCHEDULER__WORKER_TTL=None`, `HF_HUB_DISABLE_SHARED_BLOBS=1`, "
          "`HF_TOKEN` from the saved HF login; empty `un_api_token.txt` in the cwd, stdin closed |")
    w("")
    return "\n".join(L)


if __name__ == "__main__":
    main()
