"""Unanticipated AI shock announced at the start of 2028 (``--surprise 2028``).

Design (Vahid, 12 Nov 2026; docs/surprise_2028.md):

* The baselines are the committed R1-R4 baselines (``analysis/rerun/output``),
  unchanged, at both closures.  They start in 2026.
* Every scenario equals its baseline exactly in 2026 and 2027.  At the start
  of 2028 the whole AI path is announced, unanticipated.  The scenario's TPI
  starts from the baseline's state at the start of 2028: the wealth
  distribution b_{s,j} carried into 2028 (baseline ``b_sp1`` of 2027), the
  bequests that wealth implies, government debt and its foreign-held part,
  and public capital.
* gamma and Z keep the old ramp's shape, one year later: weight 0 in 2027
  (the old ramp had weight 0 in 2026), 0.25, 0.5, 0.75 in 2028-30, full from
  2031 (the old ramp reached full weight in 2030).
* Reporting window 2027-2031; headline year 2031; R4 holds share_shift's 2031
  GDP at the baseline's; the Z anchor is the baseline's 2027 K and L (the
  ramp's zero-weight year, as 2026 was before).

How a run "starts in 2028" without rebuilding anything
------------------------------------------------------
OG-UK's specifications are built for 2026 exactly as for the baseline (same
tax functions, demographics, R2 fixes, g_n guard).  Then every time-indexed
input is shifted forward by ``k = SURPRISE_YEAR - START`` periods
(``shift_time_params``), the pre-period objects (``omega_S_preTP``,
``g_n_preTP``, ``rho_preTP``, ``imm_rates_preTP``) are set to the baseline's
2027 rows, and ``tG1``/``tG2`` move back by k so the debt rule still starts in
2036.  Model period 0 is then calendar 2028.  OG-Core 0.17 takes the TPI
initial condition from the BASELINE STEADY STATE (``TPI.get_initial_SS_values``:
``initial_b = ss b_sp1 * B_ss / B0``) and the initial debt and public capital
from the baseline TPI's period 0; ``initial_state`` wraps that function so a
surprise run starts from the baseline's period-k state instead.  Nothing in
OG-Core or OG-UK is edited.

Only B, D, D_f, D_d, K_d (and K_g) are predetermined in OG-Core.  K_f is not:
``aggr.get_K_splits`` sets it every period from zeta_K x excess capital demand,
so at zeta_K = 0.1 the capital stock moves on impact in 2028.
"""

from __future__ import annotations

import contextlib
import json
import math
import os
import time
from pathlib import Path

import numpy as np

from .calibrate import solve_scenario
from .scenarios import (G_BASE, G_Y_ANNUAL, RAMP_YEARS, SCENARIOS, START, TG1,
                        Scenario)

SURPRISE_YEAR = 2028
NEXP_SURPRISE = 11          # 2026-2036: 2036 is the debt rule's first year (tG1)
NPER_SURPRISE = 5           # the reporting window, 2027-2031
OUTDIR = "analysis/surprise/output"

# The continuation (no-shock restart) must reproduce the baseline from 2028 to
# within this relative error before any arm runs: it is the test that the
# shift list and the initial state are complete.  OG-UK's mindist_TPI is 1e-4.
# Decided 12 Nov 2026: gaps are measured against the continuation, and the
# continuation must reproduce the committed baseline over 2028-2036 to these
# relative tolerances, or nothing else runs.
CONT_TIGHT = {"Y": 1e-4, "K": 1e-4, "D/Y": 1e-4}       # GDP, capital, debt/GDP
CONT_TOL = 1e-3                                        # everything else
CONT_VARS = ("L", "C", "r", "w", "D", "B")             # relative error
CONT_SHARE_VARS = ("I",)    # |diff| / Y: I is a difference of stocks, so solver
                            # noise in K is amplified ~10x in I relative to itself
RC0_TOL = 1e-5              # |resource-constraint error / Y| in the restart's
                            # first period; the baselines have ~1e-6 (#15)
# Initial-state checks inside the solve (relative).
B0_TOL = 1e-8
BQ0_TOL = 1e-3              # pickle BQ is the last outer iteration's, not BQnew

R4_TOL_PP = 0.01
R4_SLOPE0 = 1.0
MAX_R4_ITER = 5
FS = "_fs"
VARIANTS = {"": "every arm uses the baseline's alpha_G (G/Y) and alpha_T (TR/Y)",
            "fs": "fixed spending: shocked arms hold G and TR at the baseline's levels",
            "dn": "debt-neutral: TR adjusts every year from the shock year so that "
                  "debt/GDP follows the no-shock restart's path up to the debt rule's "
                  "first year (2036); G follows its usual rule (alpha_G * Y before "
                  "tG1, the debt rule from tG1); from tG1 TR is alpha_T * Y again"}
VARIANTS["dnfull"] = (
    "debt-neutral to the horizon (Fable cohort referee, 13 Nov): TR keeps debt/GDP on "
    "the no-shock restart's path every year 2029 to T-1; the G debt rule is switched "
    "off (tG1 = tG2 = T-1), so G = alpha_G * Y throughout the transition and households "
    "bear the post-2035 fiscal cost too.  OG-Core's terminal period and steady state "
    "still close the budget with G (fiscal.D_G_path's final-period G, SS.get_G_ss), as "
    "in every arm")
STAGE_VARIANT = {"arms": "", "arms_fs": "fs", "arms_dn": "dn", "arms_dnfull": "dnfull"}
DNFULL_G_TOL = 1e-9          # |G/Y - alpha_G| on 2028..T-2
DN_TOL = 1e-4               # debt-neutral arms: max relative |D/Y - target|, 2029-2036

# Per-period depreciation.  OG-UK sets delta_annual = 0.065
# (oguk_default_parameters.json; ONS CAPSTK) and OG-Core converts it to the
# model period, 1 - (1 - 0.065)^(80 / S); with S = 80 a period is a year, so
# delta = 0.065.  run_arm records p.delta and the splice checks it matches.
DELTA_ANNUAL = 0.065


def _variant(v) -> str:
    if v is True:
        return "fs"
    if v in (False, None, ""):
        return ""
    if v not in VARIANTS:
        raise ValueError(f"unknown variant {v!r}")
    return v


def k_of(year: int = SURPRISE_YEAR) -> int:
    k = int(year) - START
    if k < 1:
        raise ValueError(f"surprise year {year} must be after {START}")
    return k


def window(year: int = SURPRISE_YEAR) -> dict:
    """Every date of the design, derived from the shock year."""
    zero = year - 1
    return {"surprise_year": year, "k": k_of(year), "ramp_zero_year": zero,
            "ramp_full_year": zero + RAMP_YEARS, "z_anchor_year": zero,
            "r4_year": zero + RAMP_YEARS, "headline_year": zero + RAMP_YEARS,
            "report_years": list(range(zero, zero + NPER_SURPRISE)),
            "debt_rule_year": START + TG1}


# --- ramp ------------------------------------------------------------------------

def ramp_weights(n: int, offset: int = 0) -> np.ndarray:
    """Weight on the terminal gamma/Z by model period, shape (n, 1).

    ``offset = 0`` is the old path (run_arm before this change): 0 at t = 0
    (2026), full at t = RAMP_YEARS (2030).  A surprise run whose period 0 is
    calendar ``START + k`` uses ``offset = k - 1``: weight 0 in START + k - 1,
    full RAMP_YEARS later (2031 for k = 2)."""
    return np.clip((np.arange(n) + offset) / RAMP_YEARS, 0.0, 1.0)[:, None]


