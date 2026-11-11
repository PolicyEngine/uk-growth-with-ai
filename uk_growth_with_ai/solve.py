"""The OG-UK runner: build specs, solve SS, solve TPI, record diagnostics.

ogcore and oguk are EXTERNAL dependencies and are imported lazily in
``_load_oguk`` so that ``report`` and ``obr`` work on a machine without them.
``TPI.ENFORCE_SOLUTION_CHECKS`` is set to False and the full-path diagnostics
recorded per arm take its place.  Note that ``ogcore.SS`` carries its OWN
``ENFORCE_SOLUTION_CHECKS`` constant, which the original script never touched,
so the committed run had the SS checks ON and only the TPI checks off.  The
import order is carried over from the original script unchanged; it is not
load-bearing.

Counterfactual wiring follows ``oguk.api.run_transition_path``: the baseline
writes its steady state into ``base_dir`` and every shocked arm inherits it via
``baseline=False, baseline_dir=base_dir``, so initial assets and debt are common
across arms (PR #15 review, finding C1).  Without this each arm would start from
its own initial state and the "gap vs baseline" would mix in a starting-point
difference.

The ramp arms set ``p.gamma`` to a path, which requires the firm.py patch in
patches/ogcore-0.17.0-firm-gamma-tv.diff; the step arms do not.
"""

from __future__ import annotations

import json
import os
import pickle
import platform
import subprocess
import tempfile
import time
from pathlib import Path

import numpy as np

from .calibrate import solve_scenario
from .data_access import load_committed_g_n
from .scenarios import EPS, G_BASE, G_Y_ANNUAL, NPER, RAMP_YEARS, SCENARIOS, START, TG1

# Demographics are the one input OG-UK fetches over the network at run time
# (oguk.api._build_specs -> demographics.get_pop_objs, a UN WPP call), so the
# published headline was not reproducible: the demographic input was a function
# of the date the run happened, not of anything committed.  "vendored" GUARDS
# the reported window: the live fetch's g_n[:NPER] must match
# data/g_n_committed_run.json, the path the committed run recorded, or the run
# stops.  It never overwrites the live values, because the population weights
# (omega, imm_rates, g_n_ss) come from the same fetch and were never recorded:
# splicing recorded g_n onto a drifted fetch would make the two inconsistent.
#
# "Live fetch" covers two sources.  ogcore.demographics.get_un_data calls the UN
# Data Portal API with the token in ./un_api_token.txt and, on any non-200
# reply, silently reads github.com/EAPD-DRB/Population-Data instead.  The
# committed run had an empty token file and its log shows the fallback message
# for every arm, so the recorded g_n came from the GitHub mirror.  A run with a
# valid token takes the API path, which has not been compared with the recorded
# values: if the two sources differ, the guard raises.
G_N_SOURCES = ("vendored", "live")
G_N_DEFAULT = "vendored"
# Absolute tolerance on g_n (a growth rate, so 1e-9 = 1e-7 pp): the live and
# recorded values should agree to floating-point noise if the UN data are the
# same; anything larger is a data vintage change.
G_N_DRIFT_TOL = 1e-9


class GNDriftError(RuntimeError):
    """The live UN fetch's g_n no longer matches the committed run's."""


def check_g_n_against_vendored(live_g_n, tol=G_N_DRIFT_TOL) -> np.ndarray:
    """Raise ``GNDriftError`` unless live g_n[:NPER] equals the vendored path.

    Returns the vendored values on success.  Never modifies ``live_g_n``.
    """
    vendored = load_committed_g_n(NPER)
    live = np.asarray(live_g_n, dtype=float).ravel()[:NPER]
    if live.shape != vendored.shape or not np.allclose(live, vendored, rtol=0, atol=tol):
        diff = (np.max(np.abs(live - vendored)) if live.shape == vendored.shape
                else float("nan"))
        raise GNDriftError(
            f"live g_n[:{NPER}] {np.round(live, 6).tolist()} differs from the "
            f"vendored committed-run path {np.round(vendored, 6).tolist()} "
            f"(max |diff| {diff:.3e} > {tol:g}).  The demographic input has "
            "changed since the committed run, so its numbers cannot be reproduced "
            "with this fetch.  Either the data were revised or the source "
            "differs: OG-Core reads the UN Data Portal API when ./un_api_token.txt "
            "holds a valid token and github.com/EAPD-DRB/Population-Data "
            "otherwise, and the committed run used the latter.  Re-run with "
            "--g-n live to accept the new input knowingly.")
    return vendored


