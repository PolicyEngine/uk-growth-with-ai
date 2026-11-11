"""`check` must fail loudly on missing, failed and malformed arms (issue #17).

Arm names come from ``arms.SHOCKED_ARMS``, never literals, so the rename in
flight on ``fix/baseline-contamination`` does not break these tests.
"""

import copy
import json
import subprocess
import sys

import numpy as np
import pytest

from uk_growth_with_ai import cli
from uk_growth_with_ai.arms import SHOCKED_ARMS
from uk_growth_with_ai.data_access import DATA, load_results

COMMITTED = DATA / "scenarios.json"
FIXED_SPENDING = DATA / "scenarios_fixed_spending.json"
ARM, OTHER = SHOCKED_ARMS[0], SHOCKED_ARMS[1]


def run_check(tmp_path, res, *extra):
    path = tmp_path / "results.json"
    path.write_text(res if isinstance(res, str) else json.dumps(res))
    return cli.main(["check", "--results", str(path), *extra])


@pytest.fixture
def res():
    return copy.deepcopy(load_results(COMMITTED))


@pytest.fixture
def fixed():
    return copy.deepcopy(load_results(FIXED_SPENDING))


# --- the committed files pass ------------------------------------------------

def test_committed_results_pass():
    assert cli.main(["check", "--results", str(COMMITTED)]) == 0


def test_fixed_spending_results_pass():
    assert cli.main(["check", "--results", str(FIXED_SPENDING)]) == 0


# --- missing arms -------------------------------------------------------------

@pytest.mark.parametrize("arm", SHOCKED_ARMS)
def test_missing_expected_arm_fails(tmp_path, res, arm):
    del res[arm]
    assert run_check(tmp_path, res) == 1


def test_all_arms_missing_is_not_a_baseline_only_pass(tmp_path, res):
    for a in SHOCKED_ARMS:
        del res[a]
    assert run_check(tmp_path, res) == 1


def test_baseline_only_must_be_declared(tmp_path, res):
    for a in SHOCKED_ARMS:
        del res[a]
    assert run_check(tmp_path, res, "--baseline-only") == 0
    res["arms_requested"] = []
    assert run_check(tmp_path, res) == 0


def test_recorded_requested_arm_missing_fails(tmp_path, res):
    res["arms_requested"] = [*SHOCKED_ARMS, "extra_step"]
    assert run_check(tmp_path, res) == 1


# --- failed arms --------------------------------------------------------------

@pytest.mark.parametrize("arm", SHOCKED_ARMS)
def test_failed_expected_arm_fails(tmp_path, res, arm):
    res[arm] = {"error": "RuntimeError: TPI did not converge"}
    assert run_check(tmp_path, res) == 1


def test_failed_unexpected_arm_fails(tmp_path, res):
    """Two failed step arms passed before #17: every present arm is checked."""
    res["anthropic_step"] = {"error": "RuntimeError: boom"}
    res["obr_step"] = {"error": "RuntimeError: boom"}
    assert run_check(tmp_path, res) == 1


def test_recorded_failed_or_pending_status_fails(tmp_path, res):
    res["arms_requested"] = list(SHOCKED_ARMS)
    res["arm_status"] = {a: "ok" for a in SHOCKED_ARMS}
    assert run_check(tmp_path, res) == 0
    res["arm_status"][ARM] = "pending"
    assert run_check(tmp_path, res) == 1


def test_bad_baseline_diagnostics_fail(tmp_path, res):
    res["baseline"]["diagnostics"]["euler_savings_max"] = 1e-3
    assert run_check(tmp_path, res) == 1


def test_bad_baseline_diagnostics_fail_in_a_baseline_only_file(tmp_path, res):
    for a in SHOCKED_ARMS:
        del res[a]
    res["baseline"]["diagnostics"]["rc_nonfinite_periods"] = 2
    assert run_check(tmp_path, res, "--baseline-only") == 1


# --- malformed files ----------------------------------------------------------

@pytest.mark.parametrize("mutate", [
    lambda r: r.pop("baseline"),
    lambda r: r[ARM].pop("Y"),
    lambda r: r[ARM].__setitem__("C", r[ARM]["C"][:3]),
    lambda r: r[ARM].__setitem__("I", [float("nan")] * 5),
    lambda r: r[ARM].__setitem__("K", ["a"] * 5),
    lambda r: r[ARM].pop("diagnostics"),
    lambda r: r[ARM]["diagnostics"].pop("euler_labour_max"),
    lambda r: r.__setitem__(ARM, [1, 2, 3]),
    lambda r: r["baseline"].pop("G"),
], ids=["no-baseline", "no-Y", "short-series", "nan-series", "non-numeric",
        "no-diagnostics", "missing-diagnostic", "arm-not-dict", "baseline-no-G"])
def test_malformed_file_fails_without_a_traceback(tmp_path, res, mutate):
    mutate(res)
    assert run_check(tmp_path, res) == 1


@pytest.mark.parametrize("text", ["{not json", "[1, 2, 3]", ""])
def test_unreadable_file_fails(tmp_path, text):
    assert run_check(tmp_path, text) == 1


def test_missing_file_fails(tmp_path):
    assert cli.main(["check", "--results", str(tmp_path / "nope.json")]) == 1


def test_exit_code_reaches_the_shell(tmp_path, res):
    del res[ARM]
    path = tmp_path / "results.json"
    path.write_text(json.dumps(res))
    out = subprocess.run([sys.executable, "-m", "uk_growth_with_ai", "check",
                          "--results", str(path)], capture_output=True, text=True)
    assert out.returncode == 1, out.stdout + out.stderr
    assert "MISSING" in out.stdout


# --- fiscal closure -----------------------------------------------------------

def test_fixed_spending_is_checked_on_g_levels(tmp_path, fixed):
    fixed[ARM]["G"] = list(np.array(fixed[ARM]["G"]) * 1.01)
    assert run_check(tmp_path, fixed) == 1


def test_common_share_closure_is_checked_on_g_over_y(tmp_path, res):
    res[ARM]["G"] = list(np.array(res[ARM]["G"]) * 1.01)
    assert run_check(tmp_path, res) == 1


def test_mixed_closures_fail(tmp_path, fixed):
    fixed[OTHER]["baseline_spending"] = False
    assert run_check(tmp_path, fixed) == 1


def test_closure_must_agree_with_assumptions(tmp_path, fixed):
    fixed["assumptions"]["fiscal"] = "every arm uses the baseline's alpha_G"
    assert run_check(tmp_path, fixed) == 1