def calendar_weights(year: int = SURPRISE_YEAR, years=range(2026, 2037)) -> dict:
    w = window(year)
    return {y: (0.0 if y < year else
                float(min(max((y - w["ramp_zero_year"]) / RAMP_YEARS, 0.0), 1.0)))
            for y in years}


# --- shifting a 2026 specification forward by k periods ----------------------------

# Every time-indexed input of an OG-Core 0.17 Specifications object
# (parameters.py compute_default_params: tp_param_list .. tp_param_list4, the
# tax and eta lists, e, chi_n; and what is derived from them), plus OG-UK's
# demographic arrays.  Shifted with edge padding: the tail rows are steady-state
# values, so repeating the last row is exact.
SHIFT_T_PLUS_S = (
    "alpha_G", "alpha_T", "alpha_I", "alpha_FA", "alpha_bs_G", "alpha_bs_T",
    "alpha_bs_I", "world_int_rate_annual", "adjustment_factor_for_cit_receipts",
    "tau_bq", "tau_payroll", "h_wealth", "m_wealth", "p_wealth", "retirement_age",
    "zeta_D", "zeta_K", "r_gov_scale", "r_gov_shift", "g_RM",
    "Z", "delta_tau_annual", "cit_rate", "inv_tax_credit", "tau_c",
    "labor_income_tax_noncompliance_rate", "capital_income_tax_noncompliance_rate",
    "replacement_rate_adjust", "income_tax_filer", "wealth_tax_filer",
    "rho", "eta", "eta_RM", "chi_n",
    "world_int_rate", "retire", "tau_b", "delta_tau", "ubi_nom_array",
    "frac_tax_payroll", "omega", "g_n", "imm_rates", "gamma", "gamma_g", "epsilon",
)
SHIFT_T = ("e", "etr_params", "mtrx_params", "mtry_params")
PRETP = {"omega_S_preTP": "omega", "g_n_preTP": "g_n", "rho_preTP": "rho",
         "imm_rates_preTP": "imm_rates"}
# Steady-state objects: a shift must leave them alone.
SS_KEYS = ("omega_SS", "g_n_ss")


class ShiftError(RuntimeError):
    """The specification has a time-varying input the shift does not cover."""


def _shift(a, k):
    if isinstance(a, list):
        return a[k:] + [a[-1]] * k
    a = np.asarray(a)
    return np.concatenate([a[k:], np.repeat(a[-1:], k, axis=0)], axis=0)


def _leading(a):
    if isinstance(a, list):
        return len(a)
    if isinstance(a, np.ndarray) and a.ndim >= 1:
        return a.shape[0]
    return None


def _varies(a) -> bool:
    try:
        x = np.asarray(a, dtype=float)
    except (TypeError, ValueError):
        return True
    return bool(x.shape[0] > 1 and np.any(x != x[:1]))


def shift_time_params(p, k: int) -> dict:
    """Move model period 0 from START to START + k, in place.

    Returns what was shifted.  Raises ``ShiftError`` if an attribute with a
    leading T or T+S dimension that is not in the lists varies over time."""
    T, S = int(p.T), int(p.S)
    lens = {T, T + S}
    ss_before = {key: np.array(getattr(p, key), dtype=float) for key in SS_KEYS
                 if hasattr(p, key)}
    # pre-period = the old period k-1 rows (taken before shifting)
    pretp = {}
    for key, src in PRETP.items():
        if hasattr(p, src):
            row = np.asarray(getattr(p, src), dtype=float)[k - 1]
            old = getattr(p, key, None)
            pretp[key] = float(row) if np.ndim(row) == 0 else \
                row.reshape(np.shape(old)) if old is not None and np.size(old) == np.size(row) \
                else row
    shifted, constant = [], []
    for name in SHIFT_T_PLUS_S + SHIFT_T:
        if not hasattr(p, name):
            continue
        a = getattr(p, name)
        n = _leading(a)
        if n not in lens:
            continue              # e.g. a scalar or a per-industry vector
        (shifted if _varies(a) else constant).append(name)
        setattr(p, name, _shift(a, k))
    listed = set(SHIFT_T_PLUS_S) | set(SHIFT_T) | set(PRETP) | set(SS_KEYS)
    unlisted = sorted(n for n, a in vars(p).items()
                      if n not in listed and not n.startswith("_")
                      and _leading(a) in lens and _varies(a))
    if unlisted:
        raise ShiftError(f"time-varying inputs not covered by the shift: {unlisted}")
    for key, v in pretp.items():
        setattr(p, key, v)
    for key in ("tG1", "tG2"):
        if hasattr(p, key):
            setattr(p, key, int(getattr(p, key)) - k)
    if hasattr(p, "start_year"):
        p.start_year = int(p.start_year) + k
    for key, v in ss_before.items():
        if not np.array_equal(np.asarray(getattr(p, key), dtype=float), v):
            raise ShiftError(f"the shift changed the steady-state object {key}")
    return {"k": k, "shifted_varying": shifted, "shifted_constant": constant,
            "pretp_from_period": k - 1, "tG1": getattr(p, "tG1", None),
            "tG2": getattr(p, "tG2", None)}


# --- the baseline's state at the start of START + k ----------------------------------

def baseline_state(tpi: dict, k: int) -> dict:
    """What a run starting in period k inherits from the baseline TPI output."""
    D, D_f = np.asarray(tpi["D"], float), np.asarray(tpi["D_f"], float)
    return {
        "k": k,
        "initial_b": np.asarray(tpi["b_sp1"], float)[k - 1],   # savings carried into k
        "initial_n": np.asarray(tpi["n"], float)[k - 1],       # labour in k-1 (n_preTP)
        "D0": float(D[k]), "Kg0": float(np.asarray(tpi["K_g"], float)[k]),
        "initial_foreign_debt_ratio": float(D_f[k] / D[k]),
        "B": float(np.asarray(tpi["B"], float)[k]),
        "D_f": float(D_f[k]), "D_d": float(np.asarray(tpi["D_d"], float)[k]),
        "K_d": float(np.asarray(tpi["K_d"], float)[k]),
        "BQ": np.asarray(tpi["BQ"], float)[k], "r_p": float(np.asarray(tpi["r_p"], float)[k]),
        "Y_path": _shift(np.asarray(tpi["Y"], float), k),
        "TR_path": _shift(np.asarray(tpi["TR"], float), k),
        "G_path": _shift(np.asarray(tpi["G"], float), k),
        "I_g_path": _shift(np.asarray(tpi["I_g"], float), k),
    }


def load_baseline_state(base_dir, k: int) -> dict:
    import pickle
    with open(os.path.join(base_dir, "TPI", "TPI_vars.pkl"), "rb") as f:
        return baseline_state(pickle.load(f), k)


