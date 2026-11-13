"""Consumption-equivalent welfare by birth cohort and lifetime-earnings group,
2028-surprise design (docs/surprise_2028.md, "Cohort paths for the welfare results").

Reads the household paths exported by ``analysis/surprise/export_cohorts.py``
(``analysis/surprise/cohorts/<closure>/<label>.npz``: c, n, b_s, b_sp1, bq, tr by
calendar period from 2026, age 20-99 and lifetime-earnings group, plus the run's
steady state) and the household parameters (``<closure>/params.npz``, on the
same calendar).  Numpy only; no model solve.

Utility (OG-Core 0.17.0 ``household.py``, detrended by e^{g_y t}).  A household
of group j at age s in period t gets the flow

    u = c^{1-sigma}/(1-sigma)
        + chi_n[t,s] * b * (1 - (n/ltilde)^upsilon)^{1/upsilon}             (leisure)
        + rho[t,s] * chi_b[j] * e^{g_y(1-sigma)} * b'^{1-sigma}/(1-sigma)   (warm-glow bequest)

and discounts k periods ahead by beta_j^k * prod(1 - rho) * e^{k g_y (1-sigma)},
the weights that reproduce OG-Core's savings Euler equation.  Constants that
do not depend on the run are dropped; they cancel.

The headline measure (#27, decision of 12 Nov 2026) is ``measure="joint"``: the
constant proportional change lambda in the reference path's consumption AND
bequests in every remaining period, labour supply held at the reference path,
that gives the scenario's remaining lifetime utility:

    (1+lambda)^{1-sigma} (C_R + Q_R) + N_R = U_S

``measure="consumption"`` scales consumption alone, (1+lambda)^{1-sigma} C_R +
N_R + Q_R = U_S, and is the sensitivity.  It has no solution when a cohort's
scenario utility is below what zero consumption would give; such cells are
NaN and are counted, not hidden.

* Reference: the gated no-shock continuation of the same closure
  (``continuation.npz``), never the committed baseline.
* Timing: AI is announced, unanticipated, at the start of 2028 (t = 2).  2026-27
  are identical by construction (checked), and the 2028 starting wealth is the
  continuation's (checked).  Cohorts alive in 2028 (ages 20-99) are measured
  over their remaining lives from 2028; later cohorts (entering at 20 from 2029)
  over their whole lives.
* Arms (UK central): "automation + productivity" (``tfp``), "automation,
  technology unchanged" (``zfixed``) and the "OBR-style stress test" (the
  accepted R4 iteration, ``surprise.accepted_r4``).  Variants: debt-neutral
  transfers (``dn``, the headline: households bear the fiscal cost) and the
  common rule ("", comparison).
* Horizon: the export holds 60 periods (2026-2085), i.e. run periods 0-57; the
  run's terminal periods (2086-87) are not in it, so all 60 are used.  Later
  periods are filled by a continuation: "hold" (each run's 2085 age profile,
  central) or "ss" (each run's steady state), a sensitivity.  Cohorts whose
  lives end by 2085 do not depend on it.
"""

from __future__ import annotations

import json
import math
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from uk_growth_with_ai import surprise as sp  # noqa: E402

COHORTS = ROOT / "analysis" / "surprise" / "cohorts"
OUTDIR = ROOT / sp.OUTDIR
CLOSURES = ("zk0.1", "zk0")
ZETA = {"zk0.1": 0.1, "zk0": 0.0}
START_YEAR = 2026
SHOCK_YEAR = sp.window()["surprise_year"]       # 2028
T0 = SHOCK_YEAR - START_YEAR                    # 2
DEBT_RULE = sp.window()["debt_rule_year"]       # 2036
FIRST_AGE = 20
T_USE = 60
SCENARIO = "uk_central"
ARMS = ("tfp", "zfixed", "stress")
VARIANTS = ("dn", "")
ARM_LABEL = {"tfp": "Automation + productivity",
             "zfixed": "Automation, technology unchanged",
             "stress": "OBR-style stress test: no output gain"}
