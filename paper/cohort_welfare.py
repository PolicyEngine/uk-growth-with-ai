"""Consumption-equivalent welfare by birth cohort and lifetime-earnings type.

Reads the household paths the R1-R4 solves exported
(``analysis/rerun/cohorts/<closure>/<label>.npz``; see that directory's
README.json and ``analysis/rerun/export_cohorts.py``) and the household
parameters (``<closure>/params.npz``).  Numpy only; no model solve.

Utility (OG-Core 0.17.0 ``household.py``, detrended by e^{g_y t}).  A household
of type j at age s in period t gets the flow

    u = c^{1-sigma}/(1-sigma)
        + chi_n[t,s] * b * (1 - (n/ltilde)^upsilon)^{1/upsilon}        (leisure)
        + rho[t,s] * chi_b[j] * e^{g_y(1-sigma)} * b'^{1-sigma}/(1-sigma)   (warm-glow bequest)

and discounts k periods ahead by beta_j^k * prod(1 - rho) * e^{k g_y (1-sigma)}.
The bequest weight and the growth factor are the ones that reproduce OG-Core's
savings Euler equation, c^{-sigma} = e^{-sigma g_y}[chi_b rho b'^{-sigma} +
beta (1-rho)(1+r') c'^{-sigma}].  Constants that do not depend on the arm are
dropped; they cancel.

The consumption-equivalent variation lambda is the constant proportional change
in the baseline's consumption and bequests in every remaining period (labour
supply held at its baseline values) that gives the scenario's remaining
lifetime utility (``measure="joint"``, the paper's measure):

    (1+lambda)^{1-sigma} (C_B + Q_B) + N_B = U_S

``measure="consumption"`` scales consumption alone, (1+lambda)^{1-sigma} C_B +
N_B + Q_B = U_S.  With OG-UK's warm-glow weight (chi_b = 80) remaining bequest
utility exceeds remaining consumption utility for older households, so that
measure converts their bequest gains into consumption at a rate several times
the joint one; it is reported as a sensitivity only.

Cohorts alive in 2026 are measured over their remaining lives from 2026 (the
announcement), later cohorts over their whole lives.  Each arm is measured
against the baseline solved at the same closure.

The exported transition path has T = 60 periods (2026-2085) and does not reach
the steady state by its end (consumption is still ~9 per cent from it), and the
last period carries the solver's terminal residual.  Periods t >= T_USE are
therefore filled by a continuation.  ``continuation`` selects it:

    "hold"  repeat each arm's t = T_USE - 1 cross-section (age profile) [central]
    "ss"    the arm's steady-state profiles

Cohorts whose remaining life ends before T_USE do not depend on the choice.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
COHORTS = ROOT / "analysis" / "rerun" / "cohorts"
CLOSURES = ("zk0.1", "zk0")
START_YEAR = 2026
FIRST_AGE = 20          # OG-UK: E = 20, ages 20-99 are the S = 80 model ages
T_USE = 59              # periods 0..58; t = 59 carries the terminal residual
# lifetime-earnings groups, percentiles of lifetime income (lambdas 0.25 0.25 0.2 0.1 0.1 0.09 0.01)
TYPE_LABELS = ("0--25", "25--50", "50--70", "70--80", "80--90", "90--99", "top 1")


class WelfareError(SystemExit):
    def __init__(self, msg: str):
        super().__init__(f"cohort_welfare: {msg}")


def files(closure: str) -> dict:
    """Arm -> npz label, from the export's README (R4 arm, not the fixed-input one)."""
    readme = json.loads((COHORTS / "README.json").read_text())["files"][closure]
    return {"baseline": readme["baseline"],
            "share_shift_tfp_ramp": readme["share_shift_tfp"],
            "share_shift_ramp": readme["share_shift (R4 Z, the results-file arm)"]}


def load(closure: str):
    p = COHORTS / closure / "params.npz"
    if not p.is_file():
        raise WelfareError(f"{p} missing (household parameters; written by "
                           "analysis/rerun/export_cohorts.py --params)")
    par = {k: np.asarray(v, dtype=float) for k, v in np.load(p).items()}
    if abs(float(par["zeta_K"][0]) - {"zk0.1": 0.1, "zk0": 0.0}[closure]) > 1e-12:
        raise WelfareError(f"{p} is not zeta_K for {closure}")
    arms = {}
    for arm, label in files(closure).items():
        f = COHORTS / closure / f"{label}.npz"
        if not f.is_file():
            raise WelfareError(f"{f} missing")
        arms[arm] = {k: np.asarray(v, dtype=float) for k, v in np.load(f).items()}
    return par, arms