def state_check(p, state, get_B, get_BQ=None) -> dict:
    """Aggregate wealth and inherited bequests of the restart, on the SHIFTED
    spec, against the baseline's period-k values.  Raises on a mismatch: that
    means the pre-period demographics are not the baseline's period k-1 rows.
    Called right after the shift (before SS) and again inside TPI."""
    ib = np.asarray(state["initial_b"], float)
    B0 = float(get_B(ib, p, "SS", True))
    rel = abs(B0 / state["B"] - 1)
    check = {"B0": B0, "B_baseline_k": state["B"], "B0_rel_err": rel}
    if rel > B0_TOL:
        raise ShiftError(f"aggregate wealth at the restart {B0:.10g} != baseline "
                         f"B[k] {state['B']:.10g} (rel {rel:.2e}): the pre-period "
                         "demographics are not the baseline's period k-1 rows")
    if get_BQ is not None:
        bq = np.asarray(get_BQ(state["r_p"], ib, None, p, "SS", True), float)
        bq_rel = float(np.max(np.abs(bq / np.asarray(state["BQ"]) - 1)))
        check["BQ0_rel_err"] = bq_rel
        if bq_rel > BQ0_TOL:
            raise ShiftError(f"inherited bequests differ from the baseline's by {bq_rel:.2e}")
    return check


def replace_initial_values(out, p, state, get_B, get_BQ=None):
    """Turn ``TPI.get_initial_SS_values(p)``'s output into the period-k start."""
    initial_values, ss_vars, theta, baseline_values = out
    _, _, _, factor, _, _ = initial_values
    ib = np.asarray(state["initial_b"], float)
    n0 = np.asarray(state["initial_n"], float)
    check = state_check(p, state, get_B, get_BQ)
    B0 = check["B0"]
    p.n_preTP = n0
    b_sinit = np.vstack([np.zeros((1, ib.shape[1])), ib[:-1]])
    initial_values = (B0, b_sinit, ib, factor, ib, n0)
    Yb, TRb, Gb, Igb, _, _ = baseline_values
    T = int(p.T)
    pad = lambda a: np.asarray(a, float)[:T]
    baseline_values = (
        pad(state["Y_path"]) if Yb is not None else None,
        pad(state["TR_path"]) if TRb is not None else None,
        pad(state["G_path"]) if Gb is not None else None,
        pad(state["I_g_path"]) if Igb is not None else None,
        state["D0"], state["Kg0"])
    return (initial_values, ss_vars, theta, baseline_values), check


@contextlib.contextmanager
def initial_state(TPI, state, record: dict):
    """Patch ``TPI.get_initial_SS_values`` for one run; always restored."""
    from ogcore import aggregates as aggr
    orig = TPI.get_initial_SS_values

    def patched(p):
        out, check = replace_initial_values(orig(p), p, state, aggr.get_B, aggr.get_BQ)
        record.update(check)
        return out

    TPI.get_initial_SS_values = patched
    try:
        yield
    finally:
        TPI.get_initial_SS_values = orig


def apply_to_specs(p, state) -> dict:
    """Shift a 2026 specification to start at START + k from ``state``."""
    log = shift_time_params(p, state["k"])
    p.initial_foreign_debt_ratio = state["initial_foreign_debt_ratio"]
    log["initial_foreign_debt_ratio"] = state["initial_foreign_debt_ratio"]
    return log


def predetermined_check(run_series: dict, state: dict) -> dict:
    """The run's period-0 stocks must be the baseline's period-k stocks."""
    out = {}
    for v in ("B", "D", "D_f", "D_d", "K_d"):
        ref = state["D0"] if v == "D" else state[v]
        out[v] = abs(run_series[v][0] / ref - 1) if ref else abs(run_series[v][0])
    out["ok"] = bool(max(out.values()) < 1e-6)
    return out


# --- series ----------------------------------------------------------------------

def series_from_tpi(tpi: dict, T: int, n: int, export, delta=DELTA_ANNUAL) -> dict:
    """Aggregates, GNI = Y - r_p (K_f + D_f) and NNI = GNI - delta K."""
    agg = lambda v: np.asarray(tpi[v], float).reshape(T, -1).sum(1)
    s = {v: agg(v)[:n].tolist() for v in export if v in tpi}
    a = {v: np.asarray(x) for v, x in s.items()}
    if all(v in a for v in ("Y", "r_p", "K_f", "D_f")):
        gni = a["Y"] - a["r_p"] * a["K_f"] - a["r_p"] * a["D_f"]
        s["GNI"] = gni.tolist()
        s["NNI"] = (gni - delta * a["K"]).tolist()
    return s


# --- the debt-neutral closure ("_dn") -------------------------------------------------
#
# OG-Core 0.17 has no closure that holds debt/GDP on a given path with
# transfers: budget_balance sets TR = revenue - spending (D = 0), baseline_spending
# fixes TR and G at baseline LEVELS, and the debt rule (tG1/tG2, rho_G,
# debt_ratio_ss) moves G, not TR.  TR is, however, one of the TPI outer-loop
# fixed-point variables: every outer iteration computes TR_new =
# fiscal.get_TR(...) and damps/accelerates TR towards it.  So the closure is a
# replacement get_TR for the TPI only: TR_new_t is the transfer that makes
# D_{t+1}/Y_{t+1} equal the target, given the iterate's Y, G, revenue, pensions
# and r_gov, using D_G_path's own law of motion.  At the fixed point TR = TR_new
# and D_G_path's D is the target path.  No outer loop is added: one solve per
# arm, as before.  r is captured from the D_G_path call made earlier in the
# same outer iteration.

def debt_neutral_tr(target_dy, Y, G, I_g, UBI, pensions, revenue, foreign_aid,
                    r_gov_of, D0, growth, n):
    """Transfers TR_0..TR_{n-1} so that D_t / Y_t = target_dy[t] for t = 1..n.

    D_G_path (ogcore/fiscal.py 0.17): growth[t] D[t] = (1 + r_gov[t-1]) D[t-1]
    + G[t-1] + I_g[t-1] + TR[t-1] + UBI[t-1] + pensions[t-1] - revenue[t-1]
    - foreign_aid[t-1], with r_gov[t] = r_gov_of(t, D[t] / Y[t]) and D[0] = D0.
    """
    D = np.empty(n + 1)
    D[0] = D0
    D[1:] = np.asarray(target_dy, float)[1:n + 1] * np.asarray(Y, float)[1:n + 1]
    tr = np.empty(n)
    for t in range(n):
        rg = r_gov_of(t, D[t] / Y[t])
        tr[t] = (growth[t + 1] * D[t + 1] - (1 + rg) * D[t] - G[t] - I_g[t] - UBI[t]
                 - pensions[t] + revenue[t] + foreign_aid[t])
    return tr


def dn_horizon(p, target_dy) -> int:
    """Years of TR set by the closure: until the debt rule (tG1) takes over,
    and no further than the target path reaches."""
    return int(min(int(p.tG1), len(target_dy) - 1, int(p.T) - 1))


