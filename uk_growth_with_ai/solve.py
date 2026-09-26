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
from .scenarios import EPS, G_BASE, G_Y_ANNUAL, NPER, RAMP_YEARS, SCENARIOS, START, TG1


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
            baseline_spending=False) -> dict:
    """Solve SS and TPI for one arm.

    ``alpha_G``: G/Y along the transition. None (the baseline) sets it to the
    arm's own steady-state G/Y; shocked arms pass the baseline's so fiscal
    policy is common across arms (issue #2).

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
    p = api._build_specs(START, None, out_dir, base_dir, baseline=baseline,
                         age_specific="pooled", multi_sector=False,
                         param_overrides={"epsilon": [EPS], "gamma": [gamma_val],
                                          "tG1": tG1, "g_y_annual": g_y_annual})
    p.TPI_outer_method = "anderson"
    if baseline_spending and not baseline:
        p.baseline_spending = True   # reads G, TR, I_g from base_dir's TPI output
    T = p.T + p.S
    up = np.minimum(np.arange(T) / RAMP_YEARS, 1.0)[:, None]
    if ramp:
        # time-varying gamma: needs patches/ogcore-0.17.0-firm-gamma-tv.diff
        p.gamma = G_BASE + up * (gamma_val - G_BASE)
        print(f"  gamma ramps {G_BASE} -> {gamma_val}", flush=True)
    if z_terminal is not None:
        p.Z = 1.0 + up * (z_terminal - 1.0)
        print(f"  Z ramps 1.0 -> {z_terminal:.6f}", flush=True)
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
                  tG1=TG1, g_y_annual=G_Y_ANNUAL, baseline_spending=False) -> dict:
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
    settings = {"tG1": tG1, "g_y_annual": g_y_annual}
    res["baseline"] = run_arm("baseline", G_BASE, False, None, base_dir, client,
                              handles, baseline=True, **settings)
    out.write_text(json.dumps(res, indent=1))
    alpha_G = res["baseline"]["alpha_G_used"]
    K0, L0 = res["baseline"]["K"][0], res["baseline"]["L"][0]

    # Z is SOLVED jointly with gamma, never assumed: see calibrate.
    cal = {n: solve_scenario(s, K0, L0, G_BASE) for n, s in SCENARIOS.items()}
    g_ai = cal["anthropic"]["gamma"]
    gonly = cal["anthropic"]["gamma_only_output_gain"]

    print(f"\ngamma for a {SCENARIOS['anthropic'].labour_share_fall_pp}pp "
          f"labour-share fall: {g_ai:.4f}"
          f"\ngamma-only output gain at baseline inputs: {gonly*100:+.4f}%"
          f"\n  Z solved, anthropic (+3.1% joint) : {cal['anthropic']['Z']:.6f}"
          f"\n  Z solved, obr (GDP level unchanged): {cal['obr']['Z']:.6f}", flush=True)

    if baseline_only:
        res["assumptions"] = {"Z_anthropic": cal["anthropic"]["Z"], "Z_obr": cal["obr"]["Z"],
                              "gamma_only_output_gain": gonly, **settings}
        out.write_text(json.dumps(res, indent=1))
        print("\nBASELINE ONLY: stopping before the shocked arms", flush=True)
        return res

    ramps = [False, True] if shapes == "both" else [shapes == "ramp"]
    plan = [n for n in ("anthropic", "obr") if only in (None, n)]
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
        "Z_anthropic": cal["anthropic"]["Z"], "Z_obr": cal["obr"]["Z"],
        "anthropic_target": SCENARIOS["anthropic"].target,
        "obr_target": SCENARIOS["obr"].target,
        "counterfactual": "shocked arms inherit baseline initial assets and debt",
        "fiscal": ("shocked arms hold G and TR at the baseline's levels (baseline_spending)"
                   if baseline_spending else "every arm uses the baseline's alpha_G"),
        **settings,
    }
    out.write_text(json.dumps(res, indent=1))
    print("\nDONE", flush=True)
    return res
