"""One diagnostic solve for the capital-closure and period-0 demographics study.

Issues #16 (closure / GNI), #15 (2026 resource-constraint residual) and #18
(environment).  Each invocation solves ONE arm and writes ONE JSON file to
``analysis/closure/output/<label>.json`` so that a stopped session loses at most
the solve in progress.  ``driver.sh`` runs the plan sequentially, skips finished
solves, and commits + pushes after each one.

What differs from ``uk_growth_with_ai.solve.run_arm`` (which this mirrors):

* ``--zeta-K`` overrides OG-UK's ``zeta_K`` (default 0.1).  Nothing else in the
  capital account changes: ``zeta_D = 0.4`` and ``world_int_rate_annual = 0.02``
  stay at the OG-UK defaults, so ``zeta_K = 0`` is closed on PRIVATE capital
  only; foreigners still take 40% of new government debt.
* Each closure has its own baseline directory; the ramp arms of that closure
  inherit its steady state and initial assets (as in ``solve.run_scenarios``).
* Z is re-solved per closure against that closure's baseline period-0 K and L,
  exactly as ``solve.run_scenarios`` does, so every closure carries the same
  technology target (+3.1% / GDP-level-unchanged at fixed inputs).
* ``--pretp`` passes OG-UK-consistent ``g_n_preTP``, ``rho_preTP`` and
  ``imm_rates_preTP`` (from the same ``get_pop_objs`` call that supplies
  ``omega``/``g_n``/``rho``/``imm_rates``).  OG-UK's ``_build_specs`` drops them,
  so stock runs use OG-Core's shipped defaults for period 0.  The patch lives
  in this process only: OG-UK and OG-Core are not edited.
* Exports B, K, K_d, K_f, D, D_d, D_f, r, r_p, r_gov, Y, C, I, ... for the first
  NEXP years, the signed resource-constraint error for every period, and the
  TPI distance history (parsed from the ``ogcore.TPI`` logger, because
  ``ENFORCE_SOLUTION_CHECKS = False`` means a non-converged path returns
  normally).

Run with the OG-UK venv (ogcore 0.17.0 + the firm-gamma patch), from a
directory that holds an EMPTY ``un_api_token.txt`` and with stdin closed.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import logging
import os
import pickle
import re
import sys
import time
from pathlib import Path

# Environment fixes from issue #18, set before dask / huggingface_hub import.
os.environ.setdefault("DASK_DISTRIBUTED__SCHEDULER__WORKER_TTL", "None")
os.environ.setdefault("HF_HUB_DISABLE_SHARED_BLOBS", "1")

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

import numpy as np  # noqa: E402

import uk_growth_with_ai  # noqa: E402

assert Path(uk_growth_with_ai.__file__).resolve().is_relative_to(REPO), (
    f"uk_growth_with_ai imported from {uk_growth_with_ai.__file__}, not {REPO}")

from uk_growth_with_ai.calibrate import solve_scenario  # noqa: E402
from uk_growth_with_ai.scenarios import (  # noqa: E402
    EPS, G_BASE, G_Y_ANNUAL, RAMP_YEARS, SCENARIOS, START, TG1)
from uk_growth_with_ai.solve import _load_oguk, provenance  # noqa: E402

OUT_DIR = REPO / "analysis" / "closure" / "output"
NEXP = 10   # years exported (2026-2035); the study reports 2026-2030
EXPORT = ("Y", "B", "K", "K_d", "K_f", "D", "D_d", "D_f", "r", "r_p", "r_gov",
          "w", "L", "C", "I", "I_total", "I_d", "G", "TR", "new_borrowing_f",
          "debt_service_f", "total_tax_revenue", "BQ")


def _hf_token_into_env():
    """Use the machine's saved HF login (never printed)."""
    if os.environ.get("HF_TOKEN") and os.environ.get("HUGGING_FACE_TOKEN"):
        return
    from huggingface_hub import get_token
    tok = get_token()
    if tok:
        os.environ.setdefault("HF_TOKEN", tok)
        os.environ.setdefault("HUGGING_FACE_TOKEN", tok)


class _Tee(io.TextIOBase):
    """Copy stdout and count the OG-Core 'UN API failed' fallback messages."""

    def __init__(self, inner):
        self.inner, self.un_fallbacks, self._buf = inner, 0, ""

    def write(self, s):
        self._buf += s
        while "\n" in self._buf:
            line, self._buf = self._buf.split("\n", 1)
            if "Failed to retrieve population data from UN" in line:
                self.un_fallbacks += 1
        return self.inner.write(s)

    def flush(self):
        self.inner.flush()