VARIANT_LABEL = {"dn": "Debt-neutral transfers", "": "Common fiscal rule"}
GROUPS = ("0-25", "25-50", "50-70", "70-80", "80-90", "90-99", "Top 1")
RECON_YEARS = range(SHOCK_YEAR, DEBT_RULE + 1)  # 2028-2036
RECON_TOL_PP = 5e-5                              # "about 4 decimals" of a per-cent gap


class WelfareError(SystemExit):
    def __init__(self, msg: str):
        super().__init__(f"cohort_welfare: {msg}")


# --- inputs -------------------------------------------------------------------

@lru_cache(maxsize=None)
def records(closure: str) -> tuple:
    """(done, ref): the per-solve records and the gated reference (continuation)."""
    ref = sp.reference_ext(OUTDIR, closure)
    if ref.get("reference") != "continuation":
        raise WelfareError(f"{closure}: gap reference is {ref.get('reference')}, not the continuation")
    return sp.load(OUTDIR, closure), ref


def labels(closure: str) -> dict:
    """{(variant, arm): label} for UK central, the accepted R4 taken from the records."""
    done, ref = records(closure)
    out = {}
    for v in VARIANTS:
        k = sp._keys(v, SCENARIO)
        r4 = sp.accepted_r4(done, ref, v, scenario=SCENARIO)
        if r4 is None:
            raise WelfareError(f"{closure}: no accepted R4 for {SCENARIO} {v or 'common'}")
        out[(v, "tfp")], out[(v, "zfixed")], out[(v, "stress")] = k["tfp"], k["zfixed"], r4["label"]
        for a in ARMS:
            rec = done.get(out[(v, a)])
            if rec is None:
                raise WelfareError(f"{closure}: record {out[(v, a)]} missing")
            if v == "dn" and not (rec.get("dn_check") or {}).get("ok"):
                raise WelfareError(f"{closure}: {out[(v, a)]} fails its debt-neutral check")
    return out


@lru_cache(maxsize=None)
def load(closure: str):
    p = COHORTS / closure / "params.npz"
    if not p.is_file():
        raise WelfareError(f"{p} missing")
    par = {k: np.asarray(v, dtype=float) for k, v in np.load(p).items()}
    if abs(float(np.ravel(par["zeta_K"])[0]) - ZETA[closure]) > 1e-12:
        raise WelfareError(f"{p} is not zeta_K = {ZETA[closure]}")
    runs = {}
    for key, label in [(None, "continuation")] + list(labels(closure).items()):
        f = COHORTS / closure / f"{label}.npz"
        if not f.is_file():
            raise WelfareError(f"{f} missing (run analysis/surprise/export_cohorts.py)")
        runs[key] = {k: np.asarray(v, dtype=float) for k, v in np.load(f).items()}
    ref = runs[None]
    for key, d in runs.items():
        for k in ("c", "n", "b_s", "b_sp1", "bq", "tr"):
            if not np.array_equal(d[k][:T0], ref[k][:T0]):
                raise WelfareError(f"{closure} {key}: {k} differs from the continuation in 2026-27")
        if not np.array_equal(d["b_s"][T0], ref["b_s"][T0]):
            raise WelfareError(f"{closure} {key}: 2028 starting wealth differs from the continuation")
    return par, runs


# --- utility --------------------------------------------------------------------

def extend(d: dict, continuation: str, horizon: int) -> dict:
    """c, n, b' on calendar periods 0..horizon-1, filling t >= T_USE."""
    S, J = d["c"].shape[1:]
    ss_bsp1 = np.vstack([d["ss_b_s"][1:], d["b_sp1"][T_USE - 1, -1:]])
    out = {}
    for k, ss in (("c", d["ss_c"]), ("n", d["ss_n"]), ("b_sp1", ss_bsp1)):
        x = np.empty((horizon, S, J))
        x[:T_USE] = d[k][:T_USE]
        x[T_USE:] = {"hold": d[k][T_USE - 1], "ss": ss}[continuation]
        out[k] = x
    return out


def flows(par: dict, x: dict, horizon: int) -> tuple:
    """Per-period utility parts (C, N, Q), each (horizon, S, J)."""
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


def starts(par: dict) -> list:
    """(t0, s0) of each cohort: alive in 2028 (oldest first), then entrants from 2029."""
    S, horizon = int(par["S"]), par["chi_n"].shape[0]
    return ([(T0, s0) for s0 in range(S - 1, -1, -1)]
            + [(t0, 0) for t0 in range(T0 + 1, horizon - S + 1)])


