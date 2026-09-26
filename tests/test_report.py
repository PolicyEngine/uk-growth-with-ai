"""The report and OBR tables, against the committed results JSON."""

import numpy as np
import pytest

from uk_growth_with_ai import (
    compare_obr_baseline,
    gap_table,
    load_results,
    load_trend_params,
    summary,
)
from uk_growth_with_ai.report import growth_path, labour_share, trend

RESULTS = load_results()
G_N, G_Y = load_trend_params(results=RESULTS)


@pytest.mark.parametrize("arm,gap,growth", [
    ("anthropic_ramp", 4.92, 2.93),
    ("obr_ramp", 1.42, 1.82),
])
def test_headline_numbers(arm, gap, growth):
    s = summary(arm)
    assert round(s["gdp_gap_2030_pct"], 2) == gap
    assert round(s["growth_2030_pct"], 2) == growth


def test_labour_share_fall_is_39pp_in_every_shocked_arm():
    for arm in ("anthropic_ramp", "obr_ramp"):
        assert round(summary(arm)["labour_share_fall_pp"], 1) == 3.9


def test_gap_table_matches_summary():
    g = gap_table("anthropic_ramp")
    assert g.loc["GDP", 2030] == pytest.approx(summary("anthropic_ramp")["gdp_gap_2030_pct"])


def test_trend_parameters_are_the_ones_the_run_used():
    """Issue #4: re-trend with g_n_used / g_y_annual_used, not OG-UK defaults."""
    assert np.array_equal(G_N, np.asarray(RESULTS["baseline"]["g_n_used"]))
    assert G_Y == RESULTS["baseline"]["g_y_annual_used"]


@pytest.mark.parametrize("arm", ["baseline", "obr_ramp", "anthropic_ramp"])
def test_retrending_leaves_the_labour_share_unchanged(arm):
    """Issue #4: w carries productivity, L population, Y both, so w*L/Y is invariant."""
    a = RESULTS[arm]
    w = np.array(a["w"][:5]) * trend("w", G_Y, G_N)
    L = np.array(a["L"][:5]) * trend("L", G_Y, G_N)
    Y = np.array(a["Y"][:5]) * trend("Y", G_Y, G_N)
    assert w * L / Y == pytest.approx(labour_share(a), rel=1e-12)


def test_growth_is_the_year_on_year_change_in_retrended_output():
    Y = np.array(RESULTS["baseline"]["Y"][:5]) * trend("Y", G_Y, G_N)
    assert growth_path(RESULTS["baseline"]["Y"], G_Y, G_N) == pytest.approx((Y[1:] / Y[:-1] - 1) * 100)


def test_population_growth_index_is_t_to_t_plus_1():
    """OG-Core's g_n[t] is growth from t to t+1, so 2026->27 uses g_n[0]."""
    tr = trend("L", 0.0, G_N)
    assert tr[1] == pytest.approx(1 + G_N[0])


def test_obr_baseline_comparison():
    c = compare_obr_baseline()
    assert c["years"] == [2027, 2028, 2029, 2030]
    assert round(c["mean"], 2) == 1.68
    assert c["difference"] == pytest.approx(c["mean"] - 1.60, abs=1e-12)