def extend(d: dict, continuation: str, horizon: int) -> dict:
    """c, n, b' on periods 0..horizon-1, filling t >= T_USE by the continuation."""
    S = d["c"].shape[1]
    ss_bsp1 = np.vstack([d["ss_b_s"][1:], d["b_sp1"][T_USE - 1, -1:]])  # last age: no SS export
    out = {}
    for k, ss in (("c", d["ss_c"]), ("n", d["ss_n"]), ("b_sp1", ss_bsp1)):
        x = np.empty((horizon, S, d["c"].shape[2]))
        x[:T_USE] = d[k][:T_USE]
        fill = {"hold": d[k][T_USE - 1], "ss": ss}[continuation]
        x[T_USE:] = fill
        out[k] = x
    return out


def flows(par: dict, x: dict, horizon: int) -> tuple:
    """Per-period utility components (C, N, Q), each (horizon, S, J)."""
    sig, gy = float(par["sigma"]), float(par["g_y"])
    c, n, bp = x["c"], x["n"], x["b_sp1"]
    if (c <= 0).any() or (n <= 0).any() or (n >= par["ltilde"]).any() or (bp <= 0).any():
        raise WelfareError("consumption, labour or bequests outside the utility's domain")
    C = c ** (1 - sig) / (1 - sig)
    ups = float(par["upsilon"])
    N = (par["chi_n"][:horizon, :, None] * float(par["b_ellipse"])
         * (1 - (n / float(par["ltilde"])) ** ups) ** (1 / ups))
    Q = (par["rho"][:horizon, :, None] * par["chi_b"][None, None, :] * np.exp(gy * (1 - sig))
         * bp ** (1 - sig) / (1 - sig))
    return C, N, Q


def lifetime(par: dict, comp: tuple, t0: int, s0: int) -> np.ndarray:
    """Discounted remaining-life sums of (C, N, Q) for the cohort at age s0 in t0: (3, J)."""
    sig, gy = float(par["sigma"]), float(par["g_y"])
    beta = par["beta"]
    S = comp[0].shape[1]
    tot = np.zeros((3, comp[0].shape[2]))
    surv = np.ones_like(beta)
    for k in range(S - s0):
        t, s = t0 + k, s0 + k
        w = beta ** k * surv * np.exp(k * gy * (1 - sig))
        for i in range(3):
            tot[i] += w * comp[i][t, s]
        surv = surv * (1 - par["rho"][t, s])
    return tot


def cev(closure: str, continuation: str = "hold", measure: str = "joint",
        scale: dict | None = None) -> dict:
    """lambda (per cent) by cohort for each arm: {arm: (ages_2026_or_birth, (cohorts, J))}.

    Cohorts: everyone alive in 2026 (ages 20-99), then those entering at 20 in
    2027..2086 (the last whose lives fit the parameter rows).  ``scale`` is for tests: {arm: factor} multiplies that arm's
    consumption and bequests."""
    par, arms = load(closure)
    S = int(par["S"])
    horizon = par["chi_n"].shape[0]   # T + S = 140 rows of chi_n and rho
    comps = {}
    for arm, d in arms.items():
        x = extend(d, continuation, horizon)
        if scale and arm in scale:
            x["c"] = x["c"] * scale[arm]
            x["b_sp1"] = x["b_sp1"] * scale[arm]
        comps[arm] = flows(par, x, horizon)
    sig = float(par["sigma"])
    starts = [(0, s0) for s0 in range(S - 1, -1, -1)] + [(t0, 0) for t0 in range(1, horizon - S + 1)]
    birth = np.array([START_YEAR + t0 - FIRST_AGE - s0 for t0, s0 in starts])
    out = {"birth_year": birth, "par": par}
    base = np.array([lifetime(par, comps["baseline"], t0, s0) for t0, s0 in starts])
    for arm in ("share_shift_tfp_ramp", "share_shift_ramp"):
        U = np.array([lifetime(par, comps[arm], t0, s0) for t0, s0 in starts]).sum(axis=1)
        CB, NB, QB = base[:, 0], base[:, 1], base[:, 2]
        if measure == "joint":
            ratio = (U - NB) / (CB + QB)
        elif measure == "consumption":
            ratio = (U - NB - QB) / CB
        else:
            raise ValueError(measure)
        if (ratio <= 0).any():
            raise WelfareError(f"{closure} {arm}: no consumption scaling reaches the scenario's utility")
        out[arm] = (ratio ** (1 / (1 - sig)) - 1) * 100
    return out