@contextlib.contextmanager
def debt_neutral(fiscal, target_dy, D0, record: dict):
    """Patch ``fiscal.get_TR`` (TPI calls only) and wrap ``fiscal.D_G_path`` to
    read r, for one run; always restored.  ``target_dy[t]``: debt/GDP by run
    period (t = 0 is the shock year; only t >= 1 is targeted, D_0 is given)."""
    orig_tr, orig_dg = fiscal.get_TR, fiscal.D_G_path
    seen = {}

    def dg(r, dg_fixed_values, p):
        seen["r"] = np.array(r, dtype=float)
        return orig_dg(r, dg_fixed_values, p)

    def get_tr(Y, TR, G, total_tax_revenue, agg_pension_outlays, UBI_outlays, I_g, p,
               method):
        new = orig_tr(Y, TR, G, total_tax_revenue, agg_pension_outlays, UBI_outlays,
                      I_g, p, method)
        if method != "TPI" or "r" not in seen or p.baseline_spending or p.budget_balance:
            return new
        T = int(p.T)
        n = dn_horizon(p, target_dy)
        growth = (1 + np.append(p.g_n_preTP, p.g_n[:T])) * np.exp(p.g_y)
        r = seen["r"]
        rg = lambda t, dy: float(fiscal.get_r_gov(r[t], dy, p, "scalar", t))
        fa = np.asarray(p.alpha_FA[:T], float) * np.asarray(Y[:T], float)
        tr = debt_neutral_tr(target_dy, np.asarray(Y, float), np.asarray(G, float),
                             np.asarray(I_g, float), np.asarray(UBI_outlays, float),
                             np.asarray(agg_pension_outlays, float),
                             np.asarray(total_tax_revenue, float), fa, rg, D0, growth, n)
        new = np.array(new, dtype=float)
        new[:n] = tr
        record["calls"] = record.get("calls", 0) + 1
        record["horizon"] = n
        return new

    fiscal.get_TR, fiscal.D_G_path = get_tr, dg
    try:
        yield
    finally:
        fiscal.get_TR, fiscal.D_G_path = orig_tr, orig_dg


def dn_target(ref_ext, k) -> list:
    """Target debt/GDP by run period from the reference (continuation) series."""
    s = ref_ext["series"]
    return [s["D"][i] / s["Y"][i] for i in range(k, len(s["Y"]))]


def dn_check(rec, ref_ext, year=SURPRISE_YEAR) -> dict:
    """Debt/GDP of a debt-neutral arm against its target, shock year+1 .. 2036."""
    w = window(year)
    yrs = range(year + 1, w["debt_rule_year"] + 1)
    dy = lambda s_, y: s_["D"][y - START] / s_["Y"][y - START]
    err = {y: dy(rec["series"], y) / dy(ref_ext["series"], y) - 1 for y in yrs}
    m = max(abs(v) for v in err.values())
    return {"rel_err_by_year": err, "max_abs_rel": m, "tol": DN_TOL, "ok": bool(m <= DN_TOL)}


def splice(base_series: dict, run_series: dict, k: int, check: dict | None) -> dict:
    """Calendar series: the baseline for the first k years, the run after.

    Refuses unless the run's predetermined stocks matched the baseline's period-k
    values (``predetermined_check``), so the 2026-27 identity is not vacuous."""
    if not (check and check.get("ok")):
        raise ShiftError(f"refusing to splice: predetermined stocks differ {check}")
    n = len(base_series["Y"])
    return {v: list(base_series[v][:k]) + list(run_series[v][: n - k])
            for v in run_series if v in base_series}


def calendar_record(rec: dict, base_ext: dict, k: int, year: int = SURPRISE_YEAR) -> dict:
    """Rewrite a surprise solve record onto the calendar window."""
    w = window(year)
    d = rec.get("delta")
    if d is not None and abs(d - DELTA_ANNUAL) > 1e-12:
        raise ShiftError(f"model delta {d} != DELTA_ANNUAL {DELTA_ANNUAL}: NNI of the "
                         "baseline years would use a different depreciation rate")
    rec["series_run"] = rec["series"]
    rec["series_run_years"] = list(range(START + k, START + k + len(rec["series"]["Y"])))
    rec["series"] = splice(base_ext["series"], rec["series"], k,
                           rec["surprise"]["predetermined"])
    rec["years_series"] = list(range(START, START + len(rec["series"]["Y"])))
    i0 = w["report_years"][0] - START
    rec["years"] = w["report_years"]
    for v, x in rec["series"].items():
        rec[v] = x[i0: i0 + NPER_SURPRISE]
    # run_arm's per-period fields are indexed from the RUN's period 0, not 2026
    # or 2027: label them so no reader puts them under calendar years.
    rec["run_period0_year"] = START + k
    rec["run_period_fields"] = ["g_n_used", "diagnostics.rc_first5",
                                "diagnostics.rc_rel_Y_signed", "series_run"]
    return rec


def gap_pct(rec, base_ext, year, var="Y") -> float:
    i = year - START
    return (rec["series"][var][i] / base_ext["series"][var][i] - 1) * 100


# --- the scenario grid ---------------------------------------------------------------
#
# Each scenario is a (labour-share fall by the full-weight year, TFP level gain)
# pair and has two arms: <id>_share_shift_tfp (both) and <id>_share_shift (the
# share shift alone, Z solved by R4 on 2031 GDP).  "korinek" is the labelled
# upper scenario (Korinek et al. 2026, Table 3, US "substantial"); the UK
# scenarios are read from analysis/surprise/uk_targets.json, written by the
# literature review (IMF UK 2026 SIP/2026/072, OBR FRS 2026 Box 4.1, BP9).
#
# uk_targets.json schema (either form):
#   {"scenarios": {"uk_central": {"labour_share_fall_pp": 1.2, "tfp_gain": 0.005,
#                                 "source": "...", "note": "..."}, ...}}
#   {"uk_central": {...}, "uk_low": {...}, "uk_high": {...}}
# tfp_gain is a fraction (0.005 = +0.5% at fixed inputs); "tfp_gain_pct" is
# accepted as percent.  Both are reached at full ramp weight (2031).
UK_TARGETS = Path(__file__).resolve().parents[1] / "analysis" / "surprise" / "uk_targets.json"
UK_IDS = ("uk_low", "uk_central", "uk_high")
KORINEK = {"labour_share_fall_pp": 3.9, "tfp_gain": 0.031,
           "label": "upper (Korinek US substantial)",
           "source": "Korinek, Jones, Sacher, Cotter and McCrory (2026), Anthropic "
                     "Institute WP 2026-02, Table 3, 'substantial' column"}


def scenario_grid(path=None) -> dict:
    """{id: {labour_share_fall_pp, tfp_gain, label, source}}; korinek always,
    the UK ids when uk_targets.json exists."""
    grid = {"korinek": dict(KORINEK)}
    f = Path(path) if path else UK_TARGETS
    if f.exists():
        raw = json.loads(f.read_text())
        raw = raw.get("scenarios", raw)
        for sid in UK_IDS:
            if sid not in raw:
                continue
            x = raw[sid]
            g = x["tfp_gain"] if "tfp_gain" in x else x["tfp_gain_pct"] / 100
            fall = float(x["labour_share_fall_pp"])
            if not (0 < fall < 20 and -0.05 < g < 0.2):
                raise ValueError(f"{sid}: implausible targets {fall}pp, {g}")
            gt = x.get("gamma_terminal")
            if gt is not None and abs(gt - (G_BASE + fall / 100)) > 1e-9:
                raise ValueError(f"{sid}: gamma_terminal {gt} != {G_BASE} + {fall}/100")
            grid[sid] = {"labour_share_fall_pp": fall, "tfp_gain": float(g),
                         "label": x.get("label", sid.replace("_", " ")),
                         "source": x.get("source", str(f))}
    return grid


