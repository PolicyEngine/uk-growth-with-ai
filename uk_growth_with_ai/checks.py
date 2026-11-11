"""Validation checks for a results file: the staged checks in issue #9.

    python -m uk_growth_with_ai check --results uk_growth_with_ai/data/scenarios.json

Prints PASS / FAIL / INFO per check and exits 1 if any check fails.

What makes a file fail (issue #17):

* an expected arm is missing. The expected arms are the run's recorded
  ``arms_requested`` when present, else ``arms.SHOCKED_ARMS``; a baseline-only
  run must say so (``arms_requested == []``, or ``check --baseline-only``);
* any arm carries an ``error`` or a recorded status other than ``ok``, whether
  or not it is an expected arm (so failed step arms are caught too);
* the file is malformed: no baseline, an arm that is not a dict, a missing
  series or diagnostic, a series of the wrong length or with non-finite values;
* the baseline's solution diagnostics are bad. The baseline is checked in
  every file, whatever arms it holds;
* the fiscal invariant of the recorded closure does not hold. Under the default
  closure every arm uses the baseline's G/Y; under ``baseline_spending`` (the
  fixed-spending file) every arm keeps the baseline's G *level*. The closure
  is read from each arm's ``baseline_spending`` flag and must agree across
  arms and with ``assumptions.fiscal``.
"""

from __future__ import annotations

import numpy as np

from .arms import SHOCKED_ARMS, Z_TARGETS
from .data_access import LEGACY_KEYS
from .obr import OBR_BASELINE, balanced_growth
from .scenarios import G_BASE, NPER

YEARS = [2026, 2027, 2028, 2029, 2030]
assert len(YEARS) == NPER

# Top-level keys that are not arms.
META_KEYS = {"provenance", "assumptions", "arms_requested", "arm_status"}
SERIES = ("Y", "K", "L", "w", "r", "C", "I", "G", "D")
DIAGNOSTICS = ("rc_first5", "rc_max_interior", "rc_nonfinite_periods",
               "euler_savings_max", "euler_labour_max")


class _Report:
    """PASS / FAIL / INFO, plus two counted statuses that do not fail the run:
    WARN (implausible but not impossible; needs a look) and KNOWN (an open,
    tracked defect inside its documented bound, e.g. the 2026 residual, #15)."""

    def __init__(self):
        self.failed = 0
        self.flagged = {"WARN": 0, "KNOWN": 0}

    def line(self, status, text):
        if status == "FAIL":
            self.failed += 1
        if status in self.flagged:
            self.flagged[status] += 1
        print(f"  [{status}] {text}")

    def check(self, ok, text):
        self.line("PASS" if ok else "FAIL", text)


def _dlog(x, i):
    return (np.log(x[i + 1]) - np.log(x[i])) * 100


def _arm_problems(x) -> list[str]:
    """Structural problems with one arm's record; empty if it is well formed."""
    if not isinstance(x, dict):
        return [f"is a {type(x).__name__}, not a dict"]
    out = []
    for v in SERIES:
        if v not in x:
            out.append(f"missing series {v!r}")
            continue
        try:
            a = np.asarray(x[v], dtype=float)
        except (TypeError, ValueError):
            out.append(f"series {v!r} is not numeric")
            continue
        if a.shape != (NPER,):
            out.append(f"series {v!r} has shape {a.shape}, expected ({NPER},)")
        elif not np.all(np.isfinite(a)):
            out.append(f"series {v!r} has non-finite values")
    d = x.get("diagnostics")
    if not isinstance(d, dict):
        out.append("missing 'diagnostics'")
    else:
        out += [f"missing diagnostic {k!r}" for k in DIAGNOSTICS if k not in d]
    return out


