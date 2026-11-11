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

from .arms import SHOCKED_ARMS
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
    def __init__(self):
        self.failed = 0

    def line(self, status, text):
        if status == "FAIL":
            self.failed += 1
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
        required = list(res["arms_requested"])
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
    a = res.get("assumptions", {})
    K0, L0 = b["K"][0], b["L"][0]
    # Independent of calibrate.py: at fixed K0, L0 the joint move is
    # Z * (K0/L0)^(gamma1 - gamma0) - 1.
    g1 = a.get("gamma_shocked", 0.389)
    fixed_input_gain = lambda Z: (Z * (K0 / L0) ** (g1 - G_BASE) - 1) * 100
    if "Z_anthropic" in a:
        tfp_a, tfp_o = fixed_input_gain(a["Z_anthropic"]), fixed_input_gain(a["Z_obr"])
        r.check(abs(tfp_a - 3.1) < 1e-6, f"Anthropic: output at fixed inputs {tfp_a:+.4f}% (target +3.1%), Z = {a['Z_anthropic']:.6f}")
        r.check(abs(tfp_o) < 1e-6, f"OBR-style: output at fixed inputs {tfp_o:+.4f}% (target 0%), Z = {a['Z_obr']:.6f}")
    else:
        r.line("FAIL", "no Z values in 'assumptions'")


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
        rc0 = d["rc_first5"][0]
        r.line("INFO", f"{a}: 2026 resource-constraint error {rc0:.1e} "
                       f"= {rc0 / res[a]['Y'][0] * 100:.2f}% of 2026 GDP "
                       f"(unresolved, #15: not shown to cancel in the gaps)")


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


def main(res, baseline_only=False) -> int:
    r = _Report()
    arms = inventory(res, r, baseline_only=baseline_only)
    if arms is not None:
        baseline_checks(res, r)
        solution_quality(res, arms, r)
        shocked_checks(res, arms, r)
    print(f"\n{'ALL CHECKS PASSED' if not r.failed else f'{r.failed} CHECK(S) FAILED'}")
    return 1 if r.failed else 0