class _TPILog(logging.Handler):
    """Collect the 'Iteration: n' / 'Distance: x' lines TPI logs each outer step."""

    def __init__(self):
        super().__init__(logging.INFO)
        self.iters, self.dist = [], []

    def emit(self, record):
        msg = record.getMessage()
        m = re.match(r"Iteration: (\d+)", msg)
        if m:
            self.iters.append(int(m.group(1)))
        m = re.match(r"Distance: (\S+)", msg)
        if m:
            self.dist.append(float(m.group(1)))


def _h(a) -> str:
    return hashlib.sha256(np.ascontiguousarray(np.asarray(a, dtype=float)).tobytes()
                          ).hexdigest()[:16]


def _js(x):
    if isinstance(x, dict):
        return {k: _js(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [_js(v) for v in x]
    if isinstance(x, np.ndarray):
        return _js(x.tolist())
    if isinstance(x, (np.floating,)):
        return float(x)
    if isinstance(x, (np.integer,)):
        return int(x)
    return x


def pretp_law_of_motion(omega_pre, rho_pre, imm_pre, g_n_pre, omega0):
    """Relative residual of the pre-period -> period-0 population law of motion.

    OG-Core's stationarised transition (demographics.py) is
        omega_0[s+1] (1 + g_n_preTP) = (1 - rho_pre[s]) omega_pre[s]
                                       + imm_pre[s+1] omega_pre[s+1].
    Returned per age s+1 as (lhs - rhs) / lhs.
    """
    lhs = omega0[1:] * (1.0 + g_n_pre)
    rhs = (1.0 - rho_pre[:-1]) * omega_pre[:-1] + imm_pre[1:] * omega_pre[1:]
    return (lhs - rhs) / lhs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", required=True)
    ap.add_argument("--arm", required=True,
                    choices=("baseline", "anthropic_ramp", "obr_ramp"))
    ap.add_argument("--zeta-K", type=float, default=0.1)
    ap.add_argument("--pretp", action="store_true")
    ap.add_argument("--base-dir", required=True,
                    help="the closure's baseline directory (SS/ and TPI/ pickles)")
    ap.add_argument("--baseline-json",
                    help="the closure's baseline result (ramp arms: alpha_G, K0, L0)")
    a = ap.parse_args()

    tee = _Tee(sys.stdout)
    sys.stdout = tee
    _hf_token_into_env()
    tpilog = _TPILog()
    lg = logging.getLogger("ogcore.TPI")
    lg.setLevel(logging.INFO)
    lg.addHandler(tpilog)

    handles = _load_oguk()
    TPI, SS, api, Client, LocalCluster = handles
    from ogcore import demographics

    captured = {}
    _orig = demographics.get_pop_objs

    def _capture(*args, **kw):
        d = _orig(*args, **kw)
        captured.clear()
        captured.update(d)
        return d

    demographics.get_pop_objs = _capture

    baseline = a.arm == "baseline"
    base_dir = Path(a.base_dir)
    for sub in ("SS", "TPI"):
        (base_dir / sub).mkdir(parents=True, exist_ok=True)
    import tempfile
    out_dir = str(base_dir) if baseline else tempfile.mkdtemp()
    for sub in ("SS", "TPI"):
        os.makedirs(os.path.join(out_dir, sub), exist_ok=True)

    if baseline:
        gamma_val, z_terminal, alpha_G, cal = G_BASE, None, None, None
    else:
        bj = json.loads(Path(a.baseline_json).read_text())
        assert abs(bj["zeta_K"] - a.zeta_K) < 1e-12 and bj["pretp"] == a.pretp
        alpha_G = bj["alpha_G_used"]
        K0, L0 = bj["series"]["K"][0], bj["series"]["L"][0]
        scen = a.arm.replace("_ramp", "")
        cal = solve_scenario(SCENARIOS[scen], K0, L0, G_BASE)
        gamma_val, z_terminal = cal["gamma"], cal["Z"]

    client = Client(LocalCluster(processes=False, n_workers=1, threads_per_worker=4,
                                 dashboard_address=None))
    t0 = time.time()
    print(f"\n=== {a.label}: {a.arm}, zeta_K={a.zeta_K}, pretp={a.pretp} ===", flush=True)
    p = api._build_specs(START, None, out_dir, str(base_dir), baseline=baseline,
                         age_specific="pooled", multi_sector=False,
                         param_overrides={"epsilon": [EPS], "gamma": [gamma_val],
                                          "tG1": TG1, "g_y_annual": G_Y_ANNUAL,
                                          "zeta_K": [a.zeta_K]})
    p.TPI_outer_method = "anderson"
    assert np.allclose(np.asarray(p.zeta_K), a.zeta_K), p.zeta_K
    assert np.allclose(np.asarray(p.zeta_D), 0.4) and np.allclose(
        np.asarray(p.world_int_rate_annual), 0.02)

    # Period-0 demographics: what the solve would use, with and without the patch.
    stock = {"g_n_preTP": float(p.g_n_preTP), "rho_preTP": np.array(p.rho_preTP),
             "imm_rates_preTP": np.array(p.imm_rates_preTP)}
    uk = {k: captured[k] for k in ("g_n_preTP", "rho_preTP", "imm_rates_preTP")}
    omega_pre, omega0 = np.asarray(p.omega_S_preTP), np.asarray(p.omega[0])
    lom = {
        "stock_ogcore_defaults": pretp_law_of_motion(
            omega_pre, stock["rho_preTP"], stock["imm_rates_preTP"],
            stock["g_n_preTP"], omega0),
        "uk_consistent": pretp_law_of_motion(
            omega_pre, np.asarray(uk["rho_preTP"]), np.asarray(uk["imm_rates_preTP"]),
            float(uk["g_n_preTP"]), omega0),
    }
    demo_check = {
        "omega_S_preTP_matches_fetch": bool(np.allclose(omega_pre, captured["omega_S_preTP"])),
        "g_n_preTP_stock": stock["g_n_preTP"], "g_n_preTP_uk": float(uk["g_n_preTP"]),
        "rho_preTP_maxabs_diff": float(np.abs(stock["rho_preTP"] - uk["rho_preTP"]).max()),
        "imm_rates_preTP_maxabs_diff": float(np.abs(stock["imm_rates_preTP"]
                                                    - uk["imm_rates_preTP"]).max()),
        "law_of_motion_rel_residual": {k: {"min": float(v.min()), "max": float(v.max()),
                                           "maxabs": float(np.abs(v).max())}
                                       for k, v in lom.items()},
    }
    print(f"  pre-TP law of motion, max |rel resid|: stock "
          f"{demo_check['law_of_motion_rel_residual']['stock_ogcore_defaults']['maxabs']:.3e}"
          f", UK {demo_check['law_of_motion_rel_residual']['uk_consistent']['maxabs']:.3e}",
          flush=True)
    if a.pretp:
        p.g_n_preTP = float(uk["g_n_preTP"])
        p.rho_preTP = np.asarray(uk["rho_preTP"], dtype=float).reshape(stock["rho_preTP"].shape)
        p.imm_rates_preTP = np.asarray(uk["imm_rates_preTP"], dtype=float).reshape(
            stock["imm_rates_preTP"].shape)
        print("  PATCHED: g_n_preTP, rho_preTP, imm_rates_preTP from the UK fetch", flush=True)

    T = p.T + p.S
    up = np.minimum(np.arange(T) / RAMP_YEARS, 1.0)[:, None]
    if not baseline:
        p.gamma = G_BASE + up * (gamma_val - G_BASE)
        p.Z = 1.0 + up * (z_terminal - 1.0)
        print(f"  gamma ramps {G_BASE} -> {gamma_val}; Z ramps 1 -> {z_terminal:.6f}",
              flush=True)

    ss = SS.run_SS(p, client=client)
    with open(os.path.join(out_dir, "SS", "SS_vars.pkl"), "wb") as f:
        pickle.dump(ss, f)
    if alpha_G is None:
        alpha_G = float(ss["G"] / ss["Y"])
    p.alpha_G = np.full(p.T + p.S, alpha_G)
    TPI.run_TPI(p, client=client)
    with open(os.path.join(out_dir, "TPI", "TPI_vars.pkl"), "rb") as f:
        tpi = pickle.load(f)
    client.close()

    Tn = p.T
    series = {v: np.asarray(tpi[v]).reshape(Tn, -1).sum(1)[:NEXP].tolist()
              for v in EXPORT if v in tpi}
    rc = np.asarray(tpi["resource_constraint_error"]).reshape(Tn, -1).sum(1)
    Y = np.asarray(tpi["Y"]).reshape(Tn, -1).sum(1)
    rc_rel = rc / Y
    dist = np.asarray(tpilog.dist)
    eul_s = float(np.nanmax(np.abs(tpi["euler_savings"])))
    eul_l = float(np.nanmax(np.abs(tpi["euler_labor_leisure"])))

    # Accounting identities on the exported window.
    s = {k: np.asarray(v) for k, v in series.items()}
    ident = {
        "K_eq_Kd_plus_Kf": float(np.abs(s["K"] - s["K_d"] - s["K_f"]).max()),
        "Kd_eq_B_minus_Dd": float(np.abs(s["K_d"] - (s["B"] - s["D_d"])).max()),
        "D_eq_Dd_plus_Df": float(np.abs(s["D"] - s["D_d"] - s["D_f"]).max()),
    }

    rec = {
        "label": a.label, "arm": a.arm, "zeta_K": a.zeta_K, "pretp": a.pretp,
        "zeta_D": float(np.asarray(p.zeta_D).ravel()[0]),
        "world_int_rate_annual": float(np.asarray(p.world_int_rate_annual).ravel()[0]),
        "delta": float(p.delta), "years": list(range(START, START + NEXP)),
        "gamma_terminal": gamma_val, "Z_terminal": z_terminal, "calibration": cal,
        "alpha_G_used": alpha_G, "tG1_used": int(p.tG1), "g_y_annual_used": G_Y_ANNUAL,
        "elapsed_min": (time.time() - t0) / 60,
        "ss": {k: float(np.asarray(ss[k]).sum()) for k in
               ("Y", "K", "K_d", "K_f", "B", "D", "D_d", "D_f", "r", "r_p", "w", "L", "C")
               if k in ss},
        "series": series,
        "identities_maxabs": ident,
        "convergence": {
            "tpi_iterations": int(tpilog.iters[-1]) if tpilog.iters else None,
            "tpi_distance_history": dist.tolist(),
            "tpi_final_distance": float(dist[-1]) if dist.size else None,
            "mindist_TPI": float(p.mindist_TPI), "maxiter": int(p.maxiter),
            "converged": bool(dist.size and dist[-1] < p.mindist_TPI
                              and tpilog.iters[-1] < p.maxiter),
            "rc_signed": rc.tolist(),
            "rc_rel_Y_signed": rc_rel.tolist(),
            "rc_rel_Y_max_abs_excl_last": float(np.nanmax(np.abs(rc_rel[: Tn - 1]))),
            "rc_rel_Y_argmax_excl_last": int(np.nanargmax(np.abs(rc_rel[: Tn - 1]))),
            "rc_rel_Y_max_abs_interior": float(np.nanmax(np.abs(rc_rel[1: Tn - 1]))),
            "euler_savings_max": eul_s, "euler_labour_max": eul_l,
        },
        "demographics": {
            "check": demo_check,
            "un_api_fallbacks_to_github": tee.un_fallbacks,
            "source": "GitHub fallback (EAPD-DRB/Population-Data)" if tee.un_fallbacks
            else "UN WPP API",
            "hash": {k: _h(getattr(p, k)) for k in
                     ("omega", "omega_SS", "omega_S_preTP", "g_n", "rho", "imm_rates")},
            "g_n_ss": float(p.g_n_ss), "g_n_first5": np.asarray(p.g_n)[:5].tolist(),
            "preTP_used": {"g_n_preTP": float(p.g_n_preTP),
                           "rho_preTP_hash": _h(p.rho_preTP),
                           "imm_rates_preTP_hash": _h(p.imm_rates_preTP)},
        },
        "provenance": {**provenance(TPI, api),
                       "oguk_version": _ver("oguk"), "dask": _ver("dask"),
                       "python_executable": sys.executable},
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{a.label}.json"
    out.write_text(json.dumps(_js(rec), indent=1))
    c = rec["convergence"]
    print(f"OK {a.label} {rec['elapsed_min']:.1f} min | TPI iters {c['tpi_iterations']} "
          f"dist {c['tpi_final_distance']} converged={c['converged']} | RC/Y 2026 "
          f"{rc_rel[0]:+.4%} | wrote {out}", flush=True)


def _ver(pkg):
    try:
        import importlib.metadata as m
        return m.version(pkg)
    except Exception:
        return None


if __name__ == "__main__":
    main()