def inventory(res, r, baseline_only=False) -> list[str] | None:
    """Which shocked arms to check. FAILs for missing, failed and malformed arms.

    Returns the well-formed shocked arms, or None if the file cannot be
    checked at all (not a dict, or no usable baseline).
    """
    print("\nArms present, requested and completed")
    if not isinstance(res, dict):
        r.line("FAIL", f"results file is a {type(res).__name__}, not a JSON object")
        return None
    if "baseline" not in res:
        r.line("FAIL", "no 'baseline' in the results file")
        return None
    bad = _arm_problems(res["baseline"])
    if isinstance(res["baseline"], dict) and "error" in res["baseline"]:
        bad.insert(0, f"failed: {res['baseline']['error']}")
    if bad:
        r.line("FAIL", "baseline is malformed: " + "; ".join(bad))
        return None

    present = [k for k in res if k not in META_KEYS and k != "baseline"]
    if "arms_requested" in res:
        # The values are arm names, which normalise_arms (keys only) leaves alone.
        required = [LEGACY_KEYS.get(a, a) for a in res["arms_requested"]]
        source = "recorded arms_requested"
        if required and set(required) != set(SHOCKED_ARMS):
            r.line("INFO", f"the run requested {required}, not every expected arm "
                           f"{SHOCKED_ARMS}")
    elif baseline_only:
        required, source = [], "--baseline-only"
    else:
        required, source = list(SHOCKED_ARMS), "arms.SHOCKED_ARMS"
    if not required:
        r.line("INFO", f"baseline-only run ({source}): no shocked arm is required")
    for a in required:
        r.check(a in present, f"{a}: required ({source}) and "
                              f"{'present' if a in present else 'MISSING'}")

    status = res.get("arm_status", {})
    ok = []
    for a in present:
        x = res[a]
        if isinstance(x, dict) and "error" in x:
            r.line("FAIL", f"{a} failed: {x['error']}")
            continue
        if a in status and status[a] != "ok":
            r.line("FAIL", f"{a}: recorded status {status[a]!r}")
            continue
        problems = _arm_problems(x)
        if problems:
            r.line("FAIL", f"{a} is malformed: " + "; ".join(problems))
            continue
        ok.append(a)
    for a in status:
        if a not in present and a != "baseline":
            r.line("FAIL", f"{a}: status recorded ({status[a]!r}) but no results")
    if ok:
        r.line("INFO", "checking " + ", ".join(ok))
    return ok


def baseline_checks(res, r):
    b = res["baseline"]
    print("\nBaseline settings")
    r.line("INFO", f"tG1 = {b.get('tG1_used', 'not recorded (old run: 4)')}, "
                   f"g_y_annual = {b.get('g_y_annual_used', 'not recorded')}, "
                   f"alpha_G = {b.get('alpha_G_used', 'not recorded')}")

    print("\n#3  No fiscal-rule break in 2030 (baseline)")
    for v in ("G", "I"):
        x = np.array(b[v])
        before, after = _dlog(x, 2), _dlog(x, 3)
        r.check(abs(after - before) < 1.0,
                f"{v}: 2028->29 {before:+.2f}%, 2029->30 {after:+.2f}% "
                f"(detrended; a jump over 1pp means the rule still bites)")
    dy = np.array(b["D"]) / np.array(b["Y"]) * 100
    r.line("INFO", "debt/GDP (model units) " + ", ".join(f"{y} {d:.1f}" for y, d in zip(YEARS, dy)))

    print("\n#5  Balanced growth (g_y, g_n) vs OBR potential output")
    if "g_y_annual_used" in b and "g_n_used" in b and len(b["g_n_used"]) > 3:
        # Same formula and period as `obr`: growth into 2030 is g_n[3].
        bal = balanced_growth(b["g_y_annual_used"], b["g_n_used"], 3)
        obr = OBR_BASELINE["potential_output_2030"]
        r.check(abs(bal - obr) < 0.3,
                f"balanced growth 2029->30 = {bal:.2f}% vs OBR potential output "
                f"{obr:.2f}% (within 0.3pp; not the same concept, nearest comparator)")
    else:
        r.line("FAIL", "baseline does not record g_y_annual_used and g_n_used")

    print("\nZ re-solved against this baseline")
    a = res.get("assumptions")
    if not isinstance(a, dict):
        r.line("FAIL", "no 'assumptions' in the results file")
        return
    K0, L0 = b["K"][0], b["L"][0]
    # Independent of calibrate.py: at fixed K0, L0 the joint move is
    # Z * (K0/L0)^(gamma1 - gamma0) - 1.
    g1 = a.get("gamma_shocked", 0.389)
    fixed_input_gain = lambda Z: (Z * (K0 / L0) ** (g1 - G_BASE) - 1) * 100
    for scen, target in Z_TARGETS.items():
        key = f"Z_{scen}"
        z = a.get(key)
        if not isinstance(z, (int, float)) or not np.isfinite(z):
            r.line("FAIL", f"{key}: missing or not a number in 'assumptions'")
            continue
        gain = fixed_input_gain(z)
        r.check(abs(gain - target) < 1e-6,
                f"{scen}: output at fixed inputs {gain:+.4f}% (target {target:+.1f}%), "
                f"{key} = {z:.6f}")


