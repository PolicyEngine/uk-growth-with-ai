"""OG-UK capital-share scenarios for the UK.

Two scenarios, each run with gamma stepped and gamma ramped, against a common
"OBR central" baseline: ``share_shift`` raises capital's share of output by
3.9pp with no output gain at fixed inputs, and ``share_shift_tfp`` adds +3.1%
output at fixed inputs.  The magnitudes are Korinek et al. (2026)'s; the arms
were called ``obr``/``zero_tfp`` and ``anthropic`` before issue #14 (see
``scenarios``).

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
    ANTHROPIC_SUBSTANTIAL,
    SCENARIOS,
    SHARE_SHIFT,
    SHARE_SHIFT_TFP,
    Scenario,
)

__all__ = [
    "ANTHROPIC_SUBSTANTIAL", "OBR_BASELINE", "SCENARIOS", "SHARE_SHIFT",
    "SHARE_SHIFT_TFP", "normalise_arms",
    "Scenario", "compare_obr_baseline", "gamma_for_labour_share_fall",
    "gamma_only_gain", "gap_table", "growth_table", "labour_share_table",
    "load_results", "load_trend_params", "solve_scenario",
    "summary", "z_for_gdp_level", "z_for_tfp_gain",
]

__version__ = "0.1.0"
