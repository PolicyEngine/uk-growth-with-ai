"""Validation checks for a results file: the staged checks in issue #9.

    python -m uk_growth_with_ai check --results results/scenarios.json

Works on a baseline-only file (``run --baseline-only``) or a full one, and
prints PASS / FAIL / INFO per check. Exit code 1 if any check fails.
"""

from __future__ import annotations

import numpy as np

from .calibrate import gamma_only_gain
from .obr import OBR_BASELINE
from .scenarios import G_BASE, SCENARIOS

SHOCKED = ["obr_ramp", "anthropic_ramp"]
YEARS = [2026, 2027, 2028, 2029, 2030]


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


def baseline_checks(res, r):
    b = res["baseline"]
    print("\nBaseline settings")
    r.line("INFO", f"tG1 = {b.get('tG1_used', 'not recorded (old run: 4)')}, "
                   f"g_y_annual = {b['g_y_annual_used']}, "
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

    print("\n#5  Potential output growth vs OBR")
    pot = (b["g_y_annual_used"] + b["g_n_used"][4]) * 100
    obr = OBR_BASELINE["potential_output_2030"]
    r.check(abs(pot - obr) < 0.3,
            f"g_y + g_n in 2030 = {pot:.2f}% vs OBR {obr:.2f}% (within 0.3pp)")

    print("\nZ re-solved against this baseline")
    a = res.get("assumptions", {})
    K0, L0 = b["K"][0], b["L"][0]
    g1 = 1.0 - ((1.0 - G_BASE) - SCENARIOS["anthropic"].labour_share_fall_pp / 100)
    gonly = gamma_only_gain(K0, L0, G_BASE, g1)
    if "Z_anthropic" in a:
        tfp_a = (a["Z_anthropic"] * (1 + gonly) - 1) * 100
        tfp_o = (a["Z_obr"] * (1 + gonly) - 1) * 100
        r.check(abs(tfp_a - 3.1) < 1e-6, f"Anthropic: TFP at fixed inputs {tfp_a:+.4f}% (target +3.1%), Z = {a['Z_anthropic']:.6f}")
        r.check(abs(tfp_o) < 1e-6, f"OBR: GDP at fixed inputs {tfp_o:+.4f}% (target 0%), Z = {a['Z_obr']:.6f}")
    else:
        r.line("FAIL", "no Z values in 'assumptions'")


def shocked_checks(res, r):
    arms = [a for a in SHOCKED if a in res]
    if not arms:
        print("\n(no shocked arms in this file: baseline-only run)")
        return
    errors = [a for a in arms if "error" in res[a]]
    for a in errors:
        r.line("FAIL", f"{a} failed: {res[a]['error']}")
    arms = [a for a in arms if a not in errors]
    b = res["baseline"]

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

    print("\nSolution quality")
    for a in ["baseline", *arms]:
        d = res[a]["diagnostics"]
        r.check(d["rc_nonfinite_periods"] == 0 and d["rc_max_interior"] < 1e-3
                and d["euler_savings_max"] < 1e-8 and d["euler_labour_max"] < 1e-8,
                f"{a}: resource constraint max {d['rc_max_interior']:.1e}, "
                f"Euler {max(d['euler_savings_max'], d['euler_labour_max']):.1e}, "
                f"{res[a]['elapsed_min']:.0f} min")

    print("\nGDP gap vs baseline (%), for the before/after table")
    for a in arms:
        gap = (np.array(res[a]["Y"]) / np.array(b["Y"]) - 1) * 100
        r.line("INFO", f"{a}: " + ", ".join(f"{y} {g:+.2f}" for y, g in zip(YEARS, gap)))


def main(res) -> int:
    r = _Report()
    baseline_checks(res, r)
    shocked_checks(res, r)
    print(f"\n{'ALL CHECKS PASSED' if not r.failed else f'{r.failed} CHECK(S) FAILED'}")
    return 1 if r.failed else 0
