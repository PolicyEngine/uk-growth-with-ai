"""The calibration algebra, checked against the committed assumptions block."""

import pytest

from uk_growth_with_ai import (
    ANTHROPIC,
    OBR,
    gamma_for_labour_share_fall,
    gamma_only_gain,
    load_results,
    solve_scenario,
    z_for_gdp_level,
    z_for_tfp_gain,
)
from uk_growth_with_ai.scenarios import G_BASE

RESULTS = load_results()
ASSUM = RESULTS["assumptions"]
K0 = RESULTS["baseline"]["K"][0]
L0 = RESULTS["baseline"]["L"][0]


def test_gamma_for_labour_share_fall():
    # epsilon=1, so the labour share is exactly 1-gamma: 0.65 - 3.9pp = 0.611.
    assert gamma_for_labour_share_fall(0.35, 3.9) == pytest.approx(0.389, abs=1e-12)


def test_gamma_matches_committed_assumption():
    assert gamma_for_labour_share_fall(G_BASE, ANTHROPIC.labour_share_fall_pp) == \
        pytest.approx(ASSUM["gamma_shocked"], abs=1e-12)


def test_gamma_only_gain():
    # Moving gamma alone already raises output ~6% at fixed inputs; this is why
    # Z has to be solved jointly rather than set to 1 + the target.
    g = gamma_only_gain(K0, L0, G_BASE, ASSUM["gamma_shocked"])
    assert g == pytest.approx(ASSUM["gamma_only_output_gain"], abs=1e-12)
    assert g > 0.0


def test_z_solvers_match_committed_values():
    gonly = ASSUM["gamma_only_output_gain"]
    assert z_for_tfp_gain(gonly, ANTHROPIC.tfp_gain) == \
        pytest.approx(ASSUM["Z_anthropic"], abs=1e-12)
    assert z_for_gdp_level(gonly, OBR.gdp_level_change) == \
        pytest.approx(ASSUM["Z_obr"], abs=1e-12)
    # Both below 1: the gamma move alone overshoots the technology target.
    assert ASSUM["Z_anthropic"] < 1.0 and ASSUM["Z_obr"] < 1.0


def test_solve_scenario_end_to_end():
    for scen, key in ((ANTHROPIC, "Z_anthropic"), (OBR, "Z_obr")):
        out = solve_scenario(scen, K0, L0, G_BASE)
        assert out["gamma"] == pytest.approx(ASSUM["gamma_shocked"], abs=1e-12)
        assert out["Z"] == pytest.approx(ASSUM[key], abs=1e-12)


def test_z_naive_would_have_been_wrong():
    # Regression guard on the normalisation: 1 + target is NOT the answer.
    assert z_for_tfp_gain(ASSUM["gamma_only_output_gain"], ANTHROPIC.tfp_gain) != \
        pytest.approx(1.0 + ANTHROPIC.tfp_gain, abs=1e-6)
