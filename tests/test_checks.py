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
from uk_growth_with_ai.arms import SHOCKED_ARMS, Z_TARGETS
from uk_growth_with_ai.data_access import DATA, load_results

COMMITTED = DATA / "scenarios.json"
# The fixed-spending run predates the R1-R4 reruns (#27) and is kept as a
# legacy fixture: it is still the only file under the baseline_spending closure.
FIXED_SPENDING = DATA / "legacy" / "scenarios_fixed_spending_2026-11-11.json"
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
    res.pop("arms_requested", None)
    res.pop("arm_status", None)
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


# --- national accounts and plausibility --------------------------------------

def _scale(res, arm, var, factor, year=None):
    a = np.array(res[arm][var], dtype=float)
    if year is None:
        a = a * factor
    else:
        a[year] = a[year] * factor
    res[arm][var] = a.tolist()


def _zero_residuals(res):
    """Synthetic: no resource-constraint error anywhere, so a test sees only
    what it injects (the committed data's own defects may be fixed by reruns)."""
    for a in ["baseline", *SHOCKED_ARMS]:
        res[a]["diagnostics"]["rc_first5"] = [0.0] * 5


def _run_out(tmp_path, res, capsys):
    capsys.readouterr()
    code = run_check(tmp_path, res)
    return code, capsys.readouterr().out


def test_2026_residual_is_flagged_not_hidden(tmp_path, res, capsys):
    _zero_residuals(res)
    res[ARM]["diagnostics"]["rc_first5"][0] = 0.005 * res[ARM]["Y"][0]    # 0.5%
    code, out = _run_out(tmp_path, res, capsys)
    assert code == 0
    assert out.count("[KNOWN]") == 1 and "#15" in out
    assert "1 KNOWN" in out.splitlines()[-1]


def test_2026_residual_within_tolerance_is_not_flagged(tmp_path, res, capsys):
    _zero_residuals(res)
    res[ARM]["diagnostics"]["rc_first5"][0] = 0.0005 * res[ARM]["Y"][0]   # 0.05%
    code, out = _run_out(tmp_path, res, capsys)
    assert code == 0 and "[KNOWN]" not in out


@pytest.mark.parametrize("share,warned", [(0.0005, True), (0.00005, False)])
def test_later_residual_inside_tolerance_is_a_warning(tmp_path, res, capsys,
                                                      share, warned):
    _zero_residuals(res)
    res[ARM]["diagnostics"]["rc_first5"][2] = share * res[ARM]["Y"][2]   # 2028
    code, out = _run_out(tmp_path, res, capsys)
    assert code == 0
    assert ("2028 resource-constraint error" in out) == warned


def test_2026_residual_above_the_known_bound_fails(tmp_path, res):
    rc = res[ARM]["diagnostics"]["rc_first5"]
    rc[0] = 0.02 * res[ARM]["Y"][0]          # 2% of GDP
    assert run_check(tmp_path, res) == 1


def test_residual_in_a_later_year_fails(tmp_path, res):
    rc = res["baseline"]["diagnostics"]["rc_first5"]
    rc[3] = 0.005 * res["baseline"]["Y"][3]  # 0.5% of GDP in 2029
    assert run_check(tmp_path, res) == 1


def test_implausible_y_minus_c_i_g_fails(tmp_path, res):
    # Consumption up 20% in 2027 leaves X = Y - C - I - G near -10% of GDP.
    _scale(res, ARM, "C", 1.2, year=1)
    assert run_check(tmp_path, res) == 1


@pytest.mark.parametrize("var,factor", [("C", -1.0), ("I", -1.0), ("K", -1.0),
                                        ("w", 0.0)])
def test_wrong_signs_fail(tmp_path, res, var, factor):
    _scale(res, ARM, var, factor)
    assert run_check(tmp_path, res) == 1


def test_implausible_interest_rate_fails(tmp_path, res):
    res[ARM]["r"] = [0.5] * 5
    assert run_check(tmp_path, res) == 1


def test_fast_swing_in_y_minus_c_i_g_is_a_warning(tmp_path, res, capsys):
    _, before = _run_out(tmp_path, res, capsys)
    # Investment down 3% of GDP in 2027 only: X/Y jumps about +3pp, then back.
    i = np.array(res[ARM]["I"], dtype=float)
    i[1] -= 0.03 * res[ARM]["Y"][1]
    res[ARM]["I"] = i.tolist()
    code, after = _run_out(tmp_path, res, capsys)
    assert code == 0
    new = [l for l in after.splitlines() if "[WARN]" in l and l not in before.splitlines()]
    assert any(f"{ARM}: X/Y moves" in l and "2026->2027" in l for l in new), after


