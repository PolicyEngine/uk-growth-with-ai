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

import contextlib
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
from .scenarios import EPS, G_BASE, G_Y_ANNUAL, NPER, SCENARIOS, START, TG1

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
# reply, reads github.com/EAPD-DRB/Population-Data instead: it prints a line
# and does not raise.  The committed run had an empty token file and its log
# shows the fallback message for every arm, so the recorded g_n came from the
# GitHub mirror.  A run with a valid token takes the API path, which has not
# been compared with the recorded values: if the two sources differ, the guard
# raises.
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


# Series exported per arm (R1-R4, #27).  The first NPER years sit at the top
# level of each arm record (what `check`, `report` and the dashboard read); the
# first NEXP years of every series are under "series" for the audit.
NEXP = 10
EXPORT = ("Y", "B", "K", "K_d", "K_f", "D", "D_d", "D_f", "r", "r_p", "r_gov",
          "w", "L", "C", "I", "I_total", "I_d", "G", "TR", "I_g",
          "agg_pension_outlays", "new_borrowing_f", "debt_service_f",
          "total_tax_revenue", "BQ")
TOP_LEVEL = ("Y", "K", "L", "w", "r", "C", "I", "G", "D", "total_tax_revenue",
             "B", "K_d", "K_f", "D_d", "D_f", "r_p", "r_gov")
# The OG-UK data window: demographic data to 2028, projected after
# (``ogcore.demographics.get_pop_objs``'s final_data_year = START + 2), so the
# first projected transition is period FINAL_DATA_YEAR - START - 1 (2027->28).
FINAL_DATA_YEAR = START + 2


def _agg(tpi, v, T):
    return np.asarray(tpi[v], dtype=float).reshape(T, -1).sum(1)


def diagnostics(tpi: dict, p, dist_history=None) -> dict:
    """Full-path solver diagnostics, not just the first few periods.

    ``rc_first5`` keeps the absolute values earlier files carry (``check`` reads
    them); ``rc_rel_Y_signed`` is the SIGNED error / GDP for every period (#15).
    """
    rc_signed = np.asarray(tpi["resource_constraint_error"], dtype=float
                           ).reshape(p.T, -1).sum(1)
    rc = np.abs(rc_signed)
    Y = _agg(tpi, "Y", p.T)
    out = {
        "rc_first5": rc[:NPER].tolist(),
        # t = 0 (2026) is a reported year, so the max covers it too; the interior
        # figure is kept for comparison with earlier runs.
        "rc_max": float(np.nanmax(rc[: p.T - 1])),
        "rc_max_interior": float(np.nanmax(rc[1:p.T - 1])),
        "rc_argmax_interior": int(np.nanargmax(rc[1:p.T - 1]) + 1),
        "rc_nonfinite_periods": int((~np.isfinite(rc)).sum()),
        "rc_rel_Y_signed": (rc_signed / Y).tolist(),
        "rc_rel_Y_max_abs_interior": float(np.nanmax(np.abs(rc_signed / Y)[1:p.T - 1])),
    }
    for key, label in (("euler_savings", "euler_savings"),
                       ("euler_labor_leisure", "euler_labour")):
        if key in tpi:
            a = np.abs(np.asarray(tpi[key]))
            out[f"{label}_max"] = float(np.nanmax(a))
    if dist_history is not None:
        d = np.asarray(dist_history, dtype=float)
        out["tpi_distance_history"] = d.tolist()
        out["tpi_iterations"] = int(d.size)
        out["tpi_final_distance"] = float(d[-1]) if d.size else None
        out["mindist_TPI"] = float(p.mindist_TPI)
        out["tpi_converged"] = bool(d.size and d[-1] < p.mindist_TPI and d.size < p.maxiter)
    return out


class _TPILog:
    """Collect the 'Distance: x' lines ogcore.TPI logs each outer iteration.

    ``ENFORCE_SOLUTION_CHECKS = False`` also switches off OG-Core's own
    non-convergence error, so the distance history is the convergence record.
    """

    def __init__(self):
        import logging
        import re

        self.dist = []
        outer = self

        class H(logging.Handler):
            def emit(self, record):
                m = re.match(r"Distance: (\S+)", record.getMessage())
                if m:
                    outer.dist.append(float(m.group(1)))

        self.handler = H(logging.INFO)
        self.logger = logging.getLogger("ogcore.TPI")

    def __enter__(self):
        import logging
        self.logger.setLevel(logging.INFO)
        self.logger.addHandler(self.handler)
        return self

    def __exit__(self, *exc):
        self.logger.removeHandler(self.handler)