def birth_years(par: dict) -> np.ndarray:
    return np.array([START_YEAR + t0 - FIRST_AGE - s0 for t0, s0 in starts(par)])


def discount(par: dict, t0: int, s0: int) -> tuple:
    """Calendar indices (t, s) along the cohort's remaining life and the weights (k, J)."""
    sig, gy = float(par["sigma"]), float(par["g_y"])
    S = int(par["S"])
    k = np.arange(S - s0)
    t, s = t0 + k, s0 + k
    surv = np.concatenate([[1.0], np.cumprod(1 - par["rho"][t[:-1], s[:-1]])])
    w = (par["beta"][None, :] ** k[:, None]) * surv[:, None] * np.exp(k * gy * (1 - sig))[:, None]
    return t, s, w


def lifetime(par: dict, comp: tuple) -> np.ndarray:
    """Discounted remaining-life sums of each part, (cohorts, len(comp), J)."""
    out = []
    for t0, s0 in starts(par):
        t, s, w = discount(par, t0, s0)
        out.append([(w * x[t, s]).sum(axis=0) for x in comp])
    return np.array(out)


def to_lambda(sig: float, ratio: np.ndarray) -> np.ndarray:
    with np.errstate(invalid="ignore"):
        lam = (np.where(ratio > 0, ratio, np.nan) ** (1 / (1 - sig)) - 1) * 100
    return lam


@lru_cache(maxsize=None)
def _parts(closure: str, continuation: str):
    """{run key: discounted remaining-life (C, N, Q) sums, (cohorts, 3, J)}."""
    par, runs = load(closure)
    horizon = par["chi_n"].shape[0]
    return par, {key: lifetime(par, flows(par, extend(d, continuation, horizon), horizon))
                 for key, d in runs.items()}


def cev(closure: str, continuation: str = "hold", measure: str = "joint") -> dict:
    """{(variant, arm): lambda (cohorts, J) in per cent}, plus birth years."""
    par, L = _parts(closure, continuation)
    sig = float(par["sigma"])
    CR, NR, QR = L[None][:, 0], L[None][:, 1], L[None][:, 2]
    out = {"birth_year": birth_years(par)}
    for key in labels(closure):
        U = L[key].sum(axis=1)
        ratio = (U - NR) / (CR + QR) if measure == "joint" else (U - NR - QR) / CR
        lam = to_lambda(sig, ratio)
        if measure == "joint" and np.isnan(lam).any():
            raise WelfareError(f"{closure} {key}: no joint scaling reaches the scenario's utility")
        out[key] = lam
    return out


def components(closure: str, continuation: str = "hold") -> dict:
    """Joint CEV with one part at a time on the scenario path:
    {(variant, arm): {"consumption" | "leisure" | "bequests": (cohorts, J)}}.
    The three do not sum exactly to the total (the measure is not linear)."""
    par, L = _parts(closure, continuation)
    sig = float(par["sigma"])
    CR, NR, QR = L[None][:, 0], L[None][:, 1], L[None][:, 2]
    lam = lambda U: to_lambda(sig, (U - NR) / (CR + QR))
    out = {}
    for key in labels(closure):
        A = L[key]
        out[key] = {"consumption": lam(A[:, 0] + NR + QR),
                    "leisure": lam(CR + A[:, 1] + QR),
                    "bequests": lam(CR + NR + A[:, 2])}
    return out


def identity_checks(closure: str) -> dict:
    """The reference against itself gives 0; with c and b' 1% higher, exactly 1%."""
    par, runs = load(closure)
    horizon = par["chi_n"].shape[0]
    sig = float(par["sigma"])
    x = extend(runs[None], "hold", horizon)
    R = lifetime(par, flows(par, x, horizon))
    y = dict(x, c=x["c"] * 1.01, b_sp1=x["b_sp1"] * 1.01)
    S1 = lifetime(par, flows(par, y, horizon))
    CR, NR, QR = R[:, 0], R[:, 1], R[:, 2]
    zero = to_lambda(sig, (R.sum(axis=1) - NR) / (CR + QR))
    one = to_lambda(sig, (S1.sum(axis=1) - NR) / (CR + QR))
    return {"self_max_abs": float(np.abs(zero).max()), "one_pct_max_err": float(np.abs(one - 1).max())}