@pytest.mark.parametrize("mutate", [lambda r: r.pop("assumptions"),
                                    lambda r: r["assumptions"].pop(f"Z_{next(iter(Z_TARGETS))}"),
                                    lambda r: r["assumptions"].__setitem__(
                                        f"Z_{next(iter(Z_TARGETS))}", None)],
                         ids=["no-assumptions", "missing-Z", "null-Z"])
def test_missing_z_fails_without_a_traceback(tmp_path, res, mutate):
    mutate(res)
    assert run_check(tmp_path, res) == 1


# --- review of #28: no tracebacks on malformed values, and arm identity -------

def _doctor_requested_null(d): d["arms_requested"] = None
def _doctor_status_list(d): d["arm_status"] = ["ok"]
def _doctor_diag_null(d): d[ARM]["diagnostics"]["euler_savings_max"] = None
def _doctor_diag_string(d): d["baseline"]["diagnostics"]["rc_max_interior"] = "x"
def _doctor_assumptions_list(d): d["assumptions"] = []
def _doctor_g_n_string(d): d["baseline"]["g_n_used"] = "abcd"
def _doctor_gamma_null(d): d["assumptions"]["gamma_shocked"] = None
def _doctor_y_zero(d): d[ARM]["Y"] = [0.0] * 5
def _doctor_elapsed_string(d): d[ARM]["elapsed_min"] = "x"
def _doctor_rc_first5_string(d): d[ARM]["diagnostics"]["rc_first5"] = "x"


@pytest.mark.parametrize("doctor", [
    _doctor_requested_null, _doctor_status_list, _doctor_diag_null,
    _doctor_diag_string, _doctor_assumptions_list, _doctor_g_n_string,
    _doctor_gamma_null, _doctor_y_zero, _doctor_elapsed_string,
    _doctor_rc_first5_string,
], ids=lambda f: f.__name__.removeprefix("_doctor_"))
def test_malformed_value_fails_without_a_traceback(tmp_path, res, doctor):
    """Each of these raised (TypeError, IndexError, ZeroDivisionError, ...)
    instead of printing a FAIL line."""
    doctor(res)
    path = tmp_path / "results.json"
    path.write_text(json.dumps(res))
    p = subprocess.run([sys.executable, "-m", "uk_growth_with_ai", "check",
                        "--results", str(path)], capture_output=True, text=True)
    assert p.returncode == 1
    assert "Traceback" not in p.stderr
    assert "[FAIL]" in p.stdout


def test_swapped_arms_fail(tmp_path, res):
    """Both arms end at the same labour share, so only the recorded Z tells
    them apart."""
    res[ARM], res[OTHER] = res[OTHER], res[ARM]
    assert run_check(tmp_path, res) == 1


def test_one_arm_saved_under_both_names_fails(tmp_path, res):
    res[ARM] = copy.deepcopy(res[OTHER])
    assert run_check(tmp_path, res) == 1


def test_swapped_legacy_arms_fail(tmp_path):
    """The legacy aliases must not accept an arm under the other's old name."""
    raw = json.loads(COMMITTED.read_text())
    raw["obr_ramp"] = raw.pop("share_shift_tfp_ramp")
    raw["anthropic_ramp"] = raw.pop("share_shift_ramp")
    assert run_check(tmp_path, raw) == 1


def test_legacy_names_in_the_right_place_pass(tmp_path):
    raw = json.loads(COMMITTED.read_text())
    raw["obr_ramp"] = raw.pop("share_shift_ramp")
    raw["anthropic_ramp"] = raw.pop("share_shift_tfp_ramp")
    a = raw["assumptions"]
    a["Z_obr"], a["Z_anthropic"] = a.pop("Z_share_shift"), a.pop("Z_share_shift_tfp")
    assert run_check(tmp_path, raw) == 0


def test_wrong_gamma_shape_fails(tmp_path, res):
    res[ARM]["gamma_shape"] = "step"
    assert run_check(tmp_path, res) == 1


def test_unknown_arm_name_fails(tmp_path, res):
    res["mystery_ramp"] = copy.deepcopy(res[ARM])
    assert run_check(tmp_path, res) == 1
