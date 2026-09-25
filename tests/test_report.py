"""The report and OBR tables, against the committed results JSON."""

import numpy as np
import pytest

from uk_growth_with_ai import (
    compare_obr_baseline,
    gap_table,
    labour_share_table,
    load_results,
    load_trajectories,
    summary,
)
from uk_growth_with_ai.report import growth_table

RESULTS = load_results()
TRAJ = load_trajectories()


@pytest.mark.parametrize("arm,gap,growth", [
    ("anthropic_ramp", 5.10, 2.93),
    ("obr_ramp", 1.69, 1.87),
])
def test_headline_numbers(arm, gap, growth):
    s = summary(arm)
    assert round(s["gdp_gap_2030_pct"], 2) == gap
    assert round(s["growth_2030_pct"], 2) == growth


def test_labour_share_fall_is_39pp_in_every_shocked_arm():
    for arm in ("anthropic_step", "anthropic_ramp", "obr_step", "obr_ramp"):
        assert round(summary(arm)["labour_share_fall_pp"], 1) == 3.9


def test_gap_table_matches_summary():
    g = gap_table("anthropic_ramp")
    assert g.loc["GDP", 2030] == pytest.approx(summary("anthropic_ramp")["gdp_gap_2030_pct"])


@pytest.mark.parametrize("arm", ["baseline", "obr_ramp", "anthropic_ramp"])
def test_growth_path_matches_trajectories(arm):
    """Pins the exact trend formula, not just the 2dp headline."""
    col = "Baseline" if arm == "baseline" else "With AI"
    got = growth_table("anthropic_ramp" if arm == "baseline" else arm).loc[col].to_numpy()
    assert got == pytest.approx(np.array(TRAJ["grow"][arm]), abs=1e-9)


@pytest.mark.parametrize("arm", ["baseline", "obr_ramp", "anthropic_ramp"])
def test_labour_share_matches_trajectories(arm):
    col = "Baseline" if arm == "baseline" else "With AI"
    got = labour_share_table("anthropic_ramp" if arm == "baseline" else arm).loc[col]
    assert got.to_numpy() == pytest.approx(np.array(TRAJ["sl"][arm]), abs=1e-9)


def test_obr_baseline_comparison():
    c = compare_obr_baseline()
    assert c["years"] == [2027, 2028, 2029, 2030]
    assert c["growth"] == pytest.approx(np.array(TRAJ["grow"]["baseline"]), abs=1e-9)
    assert round(c["mean"], 2) == 1.67
    assert c["difference"] == pytest.approx(c["mean"] - 1.60, abs=1e-12)