def solution_quality(res, arms, r):
    """Every arm, the baseline always included."""
    print("\nSolution quality")
    for a in ["baseline", *arms]:
        d = res[a]["diagnostics"]
        euler = max(d["euler_savings_max"], d["euler_labour_max"])
        ok = (d["rc_nonfinite_periods"] == 0 and d["rc_max_interior"] < 1e-3
              and euler < 1e-8)
        r.check(bool(ok), f"{a}: resource constraint max 2027+ {d['rc_max_interior']:.1e}, "
                          f"Euler {euler:.1e}, non-finite periods {d['rc_nonfinite_periods']}, "
                          f"{res[a].get('elapsed_min', float('nan')):.0f} min")


def fiscal_closure(res, arms, r) -> bool | None:
    """True for fixed spending levels, False for a common G/Y; None if inconsistent."""
    flags = {a: bool(res[a].get("baseline_spending", False)) for a in arms}
    kinds = set(flags.values())
    if len(kinds) > 1:
        r.line("FAIL", f"arms mix fiscal closures: baseline_spending = {flags}")
        return None
    fixed = kinds.pop() if kinds else False
    fiscal = res.get("assumptions", {}).get("fiscal")
    if fiscal is not None:
        says_fixed = "baseline_spending" in fiscal
        r.check(says_fixed == fixed,
                f"assumptions.fiscal ({fiscal!r}) agrees with the arms' "
                f"baseline_spending = {fixed}")
    return fixed


def shocked_checks(res, arms, r):
    if not arms:
        return
    b = res["baseline"]

    print("\nFiscal closure recorded by the arms")
    fixed = fiscal_closure(res, arms, r)
    if fixed:
        print("\n#2  Common fiscal policy: G LEVELS identical across arms "
              "(fixed-spending closure)")
        for a in arms:
            diff = np.max(np.abs(np.array(res[a]["G"]) / np.array(b["G"]) - 1))
            r.check(diff < 1e-8, f"{a}: max |G / baseline G - 1| = {diff:.2e}")
    elif fixed is False:
        print("\n#2  Common fiscal policy: G/Y identical across arms")
        gy_b = np.array(b["G"]) / np.array(b["Y"])
        for a in arms:
            gy = np.array(res[a]["G"]) / np.array(res[a]["Y"])
            diff = np.max(np.abs(gy - gy_b))
            r.check(diff < 1e-8, f"{a}: max |G/Y - baseline G/Y| = {diff:.2e}; "
                                 f"alpha_G {res[a].get('alpha_G_used')} vs {b.get('alpha_G_used')}")

    print("\nLabour share 2030 (65% -> 61.1%)")
    for a in ["baseline", *arms]:
        x = res[a]
        sl = x["w"][4] * x["L"][4] / x["Y"][4] * 100
        target = 65.0 if a == "baseline" else 61.1
        r.check(abs(sl - target) < 0.1, f"{a}: {sl:.2f}% (target {target}%)")

    print("\nGDP gap vs baseline (%), for the before/after table")
    for a in arms:
        gap = (np.array(res[a]["Y"]) / np.array(b["Y"]) - 1) * 100
        r.line("INFO", f"{a}: " + ", ".join(f"{y} {g:+.2f}" for y, g in zip(YEARS, gap)))