def _capture_pop_objs():
    """Wrap ogcore.demographics.get_pop_objs so the UK fetch can be read back."""
    from ogcore import demographics
    captured = {}
    orig = getattr(demographics.get_pop_objs, "__wrapped__", demographics.get_pop_objs)

    def wrapper(*a, **k):
        d = orig(*a, **k)
        captured.clear()
        captured.update(d)
        return d

    wrapper.__wrapped__ = orig
    demographics.get_pop_objs = wrapper
    return captured


def run_arm(name, gamma_val, ramp, z_terminal, base_dir, client, handles,
            baseline=False, alpha_G=None, tG1=TG1, g_y_annual=G_Y_ANNUAL,
            baseline_spending=False, g_n_source=G_N_DEFAULT, zeta_K=None,
            pretp=False, splice=False, alpha_G_shift=0.0, out_dir=None,
            surprise=None, nexp=None) -> dict:
    """Solve SS and TPI for one arm.

    ``alpha_G``: G/Y along the transition before tG1. None (the baseline) sets
    it to the arm's own steady-state G/Y plus ``alpha_G_shift``; shocked arms
    pass the baseline's so fiscal policy is common across arms (issue #2).
    ``alpha_G_shift`` is the R1 calibration (#32): the steady-state share
    stabilises debt for the steady-state economy, not for 2026-30, so the
    baseline window share is moved by this many units of G/Y.  It applies to
    t < tG1 only; from tG1 the debt rule sets G, and the steady state is
    untouched (``budget_balance`` is off, so the SS never reads alpha_G).

    ``zeta_K``: OG-Core's share of excess capital demand met from abroad
    (R3, #16).  None leaves OG-UK's default (0.1).  zeta_D and the world rate
    are never overridden; they are recorded.

    ``pretp`` / ``splice``: the two demographic corrections in ``demography``
    (R2, #15).  They are applied after the g_n guard and change neither omega
    nor g_n.

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

    ``surprise``: a ``surprise.baseline_state`` dict.  The specification is
    built for START as usual (same guard and R2 fixes), then shifted so model
    period 0 is START + k, and the TPI starts from the baseline's period-k
    state (``surprise.apply_to_specs`` / ``surprise.initial_state``).  The
    gamma/Z ramp is offset so its zero-weight year is START + k - 1.
    ``nexp``: years of each series to export (default NEXP).
    """
    from . import demography

    TPI, SS, api, _, _ = handles
    t0 = time.time()
    if out_dir is None:
        out_dir = base_dir if baseline else tempfile.mkdtemp()
    for sub in ("SS", "TPI"):
        os.makedirs(os.path.join(out_dir, sub), exist_ok=True)
    print(f"\n=== {name} ===", flush=True)
    if g_n_source not in G_N_SOURCES:
        raise ValueError(f"g_n_source must be one of {G_N_SOURCES}")
    captured = _capture_pop_objs() if pretp else {}
    overrides = {"epsilon": [EPS], "gamma": [gamma_val], "tG1": tG1,
                 "g_y_annual": g_y_annual}
    if zeta_K is not None:
        overrides["zeta_K"] = [zeta_K]
    # baseline_dir=base_dir with baseline=False is what makes the shocked arms
    # inherit the baseline's initial assets and debt.
    p = api._build_specs(START, None, out_dir, base_dir, baseline=baseline,
                         age_specific="pooled", multi_sector=False,
                         param_overrides=overrides)
    if zeta_K is not None and not np.allclose(np.asarray(p.zeta_K, dtype=float), zeta_K):
        raise RuntimeError(f"zeta_K override did not take: {p.zeta_K}")
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
    has_demo = hasattr(p, "omega")   # False only for the test stubs
    demo = {"law_of_motion_as_built": demography.law_of_motion(p)} if has_demo else {}
    if pretp:
        demo["pretp"] = demography.apply_pretp(p, captured)
        print("  R2: pre-TP g_n/rho/imm_rates set from the UK fetch", flush=True)
    if splice:
        demo["splice"] = demography.apply_splice(p, FINAL_DATA_YEAR - START - 1)
        print(f"  R2: data splice {demo['splice']['transition']} repaired "
              f"({demo['splice']['residual_before']:.2e} -> "
              f"{demo['splice']['residual_after']:.2e})", flush=True)
    if has_demo:
        demo["law_of_motion_solved"] = demography.law_of_motion(p)
        demo["hash"] = demography.hashes(p)
        demo["g_n_ss"] = float(p.g_n_ss)
    sp_rec = None
    if surprise is not None:
        from . import surprise as sp
        sp_rec = {"shift": sp.apply_to_specs(p, surprise), "initial_state": {}}
        if has_demo:
            lom = demography.law_of_motion(p)
            sp_rec["law_of_motion_after_shift"] = lom
            worst = max(x["max_abs_rel"] for x in lom)
            if splice and worst > demography.LOM_TOL:
                raise RuntimeError(f"shifted demographics break the law of motion "
                                   f"({worst:.2e}): {lom}")
        print(f"  SURPRISE: period 0 is now {START + surprise['k']}; shifted "
              f"{len(sp_rec['shift']['shifted_varying'])} time-varying inputs; tG1 "
              f"{sp_rec['shift']['tG1']}; foreign debt share "
              f"{surprise['initial_foreign_debt_ratio']:.4f}", flush=True)
    p.TPI_outer_method = "anderson"
    if baseline_spending and not baseline:
        p.baseline_spending = True   # reads G, TR, I_g from base_dir's TPI output
    T = p.T + p.S
    from .surprise import ramp_weights
    up = ramp_weights(T, surprise["k"] - 1 if surprise is not None else 0)
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
    alpha_G_ss = float(ss["G"] / ss["Y"])
    if alpha_G is None:
        alpha_G = alpha_G_ss + alpha_G_shift
    p.alpha_G = np.full(p.T + p.S, alpha_G)
    print(f"  alpha_G = {alpha_G:.6f} ({'own SS' if baseline else 'baseline'}"
          f"{f' {alpha_G_shift:+.6f}' if baseline and alpha_G_shift else ''}), "
          f"tG1 = {p.tG1}, g_y_annual = {g_y_annual}, zeta_K = "
          f"{float(np.asarray(p.zeta_K).ravel()[0])}", flush=True)
    if surprise is not None:
        init_ctx = sp.initial_state(TPI, surprise, sp_rec["initial_state"])
    else:
        init_ctx = contextlib.nullcontext()
    with _TPILog() as tlog, init_ctx:
        TPI.run_TPI(p, client=client)
    with open(os.path.join(out_dir, "TPI", "TPI_vars.pkl"), "rb") as f:
        tpi = pickle.load(f)
    nexp = NEXP if nexp is None else nexp
    series = {v: _agg(tpi, v, p.T)[:nexp].tolist() for v in EXPORT if v in tpi}
    s = {k: np.asarray(v) for k, v in series.items()}
    # GNI: GDP less the return paid to foreign owners of UK capital and gilts, at
    # the rate OG-Core itself charges them in the resource constraint (r_p).
    if all(k in s for k in ("Y", "r_p", "K_f", "D_f")):
        series["GNI"] = (s["Y"] - s["r_p"] * s["K_f"] - s["r_p"] * s["D_f"]).tolist()
    ident = {}
    if all(k in s for k in ("K", "K_d", "K_f", "B", "D", "D_d", "D_f")):
        ident = {
            "K_eq_Kd_plus_Kf": float(np.abs(s["K"] - s["K_d"] - s["K_f"]).max()),
            "Kd_eq_B_minus_Dd": float(np.abs(s["K_d"] - (s["B"] - s["D_d"])).max()),
            "D_eq_Dd_plus_Df": float(np.abs(s["D"] - s["D_d"] - s["D_f"]).max()),
        }
    first = lambda v: float(np.asarray(v).ravel()[0])
    rec = {
        "g_n_source": g_n_source,
        "g_n_tail": "live",   # only g_n[:NPER] is checked against the vendored path
        "gamma_terminal": gamma_val, "gamma_shape": "ramp" if ramp else "step",
        "Z_terminal": z_terminal, "elapsed_min": (time.time() - t0) / 60,
        "ss_labour_share": float(ss["w"] * ss["L"] / ss["Y"]),
        "g_n_used": np.asarray(p.g_n)[:NPER].tolist(),
        "g_y_annual_used": float(p.g_y_annual) if np.ndim(p.g_y_annual) == 0
        else float(np.asarray(p.g_y_annual).ravel()[0]),
        "alpha_G_used": alpha_G, "alpha_G_ss": alpha_G_ss,
        "alpha_G_shift": alpha_G - alpha_G_ss if baseline else None,
        "tG1_used": int(p.tG1),
        "baseline_spending": bool(p.baseline_spending),
        "closure": {"zeta_K": first(p.zeta_K), "zeta_D": first(p.zeta_D),
                    "world_int_rate_annual": first(p.world_int_rate_annual),
                    "initial_foreign_debt_ratio": float(p.initial_foreign_debt_ratio),
                    "initial_debt_ratio": float(p.initial_debt_ratio)},
        "demographics": {"pretp": bool(pretp), "splice": bool(splice), **demo},
        "diagnostics": diagnostics(tpi, p, tlog.dist),
        "identities_maxabs": ident,
        "ss": {k: float(np.asarray(ss[k]).sum()) for k in
               ("Y", "K", "K_d", "K_f", "B", "D", "D_d", "D_f", "r", "r_p", "w", "L",
                "C", "G", "TR", "total_tax_revenue", "agg_pension_outlays")
               if k in ss},
        "years": list(range(START, START + NEXP)),
        "surprise": sp_rec,
        "series": series,
        **{v: series[v][:NPER] for v in TOP_LEVEL if v in series},
        **({"GNI": series["GNI"][:NPER]} if "GNI" in series else {}),
    }
    d = rec["diagnostics"]
    print(f"OK {rec['elapsed_min']:.1f} min | SS labour share "
          f"{rec['ss_labour_share']:.4f} | RC/Y 2026 {d['rc_rel_Y_signed'][0]:+.4%} | "
          f"RC interior max {d['rc_max_interior']:.2e} | TPI dist "
          f"{d.get('tpi_final_distance')} in {d.get('tpi_iterations')} its", flush=True)
    return rec