# --- weights and aggregates ------------------------------------------------------

def group_weights(par: dict) -> np.ndarray:
    return par["lambdas"].ravel()


def alive_weights(par: dict) -> np.ndarray:
    """Population weight of each cohort alive in 2028 (omega[2028, s]); 0 for later cohorts."""
    b = birth_years(par)
    age = SHOCK_YEAR - b
    w = np.zeros(len(b))
    ok = (age >= FIRST_AGE) & (age < FIRST_AGE + int(par["S"]))
    w[ok] = par["omega"][T0, age[ok] - FIRST_AGE]
    return w / w.sum()


def averages(par: dict, lam: np.ndarray) -> dict:
    """Population-weighted means: alive in 2028 (all groups and by group), and by group
    for the cohorts entering 2029-2048 (equal weight per cohort)."""
    aw, gw = alive_weights(par), group_weights(par)
    b = birth_years(par)
    fut = (b >= SHOCK_YEAR + 1 - FIRST_AGE) & (b <= SHOCK_YEAR + 20 - FIRST_AGE)
    return {"alive_all": float(aw @ lam @ gw),
            "alive_by_group": (aw @ lam).tolist(),
            "future_by_group": lam[fut].mean(axis=0).tolist(),
            "future_all": float(lam[fut].mean(axis=0) @ gw)}


# --- reconciliation ---------------------------------------------------------------

def reconcile(closure: str) -> dict:
    """Aggregate C gap from the household paths vs the record's, every year 2028-2036, per arm.
    Returns {label: max abs difference in percentage points}; raises above RECON_TOL_PP."""
    par, runs = load(closure)
    done, ref = records(closure)
    gw = group_weights(par)
    agg = lambda d, t: float((par["omega"][t][:, None] * gw[None, :] * d["c"][t]).sum())
    out = {}
    for key, label in labels(closure).items():
        rec = done[label]
        diffs = []
        for y in RECON_YEARS:
            t = y - START_YEAR
            hh = (agg(runs[key], t) / agg(runs[None], t) - 1) * 100
            rc = (rec["series"]["C"][t] / ref["series"]["C"][t] - 1) * 100
            diffs.append(abs(hh - rc))
        out[label] = max(diffs)
        if out[label] > RECON_TOL_PP:
            raise WelfareError(f"{closure} {label}: household consumption does not reproduce the "
                               f"record's C gap ({out[label]:.2e} pp)")
    return out


def c_gap(closure: str, key, year: int) -> float:
    done, ref = records(closure)
    rec = done[labels(closure)[key]]
    t = year - START_YEAR
    return (rec["series"]["C"][t] / ref["series"]["C"][t] - 1) * 100


# --- who gains and why -----------------------------------------------------------

def income_accounts(closure: str, key, last_year: int = DEBT_RULE - 1) -> dict:
    """Changes in household income by source over 2028..last_year, as a share of the same
    cohort-group's discounted consumption over the window, for cohorts alive in 2028.

    Sources: labour earnings w*e*n, capital income r_p*b_s, transfers tr, bequests
    received bq.  w and r_p are the records' (detrended); the records stop in 2036,
    so the window ends in 2035 (2036 is the debt rule's first year).
    Returns arrays (alive cohorts, J) keyed by source, plus the age in 2028."""
    par, runs = load(closure)
    done, ref = records(closure)
    rec = done[labels(closure)[key]]
    S = int(par["S"])
    d, r0 = runs[key], runs[None]
    e = par["e"]
    out = {k: np.zeros((S, d["c"].shape[2])) for k in ("labour", "capital", "transfers", "bequests", "pv_c")}
    for s0 in range(S):
        t, s, w = discount(par, T0, s0)
        m = t <= last_year - START_YEAR
        t, s, w = t[m], s[m], w[m]
        ser = lambda R, v: np.array([R["series"][v][i] for i in t])[:, None]
        lab = lambda D, R: ser(R, "w") * e[t, s] * D["n"][t, s]
        cap = lambda D, R: ser(R, "r_p") * D["b_s"][t, s]
        out["labour"][s0] = (w * (lab(d, rec) - lab(r0, ref))).sum(0)
        out["capital"][s0] = (w * (cap(d, rec) - cap(r0, ref))).sum(0)
        out["transfers"][s0] = (w * (d["tr"][t, s] - r0["tr"][t, s])).sum(0)
        out["bequests"][s0] = (w * (d["bq"][t, s] - r0["bq"][t, s])).sum(0)
        out["pv_c"][s0] = (w * r0["c"][t, s]).sum(0)
    res = {k: out[k] / out["pv_c"] * 100 for k in ("labour", "capital", "transfers", "bequests")}
    res["age_2028"] = np.arange(S) + FIRST_AGE
    return res