# --- national accounts and plausibility (cheap; reads the saved series only) ---
#
# The results file saves Y, C, I, G but not net exports, public investment I_g
# or net capital flows, so Y = C + I + G + NX cannot be closed independently.
# What can be checked:
#
# 1. The model's own resource-constraint error, as recorded per year in
#    ``diagnostics.rc_first5`` (OG-Core 0.17.0 aggregates.resource_constraint:
#    Y - C - I_d - I_g - G - net capital flows + remittances + foreign aid),
#    as a share of that year's Y. solve.py saves absolute values, so the sign
#    is lost. Tolerance RC_TOL = 0.1% of GDP in every reported year; any year
#    from 2027 over it fails, and any over RC_WARN = 0.01% is a WARN (2028
#    sits at ~0.09% in every arm, hundreds of times its neighbours). The
#    2026 error is ~0.95% of GDP in every arm (#15, unresolved; not shown to
#    cancel in the gaps). It is reported as KNOWN, counted in the summary,
#    while it stays at or below RC_2026_KNOWN_MAX = 1.0% of GDP; above that
#    it fails.
# 2. The derived residual X = Y - C - I - G (I is total private investment).
#    X is public investment + the external balance (incl. foreign-owned
#    investment) + the RC error above; it is NOT net exports. It must stay
#    within |X/Y| <= X_SHARE_MAX = 6% (UK public investment ~2.5-3% of GDP and
#    a trade balance of a few % of GDP either way). A year-on-year move in X/Y
#    over X_STEP_WARN = 2pp is a WARN: nothing in a five-year path should
#    swing the external balance that fast, but it is a question for the
#    results audit, not an automatic failure.
# 3. Signs and shares: Y, C, I, G, K, L, w > 0; 0 < r < 15%; C/Y, I/Y, G/Y
#    inside SHARE_BANDS (wide: they catch sign flips and unit errors, not
#    calibration choices).
RC_TOL = 0.1                 # % of GDP, every reported year
RC_WARN = 0.01               # % of GDP, 2027+: inside tolerance but worth a look
RC_2026_KNOWN_MAX = 1.0      # % of GDP: the #15 residual is ~0.95%
X_SHARE_MAX = 6.0            # % of GDP
X_STEP_WARN = 2.0            # pp of GDP, year on year
R_BAND = (0.0, 0.15)
SHARE_BANDS = {"C": (35.0, 75.0), "I": (5.0, 35.0), "G": (10.0, 40.0)}   # % of Y