def scenario_pair(sid, grid=None) -> dict:
    """The two Scenario objects of one grid entry: 'tfp' and 'ss'."""
    grid = grid or scenario_grid()
    if sid not in grid:
        raise KeyError(f"scenario {sid!r} not in the grid {sorted(grid)} "
                       f"(UK targets file: {UK_TARGETS})")
    x = grid[sid]
    fall, g = x["labour_share_fall_pp"], x["tfp_gain"]
    return {"tfp": Scenario(name=f"{sid}_share_shift_tfp", labour_share_fall_pp=fall,
                            tfp_gain=g, target=f"labour share -{fall}pp and {g:+.2%} "
                            f"output at fixed baseline inputs ({x['label']})"),
            "ss": Scenario(name=f"{sid}_share_shift", labour_share_fall_pp=fall,
                           gdp_level_change=0.0,
                           target=f"labour share -{fall}pp with Z solved so 2031 GDP "
                                  f"equals the reference ({x['label']})")}


# --- planner -----------------------------------------------------------------------

def _keys(fs=False, scenario="korinek"):
    v = _variant(fs)
    x = f"_{v}" if v else ""
    p = f"{scenario}_"
    return {"tfp": f"{p}share_shift_tfp_ramp{x}", "zfixed": f"{p}share_shift_ramp_zfixed{x}",
            "r4": f"{p}share_shift_ramp{x}_r4_"}


def parse_label(label: str) -> dict:
    """{scenario, kind (tfp|zfixed|r4_iter|continuation), variant} of a label."""
    if label == "continuation":
        return {"scenario": None, "kind": "continuation", "variant": ""}
    sid = next((g for g in ("korinek",) + UK_IDS if label.startswith(g + "_")), None)
    if sid is None:
        raise ValueError(f"no scenario prefix in {label!r}")
    rest = label[len(sid) + 1:]
    v = next((x for x in ("dnfull", "dn", "fs") if f"_{x}" in rest), "")
    kind = ("tfp" if rest.startswith("share_shift_tfp_ramp") else
            "zfixed" if rest.startswith("share_shift_ramp_zfixed") else
            "r4_iter" if "_r4_" in rest else None)
    if kind is None:
        raise ValueError(label)
    return {"scenario": sid, "kind": kind, "variant": v}


def load(outdir, closure) -> dict:
    d = Path(outdir) / closure
    if not d.exists():
        return {}
    # solve records only: not the gate, the baseline export, or the sanity
    # reports (<label>.sanity.json, whose stem "<label>.sanity" broke R4's sort)
    return {f.stem: json.loads(f.read_text()) for f in sorted(d.glob("*.json"))
            if not f.stem.startswith(("GATE", "baseline_ext")) and "." not in f.stem}


def load_base_ext(outdir, closure) -> dict:
    f = Path(outdir) / closure / "baseline_ext.json"
    if not f.exists():
        raise RuntimeError(f"{f} missing: run `surprise prepare --closure {closure}` first")
    return json.loads(f.read_text())


def calibration(base_ext, year=SURPRISE_YEAR, scenario="korinek") -> dict:
    """gamma and Z at the anchor year's baseline K and L (2027 for 2028), for
    the scenario's two arms: {"tfp": ..., "ss": ...}."""
    i = window(year)["z_anchor_year"] - START
    K, L = base_ext["series"]["K"][i], base_ext["series"]["L"][i]
    return {k: solve_scenario(s, K, L, G_BASE) for k, s in scenario_pair(scenario).items()}


def continuation_report(rec, base_ext, year=SURPRISE_YEAR) -> dict:
    """Restart vs committed baseline over START+k .. the debt-rule year (2028-36)."""
    w = window(year)
    yrs = range(year, w["debt_rule_year"] + 1)
    out, tight = {}, {}
    for v in ("Y", "K"):
        tight[v] = max(abs(gap_pct(rec, base_ext, y, v)) / 100 for y in yrs)
    dy = lambda s_, i: s_["D"][i] / s_["Y"][i]
    tight["D/Y"] = max(abs(dy(rec["series"], y - START) / dy(base_ext["series"], y - START) - 1)
                       for y in yrs)
    out["tight"] = tight
    out["tight_ok"] = all(tight[v] <= CONT_TIGHT[v] for v in CONT_TIGHT)
    out["years"] = [year, w["debt_rule_year"]]
    for v in CONT_VARS:
        out[v] = max(abs(gap_pct(rec, base_ext, y, v)) / 100 for y in yrs)
    for v in CONT_SHARE_VARS:
        out[f"{v}_share_of_Y"] = max(
            abs(rec["series"][v][y - START] - base_ext["series"][v][y - START])
            / base_ext["series"]["Y"][y - START] for y in yrs)
    out["max"] = max(v for k_, v in out.items()
                     if k_ in CONT_VARS or k_.endswith("_share_of_Y"))
    rc = rec.get("diagnostics", {}).get("rc_rel_Y_signed")
    out["rc0_rel_Y"] = abs(rc[0]) if rc else None
    out["ok"] = bool(out["tight_ok"] and out["max"] <= CONT_TOL
                     and (out["rc0_rel_Y"] is None or out["rc0_rel_Y"] <= RC0_TOL))
    return out


GATE = "GATE_continuation"