# Written next to the caller by default: `run` must not clobber the committed,
# reviewed data/scenarios.json unless asked to (--out uk_growth_with_ai/data/scenarios.json).
DEFAULT_OUT = Path.cwd() / "results" / "scenarios.json"


def _load_oguk():
    """Import ogcore/oguk/dask on demand and return the handles we need."""
    from dask.distributed import Client, LocalCluster
    import ogcore.TPI as TPI

    TPI.ENFORCE_SOLUTION_CHECKS = False   # SS keeps its own flag, left at True
    from ogcore import SS
    import ogcore.firm as firm

    # The ramp arms need a time-varying gamma, which stock OG-Core lacks.
    if not hasattr(firm, "_tv"):
        raise RuntimeError(
            "ogcore.firm is unpatched: apply patches/ogcore-0.17.0-firm-gamma-tv.diff "
            "(see README, 'Time-varying gamma patch') before running the scenarios.")
    import oguk.api as api

    return TPI, SS, api, Client, LocalCluster


def provenance(TPI=None, api=None) -> dict:
    def ver(pkg):
        try:
            import importlib.metadata as m
            return m.version(pkg)
        except Exception:
            return None

    def sha(path):
        try:
            return subprocess.run(["git", "-C", path, "rev-parse", "HEAD"],
                                  capture_output=True, text=True).stdout.strip() or None
        except Exception:
            return None

    return {
        "utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "python": platform.python_version(),
        "packages": {p: ver(p) for p in
                     ("ogcore", "policyengine", "policyengine-uk", "numpy", "pandas")},
        "oguk_git_sha": sha(str(Path(api.__file__).resolve().parents[1])) if api else None,
        "enforce_solution_checks": TPI.ENFORCE_SOLUTION_CHECKS if TPI else None,
        "note": "ENFORCE_SOLUTION_CHECKS disabled; full RC and Euler diagnostics "
                "are recorded per arm below.",
    }


def diagnostics(tpi: dict, p) -> dict:
    """Full-path solver diagnostics, not just the first few periods."""
    rc = np.abs(np.asarray(tpi["resource_constraint_error"])).reshape(p.T, -1).max(1)
    out = {
        "rc_first5": rc[:NPER].tolist(),
        # t = 0 (2026) is a reported year, so the max covers it too; the interior
        # figure is kept for comparison with earlier runs.
        "rc_max": float(np.nanmax(rc[: p.T - 1])),
        "rc_max_interior": float(np.nanmax(rc[1:p.T - 1])),
        "rc_argmax_interior": int(np.nanargmax(rc[1:p.T - 1]) + 1),
        "rc_nonfinite_periods": int((~np.isfinite(rc)).sum()),
    }
    for key, label in (("euler_savings", "euler_savings"),
                       ("euler_labor_leisure", "euler_labour")):
        if key in tpi:
            a = np.abs(np.asarray(tpi[key]))
            out[f"{label}_max"] = float(np.nanmax(a))
    return out