def accounts_checks(res, arms, r):
    print("\nNational accounts: model resource-constraint error, % of GDP "
          f"(tolerance {RC_TOL}; 2026 known, #15, bound {RC_2026_KNOWN_MAX})")
    for a in ["baseline", *arms]:
        x = res[a]
        try:
            rc = np.abs(np.asarray(x["diagnostics"]["rc_first5"], dtype=float))
        except (TypeError, ValueError):
            rc = np.array([])
        if rc.shape != (NPER,) or not np.all(np.isfinite(rc)):
            r.line("FAIL", f"{a}: diagnostics.rc_first5 is not {NPER} finite values")
            continue
        share = rc / np.asarray(x["Y"], dtype=float) * 100
        r.check(bool(np.all(share[1:] <= RC_TOL)),
                f"{a}: " + ", ".join(f"{y} {s:.3f}" for y, s in zip(YEARS, share))
                + f" (2027+ within {RC_TOL})")
        for y, s in zip(YEARS[1:], share[1:]):
            if RC_WARN < s <= RC_TOL:
                r.line("WARN", f"{a}: {y} resource-constraint error {s:.3f}% of GDP, "
                               f"inside the {RC_TOL}% tolerance but over {RC_WARN}%")
        if share[0] <= RC_TOL:
            r.line("PASS", f"{a}: 2026 residual {share[0]:.3f}% is within tolerance; "
                           "if #15 is fixed, drop the KNOWN allowance")
        elif share[0] <= RC_2026_KNOWN_MAX:
            r.line("KNOWN", f"{a}: 2026 resource-constraint error {share[0]:.3f}% of GDP "
                            f"exceeds the {RC_TOL}% tolerance (#15, unresolved; 2026 levels "
                            "and ratios carry it, and it is not shown to cancel in the gaps)")
        else:
            r.line("FAIL", f"{a}: 2026 resource-constraint error {share[0]:.3f}% of GDP "
                           f"is above the known #15 bound {RC_2026_KNOWN_MAX}%")

    print("\nNational accounts: X = Y - C - I - G, % of GDP "
          f"(public investment + external balance + RC error; not NX; |X| <= {X_SHARE_MAX})")
    for a in ["baseline", *arms]:
        x = {v: np.asarray(res[a][v], dtype=float) for v in ("Y", "C", "I", "G")}
        cy, iy = x["C"] / x["Y"] * 100, x["I"] / x["Y"] * 100
        xs = (x["Y"] - x["C"] - x["I"] - x["G"]) / x["Y"] * 100
        r.check(bool(np.all(np.abs(xs) <= X_SHARE_MAX)),
                f"{a}: " + ", ".join(f"{y} {v:+.2f}" for y, v in zip(YEARS, xs)))
        for i in range(NPER - 1):
            step = xs[i + 1] - xs[i]
            if abs(step) > X_STEP_WARN:
                r.line("WARN", f"{a}: X/Y moves {step:+.2f}pp {YEARS[i]}->{YEARS[i + 1]} "
                               f"(over {X_STEP_WARN}pp); C/Y {cy[i]:.1f} -> {cy[i + 1]:.1f}, "
                               f"I/Y {iy[i]:.1f} -> {iy[i + 1]:.1f}")

    print("\nSigns and shares (Y, C, I, G, K, L, w > 0; "
          f"{R_BAND[0]:g} < r < {R_BAND[1]:g}; "
          + ", ".join(f"{v}/Y {lo:g}-{hi:g}%" for v, (lo, hi) in SHARE_BANDS.items()) + ")")
    for a in ["baseline", *arms]:
        x = {v: np.asarray(res[a][v], dtype=float) for v in SERIES}
        bad = [f"{v} <= 0" for v in ("Y", "C", "I", "G", "K", "L", "w") if np.any(x[v] <= 0)]
        if np.any(x["r"] <= R_BAND[0]) or np.any(x["r"] >= R_BAND[1]):
            bad.append(f"r {x['r'].min():.4f} to {x['r'].max():.4f}")
        for v, (lo, hi) in SHARE_BANDS.items():
            sh = x[v] / x["Y"] * 100
            if np.any(sh < lo) or np.any(sh > hi):
                bad.append(f"{v}/Y {sh.min():.1f} to {sh.max():.1f}%")
        r.check(not bad, f"{a}: " + ("signs and shares plausible" if not bad
                                     else "implausible: " + "; ".join(bad)))


def main(res, baseline_only=False) -> int:
    r = _Report()
    arms = inventory(res, r, baseline_only=baseline_only)
    if arms is not None:
        baseline_checks(res, r)
        solution_quality(res, arms, r)
        shocked_checks(res, arms, r)
        accounts_checks(res, arms, r)
    flagged = ", ".join(f"{n} {k}" for k, n in r.flagged.items() if n)
    print(f"\n{'ALL CHECKS PASSED' if not r.failed else f'{r.failed} CHECK(S) FAILED'}"
          + (f" ({flagged}: see above)" if flagged else ""))
    return 1 if r.failed else 0