def components(closure: str, continuation: str = "hold") -> dict:
    """The joint CEV when one part of utility at a time takes its scenario path.

    {arm: {"consumption" | "leisure" | "bequests": (cohorts, J)}}, on the same
    cohorts as ``cev``.  Each entry is the consumption-and-bequest equivalent of
    switching that part alone (consumption, labour supply, or assets carried
    forward) from the baseline's path to the scenario's.  The three do not sum
    exactly to the joint figure (the measure is not linear), and they describe
    the form in which households take the change, not its cause: labour supply
    and saving are choices."""
    par, arms = load(closure)
    S = int(par["S"])
    horizon = par["chi_n"].shape[0]
    comps = {arm: flows(par, extend(d, continuation, horizon), horizon) for arm, d in arms.items()}
    sig = float(par["sigma"])
    starts = [(0, s0) for s0 in range(S - 1, -1, -1)] + [(t0, 0) for t0 in range(1, horizon - S + 1)]
    base = np.array([lifetime(par, comps["baseline"], t0, s0) for t0, s0 in starts])
    CB, NB, QB = base[:, 0], base[:, 1], base[:, 2]
    out = {}
    for arm in ("share_shift_tfp_ramp", "share_shift_ramp"):
        A = np.array([lifetime(par, comps[arm], t0, s0) for t0, s0 in starts])
        lam = lambda U: (((U - NB) / (CB + QB)) ** (1 / (1 - sig)) - 1) * 100
        out[arm] = {"consumption": lam(A[:, 0] + NB + QB),
                    "leisure": lam(CB + A[:, 1] + QB),
                    "bequests": lam(CB + NB + A[:, 2])}
    return out


def group_accounts(closure: str, w: float, r: float, year: int) -> dict:
    """Baseline cross-section in `year` by lifetime-earnings group, all ages.

    Shares of household wealth and of gross labour earnings held by each group,
    and each group's gross income by source (labour w*e*n, capital r*b, lump-sum
    transfers, bequests received), before tax.  `w` and `r` are the results
    file's wage and household return for that year (same detrended units)."""
    par, arms = load(closure)
    b = arms["baseline"]
    t = year - START_YEAR
    lam = type_weights(par)
    om = par["omega"][t][:, None]
    per_head = lambda x: (om * x).sum(axis=0)
    wealth = per_head(b["b_s"][t])
    lab = per_head(w * par["e"][t] * b["n"][t])
    cap = per_head(r * b["b_s"][t])
    tr, bq = per_head(b["tr"][t]), per_head(b["bq"][t])
    tot = lab + cap + tr + bq
    return {"wealth_share": wealth * lam / (wealth @ lam) * 100,
            "earnings_share": lab * lam / (lab @ lam) * 100,
            "labour": lab / tot * 100, "capital": cap / tot * 100,
            "transfers": tr / tot * 100, "bequests": bq / tot * 100,
            "labour_total": float(lab @ lam), "wealth_total": float(wealth @ lam)}


def type_weights(par: dict) -> np.ndarray:
    return par["lambdas"].ravel()


def population_weights(par: dict, birth: np.ndarray) -> np.ndarray:
    """Weight of each cohort alive in 2026: its 2026 population share (omega[0, s])."""
    w = np.zeros(len(birth))
    ages = START_YEAR - birth
    alive = (ages >= FIRST_AGE) & (ages < FIRST_AGE + int(par["S"]))
    w[alive] = par["omega"][0, ages[alive] - FIRST_AGE]
    return w / w.sum()


def aggregate_consumption_gap(closure: str, arm: str, year: int) -> float:
    """omega x lambdas weighted consumption gap in `year`, to tie the npz to the results file."""
    par, arms = load(closure)
    t = year - START_YEAR
    w = par["omega"][t][:, None] * type_weights(par)[None, :]
    agg = lambda d: float((w * d["c"][t]).sum())
    return (agg(arms[arm]) / agg(arms["baseline"]) - 1) * 100


if __name__ == "__main__":
    import sys
    np.set_printoptions(precision=2, suppress=True, linewidth=160)
    cont = sys.argv[1] if len(sys.argv) > 1 else "hold"
    for cl in CLOSURES:
        r = cev(cl, cont)
        b = r["birth_year"]
        for arm in ("share_shift_tfp_ramp", "share_shift_ramp"):
            print(cl, arm, cont)
            for yr in (1927, 1936, 1946, 1956, 1966, 1976, 1986, 1996, 2006, 2016, 2026, 2046, 2066):
                i = int(np.where(b == yr)[0][0])
                print(f"  born {yr} (age {2026 - yr} in 2026):", r[arm][i])