def run_arm(name, gamma_val, ramp, z_terminal, base_dir, client, handles,
            baseline=False, alpha_G=None, tG1=TG1, g_y_annual=G_Y_ANNUAL,
            baseline_spending=False, g_n_source=G_N_DEFAULT) -> dict:
    """Solve SS and TPI for one arm.

    ``alpha_G``: G/Y along the transition. None (the baseline) sets it to the
    arm's own steady-state G/Y; shocked arms pass the baseline's so fiscal
    policy is common across arms (issue #2).

    ``g_n_source``: "vendored" (default) checks the live fetch's reported
    window against the committed run's recorded g_n and raises
    ``GNDriftError`` if they differ (``check_g_n_against_vendored``); it does
    not overwrite anything.  "live" skips the check.  Either way the solve uses
    the live fetch and is not network-free: only 5 periods of g_n were ever
    recorded, and omega, imm_rates and g_n_ss come from the same fetch and were
    never recorded (``data/g_n_committed_run.json`` -> ``_limitations``).

    ``baseline_spending`` (shocked arms only): hold government spending and
    transfers at the baseline's LEVELS instead of its G/Y share, the OBR
    convention of fixed spending plans; debt absorbs the difference.
    """
    TPI, SS, api, _, _ = handles
    t0 = time.time()
    out_dir = base_dir if baseline else tempfile.mkdtemp()
    for sub in ("SS", "TPI"):
        os.makedirs(os.path.join(out_dir, sub), exist_ok=True)
    print(f"\n=== {name} ===", flush=True)
    # baseline_dir=base_dir with baseline=False is what makes the shocked arms
    # inherit the baseline's initial assets and debt.
    if g_n_source not in G_N_SOURCES:
        raise ValueError(f"g_n_source must be one of {G_N_SOURCES}")
    p = api._build_specs(START, None, out_dir, base_dir, baseline=baseline,
                         age_specific="pooled", multi_sector=False,
                         param_overrides={"epsilon": [EPS], "gamma": [gamma_val],
                                          "tG1": tG1, "g_y_annual": g_y_annual})
    if g_n_source == "vendored":
        # Guard, don't overwrite: the live reported window must match what the
        # committed run recorded.  The tail is not checked (never recorded):
        # OG-Core lands the population path on its steady state (TPI uses
        # p.g_n[:T-1] then p.g_n_ss, SS uses p.g_n_ss -- ogcore/aggregates.py:90,
        # 157), and g_n_ss was never recorded either.
        check_g_n_against_vendored(p.g_n)
        print(f"  g_n: first {NPER} periods of the live UN fetch MATCH the "
              "vendored data/g_n_committed_run.json; the tail, g_n_ss, omega and "
              "imm_rates are unchecked (never recorded), so the solve is not "
              "network-free.", flush=True)
    else:
        print("  g_n: LIVE UN fetch throughout -- not reproducible", flush=True)
    p.TPI_outer_method = "anderson"
    if baseline_spending and not baseline:
        p.baseline_spending = True   # reads G, TR, I_g from base_dir's TPI output
    T = p.T + p.S
    up = np.minimum(np.arange(T) / RAMP_YEARS, 1.0)[:, None]
    if z_terminal is not None:
        # Z must be paired with the SHAPE of the gamma path.  Before this fix the
        # Z block sat outside `if ramp`, so a step arm (gamma already stepped to
        # its terminal value by param_overrides) ran with Z = 1.0 at t = 0: the
        # pure-gamma output gain was left un-offset and the arm reported the
        # +6.06% units wedge instead of its calibrated target.  Committed results
        # are ramp-only so no published number moves, but `run_scenarios`'
        # default is shapes="both" (the CLI's is "ramp"), so any step run was
        # wrong and nothing caught it (.audit/02-code-correctness.md section 1).
        if ramp:
            # time-varying gamma: needs patches/ogcore-0.17.0-firm-gamma-tv.diff
            p.gamma = G_BASE + up * (gamma_val - G_BASE)
            p.Z = 1.0 + up * (z_terminal - 1.0)
            print(f"  gamma ramps {G_BASE} -> {gamma_val}", flush=True)
            print(f"  Z ramps 1.0 -> {z_terminal:.6f}", flush=True)
        else:
            # stepped gamma: Z steps with it, from t = 0.
            p.Z = np.full_like(up, z_terminal)
            print(f"  gamma steps to {gamma_val} (param_overrides), "
                  f"Z steps to {z_terminal:.6f}", flush=True)
    elif ramp:
        p.gamma = G_BASE + up * (gamma_val - G_BASE)
        print(f"  gamma ramps {G_BASE} -> {gamma_val}", flush=True)
    print(f"  baseline={baseline}, initial state "
          f"{'own' if baseline else 'INHERITED from baseline'}", flush=True)
    ss = SS.run_SS(p, client=client)
    with open(os.path.join(out_dir, "SS", "SS_vars.pkl"), "wb") as f:
        pickle.dump(ss, f)
    if alpha_G is None:
        alpha_G = float(ss["G"] / ss["Y"])
    p.alpha_G = np.full(p.T + p.S, alpha_G)
    print(f"  alpha_G = {alpha_G:.4f} ({'own SS' if baseline else 'baseline'}), "
          f"tG1 = {p.tG1}, g_y_annual = {g_y_annual}", flush=True)
    TPI.run_TPI(p, client=client)
    with open(os.path.join(out_dir, "TPI", "TPI_vars.pkl"), "rb") as f:
        tpi = pickle.load(f)
    rec = {
        "g_n_source": g_n_source,
        "g_n_tail": "live",   # only g_n[:NPER] is checked against the vendored path
        "gamma_terminal": gamma_val, "gamma_shape": "ramp" if ramp else "step",
        "Z_terminal": z_terminal, "elapsed_min": (time.time() - t0) / 60,
        "ss_labour_share": float(ss["w"] * ss["L"] / ss["Y"]),
        "g_n_used": np.asarray(p.g_n)[:NPER].tolist(),
        "g_y_annual_used": float(p.g_y_annual) if np.ndim(p.g_y_annual) == 0
        else float(np.asarray(p.g_y_annual).ravel()[0]),
        "alpha_G_used": alpha_G, "tG1_used": int(p.tG1),
        "baseline_spending": bool(p.baseline_spending),
        "diagnostics": diagnostics(tpi, p),
        **{v: np.asarray(tpi[v])[:NPER].tolist()
           for v in ("Y", "K", "L", "w", "r", "C", "I", "G", "D", "total_tax_revenue")
           if v in tpi},
    }
    print(f"OK {rec['elapsed_min']:.1f} min | SS labour share "
          f"{rec['ss_labour_share']:.4f} | RC interior max "
          f"{rec['diagnostics']['rc_max_interior']:.2e}", flush=True)
    return rec