def run_scenarios(only=None, shapes="both", out=DEFAULT_OUT, baseline_only=False,
                  tG1=TG1, g_y_annual=G_Y_ANNUAL, baseline_spending=False,
                  g_n_source=G_N_DEFAULT, zeta_K=None, pretp=False, splice=False,
                  alpha_G_shift=0.0, z_share_shift=None) -> dict:
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

    ramps = [False, True] if shapes == "both" else [shapes == "ramp"]
    plan = [n for n in ("share_shift_tfp", "share_shift") if only in (None, n)]
    requested = [] if baseline_only else [
        f"{scen}_{'ramp' if ramp else 'step'}" for scen in plan for ramp in ramps]
    # `check` requires every requested arm and fails any arm whose status is
    # not "ok" (issue #17); an arm still "pending" means the run stopped early.
    res = {"provenance": provenance(TPI, api), "arms_requested": requested,
           "arm_status": {a: "pending" for a in requested}}
    settings = {"tG1": tG1, "g_y_annual": g_y_annual, "g_n_source": g_n_source,
                "zeta_K": zeta_K, "pretp": pretp, "splice": splice}
    res["baseline"] = run_arm("baseline", G_BASE, False, None, base_dir, client,
                              handles, baseline=True, alpha_G_shift=alpha_G_shift,
                              **settings)
    out.write_text(json.dumps(res, indent=1))
    alpha_G = res["baseline"]["alpha_G_used"]
    K0, L0 = res["baseline"]["K"][0], res["baseline"]["L"][0]

    # Z is SOLVED jointly with gamma, never assumed: see calibrate.
    cal = {n: solve_scenario(s, K0, L0, G_BASE) for n, s in SCENARIOS.items()}
    if z_share_shift is not None:
        # R4 (#8): a Z solved elsewhere (``rerun``) against the equilibrium GDP
        # gap replaces the fixed-input one.
        cal["share_shift"]["Z_fixed_input"] = cal["share_shift"]["Z"]
        cal["share_shift"]["Z"] = float(z_share_shift)
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

    for scen in plan:
        for ramp in ramps:
            key = f"{scen}_{'ramp' if ramp else 'step'}"
            try:
                res[key] = run_arm(key, cal[scen]["gamma"], ramp, cal[scen]["Z"],
                                   base_dir, client, handles, alpha_G=alpha_G,
                                   baseline_spending=baseline_spending, **settings)
                res["arm_status"][key] = "ok"
            except Exception as e:
                res[key] = {"error": f"{type(e).__name__}: {e}"}
                res["arm_status"][key] = "failed"
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
