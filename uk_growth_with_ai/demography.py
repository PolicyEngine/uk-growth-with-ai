"""Two in-process corrections to OG-UK's demographic inputs (R2, issue #15).

Neither touches the OG-UK or OG-Core checkouts.  Both act on the
``Specifications`` object ``oguk.api._build_specs`` returns, before any solve,
and both are verified by the population law of motion OG-Core itself uses:

    omega[k+1, s+1] (1 + g_n[k]) = (1 - rho[k, s]) omega[k, s]
                                   + imm[k, s+1] omega[k, s+1]

(stationarised, ages s+1 = 1..S-1 of the model population).  ``k = -1`` is the
pre-period: ``omega_S_preTP``, ``g_n_preTP``, ``rho_preTP``, ``imm_rates_preTP``.

1. ``pretp``.  ``_build_specs`` passes ``omega_S_preTP`` from the UK fetch but
   never ``g_n_preTP``, ``rho_preTP`` or ``imm_rates_preTP``, so period 0 ran on
   OG-Core's shipped (non-UK) values.  The pre-period -> 2026 law of motion then
   misses by up to 5.9% by age, and the 2026 resource constraint by 0.95% of
   GDP (#30).  The fix copies the three values from the same
   ``demographics.get_pop_objs`` call that supplied omega / g_n / rho /
   imm_rates.

2. ``splice``.  ``ogcore.demographics.get_pop_objs`` (0.17.0, lines ~960-965)
   takes data populations for the years before ``final_data_year`` and projects
   from ``final_data_year`` on with the transition matrix built from the LAST
   data year's rates.  The first projected step (2027 -> 2028 for OG-UK's
   2026-2028 window) therefore uses 2028 rates, while ``rho`` and ``imm_rates``
   for 2027 keep the 2027 data rates: the law of motion breaks by up to 0.25%
   at that one transition and nowhere else (#30 ``law_of_motion``).  The fix
   sets ``rho`` and ``imm_rates`` for that period to the rates that actually
   generated the population step (the final-data-year rates).  omega, g_n and
   g_n_ss are not changed, so the vendored-g_n guard is unaffected.
"""

from __future__ import annotations

import hashlib

import numpy as np

LOM_TOL = 1e-10          # relative; floating-point closes it to ~1e-15
PRETP_KEYS = ("g_n_preTP", "rho_preTP", "imm_rates_preTP")


def h(a) -> str:
    """Short content hash of an array (sha256 of the float64 bytes)."""
    return hashlib.sha256(np.ascontiguousarray(np.asarray(a, dtype=float)).tobytes()
                          ).hexdigest()[:16]


def _rel(lhs, rhs):
    return (lhs - rhs) / lhs


def law_of_motion(p, n: int = 11) -> list[dict]:
    """Max relative law-of-motion residual for pre->2026 and the next n-1 steps."""
    om = np.asarray(p.omega, dtype=float)
    g = np.asarray(p.g_n, dtype=float).ravel()
    rho = np.asarray(p.rho, dtype=float)
    imm = np.asarray(p.imm_rates, dtype=float)
    start = int(getattr(p, "start_year", 2026))
    pre = np.asarray(p.omega_S_preTP, dtype=float).ravel()
    out = []
    lhs = om[0, 1:] * (1 + float(p.g_n_preTP))
    rhs = ((1 - np.asarray(p.rho_preTP, dtype=float).ravel()[:-1]) * pre[:-1]
           + np.asarray(p.imm_rates_preTP, dtype=float).ravel()[1:] * pre[1:])
    out.append({"transition": f"pre->{start}", "max_abs_rel": float(np.abs(_rel(lhs, rhs)).max())})
    for k in range(n - 1):
        lhs = om[k + 1, 1:] * (1 + g[k])
        rhs = (1 - rho[k, :-1]) * om[k, :-1] + imm[k, 1:] * om[k, 1:]
        out.append({"transition": f"{start + k}->{start + k + 1}",
                    "max_abs_rel": float(np.abs(_rel(lhs, rhs)).max())})
    return out


def apply_pretp(p, pop: dict) -> dict:
    """Set the pre-period inputs from the UK fetch ``pop`` (get_pop_objs output)."""
    before = {"g_n_preTP": float(np.asarray(p.g_n_preTP).ravel()[0]),
              "rho_preTP": h(p.rho_preTP), "imm_rates_preTP": h(p.imm_rates_preTP)}
    if not np.allclose(np.asarray(p.omega_S_preTP, dtype=float).ravel(),
                       np.asarray(pop["omega_S_preTP"], dtype=float).ravel()):
        raise RuntimeError("omega_S_preTP in the specs is not the captured fetch's; "
                           "refusing to splice pre-TP inputs from a different fetch")
    shape_r = np.shape(p.rho_preTP)
    shape_i = np.shape(p.imm_rates_preTP)
    p.g_n_preTP = float(pop["g_n_preTP"])
    p.rho_preTP = np.asarray(pop["rho_preTP"], dtype=float).reshape(shape_r)
    p.imm_rates_preTP = np.asarray(pop["imm_rates_preTP"], dtype=float).reshape(shape_i)
    return {"before": before,
            "after": {"g_n_preTP": p.g_n_preTP, "rho_preTP": h(p.rho_preTP),
                      "imm_rates_preTP": h(p.imm_rates_preTP)}}


def apply_splice(p, k: int) -> dict:
    """Give period k (the last data-to-projection step) the rates of period k+1.

    ``k`` is the model period whose transition is the first projected one:
    ``final_data_year - start_year - 1`` (1, i.e. 2027 -> 2028, for OG-UK).
    Raises unless that transition is the broken one and the fix closes it.
    """
    lom0 = law_of_motion(p)
    resid_k = lom0[k + 1]["max_abs_rel"]
    if resid_k < LOM_TOL:
        raise RuntimeError(f"transition {lom0[k + 1]['transition']} already holds "
                           f"({resid_k:.2e}); the splice defect is not where expected")
    rho = np.array(p.rho, dtype=float)
    imm = np.array(p.imm_rates, dtype=float)
    d_rho = float(np.abs(rho[k] - rho[k + 1]).max())
    d_imm = float(np.abs(imm[k] - imm[k + 1]).max())
    rho[k] = rho[k + 1]
    imm[k] = imm[k + 1]
    p.rho, p.imm_rates = rho, imm
    lom1 = law_of_motion(p)
    worst = max(r["max_abs_rel"] for r in lom1[1:])
    if worst > LOM_TOL:
        raise RuntimeError(f"splice fix left a law-of-motion residual of {worst:.2e}")
    return {"period": k, "transition": lom0[k + 1]["transition"],
            "residual_before": resid_k, "residual_after": lom1[k + 1]["max_abs_rel"],
            "max_abs_change_rho": d_rho, "max_abs_change_imm_rates": d_imm}


def hashes(p) -> dict:
    return {k: h(getattr(p, k)) for k in
            ("omega", "omega_SS", "omega_S_preTP", "g_n", "rho", "imm_rates",
             "rho_preTP", "imm_rates_preTP")}