def write_gate(outdir, closure, reference="continuation", note="",
               year=SURPRISE_YEAR) -> Path:
    """Approve the continuation and FIX the gap reference for the arms.

    The planner (R4) and ``assemble`` both read the reference from this file,
    so the R4 target and the reported gaps are measured against the same path."""
    if reference not in ("baseline", "continuation"):
        raise ValueError(reference)
    done = load(outdir, closure)
    if "continuation" not in done:
        raise RuntimeError(f"{closure}: no continuation solve to approve")
    rep = continuation_report(done["continuation"], load_base_ext(outdir, closure), year)
    if not rep["ok"]:
        raise RuntimeError(f"{closure}: continuation fails its gate: {rep}")
    f = Path(outdir) / closure / f"{GATE}.json"
    f.write_text(json.dumps({"approved": True, "reference": reference, "note": note,
                             "utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                             "report": rep}, indent=1))
    return f


def read_gate(outdir, closure) -> dict | None:
    f = Path(outdir) / closure / f"{GATE}.json"
    if not f.exists():
        return None
    g = json.loads(f.read_text())
    return g if g.get("approved") is True else None


def reference_ext(outdir, closure, base_ext=None) -> dict:
    """The path gaps are measured against: the baseline or the continuation,
    as fixed by the gate.  Same shape as baseline_ext."""
    base_ext = base_ext or load_base_ext(outdir, closure)
    g = read_gate(outdir, closure)
    if g is None:
        raise RuntimeError(f"{closure}: the continuation gate is not approved "
                           f"({Path(outdir) / closure / (GATE + '.json')})")
    if g["reference"] == "baseline":
        return {**base_ext, "reference": "baseline"}
    cont = load(outdir, closure)["continuation"]
    return {**base_ext, "series": cont["series"], "reference": "continuation"}


def r4_points(done, base_ext, fs=False, year=SURPRISE_YEAR, scenario="korinek"):
    k = _keys(fs, scenario)
    if _variant(fs) == "dn":   # an arm that missed its debt path is not a point
        done = {x: r for x, r in done.items()
                if not x.endswith(("_dn",)) and "_dn_" not in x
                or r.get("dn_check", {}).get("ok")}
    keys = [k["zfixed"]] + sorted((x for x in done if x.startswith(k["r4"])),
                                  key=lambda s: int(s.rsplit("_", 1)[1]))
    r4y = window(year)["r4_year"]
    return [(math.log(done[x]["Z_terminal"]), gap_pct(done[x], base_ext, r4y), x)
            for x in keys if x in done]


def accepted_r4(done, base_ext, fs=False, year=SURPRISE_YEAR, scenario="korinek"):
    pts = [p for p in r4_points(done, base_ext, fs, year, scenario)
           if abs(p[1]) <= R4_TOL_PP]
    return done[min(pts, key=lambda p: abs(p[1]))[2]] if pts else None


def _first_slope(done, base_ext, fs, rerun_dir, closure, year, scenario="korinek"):
    """pp of R4-year GDP gap per unit ln Z for the first step: the same
    scenario's surprise common-G/Y secant (fs/dn variants), else the surprise
    korinek common secant (UK scenarios), else the committed 2026 R4 secant at
    the same closure (2030 gap, full ramp), else R4_SLOPE0.  Only the first
    step uses it; the secant takes over from the second."""
    cands = []
    if _variant(fs):
        cands.append((scenario, f"surprise {scenario} common-G/Y R4 secant"))
    if scenario != "korinek":
        cands.append(("korinek", "surprise korinek common-G/Y R4 secant"))
    for sid, src in cands:
        pts = r4_points(done, base_ext, False, year, sid)
        if len(pts) >= 2:
            (z0, g0, _), (z1, g1, _) = pts[-2], pts[-1]
            return (g1 - g0) / (z1 - z0), src
    if rerun_dir is not None:
        from . import rerun
        old = rerun.load(rerun_dir, closure)
        base = rerun.accepted_baseline(old)
        if base is not None:
            pts = rerun.r4_points(old, base)
            if len(pts) >= 2:
                (z0, g0, _), (z1, g1, _) = pts[0], pts[1]
                return (g1 - g0) / (z1 - z0), "committed 2026-start R4 secant"
    return 100 * R4_SLOPE0, f"d lnY/d lnZ = {R4_SLOPE0}"


def _hold(outdir, closure, stage, scenario):
    """Stop a running driver at a solve boundary without touching its script:
    with <outdir>/HOLD.json present, only the listed (closure, stage, scenario)
    items may be planned, unless UGAI_IGNORE_HOLD=1 (the successor driver)."""
    f = Path(outdir) / "HOLD.json"
    if os.environ.get("UGAI_IGNORE_HOLD") == "1":
        # a successor driver obeys the NEXT generation's file only
        f = Path(outdir) / "HOLD2.json"
        if os.environ.get("UGAI_IGNORE_HOLD2") == "1":
            return
    if not f.exists():
        return
    allow = [tuple(x) for x in json.loads(f.read_text()).get("allow", [])]
    if (closure, stage, scenario) not in allow:
        raise RuntimeError(f"HOLD: {closure} {stage} {scenario} is not in {f.name}'s "
                           "allow list; the successor driver takes over")


def next_step(outdir, closure, stage, rerun_dir="analysis/rerun/output",
              year=SURPRISE_YEAR, scenario="korinek"):
    from . import rerun
    _hold(outdir, closure, stage, scenario)
    base = rerun.accepted_baseline(rerun.load(rerun_dir, closure))
    if base is None:
        raise RuntimeError(f"{closure}: no accepted baseline in {rerun_dir}")
    base_ext = load_base_ext(outdir, closure)
    if base_ext["base_label"] != base["label"]:
        raise RuntimeError(f"{closure}: baseline_ext is from {base_ext['base_label']}, "
                           f"the accepted baseline is {base['label']}")
    done = load(outdir, closure)
    common = {"base_label": base["label"], "alpha_G": base["alpha_G_used"],
              "surprise_year": year}
    if stage == "continuation":
        if "continuation" in done:
            return None
        return {"label": "continuation", "arm": "continuation", "gamma": G_BASE,
                "Z": None, "baseline_spending": False,
                "why": "no-shock restart: must reproduce the baseline from "
                       f"{year} to 2036 (Y, K, D/Y within {CONT_TIGHT['Y']:g})", **common}
    if "continuation" not in done:
        raise RuntimeError(f"{closure}: run the continuation stage first")
    rep = continuation_report(done["continuation"], base_ext, year)
    if not rep["ok"]:
        raise RuntimeError(f"{closure}: the continuation misses the baseline: "
                           f"tight {rep['tight']} (tol {CONT_TIGHT}), other max "
                           f"{rep['max']:.2e} (tol {CONT_TOL:g}), RC/Y "
                           f"{rep['rc0_rel_Y']} (tol {RC0_TOL:g}): {rep}")
    ref = reference_ext(outdir, closure, base_ext)
    if stage not in STAGE_VARIANT:
        raise ValueError(f"unknown stage {stage!r}")
    fs = STAGE_VARIANT[stage]
    common["baseline_spending"] = fs == "fs"
    common["variant"] = fs
    common["scenario"] = scenario
    cal = calibration(base_ext, year, scenario)   # Z anchor: always the baseline's 2027
    gain = scenario_grid()[scenario]["tfp_gain"]
    k = _keys(fs, scenario)
    ay = window(year)["z_anchor_year"]
    if k["tfp"] not in done:
        return {"label": k["tfp"], "arm": f"{scenario}_share_shift_tfp",
                "Z": cal["tfp"]["Z"], "gamma": cal["tfp"]["gamma"],
                "why": f"fixed-input Z ({gain:+.2%} at baseline {ay} K, L)", **common}
    if fs == "dnfull":
        return None          # the referee's extra solve is the tfp arm only
    ss = cal["ss"]
    if k["zfixed"] not in done:
        return {"label": k["zfixed"], "arm": f"{scenario}_share_shift", "Z": ss["Z"],
                "gamma": ss["gamma"], "why": f"fixed-input Z (zero wedge at {ay} K, L); "
                "R4 secant point 0", **common}
    if accepted_r4(done, ref, fs, year, scenario) is not None:
        return None
    pts = r4_points(done, ref, fs, year, scenario)
    n = len(pts) - 1
    if n >= MAX_R4_ITER:
        raise RuntimeError(f"{closure}: R4 did not converge in {MAX_R4_ITER}: {pts}")
    if len(pts) == 1:
        slope, src = _first_slope(done, ref, fs, rerun_dir, closure, year, scenario)
        lz = pts[0][0] - pts[0][1] / slope
        why = f"Newton step, {src} ({slope:.1f} pp per unit ln Z)"
    else:
        (z0, g0, _), (z1, g1, _) = pts[-2], pts[-1]
        slope = (g1 - g0) / (z1 - z0)
        lz = z1 - g1 / slope
        why = f"secant, d gap(pp)/d lnZ = {slope:.1f}"
    return {"label": f"{k['r4']}{n + 1}", "arm": f"{scenario}_share_shift",
            "Z": float(math.exp(lz)), "gamma": ss["gamma"], "why": why, **common}


# --- prepare (dry run: pickles and JSON only, no specs, no solve) -------------------

def prepare(rerun_dir, outdir, closure, work, year=SURPRISE_YEAR, write=True) -> dict:
    """Export the baseline to 2036 from its TPI pickle and check the restart state.

    Reads only ``<work>/<closure>/<base_label>/TPI/TPI_vars.pkl`` and the
    committed baseline JSON: no specifications are built, nothing is solved."""
    import pickle

    from . import rerun
    from .solve import EXPORT
    base = rerun.accepted_baseline(rerun.load(rerun_dir, closure))
    if base is None:
        raise RuntimeError(f"{closure}: no accepted baseline in {rerun_dir}")
    k = k_of(year)
    pk = Path(work) / closure / base["label"] / "TPI" / "TPI_vars.pkl"
    with open(pk, "rb") as f:
        tpi = pickle.load(f)
    T = len(np.asarray(tpi["Y"]))
    ext = series_from_tpi(tpi, T, NEXP_SURPRISE, EXPORT)
    checks = {}
    # 1. the pickle is the committed baseline: its first 10 years equal the JSON
    checks["pickle_equals_json_max_abs_rel"] = max(
        float(np.max(np.abs(np.asarray(ext[v][:10]) / np.asarray(base["series"][v][:10]) - 1)))
        for v in ("Y", "K", "L", "C", "D", "B", "r", "w") if v in base["series"])
    # 2. the wealth handed over is the wealth the baseline cohorts carry into k
    b_s, b_sp1 = np.asarray(tpi["b_s"], float), np.asarray(tpi["b_sp1"], float)
    checks["b_s_k_equals_b_sp1_km1_max_abs"] = float(
        np.max(np.abs(b_s[k][1:] - b_sp1[k - 1][:-1])))
    # 3. K_d = B - D_d at k (the predetermined domestic capital)
    st = baseline_state(tpi, k)
    checks["K_d_eq_B_minus_D_d_rel"] = abs((st["B"] - st["D_d"]) / st["K_d"] - 1)
    # 4. Z at three anchors
    zs = {}
    for ay in (START, START + 1, START + 2):
        i = ay - START
        cal = {n: solve_scenario(s, ext["K"][i], ext["L"][i], G_BASE)
               for n, s in SCENARIOS.items()}
        zs[ay] = {n: c["Z"] for n, c in cal.items()}
    st_out = {k_: v for k_, v in st.items() if not k_.endswith("_path")}
    st_out["initial_b_sum"] = float(np.asarray(st["initial_b"]).sum())
    st_out.pop("initial_b"); st_out.pop("initial_n")
    st_out["BQ"] = np.asarray(st["BQ"]).tolist()
    out = {"base_label": base["label"], "closure": closure, "surprise": window(year),
           "years_series": list(range(START, START + NEXP_SURPRISE)),
           "series": ext, "state_at_k": st_out, "checks": checks,
           "Z_by_anchor_year": zs,
           "debt_gdp_pct": [ext["D"][i] / ext["Y"][i] * 100 for i in range(NEXP_SURPRISE)],
           "utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    if write:
        f = Path(outdir) / closure / "baseline_ext.json"
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps(out, indent=1))
    return out


# --- spec dry run (HEAVY: builds one OG-UK specification, ~15 GB; no solve) --------

def check_specs(work, rerun_dir="analysis/rerun/output", closure="zk0.1",
                year=SURPRISE_YEAR, closures=("zk0.1", "zk0")) -> dict:
    """Build one specification exactly as a surprise solve would (guard, R2
    fixes, shift, ramp), stop before SS, and check every closure's 2028 state
    on it.  One build covers both closures: B0 and BQ0 depend only on the
    demographics and the handed-over wealth, and the closures differ only in
    zeta_K.  Raises on the first failed check (ShiftError, law of motion)."""
    from . import rerun
    from .solve import _load_oguk, run_arm
    rerun._env()
    from ogcore import aggregates as aggr
    handles = _load_oguk()
    k = k_of(year)
    states = {}
    for c in closures:
        base = rerun.accepted_baseline(rerun.load(rerun_dir, c))
        states[c] = (base, load_baseline_state(str(Path(work) / c / base["label"]), k))
    base, st = states[closure]
    gamma = solve_scenario(SCENARIOS["share_shift_tfp"], 2.0, 0.4, G_BASE)["gamma"]
    out = run_arm(f"{closure} surprise{year} check-specs", gamma, True, 0.97,
                  str(Path(work) / closure / base["label"]), None, handles,
                  alpha_G=base["alpha_G_used"], out_dir=str(Path(work) / "surprise_check"),
                  zeta_K=rerun.CLOSURES[closure], pretp=True, splice=True,
                  surprise=st, stop_before_ss=True)
    p = out["p"]
    rep = {"built_for": closure, "shift": out["surprise"]["shift"],
           "law_of_motion_after_shift_max": max(
               x["max_abs_rel"] for x in out["surprise"]["law_of_motion_after_shift"]),
           "tG1": int(p.tG1), "start_year": int(p.start_year),
           "ramp_weight_first5": ((np.asarray(p.gamma).ravel()[:5] - G_BASE)
                                  / (gamma - G_BASE)).tolist(),
           "states": {c: state_check(p, s_, aggr.get_B, aggr.get_BQ)
                      for c, (_, s_) in states.items()}}
    return rep


# --- one solve ---------------------------------------------------------------------

def run_step(outdir, closure, stage, work, rerun_dir="analysis/rerun/output",
             year=SURPRISE_YEAR, scenario="korinek") -> dict | None:
    from . import rerun
    spec = next_step(outdir, closure, stage, rerun_dir, year, scenario)
    if spec is None:
        print(f"{closure} {stage}: nothing to do", flush=True)
        return None
    rerun._env()
    from .solve import _load_oguk, provenance, run_arm
    handles = _load_oguk()
    TPI, SS, api, Client, LocalCluster = handles
    k = k_of(year)
    bdir = Path(work) / closure / spec["base_label"]
    if not (bdir / "TPI" / "TPI_vars.pkl").exists():
        raise RuntimeError(f"baseline pickles missing at {bdir}")
    state = load_baseline_state(str(bdir), k)
    adir = Path(work) / f"surprise{year}" / closure / spec["label"]
    settings = {"tG1": TG1, "g_y_annual": G_Y_ANNUAL, "g_n_source": "vendored",
                "zeta_K": rerun.CLOSURES[closure], "pretp": True, "splice": True}
    client = Client(LocalCluster(processes=False, n_workers=1, threads_per_worker=4,
                                 dashboard_address=None))
    print(f"{closure} surprise {year} {stage}: {spec['label']} ({spec['why']})", flush=True)
    try:
        shock = spec["Z"] is not None
        dn = None
        if spec.get("variant") == "dn":
            ref = reference_ext(outdir, closure)
            dn = {"target_dy": dn_target(ref, k), "D0": state["D0"]}
        elif spec.get("variant") == "dnfull":
            # the restart's debt/GDP for every run period, from its own TPI pickle
            import pickle
            cdir = Path(work) / f"surprise{year}" / closure / "continuation"
            ct = pickle.load(open(cdir / "TPI" / "TPI_vars.pkl", "rb"))
            dy = (np.asarray(ct["D"], float) / np.asarray(ct["Y"], float)).tolist()
            dn = {"target_dy": dy, "D0": state["D0"], "full": True}
        rec = run_arm(f"{closure} surprise{year} {spec['label']}", spec["gamma"], shock,
                      spec["Z"], str(bdir), client, handles, alpha_G=spec["alpha_G"],
                      out_dir=str(adir), baseline_spending=spec["baseline_spending"],
                      surprise=state, nexp=NEXP_SURPRISE - k, debt_neutral=dn,
                      **settings)
    finally:
        client.close()
    base_ext = load_base_ext(outdir, closure)
    rec["surprise"]["predetermined"] = predetermined_check(rec["series"], state)
    rec = calendar_record(rec, base_ext, k, year)
    rec.update({"label": spec["label"], "closure_label": closure, "stage": stage,
                "spec": spec, "provenance": provenance(TPI, api)})
    if stage == "continuation":
        rec["continuation_report"] = continuation_report(rec, base_ext, year)
    if spec.get("variant") == "dnfull":
        import pickle
        rt = pickle.load(open(adir / "TPI" / "TPI_vars.pkl", "rb"))
        Y, D, G = (np.asarray(rt[v], float) for v in ("Y", "D", "G"))
        n = len(dn["target_dy"]) - 1
        err = D[1:n] / Y[1:n] / np.asarray(dn["target_dy"][1:n]) - 1
        gerr = np.abs(G[:n] / Y[:n] - spec["alpha_G"])
        rec["dn_check_full"] = {
            "periods": [year + 1, year + n - 1], "max_abs_rel": float(np.abs(err).max()),
            "g_share_max_abs_dev": float(gerr.max()), "tol": DN_TOL,
            "ok": bool(np.abs(err).max() <= DN_TOL and gerr.max() <= DNFULL_G_TOL)}
        rec["dn_check"] = {**dn_check(rec, reference_ext(outdir, closure), year),
                           "full_horizon": rec["dn_check_full"]}
        rec["dn_check"]["ok"] = rec["dn_check"]["ok"] and rec["dn_check_full"]["ok"]
        print(f"  debt-neutral to the horizon: max |D/Y error| "
              f"{rec['dn_check_full']['max_abs_rel']:.2e}, max |G/Y - alpha_G| "
              f"{rec['dn_check_full']['g_share_max_abs_dev']:.1e}", flush=True)
    if spec.get("variant") == "dn":
        rec["dn_check"] = dn_check(rec, reference_ext(outdir, closure), year)
        print(f"  debt-neutral: max |D/Y error| {rec['dn_check']['max_abs_rel']:.2e} "
              f"(tol {DN_TOL:g})", flush=True)
    out = Path(outdir) / closure / f"{spec['label']}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp")
    tmp.write_text(json.dumps(rec, indent=1))
    tmp.replace(out)
    print(f"wrote {out}", flush=True)
    return rec


# --- results file ----------------------------------------------------------------------

def assemble(outdir, closure, fs=False, rerun_dir="analysis/rerun/output",
             year=SURPRISE_YEAR, scenario="korinek") -> dict:
    """The results file for one closure on the 2027-2031 window.

    The gap reference is the one fixed in the continuation gate: "baseline"
    (the committed baseline) or "continuation" (the no-shock restart from 2028,
    which removes the restart's own solver error from every gap).  Either way
    2026-27 are the baseline's, exactly."""
    from . import rerun
    w = window(year)
    base = rerun.accepted_baseline(rerun.load(rerun_dir, closure))
    base_ext = load_base_ext(outdir, closure)
    done = load(outdir, closure)
    cont = done.get("continuation")
    fs = _variant(fs)
    k = _keys(fs, scenario)
    ref = reference_ext(outdir, closure, base_ext)
    reference = ref["reference"]
    tfp, ss = done.get(k["tfp"]), accepted_r4(done, ref, fs, year, scenario)
    if fs == "dn":
        bad = [r.get("label", "?") for r in (tfp, ss) if r and not r.get("dn_check", {}).get("ok")]
        if bad:
            raise RuntimeError(f"{closure}: debt-neutral arms off their debt path: {bad}")
    if cont is None or tfp is None or ss is None:
        raise RuntimeError(f"{closure}: incomplete (continuation {bool(cont)}, tfp "
                           f"{bool(tfp)}, share_shift R4 {bool(ss)})")
    i0 = w["report_years"][0] - START
    ref_series = ref["series"]
    baseline = {**{key: v for key, v in base.items() if key != "provenance"},
                "series": ref_series, "years_series": base_ext["years_series"],
                "years": w["report_years"]}
    for v, x in ref_series.items():
        baseline[v] = x[i0: i0 + NPER_SURPRISE]
    strip = lambda r: {key: v for key, v in r.items() if key != "provenance"}
    arms = {"share_shift_tfp_ramp": strip(tfp), "share_shift_ramp": strip(ss)}
    cal = calibration(base_ext, year, scenario)
    grid = scenario_grid()
    # Red flag 4 (#37): debt depends on the spending rule.  Record the other
    # convention's debt/GDP path for each arm wherever it has been solved.
    conventions = {}
    for v in ("", "fs", "dn"):
        kv = _keys(v, scenario)
        t_, s_ = done.get(kv["tfp"]), accepted_r4(done, ref, v, year, scenario)
        conventions[v or "common"] = {
            arm: ({"label": r.get("label"),
                   "debt_gdp_pct": [r["series"]["D"][i] / r["series"]["Y"][i] * 100
                                    for i in range(len(r["series"]["Y"]))]}
                  if r is not None else None)
            for arm, r in (("share_shift_tfp_ramp", t_), ("share_shift_ramp", s_))}
    return {
        "provenance": {**base["provenance"],
                       "assembled_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                       "note": f"Unanticipated shock announced at the start of {year} "
                               "(docs/surprise_2028.md); every solve's record is in "
                               f"{outdir}/{closure}"},
        "window": w, "years": w["report_years"],
        "arms_requested": list(arms), "arm_status": {a: "ok" for a in arms},
        "baseline": baseline, **arms,
        "assumptions": {
            "timing": f"unanticipated, announced at the start of {year}; every arm equals "
                      f"the baseline in {START}-{year - 1}",
            "gap_reference": reference,
            "continuation_report": cont.get("continuation_report"),
            "ramp_weights": calendar_weights(year),
            "scenario": scenario, "scenario_targets": grid[scenario],
            "gamma_base": G_BASE, "gamma_shocked": cal["tfp"]["gamma"],
            "Z_anchor_year": w["z_anchor_year"],
            "Z_share_shift_tfp": tfp["Z_terminal"], "Z_share_shift": ss["Z_terminal"],
            "Z_share_shift_fixed_input": done[k["zfixed"]]["Z_terminal"],
            "Z_share_shift_rule": "equilibrium_gdp_gap", "Z_share_shift_year": w["r4_year"],
            "Z_share_shift_tol_pp": R4_TOL_PP,
            "r4_post_target_gdp_gap_pct": {
                y: gap_pct(ss, ref, y) for y in range(w["r4_year"] + 1,
                                                       START + len(ref["series"]["Y"]))},
            "r4_iterations": [{"label": lab, "Z": math.exp(lz), "gdp_gap_pct": g}
                              for lz, g, lab in r4_points(done, ref, fs, year, scenario)],
            "debt_by_fiscal_convention": conventions,
            "fiscal": VARIANTS[fs], "fiscal_variant": fs or "common",
            "delta": DELTA_ANNUAL,
            "NNI": "GNI - delta * K, delta the model's per-period (annual) depreciation",
            "closure": rerun.closure_record(base, closure),
            "tG1": TG1, "debt_rule_year": w["debt_rule_year"],
        },
    }