def run_scenarios(only=None, shapes="both", out=DEFAULT_OUT, baseline_only=False,
                  tG1=TG1, g_y_annual=G_Y_ANNUAL, baseline_spending=False,
                  g_n_source=G_N_DEFAULT) -> dict:
    """Run the baseline plus the requested shocked arms, writing ``out`` as it goes."""
    handles = _load_oguk()
    TPI, SS, api, Client, LocalCluster = handles
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)

    cluster = LocalCluster(processes=False, n_workers=1, threads_per_worker=4,
                           dashboard_address=None)
    client = Client(cluster)
    base_dir = tempfile.mkdtemp()
    for sub in ("SS", "TPI"):
        os.makedirs(os.path.join(base_dir, sub), exist_ok=True)

    res = {"provenance": provenance(TPI, api)}
    settings = {"tG1": tG1, "g_y_annual": g_y_annual, "g_n_source": g_n_source}
    res["baseline"] = run_arm("baseline", G_BASE, False, None, base_dir, client,
                              handles, baseline=True, **settings)
    out.write_text(json.dumps(res, indent=1))
    alpha_G = res["baseline"]["alpha_G_used"]
    K0, L0 = res["baseline"]["K"][0], res["baseline"]["L"][0]

    # Z is SOLVED jointly with gamma, never assumed: see calibrate.
    cal = {n: solve_scenario(s, K0, L0, G_BASE) for n, s in SCENARIOS.items()}
    g_ai = cal["share_shift_tfp"]["gamma"]
    gonly = cal["share_shift_tfp"]["gamma_only_output_gain"]

    print(f"\ngamma for a {SCENARIOS['share_shift_tfp'].labour_share_fall_pp}pp "
          f"labour-share fall: {g_ai:.4f}"
          f"\ngamma-only output gain at baseline inputs: {gonly*100:+.4f}%"
          f"\n  Z solved, share_shift_tfp (+3.1% joint)  : {cal['share_shift_tfp']['Z']:.6f}"
          f"\n  Z solved, share_shift (zero tech wedge)  : {cal['share_shift']['Z']:.6f}", flush=True)

    if baseline_only:
        res["assumptions"] = {"Z_share_shift_tfp": cal["share_shift_tfp"]["Z"],
                              "Z_share_shift": cal["share_shift"]["Z"],
                              "gamma_only_output_gain": gonly, **settings}
        out.write_text(json.dumps(res, indent=1))
        print("\nBASELINE ONLY: stopping before the shocked arms", flush=True)
        return res

    ramps = [False, True] if shapes == "both" else [shapes == "ramp"]
    plan = [n for n in ("share_shift_tfp", "share_shift") if only in (None, n)]
    for scen in plan:
        for ramp in ramps:
            key = f"{scen}_{'ramp' if ramp else 'step'}"
            try:
                res[key] = run_arm(key, cal[scen]["gamma"], ramp, cal[scen]["Z"],
                                   base_dir, client, handles, alpha_G=alpha_G,
                                   baseline_spending=baseline_spending, **settings)
            except Exception as e:
                res[key] = {"error": f"{type(e).__name__}: {e}"}
                print(f"FAILED {type(e).__name__}: {e}", flush=True)
            out.write_text(json.dumps(res, indent=1))

    res["assumptions"] = {
        "epsilon": EPS, "gamma_base": G_BASE, "gamma_shocked": g_ai,
        "gamma_only_output_gain": gonly,
        "Z_share_shift_tfp": cal["share_shift_tfp"]["Z"], "Z_share_shift": cal["share_shift"]["Z"],
        "share_shift_tfp_target": SCENARIOS["share_shift_tfp"].target,
        "share_shift_target": SCENARIOS["share_shift"].target,
        "counterfactual": "shocked arms inherit baseline initial assets and debt",
        "fiscal": ("shocked arms hold G and TR at the baseline's levels (baseline_spending)"
                   if baseline_spending else "every arm uses the baseline's alpha_G"),
        **settings,
    }
    out.write_text(json.dumps(res, indent=1))
    print("\nDONE", flush=True)
    return res