def group_profile(closure: str, year: int = SHOCK_YEAR) -> dict:
    """Continuation cross-section in `year` by group: shares of wealth and labour earnings,
    and gross income by source (per cent of the group's total)."""
    par, runs = load(closure)
    done, ref = records(closure)
    b = runs[None]
    t = year - START_YEAR
    gw = group_weights(par)
    om = par["omega"][t][:, None]
    w, r = ref["series"]["w"][t], ref["series"]["r_p"][t]
    per_head = lambda x: (om * x).sum(axis=0)
    wealth = per_head(b["b_s"][t])
    lab = per_head(w * par["e"][t] * b["n"][t])
    cap = per_head(r * b["b_s"][t])
    tr, bq = per_head(b["tr"][t]), per_head(b["bq"][t])
    tot = lab + cap + tr + bq
    return {"wealth_share": (wealth * gw / (wealth @ gw) * 100).tolist(),
            "earnings_share": (lab * gw / (lab @ gw) * 100).tolist(),
            "labour": (lab / tot * 100).tolist(), "capital": (cap / tot * 100).tolist(),
            "transfers": (tr / tot * 100).tolist(), "bequests": (bq / tot * 100).tolist(),
}


# --- summary --------------------------------------------------------------------

def key_str(key) -> str:
    v, a = key
    return f"{a}_{v}" if v else a


def summary(closure: str) -> dict:
    par, _ = load(closure)
    b = birth_years(par)
    R = cev(closure, "hold")
    Rss = cev(closure, "ss")
    Rc = cev(closure, "hold", "consumption")
    comp = components(closure, "hold")
    out = {"closure": closure, "birth_year": b.tolist(), "groups": list(GROUPS),
           "group_weights": group_weights(par).tolist(),
           "alive_weight": alive_weights(par).tolist(),
           "labels": {key_str(k): v for k, v in labels(closure).items()},
           "reconcile_max_pp": reconcile(closure), "identity": identity_checks(closure),
           "profile_2028": group_profile(closure), "arms": {}}
    for key in labels(closure):
        lam = R[key]
        ia = income_accounts(closure, key)
        out["arms"][key_str(key)] = {
            "cev": lam.tolist(), "avg": averages(par, lam),
            "cev_ss": Rss[key].tolist(), "avg_ss": averages(par, Rss[key]),
            "cev_consumption_only": np.where(np.isnan(Rc[key]), None, Rc[key]).tolist(),
            "consumption_only_undefined": int(np.isnan(Rc[key]).sum()),
            "parts": {p: x.tolist() for p, x in comp[key].items()},
            "income_2028_35": {k: (v.tolist() if hasattr(v, "tolist") else v) for k, v in ia.items()},
            "c_gap": {str(y): c_gap(closure, key, y) for y in RECON_YEARS},
        }
    return out


if __name__ == "__main__":
    np.set_printoptions(precision=2, suppress=True, linewidth=160)
    for cl in CLOSURES:
        print(cl, "reconcile (max pp):", reconcile(cl))
        print(cl, "identity:", identity_checks(cl))
        par, _ = load(cl)
        R = cev(cl)
        b = R["birth_year"]
        for key in labels(cl):
            print(cl, key, labels(cl)[key], averages(par, R[key])["alive_all"])
            for yr in (1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2008, 2020, 2040, 2060):
                i = int(np.where(b == yr)[0][0])
                print(f"  born {yr} (age {SHOCK_YEAR - yr} in 2028):", R[key][i])
