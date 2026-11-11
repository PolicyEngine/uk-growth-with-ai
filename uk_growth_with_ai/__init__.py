"""OG-UK AI-growth scenarios for the UK.

Two scenarios (Anthropic "substantial", and automation with a zero technology
wedge), each run with gamma stepped and gamma ramped, against a common "OBR central"
baseline.  The zero-wedge arm was called "obr" until it was renamed: it is
motivated by the OBR's technological-displacement case but does not reproduce
it (see ``scenarios``).

``solve`` imports ogcore/oguk lazily, so ``report`` and ``obr`` work on machines
without the OG-UK stack installed.
"""

from .calibrate import (
    gamma_for_labour_share_fall,
    gamma_only_gain,
    solve_scenario,
    z_for_gdp_level,
    z_for_tfp_gain,
)
from .data_access import load_results, load_trend_params, normalise_arms
from .obr import OBR_BASELINE, compare as compare_obr_baseline
from .report import gap_table, growth_table, labour_share_table, summary
from .scenarios import (
    ANTHROPIC,
    ANTHROPIC_SUBSTANTIAL,
    OBR,
    SCENARIOS,
    ZERO_TFP,
    Scenario,
)

__all__ = [
    "ANTHROPIC", "ANTHROPIC_SUBSTANTIAL", "OBR", "OBR_BASELINE", "SCENARIOS",
    "ZERO_TFP", "normalise_arms",
    "Scenario", "compare_obr_baseline", "gamma_for_labour_share_fall",
    "gamma_only_gain", "gap_table", "growth_table", "labour_share_table",
    "load_results", "load_trend_params", "solve_scenario",
    "summary", "z_for_gdp_level", "z_for_tfp_gain",
]

__version__ = "0.1.0"
